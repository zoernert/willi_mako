import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/errors';
import { ResponseUtils } from '../utils/response';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';

const router = Router();

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('E-Mail und Passwort sind erforderlich', 400);
  }

  const client = await pool.connect();
  
  try {
    // Find user by email
    const userResult = await client.query(
      'SELECT id, email, password_hash, name, full_name, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Ungültige E-Mail oder Passwort', 401);
    }

    const user = userResult.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Ungültige E-Mail oder Passwort', 401);
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } as any, 
      secret, 
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    // Return user data and token
    ResponseUtils.success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        full_name: user.full_name,
        role: user.role
      },
      token
    }, 'Erfolgreich angemeldet');

  } finally {
    client.release();
  }
}));

// Register endpoint
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, company } = req.body;

  if (!email || !password || !name) {
    throw new AppError('E-Mail, Passwort und Name sind erforderlich', 400);
  }

  if (password.length < 6) {
    throw new AppError('Passwort muss mindestens 6 Zeichen lang sein', 400);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Benutzer mit dieser E-Mail existiert bereits', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (id, email, password_hash, name, full_name, company, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, full_name, role`,
      [uuidv4(), email.toLowerCase(), hashedPassword, name, name, company || null]
    );

    const user = userResult.rows[0];

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } as any, 
      secret, 
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    await client.query('COMMIT');

    // Return user data and token
    ResponseUtils.success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        full_name: user.full_name,
        role: user.role
      },
      token
    }, 'Registrierung erfolgreich');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// User profile endpoint (used by frontend for token verification)
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const client = await pool.connect();
  
  try {
    const userResult = await client.query(
      'SELECT id, email, name, full_name, company, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Benutzer nicht gefunden', 404);
    }

    const user = userResult.rows[0];

    ResponseUtils.success(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      full_name: user.full_name,
      company: user.company,
      role: user.role
    }, 'Profil erfolgreich abgerufen');

  } finally {
    client.release();
  }
}));

// Password reset request endpoint
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('E-Mail ist erforderlich', 400);
  }

  const client = await pool.connect();
  
  try {
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration attacks
    if (userResult.rows.length === 0) {
      ResponseUtils.success(res, {}, 'Falls diese E-Mail-Adresse registriert ist, wurde ein Passwort-Reset-Link gesendet');
      return;
    }

    const user = userResult.rows[0];

    // Generate password reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await client.query(
      `INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
       token = $1, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [resetToken, user.id, expiresAt]
    );

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    ResponseUtils.success(res, {}, 'Falls diese E-Mail-Adresse registriert ist, wurde ein Passwort-Reset-Link gesendet');

  } finally {
    client.release();
  }
}));

// Password reset confirmation endpoint
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Token und neues Passwort sind erforderlich', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Passwort muss mindestens 6 Zeichen lang sein', 400);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Find and validate reset token
    const tokenResult = await client.query(
      `SELECT prt.user_id, u.email, u.name 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new AppError('Ungültiger oder abgelaufener Reset-Token', 400);
    }

    const { user_id, email, name } = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user_id]
    );

    // Delete used reset token
    await client.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user_id]
    );

    await client.query('COMMIT');

    ResponseUtils.success(res, {}, 'Passwort erfolgreich zurückgesetzt');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Validate reset token endpoint (for frontend to check if token is valid)
router.get('/validate-reset-token/:token', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const client = await pool.connect();
  
  try {
    const tokenResult = await client.query(
      `SELECT u.email, u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new AppError('Ungültiger oder abgelaufener Reset-Token', 400);
    }

    const { email, name } = tokenResult.rows[0];

    ResponseUtils.success(res, {
      email,
      name,
      valid: true
    }, 'Token ist gültig');

  } finally {
    client.release();
  }
}));

export default router;
