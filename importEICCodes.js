

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Konfiguration für den Datenbank-Pool aus den .env-Variablen
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const EIC_CSV_URL = 'https://bdew-codes.de/Codenumbers/EnergyIdentificationCode/DownloadEicCsv';

async function importEICCodes() {
  let client;
  try {
    console.log('Verbindung zur PostgreSQL-Datenbank wird hergestellt...');
    client = await pool.connect();
    console.log('Verbindung erfolgreich.');

    console.log('Tabelle "eic" wird gelöscht und neu erstellt...');
    // Tabelle löschen, falls sie existiert
    await client.query('DROP TABLE IF EXISTS eic;');

    // Tabelle neu erstellen. Die Spaltennamen basieren auf den erwarteten CSV-Feldern.
    // Wir fügen eine `search_vector` Spalte für die Volltextsuche hinzu.
    await client.query(`
      CREATE TABLE eic (
        id SERIAL PRIMARY KEY,
        eic_code TEXT,
        eic_long_name TEXT,
        display_name TEXT,
        eic_responsible_user TEXT,
        eic_type TEXT,
        search_vector TSVECTOR
      );
    `);
    console.log('Tabelle "eic" erfolgreich erstellt.');

    console.log('GIN-Index für die Volltextsuche wird erstellt...');
    // Index für die Volltextsuche erstellen
    await client.query(`
      CREATE INDEX eic_search_idx ON eic USING GIN(search_vector);
    `);
    console.log('Index erfolgreich erstellt.');

    // Trigger erstellen, der die `search_vector`-Spalte automatisch aktualisiert
    await client.query(`
      CREATE OR REPLACE FUNCTION eic_update_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := to_tsvector('german',
          coalesce(NEW.eic_code, '') || ' ' ||
          coalesce(NEW.eic_long_name, '') || ' ' ||
          coalesce(NEW.display_name, '')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER tsvectorupdate
      BEFORE INSERT OR UPDATE ON eic
      FOR EACH ROW EXECUTE FUNCTION eic_update_search_vector();
    `);
    console.log('Trigger für die automatische Index-Aktualisierung erstellt.');

    console.log('Rufe EIC CSV-Datei ab...');
    const response = await axios({
      method: 'get',
      url: EIC_CSV_URL,
      responseType: 'stream'
    });
    console.log('CSV-Datei erfolgreich heruntergeladen.');

    const records = [];
    const stream = response.data.pipe(csv({ separator: ';' }));

    console.log('Verarbeite CSV-Daten und importiere sie in die Datenbank...');

    // Daten aus dem Stream sammeln
    for await (const row of stream) {
      records.push(row);
    }

    // Transaktion starten
    await client.query('BEGIN');

    for (const record of records) {
      // Die Spaltennamen im `record` müssen den Spaltenüberschriften in der CSV-Datei entsprechen.
      // Tatsächliche Spaltennamen: EIC_Code, EIC_Long_Name, EIC_Display_Name, Unternehmen, EIC_Typ
      const query = {
        text: `
          INSERT INTO eic (eic_code, eic_long_name, display_name, eic_responsible_user, eic_type)
          VALUES ($1, $2, $3, $4, $5)
        `,
        values: [
          record.EIC_Code,
          record.EIC_Long_Name,
          record.EIC_Display_Name,
          record.Unternehmen,
          record.EIC_Typ
        ],
      };
      await client.query(query);
    }

    // Transaktion abschließen
    await client.query('COMMIT');
    console.log(`Erfolgreich ${records.length} Einträge in die Tabelle "eic" importiert.`);

  } catch (error) {
    console.error('Ein Fehler ist aufgetreten:', error.message);
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

importEICCodes();

