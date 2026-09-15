import dotenv from 'dotenv';
import db from '../db/index.js';

dotenv.config();

async function checkDatabase() {
  console.log('===============================================================');
  console.log('🔍 SINGULARITY AI - POSTGRESQL DATABASE INSPECTOR');
  console.log('===============================================================');

  const isConnected = await db.testConnection();
  console.log(`Database Mode: ${isConnected ? '🟢 Live PostgreSQL Connected' : '🟡 In-Memory Resilient Mode'}\n`);

  try {
    // 1. Users Table
    console.log('--- 👤 [USERS TABLE] ---');
    const usersRes = await db.query(`
      SELECT id, username, email, role, department, status, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    if (usersRes.rows.length === 0) {
      console.log('  (No users found)');
    } else {
      console.table(usersRes.rows.map(u => ({
        ID: u.id,
        Username: u.username,
        Email: u.email,
        Role: u.role,
        Department: u.department,
        Status: u.status,
        Created: u.created_at
      })));
    }

    // 2. Company Files Table (AES-256-GCM Encrypted)
    console.log('\n--- 🔒 [COMPANY FILES (ENCRYPTED STORAGE)] ---');
    const filesRes = await db.query(`
      SELECT id, original_name, category, department, file_size, encrypted_size, 
             encryption_algorithm, checksum_sha256, status, created_at
      FROM company_files 
      ORDER BY created_at DESC
    `);
    if (filesRes.rows.length === 0) {
      console.log('  (No encrypted company files found)');
    } else {
      console.table(filesRes.rows.map(f => ({
        ID: f.id,
        Name: f.original_name,
        Category: f.category,
        Department: f.department,
        'Plain Size (B)': f.file_size,
        'Cipher Size (B)': f.encrypted_size,
        Algorithm: f.encryption_algorithm,
        'SHA-256 Checksum': f.checksum_sha256 ? `${f.checksum_sha256.substring(0, 12)}...` : 'N/A',
        Status: f.status
      })));
    }

    // 3. File Audit Logs Table
    console.log('\n--- 📜 [FILE AUDIT LOGS (SECURITY TRAIL)] ---');
    const logsRes = await db.query(`
      SELECT id, file_id, user_id, action, ip_address, status, details, created_at 
      FROM file_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    if (logsRes.rows.length === 0) {
      console.log('  (No audit logs recorded yet)');
    } else {
      console.table(logsRes.rows.map(l => ({
        ID: l.id,
        Action: l.action,
        Status: l.status,
        FileID: l.file_id ? `${l.file_id.substring(0, 8)}...` : 'N/A',
        IP: l.ip_address || '127.0.0.1',
        Details: typeof l.details === 'object' ? JSON.stringify(l.details) : l.details,
        Timestamp: l.created_at
      })));
    }

    console.log('\n===============================================================');
    console.log(`Total Records: Users: ${usersRes.rows.length} | Files: ${filesRes.rows.length} | Audit Logs: ${logsRes.rows.length}`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Inspection Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDatabase();