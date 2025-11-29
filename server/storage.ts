import { randomUUID } from "crypto";
import type {
  Complaint,
  InsertComplaint,
  UpdateComplaint,
  Note,
  InsertNote,
  DashboardStats,
  StatusChange,
  ComplaintStatus,
} from "@shared/schema";

export interface IStorage {
  getComplaints(): Promise<Complaint[]>;
  getComplaint(id: string): Promise<Complaint | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: string, updates: UpdateComplaint): Promise<Complaint | undefined>;
  deleteComplaint(id: string): Promise<boolean>;
  
  getNotes(complaintId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  
  getStatusHistory(complaintId: string): Promise<StatusChange[]>;
  
  getStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private complaints: Map<string, Complaint>;
  private notes: Map<string, Note>;
  private statusChanges: Map<string, StatusChange>;

  constructor() {
    this.complaints = new Map();
    this.notes = new Map();
    this.statusChanges = new Map();
    
    this.seedData();
  }

  private seedData() {
    const sampleComplaints: InsertComplaint[] = [
      {
        source: "Social Media",
        type: "Technical",
        severity: "High",
        title: "App crashes on startup",
        description: "The application crashes immediately after opening on iOS devices. This issue started after the latest update.",
        customerName: "Ahmed Al-Salem",
        customerPhone: "+966501234567",
        location: "Riyadh, Saudi Arabia",
        attachments: [],
      },
      {
        source: "Google Play",
        type: "Service Quality",
        severity: "Medium",
        title: "Poor service response time",
        description: "Waited over 30 minutes for a driver to arrive. The estimated time was only 10 minutes.",
        customerName: "Mohammed Hassan",
        customerPhone: "+966502345678",
        location: "Jeddah, Saudi Arabia",
        attachments: [],
      },
      {
        source: "App Store",
        type: "Payment",
        severity: "Urgent",
        title: "Double charged for service",
        description: "I was charged twice for the same trip. Please refund the duplicate charge immediately.",
        customerName: "Fatima Al-Qahtani",
        customerPhone: "+966503456789",
        location: "Dammam, Saudi Arabia",
        attachments: [],
      },
      {
        source: "Phone",
        type: "Behavioral",
        severity: "High",
        title: "Unprofessional driver behavior",
        description: "The driver was rude and refused to follow the route I requested. Very unprofessional experience.",
        customerName: "Sara Abdullah",
        customerPhone: "+966504567890",
        location: "Mecca, Saudi Arabia",
        attachments: [],
      },
      {
        source: "Email",
        type: "Delay",
        severity: "Normal",
        title: "Service delay issue",
        description: "Multiple instances of delayed service over the past week. Please investigate.",
        customerName: "Khalid Ibrahim",
        customerPhone: "+966505678901",
        location: "Medina, Saudi Arabia",
        attachments: [],
      },
      {
        source: "App Support",
        type: "App",
        severity: "Medium",
        title: "Cannot update profile",
        description: "Unable to update my phone number in the app. The save button doesn't work.",
        customerName: "Nora Al-Shehri",
        customerPhone: "+966506789012",
        location: "Khobar, Saudi Arabia",
        attachments: [],
      },
      {
        source: "Field",
        type: "Price",
        severity: "Normal",
        title: "Pricing discrepancy",
        description: "The final price was higher than the estimated price shown in the app.",
        customerName: "Omar Al-Rashid",
        customerPhone: "+966507890123",
        location: "Tabuk, Saudi Arabia",
        attachments: [],
      },
    ];

    const statuses: ComplaintStatus[] = ["New", "Under Review", "Resolved", "Pending Customer", "Closed"];
    
    const sampleNotes = [
      "Initial investigation started. Checking device logs.",
      "Customer contacted for more details.",
      "Issue escalated to technical team.",
      "Awaiting customer response.",
      "Resolution provided and verified."
    ];

    sampleComplaints.forEach((complaint, index) => {
      const id = randomUUID();
      const now = new Date();
      const createdAt = new Date(now.getTime() - (index * 24 * 60 * 60 * 1000));
      
      const status = statuses[index % statuses.length];
      
      this.complaints.set(id, {
        id,
        ...complaint,
        status,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });

      if (status !== "New") {
        const changeId = randomUUID();
        this.statusChanges.set(changeId, {
          id: changeId,
          complaintId: id,
          fromStatus: "New",
          toStatus: status,
          changedAt: new Date(createdAt.getTime() + 3600000).toISOString(),
        });
      }

      if (index < 3) {
        const noteId = randomUUID();
        this.notes.set(noteId, {
          id: noteId,
          complaintId: id,
          text: sampleNotes[index % sampleNotes.length],
          createdAt: new Date(createdAt.getTime() + 7200000).toISOString(),
        });
      }
    });
  }

  async getComplaints(): Promise<Complaint[]> {
    return Array.from(this.complaints.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getComplaint(id: string): Promise<Complaint | undefined> {
    return this.complaints.get(id);
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const newComplaint: Complaint = {
      id,
      source: complaint.source,
      type: complaint.type,
      severity: complaint.severity,
      title: complaint.title,
      description: complaint.description,
      customerName: complaint.customerName || "",
      customerPhone: complaint.customerPhone || "",
      location: complaint.location || "",
      attachments: complaint.attachments || [],
      status: "New",
      createdAt: now,
      updatedAt: now,
    };
    
    this.complaints.set(id, newComplaint);
    return newComplaint;
  }

  async updateComplaint(id: string, updates: UpdateComplaint): Promise<Complaint | undefined> {
    const complaint = this.complaints.get(id);
    if (!complaint) return undefined;

    const oldStatus = complaint.status;
    const now = new Date().toISOString();

    const updatedComplaint: Complaint = {
      ...complaint,
      ...updates,
      updatedAt: now,
    };

    this.complaints.set(id, updatedComplaint);

    if (updates.status && updates.status !== oldStatus) {
      const changeId = randomUUID();
      this.statusChanges.set(changeId, {
        id: changeId,
        complaintId: id,
        fromStatus: oldStatus,
        toStatus: updates.status,
        changedAt: now,
      });
    }

    return updatedComplaint;
  }

  async deleteComplaint(id: string): Promise<boolean> {
    const notesToDelete = Array.from(this.notes.values())
      .filter(note => note.complaintId === id);
    notesToDelete.forEach(note => this.notes.delete(note.id));

    const changesToDelete = Array.from(this.statusChanges.values())
      .filter(change => change.complaintId === id);
    changesToDelete.forEach(change => this.statusChanges.delete(change.id));

    return this.complaints.delete(id);
  }

  async getNotes(complaintId: string): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.complaintId === complaintId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = randomUUID();
    const newNote: Note = {
      id,
      complaintId: note.complaintId,
      text: note.text,
      createdAt: new Date().toISOString(),
    };
    
    this.notes.set(id, newNote);
    return newNote;
  }

  async getStatusHistory(complaintId: string): Promise<StatusChange[]> {
    return Array.from(this.statusChanges.values())
      .filter(change => change.complaintId === complaintId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  async getStats(): Promise<DashboardStats> {
    const complaints = Array.from(this.complaints.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: complaints.length,
      newToday: complaints.filter(c => new Date(c.createdAt) >= today).length,
      underReview: complaints.filter(c => c.status === "Under Review").length,
      resolved: complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length,
    };
  }
}

export const storage = new MemStorage();
