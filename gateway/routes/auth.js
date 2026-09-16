import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to generate JWT token with 7-day expiration
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      department: user.department
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/auth/register
 * Register a new enterprise user.
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'engineer', department = 'Engineering' } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields (username, email, password, full_name) are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if unique identity fields (email or username) already exist
    const existing = await db.query(
      'SELECT username, email FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2 LIMIT 1',
      [cleanEmail, cleanUsername]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      const isUsernameTaken = match.username.toLowerCase() === cleanUsername;
      const isEmailTaken = match.email.toLowerCase() === cleanEmail;

      if (isUsernameTaken && isEmailTaken) {
        return res.status(409).json({
          status: 'error',
          message: 'Both this Badge ID / Username and Email are already registered.'
        });
      } else if (isUsernameTaken) {
        return res.status(409).json({
          status: 'error',
          message: `Badge ID / Username "${username}" is already assigned to an engineer. Please use your unique badge number.`
        });
      } else {
        return res.status(409).json({
          status: 'error',
          message: `Email "${email}" is already registered. Please sign in instead.`
        });
      }
    }

    // 2. Hash password with bcrypt (12 salt rounds)
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Insert user into PostgreSQL
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, username, email, full_name, role, department, created_at`,
      [cleanUsername, cleanEmail, password_hash, full_name.trim(), role.trim(), department.trim()]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'success',
      message: 'Enterprise account registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        department: newUser.department
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      const field = error.constraint?.includes('username') ? 'Username / Badge ID' : 'Email address';
      return res.status(409).json({
        status: 'error',
        message: `${field} is already in use. Please enter a different one.`
      });
    }

    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with enterprise credentials (email or username)
 * Supports bcrypt hash matching, legacy direct matching, and auto-hash upgrades.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email/Username and password are required'
      });
    }

    // Lookup by either email or username
    const result = await db.query(
      `SELECT id, username, email, password_hash, full_name, role, department, status 
       FROM users 
       WHERE LOWER(email) = $1 OR LOWER(username) = $1
       LIMIT 1;`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    if (user.status && user.status.toLowerCase() !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account is inactive or suspended'
      });
    }

    let isMatch = false;

    // 1. Verify bcrypt hash ($2a$, $2b$, or $2y$)
    if (user.password_hash && /^\$2[aby]\$\d{2}\$/.test(user.password_hash)) {
      try {
        isMatch = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptErr) {
        console.warn('[AUTH BCRYPT WARNING]:', bcryptErr.message);
      }
    }

    // 2. Direct-match fallback (for test passwords or unhashed seeds)
    if (!isMatch && user.password_hash === password) {
      isMatch = true;
      try {
        const upgradedHash = await bcrypt.hash(password, 12);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgradedHash, user.id]);
        console.log(`✅ [AUTH] Auto-upgraded password hash to bcrypt for: ${user.email}`);
      } catch (upgradeErr) {
        console.warn('[AUTH HASH UPGRADE WARNING]:', upgradeErr.message);
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    return res.json({
      status: 'success',
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/demo-login
 * Quick 1-click sign-in for testing
 */
router.post('/demo-login', async (req, res) => {
  try {
    const defaultEmail = 'reva.kulkarni@singularity.local';
    let result = await db.query('SELECT * FROM users WHERE email = $1', [defaultEmail]);

    let user;
    if (result.rows.length === 0) {
      const hash = await bcrypt.hash('SingularityEnterprise2026!', 10);
      const inserted = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, department, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, username, email, full_name, role, department`,
        ['rkulkarni', defaultEmail, hash, 'Reva Kulkarni', 'engineer', 'Industrial Systems']
      );
      user = inserted.rows[0];
    } else {
      user = result.rows[0];
    }

    const token = generateToken(user);

    return res.json({
      status: 'success',
      message: 'Logged in as Enterprise Personnel',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Demo Login Error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * GET /api/auth/me
 * Current session user verification via JWT
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await db.query(
      'SELECT id, username, email, full_name, role, department, status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      status: 'success',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        status: user.status
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;