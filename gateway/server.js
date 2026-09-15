import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment configurations from root or local .env
dotenv.config();

// 1. Teammate Enterprise Auth & Encrypted Vault Routers
import db from './db/index.js';
import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';

const app = express();

// 2. Environment & Dynamic Routing Configuration
const GATEWAY_PORT = process.env.GATEWAY_PORT || process.env.PORT || 3000;
const FASTAPI_HOST = process.env.API_HOST || '127.0.0.1';
const FASTAPI_PORT = process.env.API_PORT || 8000;
const FASTAPI_BASE_URL = `http://${FASTAPI_HOST}:${FASTAPI_PORT}`;

// 3. Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Mount Enterprise Auth & Encrypted Vault Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);

// 5. Disk Storage for Temp Uploads
const uploadDir = path.resolve('temp_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    })
});

// 6. Health & Gateway Diagnostics
app.get('/api/health', async (req, res) => {
    try {
        const backendRes = await axios.get(`${FASTAPI_BASE_URL}/health`, { timeout: 2000 });
        res.json({ gateway: 'ONLINE', backend: backendRes.data });
    } catch (err) {
        res.status(503).json({ gateway: 'ONLINE', backend: 'UNREACHABLE', error: err.message });
    }
});

// Optional network status route for the dashboard
app.get('/api/network-status', (req, res) => {
    res.json({
        status: 'ONLINE',
        mode: 'ON_PREMISE_SOVEREIGN',
        timestamp: new Date().toISOString()
    });
});

// 7. RAG Ingestion / Upload: POST /api/documents/upload -> FastAPI
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        // Forward metadata tags
        if (req.body.equipment_tag) form.append('equipment_tag', req.body.equipment_tag);
        if (req.body.category) form.append('category', req.body.category);
        if (req.body.source_type) form.append('source_type', req.body.source_type);

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/documents/upload`, form, {
            headers: { ...form.getHeaders() }
        });

        // Clean up local temp file
        fs.unlink(req.file.path, () => { });

        res.status(response.status).json(response.data);
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => { });
        const status = err.response ? err.response.status : 500;
        res.status(status).json({ error: 'Ingestion failed', details: err.response?.data || err.message });
    }
});

// 8. Interactive Copilot Chat: POST /api/chat -> FastAPI
app.post('/api/chat', async (req, res) => {
    try {
        const { session_id, message, selected_doc_ids } = req.body;

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/chat`, {
            session_id: session_id || 'default_session',
            message,
            selected_doc_ids: selected_doc_ids || []
        });

        res.json(response.data);
    } catch (err) {
        const status = err.response ? err.response.status : 500;
        res.status(status).json({ error: 'Chat completion failed', details: err.response?.data || err.message });
    }
});

// 9. Full Agentic Task: POST /api/tasks/execute -> FastAPI (Streams back binary .docx)
app.post('/api/tasks/execute', upload.single('file'), async (req, res) => {
    try {
        const form = new FormData();
        if (req.file) {
            form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
        }
        if (req.body.task_prompt) form.append('task_prompt', req.body.task_prompt);

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/tasks/execute`, form, {
            headers: { ...form.getHeaders() },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader(
            'Content-Disposition',
            response.headers['content-disposition'] || 'attachment; filename="Approval_Note.docx"'
        );

        response.data.pipe(res);

        response.data.on('end', () => {
            if (req.file) fs.unlink(req.file.path, () => { });
        });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => { });
        const status = err.response ? err.response.status : 500;
        res.status(status).json({ error: 'Task execution failed', details: err.message });
    }
});

// 10. Centralized Error Handler
app.use((err, req, res, next) => {
    console.error('[GATEWAY ERROR]', err);
    res.status(500).json({ error: 'Internal Gateway Error', message: err.message });
});

app.listen(GATEWAY_PORT, async () => {
    console.log(`[GATEWAY] Running on port ${GATEWAY_PORT}`);
    console.log(`[GATEWAY] Forwarding AI agent calls to FastAPI at ${FASTAPI_BASE_URL}`);

    // Test live PostgreSQL connection on boot
    try {
        await db.testConnection();
    } catch (err) {
        console.error('[GATEWAY DB ERROR]:', err.message);
    }
});