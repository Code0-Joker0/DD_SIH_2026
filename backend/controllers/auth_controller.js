import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {connection} from '../database.js';
import { compare } from 'bcrypt';

dotenv.config();

const HOST = process.env.HOST;

// if(!process.env.HOST){
//     throw new Error('Host is not defined')
// }

const PASSWORD = process.env.DP;
const DPORT = process.env.DPORT;
const USER = process.env.USER;
const DB = process.env.DB;

const cookieOptions = {
    httpOnly : true, // cookie cannot be accessed by client on javascript
    secure : process.env.NODE_ENV === 'production',
    sameSite : 'Strict', // prevent csrf attacks
    maxAge : 30*24*60*60*1000
}

export async function register(req, res){
    const {username, id, password, email, role} = req.body;

    const existingUser = await connection.query(
        'SELECT 1 FROM auth WHERE username = $1',
        [username]
    );

    if(existingUser.rowCount > 0){
        return res.status(409).json({
            message: "User already exists"
        })
    }

    const hashed = crypto.createHash('sha256').update(password).digest("hex");

    
    await connection.query(
        'INSERT INTO auth(username, id, password, email, role) VALUES($1, $2, $3, $4, $5)',
        [username, id, hashed, email, role]
    );

    const token = jwt.sign({username}, process.env.JWT_SECRET);
    return res.status(201).json({
        message: "User registered successfully",
        user:{
            username,
            email,
            token
        },
        token
    })

    // app.post('/register', (req, res)=>{
    //     const {username, id, password, email, role} = req.body;

    //     const register_query = 'INSERT INTO auth(username, id, password, email, role) VALUES($1, $2, $3, $4, $5)';
    // connection.query(register_query, [username, id, hashed, email, role], (err, result)=>{
    //     if(err){
    //         console.log("Error occured");
    //         return res.send(err);
            
    //     }
    //     else{
    //         console.log(result);
    //         consolse.log("Data send succesfully");
    //         return res.send(result);
            
    //     }
    // })
    // })

}

export async function getMe(req, res){

    //const {username, id, password, email, role} = req.body;

    const token = req.headers.authorization?.split(" ")[1];
    
    if(!token){
        return res.status(401).json({
            message : "Token not found"
        })
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);

    const username = decoded;

    const user = await connection.query('SELECT 1 FROM auth WHERE username = $1', [username]);
    console.log(user.email);
    return res.status(200).json({
        user :{
            username : user.username,
            email: user.email,
        }
    })

    //res.cookie('token', token, cookieOptions)
}

export async function login(req, res){
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({
            message : "Please provide all the required fields"
        });
    }

    const user = await connection.query('SELECT * FROM auth WHERE email=$1', [email]);

    if(user.rows.length === 0){
        return res.status(400).json({
            message : "Invalid credentials"
        });
    }

    const userData = user.rows[0];
    const hashed = crypto.createHash('sha256').update(password).digest("hex");
    const isMatch = false;
    if(hashed === userData.password){
        isMatch = true;
    }

    if(!isMatch){
        return res.status(400).json({
            message : "Invalid credentials"
        });
    }

}

export async function logout(req, res){
    res.cookie('token', '', {...cookieOptions, maxage : 1});
    res.json({
        message : "Logged out successfully"
    });

    return ;
}

// export default register();