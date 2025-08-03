import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';
export declare class UserController {
    private userService;
    registerUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    loginUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserProfile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateUserProfile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getUserPreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateUserPreferences: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=user.controller.backup.d.ts.map