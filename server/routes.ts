import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertComplaintSchema, updateComplaintSchema, insertTeamMemberSchema, insertSavedFilterSchema, insertEvaluationSchema, insertFieldTechnicianSchema, insertDetailedEvaluationSchema, TeamMember } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { broadcast } from "./ws";


const uploadDir = process.env.USER_DATA_PATH
  ? path.join(process.env.USER_DATA_PATH, "uploads")
  : path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


let storageEngine;

/*
if (process.env.CLOUDINARY_URL) {
  try {
    const cloudinary = (await import("cloudinary")).v2;
    const { CloudinaryStorage } = await import("multer-storage-cloudinary");

    // Cloudinary config is automatically read from CLOUDINARY_URL
    // or we can set it explicitly if needed, but CLOUDINARY_URL is standard.

    storageEngine = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'fazza-complaints',
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'],
      },
    });
    console.log("Using Cloudinary for file uploads");
  } catch (e) {
    console.warn("CLOUDINARY_URL is set but 'cloudinary' or 'multer-storage-cloudinary' packages are missing.");
    console.warn("Falling back to disk storage. Please install them: npm install cloudinary multer-storage-cloudinary");
  }
}
*/

if (!storageEngine) {
  storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
  console.log(`Using local disk storage at ${uploadDir}`);
}

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

import { hashPassword } from "./auth";

function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

function checkPermission(permission: string | string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as TeamMember;

    // Admin has all permissions
    if (user.role === "Admin") {
      return next();
    }

    console.log(`Checking permission: User=${user.id}(${user.role}), Required=${JSON.stringify(permission)}, UserPerms=${JSON.stringify(user.permissions)}`);

    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];

    // Enforce Role-Based Access logic explicitly as a fallback
    // Supervisor: Can ONLY do evaluation related things
    if (user.role === "Supervisor") {
      const supervisorPermissions = ["view_evaluations_page", "view_evaluations", "view_technicians", "create_evaluation"];
      if (permissionsToCheck.some(p => supervisorPermissions.includes(p))) {
        return next();
      }
    }

    // FollowUpManager: Can do complaint/dashboard/report things
    if (user.role === "FollowUpManager") {
      const followUpPermissions = ["view_dashboard", "view_complaints", "create_complaint", "view_reports", "manage_notes", "update_status"];
      if (permissionsToCheck.some(p => followUpPermissions.includes(p))) {
        return next();
      }
    }

    // Check if user has AT LEAST ONE of the required permissions
    if (user.permissions && permissionsToCheck.some(p => user.permissions?.includes(p))) {
      return next();
    }

    res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadDir));

  app.get("/api/stats", checkPermission("view_dashboard"), async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/complaints", checkPermission("view_complaints"), async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      console.error("Failed to get complaints:", error);
      res.status(500).json({ error: "Failed to get complaints" });
    }
  });

  app.get("/api/complaints/:id", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const complaint = await storage.getComplaint(id);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to get complaint" });
    }
  });

  app.post("/api/complaints", checkPermission("create_complaint"), async (req, res) => {
    try {
      const validationResult = insertComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const complaintData = {
        ...validationResult.data,
        createdBy: (req.user as any)?.id
      };

      const complaint = await storage.createComplaint(complaintData);

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "CREATE_COMPLAINT",
          entityType: "complaint",
          entityId: complaint.id,
          details: { title: complaint.title } as any,
          ipAddress: req.ip
        });

        // Notify other users
        notifyUsers(
          "شكوى جديدة",
          `تم إضافة شكوى جديدة من قبل ${(req.user as any).name}: ${complaint.title}`,
          "create",
          (req.user as any).id
        );
      }

      res.status(201).json(complaint);
    } catch (error) {
      console.error("Failed to create complaint:", error);
      res.status(500).json({ error: "Failed to create complaint" });
    }
  });

  app.put("/api/complaints/:id", checkPermission(["edit_complaint", "update_status"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }

      const validationResult = updateComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const complaint = await storage.updateComplaint(id, validationResult.data);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "UPDATE_COMPLAINT",
          entityType: "complaint",
          entityId: complaint.id,
          details: validationResult.data as any,
          ipAddress: req.ip
        });

        // Notify other users
        notifyUsers(
          "تحديث شكوى",
          `تم تحديث الشكوى من قبل ${(req.user as any).name}: ${complaint.title}`,
          "update",
          (req.user as any).id
        );
      }

      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  app.delete("/api/complaints/:id", checkPermission("delete_complaint"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const deleted = await storage.deleteComplaint(id);
      if (!deleted) {
        return res.status(404).json({ error: "Complaint not found" });
      }

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "DELETE_COMPLAINT",
          entityType: "complaint",
          entityId: id,
          details: {} as any,
          ipAddress: req.ip
        });

        // Notify other users
        notifyUsers(
          "حذف شكوى",
          `تم حذف الشكوى رقم ${id} من قبل ${(req.user as any).name}`,
          "delete",
          (req.user as any).id
        );
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete complaint" });
    }
  });

  app.post("/api/complaints/bulk-update", checkPermission("edit_complaint"), async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs array is required" });
      }
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const numericIds = ids.map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id);
      const updated = await storage.bulkUpdateStatus(numericIds, status);

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "BULK_UPDATE_STATUS",
          entityType: "complaint",
          entityId: 0, // 0 for bulk
          details: { ids: numericIds, status } as any,
          ipAddress: req.ip
        });

        // Notify other users
        notifyUsers(
          "تحديث جماعي",
          `تم تحديث حالة ${numericIds.length} شكوى إلى "${status}" من قبل ${(req.user as any).name}`,
          "update",
          (req.user as any).id
        );
      }

      res.json({ updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update complaints" });
    }
  });

  app.get("/api/complaints/:id/notes", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const notes = await storage.getNotes(id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  app.post("/api/complaints/:id/notes", checkPermission("manage_notes"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Note text is required" });
      }

      const note = await storage.createNote({
        complaintId: id,
        text: text.trim(),
        authorId: (req.user as any)?.id // Add author
      });

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "CREATE_NOTE",
          entityType: "complaint",
          entityId: id,
          details: { noteId: note.id } as any,
          ipAddress: req.ip
        });

        // Notify other users
        const complaint = await storage.getComplaint(id);
        if (complaint) {
          notifyUsers(
            "ملاحظة جديدة",
            `تم إضافة ملاحظة جديدة على الشكوى "${complaint.title}" من قبل ${(req.user as any).name}`,
            "update",
            (req.user as any).id
          );
        }
      }

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.get("/api/complaints/:id/status-history", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const history = await storage.getStatusHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status history" });
    }
  });

  app.get("/api/team-members", checkPermission("view_users"), async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      // Don't send passwords back
      const safeMembers = members.map(m => {
        const { password, ...rest } = m;
        return rest;
      });
      res.json(safeMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  app.post("/api/team-members", checkPermission("create_user"), async (req, res) => {
    try {
      const validationResult = insertTeamMemberSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const hashedPassword = await hashPassword(req.body.password || "password123"); // Default password if not provided
      const memberData = { ...validationResult.data, password: hashedPassword };

      const member = await storage.createTeamMember(memberData);

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "CREATE_TEAM_MEMBER",
          entityType: "user",
          entityId: member.id,
          details: { name: member.name, email: member.email } as any,
          ipAddress: req.ip
        });
      }

      const { password, ...safeMember } = member;
      res.status(201).json(safeMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.put("/api/team-members/:id", checkPermission("edit_user"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }

      const updates = { ...req.body };
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }

      const member = await storage.updateTeamMember(id, updates);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "UPDATE_TEAM_MEMBER",
          entityType: "user",
          entityId: member.id,
          details: { updates: Object.keys(updates) } as any,
          ipAddress: req.ip
        });
      }

      const { password, ...safeMember } = member;
      res.json(safeMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", checkPermission("delete_user"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }
      const deleted = await storage.deleteTeamMember(id);
      if (!deleted) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "DELETE_TEAM_MEMBER",
          entityType: "user",
          entityId: id,
          details: {} as any,
          ipAddress: req.ip
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  app.get("/api/logs", checkPermission("view_logs"), async (req, res) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  app.get("/api/saved-filters", checkPermission("view_complaints"), async (req, res) => {
    try {
      const filters = await storage.getSavedFilters();
      res.json(filters);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved filters" });
    }
  });

  app.post("/api/saved-filters", checkPermission("view_complaints"), async (req, res) => {
    try {
      const validationResult = insertSavedFilterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const filter = await storage.createSavedFilter(validationResult.data);
      res.status(201).json(filter);
    } catch (error) {
      res.status(500).json({ error: "Failed to create saved filter" });
    }
  });

  app.delete("/api/saved-filters/:id", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid filter ID" });
      }
      const deleted = await storage.deleteSavedFilter(id);
      if (!deleted) {
        return res.status(404).json({ error: "Saved filter not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved filter" });
    }
  });

  app.post("/api/upload", isAuthenticated, upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const urls = files.map(file => {
        // If using Cloudinary, file.path contains the full URL
        if (file.path && file.path.startsWith('http')) {
          return file.path;
        }
        // Fallback to local path
        return `/uploads/${file.filename}`;
      });
      res.json({ urls });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  app.get("/api/reports/basic", checkPermission("view_reports"), async (req, res) => {
    try {
      const complaints = await storage.getComplaints();

      const byType = complaints.reduce((acc: Record<string, number>, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {});

      const bySource = complaints.reduce((acc: Record<string, number>, c) => {
        acc[c.source] = (acc[c.source] || 0) + 1;
        return acc;
      }, {});

      const byStatus = complaints.reduce((acc: Record<string, number>, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      const bySeverity = complaints.reduce((acc: Record<string, number>, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {});

      res.json({
        totalComplaints: complaints.length,
        byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
        bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({ severity, count })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/reports/trends", checkPermission("view_reports"), async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyTrends: Record<string, number> = {};
      const recentComplaints = complaints.filter(c => new Date(c.createdAt) >= thirtyDaysAgo);

      recentComplaints.forEach(c => {
        const date = new Date(c.createdAt).toISOString().split('T')[0];
        dailyTrends[date] = (dailyTrends[date] || 0) + 1;
      });

      const resolvedComplaints = complaints.filter(c =>
        c.status === 'Resolved' || c.status === 'Closed'
      );

      const avgResolutionTime = resolvedComplaints.length > 0
        ? resolvedComplaints.reduce((sum, c) => {
          const created = new Date(c.createdAt).getTime();
          const updated = new Date(c.updatedAt).getTime();
          return sum + (updated - created);
        }, 0) / resolvedComplaints.length / (1000 * 60 * 60)
        : 0;

      res.json({
        dailyTrends: Object.entries(dailyTrends)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        avgResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10,
        totalThisMonth: recentComplaints.length,
        resolvedThisMonth: recentComplaints.filter(c =>
          c.status === 'Resolved' || c.status === 'Closed'
        ).length,
      });
    } catch (error) {
      console.error("Failed to generate trends report:", error);
      res.status(500).json({ error: "Failed to generate trends report" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to get notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Evaluation Routes
  app.get("/api/evaluations/stats", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const stats = await storage.getAllTechnicianStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get all technician stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.post("/api/evaluations", checkPermission(["create_evaluation", "create_complaint"]), async (req, res) => {
    try {
      const validationResult = insertEvaluationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const evaluation = await storage.createEvaluation({
        ...validationResult.data,
        evaluatorId: (req.user as any).id
      });

      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Failed to create evaluation:", error);
      res.status(500).json({ error: "Failed to create evaluation" });
    }
  });

  app.get("/api/users/:id/evaluations", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid User ID" });

      const evaluations = await storage.getTechnicianEvaluations(id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get evaluations" });
    }
  });

  app.get("/api/users/:id/stats", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid User ID" });

      const stats = await storage.getTechnicianStats(id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  // Field Technicians Management
  app.get("/api/field-technicians", checkPermission(["view_users", "view_technicians"]), async (req, res) => {
    try {
      const techs = await storage.getFieldTechnicians();
      res.json(techs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get field technicians" });
    }
  });

  app.post("/api/field-technicians", checkPermission("create_user"), async (req, res) => {
    try {
      const validationResult = insertFieldTechnicianSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const tech = await storage.createFieldTechnician(validationResult.data);

      if (req.user) {
        try {
          await storage.createLog({
            userId: (req.user as any).id,
            action: "CREATE_FIELD_TECHNICIAN",
            entityType: "field_technician",
            entityId: tech.id,
            details: { name: tech.name } as any,
            ipAddress: req.ip
          });
        } catch (e) {
          console.error("Failed to log creation:", e);
        }
      }

      res.status(201).json(tech);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create field technician" });
    }
  });

  // Detailed Evaluation
  app.post("/api/evaluations/detailed", checkPermission("create_evaluation"), async (req, res) => {
    try {
      const validationResult = insertDetailedEvaluationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const evaluation = await storage.createDetailedEvaluation({
        ...validationResult.data,
        evaluatorId: (req.user as any).id
      });

      // Calculate stats update or notify logic here if needed

      res.status(201).json(evaluation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create detailed evaluation" });
    }
  });

  app.get("/api/field-technicians/:id/evaluations/detailed", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid Technician ID" });

      const evaluations = await storage.getDetailedEvaluations(id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get detailed evaluations" });
    }
  });

  return httpServer;
}


async function notifyUsers(title: string, message: string, type: string, excludeUserId?: number) {
  try {
    const users = await storage.getTeamMembers();
    for (const user of users) {
      // Notify everyone including the sender for now to ensure visibility
      if (excludeUserId && user.id === excludeUserId) continue;

      await storage.createNotification({
        userId: user.id,
        title,
        message,
        type,
        read: false,
      });
    }
    broadcast({ type: "NOTIFICATION", payload: { title, message, type } });
  } catch (error) {
    console.error("Failed to notify users:", error);
  }
}
