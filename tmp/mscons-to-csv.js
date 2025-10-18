/**
 * @file MSCONS to CSV Converter
 * @description Converts an EDIFACT MSCONS file to a CSV file containing interval data.
 * Usage: node script.js <input_file_path>
 */

const fs = require('fs');
const path = require('path');

/**
 * Converts an EDIFACT date string to ISO 8601 format.
 * @param {string} dateString The EDIFACT date string (CCYYMMDDHHMM).
 * @param {string} timezoneCode The timezone code.
 * @returns {string} The ISO 8601 date string.
 */
function convertEdifactDateToISO(dateString, timezoneCode) {
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  const hour = dateString.slice(8, 10);
  const minute = dateString.slice(10, 12);

  let isoString = `${year}-${month}-${day}T${hour}:${minute}:00`;

  if (timezoneCode === '303') {
    isoString += 'Z'; // Assuming UTC if timezone is 303.  Adjust if needed.
  } else {
        isoString += 'Z'; // Assuming UTC, adjust if different offset is required
  }

  return isoString;
}

/**
 * Cleans an EDIFACT segment by removing escape characters.
 * @param {string} segment The EDIFACT segment.
 * @returns {string} The cleaned segment.
 */
function cleanSegment(segment) {
  return segment.replace(/\?/g, '');
}

async function run(input) {
  if (!input || !input.payload) {
    return { code: 'ArgumentMissing', description: 'Input payload is missing.' };
  }

  const filePath = process.argv[2];

  if (!filePath) {
    return { code: 'ArgumentMissing', description: 'File path is required as a command-line argument.' };
  }

  try {
    const fileContent = input.payload

    const lines = fileContent.split('\n');
    let meteringPointId = null;
    let productCode = null;
    let intervals = [];
    let currentQty = null;
    let currentStart = null;
    let timezoneCode = null;
    let intervalCount = 0;

    for (const line of lines) {
      const cleanedLine = cleanSegment(line);
      const segments = cleanedLine.split('+');

      if (segments[0] === 'LOC' && segments[1] === 'Z04') {
        meteringPointId = segments[2];
      } else if (segments[0] === 'PIA' && segments[1] === '5') {
          const productCodeParts = segments[2].split(':');
          productCode = `${productCodeParts[0].replace('?', '')}:${productCodeParts[1]}`;
      } else if (segments[0] === 'QTY' && segments[1] === '187') {
        currentQty = parseFloat(segments[2].replace(',', '.'));
      } else if (segments[0] === 'DTM' && segments[1] === '163') {
        const dateTimeParts = segments[2].split(':');
        currentStart = dateTimeParts[0];
        timezoneCode = dateTimeParts[1];
      } else if (segments[0] === 'DTM' && segments[1] === '164') {
        const dateTimeParts = segments[2].split(':');
        const currentEnd = dateTimeParts[0];

        if (currentQty !== null && currentStart !== null) {
          intervals.push({
            metering_point_id: meteringPointId,
            product_code: productCode,
            interval_start: convertEdifactDateToISO(currentStart, timezoneCode),
            interval_end: convertEdifactDateToISO(currentEnd, timezoneCode),
            quantity_kwh: currentQty,
            timezone_code: timezoneCode,
          });
          intervalCount++;
        }
        currentQty = null;
        currentStart = null;
      }
    }

    const csvHeader = 'metering_point_id,product_code,interval_start,interval_end,quantity_kwh,timezone_code\n';
    const csvRows = intervals.map(
      (i) =>
        `${i.metering_point_id},${i.product_code},${i.interval_start},${i.interval_end},${i.quantity_kwh},${i.timezone_code}`
    );
    const csvContent = csvHeader + csvRows.join('\n');

    const outputFile = path.join(path.dirname(filePath), 'mscons-intervals.csv');

    try {
      await fs.access(outputFile);
      return { code: 'FileExists', description: `File ${outputFile} already exists. Please delete it or choose a different name.` };
    } catch (e) {
      // File does not exist, so we can proceed
      fs.writeFileSync(outputFile, csvContent, 'utf8');

      console.log(`Successfully converted ${intervalCount} intervals to ${outputFile}`);

      return {
        metering_point_id: meteringPointId,
        product_code: productCode,
        intervals: intervals,
        intervalCount: intervalCount,
        outputFile: outputFile
      };
    }

  } catch (error) {
    console.error('Error:', error);
    return { code: 'FileProcessingError', description: `Error processing file: ${error.message}` };
  }
}


module.exports = { run };

if (require.main === module) {
  run({payload: fs.readFileSync(process.argv[2], 'utf8')}).catch((err) => {
    console.error('Unhandled error during script execution:', err);
  });
}