"use strict";
// Simplified Express Router für Bilaterale Klärfälle API
// Temporary fix to get the server running
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
// Simple GET endpoint that should work
router.get('/', async (req, res) => {
    try {
        // Simple query to test database connection
        const result = await database_1.default.query('SELECT NOW() as current_time');
        // Return the structure the frontend expects
        res.json({
            clarifications: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            },
            summary: {
                totalOpen: 0,
                totalInProgress: 0,
                totalResolved: 0,
                totalClosed: 0,
                overdueCases: 0,
                highPriorityCases: 0
            }
        });
    }
    catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Klärfälle',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Simple POST endpoint
router.post('/', async (req, res) => {
    try {
        res.json({
            message: 'POST endpoint working',
            received: req.body
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Fehler beim Erstellen',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=bilateral-clarifications-simple.js.map