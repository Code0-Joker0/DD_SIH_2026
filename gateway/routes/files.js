import express from 'express';
import multer from 'multer';
import path from 'path';
import db from '../db/index.js';
import { encryptBuffer, decryptBuffer } from '../utils/fileCrypto.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer for secure in-memory streaming before encryption
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limit
  }
});

/**
 * Determine document category from filename or MIME type
 */
const getCategoryFromMime = (filename, mimeType) => {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.pdf' || mimeType === 'application/pdf') return 'PDF';
  if (['.doc', '.docx'].includes(ext) || (mimeType && mimeType.includes('word'))) return 'DOCX';
  if (['.xls', '.xlsx', '.ods'].includes(ext) || (mimeType && (mimeType.includes('sheet') || mimeType.includes('excel')))) return 'Spreadsheet';
  if (['.csv', '.json', '.xml', '.log'].includes(ext) || (mimeType && (mimeType.includes('csv') || mimeType.includes('json')))) return 'Data';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) return 'Image';
  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.cpp', '.java', '.sql', '.sh'].includes(ext)) return 'Code';
  return 'Document';
};

/**
 * Format bytes to readable size
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * POST /api/files/upload
 * Securely encrypt with AES-256-GCM and store in PostgreSQL
 */
router.post('/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file provided in request'
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const user = req.user || { id: null, username: 'anonymous', full_name: 'Enterprise Engineer', department: 'General' };
    const department = req.body.department || user.department || 'General';
    const category = req.body.category || getCategoryFromMime(originalname, mimetype);
    const isCompanyWide = req.body.isCompanyWide !== 'false';

    // 1. Perform Hardware-Accelerated AES-256-GCM Encryption with SHA-256 Checksum
    const encryptionResult = encryptBuffer(buffer);

    const safeFilename = `${Date.now()}_${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // 2. Store encrypted file record directly in PostgreSQL
    const insertQuery = `
      INSERT INTO company_files (
        filename, original_name, mime_type, file_size, encrypted_size,
        encrypted_data, encryption_algorithm, encryption_iv, encryption_auth_tag,
        checksum_sha256, uploaded_by, department, category, status, is_company_wide, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, filename, original_name, mime_type, file_size, encrypted_size,
                encryption_algorithm, checksum_sha256, department, category, status,
                is_company_wide, created_at;
    `;

    const values = [
      safeFilename,
      originalname,
      mimetype,
      encryptionResult.originalSize,
      encryptionResult.encryptedSize,
      encryptionResult.encryptedData, // BYTEA
      encryptionResult.algorithm,
      encryptionResult.iv,
      encryptionResult.authTag,
      encryptionResult.checksum,
      user.id,
      department,
      category,
      'Verified',
      isCompanyWide,
      JSON.stringify({
        uploadedByUsername: user.username,
        uploadedByFullName: user.full_name,
        originalMime: mimetype
      })
    ];

    const result = await db.query(insertQuery, values);
    const savedFile = result.rows[0];

    // 3. Record Audit Log Entry
    await db.query(
      `INSERT INTO file_audit_logs (file_id, user_id, action, ip_address, user_agent, status, details)
       VALUES ($1, $2, 'UPLOAD', $3, $4, 'SUCCESS', $5)`,
      [
        savedFile.id,
        user.id,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'App',
        JSON.stringify({ filename: originalname, size: encryptionResult.originalSize })
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'File successfully encrypted (AES-256-GCM) and committed to PostgreSQL database',
      file: {
        ...savedFile,
        formattedSize: formatBytes(savedFile.file_size),
        formattedEncryptedSize: formatBytes(savedFile.encrypted_size),
        checksum: savedFile.checksum_sha256
      }
    });

  } catch (error) {
    console.error('File Upload Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to encrypt and store file in database',
      error: error.message
    });
  }
});

/**
 * GET /api/files
 * Retrieve list of encrypted files with optional filtering and search
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, department } = req.query;

    const queryText = `
      SELECT f.id, f.filename, f.original_name, f.mime_type, f.file_size, f.encrypted_size,
             f.encryption_algorithm, f.checksum_sha256, f.department, f.category, f.status,
             f.is_company_wide, f.metadata, f.created_at, f.updated_at,
             u.full_name as uploader_name, u.email as uploader_email
      FROM company_files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      ORDER BY f.created_at DESC
    `;

    const result = await db.query(queryText);
    let files = result.rows;

    // Apply filters
    if (category && category !== 'All') {
      files = files.filter(f => f.category.toLowerCase() === category.toLowerCase() ||
        (category === 'Spreadsheet' && ['Spreadsheet', 'Data'].includes(f.category)));
    }

    if (department && department !== 'All') {
      files = files.filter(f => f.department.toLowerCase() === department.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      files = files.filter(f =>
        (f.original_name && f.original_name.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.department && f.department.toLowerCase().includes(q))
      );
    }

    // Format response
    const formattedFiles = files.map(f => ({
      id: f.id,
      name: f.original_name,
      type: f.category,
      mimeType: f.mime_type,
      size: formatBytes(f.file_size),
      rawSize: f.file_size,
      encryptedSize: formatBytes(f.encrypted_size),
      date: new Date(f.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      }),
      createdAt: f.created_at,
      status: f.status,
      encryption: 'AES-256-GCM',
      department: f.department,
      uploader: f.uploader_name || 'Enterprise Personnel'
    }));

    return res.json({
      status: 'success',
      count: formattedFiles.length,
      files: formattedFiles
    });

  } catch (error) {
    console.error('List Files Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve company files',
      error: error.message
    });
  }
});

/**
 * GET /api/files/stats/summary
 * Aggregate statistics for dashboard metrics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.id, f.file_size, f.encrypted_size, f.category, f.department, f.created_at
      FROM company_files f
    `);

    const files = result.rows;
    const totalFiles = files.length;
    const totalBytes = files.reduce((acc, f) => acc + parseInt(f.file_size || 0, 10), 0);
    const totalEncryptedBytes = files.reduce((acc, f) => acc + parseInt(f.encrypted_size || 0, 10), 0);

    const categoryCounts = {};
    files.forEach(f => {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    });

    return res.json({
      status: 'success',
      stats: {
        totalFiles,
        totalStorage: formatBytes(totalBytes),
        totalEncryptedStorage: formatBytes(totalEncryptedBytes),
        categoryCounts,
        securityProtocol: 'AES-256-GCM + SHA-256'
      }
    });
  } catch (error) {
    console.error('File Stats Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/files/:id
 * Retrieve file metadata
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT f.id, f.filename, f.original_name, f.mime_type, f.file_size, f.encrypted_size,
              f.encryption_algorithm, f.checksum_sha256, f.department, f.category, f.status,
              f.is_company_wide, f.created_at, f.updated_at,
              u.full_name as uploader_name
       FROM company_files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }

    const file = result.rows[0];
    return res.json({
      status: 'success',
      file: {
        ...file,
        formattedSize: formatBytes(file.file_size),
        formattedEncryptedSize: formatBytes(file.encrypted_size)
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/files/:id/download
 * Decrypt file with AES-256-GCM, verify SHA-256 checksum, and stream to client
 */
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, original_name, mime_type, file_size, encrypted_data,
              encryption_iv, encryption_auth_tag, checksum_sha256, status
       FROM company_files
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found in PostgreSQL storage'
      });
    }

    const file = result.rows[0];

    const decryptedBuffer = decryptBuffer(
      file.encrypted_data,
      file.encryption_iv,
      file.encryption_auth_tag,
      file.checksum_sha256
    );

    const userId = req.user ? req.user.id : null;
    await db.query(
      `INSERT INTO file_audit_logs (file_id, user_id, action, ip_address, user_agent, status, details)
       VALUES ($1, $2, 'DOWNLOAD', $3, $4, 'SUCCESS', $5)`,
      [
        file.id,
        userId,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'App',
        JSON.stringify({ filename: file.original_name, checksumVerified: true })
      ]
    );

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.setHeader('X-Encryption-Status', 'AES-256-GCM-Verified');
    res.setHeader('X-Integrity-SHA256', file.checksum_sha256);

    return res.send(decryptedBuffer);

  } catch (error) {
    console.error('Decryption / Download Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to decrypt file or integrity verification failed',
      error: error.message
    });
  }
});

/**
 * DELETE /api/files/:id
 * Securely remove file from PostgreSQL storage
 */
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const fileResult = await db.query('SELECT id, original_name, uploaded_by FROM company_files WHERE id = $1', [id]);
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (req.user && req.user.role !== 'admin' && file.uploaded_by && file.uploaded_by !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Permission denied: Only the uploader or system administrators can delete company files'
      });
    }

    await db.query('DELETE FROM company_files WHERE id = $1', [id]);

    const userId = req.user ? req.user.id : null;
    await db.query(
      `INSERT INTO file_audit_logs (file_id, user_id, action, ip_address, user_agent, status, details)
       VALUES ($1, $2, 'DELETE', $3, $4, 'SUCCESS', $5)`,
      [
        id,
        userId,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'App',
        JSON.stringify({ deletedFilename: file.original_name })
      ]
    );

    return res.json({
      status: 'success',
      message: `File "${file.original_name}" has been permanently and securely purged from database`
    });

  } catch (error) {
    console.error('File Delete Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;