import assert from 'assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { encryptBuffer, decryptBuffer, getMasterKey } from '../utils/fileCrypto.js';
import db from '../db/index.js';
import { JWT_SECRET } from '../middleware/auth.js';

console.log('==================================================================');
console.log('  RUNNING GATEWAY CRYPTOGRAPHY & AUTHENTICATION TEST SUITE');
console.log('==================================================================');

async function runTests() {
  // Test 1: Key Derivation
  console.log('\n[TEST 1] Key Derivation: getMasterKey()');
  const key = getMasterKey();
  assert(Buffer.isBuffer(key), 'Master key must be a Buffer');
  assert.strictEqual(key.length, 32, 'Master key must be 32 bytes (256-bit)');
  console.log('  -> Derived 256-bit master key successfully.');

  // Test 2: AES-256-GCM Encryption & Checksum
  console.log('\n[TEST 2] AES-256-GCM Encryption & SHA-256 Checksum');
  const sampleData = Buffer.from('MRPL Sovereign Refinery Asset Integrity Ultrasonic Thickness Record 2026: E-101 t_actual=3.8mm');
  const encResult = encryptBuffer(sampleData);

  assert(encResult.encryptedData, 'Ciphertext buffer must be present');
  assert.strictEqual(encResult.iv.length, 24, 'IV hex string must be 24 chars (12 bytes / 96 bits)');
  assert.strictEqual(encResult.authTag.length, 32, 'Auth tag hex string must be 32 chars (16 bytes / 128 bits)');
  assert.strictEqual(encResult.algorithm, 'aes-256-gcm', 'Algorithm must be aes-256-gcm');
  assert.strictEqual(encResult.originalSize, sampleData.length, 'Original size must match sample size');

  const expectedSha256 = crypto.createHash('sha256').update(sampleData).digest('hex');
  assert.strictEqual(encResult.checksum, expectedSha256, 'Computed SHA-256 must match plaintext digest');
  console.log('  -> Ciphertext, 96-bit IV, 128-bit Auth Tag, and SHA-256 checksum generated.');

  // Test 3: AES-256-GCM Decryption with Integrity Verification
  console.log('\n[TEST 3] AES-256-GCM Decryption & Integrity Match');
  const decrypted = decryptBuffer(
    encResult.encryptedData,
    encResult.iv,
    encResult.authTag,
    encResult.checksum
  );
  assert.strictEqual(decrypted.toString('utf8'), sampleData.toString('utf8'), 'Decrypted text must match plaintext');
  console.log('  -> Decryption succeeded and verified against SHA-256 checksum.');

  // Test 4: Tamper Detection (Authentication Tag verification)
  console.log('\n[TEST 4] Tamper Detection: Bit-Flipping Resistance');
  const tamperedData = Buffer.from(encResult.encryptedData);
  tamperedData[0] = tamperedData[0] ^ 0xFF; // Flip first byte

  let tamperCaught = false;
  try {
    decryptBuffer(tamperedData, encResult.iv, encResult.authTag, encResult.checksum);
  } catch (err) {
    tamperCaught = true;
    console.log('  -> Tampered ciphertext correctly rejected by GCM decipher:', err.message);
  }
  assert(tamperCaught, 'Tampered ciphertext must be rejected by GCM authentication tag verification');

  // Test 5: Checksum Mismatch Detection
  console.log('\n[TEST 5] SHA-256 Integrity Verification Failure');
  let checksumFailed = false;
  try {
    decryptBuffer(
      encResult.encryptedData,
      encResult.iv,
      encResult.authTag,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
  } catch (err) {
    checksumFailed = true;
    console.log('  -> Checksum mismatch correctly thrown:', err.message);
  }
  assert(checksumFailed, 'Mismatched checksum must throw an integrity error');

  // Test 6: Dual-Mode DB Simulation & Demo User
  console.log('\n[TEST 6] Dual-Mode Database Query Simulation (In-Memory / Postgres)');
  await db.initDatabase();

  const userRes = await db.query(
    'INSERT INTO users (username, email, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5, $6)',
    ['test_engineer', 'engineer@mrpl.local', 'hashed_pass_placeholder', 'MRPL Inspector', 'engineer', 'Inspection']
  );
  assert(userRes.rows && userRes.rows.length > 0, 'Must return inserted user');
  const createdUser = userRes.rows[0];

  const queryUser = await db.query('SELECT * FROM users WHERE email = $1', ['engineer@mrpl.local']);
  assert.strictEqual(queryUser.rows[0].username, 'test_engineer', 'Queried user must match');
  console.log('  -> User query simulation succeeded. DB user ID:', createdUser.id);

  // Test 7: JWT Token Generation & Verification
  console.log('\n[TEST 7] JWT Authentication Token Lifecycle');
  const token = jwt.sign(
    { userId: createdUser.id, email: createdUser.email, role: createdUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.strictEqual(decoded.userId, createdUser.id, 'Decoded user ID must match');
  assert.strictEqual(decoded.email, 'engineer@mrpl.local', 'Decoded email must match');
  console.log('  -> JWT token signed and verified with 7d expiration.');

  console.log('\n==================================================================');
  console.log('>>> ALL GATEWAY CRYPTOGRAPHY & AUTH TESTS PASSED! <<<');
  console.log('==================================================================');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

