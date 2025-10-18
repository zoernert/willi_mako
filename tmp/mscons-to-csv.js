const { readFile, writeFile } = require('fs/promises');
const { join, basename, extname } = require('path');

/**
 * MSCONS-zu-CSV-Konverter für EDIFACT-Nachrichten im Energiemarkt
 * 
 * Zweck:
 *   - Extrahiere Messwerte (OBIS-Codes) aus MSCONS-Nachrichten
 *   - Konvertiere in strukturiertes CSV mit Zeilen pro Ablesezeitpunkt
 *   - Behandle Intervallwerte (QTY+DTM) und Register-IDs (PIA/LIN)
 * 
 * Nutzung:
 *   node mscons2csv.js <Eingabepfad>
 *   Ausgabe: <Eingabename>.csv im Arbeitsverzeichnis
 */

const EDIFACT_ESCAPE = '?';
const SEGMENT_TERMINATOR = "'\n";
const DATA_SEPARATOR = '+';
const COMPOSITE_SEPARATOR = ':';

/**
 * Parsed eine MSCONS-Nachricht in strukturierte Segmente
 * @throws {Error} Bei Formatfehlern oder fehlenden Pflichtsegmenten
 */
function parseMscons(edifact) {
  if (!edifact.trim().startsWith('UNH') || !edifact.includes('UNT')) {
    throw new Error('Ungültige MSCONS-Struktur: Fehlende UNH/UNT-Segmente');
  }

  const segments = edifact
    .split(SEGMENT_TERMINATOR)
    .filter(Boolean)
    .map(line => {
      const [code, ...elements] = line.split(DATA_SEPARATOR);
      return { code, elements: elements.map(el => el.replace(new RegExp(`${EDIFACT_ESCAPE}([+:'?])`, 'g'), '$1')) };
    });

  // Validierung: UNH muss vor UNT kommen
  const unhIndex = segments.findIndex(s => s.code === 'UNH');
  const untIndex = segments.findIndex(s => s.code === 'UNT');
  if (unhIndex === -1 || untIndex === -1 || unhIndex > untIndex) {
    throw new Error('Segmentreihenfolge verletzt: UNH muss vor UNT stehen');
  }

  return segments;
}

/**
 * Extrahiere OBIS-Codes aus PIA-Segmenten (Format: PIA+5+<OBIS1>+<OBIS2>)
 */
function extractObisCodes(segments) {
  return segments
    .filter(s => s.code === 'PIA' && s.elements[0] === '5')
    .map(s => {
      const [obis1, obis2] = s.elements.slice(1, 3);
      return `${obis1.replace(/\?/g, '')}:${obis2.replace(/\?/g, '')}`;
    });
}

/**
 * Verarbeite QTY+DTM-Gruppen zu Intervall-Messwerten
 */
function processIntervalReadings(segments, obisCodes) {
  const readings = [];
  let currentObisIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.code === 'QTY' && seg.elements[0] === '187') {
      const value = seg.elements[1] || '0';
      const startSeg = segments[i + 1];
      const endSeg = segments[i + 2];

      if (!startSeg?.code === 'DTM' || startSeg.elements[0] !== '163' ||
          !endSeg?.code === 'DTM' || endSeg.elements[0] !== '164') {
        continue; // Ungültige Intervalldefinition
      }

      const obisCode = obisCodes[currentObisIndex % obisCodes.length];
      readings.push({
        obisCode,
        value,
        start: startSeg.elements[1].replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        end: endSeg.elements[1].replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        unit: seg.elements[2] || 'kWh' // Default-Einheit
      });

      currentObisIndex++;
      i += 2; // Überspringe verarbeitete DTM-Segmente
    }
  }

  return readings;
}

/**
 * Generiere CSV-Inhalt mit Kopfzeile
 */
function generateCsv(readings) {
  const header = ['OBIS-Code', 'Wert', 'Einheit', 'Startdatum', 'Enddatum'];
  const rows = readings.map(r =>
    `${r.obisCode};${r.value};${r.unit};${r.start};${r.end}`
  );
  return [header.join(';'), ...rows].join('\n');
}

async function run(input) {
  const { payload: filePath } = input || {};
  if (!filePath) {
    throw new Error('Eingabepfad fehlt: Bitte Pfad zur MSCONS-Datei als Argument angeben');
  }

  // Dateioperationen
  const content = await readFile(filePath, 'utf8');
  const segments = parseMscons(content);
  const obisCodes = extractObisCodes(segments);

  if (obisCodes.length === 0) {
    throw new Error('Keine OBIS-Codes (PIA+5) in der Nachricht gefunden');
  }

  const readings = processIntervalReadings(segments, obisCodes);
  if (readings.length === 0) {
    throw new Error('Keine Messwerte (QTY+187) in der Nachricht gefunden');
  }

  const csvContent = generateCsv(readings);
  const outputPath = join(
    process.cwd(),
    `${basename(filePath, extname(filePath))}.csv`
  );

  // Überschreibschutz
  try {
    await writeFile(outputPath, csvContent, { flag: 'wx' }); // wx = fail if exists
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw new Error(`Zieldatei existiert bereits: ${outputPath}`);
    }
    throw err;
  }

  return {
    success: true,
    outputPath,
    stats: {
      obisCodes: obisCodes.length,
      readings: readings.length
    }
  };
}

module.exports = { run };

// Automatische Ausführung bei direktem Aufruf
if (require.main === module) {
  (async () => {
    try {
      const result = await run({ payload: process.argv[2] });
      console.log(`Erfolg: CSV generiert unter ${result.outputPath} (${result.stats.readings} Messwerte)`);
    } catch (err) {
      console.error('FEHLER:', err.message);
      process.exitCode = 1;
    }
  })();
}

// __AUTO_RUN_RETURN_WRAPPER__
if (typeof module !== 'undefined' && module.exports) {
  const __exports = module.exports;
  let __originalRun = null;
  if (typeof __exports === 'function') {
    __originalRun = __exports;
  } else if (__exports && typeof __exports.run === 'function') {
    __originalRun = __exports.run;
  }
  if (!__originalRun && typeof exports !== 'undefined' && exports && typeof exports === 'object') {
    if (typeof exports.run === 'function') {
      __originalRun = exports.run;
    }
  }
  if (!__originalRun && typeof run === 'function') {
    __originalRun = run;
  }
  if (typeof __originalRun === 'function') {
    const __wrapRun = async function run(input) {
      const __result = await __originalRun(input);
      return __result === undefined ? '' : __result;
    };
    if (typeof __exports === 'function') {
      module.exports = __wrapRun;
    } else if (__exports && typeof __exports === 'object') {
      module.exports.run = __wrapRun;
    } else {
      module.exports = { run: __wrapRun };
    }
    if (typeof exports !== 'undefined' && exports) {
      exports.run = typeof module.exports === 'function' ? module.exports : module.exports.run;
    }
  }
}
