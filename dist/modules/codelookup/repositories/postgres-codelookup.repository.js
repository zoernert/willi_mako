"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresCodeLookupRepository = void 0;
class PostgresCodeLookupRepository {
    constructor(pool) {
        this.pool = pool;
    }
    async searchCodes(query, filters) {
        const [bdewResults, eicResults] = await Promise.all([
            this.searchBDEWCodes(query),
            this.searchEICCodes(query)
        ]);
        // Kombiniere und sortiere die Ergebnisse
        const combinedResults = [...bdewResults, ...eicResults];
        // Sortiere nach Relevanz (exakte Matches zuerst, dann alphabetisch)
        return combinedResults.sort((a, b) => {
            const aExact = a.code.toLowerCase() === query.toLowerCase() ? 0 : 1;
            const bExact = b.code.toLowerCase() === query.toLowerCase() ? 0 : 1;
            if (aExact !== bExact) {
                return aExact - bExact;
            }
            return a.companyName.localeCompare(b.companyName);
        });
    }
    async searchBDEWCodes(query, filters) {
        const client = await this.pool.connect();
        try {
            // Bereite die Suchanfrage für PostgreSQL vor
            const searchQuery = query.trim().replace(/\s+/g, ' & ');
            const result = await client.query(`
        SELECT code, company_name, code_type, valid_from, valid_to
        FROM bdewcodes
        WHERE search_vector @@ to_tsquery('german', $1)
           OR code ILIKE $2
           OR company_name ILIKE $2
        ORDER BY 
          CASE WHEN code = $3 THEN 1
               WHEN code ILIKE $4 THEN 2
               WHEN company_name ILIKE $4 THEN 3
               ELSE 4
          END,
          company_name
        LIMIT 50
      `, [searchQuery, `%${query}%`, query, `${query}%`]);
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
    async searchEICCodes(query, filters) {
        const client = await this.pool.connect();
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
        LIMIT 50
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