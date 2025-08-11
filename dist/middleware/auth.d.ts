import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.interface';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map