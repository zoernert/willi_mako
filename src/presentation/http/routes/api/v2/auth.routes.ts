import { Router, Response, Request } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../../../../config/database';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';

const router = Router();

const TOKEN_EXPIRY = process.env.API_V2_TOKEN_EXPIRES_IN || '30d';

router.post(
  '/token',
  apiV2RateLimiter({ capacity: 5, refillTokens: 5, intervalMs: 60_000 }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      throw new AppError('E-Mail und Passwort sind erforderlich', 400);
    }

    const client = await pool.connect();

    try {
      const userResult = await client.query(
        'SELECT id, email, password_hash, role FROM users WHERE email = $1',
        [String(email).toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('Ungültige E-Mail oder Passwort', 401);
      }

      const user = userResult.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        throw new AppError('Ungültige E-Mail oder Passwort', 401);
      }

      const secret = process.env.JWT_SECRET || 'fallback-secret';
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        secret,
        { expiresIn: TOKEN_EXPIRY } as jwt.SignOptions
      );

      const expiresAt = new Date(Date.now() + parseExpiryToMs(TOKEN_EXPIRY));

      res.json({
        success: true,
        data: {
          accessToken: token,
          expiresAt: expiresAt.toISOString()
        }
      });
    } finally {
      client.release();
    }
  })
);

function parseExpiryToMs(value: string): number {
  const match = /^([0-9]+)([smhdw])$/i.exec(value.trim());
  if (!match) {
    // default to 30d
    return 30 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    case 'w':
      return amount * 7 * 24 * 60 * 60 * 1000;
    default:
      return amount * 1000;
  }
}

export default router;
