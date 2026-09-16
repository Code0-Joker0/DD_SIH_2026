import jwt from 'jsonwebtoken';
import {connection} from '../database.js';
import dotenv from "dotenv";

dotenv.config();

export const protect = async (req, res, next) =>{
    try{
        const token = req.cookies.token;

        if(!token){
            return res.status(401).json({
                message : "not authorised, no tokens"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await connection.query('SELECT username, email FROM auth WHERE username=$1', [decoded.username]);

        if(user.rows.length === 0){
            return res.status(401).json({
                message : "Not authorised, user not found"
            });
        }
        else{
            req.user = user.rows[0];
            next();
        }
    }
    catch(error){
        console.error(error);
        return res.status(401).json({
            message : "not authorized, token failed"
        });
    }
}