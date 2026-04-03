import { drizzle } from 'drizzle-orm/mysql2'; 
import mysql from 'mysql2/promise'; 
import fs from 'fs';
import dotenv from 'dotenv';
import * as schema from './db/schema.js';

dotenv.config(); 


//  MySQL pool
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true 
});

// Drizzle client — use this everywhere instead of query()
export const db = drizzle(pool, { schema, mode: 'default' });

// Run db-init.sql on first startup to create tables if they don't exist
async function initDB() {
    try {
        const sql = fs.readFileSync('./db-init.sql', 'utf-8');

        //  MySQL execution
        await pool.query(sql);

        console.log('✅ Database initialized'); 
    } catch (err) {
        console.error('❌ DB Init Error:', err.message);
    }
}

initDB();