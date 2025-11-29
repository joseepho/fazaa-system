import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertComplaintSchema, updateComplaintSchema, insertTeamMemberSchema, insertSavedFilterSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadDir));

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      console.error("Failed to get complaints:", error);
      res.status(500).json({ error: "Failed to get complaints" });
    }
  });

  app.get("/api/complaints/:id", async (req, res) => {
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

  app.post("/api/complaints", async (req, res) => {
    try {
      const validationResult = insertComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }
      
      const complaint = await storage.createComplaint(validationResult.data);
      res.status(201).json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to create complaint" });
    }
  });

  app.put("/api/complaints/:id", async (req, res) => {
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
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  app.delete("/api/complaints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid complaint ID" });
      }
      const deleted = await storage.deleteComplaint(id);
      if (!deleted) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete complaint" });
    }
  });

  app.post("/api/complaints/bulk-update", async (req, res) => {
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
      res.json({ updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update complaints" });
    }
  });

  app.get("/api/complaints/:id/notes", async (req, res) => {
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

  app.post("/api/complaints/:id/notes", async (req, res) => {
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
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.get("/api/complaints/:id/status-history", async (req, res) => {
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

  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const validationResult = insertTeamMemberSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }
      
      const member = await storage.createTeamMember(validationResult.data);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.put("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }
      
      const member = await storage.updateTeamMember(id, req.body);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }
      const deleted = await storage.deleteTeamMember(id);
      if (!deleted) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  app.get("/api/saved-filters", async (req, res) => {
    try {
      const filters = await storage.getSavedFilters();
      res.json(filters);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved filters" });
    }
  });

  app.post("/api/saved-filters", async (req, res) => {
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

  app.delete("/api/saved-filters/:id", async (req, res) => {
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

  app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const urls = files.map(file => `/uploads/${file.filename}`);
      res.json({ urls });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  app.get("/api/reports/basic", async (req, res) => {
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

  app.get("/api/reports/trends", async (req, res) => {
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
      res.status(500).json({ error: "Failed to generate trends report" });
    }
  });

  return httpServer;
}
