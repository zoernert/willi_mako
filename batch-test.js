#!/usr/bin/env node
/**
 * CS30 Batch Testing Script
 * 
 * This script runs multiple queries through the CS30 debug tool and
 * automatically generates comparison reports.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Default configuration
const DEFAULT_CONFIG = {
  queriesFile: 'test-queries.json',
  outputDir: 'debug-logs',
  debugScript: './debug-cs30-v2.sh',
  williMakoDebugScript: './debug-willi-mako.sh',
  flowDebugScript: './flow-debug.sh',
  normalUserTest: false,
  options: {
    standard: '',
    hyde: '-y',
    expanded: '-e',
    all: '-a'
  },
  compareOptions: [
    ['standard', 'hyde'],
    ['standard', 'expanded'],
    ['standard', 'all']
  ]
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--queries' || arg === '-q') {
      config.queriesFile = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      config.outputDir = args[++i];
    } else if (arg === '--normal-user' || arg === '-n') {
      config.normalUserTest = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return config;
}

// Show help information
function showHelp() {
  console.log('Willi Mako Chat Flow Batch Testing - Run multiple queries and generate comparison reports');
  console.log('');
  console.log('Usage: node batch-test.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --queries, -q <file>   JSON file with test queries (default: test-queries.json)');
  console.log('  --output, -o <dir>     Output directory for debug logs (default: debug-logs)');
  console.log('  --normal-user, -n      Test mit der willi_mako Collection für normale Nutzer');
  console.log('  --help, -h             Show this help information');
  console.log('');
  console.log('Example:');
  console.log('  node batch-test.js --queries custom-queries.json');
  console.log('  node batch-test.js --normal-user --queries user-queries.json');
}

// Create default test queries file if it doesn't exist
function createDefaultQueriesFileIfNeeded(filename) {
  if (fs.existsSync(filename)) {
    return;
  }
  
  const defaultQueries = [
    "Wie lege ich einen neuen Vertrag in CS30 an?",
    "Was bedeutet GPKE?",
    "Wie melde ich einen Zählerwechsel?",
    "Tabelle mit allen BDEW-Codes anzeigen",
    "Wie bearbeite ich einen Anwendungsfehler?",
    "Wie funktioniert die Netznutzungsabrechnung?",
    "Definition von MaBiS",
    "Wie finde ich einen Kunden in der Kundenverwaltung?",
    "Was ist der UTILMD-Prozess?",
    "Wie erstelle ich eine Rechnung für einen Kunden?",
    "Liste der Fristen für Marktkommunikation",
    "Wie sende ich eine MSCONS-Nachricht?",
    "Welche Schritte sind beim Lieferantenwechsel zu beachten?",
    "Wie lege ich einen neuen Zählpunkt an?",
    "Was bedeutet die Fehlermeldung E225?"
  ];
  
  fs.writeFileSync(filename, JSON.stringify(defaultQueries, null, 2));
  console.log(`Created default queries file: ${filename}`);
}

// Run a single debug command
function runDebugCommand(script, options, query) {
  return new Promise((resolve, reject) => {
    const command = `${script} ${options} "${query}"`;
    console.log(`Running: ${command}`);
    
    const process = spawn('bash', ['-c', command]);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
      // Extract the debug file path from the output
      const match = data.toString().match(/Debug data written to (debug-logs\/cs30-.*\.json)/);
      if (match) {
        output = match[1];
      }
    });
    
    process.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Run a flow debug command
function runFlowDebugCommand(script, options) {
  return new Promise((resolve, reject) => {
    const command = `${script} ${options}`;
    console.log(`Running: ${command}`);
    
    const process = spawn('bash', ['-c', command]);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Run batch test
async function runBatchTest(config) {
  console.log('CS30 Batch Testing');
  console.log('-----------------');
  console.log(`Queries file: ${config.queriesFile}`);
  console.log(`Output directory: ${config.outputDir}`);
  if (config.normalUserTest) {
    console.log('Mode: Willi Mako Collection Debug (für normale Nutzer)');
  } else {
    console.log('Mode: CS30 Collection Debug (für Admin-Zugriff)');
  }
  console.log('');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
  }
  
  // Load queries
  const queries = JSON.parse(fs.readFileSync(config.queriesFile, 'utf8'));
  console.log(`Loaded ${queries.length} queries`);
  
  // If running normal user test, use the normal user test module
  if (config.normalUserTest) {
    try {
      const { runNormalUserBatchTest } = require('./normal-user-test');
      await runNormalUserBatchTest(queries, config.outputDir);
      return;
    } catch (error) {
      console.error('Error running normal user tests:', error);
      process.exit(1);
    }
  }
  
  // Store results
  const results = {
    timestamp: new Date().toISOString(),
    queries: [],
    comparisons: []
  };
  
  // Process each query
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n[${i+1}/${queries.length}] Processing query: "${query}"`);
    
    const queryResults = {
      query,
      options: {}
    };
    
    // Use appropriate debug script based on user type
    const debugScript = config.normalUserTest ? config.williMakoDebugScript : config.debugScript;
    
    // Run with different options
    for (const [optionName, optionValue] of Object.entries(config.options)) {
      try {
        console.log(`\nRunning with ${optionName} options...`);
        const outputFile = await runDebugCommand(debugScript, optionValue, query);
        queryResults.options[optionName] = outputFile;
      } catch (error) {
        console.error(`Error running ${optionName} options:`, error.message);
        queryResults.options[optionName] = { error: error.message };
      }
    }
    
    results.queries.push(queryResults);
  }
  
  // Generate comparison reports
  console.log('\nGenerating comparison reports...');
  
  for (const queryResult of results.queries) {
    for (const [option1, option2] of config.compareOptions) {
      const file1 = queryResult.options[option1];
      const file2 = queryResult.options[option2];
      
      if (typeof file1 === 'string' && typeof file2 === 'string') {
        try {
          console.log(`\nComparing ${option1} vs ${option2} for query: "${queryResult.query}"`);
          await runFlowDebugCommand(config.flowDebugScript, `-c ${file1} ${file2}`);
          
          results.comparisons.push({
            query: queryResult.query,
            comparison: [option1, option2],
            files: [file1, file2]
          });
        } catch (error) {
          console.error(`Error generating comparison report:`, error.message);
        }
      }
    }
  }
  
  // Write batch results
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const batchResultsFile = path.join(config.outputDir, `batch-results-${timestamp}.json`);
  fs.writeFileSync(batchResultsFile, JSON.stringify(results, null, 2));
  console.log(`\nBatch test results written to: ${batchResultsFile}`);
}

// Main function
async function main() {
  const config = parseArgs();
  createDefaultQueriesFileIfNeeded(config.queriesFile);
  await runBatchTest(config);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
