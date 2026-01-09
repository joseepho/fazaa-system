import {
  complaints, teamMembers, notes, statusChanges, savedFilters, logs, notifications,
  evaluations, fieldTechnicians, dailyEvaluations, detailedEvaluations,
  type Complaint, type InsertComplaint, type UpdateComplaint,
  type TeamMember, type InsertTeamMember,
  type Note, type InsertNote,
  type StatusChange,
  type SavedFilter, type InsertSavedFilter,
  type Log, type InsertLog,
  type Notification, type InsertNotification,
  type Evaluation, type InsertEvaluation,
  type FieldTechnician, type InsertFieldTechnician,
  type DailyEvaluation, type InsertDailyEvaluation,
  type DetailedEvaluation, type InsertDetailedEvaluation,
  type DashboardStats
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, sql, getTableColumns } from "drizzle-orm";
import session from "express-session";

export type User = TeamMember;
export type InsertUser = InsertTeamMember;

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Complaint Management
  getComplaints(): Promise<(Complaint & { notesCount: number })[]>;
  getComplaint(id: number): Promise<Complaint | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: number, updates: UpdateComplaint): Promise<Complaint | undefined>;
  deleteComplaint(id: number): Promise<boolean>;
  bulkUpdateStatus(ids: number[], status: string): Promise<number>;
  getComplaintsByUserId(userId: number): Promise<Complaint[]>;

  // Notes
  getNotes(complaintId: number): Promise<(Note & { authorName: string | null })[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Status History
  getStatusHistory(complaintId: number): Promise<StatusChange[]>;
  createStatusChange(change: { complaintId: number; fromStatus: string; toStatus: string; changedById?: number }): Promise<StatusChange>;

  // Team Management
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  getTeamMemberByEmail(email: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Saved Filters
  getSavedFilters(): Promise<SavedFilter[]>;
  createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter>;
  deleteSavedFilter(id: number): Promise<boolean>;

  // Stats & Logs
  getStats(): Promise<DashboardStats>;
  createLog(log: InsertLog): Promise<Log>;
  getLogs(): Promise<Log[]>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Field Technicians
  createFieldTechnician(tech: InsertFieldTechnician): Promise<FieldTechnician>;
  getFieldTechnicians(): Promise<(FieldTechnician & { supervisorName: string | null, complaintCount: number })[]>;
  getFieldTechnician(id: number): Promise<FieldTechnician | undefined>;

  // Detailed Evaluations (New System)
  createDetailedEvaluation(evalData: InsertDetailedEvaluation): Promise<DetailedEvaluation>;
  getDetailedEvaluations(technicianId: number): Promise<DetailedEvaluation[]>;

  // Legacy/Compatibility
  createDailyEvaluation(evalData: InsertDailyEvaluation): Promise<DailyEvaluation>;
  getDailyEvaluations(technicianId: number): Promise<DailyEvaluation[]>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  getTechnicianEvaluations(technicianId: number): Promise<(Evaluation & { evaluatorName: string | null, complaintTitle: string | null })[]>;

  // Stats
  getAllTechnicianStats(): Promise<{
    technicianId: number;
    technicianName: string;
    role: string;
    avgPunctuality: number;
    avgQuality: number;
    avgBehavior: number;
    avgOverall: number;
    totalEvaluations: number;
    // New KPIs
    reworkRate: number;
    commitmentRate: number;
    customerSatisfactionRate: number;
    classification: string;
  }[]>;
  getTechnicianStats(technicianId: number): Promise<{ averageRating: number; totalEvaluations: number }>;

  sessionStore: session.Store;
}

export class SqliteStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new session.MemoryStore();
  }

  // --- User Management ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(teamMembers).where(eq(teamMembers.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(teamMembers).values({
      ...insertUser,
      permissions: insertUser.permissions as any
    }).returning();
    return user;
  }

  // --- Complaint Management ---
  async getComplaints(): Promise<(Complaint & { notesCount: number })[]> {
    const result = await db.select({
      id: complaints.id,
      source: complaints.source,
      type: complaints.type,
      severity: complaints.severity,
      title: complaints.title,
      description: complaints.description,
      customerName: complaints.customerName,
      customerPhone: complaints.customerPhone,
      location: complaints.location,
      orderNumber: complaints.orderNumber,
      attachments: complaints.attachments,
      status: complaints.status,
      assignedTo: complaints.assignedTo,
      technicianId: complaints.technicianId,
      createdBy: complaints.createdBy,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
      notesCount: sql<number>`count(${notes.id})`.mapWith(Number)
    })
      .from(complaints)
      .leftJoin(notes, eq(complaints.id, notes.complaintId))
      .groupBy(complaints.id)
      .orderBy(desc(complaints.createdAt));
    return result;
  }

  async getComplaint(id: number): Promise<Complaint | undefined> {
    const result = await db.select().from(complaints).where(eq(complaints.id, id));
    return result[0];
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const result = await db.insert(complaints).values({
      ...complaint,
      attachments: complaint.attachments as any,
      status: "New",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateComplaint(id: number, updates: UpdateComplaint): Promise<Complaint | undefined> {
    const existing = await this.getComplaint(id);
    if (!existing) return undefined;

    const oldStatus = existing.status;

    const result = await db.update(complaints)
      .set({
        ...updates,
        attachments: updates.attachments as any,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    if (updates.status && updates.status !== oldStatus) {
      await this.createStatusChange({
        complaintId: id,
        fromStatus: oldStatus,
        toStatus: updates.status,
      });
    }

    return result[0];
  }

  async deleteComplaint(id: number): Promise<boolean> {
    await db.delete(notes).where(eq(notes.complaintId, id));
    await db.delete(statusChanges).where(eq(statusChanges.complaintId, id));
    const result = await db.delete(complaints).where(eq(complaints.id, id)).returning();
    return result.length > 0;
  }

  async bulkUpdateStatus(ids: number[], status: string): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const existing = await this.getComplaint(id);
      if (existing && existing.status !== status) {
        await this.updateComplaint(id, { status });
        count++;
      }
    }
    return count;
  }

  async getComplaintsByUserId(userId: number): Promise<Complaint[]> {
    return await db
      .select()
      .from(complaints)
      .where(eq(complaints.createdBy, userId))
      .orderBy(desc(complaints.createdAt));
  }

  // --- Notes ---
  async getNotes(complaintId: number): Promise<(Note & { authorName: string | null })[]> {
    return db.select({
      id: notes.id,
      complaintId: notes.complaintId,
      text: notes.text,
      authorId: notes.authorId,
      createdAt: notes.createdAt,
      authorName: teamMembers.name
    })
      .from(notes)
      .leftJoin(teamMembers, eq(notes.authorId, teamMembers.id))
      .where(eq(notes.complaintId, complaintId))
      .orderBy(desc(notes.createdAt));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values({
      ...note,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  // --- Status History ---
  async getStatusHistory(complaintId: number): Promise<StatusChange[]> {
    return db.select().from(statusChanges)
      .where(eq(statusChanges.complaintId, complaintId))
      .orderBy(desc(statusChanges.changedAt));
  }

  async createStatusChange(change: { complaintId: number; fromStatus: string; toStatus: string; changedById?: number }): Promise<StatusChange> {
    const result = await db.insert(statusChanges).values({
      complaintId: change.complaintId,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      changedById: change.changedById,
      changedAt: new Date(),
    }).returning();
    return result[0];
  }

  // --- Team Management ---
  async getTeamMembers(): Promise<TeamMember[]> {
    return db.select().from(teamMembers).orderBy(teamMembers.name);
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return result[0];
  }

  async getTeamMemberByEmail(email: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.email, email));
    return result[0];
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values({
      ...member,
      permissions: member.permissions as any,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers)
      .set({
        ...updates,
        permissions: updates.permissions as any,
      })
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return result.length > 0;
  }

  // --- Saved Filters ---
  async getSavedFilters(): Promise<SavedFilter[]> {
    return db.select().from(savedFilters).orderBy(desc(savedFilters.createdAt));
  }

  async createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter> {
    const result = await db.insert(savedFilters).values({
      ...filter,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async deleteSavedFilter(id: number): Promise<boolean> {
    const result = await db.delete(savedFilters).where(eq(savedFilters.id, id)).returning();
    return result.length > 0;
  }

  // --- Stats & Logs ---
  async getStats(): Promise<DashboardStats> {
    const allComplaints = await db.select().from(complaints);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: allComplaints.length,
      newToday: allComplaints.filter(c => new Date(c.createdAt) >= today).length,
      underReview: allComplaints.filter(c => c.status === "Under Review").length,
      resolved: allComplaints.filter(c => c.status === "Resolved" || c.status === "Closed").length,
    };
  }

  async createLog(log: InsertLog): Promise<Log> {
    const result = await db.insert(logs).values({
      ...log,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getLogs(): Promise<Log[]> {
    return db.select().from(logs).orderBy(desc(logs.createdAt)).limit(100);
  }

  // --- Notifications ---
  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values({
      ...notification,
      read: false,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  // --- Field Technicians ---
  async createFieldTechnician(tech: InsertFieldTechnician): Promise<FieldTechnician> {
    const result = await db.insert(fieldTechnicians).values({
      ...tech,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getFieldTechnicians(): Promise<(FieldTechnician & { supervisorName: string | null, complaintCount: number })[]> {
    return db.select({
      id: fieldTechnicians.id,
      name: fieldTechnicians.name,
      supervisorId: fieldTechnicians.supervisorId,
      phone: fieldTechnicians.phone,
      notes: fieldTechnicians.notes,
      specialization: fieldTechnicians.specialization,
      level: fieldTechnicians.level,
      area: fieldTechnicians.area,
      status: fieldTechnicians.status,
      joinDate: fieldTechnicians.joinDate,
      contractType: fieldTechnicians.contractType,
      createdAt: fieldTechnicians.createdAt,
      supervisorName: teamMembers.name,
      complaintCount: sql<number>`count(${complaints.id})`
    })
      .from(fieldTechnicians)
      .leftJoin(teamMembers, eq(fieldTechnicians.supervisorId, teamMembers.id))
      .leftJoin(complaints, eq(complaints.technicianId, fieldTechnicians.id))
      .groupBy(fieldTechnicians.id)
      .orderBy(fieldTechnicians.name);
  }

  async getFieldTechnician(id: number): Promise<FieldTechnician | undefined> {
    const result = await db.select().from(fieldTechnicians).where(eq(fieldTechnicians.id, id));
    return result[0];
  }

  // --- Detailed Evaluations (New) ---
  async createDetailedEvaluation(evalData: InsertDetailedEvaluation): Promise<DetailedEvaluation> {
    const result = await db.insert(detailedEvaluations).values({
      ...evalData,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getDetailedEvaluations(technicianId: number): Promise<(DetailedEvaluation & { evaluatorName: string | null })[]> {
    const result = await db
      .select({
        ...getTableColumns(detailedEvaluations),
        evaluatorName: teamMembers.name
      })
      .from(detailedEvaluations)
      .leftJoin(teamMembers, eq(detailedEvaluations.evaluatorId, teamMembers.id))
      .where(eq(detailedEvaluations.technicianId, technicianId))
      .orderBy(desc(detailedEvaluations.createdAt)); // Order by created time for better history log

    return result;
  }

  // --- Daily Evaluations (Legacy/Compatibility) ---
  async createDailyEvaluation(evalData: InsertDailyEvaluation): Promise<DailyEvaluation> {
    const result = await db.insert(dailyEvaluations).values({
      ...evalData,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getDailyEvaluations(technicianId: number): Promise<DailyEvaluation[]> {
    return db.select()
      .from(dailyEvaluations)
      .where(eq(dailyEvaluations.technicianId, technicianId))
      .orderBy(desc(dailyEvaluations.date));
  }

  // --- Evaluations (Legacy/TeamMember) ---
  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await db.insert(evaluations).values({
      ...evaluation,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getTechnicianEvaluations(technicianId: number): Promise<(Evaluation & { evaluatorName: string | null, complaintTitle: string | null })[]> {
    return db.select({
      id: evaluations.id,
      complaintId: evaluations.complaintId,
      technicianId: evaluations.technicianId,
      evaluatorId: evaluations.evaluatorId,
      ratingPunctuality: evaluations.ratingPunctuality,
      ratingQuality: evaluations.ratingQuality,
      ratingBehavior: evaluations.ratingBehavior,
      ratingOverall: evaluations.ratingOverall,
      notes: evaluations.notes,
      createdAt: evaluations.createdAt,
      evaluatorName: teamMembers.name,
      complaintTitle: complaints.title
    })
      .from(evaluations)
      .leftJoin(teamMembers, eq(evaluations.evaluatorId, teamMembers.id))
      .leftJoin(complaints, eq(evaluations.complaintId, complaints.id))
      .where(eq(evaluations.technicianId, technicianId))
      .orderBy(desc(evaluations.createdAt));
  }

  // --- Stats with New KPIs ---
  async getAllTechnicianStats(): Promise<{
    technicianId: number;
    technicianName: string;
    role: string;
    specialization: string;
    avgPunctuality: number;
    avgQuality: number;
    avgBehavior: number;
    avgOverall: number;
    totalEvaluations: number;
    reworkRate: number;
    commitmentRate: number;
    customerSatisfactionRate: number;
    classification: string;
  }[]> {
    // using detailedEvaluations for the accurate new system
    const result = await db.select({
      technicianId: fieldTechnicians.id,
      technicianName: fieldTechnicians.name,
      role: fieldTechnicians.level, // Use Level as Role
      specialization: fieldTechnicians.specialization,
      totalEvaluations: sql<number>`count(${detailedEvaluations.id})`,
      avgOverall: sql<number>`avg((${detailedEvaluations.ratingPunctuality} + ${detailedEvaluations.ratingDiagnosis} + ${detailedEvaluations.ratingQuality} + ${detailedEvaluations.ratingSpeed} + ${detailedEvaluations.ratingPricing} + ${detailedEvaluations.ratingAppearance}) / 6.0)`,
      avgPunctuality: sql<number>`avg(${detailedEvaluations.ratingPunctuality})`,
      avgQuality: sql<number>`avg(${detailedEvaluations.ratingQuality})`,
      avgBehavior: sql<number>`avg((${detailedEvaluations.behaviorRespect} + ${detailedEvaluations.behaviorExplain} + ${detailedEvaluations.behaviorPolicy} + ${detailedEvaluations.behaviorClean}) * 1.25)`,

      committedCount: sql<number>`sum(CASE WHEN ${detailedEvaluations.ratingPunctuality} >= 4 THEN 1 ELSE 0 END)`,
      reworkCount: sql<number>`sum(CASE WHEN ${detailedEvaluations.firstTimeFixed} = 0 THEN 1 ELSE 0 END)`,
      satisfiedCount: sql<number>`sum(CASE WHEN ${detailedEvaluations.customerRating} >= 4 THEN 1 ELSE 0 END)`
    })
      .from(fieldTechnicians)
      .leftJoin(detailedEvaluations, eq(fieldTechnicians.id, detailedEvaluations.technicianId))
      .groupBy(fieldTechnicians.id);

    return result.map(stats => {
      const total = Number(stats.totalEvaluations || 0);
      const avgOverall = Number(stats.avgOverall || 0);

      let classification = "غير معتمد";
      // 90% of 5 is 4.5
      if (avgOverall >= 4.5) classification = "ممتاز"; // > 90%
      else if (avgOverall >= 4.0) classification = "جيد جداً"; // 80-89%
      else if (avgOverall >= 3.25) classification = "يحتاج تحسين"; // 65-79%
      else classification = "غير معتمد"; // < 65%

      return {
        technicianId: stats.technicianId,
        technicianName: stats.technicianName,
        role: stats.role,
        specialization: stats.specialization,
        avgPunctuality: Number(stats.avgPunctuality || 0),
        avgQuality: Number(stats.avgQuality || 0),
        avgBehavior: Number(stats.avgBehavior || 0),
        avgOverall: avgOverall,
        totalEvaluations: total,
        reworkRate: total > 0 ? (Number(stats.reworkCount || 0) / total) * 100 : 0,
        commitmentRate: total > 0 ? (Number(stats.committedCount || 0) / total) * 100 : 0,
        customerSatisfactionRate: total > 0 ? (Number(stats.satisfiedCount || 0) / total) * 100 : 0,
        classification
      };
    });
  }

  async getTechnicianStats(technicianId: number): Promise<{ averageRating: number; totalEvaluations: number }> {
    // Legacy support for route
    const result = await db
      .select({
        avg: sql<number>`avg(${evaluations.ratingOverall})`,
        count: sql<number>`count(${evaluations.id})`
      })
      .from(evaluations)
      .where(eq(evaluations.technicianId, technicianId));

    const stats = result[0];
    return {
      averageRating: Number(stats?.avg || 0),
      totalEvaluations: Number(stats?.count || 0)
    };
  }
}

export const storage = new SqliteStorage();
