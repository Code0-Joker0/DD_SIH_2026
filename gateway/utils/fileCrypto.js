import crypto from 'crypto';

/**
 * Singularity Cryptographic Utility
 * Authenticated Encryption at Rest using AES-256-GCM
 * Guaranteed Confidentiality, Authenticity, and Integrity
 */

const ALGORITHM = 'aes-256-gcm';
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

export default {
  encryptBuffer,
  decryptBuffer,
  getMasterKey,
};