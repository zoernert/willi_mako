import { Pool } from 'pg';

// Verwende dieselbe Konfiguration wie das bestehende Backend
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'willi_mako',
  user: process.env.DB_USER || 'willi_user',
  password: process.env.DB_PASSWORD || 'willi_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
