
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.join(__dirname, '..');
const dbPath = path.join(rootDir, 'fazza.db');
const uploadsDir = path.join(rootDir, 'uploads');

console.log('--- Starting System Reset ---');

// 1. Remove Database
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log('✅ Database file (fazza.db) deleted.');
    } catch (e) {
        console.error('❌ Failed to delete database file. Is the server running?');
        console.error(e);
    }
} else {
    console.log('ℹ️  Database file not found (already clean).');
}

// 2. Clear Uploads
if (fs.existsSync(uploadsDir)) {
    try {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            if (file === '.gitkeep') continue; // Optional: keep .gitkeep if exists
            fs.unlinkSync(path.join(uploadsDir, file));
        }
        console.log(`✅ Uploads cleared (${files.length} files removed).`);
    } catch (e) {
        console.error('❌ Failed to clear uploads directory.');
        console.error(e);
    }
} else {
    // Re-create if missing
    fs.mkdirSync(uploadsDir);
    console.log('✅ Uploads directory created.');
}

console.log('--- Reset Complete ---');
console.log('Next start will re-initialize the database with Admin: admin@fazza.com / admin123');
