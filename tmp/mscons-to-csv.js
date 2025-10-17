const { readFile, writeFile } = require('fs/promises');
const { join, basename } = require('path');

/**
 * MSCONS-zu-CSV-Konverter für EDIFACT-Nachrichten im Energiemarkt.
 * 
 * Zweck:
 * - Extrahiere Messwerte (QTY+187) mit Zeitstempeln (DTM+163/164) und OBIS-Kennzahlen (PIA+5)
 * - Generiere CSV mit einer Zeile pro Ablesezeitpunkt und allen Zählwerken
 * - Behandle Freistellzeichen (`?`) und Segmentgruppen korrekt
 * 
 * Nutzung:
 *   node mscons-to-csv.js <Eingabepfad>
 *   Ausgabe: <Eingabename>.csv im Arbeitsverzeichnis
 */

/**
 * Hauptfunktion: Liest MSCONS-Datei, parst Segmente und generiert CSV.
 * @param {string} inputPath - Pfad zur EDIFACT-Datei
 * @returns {Promise<{success: boolean, message: string, outputPath?: string}>}
 */
async function run(inputPath) {
  try {
    // Validierung
    if (!inputPath) throw new Error('Eingabepfad fehlt. Nutzung: node mscons-to-csv.js <Dateipfad>');
    const fullPath = join(process.cwd(), inputPath);
    let content;
    try {
      content = await readFile(fullPath, 'utf8');
    } catch (err) {
      throw new Error(`Datei nicht lesbar: ${basename(fullPath)} (${err.code})`);
    }

    // Parsing
    const segments = content.split(/\r?\n/).filter(line => line.trim().endsWith("'"));
    if (segments[0] !== "UNA:+.? '" && !segments.some(s => s.startsWith('UNH'))) {
      throw new Error('Ungültiges EDIFACT-Format: Fehlende UNA/UNH-Segmente');
    }

    const { header, readings } = parseMSCONS(segments);
    if (readings.length === 0) {
      throw new Error('Keine Messwerte (QTY+187) in der Nachricht gefunden');
    }

    // CSV-Generierung
    const csvHeader = ['Zeitstempel_ISO', 'OBIS_Kennzahl', 'Messwert', 'Einheit', 'Register_ID'];
    const csvRows = readings.map(r => (
      `"${r.timestamp}";"${r.obis}";"${r.value}";"${r.unit}";"${r.registerId}"`
    ));
    const csvContent = [csvHeader.join(';'), ...csvRows].join('\n');

    // Ausgabe
    const outputPath = join(process.cwd(), `${basename(inputPath, '.edi')}.csv`);
    try {
      await writeFile(outputPath, csvContent, { flag: 'wx' }); // wx = fail if exists
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new Error(`Datei existiert bereits: ${basename(outputPath)}. Überschreiben? (Abbruch)`);
      }
      throw new Error(`Schreibfehler: ${err.message}`);
    }

    return {
      success: true,
      message: `Erfolg: ${readings.length} Messwerte nach ${outputPath} exportiert`,
      outputPath
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      outputPath: undefined
    };
  }
}

/**
 * Parsed MSCONS-Segmente in strukturierte Messwerte.
 * @param {string[]} segments - Array von EDIFACT-Segmentzeilen
 * @returns {{header: object, readings: Array<{timestamp: string, obis: string, value: string, unit: string, registerId: string}>}}
 */
function parseMSCONS(segments) {
  const readings = [];
  let currentRegisterId = null;
  let currentObis = null;
  let currentUnit = 'KWH'; // Default für Strom

  for (const segment of segments) {
    if (segment.startsWith('RFF+AEV:')) {
      currentRegisterId = segment.split('+')[1].replace(/'$/, '').replace(/\?/g, '');
    }
    else if (segment.startsWith('PIA+5:')) {
      const [_, obisPart1, obisPart2] = segment.split('+')[1].split(':').map(s => s.replace(/\?/g, ''));
      currentObis = `${obisPart1}:${obisPart2}`;
    }
    else if (segment.startsWith('QTY+187:')) {
      const value = segment.split('+')[1].split(':')[0].replace(/\?/g, '');
      readings.push({
        timestamp: '', // Wird später gefüllt
        obis: currentObis || 'UNBEKANNT',
        value,
        unit: currentUnit,
        registerId: currentRegisterId || 'DEFAULT'
      });
    }
    else if (segment.startsWith('DTM+163:') || segment.startsWith('DTM+164:')) {
      const isStart = segment.startsWith('DTM+163:');
      const rawDate = segment.split('+')[1].split(':')[0].replace(/\?/g, '');
      const date = parseEDIFACTDate(rawDate);

      // Aktualisiere den letzten Eintrag (falls vorhanden)
      if (readings.length > 0) {
        const lastReading = readings[readings.length - 1];
        if (isStart) {
          lastReading.timestamp = date;
        } else {
          lastReading.timestamp = `${lastReading.timestamp}/${date}`;
        }
      }
    }
    else if (segment.startsWith('MEA+AAE:')) {
      currentUnit = segment.split('+')[2].split(':')[0].replace(/\?/g, '');
    }
  }

  // Post-Processing: ISO-Intervalle generieren
  return {
    header: extractHeaderInfo(segments),
    readings: readings.map(r => ({
      ...r,
      timestamp: r.timestamp.includes('/') ? 
        `PT${formatISODuration(r.timestamp)}` : 
        `${r.timestamp}T00:00:00`
    }))
  };
}

/**
 * Extrahiere Kopfdaten (UNH, BGM, DTM).
 */
function extractHeaderInfo(segments) {
  const header = {};
  for (const seg of segments) {
    if (seg.startsWith('UNH')) header.reference = seg.split('+')[1].replace(/'$/, '');
    else if (seg.startsWith('BGM')) header.messageType = seg.split('+')[1].replace(/'$/, '');
    else if (seg.startsWith('DTM+137:')) {
      header.documentDate = parseEDIFACTDate(seg.split('+')[1].split(':')[0]);
    }
  }
  return header;
}

/**
 * Konvertiert EDIFACT-Datum (YYYYMMDD) zu ISO (YYYY-MM-DD).
 */
function parseEDIFACTDate(edifactDate) {
  const year = edifactDate.substring(0, 4);
  const month = edifactDate.substring(4, 6);
  const day = edifactDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Formatiert Intervall (YYYY-MM-DD/YYYY-MM-DD) als ISO-Dauer (P...D).
 */
function formatISODuration(interval) {
  const [start, end] = interval.split('/');
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  return `P${diffDays}D`;
}

// Auto-Execution
if (require.main === module) {
  run(process.argv[2]).then(result => {
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error(`❌ Fehler: ${result.message}`);
      process.exitCode = 1;
    }
  }).catch(err => {
    console.error(`❌ Unbehandelter Fehler: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run };

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
