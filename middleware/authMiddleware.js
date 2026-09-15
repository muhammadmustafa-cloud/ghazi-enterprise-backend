import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [users] = await db.execute('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
      if (users.length === 0) return res.status(401).json({ message: 'User not found' });
      req.user = users[0];
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin only' });
  }
};
