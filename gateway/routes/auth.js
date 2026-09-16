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
 * Register a new enterprise user.
 * Note: Multiple users CAN have the same role and department. Only email and username are unique.
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

    // 3. Insert user into PostgreSQL (role and department can be identical across users)
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
      user: newUser
    });
  } catch (error) {
    // Catch PostgreSQL code 23505 (unique_violation)
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

    const cleanEmail = email.toLowerCase().trim();

    const result = await db.query(
      'SELECT id, username, email, password_hash, full_name, role, department, status FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
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
 * Quick 1-click sign-in for dev testing
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