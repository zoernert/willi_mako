"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
// Verwende dieselbe Konfiguration wie das bestehende Backend
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'willi_mako',
    user: process.env.DB_USER || 'willi_user',
    password: process.env.DB_PASSWORD || 'willi_password',
    // SSL für remote PostgreSQL deaktiviert, da Server kein SSL unterstützt
    ssl: false,
});
exports.default = pool;
//# sourceMappingURL=database.js.map