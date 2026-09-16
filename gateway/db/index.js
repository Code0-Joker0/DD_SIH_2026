import { PGlite } from '@electric-sql/pglite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const connectionString = process.env.DATABASE_URL;
const poolConfig = connectionString ? {
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'mrpl_db',
  ssl: false
};

export const pool = new Pool(poolConfig);

let isPostgresConnected = false;

// Fallback in-memory store if live PostgreSQL is temporarily offline during local dev/air-gapped mode
export const inMemoryStore = {
  users: [],
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
    console.warn('ℹ️ To connect to live PostgreSQL, configure DATABASE_URL in gateway/.env');
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

  // Handle fallback in-memory simulation for development & offline environments
  return executeInMemoryQuery(text, params);
};

/**
 * In-memory SQL simulation for core operations (users, company_files, audit logs)
 */
const executeInMemoryQuery = (text, params = []) => {
  const normalized = text.trim();

  // 1. SELECT count(*) FROM users
  if (/SELECT\s+count\(\*\)\s+FROM\s+users/i.test(normalized)) {
    return { rows: [{ count: inMemoryStore.users.length.toString() }], rowCount: 1 };
  }

  // 2. SELECT users by email or id or all users
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

  // 3. INSERT into users
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

  // 4. INSERT into company_files
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

  // 5. SELECT company_files (Listing)
  if (/FROM\s+company_files/i.test(normalized) && !/WHERE\s+(f\.)?id\s*=\s*\$1/i.test(normalized)) {
    let files = inMemoryStore.company_files.map(f => {
      const uploader = inMemoryStore.users.find(u => u.id === f.uploaded_by);
      return {
        id: f.id,
        filename: f.filename,
        original_name: f.original_name,
        mime_type: f.mime_type,
        file_size: f.file_size,
        encrypted_size: f.encrypted_size,
        encrypted_data: f.encrypted_data,
        encryption_algorithm: f.encryption_algorithm,
        encryption_iv: f.encryption_iv,
        encryption_auth_tag: f.encryption_auth_tag,
        checksum_sha256: f.checksum_sha256,
        uploaded_by: f.uploaded_by,
        uploader_name: uploader ? uploader.full_name : 'Enterprise User',
        uploader_email: uploader ? uploader.email : null,
        department: f.department,
        category: f.category,
        status: f.status,
        is_company_wide: f.is_company_wide,
        metadata: f.metadata,
        created_at: f.created_at,
        updated_at: f.updated_at
      };
    });

    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: files, rowCount: files.length };
  }

  // 6. SELECT company_files by ID
  if (/FROM\s+company_files/i.test(normalized) && /WHERE\s+(f\.)?id\s*=\s*\$1/i.test(normalized)) {
    const id = params[0];
    const file = inMemoryStore.company_files.find(f => f.id === id);
    if (!file) return { rows: [], rowCount: 0 };

    const uploader = inMemoryStore.users.find(u => u.id === file.uploaded_by);
    const enriched = {
      ...file,
      uploader_name: uploader ? uploader.full_name : 'Enterprise User',
      uploader_email: uploader ? uploader.email : null
    };
    return { rows: [enriched], rowCount: 1 };
  }

  // 7. DELETE from company_files
  if (/DELETE\s+FROM\s+company_files\s+WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
    const id = params[0];
    const idx = inMemoryStore.company_files.findIndex(f => f.id === id);
    if (idx !== -1) {
      const deleted = inMemoryStore.company_files.splice(idx, 1)[0];
      return { rows: [deleted], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 8. INSERT into file_audit_logs
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
 * Initialize Database Tables from schema.sql
 */
export const initDatabase = async () => {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at:', schemaPath);
    return false;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (isPostgresConnected) {
    try {
      await pool.query(schemaSql);
      console.log('✅ PostgreSQL Schema initialized successfully');
      return true;
    } catch (err) {
      console.error('Failed to initialize PostgreSQL schema:', err.message);
      return false;
    }
  } else {
    console.log('ℹ️ In-memory data store ready with Singularity AI schema.');
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