// Zweck: Konvertiert MSCONS-Nachrichten in CSV-Dateien.
// Nutzung: node mscons-to-csv.js <pfad_zur_mscons_datei>

const fs = require('fs/promises');
const path = require('path');

async function run(input) {
  const inputFile = process.argv[2];

  if (!inputFile) {
    throw new Error('Bitte gib den Pfad zur MSCONS-Datei als Argument an.');
  }

  const outputFile = 'mscons.csv';

  try {
    await fs.access(outputFile);
    // Datei existiert bereits
    const answer = input || '';
    if (answer.toLowerCase() !== 'j') {
      throw new Error(`Die Datei ${outputFile} existiert bereits. Überschreiben? (j/n)`);
    }
  } catch (e) {
    // Datei existiert nicht, also alles gut
    if (e.message.startsWith('Die Datei')) {
      throw e;
    }
  }

  try {
    const data = await fs.readFile(inputFile, 'utf8');
    const lines = data.split('\n');

    let header = [];
    let rows = [];

    for (const line of lines) {
      if (line.startsWith('LOC+172')) {
        const timestamp = line.split('+')[2].split(':')[1];
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);

        const formattedTimestamp = `${year}-${month}-${day} ${hour}:${minute}`;

        let values = { timestamp: formattedTimestamp };

        for (const line2 of lines) {
          if (line2.includes('MEA+Z07')) {
            const obisCode = line2.split('+')[2].split(':')[0];
            const value = line2.split('+')[3];

            if (!header.includes(obisCode)) {
              header.push(obisCode);
            }
            values[obisCode] = value;
          }
        }

        let row = { timestamp: formattedTimestamp };
        header.forEach(h => {
          row[h] = values[h] || '';
        });
        rows.push(row);
      }
    }

    const csvHeader = ['timestamp', ...header].join(';');
    const csvRows = rows.map(row => {
      return ['timestamp', ...header].map(h => row[h]).join(';');
    }).join('\n');

    const csvContent = `${csvHeader}\n${csvRows}`;

    await fs.writeFile(outputFile, csvContent, 'utf8');

    console.log(`MSCONS-Daten erfolgreich in ${outputFile} konvertiert.`);

  } catch (err) {
    console.error(`Fehler: ${err.message}`);
    throw err;
  }
  return 'OK';
}

if (require.main === module) {
  run().catch(err => {
    console.error('Ein Fehler ist aufgetreten:', err);
  });
}

module.exports = { run };