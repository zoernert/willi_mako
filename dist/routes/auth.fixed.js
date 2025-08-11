"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// Login endpoint
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errors_1.AppError('E-Mail und Passwort sind erforderlich', 400);
    }
    const client = await database_1.default.connect();
    try {
        // Find user by email
        const userResult = await client.query('SELECT id, email, password_hash, name, full_name, role FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            throw new errors_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        const user = userResult.rows[0];
        // Check password
        const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!passwordMatch) {
            throw new errors_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        // Return user data and token
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
// Register endpoint
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
        // Check if user already exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            throw new errors_1.AppError('Benutzer mit dieser E-Mail existiert bereits', 409);
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create user
        const userResult = await client.query(`INSERT INTO users (id, email, password_hash, name, full_name, company, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, full_name, role`, [(0, uuid_1.v4)(), email.toLowerCase(), hashedPassword, name, name, company || null]);
        const user = userResult.rows[0];
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        await client.query('COMMIT');
        // Return user data and token
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
exports.default = router;
//# sourceMappingURL=auth.fixed.js.map