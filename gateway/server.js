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

// 1. Enterprise Auth & Encrypted Vault Routers
import db from './db/index.js';
import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import chatRouter from './routes/chat.js';

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

// 4. Mount Enterprise Auth, Encrypted Vault & Chat Routers
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/chat', chatRouter);

// 5. Disk Storage for Temp Uploads
const uploadDir = path.resolve('temp_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    })
});

// Helper for safe temp file removal
const safeUnlink = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, () => { });
    }
};

// 6. Health & Gateway Diagnostics
app.get('/api/health', async (req, res) => {
    try {
        const backendRes = await axios.get(`${FASTAPI_BASE_URL}/health`, { timeout: 3000 });
        res.json({
            gateway: 'ONLINE',
            port: GATEWAY_PORT,
            backend: backendRes.data
        });
    } catch (err) {
        res.status(503).json({
            gateway: 'ONLINE',
            port: GATEWAY_PORT,
            backend: 'UNREACHABLE',
            error: err.message
        });
    }
});

// Model Discovery Proxy Endpoint
app.get('/api/models', async (req, res) => {
    try {
        const backendRes = await axios.get(`${FASTAPI_BASE_URL}/api/models`, { timeout: 4000 });
        res.json(backendRes.data);
    } catch (err) {
        res.json({
            default: 'auto',
            models: ['auto', 'llama3.2:3b', 'qwen2.5:7b', 'llama3.1:8b', 'deepseek-r1:7b']
        });
    }
});

// Network status route for dashboard telemetry
app.get('/api/network-status', async (req, res) => {
    try {
        const backendRes = await axios.get(`${FASTAPI_BASE_URL}/api/network-status`, { timeout: 2000 });
        res.json(backendRes.data);
    } catch {
        res.json({
            status: 'ONLINE',
            mode: 'ON_PREMISE_SOVEREIGN',
            timestamp: new Date().toISOString()
        });
    }
});

// 7. RAG Ingestion / Upload: POST /api/documents/upload -> FastAPI
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        // Forward metadata tags to FastAPI for Qdrant payload tagging
        if (req.body.equipment_tag) form.append('equipment_tag', req.body.equipment_tag);
        if (req.body.category) form.append('category', req.body.category);
        if (req.body.source_type) form.append('source_type', req.body.source_type);

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/documents/upload`, form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000
        });

        safeUnlink(req.file.path);
        res.status(response.status).json(response.data);
    } catch (err) {
        if (req.file) safeUnlink(req.file.path);
        const status = err.response ? err.response.status : 500;
        res.status(status).json({
            error: 'Ingestion failed',
            details: err.response?.data || err.message
        });
    }
});

// 8. Direct Semantic RAG Query: POST /api/rag/query -> FastAPI
app.post('/api/rag/query', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/rag/query`, {
            query: query.trim()
        }, {
            timeout: 60000
        });

        res.json(response.data);
    } catch (err) {
        const status = err.response ? err.response.status : 500;
        res.status(status).json({
            error: 'RAG query failed',
            details: err.response?.data || err.message
        });
    }
});



// 10. Full Agentic Task: POST /api/tasks/execute -> FastAPI (Streams back binary .docx)
app.post('/api/tasks/execute', upload.single('file'), async (req, res) => {
    try {
        const form = new FormData();
        if (req.file) {
            form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
        }
        if (req.body.task_prompt) {
            form.append('task_prompt', req.body.task_prompt);
        }

        const response = await axios.post(`${FASTAPI_BASE_URL}/api/tasks/execute`, form, {
            headers: { ...form.getHeaders() },
            responseType: 'stream',
            timeout: 180000
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader(
            'Content-Disposition',
            response.headers['content-disposition'] || 'attachment; filename="Approval_Note.docx"'
        );

        response.data.pipe(res);

        response.data.on('end', () => {
            if (req.file) safeUnlink(req.file.path);
        });

        response.data.on('error', () => {
            if (req.file) safeUnlink(req.file.path);
        });
    } catch (err) {
        if (req.file) safeUnlink(req.file.path);
        const status = err.response ? err.response.status : 500;
        res.status(status).json({ error: 'Task execution failed', details: err.message });
    }
});

// 11. Centralized Error Handler
app.use((err, req, res, next) => {
    console.error('[GATEWAY ERROR]', err);
    res.status(500).json({ error: 'Internal Gateway Error', message: err.message });
});

// 12. Ordered Startup Lifecycle
async function startServer() {
    try {
        console.log('[GATEWAY] Initializing embedded sovereign database engine...');

        // 1. Establish PGlite embedded connection
        if (db && typeof db.testConnection === 'function') {
            await db.testConnection();
        }

        // 2. Ensure schema, tables, and default accounts are fully provisioned
        if (db && typeof db.initDatabase === 'function') {
            await db.initDatabase();
            console.log('[GATEWAY DB] Embedded schema verification complete.');
        }

        // 3. Listen on port only after DB is ready
        app.listen(GATEWAY_PORT, () => {
            console.log(`[GATEWAY] Running on port ${GATEWAY_PORT}`);
            console.log(`[GATEWAY] Forwarding AI agent & RAG calls to FastAPI at ${FASTAPI_BASE_URL}`);
        });
    } catch (err) {
        console.error('❌ [GATEWAY BOOTSTRAP FATAL ERROR]:', err);
        process.exit(1);
    }
}

startServer();