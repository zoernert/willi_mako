"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errors_1.AppError('E-Mail und Passwort sind erforderlich', 400);
    }
    const client = await database_1.default.connect();
    try {
        const userResult = await client.query('SELECT id, email, password_hash, name, full_name, role FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            throw new errors_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        const user = userResult.rows[0];
        const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!passwordMatch) {
            throw new errors_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        response_1.ResponseUtils.success(res, {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                full_name: user.full_name,
                role: user.role
            },
            token
        }, 'Erfolgreich angemeldet');
    }
    finally {
        client.release();
    }
}));
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name, company } = req.body;
    if (!email || !password || !name) {
        throw new errors_1.AppError('E-Mail, Passwort und Name sind erforderlich', 400);
    }
    if (password.length < 6) {
        throw new errors_1.AppError('Passwort muss mindestens 6 Zeichen lang sein', 400);
    }
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            throw new errors_1.AppError('Benutzer mit dieser E-Mail existiert bereits', 409);
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const userResult = await client.query(`INSERT INTO users (id, email, password_hash, name, full_name, company, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, full_name, role`, [(0, uuid_1.v4)(), email.toLowerCase(), hashedPassword, name, name, company || null]);
        const user = userResult.rows[0];
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        await client.query('COMMIT');
        response_1.ResponseUtils.success(res, {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                full_name: user.full_name,
                role: user.role
            },
            token
        }, 'Registrierung erfolgreich');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}));
router.get('/profile', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const client = await database_1.default.connect();
    try {
        const userResult = await client.query('SELECT id, email, name, full_name, company, role FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new errors_1.AppError('Benutzer nicht gefunden', 404);
        }
        const user = userResult.rows[0];
        response_1.ResponseUtils.success(res, {
            id: user.id,
            email: user.email,
            name: user.name,
            full_name: user.full_name,
            company: user.company,
            role: user.role
        }, 'Profil erfolgreich abgerufen');
    }
    finally {
        client.release();
    }
}));
router.post('/forgot-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new errors_1.AppError('E-Mail ist erforderlich', 400);
    }
    const client = await database_1.default.connect();
    try {
        const userResult = await client.query('SELECT id, email, name FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            response_1.ResponseUtils.success(res, {}, 'Falls diese E-Mail-Adresse registriert ist, wurde ein Passwort-Reset-Link gesendet');
            return;
        }
        const user = userResult.rows[0];
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await client.query(`INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
       token = $1, expires_at = $3, created_at = CURRENT_TIMESTAMP`, [resetToken, user.id, expiresAt]);
        await emailService_1.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
        response_1.ResponseUtils.success(res, {}, 'Falls diese E-Mail-Adresse registriert ist, wurde ein Passwort-Reset-Link gesendet');
    }
    finally {
        client.release();
    }
}));
router.post('/reset-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        throw new errors_1.AppError('Token und neues Passwort sind erforderlich', 400);
    }
    if (newPassword.length < 6) {
        throw new errors_1.AppError('Passwort muss mindestens 6 Zeichen lang sein', 400);
    }
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const tokenResult = await client.query(`SELECT prt.user_id, u.email, u.name 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP`, [token]);
        if (tokenResult.rows.length === 0) {
            throw new errors_1.AppError('Ungültiger oder abgelaufener Reset-Token', 400);
        }
        const { user_id, email, name } = tokenResult.rows[0];
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, user_id]);
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id]);
        await client.query('COMMIT');
        response_1.ResponseUtils.success(res, {}, 'Passwort erfolgreich zurückgesetzt');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}));
router.get('/validate-reset-token/:token', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    const client = await database_1.default.connect();
    try {
        const tokenResult = await client.query(`SELECT u.email, u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP`, [token]);
        if (tokenResult.rows.length === 0) {
            throw new errors_1.AppError('Ungültiger oder abgelaufener Reset-Token', 400);
        }
        const { email, name } = tokenResult.rows[0];
        response_1.ResponseUtils.success(res, {
            email,
            name,
            valid: true
        }, 'Token ist gültig');
    }
    finally {
        client.release();
    }
}));
exports.default = router;
//# sourceMappingURL=auth.js.map