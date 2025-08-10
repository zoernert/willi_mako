import express from 'express';
import { Pool } from 'pg';
declare const router: import("express-serve-static-core").Router;
/**
 * Initialize community admin routes with database pool
 */
export declare const initializeCommunityAdminRoutes: (db: Pool) => express.Router;
export default router;
//# sourceMappingURL=community.d.ts.map