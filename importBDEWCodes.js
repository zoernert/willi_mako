

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

// Konfiguration für den Datenbank-Pool aus den .env-Variablen
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const BDEW_URL = 'https://bdew-codes.de/Codenumbers/BDEWCodes/GetCompanyList?jtStartIndex=0&jtPageSize=8000';

// Die Header aus dem cURL-Befehl
const headers = {
  'accept': 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  'origin': 'https://bdew-codes.de',
  'referer': 'https://bdew-codes.de/Codenumbers/BDEWCodes/CodeOverview',
  'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  // Die Session-ID wird oft nicht benötigt oder muss dynamisch erzeugt werden.
  // Wir versuchen es zunächst ohne.
};

async function importBDEWCodes() {
  let client;
  try {
    console.log('Verbindung zur PostgreSQL-Datenbank wird hergestellt...');
    client = await pool.connect();
    console.log('Verbindung erfolgreich.');

    console.log('Tabelle "bdewcodes" wird gelöscht und neu erstellt...');
    // Tabelle löschen, falls sie existiert
    await client.query('DROP TABLE IF EXISTS bdewcodes;');

    // Tabelle neu erstellen. Die Spaltennamen basieren auf den erwarteten JSON-Feldern.
    // Wir fügen eine `search_vector` Spalte für die Volltextsuche hinzu.
    await client.query(`
      CREATE TABLE bdewcodes (
        id SERIAL PRIMARY KEY,
        code_id INT,
        code_type TEXT,
        code TEXT,
        company_name TEXT,
        company_type TEXT,
        valid_from TEXT,
        valid_to TEXT,
        search_vector TSVECTOR
      );
    `);
    console.log('Tabelle "bdewcodes" erfolgreich erstellt.');

    console.log('GIN-Index für die Volltextsuche wird erstellt...');
    // Index für die Volltextsuche erstellen
    await client.query(`
      CREATE INDEX bdewcodes_search_idx ON bdewcodes USING GIN(search_vector);
    `);
    console.log('Index erfolgreich erstellt.');

    // Trigger erstellen, der die `search_vector`-Spalte automatisch aktualisiert
    await client.query(`
      CREATE OR REPLACE FUNCTION bdewcodes_update_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := to_tsvector('german',
          coalesce(NEW.company_name, '') || ' ' ||
          coalesce(NEW.code, '') || ' ' ||
          coalesce(NEW.code_type, '')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER tsvectorupdate
      BEFORE INSERT OR UPDATE ON bdewcodes
      FOR EACH ROW EXECUTE FUNCTION bdewcodes_update_search_vector();
    `);
    console.log('Trigger für die automatische Index-Aktualisierung erstellt.');


    console.log('Rufe BDEW-Codeliste ab (kann einen Moment dauern)...');
    const response = await axios.post(BDEW_URL, null, { headers });

    if (response.data.Result !== 'OK' || !response.data.Records) {
      throw new Error('Die abgerufenen Daten sind nicht im erwarteten Format.');
    }

    const records = response.data.Records;
    console.log(`${records.length} Einträge erfolgreich abgerufen.`);

    console.log('Daten werden in die Datenbank importiert...');
    // Transaktion starten
    await client.query('BEGIN');

    for (const record of records) {
      console.log('Processing record:', JSON.stringify(record, null, 2));
      const query = {
        text: `
          INSERT INTO bdewcodes (code_id, code_type, code, company_name, company_type, valid_from, valid_to)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        values: [
          record.Id || record.CodeId,           // Verwende Id als code_id
          record.CodeType || 'BDEW',            // Default zu 'BDEW' wenn nicht vorhanden
          record.CompanyUId,                    // Der echte BDEW Code ist in CompanyUId
          record.Company || record.CompanyName, // Verwende Company als company_name
          record.CompanyType || null,           // Optional
          record.GueltigVon || null,            // Optional
          record.GueltigBis || null             // Optional
        ],
      };
      await client.query(query);
    }

    // Transaktion abschließen
    await client.query('COMMIT');
    console.log(`Erfolgreich ${records.length} Einträge in die Tabelle "bdewcodes" importiert.`);

  } catch (error) {
    console.error('Ein Fehler ist aufgetreten:', error.message);
    if (error.response) {
      console.error('Fehlerdetails:', error.response.data);
    }
    if (client) {
      // Bei einem Fehler die Transaktion zurückrollen
      await client.query('ROLLBACK');
      console.log('Transaktion wurde zurückgerollt.');
    }
    process.exit(1); // Skript mit Fehlercode beenden
  } finally {
    if (client) {
      client.release();
      console.log('Datenbankverbindung wurde freigegeben.');
    }
    await pool.end();
    console.log('Datenbank-Pool wurde geschlossen.');
  }
}

importBDEWCodes();

