import {Client} from "pg";
import dotenv from "dotenv";

dotenv.config();

const HOST = process.env.HOST;

// if(!process.env.HOST){
//     throw new Error('Host is not defined')
// }

const PASSWORD = process.env.DP;
const DPORT = process.env.DPORT;
const USER = process.env.USER;
const DB = process.env.DB;

export const connection = new Client({
    host: HOST,
    user: USER,
    port: DPORT,
    password : PASSWORD,
    database : DB
    })


async function connectionPost() {
    await connection.connect();
    console.log("Database connected successfully");
}

export default connectionPost;

