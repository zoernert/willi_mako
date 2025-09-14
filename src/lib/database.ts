import { Pool } from 'pg';

// Skip DB usage during Next.js static build to prevent hangs
const SKIP_DB = process.env.NEXT_SKIP_DB === '1' || process.env.SKIP_DB_IN_BUILD === '1';

let pool: any;

if (SKIP_DB) {
  pool = {
    query: async () => {
      throw new Error('DB access skipped during Next build (NEXT_SKIP_DB=1)');
    },
  } as any;
} else {
  // Verwende dieselbe Konfiguration wie das bestehende Backend, mit kurzen Timeouts
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'willi_mako',
    user: process.env.DB_USER || 'willi_user',
    password: process.env.DB_PASSWORD || 'willi_password',
    // SSL für remote PostgreSQL deaktiviert, da Server kein SSL unterstützt
    ssl: false,
    // Short timeouts to avoid long hangs if DB is unreachable
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000,
    max: 2,
  });
}

export default pool;
