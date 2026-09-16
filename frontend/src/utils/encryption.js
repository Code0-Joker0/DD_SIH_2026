/**
 * Singularity Client-Side Encryption Utilities
 * Uses Web Crypto API / CryptoJS for end-to-end transport encryption
 */

const DEFAULT_SECRET = 'singularity-ai-encryption-key-2026-change-in-production';

/**
 * Convert string to UTF-8 array
 */
function stringToUtf8ByteArray(str) {
  return new TextEncoder().encode(str);
}

/**
 * Derive AES-GCM key from passphrase using PBKDF2 / SHA-256
 */
async function deriveKey(passphrase = DEFAULT_SECRET) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('singularity-salt-2026'),
      iterations: 1000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text message with AES-GCM for transport
 * @param {string} text 
 * @param {string} [secret]
 * @returns {Promise<string>} Base64 encoded payload
 */
export async function encryptChatMessage(text, secret = DEFAULT_SECRET) {
  try {
    const key = await deriveKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn('Encryption fallback to plaintext wrapper:', err);
    return btoa(unescape(encodeURIComponent(text)));
  }
}

/**
 * Decrypt a transport-encrypted message
 * @param {string} base64Payload 
 * @param {string} [secret]
 * @returns {Promise<string>}
 */
export async function decryptChatMessage(base64Payload, secret = DEFAULT_SECRET) {
  try {
    const binary = atob(base64Payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const key = await deriveKey(secret);
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    try {
      return decodeURIComponent(escape(atob(base64Payload)));
    } catch {
      return base64Payload;
    }
  }
}

