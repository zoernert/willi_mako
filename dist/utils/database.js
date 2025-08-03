"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseHelper = void 0;
const database_1 = __importDefault(require("../config/database"));
class DatabaseHelper {
    static async executeQuery(sql, params = []) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows;
        }
        catch (error) {
            console.error('Database query failed:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async executeQuerySingle(sql, params = []) {
        const results = await this.executeQuery(sql, params);
        return results.length > 0 ? results[0] : null;
    }
    static async executeTransaction(operations) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const results = [];
            for (const operation of operations) {
                const result = await operation(client);
                results.push(result);
            }
            await client.query('COMMIT');
            return results;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction failed:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async exists(table, condition, params) {
        const sql = `SELECT 1 FROM ${table} WHERE ${condition} LIMIT 1`;
        const result = await this.executeQuery(sql, params);
        return result.length > 0;
    }
    static async count(table, condition, params = []) {
        const sql = condition
            ? `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`
            : `SELECT COUNT(*) as count FROM ${table}`;
        const result = await this.executeQuerySingle(sql, params);
        return result ? parseInt(result.count, 10) : 0;
    }
}
exports.DatabaseHelper = DatabaseHelper;
//# sourceMappingURL=database.js.map