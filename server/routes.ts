import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertComplaintSchema, updateComplaintSchema } from "@shared/schema";
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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadDir));

  // Get dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Get all complaints
  app.get("/api/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      res.status(500).json({ error: "Failed to get complaints" });
    }
  });

  // Get single complaint
  app.get("/api/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to get complaint" });
    }
  });

  // Create complaint
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

  // Update complaint
  app.put("/api/complaints/:id", async (req, res) => {
    try {
      const validationResult = updateComplaintSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }
      
      const complaint = await storage.updateComplaint(req.params.id, validationResult.data);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  // Delete complaint
  app.delete("/api/complaints/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteComplaint(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete complaint" });
    }
  });

  // Get notes for complaint
  app.get("/api/complaints/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  // Add note to complaint
  app.post("/api/complaints/:id/notes", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Note text is required" });
      }
      
      const note = await storage.createNote({
        complaintId: req.params.id,
        text: text.trim(),
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Get status history for complaint
  app.get("/api/complaints/:id/status-history", async (req, res) => {
    try {
      const history = await storage.getStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status history" });
    }
  });

  // Upload files
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

  // Basic reports endpoint
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

  return httpServer;
}
