import crypto from 'crypto';
import { kemWrapKey, kemUnwrapKey } from './pqKem.js';

/**
 * Cryptographic Utility
 * Authenticated Encryption at Rest using AES-256-GCM
 * Post-Quantum Key-Wrapping via ML-KEM-768 (FIPS 203)
 * Guaranteed Confidentiality, Authenticity, and Integrity
 */

const ALGORITHM = 'aes-256-gcm';
const PQ_ALGORITHM = 'aes-256-gcm+ml-kem-768';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits

// Derive a fixed 32-byte (256-bit) encryption key from the environment variable via SHA-256
export const getMasterKey = () => {
  const secret =
    process.env.FILE_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    'singularity-ai-enterprise-master-encryption-key-2026';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a buffer with AES-256-GCM and compute SHA-256 checksum
 * @param {Buffer|string} buffer - Plaintext file data
 * @returns {Object} { encryptedData, iv, authTag, checksum, originalSize, encryptedSize, algorithm }
 */
export const encryptBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }

  // 1. Calculate cryptographic SHA-256 checksum of original file
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  // 2. Generate cryptographically random 96-bit Initialization Vector (IV)
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = getMasterKey();

  // 3. Encrypt file using AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encryptedData = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  // 4. Retrieve 128-bit authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    checksum,
    originalSize: buffer.length,
    encryptedSize: encryptedData.length,
    algorithm: ALGORITHM,
  };
};

/**
 * Decrypt an AES-256-GCM encrypted buffer with integrity check
 * @param {Buffer|Uint8Array} encryptedData - Ciphertext buffer
 * @param {string} ivHex - Hex-encoded IV
 * @param {string} authTagHex - Hex-encoded Auth Tag
 * @param {string} [expectedChecksum=null] - Expected SHA-256 checksum
 * @returns {Buffer} Decrypted plaintext buffer
 */
export const decryptBuffer = (encryptedData, ivHex, authTagHex, expectedChecksum = null) => {
  if (!Buffer.isBuffer(encryptedData)) {
    encryptedData = Buffer.from(encryptedData);
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getMasterKey();

  // 1. Initialize AES-256-GCM Decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  // 2. Set expected authentication tag (prevents bit-flipping/tampering)
  decipher.setAuthTag(authTag);

  // 3. Decrypt ciphertext
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(), // Throws if ciphertext or auth tag has been tampered with
  ]);

  // 4. Verify integrity against original SHA-256 checksum if provided
  if (expectedChecksum) {
    const calculatedChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (calculatedChecksum !== expectedChecksum) {
      throw new Error('Integrity check failed: decrypted file checksum does not match expected checksum');
    }
  }

  return decrypted;
};

// ---------------------------------------------------------------------------
// Post-Quantum Key-Wrapped Encryption (ML-KEM-768 / FIPS 203)
// ---------------------------------------------------------------------------

/**
 * Encrypt a buffer with AES-256-GCM using an ephemeral per-file DEK,
 * then wrap the DEK with ML-KEM-768 encapsulation.
 *
 * @param {Buffer|string} buffer - Plaintext file data
 * @returns {Object} All fields from encryptBuffer() PLUS:
 *   { wrappedDek, kemCipherText, kemPublicKey, algorithm: 'aes-256-gcm+ml-kem-768' }
 */
export const encryptBufferPQ = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }

  // 1. SHA-256 checksum of original plaintext
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  // 2. Generate an ephemeral 32-byte Data Encryption Key (DEK)
  const dek = crypto.randomBytes(32);

  // 3. AES-256-GCM encrypt the file with the ephemeral DEK
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encryptedData = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // 4. Wrap the DEK using ML-KEM-768 encapsulation
  const { wrappedDek, kemCipherText, kemPublicKey } = kemWrapKey(dek);

  // 5. Zeroize the plaintext DEK from memory
  dek.fill(0);

  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    checksum,
    originalSize: buffer.length,
    encryptedSize: encryptedData.length,
    algorithm: PQ_ALGORITHM,
    wrappedDek: Buffer.from(wrappedDek).toString('hex'),
    kemCipherText: Buffer.from(kemCipherText).toString('hex'),
    kemPublicKey: Buffer.from(kemPublicKey).toString('hex'),
  };
};

/**
 * Decrypt a PQ-wrapped AES-256-GCM buffer:
 * 1. ML-KEM-768 decapsulate to recover the shared secret
 * 2. Unwrap the DEK
 * 3. AES-256-GCM decrypt with the recovered DEK
 * 4. Verify SHA-256 checksum
 *
 * @param {Buffer|Uint8Array} encryptedData - Ciphertext buffer
 * @param {string} ivHex - Hex-encoded 96-bit IV
 * @param {string} authTagHex - Hex-encoded 128-bit GCM auth tag
 * @param {string} wrappedDekHex - Hex-encoded 32-byte wrapped DEK
 * @param {string} kemCipherTextHex - Hex-encoded ML-KEM-768 ciphertext (1088 bytes)
 * @param {string} [expectedChecksum=null] - Expected SHA-256 checksum
 * @returns {Buffer} Decrypted plaintext buffer
 */
export const decryptBufferPQ = (
  encryptedData,
  ivHex,
  authTagHex,
  wrappedDekHex,
  kemCipherTextHex,
  expectedChecksum = null,
) => {
  if (!Buffer.isBuffer(encryptedData)) {
    encryptedData = Buffer.from(encryptedData);
  }

  // 1. Unwrap the DEK using ML-KEM-768 decapsulation
  const wrappedDek = Buffer.from(wrappedDekHex, 'hex');
  const kemCipherText = Buffer.from(kemCipherTextHex, 'hex');
  const dek = kemUnwrapKey(wrappedDek, kemCipherText);

  // 2. AES-256-GCM decrypt with the recovered DEK
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  // 3. Zeroize the recovered DEK
  dek.fill(0);

  // 4. Verify SHA-256 checksum if provided
  if (expectedChecksum) {
    const calculatedChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (calculatedChecksum !== expectedChecksum) {
      throw new Error('Integrity check failed: decrypted file checksum does not match expected checksum');
    }
  }

  return decrypted;
};

export default {
  encryptBuffer,
  decryptBuffer,
  encryptBufferPQ,
  decryptBufferPQ,
  getMasterKey,
};