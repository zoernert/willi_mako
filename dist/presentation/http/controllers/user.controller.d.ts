import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';
export declare class UserController {
    registerUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    loginUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserProfile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateUserProfile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getUserPreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateUserPreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getFlipModePreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateFlipModePreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getUserStats: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=user.controller.d.ts.map