import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard external PostgreSQL pool configuration (port 5432)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sih2026',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPostgresConnected = false;
let isInitialized = false;
let initPromise = null;

// Preserved fallback in-memory store for backwards compatibility
export const inMemoryStore = {
  users: [],
  auth: [],
  company_files: [],
  file_audit_logs: []
};

/**
 * Provisions essential enterprise tables, schemas, and indices in standard PostgreSQL.
 * Runs once during startup and is guarded by an initialization promise.
 */
async function provisionTables() {
  if (isInitialized) return;

  try {
    // 1. Try loading external backend/schema.sql or gateway/schema.sql if present
    const candidatePaths = [
      path.join(__dirname, '..', 'schema.sql'),
      path.join(__dirname, '..', '..', 'backend', 'schema.sql')
    ];

    for (const schemaPath of candidatePaths) {
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        if (schemaSql.trim()) {
          try {
            await pool.query(schemaSql);
            console.log(`✅ [POSTGRES] Loaded external schema from: ${path.basename(schemaPath)}`);
          } catch (execErr) {
            console.warn(`⚠️ [POSTGRES] Notice parsing ${path.basename(schemaPath)}:`, execErr.message);
          }
        }
        break;
      }
    }

    // 2. Ensure core enterprise tables and extensions exist
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Users Table (Engineers and Personnel)
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'engineer',
        department VARCHAR(100) DEFAULT 'Asset Integrity & Inspection',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

      -- Teammate Auth Table Compatibility
      CREATE TABLE IF NOT EXISTS auth (
        username VARCHAR(100) UNIQUE NOT NULL,
        id VARCHAR(100) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'engineer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Encrypted Company Files Vault (AES-256-GCM)
      CREATE TABLE IF NOT EXISTS company_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100),
        file_size BIGINT NOT NULL,
        encrypted_size BIGINT NOT NULL,
        encrypted_data TEXT NOT NULL,
        encryption_algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
        encryption_iv VARCHAR(255) NOT NULL,
        encryption_auth_tag VARCHAR(255) NOT NULL,
        checksum_sha256 VARCHAR(64) NOT NULL,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        department VARCHAR(100),
        category VARCHAR(50) DEFAULT 'Document',
        status VARCHAR(50) DEFAULT 'Verified',
        is_company_wide BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit Trail Logs for Regulatory Inspection Compliance
      CREATE TABLE IF NOT EXISTS file_audit_logs (
        id SERIAL PRIMARY KEY,
        file_id UUID REFERENCES company_files(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'SUCCESS',
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Conversations (Per-User Isolation)
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Inspection Analysis',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

      -- Messages
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE messages ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    `);

    // 3. Seed default inspector profile if users table is completely empty
    const checkCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(checkCount.rows[0]?.count || '0', 10);

    if (totalUsers === 0) {
      const seedHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
      await pool.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, department)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING;
      `, [
        'lead_inspector',
        'engineer@mrpl.co.in',
        seedHash,
        'Lead Integrity Inspector',
        'lead_inspector',
        'Asset Integrity & Inspection'
      ]);
      console.log('✅ [POSTGRES] Seeded default inspector account: engineer@mrpl.co.in');
    }

    // 4. Auto-synchronize exported users dump if present
    const exportPath = path.join(__dirname, '../data/exported_users.json');
    if (fs.existsSync(exportPath)) {
      try {
        const raw = fs.readFileSync(exportPath, 'utf8');
        const users = JSON.parse(raw);
        for (const u of users) {
          await pool.query(`
            INSERT INTO users (id, username, email, password_hash, full_name, role, department, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
              username = EXCLUDED.username,
              password_hash = EXCLUDED.password_hash,
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              department = EXCLUDED.department,
              status = EXCLUDED.status;
          `, [
            u.id || undefined,
            u.username,
            u.email,
            u.password_hash,
            u.full_name,
            u.role || 'engineer',
            u.department || 'Engineering',
            u.status || 'active'
          ]);
        }
        console.log(`✅ [POSTGRES] Auto-synced ${users.length} user(s) from exported_users.json`);
      } catch (importErr) {
        console.warn('[POSTGRES] User sync notice:', importErr.message);
      }
    }

    isInitialized = true;
    console.log('✅ [POSTGRES] Enterprise tables, auth, and audit vault verified on external database.');
  } catch (err) {
    console.error('❌ [POSTGRES] Schema provisioning failure:', err.message);
    throw err;
  }
}

/**
 * Returns the pool instance, ensuring provisioning has completed.
 */
export async function getDb() {
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = provisionTables();
    }
    await initPromise;
  }
  return pool;
}

/**
 * Executes a parameterized SQL query on the PostgreSQL connection pool.
 */
export const query = async (text, params = []) => {
  try {
    await getDb();
    const result = await pool.query(text, params);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      fields: result.fields || []
    };
  } catch (err) {
    console.error('[POSTGRES QUERY ERROR]:', err.message, '\nQuery:', text);
    throw err;
  }
};

/**
 * Verifies external PostgreSQL connection
 */
export const testConnection = async () => {
  try {
    const res = await pool.query('SELECT version() as ver, NOW() as current_time');
    const versionStr = res.rows[0]?.ver || 'PostgreSQL';
    isPostgresConnected = true;
    console.log('✅ [POSTGRES] External PostgreSQL Connected successfully:', versionStr.split(',')[0]);
    return true;
  } catch (error) {
    isPostgresConnected = false;
    console.warn('⚠️ [POSTGRES] Database unavailable:', error.message);
    return false;
  }
};

/**
 * Explicit schema initialization export
 */
export const initDatabase = async () => {
  await getDb();
  return isInitialized;
};

export const getIsPostgresConnected = () => isPostgresConnected;

export default {
  pool,
  query,
  getDb,
  testConnection,
  initDatabase,
  getIsPostgresConnected,
  inMemoryStore
};