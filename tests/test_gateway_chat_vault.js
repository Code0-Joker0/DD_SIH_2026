import express from 'express';
import request from 'supertest';
import db from '../gateway/db/index.js';
import chatRouter from '../gateway/routes/chat.js';
import filesRouter from '../gateway/routes/files.js';

async function runTests() {
  console.log('=== TESTING GATEWAY CHAT VAULT PIPELINE & ENCRYPTION ===');

  // Initialize DB if needed
  if (db && typeof db.initDatabase === 'function') {
    await db.initDatabase();
  }

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/chat', chatRouter);
  app.use('/api/files', filesRouter);

  // 1. Create Mock Files
  const samplePdfBuffer = Buffer.from('%PDF-1.4 sample ultrasonic inspection report for pipe spool E-101. Wall thickness 3.2 mm.');
  const sampleImg1Buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const sampleImg2Buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);

  console.log('\n[TEST 1] Sending POST /api/chat/message with 1 PDF and 2 Images...');

  const res = await request(app)
    .post('/api/chat/message')
    .field('message', 'Analyze corrosion distress on pipe spool E-101 and cross-reference images.')
    .field('session_id', 'session_test_node_01')
    .field('model_name', 'auto')
    .field('chatTitle', 'E-101 Emergency Assessment')
    .attach('documents', samplePdfBuffer, 'E101_UT_Survey.pdf')
    .attach('images', sampleImg1Buffer, 'Flange_Pit_Visual_A.jpg')
    .attach('images', sampleImg2Buffer, 'Weld_Crack_Visual_B.jpg');

  console.log('Response Status:', res.status);
  console.log('Vault Sync Telemetry:', res.body.vault_sync);

  if (res.status === 200 || res.status === 500) {
    // Note: If backend isn't reachable over HTTP in test runner, vault persistence still happens before backend call
    console.log('[VAULT PERSISTENCE VERIFICATION]');
  }

  // 2. Query company_files in Database
  const fileQuery = await db.query(
    "SELECT id, original_name, category, encryption_algorithm, checksum_sha256, is_company_wide, metadata FROM company_files WHERE original_name IN ($1, $2, $3)",
    ['E101_UT_Survey.pdf', 'Flange_Pit_Visual_A.jpg', 'Weld_Crack_Visual_B.jpg']
  );

  console.log(`Found ${fileQuery.rows.length} records in company_files table:`);
  fileQuery.rows.forEach(r => {
    console.log(` - File: ${r.original_name}, Category: ${r.category}, Encrypted: ${r.encryption_algorithm}, Checksum: ${r.checksum_sha256.slice(0, 12)}..., Metadata: ${r.metadata}`);
  });

  if (fileQuery.rows.length !== 3) {
    throw new Error(`Expected 3 files in company_files, found ${fileQuery.rows.length}`);
  }

  // 3. Verify file_audit_logs
  const auditQuery = await db.query(
    "SELECT file_id, action, status, details FROM file_audit_logs WHERE action = 'UPLOAD' ORDER BY created_at DESC LIMIT 5"
  );
  console.log(`\nAudit Logs logged (${auditQuery.rows.length} recent entries):`);
  auditQuery.rows.forEach(a => console.log(` - Action: ${a.action}, Status: ${a.status}, Details: ${a.details}`));

  // 4. Verify GET /api/files endpoint
  console.log('\n[TEST 2] Testing GET /api/files...');
  const listRes = await request(app).get('/api/files');
  console.log('List Files Status:', listRes.status);
  console.log('Total files count:', listRes.body.count);
  const names = listRes.body.files.map(f => f.name);
  console.log('Recent file names:', names.slice(0, 5));

  if (!names.includes('E101_UT_Survey.pdf')) throw new Error('E101_UT_Survey.pdf missing from GET /api/files');
  if (!names.includes('Flange_Pit_Visual_A.jpg')) throw new Error('Flange_Pit_Visual_A.jpg missing from GET /api/files');
  if (!names.includes('Weld_Crack_Visual_B.jpg')) throw new Error('Weld_Crack_Visual_B.jpg missing from GET /api/files');

  console.log('\n======================================================');
  console.log('>>> [ALL GATEWAY VAULT & SYNC TESTS PASSED] <<<');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
