import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'fazza.db');
const db = new Database(dbPath);

console.log('Attempting to fix database schema...');

try {
    // Check if column exists
    const tableInfo = db.prepare("PRAGMA table_info(complaints)").all() as any[];
    const hasCreatedBy = tableInfo.some(col => col.name === 'created_by');

    if (!hasCreatedBy) {
        console.log('Adding created_by column to complaints table...');
        db.prepare('ALTER TABLE complaints ADD COLUMN created_by INTEGER REFERENCES team_members(id)').run();
        console.log('Successfully added created_by column.');
    } else {
        console.log('created_by column already exists.');
    }

} catch (error) {
    console.error('Error modifying database:', error);
}

console.log('Database fix complete.');
