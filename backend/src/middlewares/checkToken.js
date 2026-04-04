import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { isTokenBlocked } from '../helpers/tokenBlocklist.js';

dotenv.config();

export const checkToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).send({ statusCode: 401, message: 'No token provided' });

    // ✅ Add this check
    if (isTokenBlocked(token)) {
        return res.status(401).send({ statusCode: 401, message: 'Token has been revoked' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.token = token; // ✅ Attach raw token so logout can read it
        next();
    } catch (err) {
        return res.status(401).send({ statusCode: 401, message: 'Invalid or expired token' });
    }
};