import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const checkToken = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).send({ message: 'Unauthorized' });
    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send({ statusCode: 401, message: 'Invalid token' });
    }
};

export { checkToken };