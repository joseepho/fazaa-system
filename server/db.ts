import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";
import { scryptSync, randomBytes } from "crypto";

// Determine database path
// In production, use USER_DATA_PATH/fazza.db
// In dev, use local fazza.db
let dbPath = "fazza.db";
if (process.env.USER_DATA_PATH) {
  dbPath = path.join(process.env.USER_DATA_PATH, "fazza.db");

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

console.log(`Using database at: ${dbPath}`);

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize database tables if they don't exist
const initDb = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL DEFAULT 'password',
      role TEXT NOT NULL DEFAULT 'Agent',
      permissions TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES team_members(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      location TEXT DEFAULT '',
      order_number TEXT DEFAULT '',
      attachments TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'New',
      assigned_to INTEGER REFERENCES team_members(id),
      created_by INTEGER REFERENCES team_members(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id),
      text TEXT NOT NULL,
      author_id INTEGER REFERENCES team_members(id),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id),
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      changed_by_id INTEGER REFERENCES team_members(id),
      changed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES team_members(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id),
      technician_id INTEGER NOT NULL REFERENCES team_members(id),
      evaluator_id INTEGER NOT NULL REFERENCES team_members(id),
      rating_punctuality INTEGER NOT NULL,
      rating_quality INTEGER NOT NULL,
      rating_behavior INTEGER NOT NULL,
      rating_overall INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS field_technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      specialization TEXT NOT NULL,
      level TEXT NOT NULL,
      area TEXT NOT NULL,
      join_date TEXT NOT NULL,
      contract_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      notes TEXT,
      supervisor_id INTEGER REFERENCES team_members(id),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detailed_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technician_id INTEGER NOT NULL REFERENCES field_technicians(id),
      evaluator_id INTEGER REFERENCES team_members(id),
      order_number TEXT NOT NULL,
      order_date TEXT NOT NULL,
      service_type TEXT NOT NULL,
      arrival_time TEXT,
      completion_time TEXT,
      first_time_fixed INTEGER DEFAULT 1,
      rating_punctuality INTEGER NOT NULL,
      rating_diagnosis INTEGER NOT NULL,
      rating_quality INTEGER NOT NULL,
      rating_speed INTEGER NOT NULL,
      rating_pricing INTEGER NOT NULL,
      rating_appearance INTEGER NOT NULL,
      behavior_respect INTEGER NOT NULL,
      behavior_explain INTEGER NOT NULL,
      behavior_policy INTEGER NOT NULL,
      behavior_clean INTEGER NOT NULL,
      technical_errors TEXT,
      behavioral_notes TEXT,
      needs_training INTEGER DEFAULT 0,
      training_type TEXT,
      customer_rating INTEGER,
      customer_complained INTEGER DEFAULT 0,
      customer_rehire INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );
  `);

  // Migrations for Team Members (from previous steps)
  try { sqlite.prepare("SELECT password FROM team_members LIMIT 1").get(); }
  catch { sqlite.exec("ALTER TABLE team_members ADD COLUMN password TEXT NOT NULL DEFAULT 'password'"); }

  try { sqlite.prepare("SELECT permissions FROM team_members LIMIT 1").get(); }
  catch { sqlite.exec("ALTER TABLE team_members ADD COLUMN permissions TEXT DEFAULT '[]'"); }

  // Migrations for Complaints
  try { sqlite.prepare("SELECT order_number FROM complaints LIMIT 1").get(); }
  catch { sqlite.exec("ALTER TABLE complaints ADD COLUMN order_number TEXT DEFAULT ''"); }

  try { sqlite.prepare("SELECT created_by FROM complaints LIMIT 1").get(); }
  catch { sqlite.exec("ALTER TABLE complaints ADD COLUMN created_by INTEGER REFERENCES team_members(id)"); }

  try { sqlite.prepare("SELECT technician_id FROM complaints LIMIT 1").get(); }
  catch { sqlite.exec("ALTER TABLE complaints ADD COLUMN technician_id INTEGER REFERENCES field_technicians(id)"); }

  // Migrations for Field Technicians expansion
  const ftColumns = [
    ["specialization", "TEXT NOT NULL DEFAULT 'General'"],
    ["level", "TEXT NOT NULL DEFAULT 'Beginner'"],
    ["area", "TEXT NOT NULL DEFAULT 'Riyadh'"],
    ["join_date", "TEXT NOT NULL DEFAULT '2024-01-01'"],
    ["contract_type", "TEXT NOT NULL DEFAULT 'FullTime'"],
    ["status", "TEXT NOT NULL DEFAULT 'Active'"]
  ];

  ftColumns.forEach(([col, type]) => {
    try {
      sqlite.prepare(`SELECT ${col} FROM field_technicians LIMIT 1`).get();
    } catch (e) {
      console.log(`Migrating field_technicians: Adding ${col}`);
      sqlite.exec(`ALTER TABLE field_technicians ADD COLUMN ${col} ${type}`);
    }
  });

  // Create default admin if no users exist
  try {
    const userCount = sqlite.prepare("SELECT COUNT(*) as count FROM team_members").get() as { count: number };
    if (userCount.count === 0) {
      console.log("Creating default admin user...");
      const salt = randomBytes(16).toString("hex");
      const hashedPassword = scryptSync("admin123", salt, 64).toString("hex") + "." + salt;

      sqlite.prepare(`
        INSERT INTO team_members (name, email, password, role, created_at, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run("Admin", "admin@fazza.com", hashedPassword, "Admin", Date.now(), '[]');
      console.log("Default admin created: admin@fazza.com / admin123");
    }
  } catch (err) {
    console.error("Error checking/creating default admin:", err);
  }
};

initDb();
