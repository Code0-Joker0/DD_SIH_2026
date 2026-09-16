import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration with dual env fallback (standard PG* and teammate's HOST/DP/DPORT/USER/DB)
const connectionString = process.env.DATABASE_URL;
const poolConfig = connectionString ? {
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
  host: process.env.PGHOST || process.env.HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DPORT || '5432', 10),
  user: process.env.PGUSER || process.env.USER || 'postgres',
  password: String(process.env.PGPASSWORD || process.env.DP || 'postgres'),
  database: process.env.PGDATABASE || process.env.DB || 'mrpl_db',
  ssl: false
};

export const pool = new Pool(poolConfig);

let isPostgresConnected = false;

// Fallback in-memory store if live PostgreSQL is offline
export const inMemoryStore = {
  users: [],
  auth: [], // Added for teammate's auth table simulation
  company_files: [],
  file_audit_logs: []
};

/**
 * Test PostgreSQL connection
 */
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, version()');
    client.release();
    isPostgresConnected = true;
    console.log('✅ PostgreSQL Connected successfully:', res.rows[0].version.split(',')[0]);
    return true;
  } catch (error) {
    isPostgresConnected = false;
    console.warn('⚠️ PostgreSQL connection unavailable:', error.message);
    console.warn('ℹ️ Running in Resilient In-Memory Mode with identical schema & AES-256-GCM encryption.');
    console.warn('ℹ️ To connect to live PostgreSQL, verify HOST/DP or DATABASE_URL in gateway/.env');
    return false;
  }
};

/**
 * Execute SQL Query with automatic fallback handling
 */
export const query = async (text, params = []) => {
  if (isPostgresConnected) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('PostgreSQL query error:', err.message, '\nQuery:', text);
      throw err;
    }
  }

  // Handle fallback in-memory simulation for offline/dev environments
  return executeInMemoryQuery(text, params);
};

/**
 * In-memory SQL simulation supporting both legacy users and teammate's auth table
 */
const executeInMemoryQuery = (text, params = []) => {
  const normalized = text.trim();

  // -------------------------------------------------------------
  // 1. TEAMMATE AUTH TABLE HANDLERS
  // -------------------------------------------------------------

  // Check user existence by username or email: SELECT ... FROM auth WHERE username = $1 [OR email = $2]
  if (/FROM\s+auth\s+WHERE/i.test(normalized)) {
    if (/username\s*=\s*\$1\s+OR\s+email\s*=\s*\$2/i.test(normalized)) {
      const username = (params[0] || '').toLowerCase();
      const email = (params[1] || '').toLowerCase();
      const match = inMemoryStore.auth.find(
        u => (u.username || '').toLowerCase() === username || (u.email || '').toLowerCase() === email
      );
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    if (/username\s*=\s*\$1/i.test(normalized)) {
      const username = (params[0] || '').toLowerCase();
      const match = inMemoryStore.auth.find(u => (u.username || '').toLowerCase() === username);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    if (/email\s*=\s*\$1/i.test(normalized)) {
      const email = (params[0] || '').toLowerCase();
      const match = inMemoryStore.auth.find(u => (u.email || '').toLowerCase() === email);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
  }

  // Teammate Auth Register: INSERT INTO auth(username, id, password, email, role)
  if (/INSERT\s+INTO\s+auth/i.test(normalized)) {
    const newAuthRecord = {
      username: params[0],
      id: params[1] || crypto.randomUUID(),
      password: params[2], // SHA-256 hash from auth controller
      email: params[3],
      role: params[4] || 'engineer',
      created_at: new Date().toISOString()
    };
    inMemoryStore.auth.push(newAuthRecord);

    // Keep legacy users store synced for file vault author attribution
    inMemoryStore.users.push({
      id: newAuthRecord.id,
      username: newAuthRecord.username,
      email: newAuthRecord.email,
      password_hash: newAuthRecord.password,
      full_name: newAuthRecord.username,
      role: newAuthRecord.role,
      department: 'Asset Integrity',
      status: 'active',
      created_at: newAuthRecord.created_at,
      updated_at: newAuthRecord.created_at
    });

    return { rows: [newAuthRecord], rowCount: 1 };
  }

  // -------------------------------------------------------------
  // 2. LEGACY USERS TABLE HANDLERS
  // -------------------------------------------------------------

  if (/SELECT\s+count\(\*\)\s+FROM\s+users/i.test(normalized)) {
    return { rows: [{ count: inMemoryStore.users.length.toString() }], rowCount: 1 };
  }

  if (/FROM\s+users\s+WHERE\s+email\s*=\s*\$1/i.test(normalized)) {
    const email = params[0];
    const user = inMemoryStore.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (/FROM\s+users\s+WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
    const id = params[0];
    const user = inMemoryStore.users.find(u => u.id === id);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (/FROM\s+users/i.test(normalized) && !/WHERE/i.test(normalized)) {
    return { rows: [...inMemoryStore.users], rowCount: inMemoryStore.users.length };
  }

  if (/INSERT\s+INTO\s+users/i.test(normalized)) {
    const newUser = {
      id: crypto.randomUUID(),
      username: params[0],
      email: params[1],
      password_hash: params[2],
      full_name: params[3],
      role: params[4] || 'employee',
      department: params[5] || 'Engineering',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // -------------------------------------------------------------
  // 3. COMPANY FILES & ENCRYPTED VAULT HANDLERS
  // -------------------------------------------------------------

  if (/INSERT\s+INTO\s+company_files/i.test(normalized)) {
    const newFile = {
      id: crypto.randomUUID(),
      filename: params[0],
      original_name: params[1],
      mime_type: params[2],
      file_size: params[3],
      encrypted_size: params[4],
      encrypted_data: params[5],
      encryption_algorithm: params[6] || 'aes-256-gcm',
      encryption_iv: params[7],
      encryption_auth_tag: params[8],
      checksum_sha256: params[9],
      uploaded_by: params[10],
      department: params[11],
      category: params[12] || 'Document',
      status: params[13] || 'Verified',
      is_company_wide: params[14] !== undefined ? params[14] : true,
      metadata: typeof params[15] === 'string' ? JSON.parse(params[15] || '{}') : (params[15] || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryStore.company_files.push(newFile);
    return { rows: [newFile], rowCount: 1 };
  }

  if (/FROM\s+company_files/i.test(normalized) && !/WHERE\s+(f\.)?id\s*=\s*\$1/i.test(normalized)) {
    let files = inMemoryStore.company_files.map(f => {
      const uploader = inMemoryStore.users.find(u => u.id === f.uploaded_by);
      return {
        ...f,
        uploader_name: uploader ? uploader.full_name : 'Inspection Engineer',
        uploader_email: uploader ? uploader.email : null
      };
    });

    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: files, rowCount: files.length };
  }

  if (/FROM\s+company_files/i.test(normalized) && /WHERE\s+(f\.)?id\s*=\s*\$1/i.test(normalized)) {
    const id = params[0];
    const file = inMemoryStore.company_files.find(f => f.id === id);
    if (!file) return { rows: [], rowCount: 0 };

    const uploader = inMemoryStore.users.find(u => u.id === file.uploaded_by);
    return {
      rows: [{
        ...file,
        uploader_name: uploader ? uploader.full_name : 'Inspection Engineer',
        uploader_email: uploader ? uploader.email : null
      }],
      rowCount: 1
    };
  }

  if (/DELETE\s+FROM\s+company_files\s+WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
    const id = params[0];
    const idx = inMemoryStore.company_files.findIndex(f => f.id === id);
    if (idx !== -1) {
      const deleted = inMemoryStore.company_files.splice(idx, 1)[0];
      return { rows: [deleted], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (/INSERT\s+INTO\s+file_audit_logs/i.test(normalized)) {
    const log = {
      id: inMemoryStore.file_audit_logs.length + 1,
      file_id: params[0],
      user_id: params[1],
      action: params[2],
      ip_address: params[3],
      user_agent: params[4],
      status: params[5] || 'SUCCESS',
      details: typeof params[6] === 'string' ? JSON.parse(params[6] || '{}') : (params[6] || {}),
      created_at: new Date().toISOString()
    };
    inMemoryStore.file_audit_logs.push(log);
    return { rows: [log], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
};

/**
 * Initialize Database Tables from schema.sql & create auth table if missing
 */
export const initDatabase = async () => {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

  if (isPostgresConnected) {
    try {
      if (schemaSql) {
        await pool.query(schemaSql);
      }
      // Ensure teammate's auth table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth (
          username VARCHAR(100) UNIQUE NOT NULL,
          id VARCHAR(100) PRIMARY KEY,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) DEFAULT 'engineer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL Schema & Auth tables verified successfully');
      return true;
    } catch (err) {
      console.error('Failed to initialize PostgreSQL schema:', err.message);
      return false;
    }
  } else {
    console.log('ℹ️ In-memory data store ready for Auth and Vault operations.');
    return true;
  }
};

export const getIsPostgresConnected = () => isPostgresConnected;

export default {
  pool,
  query,
  testConnection,
  initDatabase,
  getIsPostgresConnected,
  inMemoryStore
};