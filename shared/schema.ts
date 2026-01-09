import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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

export const permissions = [
  "view_dashboard",
  "view_complaints",
  "create_complaint",
  "edit_complaint",
  "delete_complaint",
  "assign_complaint",
  "manage_notes",
  "update_status",
  "view_users",
  "create_user",
  "edit_user",
  "delete_user",
  "manage_roles",
  "view_reports",
  "export_reports",
  "view_settings",
  "manage_settings",
  "view_logs",
  "view_evaluations_page",
  "view_evaluations",
  "create_evaluation",
  "edit_evaluation",
  "delete_evaluation",
  "view_technicians",
  "manage_technicians"
] as const;

export type Permission = typeof permissions[number];

export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Agent"),
  permissions: text("permissions", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => teamMembers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  details: text("details", { mode: "json" }).$type<Record<string, any>>().default({}),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const complaints = sqliteTable("complaints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  customerName: text("customer_name").default(""),
  customerPhone: text("customer_phone").default(""),
  location: text("location").default(""),
  orderNumber: text("order_number").default(""),
  attachments: text("attachments", { mode: "json" }).$type<string[]>().default([]),
  status: text("status").notNull().default("New"),
  assignedTo: integer("assigned_to").references(() => teamMembers.id), // Internal assignment (Team Member)
  technicianId: integer("technician_id"), // Link to Field Technician (Manual ID)
  createdBy: integer("created_by").references(() => teamMembers.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  text: text("text").notNull(),
  authorId: integer("author_id").references(() => teamMembers.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const statusChanges = sqliteTable("status_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  changedById: integer("changed_by_id").references(() => teamMembers.id),
  changedAt: integer("changed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const savedFilters = sqliteTable("saved_filters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  filters: text("filters").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true }).extend({
  permissions: z.array(z.string())
});
export const insertComplaintSchema = createInsertSchema(complaints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertStatusChangeSchema = createInsertSchema(statusChanges).omit({ id: true, changedAt: true });
export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({ id: true, createdAt: true });
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, createdAt: true });

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

// Field Technicians (Expanded)
export const fieldTechnicians = sqliteTable("field_technicians", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  specialization: text("specialization").notNull(), // Electrical, Plumbing, etc.
  level: text("level").notNull(), // Beginner, Medium, Professional
  area: text("area").notNull(), // District / City
  joinDate: text("join_date").notNull(), // Text for simple date YYYY-MM-DD
  contractType: text("contract_type").notNull(), // Full-time, On-demand
  status: text("status").notNull().default("Active"), // Active, Suspended
  notes: text("notes"),
  supervisorId: integer("supervisor_id").references(() => teamMembers.id), // Who manages this tech?
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertFieldTechnicianSchema = createInsertSchema(fieldTechnicians).omit({ id: true, createdAt: true });
export type FieldTechnician = typeof fieldTechnicians.$inferSelect;
export type InsertFieldTechnician = z.infer<typeof insertFieldTechnicianSchema>;

// Detailed Evaluations (New Per-Order Evaluation)
export const detailedEvaluations = sqliteTable("detailed_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  technicianId: integer("technician_id").references(() => fieldTechnicians.id).notNull(),
  evaluatorId: integer("evaluator_id").references(() => teamMembers.id),

  // 1. Order Data
  orderNumber: text("order_number").notNull(),
  orderDate: text("order_date").notNull(),
  serviceType: text("service_type").notNull(),
  arrivalTime: text("arrival_time"),
  completionTime: text("completion_time"),
  firstTimeFixed: integer("first_time_fixed", { mode: "boolean" }).default(true),

  // 2. Technical Performance (1-5)
  ratingPunctuality: integer("rating_punctuality").notNull(),
  ratingDiagnosis: integer("rating_diagnosis").notNull(),
  ratingQuality: integer("rating_quality").notNull(),
  ratingSpeed: integer("rating_speed").notNull(),
  ratingPricing: integer("rating_pricing").notNull(),
  ratingAppearance: integer("rating_appearance").notNull(),

  // 3. Behavioral (Yes/No as Boolean)
  behaviorRespect: integer("behavior_respect", { mode: "boolean" }).notNull(),
  behaviorExplain: integer("behavior_explain", { mode: "boolean" }).notNull(),
  behaviorPolicy: integer("behavior_policy", { mode: "boolean" }).notNull(),
  behaviorClean: integer("behavior_clean", { mode: "boolean" }).notNull(),

  // 4. Supervisor Notes
  technicalErrors: text("technical_errors"),
  behavioralNotes: text("behavioral_notes"),
  needsTraining: integer("needs_training", { mode: "boolean" }).default(false),
  trainingType: text("training_type"),

  // 5. Customer Feedback
  customerRating: integer("customer_rating"), // 1-5
  customerComplained: integer("customer_complained", { mode: "boolean" }).default(false),
  customerRehire: integer("customer_rehire", { mode: "boolean" }).default(true),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertDetailedEvaluationSchema = createInsertSchema(detailedEvaluations).omit({ id: true, createdAt: true });
export type DetailedEvaluation = typeof detailedEvaluations.$inferSelect;
export type InsertDetailedEvaluation = z.infer<typeof insertDetailedEvaluationSchema>;

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => teamMembers.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export interface DashboardStats {
  total: number;
  newToday: number;
  underReview: number;
  resolved: number;
}

// Deprecated or Legacy Tables (Keeping for safety if needed during refactor)
export const evaluations = sqliteTable("evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  technicianId: integer("technician_id").references(() => teamMembers.id).notNull(),
  evaluatorId: integer("evaluator_id").references(() => teamMembers.id).notNull(),
  ratingPunctuality: integer("rating_punctuality").notNull(),
  ratingQuality: integer("rating_quality").notNull(),
  ratingBehavior: integer("rating_behavior").notNull(),
  ratingOverall: integer("rating_overall").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertEvaluationSchema = createInsertSchema(evaluations).omit({ id: true, createdAt: true });
export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export const dailyEvaluations = sqliteTable("daily_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  technicianId: integer("technician_id").references(() => fieldTechnicians.id).notNull(),
  date: text("date").notNull(),
  requestsCount: integer("requests_count").notNull().default(0),
  ratingPunctuality: integer("rating_punctuality").notNull().default(5),
  ratingQuality: integer("rating_quality").notNull().default(5),
  ratingBehavior: integer("rating_behavior").notNull().default(5),
  ratingOverall: integer("rating_overall").notNull().default(5),
  notes: text("notes"),
  evaluatorId: integer("evaluator_id").references(() => teamMembers.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const insertDailyEvaluationSchema = createInsertSchema(dailyEvaluations).omit({ id: true, createdAt: true });
export type DailyEvaluation = typeof dailyEvaluations.$inferSelect;

export type InsertDailyEvaluation = z.infer<typeof insertDailyEvaluationSchema>;
export type ReportData = {
  totalComplaints: number;
  byType: { type: string; count: number }[];
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
};

