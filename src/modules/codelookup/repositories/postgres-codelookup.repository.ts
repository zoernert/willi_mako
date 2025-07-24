import { Pool } from 'pg';
import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult, BDEWCode, EICCode } from '../interfaces/codelookup.interface';

export class PostgresCodeLookupRepository implements CodeLookupRepository {
  constructor(private pool: Pool) {}

  async searchCodes(query: string): Promise<CodeSearchResult[]> {
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

  async searchBDEWCodes(query: string): Promise<CodeSearchResult[]> {
    const client = await this.pool.connect();
    
    try {
      // Bereite die Suchanfrage für PostgreSQL vor
      const searchQuery = query.trim().replace(/\s+/g, ' & ');
      
      const result = await client.query<BDEWCode>(`
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
        source: 'bdew' as const
      }));
    } finally {
      client.release();
    }
  }

  async searchEICCodes(query: string): Promise<CodeSearchResult[]> {
    const client = await this.pool.connect();
    
    try {
      // Bereite die Suchanfrage für PostgreSQL vor
      const searchQuery = query.trim().replace(/\s+/g, ' & ');
      
      const result = await client.query<EICCode>(`
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
        source: 'eic' as const
      }));
    } finally {
      client.release();
    }
  }
}
