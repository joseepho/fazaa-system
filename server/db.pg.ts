import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema.pg";


if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

const initDb = async () => {
  try {
    const client = await pool.connect();
    try {
      console.log("Checking Postgres database schema...");

      // Helper to check if table exists
      const tableExists = async (tableName: string) => {
        const res = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);
        return res.rows[0].exists;
      };

      // Create team_members
      if (!(await tableExists('team_members'))) {
        console.log("Creating team_members table...");
        await client.query(`
          CREATE TABLE team_members (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Agent',
            permissions JSONB DEFAULT '[]',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create logs
      if (!(await tableExists('logs'))) {
        console.log("Creating logs table...");
        await client.query(`
          CREATE TABLE logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES team_members(id),
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            details JSONB DEFAULT '{}',
            ip_address TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create complaints
      if (!(await tableExists('complaints'))) {
        console.log("Creating complaints table...");
        await client.query(`
          CREATE TABLE complaints (
            id SERIAL PRIMARY KEY,
            source TEXT NOT NULL,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            customer_name TEXT DEFAULT '',
            customer_phone TEXT DEFAULT '',
            location TEXT DEFAULT '',
            order_number TEXT DEFAULT '',
            attachments JSONB DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'New',
            assigned_to INTEGER REFERENCES team_members(id),
            created_by INTEGER REFERENCES team_members(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create notes
      if (!(await tableExists('notes'))) {
        console.log("Creating notes table...");
        await client.query(`
          CREATE TABLE notes (
            id SERIAL PRIMARY KEY,
            complaint_id INTEGER NOT NULL REFERENCES complaints(id),
            text TEXT NOT NULL,
            author_id INTEGER REFERENCES team_members(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create status_changes
      if (!(await tableExists('status_changes'))) {
        console.log("Creating status_changes table...");
        await client.query(`
          CREATE TABLE status_changes (
            id SERIAL PRIMARY KEY,
            complaint_id INTEGER NOT NULL REFERENCES complaints(id),
            from_status TEXT NOT NULL,
            to_status TEXT NOT NULL,
            changed_by_id INTEGER REFERENCES team_members(id),
            changed_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create saved_filters
      if (!(await tableExists('saved_filters'))) {
        console.log("Creating saved_filters table...");
        await client.query(`
          CREATE TABLE saved_filters (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            filters TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }

      // Create notifications
      if (!(await tableExists('notifications'))) {
        console.log("Creating notifications table...");
        await client.query(`
          CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES team_members(id),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
      }
      // Migrations for existing tables (Column checks)

      // Check for password column in team_members
      try {
        await client.query("SELECT password FROM team_members LIMIT 1");
      } catch (e) {
        console.log("Adding password column to team_members...");
        await client.query("ALTER TABLE team_members ADD COLUMN password TEXT NOT NULL DEFAULT 'password'");
      }

      // Check for permissions column in team_members
      try {
        await client.query("SELECT permissions FROM team_members LIMIT 1");
      } catch (e) {
        console.log("Adding permissions column to team_members...");
        await client.query("ALTER TABLE team_members ADD COLUMN permissions JSONB DEFAULT '[]'");
      }

      // Check for order_number in complaints
      try {
        await client.query("SELECT order_number FROM complaints LIMIT 1");
      } catch (e) {
        console.log("Adding order_number column to complaints...");
        await client.query("ALTER TABLE complaints ADD COLUMN order_number TEXT DEFAULT ''");
      }

      // Check for created_by in complaints
      try {
        await client.query("SELECT created_by FROM complaints LIMIT 1");
      } catch (e) {
        console.log("Adding created_by column to complaints...");
        await client.query("ALTER TABLE complaints ADD COLUMN created_by INTEGER REFERENCES team_members(id)");
      }

      // Migrate ARRAY columns to JSONB if needed
      try {
        // Check complaints.attachments
        const attachmentsCheck = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'complaints' AND column_name = 'attachments'
        `);
        if (attachmentsCheck.rows[0]?.data_type === 'ARRAY') {
          console.log("Migrating complaints.attachments from ARRAY to JSONB...");
          await client.query("ALTER TABLE complaints ALTER COLUMN attachments DROP DEFAULT");
          await client.query("ALTER TABLE complaints ALTER COLUMN attachments TYPE JSONB USING to_jsonb(attachments)");
          await client.query("ALTER TABLE complaints ALTER COLUMN attachments SET DEFAULT '[]'::jsonb");
        }

        // Check team_members.permissions
        const permissionsCheck = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'team_members' AND column_name = 'permissions'
        `);
        if (permissionsCheck.rows[0]?.data_type === 'ARRAY') {
          console.log("Migrating team_members.permissions from ARRAY to JSONB...");
          await client.query("ALTER TABLE team_members ALTER COLUMN permissions DROP DEFAULT");
          await client.query("ALTER TABLE team_members ALTER COLUMN permissions TYPE JSONB USING to_jsonb(permissions)");
          await client.query("ALTER TABLE team_members ALTER COLUMN permissions SET DEFAULT '[]'::jsonb");
        }

        // Check logs.details
        const logsCheck = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'logs' AND column_name = 'details'
        `);
        if (logsCheck.rows[0]?.data_type === 'ARRAY') {
          console.log("Migrating logs.details from ARRAY to JSONB...");
          await client.query("ALTER TABLE logs ALTER COLUMN details DROP DEFAULT");
          await client.query("ALTER TABLE logs ALTER COLUMN details TYPE JSONB USING to_jsonb(details)");
          await client.query("ALTER TABLE logs ALTER COLUMN details SET DEFAULT '{}'::jsonb");
        }

      } catch (e) {
        console.error("Error checking/migrating column types:", e);
      }

      // Create default admin if needed
      const userCount = await client.query("SELECT COUNT(*) as count FROM team_members");
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log("Creating default admin user...");
        const { scryptSync, randomBytes } = await import("crypto");
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = scryptSync("admin123", salt, 64).toString("hex") + "." + salt;

        await client.query(`
          INSERT INTO team_members(name, email, password, role, created_at)
          VALUES($1, $2, $3, $4, NOW())
        `, ["Admin", "admin@fazza.com", hashedPassword, "Admin"]);
        console.log("Default admin created: admin@fazza.com / admin123");
      }

    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to initialize Postgres DB:", err);
  }
};

initDb();
