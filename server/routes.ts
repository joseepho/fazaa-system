import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto"; // For secure API Key comparison
import { insertComplaintSchema, updateComplaintSchema, insertTeamMemberSchema, insertSavedFilterSchema, insertEvaluationSchema, insertDailyEvaluationSchema, insertDetailedEvaluationSchema, insertServiceRequestSchema, insertFieldTechnicianSchema, insertServiceRequestNoteSchema, TeamMember } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { broadcast } from "./ws";
import sharp from "sharp";


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
  // console.log(`Using local disk storage at ${uploadDir}`);
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
  res.status(401).json({ message: "غير مصرح لك بالوصول (يجب تسجيل الدخول)" });
}

function checkPermission(permission: string | string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "غير مصرح لك بالوصول (يجب تسجيل الدخول)" });
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

    res.status(403).json({ message: "عذراً: ليس لديك الصلاحيات الكافية" });
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Helper to format Saudi phones to +966 format
  const formatPhone = (phone: string | undefined | null) => {
    if (!phone) return "";
    let p = String(phone).replace(/[^\d+]/g, ""); // Keep only digits and +
    if (p.startsWith("+966")) return p;
    if (p.startsWith("966")) return "+" + p;
    if (p.startsWith("05")) return "+966" + p.substring(1);
    if (p.startsWith("5")) return "+966" + p;
    return p;
  };

  // --- Webhook for External System Integration (PLACED AT TOP) ---
  app.post("/api/webhooks/orders", async (req, res) => {
    try {
      // 🛡️ SECURITY: High-Strength API Key Validation
      const apiKey = req.headers['x-api-key'] as string;
      // Strong key with 256-bit entropy (Example seed) - Should be in ENV
      const VALID_API_KEY = process.env.WEBHOOK_SECRET || "fp_live_8c2049d5a7b3e16f9d84c205e1973b8a4f21d6e3c9058b7a14e2f3d9c6b0a5e8";

      let isValid = false;
      if (apiKey && apiKey.length === VALID_API_KEY.length) {
        // Constant-time comparison to prevent timing attacks (Crypto-grade security)
        const bufferReq = Buffer.from(apiKey);
        const bufferValid = Buffer.from(VALID_API_KEY);
        if (crypto.timingSafeEqual(bufferReq, bufferValid)) {
          isValid = true;
        }
      }

      if (!isValid) {
        console.warn(`🚨 SECURITY ALERT: Invalid API Key or Unauthorized Attempt from IP: ${req.ip}`);
        return res.status(401).json({ status: "error", message: "Unauthorized Access: Invalid Credentials" });
      }

      const data = req.body;
      console.log("Received Verified Webhook Payload:", JSON.stringify(data, null, 2));

      // 1. Validation: specific fields
      if (!data.order_reference_no || !data.customer_name) {
        return res.status(400).json({ status: "error", message: "Missing required fields (order_reference_no, customer_name)" });
      }

      // 2. Map External Data to Internal Schema
      const orderNumber = data.order_reference_no;
      const formattedCustomerPhone = formatPhone(data.customer_mobile);

      // Handle Location: Combine address with Lat/Lng link
      let location = data.address || "No Address Provided";
      let locationCoordinates = "";
      if (data.location && data.location.latitude && data.location.longitude) {
        locationCoordinates = `https://www.google.com/maps?q=${data.location.latitude},${data.location.longitude}`;
      }

      // Handle Technician Mapping (By Phone)
      // We assume data.artisan_code is the phone number, or data.technician_phone
      const artisanPhone = data.artisan_code || data.technician_phone;
      let matchedTechnicianId: number | null = null;

      if (artisanPhone) {
        try {
          // Normalize phone (remove spaces, etc if needed) - simple match for now
          // Use formatPhone to ensure we match correctly regardless of format
          const cleanPhone = formatPhone(artisanPhone);
          const technicians = await storage.getFieldTechnicians(); // Get all techs

          // Try to match formatted phone, or check if stored phone ends with provided short number
          const foundTech = technicians.find(t => {
            const tPhone = formatPhone(t.phone);
            return tPhone === cleanPhone || tPhone.includes(String(artisanPhone).replace(/\s/g, ""));
          });

          if (foundTech) {
            matchedTechnicianId = foundTech.id;
            console.log(`Matched Technician: ${foundTech.name} (ID: ${foundTech.id}) for Order: ${orderNumber}`);
          } else {
            console.log(`Technician not found for phone: ${cleanPhone}`);
          }
        } catch (e) {
          console.error("Error matching technician:", e);
        }
      }

      // Handle Date/Time
      // We need a Date object for requestDate. 
      // Incoming format: "2024-07-01". modify to create a date object
      const requestDate = data.from_date ? new Date(data.from_date) : new Date();

      // Check if order exists
      const existingRequest = await storage.getServiceRequestByOrderNumber(orderNumber);

      let result;
      if (existingRequest) {
        // --- UPDATE Logic ---
        console.log(`Updating existing request: ${orderNumber}`);
        // We only update details, times, location. We DO NOT change status automatically unless specified (which is not in payload).
        // If the external system adds a status field later, we can map it here.

        const updateData: any = {
          customerName: data.customer_name,
          customerPhone: formattedCustomerPhone, // Use formatted phone
          location: location,
          locationCoordinates: locationCoordinates,
          details: data.details + (data.artisan_code ? `\n(Artisan Code: ${data.artisan_code})` : ""),
          requestDate: requestDate,
          startTime: data.from_time,
          endTime: data.to_time,
          paymentMethod: data.payment_method === "Credit Card" ? "Online" : "Cash",
          updatedAt: new Date()
        };

        if (data.status) {
          // Record status change manually since we are using generic updateServiceRequest
          if (existingRequest.status !== data.status) {
            await storage.createServiceRequestStatusChange({
              requestId: existingRequest.id,
              fromStatus: existingRequest.status,
              toStatus: data.status,
              changedById: null // Systems change
            });
          }

          updateData.status = data.status;

          // If completing, calculate duration and set completedAt
          if (data.status === 'Completed' || data.status === 'Done') {
            const now = new Date();
            updateData.completedAt = now;

            // Calculate duration in minutes (from creation to now)
            // If you prefer from 'In Progress', we would need to track that separately.
            // Using creation time for total turnaround time.
            const created = new Date(existingRequest.createdAt);
            const durationMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
            updateData.executionDuration = durationMinutes;
          }
        }

        if (matchedTechnicianId) {
          updateData.technicianId = matchedTechnicianId;
        }

        result = await storage.updateServiceRequest(existingRequest.id, updateData);

        // Notify Admins about update
        await notifyAdmins(
          "النظام الرئيسي",
          `تم تحديث بيانات الطلب #${orderNumber}`,
          `update_request:${result.id}`
        );

      } else {
        // --- CREATE Logic ---
        console.log(`Creating new request for order: ${orderNumber}`);
        const newRequestData = {
          orderNumber: orderNumber,
          customerName: data.customer_name,
          customerPhone: formattedCustomerPhone, // Use formatted phone
          location: location,
          locationCoordinates: locationCoordinates,
          details: data.details + (data.artisan_code ? `\n(Artisan Code: ${data.artisan_code})` : ""),
          requestDate: requestDate,
          startTime: data.from_time || "00:00",
          endTime: data.to_time || "00:00",
          status: data.status || "New", // Use provided status or default to New
          paymentMethod: data.payment_method === "Credit Card" ? "Online" : "Cash",
          technicianId: matchedTechnicianId, // Assign matched technician directly
        };

        result = await storage.createServiceRequest(newRequestData as any);

        // Notify Admins about new request
        await notifyAdmins(
          "النظام الرئيسي",
          `تم استلام طلب جديد #${orderNumber}`,
          `create_request:${result.id}`
        );
      }

      // Broadcast refresh to dashboards
      broadcast({ type: "REFRESH_DATA", payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"]] } });

      res.json({ status: "success", message: "Order processed successfully", data: result });

    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  app.get("/api/stats", checkPermission("view_dashboard"), async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get stats:", error);
      res.status(500).json({ error: "فشل في جلب الإحصائيات" });
    }
  });

  app.get("/api/complaints", checkPermission("view_complaints"), async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      console.error("Failed to get complaints:", error);
      res.status(500).json({ error: "فشل في جلب الشكاوي" });
    }
  });

  app.get("/api/complaints/:id", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }
      const complaint = await storage.getComplaint(id);
      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب تفاصيل الشكوى" });
    }
  });

  app.post("/api/complaints", checkPermission("create_complaint"), async (req, res) => {
    try {
      const validationResult = insertComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
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
          `create_complaint:${complaint.id}`,
          (req.user as any).id
        );
      }

      res.status(201).json(complaint);
    } catch (error) {
      console.error("Failed to create complaint:", error);
      res.status(500).json({ error: "فشل إنشاء الشكوى" });
    }
  });

  app.put("/api/complaints/:id", checkPermission(["edit_complaint", "update_status"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }

      const validationResult = updateComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
          details: validationResult.error.errors
        });
      }

      // Fetch old complaint for audit log
      const oldComplaint = await storage.getComplaint(id);
      if (!oldComplaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      const complaint = await storage.updateComplaint(id, validationResult.data);
      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      // Calculate Diff
      const changes: { field: string; from: any; to: any }[] = [];
      const updates = validationResult.data as Record<string, any>;

      for (const [key, newValue] of Object.entries(updates)) {
        const oldValue = (oldComplaint as any)[key];
        // Simple comparison, can be enhanced for dates/objects
        if (oldValue != newValue) {
          // Skip internal fields or unchanged values
          if (key === 'updatedAt' || key === 'attachments') continue;
          changes.push({ field: key, from: oldValue, to: newValue });
        }
      }

      // Log action
      if (req.user) {
        await storage.createLog({
          userId: (req.user as any).id,
          action: "UPDATE_COMPLAINT",
          entityType: "complaint",
          entityId: complaint.id,
          details: {
            title: complaint.title,
            changes: changes
          } as any,
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
      res.status(500).json({ error: "فشل تحديث الشكوى" });
    }
  });

  app.delete("/api/complaints/:id", checkPermission("delete_complaint"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }
      const deleted = await storage.deleteComplaint(id);
      if (!deleted) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
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
      res.status(500).json({ error: "فشل حذف الشكوى" });
    }
  });

  app.post("/api/complaints/bulk-update", checkPermission("edit_complaint"), async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "مصفوفة المعرفات مطلوبة" });
      }
      if (!status) {
        return res.status(400).json({ error: "الحالة مطلوبة" });
      }
      if (!['Active', 'Suspended'].includes(status)) {
        return res.status(400).json({ error: "حالة غير صحيحة" });
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
          "complaint_list",
          (req.user as any).id
        );
      }

      res.json({ updated });
    } catch (error) {
      res.status(500).json({ error: "فشل التحديث الجماعي للشكاوي" });
    }
  });

  app.get("/api/complaints/:id/notes", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }
      const notes = await storage.getNotes(id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب الملاحظات" });
    }
  });

  app.post("/api/complaints/:id/notes", checkPermission("manage_notes"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "نص الملاحظة مطلوب" });
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
            `update_complaint:${id}`,
            (req.user as any).id
          );
        }
      }

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "فشل إضافة الملاحظة" });
    }
  });

  app.get("/api/complaints/:id/status-history", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الشكوى غير صحيح" });
      }
      const history = await storage.getStatusHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب سجل الحالة" });
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
      res.status(500).json({ error: "فشل جلب أعضاء الفريق" });
    }
  });

  app.get("/api/technicians", checkPermission(["view_technicians", "view_users", "view_complaints"]), async (req, res) => {
    try {
      const technicians = await storage.getFieldTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Failed to get technicians:", error);
      res.status(500).json({ error: "فشل جلب الفنيين" });
    }
  });

  app.post("/api/team-members", checkPermission("create_user"), async (req, res) => {
    try {
      const validationResult = insertTeamMemberSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
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
      res.status(500).json({ error: "فشل إنشاء عضو الفريق" });
    }
  });

  app.put("/api/team-members/:id", checkPermission("edit_user"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم عضو الفريق غير صحيح" });
      }

      const updates = { ...req.body };
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }

      const member = await storage.updateTeamMember(id, updates);
      if (!member) {
        return res.status(404).json({ error: "عضو الفريق غير موجود" });
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
      res.status(500).json({ error: "فشل تحديث بيانات عضو الفريق" });
    }
  });

  app.delete("/api/team-members/:id", checkPermission("delete_user"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم عضو الفريق غير صحيح" });
      }
      const deleted = await storage.deleteTeamMember(id);
      if (!deleted) {
        return res.status(404).json({ error: "عضو الفريق غير موجود" });
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
      res.status(500).json({ error: "فشل حذف عضو الفريق" });
    }
  });

  app.get("/api/logs", checkPermission("view_logs"), async (req, res) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب السجلات" });
    }
  });

  app.get("/api/saved-filters", checkPermission("view_complaints"), async (req, res) => {
    try {
      const filters = await storage.getSavedFilters();
      res.json(filters);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب الفلاتر المحفوظة" });
    }
  });

  app.post("/api/saved-filters", checkPermission("view_complaints"), async (req, res) => {
    try {
      const validationResult = insertSavedFilterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
          details: validationResult.error.errors
        });
      }

      const filter = await storage.createSavedFilter(validationResult.data);
      res.status(201).json(filter);
    } catch (error) {
      res.status(500).json({ error: "فشل حفظ الفلتر" });
    }
  });

  app.delete("/api/saved-filters/:id", checkPermission("view_complaints"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "رقم الفلتر غير صحيح" });
      }
      const deleted = await storage.deleteSavedFilter(id);
      if (!deleted) {
        return res.status(404).json({ error: "الفلتر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل حذف الفلتر" });
    }
  });

  app.post("/api/upload", isAuthenticated, upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "لم يتم رفع أي ملفات" });
      }

      const processedUrls = [];

      for (const file of files) {
        let finalFilename = file.filename;

        // Check if image for compression
        if (file.mimetype.startsWith('image/')) {
          try {
            const compressedFilename = path.parse(file.filename).name + '.webp';
            const compressedPath = path.join(uploadDir, compressedFilename);

            await sharp(file.path)
              .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }) // Reasonable max size
              .webp({ quality: 80 }) // Good compression
              .toFile(compressedPath);

            // Delete original large file
            try {
              fs.unlinkSync(file.path);
            } catch (e) {
              console.error("Failed to delete original file:", e);
            }

            finalFilename = compressedFilename;
          } catch (err) {
            console.error(`Failed to compress image ${file.filename}, keeping original.`, err);
            // Keep original if compression fails
          }
        }

        // Generate URL
        // If file.path was a full URL (Cloudinary), we would use it. 
        // But here we are strictly local or fallback local.
        const url = `/uploads/${finalFilename}`;
        processedUrls.push(url);
      }

      res.json({ urls: processedUrls });
    } catch (error) {
      console.error("Upload handler error:", error);
      res.status(500).json({ error: "فشل رفع الملفات" });
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
      res.status(500).json({ error: "فشل إنشاء التقرير" });
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
      res.status(500).json({ error: "فشل إنشاء تقرير الاتجاهات" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to get notifications:", error);
      res.status(500).json({ error: "فشل جلب الإشعارات" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "المعرف غير صحيح" });
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل تمييز الإشعار كمقروء" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل تمييز جميع الإشعارات كمقروءة" });
    }
  });

  // Evaluation Routes
  app.get("/api/evaluations/stats", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const stats = await storage.getAllTechnicianStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get all technician stats:", error);
      res.status(500).json({ error: "فشل جلب الإحصائيات" });
    }
  });

  app.post("/api/evaluations", checkPermission(["create_evaluation", "create_complaint"]), async (req, res) => {
    try {
      const validationResult = insertEvaluationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
          details: validationResult.error.errors
        });
      }

      const technicianId = validationResult.data.technicianId;
      const technician = await storage.getFieldTechnician(technicianId);

      if (!technician) {
        return res.status(404).json({ error: "الفني غير موجود" });
      }

      if (technician.status === 'Suspended') {
        return res.status(400).json({ error: "عذراً، هذا الفني موقوف ولا يمكن تقييمه" });
      }

      const evaluation = await storage.createEvaluation({
        ...validationResult.data,
        evaluatorId: (req.user as any).id
      });

      // Notify Admins
      await notifyAdmins(
        "تقييم جديد",
        `تم إضافة تقييم جديد للفني ${technician?.name || 'غير معروف'} من قبل ${(req.user as any).name}`,
        `create_evaluation:${technicianId}`,
        (req.user as any).id
      );

      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Failed to create evaluation:", error);
      res.status(500).json({ error: "فشل إنشاء التقييم" });
    }
  });

  app.get("/api/users/:id/evaluations", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "رقم المستخدم غير صحيح" });

      const evaluations = await storage.getTechnicianEvaluations(id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب التقييمات" });
    }
  });

  app.get("/api/users/:id/stats", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "رقم المستخدم غير صحيح" });

      const stats = await storage.getTechnicianStats(id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب إحصائيات المستخدم" });
    }
  });

  // Field Technicians Management
  app.get("/api/field-technicians", checkPermission(["view_users", "view_technicians"]), async (req, res) => {
    try {
      // Return ALL technicians so supervisors can see others with warnings
      const techs = await storage.getFieldTechnicians();
      res.json(techs);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب الفنيين الميدانيين" });
    }
  });

  app.get("/api/users/supervisors", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getTeamMembers();
      // Filter for supervisors only (Technician Evaluations)
      const supervisors = users.filter(u => u.role === "Supervisor");
      console.log(`Found ${supervisors.length} supervisors`);
      res.json(supervisors);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
      res.status(500).json({ error: "فشل جلب المشرفين" });
    }
  });

  app.get("/api/field-technicians/:id", checkPermission(["view_users", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      const tech = await storage.getFieldTechnician(id);
      if (!tech) return res.status(404).json({ error: "الفني غير موجود" });

      res.json(tech);
    } catch (error) {
      console.error("Fetch tech error:", error);
      res.status(500).json({ error: "فشل جلب بيانات الفني" });
    }
  });

  app.post("/api/field-technicians", checkPermission("create_user"), async (req, res) => {
    try {
      console.log("Creating technician with body:", JSON.stringify(req.body, null, 2));
      const validationResult = insertFieldTechnicianSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error);
        return res.status(400).json({
          error: "فشل التحقق من البيانات",
          details: validationResult.error.errors
        });
      }
      console.log("Validated data:", validationResult.data);

      const dataToInsert = { ...validationResult.data };
      if (dataToInsert.phone) {
        dataToInsert.phone = formatPhone(dataToInsert.phone);
      }

      const tech = await storage.createFieldTechnician(dataToInsert);

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
      res.status(500).json({ error: "فشل إضافة الفني الميداني" });
    }
  });

  app.delete("/api/field-technicians/:id", checkPermission("manage_technicians"), async (req, res) => {
    try {
      // Technically only Admin should have 'manage_technicians' or simply check role
      const user = req.user as any;
      if (user.role !== "Admin") {
        return res.status(403).json({ error: "المسؤولون فقط يمكنهم حذف الفنيين" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "معرف غير صحيح" });

      console.log(`Attempting to delete technician ${id}`);
      const success = await storage.deleteFieldTechnician(id);
      if (!success) {
        console.log(`Technician ${id} not found or not deleted`);
        return res.status(404).json({ error: "الفني الميداني غير موجود" });
      }

      // Log it
      try {
        await storage.createLog({
          userId: user.id,
          action: "DELETE_FIELD_TECHNICIAN",
          entityType: "field_technician",
          entityId: id,
          details: {} as any,
          ipAddress: req.ip
        });
      } catch (e) {
        console.error("Failed to log deletion:", e);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete technician error:", error);
      res.status(500).json({ error: "فشل حذف الفني", details: error.message });
    }
  });

  app.patch("/api/field-technicians/:id/status", checkPermission("manage_technicians"), async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "Admin") {
        return res.status(403).json({ error: "المسؤولون فقط يمكنهم تغيير حالة الفني" });
      }

      const id = parseInt(req.params.id, 10);
      const { status } = req.body;

      if (isNaN(id) || !status) return res.status(400).json({ error: "مدخلات غير صحيحة" });

      const updated = await storage.updateFieldTechnicianStatus(id, status);
      if (!updated) return res.status(404).json({ error: "الفني غير موجود" });

      // Log
      try {
        await storage.createLog({
          userId: user.id,
          action: "UPDATE_TECHNICIAN_STATUS",
          entityType: "field_technician",
          entityId: id,
          details: { status } as any,
          ipAddress: req.ip
        });
      } catch (e) { console.error(e); }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل تحديث الحالة" });
    }
  });

  app.put("/api/field-technicians/:id", checkPermission("manage_technicians"), async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "Admin") {
        return res.status(403).json({ error: "المسؤولون فقط يمكنهم تعديل بيانات الفني" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "مدخلات غير صحيحة" });

      const updates = req.body;
      delete updates.id;
      delete updates.createdAt;

      // Fix supervisorId empty string to null conversion if coming from form
      if (updates.supervisorId) {
        updates.supervisorId = parseInt(updates.supervisorId, 10);
        if (isNaN(updates.supervisorId)) updates.supervisorId = null;
      }

      console.log(`Updating Technician ${id} with:`, updates);

      if (updates.phone) {
        updates.phone = formatPhone(updates.phone);
      }

      const updated = await storage.updateFieldTechnician(id, updates);
      if (!updated) return res.status(404).json({ error: "الفني غير موجود" });

      // Log
      try {
        await storage.createLog({
          userId: user.id,
          action: "UPDATE_FIELD_TECHNICIAN",
          entityType: "field_technician",
          entityId: id,
          details: { updates: Object.keys(updates) } as any,
          ipAddress: req.ip
        });
      } catch (e) { console.error(e); }

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "فشل تحديث البيانات" });
    }
  });

  // Detailed Evaluation
  app.post("/api/evaluations/detailed", checkPermission("create_evaluation"), async (req, res) => {
    try {
      const evaluationData = insertDetailedEvaluationSchema.parse(req.body);

      const technician = await storage.getFieldTechnician(evaluationData.technicianId);

      if (!technician) {
        return res.status(404).json({ error: "الفني غير موجود" });
      }

      if (technician.status === 'Suspended') {
        return res.status(400).json({ error: "عذراً، هذا الفني موقوف ولا يمكن تقييمه" });
      }

      // Enforce Supervisor Restriction: Can only evaluate own technicians
      const user = req.user as any;
      if (user.role === "Supervisor") {
        if (technician.supervisorId !== user.id) {
          return res.status(403).json({ error: "عفواً، لا يمكنك تقييم فني غير تابع لك." });
        }
      }

      const evaluation = await storage.createDetailedEvaluation({
        ...evaluationData,
        evaluatorId: (req.user as any).id
      });

      // Calculate stats update or notify logic here if needed

      // Notify Admins
      await notifyAdmins(
        "تقييم مفصل جديد",
        `تم إضافة تقييم مفصل للفني ${technician?.name || 'غير معروف'} من قبل ${(req.user as any).name}`,
        `create_evaluation:${evaluationData.technicianId}`,
        (req.user as any).id
      );

      res.status(201).json(evaluation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "فشل إنشاء التقييم المفصل" });
    }
  });

  app.get("/api/field-technicians/:id/evaluations/detailed", checkPermission(["view_users", "view_evaluations", "view_technicians"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "رقم الفني الميداني غير صحيح" });

      const evaluations = await storage.getDetailedEvaluations(id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب التقييمات المفصلة" });
    }
  });

  // Service Requests Routes
  app.get("/api/requests", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching service requests...");
      const requests = await storage.getServiceRequests();
      console.log(`Fetched ${requests.length} requests successfully.`);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ error: "فشل جلب الطلبات" });
    }
  });

  app.get("/api/requests/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getServiceRequestStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب إحصائيات الطلبات" });
    }
  });

  app.get("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const request = await storage.getServiceRequestById(id);
      if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب تفاصيل الطلب" });
    }
  });

  app.post("/api/requests", isAuthenticated, async (req, res) => {
    try {
      console.log("Receiving new request:", req.body);
      const validation = insertServiceRequestSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Validation failed:", validation.error.errors);
        return res.status(400).json({ error: "بيانات غير صالحة", details: validation.error.errors });
      }

      const request = await storage.createServiceRequest(validation.data);

      // Notify Admins
      await notifyAdmins(
        "طلب خدمة جديد",
        `تم إضافة طلب خدمة جديد (${request.orderNumber}) من قبل ${(req.user as any).name}`,
        `create_request:${request.id}`,
        (req.user as any).id
      );

      // Log action
      await storage.createLog({
        userId: (req.user as any).id,
        action: "CREATE_SERVICE_REQUEST",
        entityType: "service_request",
        entityId: request.id,
        details: { orderNumber: request.orderNumber } as any,
        ipAddress: req.ip
      });

      // Broadcast update
      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"], ["/api/reports/requests"]] }
      });

      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating request:", error);
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.message?.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: "رقم الطلب مستخدم مسبقاً. يرجى استخدام رقم آخر." });
      }
      res.status(500).json({ error: "فشل إنشاء الطلب" });
    }
  });

  app.get("/api/reports/requests", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getServiceRequestReports();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب تقارير الطلبات" });
    }
  });

  app.patch("/api/requests/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "الحالة مطلوبة" });

      const updated = await storage.updateServiceRequestStatus(id, status, (req.user as any)?.id);
      if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });

      // Notify Admins
      await notifyAdmins(
        "تحديث حالة طلب",
        `تم تحديث حالة الطلب (${updated.orderNumber}) إلى "${status}" من قبل ${(req.user as any).name}`,
        `update_request_status:${id}`,
        (req.user as any).id
      );

      // Log action
      await storage.createLog({
        userId: (req.user as any).id,
        action: "UPDATE_SERVICE_REQUEST_STATUS",
        entityType: "service_request",
        entityId: id,
        details: { status } as any,
        ipAddress: req.ip
      });

      // Broadcast update
      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"], ["/api/reports/requests"], [`/api/requests/${id}/status-history`]] }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل تحديث حالة الطلب" });
    }
  });

  app.put("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validation = insertServiceRequestSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: validation.error.errors });
      }

      const updated = await storage.updateServiceRequest(id, validation.data);
      if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });

      // Notify Admins
      await notifyAdmins(
        "تحديث طلب خدمة",
        `تم تعديل بيانات الطلب (${updated.orderNumber}) من قبل ${(req.user as any).name}`,
        `update_request:${id}`,
        (req.user as any).id
      );

      // Log action
      await storage.createLog({
        userId: (req.user as any).id,
        action: "UPDATE_SERVICE_REQUEST",
        entityType: "service_request",
        entityId: id,
        details: { updates: Object.keys(validation.data) } as any,
        ipAddress: req.ip
      });

      // Broadcast update
      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"], ["/api/reports/requests"], [`/api/requests/${id}`]] }
      });

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "فشل تحديث الطلب" });
    }
  });

  app.delete("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "Admin") {
        return res.status(403).json({ error: "المسؤولون فقط يمكنهم حذف الطلبات" });
      }

      const id = parseInt(req.params.id, 10);
      const deleted = await storage.deleteServiceRequest(id);
      if (!deleted) return res.status(404).json({ error: "الطلب غير موجود" });

      // Log action
      await storage.createLog({
        userId: user.id,
        action: "DELETE_SERVICE_REQUEST",
        entityType: "service_request",
        entityId: id,
        details: {} as any,
        ipAddress: req.ip
      });

      // Broadcast update
      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"], ["/api/reports/requests"]] }
      });

      // Notify Admins
      await notifyAdmins(
        "حذف طلب خدمة",
        `تم حذف طلب الخدمة رقم ${id} من قبل ${(req.user as any).name}`,
        "delete_request",
        (req.user as any).id
      );

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "فشل حذف الطلب" });
    }
  });

  app.get("/api/requests/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const notes = await storage.getServiceRequestNotes(id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب الملاحظات" });
    }
  });

  app.post("/api/requests/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: "النص مطلوب" });

      const note = await storage.createServiceRequestNote({
        requestId: id,
        text: text.trim(),
        authorId: (req.user as any)?.id // Optional if system note
      });

      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [[`/api/requests/${id}/notes`]] }
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "فشل إضافة الملاحظة" });
    }
  });

  app.get("/api/requests/:id/status-history", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const history = await storage.getServiceRequestStatusHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب سجل الحالة" });
    }
  });

  app.patch("/api/requests/:id/technician", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { technicianId } = req.body;
      if (!technicianId) return res.status(400).json({ error: "معرف الفني مطلوب" });

      const updated = await storage.updateServiceRequestTechnician(id, technicianId, (req.user as any)?.id);
      if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });

      // Notify Admins
      await notifyAdmins(
        "تحديث فني الطلب",
        `تم تغيير الفني للطلب (${updated.orderNumber}) من قبل ${(req.user as any).name}`,
        `update_request_tech:${id}`,
        (req.user as any).id
      );

      // Log action
      await storage.createLog({
        userId: (req.user as any).id,
        action: "UPDATE_SERVICE_REQUEST_TECHNICIAN",
        entityType: "service_request",
        entityId: id,
        details: { technicianId } as any,
        ipAddress: req.ip
      });

      broadcast({
        type: "REFRESH_DATA",
        payload: { queryKeys: [["/api/requests"], ["/api/requests/stats"], ["/api/reports/requests"], [`/api/requests/${id}`], [`/api/requests/${id}/assignments`]] }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل تحديث الفني" });
    }
  });

  app.get("/api/requests/:id/assignments", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const history = await storage.getServiceRequestAssignments(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "فشل جلب سجل الفنيين" });
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

async function notifyAdmins(title: string, message: string, type: string, excludeUserId?: number) {
  try {
    const users = await storage.getTeamMembers();
    const admins = users.filter(u => u.role === "Admin");

    for (const admin of admins) {
      if (excludeUserId && admin.id === excludeUserId) continue;

      await storage.createNotification({
        userId: admin.id,
        title,
        message,
        type,
        read: false,
      });
    }
    // We can use a specific type suffix or just 'NOTIFICATION' and let frontend handle filtering if needed. 
    // But since only admins get the DB notification, standard broadcast is fine if frontend filters by user ID or if we broadcast to specific rooms (which we don't have yet).
    // Current broadcast sends to everyone connected. Frontend filters by user.id so it's fine.
    broadcast({ type: "NOTIFICATION", payload: { title, message, type } });
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
