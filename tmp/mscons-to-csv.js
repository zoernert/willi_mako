/**
 * @file mscons-to-csv.js
 * @description Konvertiert MSCONS-Nachrichten in CSV-Dateien. Liest eine MSCONS-Datei ein, extrahiert die Messwerte
 *              und speichert diese als CSV im aktuellen Arbeitsverzeichnis. Jeder Messzeitpunkt entspricht einer Zeile.
 * @usage node mscons-to-csv.js <mscons-datei>
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Konvertiert eine MSCONS-Nachricht in eine CSV-Datei.
 * @param {object} input - Ein Objekt mit der MSCONS-Nachricht als Payload.
 * @param {string} input.payload - Die MSCONS-Nachricht als String.
 * @returns {Promise<object>} - Ein Objekt mit Informationen zum Erfolg oder Misserfolg der Konvertierung.
 */
async function run(input) {
  if (!input || !input.payload) {
    return { code: 'missing_payload', description: 'Die Eingabe muss eine Payload enthalten.', entrypoint: 'run', runtime: 'node18', deterministic: true, dependencies: [], warnings: [], notes: [] };
  }

  const msconsData = input.payload;

  const lines = msconsData.split('\n');
  const segments = lines.map(line => line.trim());

  let obisCodes = new Set();
  let data = [];

  let currentObisCode = null;
  let qtyValues = [];
  let dtm163Values = [];
  let dtm164Values = [];

  for (const segment of segments) {
    if (segment.startsWith('PIA+5')) {
      const piaParts = segment.split('+');
      if (piaParts.length > 2) {
        const obisCodeRaw = piaParts[2];
        const obisCodeParts = obisCodeRaw.split(':');
        if (obisCodeParts.length >= 2) {
          currentObisCode = `${obisCodeParts[0].replace(/\?/g, '')}:${obisCodeParts[1].replace(/\?/g, '')}`;
          obisCodes.add(currentObisCode);
        }
      }
    } else if (segment.startsWith('QTY+187')) {
      const qtyParts = segment.split(':');
      qtyValues.push(qtyParts[1]);
    } else if (segment.startsWith('DTM+163')) {
      const dtmParts = segment.split(':');
      dtm163Values.push(dtmParts[1].replace(/\?/g, ''));
    } else if (segment.startsWith('DTM+164')) {
      const dtmParts = segment.split(':');
      dtm164Values.push(dtmParts[1].replace(/\?/g, ''));
    }
  }

  if (dtm163Values.length !== dtm164Values.length || dtm163Values.length !== qtyValues.length) {
    return { code: 'data_mismatch', description: 'Die Anzahl der Zeitstempel und Messwerte stimmt nicht überein.', entrypoint: 'run', runtime: 'node18', deterministic: true, dependencies: [], warnings: [], notes: [] };
  }

  for (let i = 0; i < dtm163Values.length; i++) {
    if (!currentObisCode) {
      currentObisCode = 'UNKNOWN';
    }
    data.push({
      obisCode: currentObisCode,
      start: formatEdifactTimestamp(dtm163Values[i]),
      end: formatEdifactTimestamp(dtm164Values[i]),
      value: qtyValues[i],
    });
  }

  const csvHeader = `OBIS;Start;Ende;Wert\n`;
  const csvRows = data.map(item => `${item.obisCode};${item.start};${item.end};${item.value}`).join('\n');
  const csvContent = csvHeader + csvRows;

  const filename = 'mscons.csv';
  const filepath = path.join(process.cwd(), filename);

  try {
    await fs.writeFile(filepath, csvContent, 'utf8');
    console.log(`MSCONS Daten erfolgreich in ${filename} konvertiert.`);
    return { code: 'success', description: `MSCONS Daten erfolgreich in ${filename} konvertiert.`, entrypoint: 'run', runtime: 'node18', deterministic: true, dependencies: [], warnings: [], notes: [] };
  } catch (error) {
    return { code: 'file_write_error', description: `Fehler beim Schreiben der CSV-Datei: ${error.message}`, entrypoint: 'run', runtime: 'node18', deterministic: true, dependencies: [], warnings: [], notes: [] };
  }
}

function formatEdifactTimestamp(edifactTimestamp) {
  const year = edifactTimestamp.substring(0, 4);
  const month = edifactTimestamp.substring(4, 2 + 4);
  const day = edifactTimestamp.substring(6, 2 + 6);
  const hour = edifactTimestamp.substring(8, 2 + 8);
  const minute = edifactTimestamp.substring(10, 2 + 10);

  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

module.exports = { run };

if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Bitte gib den Pfad zur MSCONS-Datei als Argument an.');
      process.exit(1);
    }

    const filePath = args[0];

    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const result = await run({ payload: fileContent });
      if (result.code !== 'success') {
        console.error(`Fehler: ${result.description}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Fehler beim Lesen der Datei: ${error.message}`);
      process.exit(1);
    }
  }

  main().catch(err => {
    console.error('Unerwarteter Fehler:', err);
    process.exit(1);
  });
}