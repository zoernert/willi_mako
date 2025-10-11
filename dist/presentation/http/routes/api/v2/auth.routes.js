"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../../../../../config/database"));
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const router = (0, express_1.Router)();
const TOKEN_EXPIRY = process.env.API_V2_TOKEN_EXPIRES_IN || '30d';
router.post('/token', (0, rateLimiter_1.apiV2RateLimiter)({ capacity: 5, refillTokens: 5, intervalMs: 60000 }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        throw new errorHandler_1.AppError('E-Mail und Passwort sind erforderlich', 400);
    }
    const client = await database_1.default.connect();
    try {
        const userResult = await client.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [String(email).toLowerCase()]);
        if (userResult.rows.length === 0) {
            throw new errorHandler_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        const user = userResult.rows[0];
        const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!passwordMatch) {
            throw new errorHandler_1.AppError('Ungültige E-Mail oder Passwort', 401);
        }
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, secret, { expiresIn: TOKEN_EXPIRY });
        const expiresAt = new Date(Date.now() + parseExpiryToMs(TOKEN_EXPIRY));
        res.json({
            success: true,
            data: {
                accessToken: token,
                expiresAt: expiresAt.toISOString()
            }
        });
    }
    finally {
        client.release();
    }
}));
function parseExpiryToMs(value) {
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
exports.default = router;
//# sourceMappingURL=auth.routes.js.map