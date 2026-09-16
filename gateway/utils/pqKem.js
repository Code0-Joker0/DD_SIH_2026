import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/**
 * Post-Quantum Key Encapsulation Module (ML-KEM-768 / FIPS 203)
 *
 * Manages a long-lived ML-KEM-768 keypair for the gateway and provides
 * key-wrap / key-unwrap operations that protect per-file AES-256-GCM
 * data-encryption keys (DEKs) against quantum-capable adversaries.
 *
 * Keypair lifecycle:
 *   - Generated once on first use and persisted to gateway/data/kem-keypair.json
 *   - Loaded from disk on subsequent startups
 *   - MUST be excluded from version control (see .gitignore)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYPAIR_PATH = path.join(__dirname, '..', 'data', 'kem-keypair.json');

// ML-KEM-768 constants (FIPS 203)
export const KEM_PUBLIC_KEY_BYTES = 1184;
export const KEM_SECRET_KEY_BYTES = 2400;
export const KEM_CIPHERTEXT_BYTES = 1088;
export const KEM_SHARED_SECRET_BYTES = 32;

/** Cached keypair — loaded or generated once per process lifetime. */
let _cachedKeyPair = null;

/**
 * Ensure the data directory exists for keypair persistence.
 */
function ensureDataDir() {
  const dataDir = path.dirname(KEYPAIR_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Get (or generate + persist) the server ML-KEM-768 keypair.
 *
 * @returns {{ publicKey: Uint8Array, secretKey: Uint8Array }}
 */
export function getKemKeyPair() {
  if (_cachedKeyPair) return _cachedKeyPair;

  // Try loading from disk first
  if (fs.existsSync(KEYPAIR_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
      _cachedKeyPair = {
        publicKey: Uint8Array.from(Buffer.from(stored.publicKey, 'hex')),
        secretKey: Uint8Array.from(Buffer.from(stored.secretKey, 'hex')),
      };

      // Sanity check key lengths
      if (
        _cachedKeyPair.publicKey.length !== KEM_PUBLIC_KEY_BYTES ||
        _cachedKeyPair.secretKey.length !== KEM_SECRET_KEY_BYTES
      ) {
        throw new Error('Stored KEM keypair has incorrect key lengths — regenerating');
      }

      return _cachedKeyPair;
    } catch (err) {
      console.warn(`[PQ-KEM] Failed to load keypair from disk, regenerating: ${err.message}`);
    }
  }

  // Generate a fresh ML-KEM-768 keypair
  const seed = crypto.randomBytes(64); // 512-bit seed for keygen
  const keys = ml_kem768.keygen(seed);

  _cachedKeyPair = {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };

  // Persist to disk so the keypair survives gateway restarts
  ensureDataDir();
  const serialised = {
    algorithm: 'ML-KEM-768',
    standard: 'FIPS 203',
    generatedAt: new Date().toISOString(),
    publicKey: Buffer.from(keys.publicKey).toString('hex'),
    secretKey: Buffer.from(keys.secretKey).toString('hex'),
  };
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(serialised, null, 2), 'utf8');
  console.log('[PQ-KEM] Generated and persisted new ML-KEM-768 keypair');

  return _cachedKeyPair;
}

/**
 * Wrap a 32-byte data-encryption key (DEK) using ML-KEM-768 encapsulation.
 *
 * 1. Encapsulate against the server's public key → (kemCipherText, sharedSecret)
 * 2. XOR the DEK with the sharedSecret to produce wrappedDek
 *
 * @param {Buffer} dek — 32-byte plaintext data-encryption key
 * @returns {{ wrappedDek: Buffer, kemCipherText: Buffer, kemPublicKey: Buffer }}
 */
export function kemWrapKey(dek) {
  if (!Buffer.isBuffer(dek) || dek.length !== 32) {
    throw new Error('DEK must be a 32-byte Buffer');
  }

  const { publicKey } = getKemKeyPair();
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);

  // XOR-wrap: wrappedDek = dek ⊕ sharedSecret
  const wrappedDek = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    wrappedDek[i] = dek[i] ^ sharedSecret[i];
  }

  return {
    wrappedDek,
    kemCipherText: Buffer.from(cipherText),
    kemPublicKey: Buffer.from(publicKey),
  };
}

/**
 * Unwrap a 32-byte DEK by decapsulating the KEM ciphertext.
 *
 * 1. Decapsulate kemCipherText with the server's secret key → sharedSecret
 * 2. XOR the wrappedDek with sharedSecret to recover the plaintext DEK
 *
 * @param {Buffer} wrappedDek — 32-byte wrapped DEK
 * @param {Buffer} kemCipherText — 1088-byte ML-KEM-768 ciphertext
 * @returns {Buffer} — 32-byte recovered DEK
 */
export function kemUnwrapKey(wrappedDek, kemCipherText) {
  if (!Buffer.isBuffer(wrappedDek) || wrappedDek.length !== 32) {
    throw new Error('wrappedDek must be a 32-byte Buffer');
  }
  if (!Buffer.isBuffer(kemCipherText) || kemCipherText.length !== KEM_CIPHERTEXT_BYTES) {
    throw new Error(`kemCipherText must be a ${KEM_CIPHERTEXT_BYTES}-byte Buffer`);
  }

  const { secretKey } = getKemKeyPair();
  const sharedSecret = ml_kem768.decapsulate(
    Uint8Array.from(kemCipherText),
    Uint8Array.from(secretKey),
  );

  // Unwrap: dek = wrappedDek ⊕ sharedSecret
  const dek = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    dek[i] = wrappedDek[i] ^ sharedSecret[i];
  }

  return dek;
}

/**
 * Clear cached keypair (useful for testing).
 */
export function _resetCachedKeyPair() {
  _cachedKeyPair = null;
}

export default {
  getKemKeyPair,
  kemWrapKey,
  kemUnwrapKey,
  _resetCachedKeyPair,
  KEM_PUBLIC_KEY_BYTES,
  KEM_SECRET_KEY_BYTES,
  KEM_CIPHERTEXT_BYTES,
  KEM_SHARED_SECRET_BYTES,
};
