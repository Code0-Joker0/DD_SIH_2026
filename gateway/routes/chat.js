import express from 'express';
import multer from 'multer';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import db from '../db/index.js';
import { encryptBuffer } from '../utils/fileCrypto.js';
import { optionalAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

const FASTAPI_HOST = process.env.API_HOST || '127.0.0.1';
const FASTAPI_PORT = process.env.API_PORT || 8000;
const FASTAPI_BASE_URL = `http://${FASTAPI_HOST}:${FASTAPI_PORT}`;

// Configure Multer for in-memory streaming before hardware-accelerated encryption
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB per file limit
  }
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 10 },
  { name: 'files', maxCount: 20 },
  { name: 'file', maxCount: 1 }
]);

/**
 * Determine document category from filename or MIME type
 */
const getCategoryFromMime = (filename, mimeType) => {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.pdf' || mimeType === 'application/pdf') return 'PDF';
  if (['.doc', '.docx'].includes(ext) || (mimeType && mimeType.includes('word'))) return 'DOCX';
  if (['.xls', '.xlsx', '.ods'].includes(ext) || (mimeType && (mimeType.includes('sheet') || mimeType.includes('excel')))) return 'Spreadsheet';
  if (['.csv', '.json', '.xml', '.log'].includes(ext) || (mimeType && (mimeType.includes('csv') || mimeType.includes('json')))) return 'Data';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) return 'Image';
  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.cpp', '.java', '.sql', '.sh'].includes(ext)) return 'Code';
  return 'Document';
};

/**
 * Persist an uploaded file buffer into the encrypted company_files vault and record audit log
 */
async function persistToVault(file, user, chatTitle = 'Chat Session') {
  try {
    const { originalname, mimetype, buffer } = file;
    const department = user.department || 'General';
    const category = getCategoryFromMime(originalname, mimetype);

    // 1. Hardware-Accelerated AES-256-GCM Encryption with SHA-256 Checksum
    const encryptionResult = encryptBuffer(buffer);
    const safeFilename = `${Date.now()}_${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // 2. Insert into PostgreSQL / PGlite company_files vault
    const insertQuery = `
      INSERT INTO company_files (
        filename, original_name, mime_type, file_size, encrypted_size,
        encrypted_data, encryption_algorithm, encryption_iv, encryption_auth_tag,
        checksum_sha256, uploaded_by, department, category, status, is_company_wide, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, filename, original_name, mime_type, file_size, category, created_at;
    `;

    const metadata = JSON.stringify({
      source: 'chat_upload',
      chatTitle: chatTitle || 'Chat Session',
      uploadedByUsername: user.username || 'engineer',
      uploadedByFullName: user.full_name || 'Enterprise Personnel',
      originalMime: mimetype
    });

    const values = [
      safeFilename,
      originalname,
      mimetype,
      encryptionResult.originalSize,
      encryptionResult.encryptedSize,
      encryptionResult.encryptedData,
      encryptionResult.algorithm,
      encryptionResult.iv,
      encryptionResult.authTag,
      encryptionResult.checksum,
      user.id || null,
      department,
      category,
      'Verified',
      true, // is_company_wide
      metadata
    ];

    const result = await db.query(insertQuery, values);
    const savedFile = result.rows[0];

    // 3. Record Regulatory Audit Log
    await db.query(
      `INSERT INTO file_audit_logs (file_id, user_id, action, ip_address, user_agent, status, details)
       VALUES ($1, $2, 'UPLOAD', '127.0.0.1', 'ChatVaultPipeline', 'SUCCESS', $3)`,
      [
        savedFile.id,
        user.id || null,
        JSON.stringify({ filename: originalname, size: encryptionResult.originalSize, source: 'chat_upload' })
      ]
    );

    return savedFile;
  } catch (err) {
    console.error(`[Vault Persistence Error on ${file.originalname}]:`, err);
    return null;
  }
}

/**
 * Main Chat Handler supporting both JSON payloads and multipart/form-data with attachments
 */
/**
 * Utility to strip Data URI schemes and whitespace from base64 strings
 */
function sanitizeBase64(rawB64) {
  if (!rawB64 || typeof rawB64 !== 'string') return '';
  if (rawB64.includes(',')) {
    rawB64 = rawB64.split(',')[1];
  }
  return rawB64.trim().replace(/\r?\n/g, '');
}

async function handleChatMessage(req, res) {
  try {
    const user = req.user || { id: null, username: 'anonymous', full_name: 'Enterprise Engineer', department: 'General' };
    const {
      message,
      prompt,
      session_id,
      selected_doc_ids,
      history,
      document_context,
      model_name,
      images,
      chatTitle
    } = req.body;

    const queryMessage = (message || prompt || '').trim();

    // Collect all files from multer fields
    const allFiles = [];
    const documentFiles = [];
    const imageFiles = [];

    if (req.files) {
      if (Array.isArray(req.files.documents)) {
        documentFiles.push(...req.files.documents);
        allFiles.push(...req.files.documents);
      }
      if (Array.isArray(req.files.images)) {
        imageFiles.push(...req.files.images);
        allFiles.push(...req.files.images);
      }
      if (Array.isArray(req.files.files)) {
        for (const f of req.files.files) {
          allFiles.push(f);
          if (f.mimetype.startsWith('image/')) {
            imageFiles.push(f);
          } else {
            documentFiles.push(f);
          }
        }
      }
      if (Array.isArray(req.files.file)) {
        for (const f of req.files.file) {
          allFiles.push(f);
          if (f.mimetype.startsWith('image/')) {
            imageFiles.push(f);
          } else {
            documentFiles.push(f);
          }
        }
      }
    }

    // Process any JSON base64 images from req.body
    const rawImages = images || req.body.images || [];
    const cleanImages = (Array.isArray(rawImages) ? rawImages : [rawImages])
      .map(sanitizeBase64)
      .filter(Boolean);

    if (!queryMessage && allFiles.length === 0 && cleanImages.length === 0) {
      return res.status(400).json({ error: 'Message or at least one file attachment is required' });
    }

    // 1. Asynchronously persist every uploaded file into the encrypted Knowledge Base Vault
    const vaultSavedPromises = allFiles.map((file) => persistToVault(file, user, chatTitle || session_id));
    const savedVaultRecords = await Promise.all(vaultSavedPromises);
    const successfulVaultUploads = savedVaultRecords.filter(Boolean);

    // 2. Dispatch to Python FastAPI Backend
    let backendResponse;

    if (allFiles.length > 0) {
      // Forward multipart form data to POST /api/analyze/multi-modal
      const forwardForm = new FormData();
      forwardForm.append('prompt', queryMessage || 'Perform comprehensive inspection assessment for uploaded assets.');
      forwardForm.append('session_id', session_id || 'default_session');
      forwardForm.append('model_name', model_name || 'auto');

      if (selected_doc_ids) {
        forwardForm.append('selected_doc_ids', typeof selected_doc_ids === 'string' ? selected_doc_ids : JSON.stringify(selected_doc_ids));
      }
      if (history) {
        forwardForm.append('history', typeof history === 'string' ? history : JSON.stringify(history));
      }

      for (const docFile of documentFiles) {
        forwardForm.append('documents', docFile.buffer, {
          filename: docFile.originalname,
          contentType: docFile.mimetype
        });
      }

      for (const imgFile of imageFiles) {
        forwardForm.append('images', imgFile.buffer, {
          filename: imgFile.originalname,
          contentType: imgFile.mimetype
        });
      }

      const response = await axios.post(`${FASTAPI_BASE_URL}/api/analyze/multi-modal`, forwardForm, {
        headers: { ...forwardForm.getHeaders() },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 180000 // 3 minutes timeout for heavy inference
      });

      backendResponse = response.data;
    } else {
      // Direct text / chat proxy to POST /api/chat
      const response = await axios.post(`${FASTAPI_BASE_URL}/api/chat`, {
        session_id: session_id || 'default_session',
        message: queryMessage,
        selected_doc_ids: typeof selected_doc_ids === 'string' ? JSON.parse(selected_doc_ids || '[]') : (selected_doc_ids || []),
        history: typeof history === 'string' ? JSON.parse(history || '[]') : (history || []),
        document_context: document_context || null,
        model_name: model_name || 'auto',
        images: cleanImages
      }, {
        timeout: 180000
      });

      backendResponse = response.data;
    }

    // Attach vault synchronization telemetry to the response
    backendResponse.vault_sync = {
      persisted_files_count: successfulVaultUploads.length,
      files: successfulVaultUploads.map((f) => ({ id: f.id, name: f.original_name, category: f.category }))
    };

    // 3. Persist the Chat Session and Messages to PostgreSQL
    if (user && user.id && session_id) {
      try {
        // Ensure conversation exists
        await db.query(
          `INSERT INTO conversations (id, user_id, title)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [session_id, user.id, chatTitle || 'New Conversation']
        );

        // Update updated_at
        await db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [session_id]);

        // Insert user message
        if (queryMessage) {
          await db.query(
            `INSERT INTO messages (id, conversation_id, sender, content) VALUES ($1, $2, $3, $4)`,
            [crypto.randomUUID(), session_id, 'user', queryMessage]
          );
        }

        // Insert AI response
        const aiContent = backendResponse.response || backendResponse.answer || '';
        if (aiContent) {
          await db.query(
            `INSERT INTO messages (id, conversation_id, sender, content) VALUES ($1, $2, $3, $4)`,
            [crypto.randomUUID(), session_id, 'assistant', aiContent]
          );
        }
      } catch (dbErr) {
        console.error('[CHAT DB PERSISTENCE ERROR]:', dbErr);
      }
    }

    return res.json(backendResponse);
  } catch (err) {
    console.error('[CHAT VAULT PIPELINE ERROR]:', err);
    const status = err.response ? err.response.status : 500;
    return res.status(status).json({
      error: 'Chat processing failed',
      details: err.response?.data || err.message
    });
  }
}

// GET /api/chat/conversations
router.get('/conversations', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await db.query(
      `SELECT id, title, created_at, updated_at 
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );
    return res.json({ success: true, conversations: result.rows });
  } catch (err) {
    console.error('[CONVERSATIONS FETCH ERROR]:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    // Verify ownership
    const convCheck = await db.query(`SELECT id FROM conversations WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (convCheck.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });

    const result = await db.query(
      `SELECT id, sender, content, created_at 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );
    return res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error('[MESSAGES FETCH ERROR]:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Routes
router.post('/message', optionalAuth, uploadFields, handleChatMessage);
router.post('/', optionalAuth, uploadFields, handleChatMessage);

export default router;
