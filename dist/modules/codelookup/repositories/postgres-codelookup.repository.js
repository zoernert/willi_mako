"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresCodeLookupRepository = void 0;
const market_role_util_1 = require("../utils/market-role.util");
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 2000;
class PostgresCodeLookupRepository {
    constructor(pool) {
        this.pool = pool;
    }
    async searchCodes(query, filters, options) {
        const requestedLimit = (options === null || options === void 0 ? void 0 : options.limit) && options.limit > 0 ? options.limit : DEFAULT_LIMIT;
        const effectiveLimit = Math.min(requestedLimit, MAX_LIMIT);
        const [bdewResults, eicResults] = await Promise.all([
            this.searchBDEWCodes(query, filters, { limit: effectiveLimit }),
            this.searchEICCodes(query, filters, { limit: effectiveLimit })
        ]);
        // Kombiniere und sortiere die Ergebnisse
        const combinedResults = [...bdewResults, ...eicResults];
        // Sortiere nach Relevanz (exakte Matches zuerst, dann alphabetisch)
        return combinedResults
            .sort((a, b) => {
            const aExact = a.code.toLowerCase() === query.toLowerCase() ? 0 : 1;
            const bExact = b.code.toLowerCase() === query.toLowerCase() ? 0 : 1;
            if (aExact !== bExact) {
                return aExact - bExact;
            }
            return a.companyName.localeCompare(b.companyName);
        })
            .slice(0, effectiveLimit);
    }
    async searchBDEWCodes(query, filters, options) {
        const client = await this.pool.connect();
        const requestedLimit = (options === null || options === void 0 ? void 0 : options.limit) && options.limit > 0 ? options.limit : DEFAULT_LIMIT;
        const effectiveLimit = Math.min(requestedLimit, MAX_LIMIT);
        try {
            // Bereite die Suchanfrage für PostgreSQL vor
            const searchQuery = query.trim().replace(/\s+/g, ' & ');
            // Build dynamic WHERE clause for filters
            let whereClause = `
        WHERE (search_vector @@ to_tsquery('german', $1)
           OR code ILIKE $2
           OR company_name ILIKE $2)
      `;
            const params = [searchQuery, `%${query}%`, query, `${query}%`];
            let paramIndex = 5; // Next available parameter index
            // Add marketRole filter if provided
            if (filters === null || filters === void 0 ? void 0 : filters.marketRole) {
                const roleVariants = (0, market_role_util_1.getMarketRoleVariants)(filters.marketRole);
                if (roleVariants.length > 0) {
                    whereClause += ` AND code_type ILIKE ANY($${paramIndex})`;
                    params.push(roleVariants.map(variant => `%${variant}%`));
                    paramIndex++;
                }
            }
            const result = await client.query(`
        SELECT code, company_name, code_type, valid_from, valid_to
        FROM bdewcodes
        ${whereClause}
        ORDER BY 
          CASE WHEN code = $3 THEN 1
               WHEN code ILIKE $4 THEN 2
               WHEN company_name ILIKE $4 THEN 3
               ELSE 4
          END,
          company_name
        LIMIT ${effectiveLimit}
      `, params);
            return result.rows.map(row => ({
                code: row.code,
                companyName: row.company_name,
                codeType: row.code_type,
                validFrom: row.valid_from,
                validTo: row.valid_to,
                source: 'bdew'
            }));
        }
        finally {
            client.release();
        }
    }
    async searchEICCodes(query, filters, options) {
        const client = await this.pool.connect();
        const requestedLimit = (options === null || options === void 0 ? void 0 : options.limit) && options.limit > 0 ? options.limit : DEFAULT_LIMIT;
        const effectiveLimit = Math.min(requestedLimit, MAX_LIMIT);
        try {
            // Bereite die Suchanfrage für PostgreSQL vor
            const searchQuery = query.trim().replace(/\s+/g, ' & ');
            const result = await client.query(`
        SELECT eic_code, eic_long_name, display_name, eic_type
        FROM eic
        WHERE search_vector @@ to_tsquery('german', $1)
           OR eic_code ILIKE $2
           OR eic_long_name ILIKE $2
           OR display_name ILIKE $2
        ORDER BY 
          CASE WHEN eic_code = $3 THEN 1
               WHEN eic_code ILIKE $4 THEN 2
               WHEN eic_long_name ILIKE $4 THEN 3
               WHEN display_name ILIKE $4 THEN 3
               ELSE 4
          END,
          COALESCE(display_name, eic_long_name)
        LIMIT ${effectiveLimit}
      `, [searchQuery, `%${query}%`, query, `${query}%`]);
            return result.rows.map(row => ({
                code: row.eic_code,
                companyName: row.display_name || row.eic_long_name,
                codeType: row.eic_type,
                source: 'eic'
            }));
        }
        finally {
            client.release();
        }
    }
    async getCodeDetails(code) {
        // Backward compatibility: return basic result
        const result = await this.searchCodes(code);
        if (result.length === 0) {
            return null;
        }
        const baseResult = result[0];
        return {
            ...baseResult,
            findings: [],
            allSoftwareSystems: []
        };
    }
    async getAvailableSoftwareSystems() {
        // PostgreSQL doesn't have software systems data
        return [];
    }
    async getAvailableCities() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT DISTINCT company_name as city
        FROM bdewcodes
        WHERE company_name IS NOT NULL
        ORDER BY company_name
        LIMIT 100
      `);
            return result.rows.map(row => row.city).filter(Boolean);
        }
        finally {
            client.release();
        }
    }
    async getAvailableCodeFunctions() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT DISTINCT code_type
        FROM bdewcodes
        WHERE code_type IS NOT NULL
        ORDER BY code_type
      `);
            return result.rows.map(row => row.code_type).filter(Boolean);
        }
        finally {
            client.release();
        }
    }
}
exports.PostgresCodeLookupRepository = PostgresCodeLookupRepository;
//# sourceMappingURL=postgres-codelookup.repository.js.map