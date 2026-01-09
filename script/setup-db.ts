import pg from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

// Handle ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually since we might not have dotenv loaded yet
const envPath = path.join(__dirname, '../.env');
let databaseUrl = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.*)/);
    if (match && match[1]) {
        databaseUrl = match[1].trim();
    }
} catch (e) {
    console.error('Could not read .env file');
}

if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env file');
    process.exit(1);
}

// Parse connection string
// Format: postgresql://user:password@host:port/database
const urlRegex = /postgresql:\/\/(.*):(.*)@(.*):(\d+)\/(.*)/;
const match = databaseUrl.match(urlRegex);

if (!match) {
    console.error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database');
    process.exit(1);
}

const [, user, password, host, port, dbName] = match;

// Connection config for the default postgres database (to create the new one)
const config = {
    user,
    password,
    host,
    port: parseInt(port),
    database: 'postgres', // Connect to default maintenance DB
};

async function setupDatabase() {
    const client = new Client(config);

    try {
        console.log(`Connecting to PostgreSQL at ${host}:${port} as ${user}...`);
        await client.connect();
        console.log('Connected successfully.');

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }

    } catch (err: any) {
        console.error('Error checking/creating database:', err.message);
        if (err.code === '28P01') {
            console.log('\n\x1b[31mCRITICAL ERROR: Password authentication failed.\x1b[0m');
            console.log(`Please open the file: \x1b[33m${envPath}\x1b[0m`);
            console.log('And update the DATABASE_URL with your correct PostgreSQL password.');
            console.log(`Current value trying to use: postgresql://${user}:****@${host}:${port}/${dbName}`);
        }
        process.exit(1);
    } finally {
        await client.end();
    }

    try {
        console.log('Pushing schema to database...');
        // We need to set the environment variable for the child process
        const env = { ...process.env, DATABASE_URL: databaseUrl };
        execSync('npx drizzle-kit push', { stdio: 'inherit', env });
        console.log('Schema pushed successfully.');
    } catch (err) {
        console.error('Error pushing schema:', err);
        process.exit(1);
    }
}

setupDatabase();
