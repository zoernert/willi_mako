"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../../../modules/user/user.service");
const response_1 = require("../../../utils/response");
class UserController {
    constructor() {
        this.userService = new user_service_1.UserService();
        this.registerUser = async (req, res, next) => {
            try {
                const userData = req.body;
                const user = await this.userService.registerUser(userData);
                response_1.ResponseUtils.success(res, user, 'User registered successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.loginUser = async (req, res, next) => {
            try {
                const loginData = req.body;
                const result = await this.userService.loginUser(loginData);
                response_1.ResponseUtils.success(res, result, 'Login successful');
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserProfile = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const user = await this.userService.getUserProfile(userId);
                response_1.ResponseUtils.success(res, user);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateUserProfile = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { name, company } = req.body;
                const user = await this.userService.updateUser(userId, name, company);
                response_1.ResponseUtils.success(res, user);
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserPreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = await this.userService.getUserPreferences(userId);
                response_1.ResponseUtils.success(res, preferences);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateUserPreferences = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const preferences = req.body;
                const updatedPreferences = await this.userService.updateUserPreferences(userId, preferences);
                response_1.ResponseUtils.success(res, updatedPreferences);
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.backup.js.map