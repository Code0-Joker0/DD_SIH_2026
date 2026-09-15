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
 * Register a new enterprise user with 12-round bcrypt hash
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'employee', department = 'Engineering' } = req.body;

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

    // Check if user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An enterprise account with this email already exists'
      });
    }

    // Hash password with bcrypt (12 salt rounds)
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user into PostgreSQL
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, username, email, full_name, role, department, created_at`,
      [username.trim(), email.toLowerCase().trim(), password_hash, full_name.trim(), role, department]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'success',
      message: 'Enterprise account registered successfully',
      token,
      user: newUser
    });
  } catch (error) {
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
 * Authenticate with enterprise credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    const result = await db.query(
      'SELECT id, username, email, password_hash, full_name, role, department, status FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account is inactive or suspended'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
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
 * Quick 1-click SSO sign-in as default authorized enterprise engineer (Reva Kulkarni)
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
  return res.json({
    status: 'success',
    user: req.user
  });
});

export default router;