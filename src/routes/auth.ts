import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import pool from '../config/database';

const router = Router();

// Register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, company } = req.body;

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400);
  }

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('User already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const newUser = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
    [email, hashedPassword, name]
  );

  // Generate JWT token
  const payload = { 
    id: newUser.rows[0].id, 
    email: newUser.rows[0].email, 
    role: newUser.rows[0].role 
  };
  const secret = process.env.JWT_SECRET as string;
  
  const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any);

  res.status(201).json({
    success: true,
    data: {
      user: newUser.rows[0],
      token
    }
  });
}));

// Login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Get user
  const user = await pool.query(
    'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
    [email]
  );

  if (user.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.rows[0].password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT token
  const payload = { 
    id: user.rows[0].id, 
    email: user.rows[0].email, 
    role: user.rows[0].role 
  };
  const secret = process.env.JWT_SECRET as string;
  
  const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any);

  // Remove password from response
  const { password_hash, ...userWithoutPassword } = user.rows[0];

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token
    }
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token is required', 400);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get fresh user data
    const user = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (user.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Generate new token
    const payload = { 
      id: user.rows[0].id, 
      email: user.rows[0].email, 
      role: user.rows[0].role 
    };
    const secret = process.env.JWT_SECRET as string;
    
    const newToken = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any);

    res.json({
      success: true,
      data: {
        user: user.rows[0],
        token: newToken
      }
    });
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
}));

// Password reset (simplified - would need email service in production)
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    throw new AppError('Email and new password are required', 400);
  }

  // Check if user exists
  const user = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (user.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
    [hashedPassword, email]
  );

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

export default router;
