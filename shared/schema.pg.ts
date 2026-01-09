import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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

export const permissions = [
    "view_dashboard",
    "view_complaints",
    "create_complaint",
    "edit_complaint",
    "delete_complaint",
    "assign_complaint",
    "manage_notes",
    "view_users",
    "create_user",
    "edit_user",
    "delete_user",
    "manage_roles",
    "view_reports",
    "export_reports",
    "view_settings",
    "manage_settings",
    "view_logs"
] as const;

export const teamMembers = pgTable("team_members", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role").notNull().default("Agent"),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const logs = pgTable("logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => teamMembers.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    details: jsonb("details").$type<Record<string, any>>().default({}),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const complaints = pgTable("complaints", {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    customerName: text("customer_name").default(""),
    customerPhone: text("customer_phone").default(""),
    location: text("location").default(""),
    orderNumber: text("order_number").default(""),
    attachments: jsonb("attachments").$type<string[]>().default([]),
    status: text("status").notNull().default("New"),
    assignedTo: integer("assigned_to").references(() => teamMembers.id),
    technicianId: integer("technician_id"),
    createdBy: integer("created_by").references(() => teamMembers.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notes = pgTable("notes", {
    id: serial("id").primaryKey(),
    complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
    text: text("text").notNull(),
    authorId: integer("author_id").references(() => teamMembers.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const statusChanges = pgTable("status_changes", {
    id: serial("id").primaryKey(),
    complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    changedById: integer("changed_by_id").references(() => teamMembers.id),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const savedFilters = pgTable("saved_filters", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    filters: text("filters").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => teamMembers.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true });
export const insertComplaintSchema = createInsertSchema(complaints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertStatusChangeSchema = createInsertSchema(statusChanges).omit({ id: true, changedAt: true });
export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({ id: true, createdAt: true });
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

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
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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
