import { z } from "zod";

export const complaintSources = [
  "Social Media",
  "Google Play",
  "App Store",
  "App Support",
  "Field",
  "Phone",
  "Email"
] as const;

export const complaintTypes = [
  "Technical",
  "Behavioral",
  "Price",
  "Delay",
  "Service Quality",
  "Payment",
  "App",
  "Other"
] as const;

export const complaintSeverities = [
  "Normal",
  "Medium",
  "High",
  "Urgent"
] as const;

export const complaintStatuses = [
  "New",
  "Under Review",
  "Transferred",
  "Pending Customer",
  "Resolved",
  "Closed",
  "Rejected"
] as const;

export type ComplaintSource = typeof complaintSources[number];
export type ComplaintType = typeof complaintTypes[number];
export type ComplaintSeverity = typeof complaintSeverities[number];
export type ComplaintStatus = typeof complaintStatuses[number];

export interface Complaint {
  id: string;
  source: ComplaintSource;
  type: ComplaintType;
  severity: ComplaintSeverity;
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  location: string;
  attachments: string[];
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  complaintId: string;
  text: string;
  createdAt: string;
}

export interface StatusChange {
  id: string;
  complaintId: string;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus;
  changedAt: string;
}

export const insertComplaintSchema = z.object({
  source: z.enum(complaintSources),
  type: z.enum(complaintTypes),
  severity: z.enum(complaintSeverities),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  customerName: z.string().optional().default(""),
  customerPhone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  attachments: z.array(z.string()).optional().default([]),
});

export const updateComplaintSchema = insertComplaintSchema.partial().extend({
  status: z.enum(complaintStatuses).optional(),
});

export const insertNoteSchema = z.object({
  complaintId: z.string(),
  text: z.string().min(1, "Note text is required"),
});

export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type UpdateComplaint = z.infer<typeof updateComplaintSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export interface DashboardStats {
  total: number;
  newToday: number;
  underReview: number;
  resolved: number;
}

export interface ReportData {
  totalComplaints: number;
  byType: { type: string; count: number }[];
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}
