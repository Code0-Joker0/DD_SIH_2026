import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory for the persistent embedded WASM PostgreSQL cluster
const dbPath = process.env.PGLITE_DATA_DIR || path.join(__dirname, '../data/pglite');

// Ensure the storage directory exists on disk
if (dbPath && dbPath !== ':memory:' && !dbPath.startsWith('idb://')) {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
}

let pgliteInstance = null;
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
 * Provisions all essential tables, schemas, and indices in PGlite.
 * Runs once and is guarded by an initialization promise.
 */
async function provisionTables(db) {
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
            await db.exec(schemaSql);
            console.log(`✅ [PGLITE] Loaded external schema from: ${path.basename(schemaPath)}`);
          } catch (execErr) {
            console.warn(`⚠️ [PGLITE] Warning running ${path.basename(schemaPath)}:`, execErr.message);
          }
        }
        break;
      }
    }

    // 2. Ensure core enterprise tables exist
    await db.exec(`
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
    `);

    // 3. Seed default inspector profile if users table is empty
    const checkCount = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(checkCount.rows[0]?.count || '0', 10);

    if (totalUsers === 0) {
      // Default hash for 'SovereignPass2026!'
      const seedHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
      await db.query(`
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
      console.log('✅ [PGLITE] Seeded default inspector account: engineer@mrpl.co.in');
    }

    isInitialized = true;
    console.log('✅ [PGLITE] Sovereign enterprise tables, users, auth, and audit vault verified.');
  } catch (err) {
    console.error('❌ [PGLITE] Schema provisioning failure:', err.message);
    throw err;
  }
}

/**
 * Returns or initializes the active singleton PGlite database instance.
 * Guarantees that tables are created before returning the instance.
 */
export async function getDb() {
  if (!pgliteInstance) {
    try {
      pgliteInstance = new PGlite(dbPath);
      await pgliteInstance.waitReady;
      isPostgresConnected = true;
      console.log(`✅ [PGLITE] Embedded PostgreSQL instance active at: ${dbPath}`);
    } catch (err) {
      isPostgresConnected = false;
      console.error('❌ [PGLITE] Failed to launch embedded database:', err);
      throw err;
    }
  }

  // Ensure table provisioning is executed and awaited
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = provisionTables(pgliteInstance);
    }
    await initPromise;
  }

  return pgliteInstance;
}

/**
 * Executes a parameterized SQL query on the PGlite engine.
 * Output signature matches pg-pool contract: { rows: [...], rowCount: n, fields: [...] }
 */
export const query = async (text, params = []) => {
  try {
    const db = await getDb();
    const result = await db.query(text, params);
    return {
      rows: result.rows || [],
      rowCount: result.rows ? result.rows.length : 0,
      fields: result.fields || []
    };
  } catch (err) {
    console.error('[PGLITE QUERY ERROR]:', err.message, '\nQuery:', text);
    throw err;
  }
};

/**
 * Pool simulation interface maintaining drop-in compatibility with legacy code
 */
export const pool = {
  query: (text, params) => query(text, params),
  connect: async () => {
    const db = await getDb();
    return {
      query: (text, params) => query(text, params),
      release: () => { }
    };
  }
};

/**
 * Verify PGlite connection and query execution
 */
export const testConnection = async () => {
  try {
    const res = await query('SELECT version() as ver, NOW() as current_time');
    const versionStr = res.rows[0]?.ver || 'PGlite Embedded PostgreSQL WASM';
    isPostgresConnected = true;
    console.log('✅ [PGLITE] Embedded PostgreSQL Connected successfully:', versionStr.split(',')[0]);
    return true;
  } catch (error) {
    isPostgresConnected = false;
    console.warn('⚠️ [PGLITE] Database unavailable:', error.message);
    return false;
  }
};

/**
 * Explicit schema initialization export
 */
export const initDatabase = async () => {
  const db = await getDb();
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