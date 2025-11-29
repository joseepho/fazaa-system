import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  complaints,
  notes,
  statusChanges,
  teamMembers,
  savedFilters,
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
  type DashboardStats,
} from "@shared/schema";

export interface IStorage {
  getComplaints(): Promise<Complaint[]>;
  getComplaint(id: number): Promise<Complaint | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: number, updates: UpdateComplaint): Promise<Complaint | undefined>;
  deleteComplaint(id: number): Promise<boolean>;
  bulkUpdateStatus(ids: number[], status: string): Promise<number>;
  
  getNotes(complaintId: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  
  getStatusHistory(complaintId: number): Promise<StatusChange[]>;
  createStatusChange(change: { complaintId: number; fromStatus: string; toStatus: string; changedById?: number }): Promise<StatusChange>;
  
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  getSavedFilters(): Promise<SavedFilter[]>;
  createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter>;
  deleteSavedFilter(id: number): Promise<boolean>;
  
  getStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getComplaints(): Promise<Complaint[]> {
    return db.select().from(complaints).orderBy(desc(complaints.createdAt));
  }

  async getComplaint(id: number): Promise<Complaint | undefined> {
    const result = await db.select().from(complaints).where(eq(complaints.id, id));
    return result[0];
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const result = await db.insert(complaints).values({
      ...complaint,
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

  async getNotes(complaintId: number): Promise<Note[]> {
    return db.select().from(notes)
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
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers)
      .set(updates)
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
}

export const storage = new DatabaseStorage();
