import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import * as schema from './db/schema.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Drizzle client — use this everywhere instead of query()
export const db = drizzle(pool, { schema });

// Run db-init.sql on first startup to create tables if they don't exist
async function initDB() {
    try {
        const sql = fs.readFileSync('./db-init.sql', 'utf-8');
        await pool.query(sql);
        console.log('✅ Database initialized');
    } catch (err) {
        console.error('❌ DB Init Error:', err.message);
    }
}

initDB();
