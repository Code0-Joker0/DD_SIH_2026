

import {Client} from "pg";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const HOST = process.env.HOST;
const PASSWORD = process.env.DP;
const DPORT = process.env.DPORT;
const USER = process.env.USER;
const DB = process.env.DB;

const app = express();
app.use(express.json());


const connection = new Client({
    host: HOST,
    user: USER,
    port: DPORT,
    password : PASSWORD,
    database : DB
    })

connection.connect().then(()=>{
        console.log("Database connected successfully");
    })

app.post("/register", (req, res)=>{
    const {username, id, password, email, role} = req.body;

    const insert_query = 'INSERT INTO auth (username, id, password, email, role) VALUES($1, $2, $3, $4, $5)';
    connection.query(insert_query, [username, id, password, email, role], (err, result)=>{
        if(err){
            res.send(err);
            console.log("Error occured");
            console.log(err);
        }
        else{
            res.send("Posted data");
        }
    })
})

app.listen(3000, ()=>{
    console.log("Server is running");
})





