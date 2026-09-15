import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const app = express();

// 1. Environment & Dynamic Routing Configuration
const GATEWAY_PORT = process.env.GATEWAY_PORT || 3000;
const FASTAPI_HOST = process.env.API_HOST || '127.0.0.1';
const FASTAPI_PORT = process.env.API_PORT || 8000;
const FASTAPI_BASE_URL = `http://${FASTAPI_HOST}:${FASTAPI_PORT}`;

app.use(cors());
app.use(express.json());

// 2. Disk Storage for Temp Uploads
const uploadDir = path.resolve('temp_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    })
});

// 3. Health Route
app.get('/api/health', async (req, res) => {
    try {
        const backendRes = await axios.get(`${FASTAPI_BASE_URL}/health`, { timeout: 2000 });
        res.json({ gateway: 'ONLINE', backend: backendRes.data });
    } catch (err) {
        res.status(503).json({ gateway: 'ONLINE', backend: 'UNREACHABLE', error: err.message });
    }
});

// 4. Ingestion / Upload: POST /api/documents/upload
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        // Pass metadata forward
        if (req.body.equipment_tag) form.append('equipment_tag', req.body.equipment_tag);
        if (req.body.category) form.append('category', req.body.category);

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

// 5. Interactive Copilot Chat: POST /api/chat
app.post('/api/chat', async (req, res) => {
    try {
        const { session_id, message, selected_doc_ids } = req.body;

        // Non-streaming direct response
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

// 6. Full Agentic Task: POST /api/tasks/execute -> Streams back binary .docx
app.post('/api/tasks/execute', upload.single('file'), async (req, res) => {
    try {
        const form = new FormData();
        if (req.file) {
            form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
        }
        if (req.body.task_prompt) form.append('task_prompt', req.body.task_prompt);

        // Request response as arraybuffer/stream to handle binary file
        const response = await axios.post(`${FASTAPI_BASE_URL}/api/tasks/execute`, form, {
            headers: { ...form.getHeaders() },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', response.headers['content-disposition'] || 'attachment; filename="Approval_Note.docx"');

        response.data.pipe(res);

        response.data.on('end', () => {
            if (req.file) fs.unlink(req.file.path, () => { });
        });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => { });
        res.status(500).json({ error: 'Task execution failed', details: err.message });
    }
});

app.listen(GATEWAY_PORT, () => {
    console.log(`[GATEWAY] Running on port ${GATEWAY_PORT}`);
    console.log(`[GATEWAY] Forwarding to FastAPI at ${FASTAPI_BASE_URL}`);
});