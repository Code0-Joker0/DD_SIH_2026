import app from "./app.js";
import dotenv from 'dotenv';
import connectionPost from './database.js';
//import register from "./controllers/auth.controller.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/auth_routes.js";
import express from "express";

//const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT

connectionPost().catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
});

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser);

app.use("api/auth", authRouter);

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})