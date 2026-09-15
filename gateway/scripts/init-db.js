import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import db from '../db/index.js';
import { encryptBuffer } from '../utils/fileCrypto.js';

dotenv.config();

/**
 * Singularity AI - Database Initialization & Seed Script
 */
async function main() {
  console.log('🚀 Initializing Singularity AI Enterprise Database...');

  // 1. Test database connection
  await db.testConnection();

  // 2. Initialize schema
  await db.initDatabase();

  // 3. Seed Default Enterprise Users
  console.log('👤 Seeding default enterprise users...');
  const defaultPassword = 'SingularityEnterprise2026!';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const defaultUsers = [
    {
      username: 'rkulkarni',
      email: 'reva.kulkarni@singularity.local',
      full_name: 'Reva Kulkarni',
      role: 'engineer',
      department: 'Industrial Systems'
    },
    {
      username: 'admin',
      email: 'admin@singularity.local',
      full_name: 'Security Admin',
      role: 'admin',
      department: 'Cybersecurity'
    },
    {
      username: 'auditor',
      email: 'compliance@singularity.local',
      full_name: 'Compliance Officer',
      role: 'auditor',
      department: 'Quality Assurance'
    }
  ];

  const seededUsers = [];

  for (const u of defaultUsers) {
    const existing = await db.query('SELECT id, email FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length === 0) {
      const res = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, department, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, username, email, full_name, role, department`,
        [u.username, u.email, passwordHash, u.full_name, u.role, u.department]
      );
      console.log(`  + Created user: ${u.email} (${u.role})`);
      seededUsers.push(res.rows[0]);
    } else {
      console.log(`  * User already exists: ${u.email}`);
      seededUsers.push(existing.rows[0]);
    }
  }

  const primaryUser = seededUsers[0] || { id: crypto.randomUUID() };

  // 4. Seed Initial Encrypted Enterprise Company Files
  console.log('🔒 Seeding encrypted company files into PostgreSQL storage...');

  const sampleFiles = [
    {
      original_name: 'Inspection_Report_Site_A.pdf',
      mime_type: 'application/pdf',
      category: 'PDF',
      department: 'Industrial Systems',
      content: '%PDF-1.4 Singularity AI Site A Turbine & Structure Inspection Report. Status: Verified.'
    },
    {
      original_name: 'Vendor_Compliance_Analysis.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: 'DOCX',
      department: 'Quality Assurance',
      content: 'PK\x03\x04 Singularity AI Enterprise Vendor Compliance Analysis 2026.'
    },
    {
      original_name: 'Plant_Audit_Stress_Data.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'Spreadsheet',
      department: 'Industrial Systems',
      content: 'PK\x03\x04 Singularity AI Plant Audit Stress Matrix\nTimestamp,Sensor_ID,PSI_Pressure,Vibration_Hz,Status\n2026-09-01T08:00:00Z,SN-901,142.5,60.1,Normal'
    },
    {
      original_name: 'Safety_Protocol_Notes.pdf',
      mime_type: 'application/pdf',
      category: 'PDF',
      department: 'Safety & Security',
      content: '%PDF-1.4 Singularity AI Zero-Trust Operational Safety Protocols. Air-gapped compute strictly enforced.'
    },
    {
      original_name: 'Telemetry_Log_Extract.csv',
      mime_type: 'text/csv',
      category: 'Data',
      department: 'Telemetry & IoT',
      content: 'timestamp,device_id,temperature_c,status,battery_mv\n2026-09-10T12:00:00Z,DEV-01,38.4,HEALTHY,3280'
    }
  ];

  for (const doc of sampleFiles) {
    const existing = await db.query('SELECT id FROM company_files WHERE original_name = $1', [doc.original_name]);
    if (existing.rows.length === 0) {
      const buffer = Buffer.from(doc.content, 'utf8');
      const enc = encryptBuffer(buffer);
      const safeFilename = `${Date.now()}_${doc.original_name}`;

      await db.query(
        `INSERT INTO company_files (
          filename, original_name, mime_type, file_size, encrypted_size,
          encrypted_data, encryption_algorithm, encryption_iv, encryption_auth_tag,
          checksum_sha256, uploaded_by, department, category, status, is_company_wide, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, original_name, file_size, encrypted_size, checksum_sha256`,
        [
          safeFilename,
          doc.original_name,
          doc.mime_type,
          enc.originalSize,
          enc.encryptedSize,
          enc.encryptedData,
          enc.algorithm,
          enc.iv,
          enc.authTag,
          enc.checksum,
          primaryUser.id,
          doc.department,
          doc.category,
          'Verified',
          true,
          JSON.stringify({ seeded: true, securityProfile: 'AES-256-GCM' })
        ]
      );

      console.log(`  + Seeded file: ${doc.original_name} (Plain: ${enc.originalSize}B, Encrypted: ${enc.encryptedSize}B, SHA-256: ${enc.checksum.substring(0, 10)}...)`);
    } else {
      console.log(`  * File already present: ${doc.original_name}`);
    }
  }

  console.log('✨ Singularity AI Database initialization complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});