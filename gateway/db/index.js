import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration: use environmental path or local 'data/pglite' directory
const dbPath = process.env.PGLITE_DATA_DIR || path.join(__dirname, '../data/pglite');

// Ensure parent data directory exists
if (dbPath && dbPath !== ':memory:' && !dbPath.startsWith('idb://')) {
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
}

// 1. Database Instance Initialization
export const db = new PGlite(dbPath);

let isConnected = false;

/**
 * Test PostgreSQL connection
 */
export const testConnection = async () => {
  try {
    const res = await db.query('SELECT NOW() as current_time, version();');
    isConnected = true;
    const versionStr = res.rows && res.rows[0] && res.rows[0].version ? res.rows[0].version.split(',')[0] : 'PGlite WASM';
    console.log(`✅ Embedded PostgreSQL Connected successfully: ${versionStr}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ Embedded PostgreSQL connection failed:', error.message);
    return false;
  }
};

/**
 * Execute SQL Query maintaining standard 'pg' module return signature
 */
export const query = async (text, params = []) => {
  try {
    const res = await db.query(text, params);
    
    // Maintain pg signature: { rows, rowCount, fields, etc }
    return {
      ...res,
      rows: res.rows || [],
      rowCount: res.rowCount !== undefined ? res.rowCount : (res.affectedRows ?? (res.rows ? res.rows.length : 0)),
      affectedRows: res.affectedRows !== undefined ? res.affectedRows : (res.rowCount ?? (res.rows ? res.rows.length : 0)),
      fields: res.fields || []
    };
  } catch (err) {
    console.error('PostgreSQL query error:', err.message, '\nQuery:', text);
    throw err;
  }
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

  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip CREATE EXTENSION IF NOT EXISTS "pgcrypto" as it is native to PGlite
  schemaSql = schemaSql.replace(/CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?["']?pgcrypto["']?;?/gi, '-- pgcrypto extension skipped (native in PGlite)');

  try {
    await db.exec(schemaSql);
    console.log('✅ PostgreSQL Schema initialized successfully');
    return true;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err.message);
    return false;
  }
};

export const getIsPostgresConnected = () => isConnected;

export default {
  db,
  query,
  testConnection,
  initDatabase,
  getIsPostgresConnected
};