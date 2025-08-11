"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresUserRepository = void 0;
const database_1 = require("../../../utils/database");
const password_1 = require("../../../utils/password");
const errors_1 = require("../../../utils/errors");
/**
 * PostgreSQL User Repository Implementation
 */
class PostgresUserRepository {
    async findById(id) {
        return database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    }
    async findByEmail(email) {
        return database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, name, role, created_at, updated_at FROM users WHERE email = $1', [email]);
    }
    async findAll(filters) {
        let query = 'SELECT id, email, name, role, created_at, updated_at FROM users';
        const params = [];
        const conditions = [];
        if (filters === null || filters === void 0 ? void 0 : filters.role) {
            conditions.push('role = $' + (params.length + 1));
            params.push(filters.role);
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.active) !== undefined) {
            conditions.push('active = $' + (params.length + 1));
            params.push(filters.active);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';
        return database_1.DatabaseHelper.executeQuery(query, params);
    }
    async create(userData) {
        // Check if user already exists
        const existingUser = await this.findByEmail(userData.email);
        if (existingUser) {
            throw new errors_1.ConflictError('User with this email already exists');
        }
        // Hash password
        const hashedPassword = await password_1.PasswordUtils.hash(userData.password);
        // Create user
        const user = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at, updated_at`, [userData.email, hashedPassword, userData.name, userData.role || 'user']);
        if (!user) {
            throw new Error('Failed to create user');
        }
        return user;
    }
    async update(id, updates) {
        const user = await this.findById(id);
        if (!user) {
            throw new errors_1.NotFoundError('User');
        }
        const updateFields = [];
        const params = [];
        let paramCount = 1;
        if (updates.name !== undefined) {
            updateFields.push(`name = $${paramCount++}`);
            params.push(updates.name);
        }
        if (updates.email !== undefined) {
            updateFields.push(`email = $${paramCount++}`);
            params.push(updates.email);
        }
        if (updates.role !== undefined) {
            updateFields.push(`role = $${paramCount++}`);
            params.push(updates.role);
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, created_at, updated_at
    `;
        const updatedUser = await database_1.DatabaseHelper.executeQuerySingle(query, params);
        if (!updatedUser) {
            throw new Error('Failed to update user');
        }
        return updatedUser;
    }
    async delete(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new errors_1.NotFoundError('User');
        }
        await database_1.DatabaseHelper.executeQuery('DELETE FROM users WHERE id = $1', [id]);
    }
    async findUserWithPassword(email) {
        return database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, name, role, password_hash, created_at, updated_at FROM users WHERE email = $1', [email]);
    }
    async updateLastLogin(id) {
        await database_1.DatabaseHelper.executeQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }
    async findProfile(userId) {
        return database_1.DatabaseHelper.executeQuerySingle('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    }
    async createProfile(profile) {
        const createdProfile = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO user_profiles (user_id, preferences, expertise_areas, learning_goals, performance_metrics)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            profile.user_id,
            JSON.stringify(profile.preferences),
            JSON.stringify(profile.expertise_areas),
            JSON.stringify(profile.learning_goals),
            JSON.stringify(profile.performance_metrics)
        ]);
        if (!createdProfile) {
            throw new Error('Failed to create user profile');
        }
        return createdProfile;
    }
    async updateProfile(userId, updates) {
        const updateFields = [];
        const params = [];
        let paramCount = 1;
        if (updates.preferences !== undefined) {
            updateFields.push(`preferences = $${paramCount++}`);
            params.push(JSON.stringify(updates.preferences));
        }
        if (updates.expertise_areas !== undefined) {
            updateFields.push(`expertise_areas = $${paramCount++}`);
            params.push(JSON.stringify(updates.expertise_areas));
        }
        if (updates.learning_goals !== undefined) {
            updateFields.push(`learning_goals = $${paramCount++}`);
            params.push(JSON.stringify(updates.learning_goals));
        }
        if (updates.performance_metrics !== undefined) {
            updateFields.push(`performance_metrics = $${paramCount++}`);
            params.push(JSON.stringify(updates.performance_metrics));
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(userId);
        const query = `
      UPDATE user_profiles 
      SET ${updateFields.join(', ')} 
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
        const updatedProfile = await database_1.DatabaseHelper.executeQuerySingle(query, params);
        if (!updatedProfile) {
            throw new errors_1.NotFoundError('User Profile');
        }
        return updatedProfile;
    }
    async getUserStats(userId) {
        const stats = await database_1.DatabaseHelper.executeQuerySingle(`SELECT 
        COALESCE(quiz_stats.total_quizzes, 0) as total_quizzes_completed,
        COALESCE(doc_stats.total_documents, 0) as total_documents_uploaded,
        COALESCE(note_stats.total_notes, 0) as total_notes_created,
        COALESCE(quiz_stats.average_score, 0) as average_quiz_score,
        users.last_login
       FROM users
       LEFT JOIN (
         SELECT user_id, COUNT(*) as total_quizzes, AVG(score) as average_score
         FROM user_quiz_attempts 
         WHERE user_id = $1 
         GROUP BY user_id
       ) quiz_stats ON users.id = quiz_stats.user_id
       LEFT JOIN (
         SELECT user_id, COUNT(*) as total_documents
         FROM user_documents 
         WHERE user_id = $1 
         GROUP BY user_id
       ) doc_stats ON users.id = doc_stats.user_id
       LEFT JOIN (
         SELECT user_id, COUNT(*) as total_notes
         FROM user_notes 
         WHERE user_id = $1 
         GROUP BY user_id
       ) note_stats ON users.id = note_stats.user_id
       WHERE users.id = $1`, [userId]);
        if (!stats) {
            throw new errors_1.NotFoundError('User stats');
        }
        return {
            total_quizzes_completed: stats.total_quizzes_completed || 0,
            total_documents_uploaded: stats.total_documents_uploaded || 0,
            total_notes_created: stats.total_notes_created || 0,
            average_quiz_score: stats.average_quiz_score || 0,
            last_login: stats.last_login
        };
    }
    async exists(id) {
        return database_1.DatabaseHelper.exists('users', 'id = $1', [id]);
    }
    async existsByEmail(email) {
        return database_1.DatabaseHelper.exists('users', 'email = $1', [email]);
    }
    async count(filters) {
        let condition = '';
        const params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.role) {
            condition = 'role = $1';
            params.push(filters.role);
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.active) !== undefined) {
            condition = condition ? `${condition} AND active = $${params.length + 1}` : 'active = $1';
            params.push(filters.active);
        }
        return database_1.DatabaseHelper.count('users', condition, params);
    }
}
exports.PostgresUserRepository = PostgresUserRepository;
//# sourceMappingURL=postgres-user.repository.js.map