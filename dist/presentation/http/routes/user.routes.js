"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../../../middleware/auth");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// Authentication routes (public)
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
// Protected user profile routes
router.get('/profile', auth_1.authenticateToken, userController.getUserProfile);
router.put('/profile', auth_1.authenticateToken, userController.updateUserProfile);
router.get('/preferences', auth_1.authenticateToken, userController.getUserPreferences);
router.put('/preferences', auth_1.authenticateToken, userController.updateUserPreferences);
// Flip Mode Preferences
router.get('/flip-mode-preferences', auth_1.authenticateToken, userController.getFlipModePreferences);
router.put('/flip-mode-preferences', auth_1.authenticateToken, userController.updateFlipModePreferences);
// User statistics
router.get('/stats', auth_1.authenticateToken, userController.getUserStats);
// User AI key management
router.get('/ai-key/status', auth_1.authenticateToken, userController.getUserAIKeyStatus);
router.put('/ai-key', auth_1.authenticateToken, userController.setUserAIKey);
router.delete('/ai-key', auth_1.authenticateToken, userController.deleteUserAIKey);
exports.default = router;
//# sourceMappingURL=user.routes.js.map