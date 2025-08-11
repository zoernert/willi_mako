"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name, company } = req.body;
    if (!email || !password || !name) {
        throw new errorHandler_1.AppError('Email, password, and name are required', 400);
    }
    const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
        throw new errorHandler_1.AppError('User already exists', 409);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    const newUser = await database_1.default.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role', [email, hashedPassword, name]);
    const payload = {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        role: newUser.rows[0].role
    };
    const secret = process.env.JWT_SECRET;
    const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    res.status(201).json({
        success: true,
        data: {
            user: newUser.rows[0],
            token
        }
    });
}));
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errorHandler_1.AppError('Email and password are required', 400);
    }
    const user = await database_1.default.query('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.rows[0].password_hash);
    if (!isPasswordValid) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    const payload = {
        id: user.rows[0].id,
        email: user.rows[0].email,
        role: user.rows[0].role
    };
    const secret = process.env.JWT_SECRET;
    const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    const { password_hash, ...userWithoutPassword } = user.rows[0];
    res.json({
        success: true,
        data: {
            user: userWithoutPassword,
            token
        }
    });
}));
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        throw new errorHandler_1.AppError('Token is required', 400);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await database_1.default.query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.id]);
        if (user.rows.length === 0) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        const payload = {
            id: user.rows[0].id,
            email: user.rows[0].email,
            role: user.rows[0].role
        };
        const secret = process.env.JWT_SECRET;
        const newToken = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.json({
            success: true,
            data: {
                user: user.rows[0],
                token: newToken
            }
        });
    }
    catch (error) {
        throw new errorHandler_1.AppError('Invalid token', 401);
    }
}));
router.post('/reset-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        throw new errorHandler_1.AppError('Email and new password are required', 400);
    }
    const user = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
    await database_1.default.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2', [hashedPassword, email]);
    res.json({
        success: true,
        message: 'Password reset successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map