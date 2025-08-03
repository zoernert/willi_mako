"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const faq_1 = __importDefault(require("./routes/faq"));
const workspace_1 = __importDefault(require("./routes/workspace"));
const notes_1 = __importDefault(require("./routes/notes"));
const documents_1 = __importDefault(require("./routes/documents"));
const admin_1 = __importDefault(require("./routes/admin"));
const message_analyzer_1 = require("./routes/message-analyzer");
const codes_1 = __importDefault(require("./routes/codes"));
const teams_1 = require("./routes/teams");
const user_routes_1 = __importDefault(require("./presentation/http/routes/user.routes"));
const quiz_routes_1 = __importDefault(require("./presentation/http/routes/quiz.routes"));
const quiz_routes_2 = __importDefault(require("./presentation/http/routes/admin/quiz.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
});
app.use('/api/', limiter);
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/chat', (req, res, next) => {
    req.setTimeout(45000);
    res.setTimeout(45000);
    next();
});
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.default);
app.use('/api/v2/user', user_routes_1.default);
app.use('/api/v2/quiz', quiz_routes_1.default);
app.use('/api/admin/quizzes', quiz_routes_2.default);
app.use('/api/admin', admin_1.default);
app.use('/api/teams', teams_1.teamRoutes);
app.use('/api/chat', auth_2.authenticateToken, chat_1.default);
app.use('/api', faq_1.default);
app.use('/api/workspace', workspace_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/message-analyzer', auth_2.authenticateToken, message_analyzer_1.messageAnalyzerRoutes);
app.use('/api/v1/codes', auth_2.authenticateToken, codes_1.default);
const clientBuildPath = path_1.default.join(__dirname, '../client/build');
app.use(express_1.default.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map