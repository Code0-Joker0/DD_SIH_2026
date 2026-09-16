import jwt from 'jsonwebtoken';
import db from '../db/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'singularity-ai-enterprise-jwt-secret-key-2026';

/**
 * Express Middleware: Authenticate User via JWT
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied: Authentication token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Look up user from database
    const userResult = await db.query(
      'SELECT id, username, email, full_name, role, department, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token: User no longer exists'
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account suspended or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    return res.status(403).json({
      status: 'error',
      message: 'Invalid or expired authentication token'
    });
  }
};

/**
 * Optional Authentication: Attach user if valid token present, otherwise proceed as guest
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await db.query(
      'SELECT id, username, email, full_name, role, department, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].status === 'active') {
      req.user = userResult.rows[0];
    }
  } catch (err) {
    // Ignore invalid token in optional mode
  }
  next();
};

/**
 * Role-Based Access Control
 * @param  {...string} allowedRoles 
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`
      });
    }
    next();
  };
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET
};