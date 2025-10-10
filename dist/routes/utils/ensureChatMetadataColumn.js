"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureChatMetadataColumn = void 0;
const database_1 = __importDefault(require("../../config/database"));
let ensureMetadataColumnPromise = null;
let metadataColumnAvailable = false;
const ensureChatMetadataColumn = async () => {
    if (metadataColumnAvailable) {
        return;
    }
    if (!ensureMetadataColumnPromise) {
        ensureMetadataColumnPromise = (async () => {
            const result = await database_1.default.query(`SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'chats'
           AND column_name = 'metadata'`);
            if (result.rowCount === 0) {
                await database_1.default.query("ALTER TABLE chats ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb");
                await database_1.default.query("UPDATE chats SET metadata = '{}'::jsonb WHERE metadata IS NULL");
            }
            metadataColumnAvailable = true;
        })().catch((error) => {
            ensureMetadataColumnPromise = null;
            console.error('Failed to ensure chats.metadata column exists:', error);
            throw error;
        });
    }
    return ensureMetadataColumnPromise;
};
exports.ensureChatMetadataColumn = ensureChatMetadataColumn;
//# sourceMappingURL=ensureChatMetadataColumn.js.map