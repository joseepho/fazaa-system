import { pgTable, text, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 100 }).notNull().default("Agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  customerName: varchar("customer_name", { length: 255 }).default(""),
  customerPhone: varchar("customer_phone", { length: 50 }).default(""),
  location: varchar("location", { length: 255 }).default(""),
  attachments: text("attachments").array().default([]),
  status: varchar("status", { length: 50 }).notNull().default("New"),
  assignedTo: integer("assigned_to").references(() => teamMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  text: text("text").notNull(),
  authorId: integer("author_id").references(() => teamMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const statusChanges = pgTable("status_changes", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  fromStatus: varchar("from_status", { length: 50 }).notNull(),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  changedById: integer("changed_by_id").references(() => teamMembers.id),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  filters: text("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true });
export const insertComplaintSchema = createInsertSchema(complaints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertStatusChangeSchema = createInsertSchema(statusChanges).omit({ id: true, changedAt: true });
export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({ id: true, createdAt: true });

export const updateComplaintSchema = insertComplaintSchema.partial();

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type UpdateComplaint = z.infer<typeof updateComplaintSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type StatusChange = typeof statusChanges.$inferSelect;
export type InsertStatusChange = z.infer<typeof insertStatusChangeSchema>;
export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;

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
