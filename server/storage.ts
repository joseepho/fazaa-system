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
  type DashboardStats,
  serviceRequests, type ServiceRequest, type InsertServiceRequest,
  serviceRequestNotes, type ServiceRequestNote, type InsertServiceRequestNote,
  serviceRequestStatusChanges, type ServiceRequestStatusChange, type InsertServiceRequestStatusChange,
  serviceRequestAssignments
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, sql, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
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
  updateFieldTechnician(id: number, updates: Partial<InsertFieldTechnician>): Promise<FieldTechnician | undefined>;
  deleteFieldTechnician(id: number): Promise<boolean>;
  updateFieldTechnicianStatus(id: number, status: string): Promise<FieldTechnician | undefined>;

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
    status: string; // Added status
    supervisorId: number | null; // Added supervisorId
    supervisorName: string | null; // Added supervisorName
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
  getServiceRequestStats(): Promise<any>;
  getServiceRequestReports(): Promise<any>;

  // Service Requests
  createServiceRequest(req: InsertServiceRequest): Promise<ServiceRequest>;
  getServiceRequests(): Promise<(ServiceRequest & { technicianName: string | null })[]>;
  getServiceRequestById(id: number): Promise<(ServiceRequest & { technicianName: string | null; technicianPhone: string | null; supervisorName: string | null; technicianSpecialization: string | null }) | undefined>;
  updateServiceRequest(id: number, updates: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined>;
  deleteServiceRequest(id: number): Promise<boolean>;
  updateServiceRequestStatus(id: number, status: string, userId?: number): Promise<ServiceRequest | undefined>;
  getServiceRequestNotes(requestId: number): Promise<(ServiceRequestNote & { authorName: string | null })[]>;
  createServiceRequestNote(note: InsertServiceRequestNote): Promise<ServiceRequestNote>;
  getServiceRequestStatusHistory(requestId: number): Promise<ServiceRequestStatusChange[]>;
  createServiceRequestStatusChange(change: InsertServiceRequestStatusChange): Promise<ServiceRequestStatusChange>;
  updateServiceRequestTechnician(id: number, technicianId: number, userId: number): Promise<ServiceRequest | undefined>;
  getServiceRequestAssignments(requestId: number): Promise<any[]>;
  getServiceRequestByOrderNumber(orderNumber: string): Promise<ServiceRequest | undefined>;

  sessionStore: session.Store;
}

export class SqliteStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new session.MemoryStore();
  }

  async getServiceRequestByOrderNumber(orderNumber: string): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.orderNumber, orderNumber));
    return request;
  }

  async getServiceRequestReports(): Promise<any> {
    const allRequests = await db.select({
      id: serviceRequests.id,
      status: serviceRequests.status,
      requestDate: serviceRequests.requestDate,
      technicianId: serviceRequests.technicianId,
      paymentMethod: serviceRequests.paymentMethod,
      executionDuration: serviceRequests.executionDuration,
      technicianName: fieldTechnicians.name
    })
      .from(serviceRequests)
      .leftJoin(fieldTechnicians, eq(serviceRequests.technicianId, fieldTechnicians.id));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Status Distribution
    const statusMap: Record<string, string> = {
      "New": "جديد",
      "In Progress": "جاري التنفيذ",
      "Completed": "مكتمل",
      "On Hold": "مؤجل",
      "Cancelled": "ملغي",
    };

    const statusDist = allRequests.reduce((acc, curr) => {
      const translatedStatus = statusMap[curr.status] || curr.status;
      acc[translatedStatus] = (acc[translatedStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 2. Technician Workload (Top 5)
    const techWorkload = allRequests.reduce((acc, curr) => {
      const name = curr.technicianName || "غير محدد";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTechnicians = Object.entries(techWorkload)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    // 3. Daily Stats (Last 30 Days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const dailyStatsMap = allRequests.filter(r => new Date(r.requestDate) >= last30Days).reduce((acc, curr) => {
      const dateStr = new Date(curr.requestDate).toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!acc[dateStr]) acc[dateStr] = { date: dateStr, count: 0, completed: 0 };
      acc[dateStr].count++;
      if (curr.status === 'Completed') acc[dateStr].completed++;
      return acc;
    }, {} as Record<string, any>);

    const dailyTrend = Object.values(dailyStatsMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const total = allRequests.length;
    const completed = allRequests.filter(r => r.status === 'Completed').length;
    const openRequests = allRequests.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const durations = allRequests.filter(r => r.executionDuration).map(r => r.executionDuration as number);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const thisMonthRequests = allRequests.filter(r => new Date(r.requestDate) >= startOfMonth).length;

    // 5. Payment Methods
    const paymentStats = allRequests.reduce((acc, curr) => {
      acc[curr.paymentMethod] = (acc[curr.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      topTechnicians,
      dailyTrend,
      kpi: {
        total,
        completed,
        openRequests, // Added Open Requests
        completionRate,
        avgDuration,
        thisMonth: thisMonthRequests
      },
      paymentMethods: Object.entries(paymentStats).map(([name, value]) => ({ name, value }))
    };
  }

  // --- Service Requests Implementation ---
  async createServiceRequest(req: InsertServiceRequest): Promise<ServiceRequest> {
    const [result] = await db.insert(serviceRequests).values({
      ...req,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }

  async getServiceRequests(): Promise<(ServiceRequest & { technicianName: string | null })[]> {
    return db.select({
      ...getTableColumns(serviceRequests),
      technicianName: fieldTechnicians.name
    })
      .from(serviceRequests)
      .leftJoin(fieldTechnicians, eq(serviceRequests.technicianId, fieldTechnicians.id))
      .orderBy(desc(serviceRequests.requestDate));
  }

  async getServiceRequestById(id: number): Promise<(ServiceRequest & { technicianName: string | null; technicianPhone: string | null; supervisorName: string | null; technicianSpecialization: string | null }) | undefined> {
    const [result] = await db.select({
      ...getTableColumns(serviceRequests),
      technicianName: fieldTechnicians.name,
      technicianPhone: fieldTechnicians.phone,
      technicianSpecialization: fieldTechnicians.specialization,
      supervisorName: teamMembers.name
    })
      .from(serviceRequests)
      .leftJoin(fieldTechnicians, eq(serviceRequests.technicianId, fieldTechnicians.id))
      .leftJoin(teamMembers, eq(fieldTechnicians.supervisorId, teamMembers.id))
      .where(eq(serviceRequests.id, id));
    return result;
  }

  async updateServiceRequest(id: number, updates: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    const [result] = await db.update(serviceRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return result;
  }

  async deleteServiceRequest(id: number): Promise<boolean> {
    await db.delete(serviceRequestNotes).where(eq(serviceRequestNotes.requestId, id));
    await db.delete(serviceRequestStatusChanges).where(eq(serviceRequestStatusChanges.requestId, id));
    await db.delete(serviceRequestAssignments).where(eq(serviceRequestAssignments.requestId, id));
    const [result] = await db.delete(serviceRequests).where(eq(serviceRequests.id, id)).returning();
    return !!result;
  }

  async updateServiceRequestTechnician(id: number, technicianId: number, userId: number): Promise<ServiceRequest | undefined> {
    const [original] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    if (!original) return undefined;

    if (original.technicianId === technicianId) return original;

    const [updated] = await db
      .update(serviceRequests)
      .set({ technicianId, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();

    await db.insert(serviceRequestAssignments).values({
      requestId: id,
      fromTechnicianId: original.technicianId,
      toTechnicianId: technicianId,
      changedById: userId
    });

    return updated;
  }

  async getServiceRequestAssignments(requestId: number): Promise<any[]> {
    const fromTech = alias(fieldTechnicians, "fromTech");
    const toTech = alias(fieldTechnicians, "toTech");

    return db.select({
      id: serviceRequestAssignments.id,
      fromTechnicianName: fromTech.name,
      toTechnicianName: toTech.name,
      changedByName: teamMembers.name,
      changedAt: serviceRequestAssignments.changedAt
    })
      .from(serviceRequestAssignments)
      .leftJoin(fromTech, eq(serviceRequestAssignments.fromTechnicianId, fromTech.id))
      .leftJoin(toTech, eq(serviceRequestAssignments.toTechnicianId, toTech.id))
      .leftJoin(teamMembers, eq(serviceRequestAssignments.changedById, teamMembers.id))
      .where(eq(serviceRequestAssignments.requestId, requestId))
      .orderBy(desc(serviceRequestAssignments.changedAt));
  }

  async updateServiceRequestStatus(id: number, status: string, userId?: number): Promise<ServiceRequest | undefined> {
    const existing = await this.getServiceRequestById(id);
    if (!existing) return undefined;

    if (existing.status !== status) {
      await this.createServiceRequestStatusChange({
        requestId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedById: userId
      });
    }

    const updates: any = { status, updatedAt: new Date() };

    if (status === "Completed") {
      updates.completedAt = new Date();
      if (existing.status === "In Progress") {
        const lastInProgress = await db.select()
          .from(serviceRequestStatusChanges)
          .where(and(
            eq(serviceRequestStatusChanges.requestId, id),
            eq(serviceRequestStatusChanges.toStatus, "In Progress")
          ))
          .orderBy(desc(serviceRequestStatusChanges.changedAt))
          .limit(1);

        if (lastInProgress.length > 0) {
          const startTime = lastInProgress[0].changedAt;
          const durationMs = new Date().getTime() - startTime.getTime();
          updates.executionDuration = Math.round(durationMs / 60000); // Minutes
        }
      }
    }

    const [result] = await db.update(serviceRequests)
      .set(updates)
      .where(eq(serviceRequests.id, id))
      .returning();
    return result;
  }

  async getServiceRequestNotes(requestId: number): Promise<(ServiceRequestNote & { authorName: string | null })[]> {
    return db.select({
      ...getTableColumns(serviceRequestNotes),
      authorName: teamMembers.name
    })
      .from(serviceRequestNotes)
      .leftJoin(teamMembers, eq(serviceRequestNotes.authorId, teamMembers.id))
      .where(eq(serviceRequestNotes.requestId, requestId))
      .orderBy(desc(serviceRequestNotes.createdAt));
  }

  async createServiceRequestNote(note: InsertServiceRequestNote): Promise<ServiceRequestNote> {
    const [result] = await db.insert(serviceRequestNotes).values({
      ...note,
      createdAt: new Date()
    }).returning();
    return result;
  }

  async getServiceRequestStatusHistory(requestId: number): Promise<ServiceRequestStatusChange[]> {
    return db.select().from(serviceRequestStatusChanges)
      .where(eq(serviceRequestStatusChanges.requestId, requestId))
      .orderBy(desc(serviceRequestStatusChanges.changedAt));
  }

  async createServiceRequestStatusChange(change: InsertServiceRequestStatusChange): Promise<ServiceRequestStatusChange> {
    const [result] = await db.insert(serviceRequestStatusChanges).values({
      ...change,
      changedAt: new Date()
    }).returning();
    return result;
  }
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

  async updateFieldTechnician(id: number, updates: Partial<InsertFieldTechnician>): Promise<FieldTechnician | undefined> {
    const [result] = await db.update(fieldTechnicians)
      .set({ ...updates })
      .where(eq(fieldTechnicians.id, id))
      .returning();
    return result;
  }

  async deleteFieldTechnician(id: number): Promise<boolean> {
    const [result] = await db.delete(fieldTechnicians).where(eq(fieldTechnicians.id, id)).returning();
    return !!result;
  }

  async updateFieldTechnicianStatus(id: number, status: string): Promise<FieldTechnician | undefined> {
    const [result] = await db.update(fieldTechnicians)
      .set({ status })
      .where(eq(fieldTechnicians.id, id))
      .returning();
    return result;
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
      status: fieldTechnicians.status,
      supervisorId: fieldTechnicians.supervisorId,
      supervisorName: teamMembers.name,
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
      .leftJoin(teamMembers, eq(fieldTechnicians.supervisorId, teamMembers.id))
      .groupBy(fieldTechnicians.id, teamMembers.name, teamMembers.id);

    return result.map(stats => {
      const total = Number(stats.totalEvaluations || 0);
      const avgOverall = Number(stats.avgOverall || 0);

      let classification = "غير معتمد";
      // 90% of 5 is 4.5
      if (total === 0) classification = "جديد"; // New technician
      else if (avgOverall >= 4.5) classification = "ممتاز"; // > 90%
      else if (avgOverall >= 4.0) classification = "جيد جداً"; // 80-89%
      else if (avgOverall >= 3.25) classification = "يحتاج تحسين"; // 65-79%
      else classification = "غير معتمد"; // < 65%

      return {
        technicianId: stats.technicianId,
        technicianName: stats.technicianName,
        role: stats.role,
        status: stats.status, // Mapped status
        supervisorId: stats.supervisorId, // Mapped supervisorId
        supervisorName: stats.supervisorName, // Mapped supervisorName
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
