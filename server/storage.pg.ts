import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { db } from "./db.pg";
import {
    complaints,
    notes,
    statusChanges,
    teamMembers,
    savedFilters,
    logs,
    type Complaint,
    type InsertComplaint,
    type UpdateComplaint,
    type Note,
    type InsertNote,
    type StatusChange,
    type TeamMember,
    type InsertTeamMember,
    type SavedFilter,
    type InsertSavedFilter,
    type Log,
    type InsertLog,
    notifications,
    type Notification,
    type InsertNotification,
    type DashboardStats,
} from "@shared/schema.pg";
import { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
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

    async getTeamMembers(): Promise<TeamMember[]> {
        return db.select().from(teamMembers).orderBy(teamMembers.name);
    }

    async getTeamMember(id: number): Promise<TeamMember | undefined> {
        const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
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
    async getTeamMemberByEmail(email: string): Promise<TeamMember | undefined> {
        const result = await db.select().from(teamMembers).where(eq(teamMembers.email, email));
        return result[0];
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

    // Implement missing methods with stubs or simple throws if unimplemented in DB schema

    async getUser(id: number): Promise<TeamMember | undefined> {
        return this.getTeamMember(id); // Stub: assuming users are team members
    }

    async getUserByUsername(username: string): Promise<TeamMember | undefined> {
        return this.getTeamMemberByEmail(username);
    }

    async createUser(user: InsertTeamMember): Promise<TeamMember> {
        return this.createTeamMember(user);
    }

    // Evaluations & Field Technicians - Stubs mostly as PG schema might lag behind SQLite
    async createFieldTechnician(tech: any): Promise<any> { throw new Error("Not implemented in Postgres yet"); }
    async getFieldTechnicians(supervisorId?: number): Promise<any[]> { throw new Error("Not implemented in Postgres yet"); }
    async getFieldTechnician(id: number): Promise<any> { throw new Error("Not implemented in Postgres yet"); }
    async deleteFieldTechnician(id: number): Promise<boolean> { throw new Error("Not implemented in Postgres yet"); }
    async updateFieldTechnicianStatus(id: number, status: string): Promise<any> { throw new Error("Not implemented in Postgres yet"); }

    async createDetailedEvaluation(evalData: any): Promise<any> { throw new Error("Not implemented in Postgres yet"); }
    async getDetailedEvaluations(technicianId: number): Promise<any[]> { throw new Error("Not implemented in Postgres yet"); }

    async createDailyEvaluation(evalData: any): Promise<any> { throw new Error("Not implemented in Postgres yet"); }
    async getDailyEvaluations(technicianId: number): Promise<any[]> { throw new Error("Not implemented in Postgres yet"); }

    async createEvaluation(evaluation: any): Promise<any> { throw new Error("Not implemented in Postgres yet"); }
    async getTechnicianEvaluations(technicianId: number): Promise<any[]> { throw new Error("Not implemented in Postgres yet"); }

    async getAllTechnicianStats(): Promise<any[]> { throw new Error("Not implemented in Postgres yet"); }
    async getTechnicianStats(technicianId: number): Promise<{ averageRating: number; totalEvaluations: number }> { throw new Error("Not implemented in Postgres yet"); }

    sessionStore: any; // Mock for compatibility
}
