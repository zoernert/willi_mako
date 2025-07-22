import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();
const userController = new UserController();

// Authentication routes (public)
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected user profile routes
router.get('/profile', authenticateToken, userController.getUserProfile);
router.put('/profile', authenticateToken, userController.updateUserProfile);

router.get('/preferences', authenticateToken, userController.getUserPreferences);
router.put('/preferences', authenticateToken, userController.updateUserPreferences);

export default router;
