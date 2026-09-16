import assert from 'assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { encryptBuffer, decryptBuffer, encryptBufferPQ, decryptBufferPQ, getMasterKey } from '../utils/fileCrypto.js';
import { getKemKeyPair, kemWrapKey, kemUnwrapKey, _resetCachedKeyPair, KEM_PUBLIC_KEY_BYTES, KEM_SECRET_KEY_BYTES, KEM_CIPHERTEXT_BYTES } from '../utils/pqKem.js';
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
    'INSERT INTO users (username, email, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
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

  // =========================================================================
  // Post-Quantum KEM Tests (ML-KEM-768 / FIPS 203)
  // =========================================================================

  // Test 8: ML-KEM-768 Keypair Generation & Sizes
  console.log('\n[TEST 8] ML-KEM-768 Keypair Generation (FIPS 203)');
  const kemKeys = getKemKeyPair();
  assert(kemKeys.publicKey, 'KEM keypair must have publicKey');
  assert(kemKeys.secretKey, 'KEM keypair must have secretKey');
  assert.strictEqual(kemKeys.publicKey.length, KEM_PUBLIC_KEY_BYTES, `Public key must be ${KEM_PUBLIC_KEY_BYTES} bytes`);
  assert.strictEqual(kemKeys.secretKey.length, KEM_SECRET_KEY_BYTES, `Secret key must be ${KEM_SECRET_KEY_BYTES} bytes`);
  console.log(`  -> ML-KEM-768 keypair OK: publicKey=${kemKeys.publicKey.length}B, secretKey=${kemKeys.secretKey.length}B`);

  // Test 9: PQ Encrypt → Decrypt Round-Trip
  console.log('\n[TEST 9] PQ-Wrapped AES-256-GCM Encrypt/Decrypt Round-Trip');
  const pqSampleData = Buffer.from('Post-quantum protected industrial control system telemetry: Reactor T-401 pressure=12.4 bar');
  const pqEncResult = encryptBufferPQ(pqSampleData);

  assert(pqEncResult.encryptedData, 'PQ ciphertext buffer must be present');
  assert.strictEqual(pqEncResult.algorithm, 'aes-256-gcm+ml-kem-768', 'Algorithm must be aes-256-gcm+ml-kem-768');
  assert.strictEqual(pqEncResult.iv.length, 24, 'PQ IV hex must be 24 chars');
  assert.strictEqual(pqEncResult.authTag.length, 32, 'PQ auth tag hex must be 32 chars');
  assert.strictEqual(pqEncResult.wrappedDek.length, 64, 'Wrapped DEK hex must be 64 chars (32 bytes)');
  assert.strictEqual(pqEncResult.kemCipherText.length, KEM_CIPHERTEXT_BYTES * 2, `KEM ciphertext hex must be ${KEM_CIPHERTEXT_BYTES * 2} chars`);
  assert(pqEncResult.kemPublicKey.length > 0, 'KEM public key hex must be present');

  const pqDecrypted = decryptBufferPQ(
    pqEncResult.encryptedData,
    pqEncResult.iv,
    pqEncResult.authTag,
    pqEncResult.wrappedDek,
    pqEncResult.kemCipherText,
    pqEncResult.checksum
  );
  assert.strictEqual(pqDecrypted.toString('utf8'), pqSampleData.toString('utf8'), 'PQ decrypted text must match plaintext');

  const pqExpectedChecksum = crypto.createHash('sha256').update(pqSampleData).digest('hex');
  assert.strictEqual(pqEncResult.checksum, pqExpectedChecksum, 'PQ checksum must match plaintext digest');
  console.log('  -> PQ encrypt/decrypt round-trip succeeded with SHA-256 verification.');

  // Test 10: PQ Tamper Detection — flip ciphertext byte
  console.log('\n[TEST 10] PQ Tamper Detection: Ciphertext Bit-Flipping');
  const pqTamperedData = Buffer.from(pqEncResult.encryptedData);
  pqTamperedData[0] = pqTamperedData[0] ^ 0xFF;

  let pqTamperCaught = false;
  try {
    decryptBufferPQ(
      pqTamperedData,
      pqEncResult.iv,
      pqEncResult.authTag,
      pqEncResult.wrappedDek,
      pqEncResult.kemCipherText,
      pqEncResult.checksum
    );
  } catch (err) {
    pqTamperCaught = true;
    console.log('  -> PQ tampered ciphertext correctly rejected:', err.message);
  }
  assert(pqTamperCaught, 'PQ tampered ciphertext must be rejected by GCM auth tag verification');

  // Test 11: Legacy backward compatibility — old encrypt/decrypt still works unchanged
  console.log('\n[TEST 11] Legacy Backward Compatibility: encryptBuffer/decryptBuffer still functional');
  const legacyData = Buffer.from('Legacy AES-only file: equipment vibration log 2026-Q3');
  const legacyEnc = encryptBuffer(legacyData);
  assert.strictEqual(legacyEnc.algorithm, 'aes-256-gcm', 'Legacy algorithm must remain aes-256-gcm');
  assert(!legacyEnc.wrappedDek, 'Legacy result must not contain wrappedDek');
  assert(!legacyEnc.kemCipherText, 'Legacy result must not contain kemCipherText');

  const legacyDec = decryptBuffer(legacyEnc.encryptedData, legacyEnc.iv, legacyEnc.authTag, legacyEnc.checksum);
  assert.strictEqual(legacyDec.toString('utf8'), legacyData.toString('utf8'), 'Legacy decrypted text must match');
  console.log('  -> Legacy AES-256-GCM encrypt/decrypt path fully operational.');

  console.log('\n==================================================================');
  console.log('>>> ALL GATEWAY CRYPTOGRAPHY, AUTH & POST-QUANTUM TESTS PASSED! <<<');
  console.log('==================================================================');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

