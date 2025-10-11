"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureChatColumns = void 0;
const database_1 = __importDefault(require("../../config/database"));
let ensureColumnsPromise = null;
let columnsEnsured = false;
const columnDefinitions = [
    {
        name: 'metadata',
        createStatement: "ALTER TABLE chats ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb",
        postCreateStatement: "UPDATE chats SET metadata = '{}'::jsonb WHERE metadata IS NULL",
    },
    {
        name: 'is_active',
        createStatement: 'ALTER TABLE chats ADD COLUMN is_active BOOLEAN DEFAULT true',
        postCreateStatement: 'UPDATE chats SET is_active = true WHERE is_active IS NULL',
    },
];
const ensureChatColumns = async () => {
    if (columnsEnsured) {
        return;
    }
    if (!ensureColumnsPromise) {
        ensureColumnsPromise = (async () => {
            for (const column of columnDefinitions) {
                const result = await database_1.default.query(`SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'chats'
             AND column_name = $1`, [column.name]);
                if (result.rowCount === 0) {
                    await database_1.default.query(column.createStatement);
                    if (column.postCreateStatement) {
                        await database_1.default.query(column.postCreateStatement);
                    }
                }
            }
            columnsEnsured = true;
        })().catch((error) => {
            ensureColumnsPromise = null;
            console.error('Failed to ensure chats table columns:', error);
            throw error;
        });
    }
    return ensureColumnsPromise;
};
exports.ensureChatColumns = ensureChatColumns;
//# sourceMappingURL=ensureChatColumns.js.map