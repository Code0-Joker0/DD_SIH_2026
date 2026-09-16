import morgan from 'morgan';
import express from 'express';
import dotenv from 'dotenv';
import authRouter from './routes/auth_routes.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRouter);

export default app;