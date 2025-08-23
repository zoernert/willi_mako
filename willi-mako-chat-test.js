#!/usr/bin/env node
/**
 * Willi-Mako Chat Test CLI
 * 
 * This script allows testing the Willi-Mako chat API with comprehensive logging
 * for system optimization and quality improvement.
 * 
 * Features:
 * - Authentication with the Willi-Mako API
 * - Bearer token retrieval
 * - Test chat execution
 * - Detailed logging of API interactions and response metrics
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { program } = require('commander');
const readline = require('readline');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://stromhaltig.de/api';
const DEFAULT_EMAIL = 'kontakt+demo@stromdao.com';
const DEFAULT_PASSWORD = 'willi.mako';
const DEFAULT_LOG_DIR = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(DEFAULT_LOG_DIR)) {
  fs.mkdirSync(DEFAULT_LOG_DIR, { recursive: true });
}

// CLI configuration
program
  .name('willi-mako-chat-test')
  .description('CLI tool for testing Willi-Mako chat API with comprehensive logging')
  .version('1.0.0');

program
  .option('-e, --email <email>', 'Email for authentication', DEFAULT_EMAIL)
  .option('-p, --password <password>', 'Password for authentication', DEFAULT_PASSWORD)
  .option('-q, --query <query>', 'Chat query to send')
  .option('-f, --file <path>', 'Path to JSON file with query list')
  .option('-i, --interactive', 'Interactive mode for entering queries')
  .option('-v, --verbose', 'Verbose output')
  .option('--api-url <url>', 'API base URL', API_BASE_URL)
  .option('-l, --log-dir <path>', 'Log directory', DEFAULT_LOG_DIR);

program.parse();
const options = program.opts();

// Setup logging utilities
const logFile = path.join(options.logDir, `willi-mako-chat-${new Date().toISOString().replace(/:/g, '-')}.log.json`);

/**
 * Log information to console and file
 */
function log(message, data = null, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    data
  };
  
  // Console output
  if (options.verbose || type === 'error') {
    let prefix = `[${timestamp}] `;
    
    if (type === 'error') {
      console.log('\x1b[31m%s\x1b[0m', prefix + message); // Red
    } else if (type === 'success') {
      console.log('\x1b[32m%s\x1b[0m', prefix + message); // Green
    } else if (type === 'api') {
      console.log('\x1b[34m%s\x1b[0m', prefix + message); // Blue
    } else {
      console.log(prefix + message); // Default
    }
    
    if (data && options.verbose) {
      console.log(data);
    }
  }

  // File output
  const existingLog = fs.existsSync(logFile) ? 
    JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
  
  existingLog.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(existingLog, null, 2), 'utf8');
}

/**
 * Authenticate with the API and get a bearer token
 */
async function authenticate() {
  log(`Authenticating user: ${options.email}`, null, 'api');
  
  try {
    const response = await axios.post(`${options.apiUrl}/auth/login`, {
      email: options.email,
      password: options.password
    });
    
    const { token, user } = response.data.data;
    
    log('Authentication successful', { userId: user.id, role: user.role }, 'success');
    return token;
  } catch (error) {
    log('Authentication failed', error.response?.data || error.message, 'error');
    process.exit(1);
  }
}

/**
 * Send a chat message and get the response
 */
async function sendChatMessage(token, query) {
  log(`Sending chat query: "${query}"`, null, 'api');
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${options.apiUrl}/chat`, {
      message: query
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const { data } = response.data;
    
    // Extract metrics from response
    const metrics = {
      responseTime,
      hasCs30Response: data.hasCs30Response || false,
      cs30SourceCount: data.cs30Sources?.length || 0,
      hasEnhancedQuery: data.enhancedQuery ? true : false,
      vectorSearchScore: data.sources?.[0]?.score || null,
      sourceCount: data.sources?.length || 0,
      characterCount: data.answer?.length || 0
    };
    
    log('Chat response received', {
      query,
      answer: data.answer,
      metrics,
      sources: data.sources,
      cs30Sources: data.cs30Sources,
      enhancedQuery: data.enhancedQuery
    }, 'success');
    
    // Print simple result to console
    console.log('\n' + '\x1b[33mQuery:\x1b[0m' + ' ' + query);
    console.log('\x1b[32mAnswer:\x1b[0m' + ' ' + data.answer);
    console.log('\x1b[34mResponse time:\x1b[0m' + ' ' + responseTime + 'ms');
    console.log('\x1b[34mSources:\x1b[0m' + ' ' + (data.sources?.length || 0) + ' sources found');
    
    return data;
  } catch (error) {
    log('Chat query failed', error.response?.data || error.message, 'error');
    console.error('\x1b[31mError:\x1b[0m', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Load queries from a file
 */
function loadQueriesFromFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    log(`Loading queries from file: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      log(`File not found: ${fullPath}`, null, 'error');
      process.exit(1);
    }
    
    const queries = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    if (!Array.isArray(queries)) {
      log('Invalid queries file format. Expected JSON array of strings.', null, 'error');
      process.exit(1);
    }
    
    log(`Loaded ${queries.length} queries from file`);
    return queries;
  } catch (error) {
    log('Failed to load queries from file', error.message, 'error');
    process.exit(1);
  }
}

/**
 * Run interactive mode
 */
async function runInteractiveMode(token) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\x1b[33m\nWilli-Mako Chat Test - Interactive Mode\x1b[0m');
  console.log('\x1b[33mType your queries and press Enter. Type "exit" to quit.\n\x1b[0m');
  
  const promptQuestion = () => {
    rl.question('\x1b[32m> \x1b[0m', async (query) => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      await sendChatMessage(token, query);
      console.log(); // Add empty line for readability
      promptQuestion();
    });
  };
  
  promptQuestion();
}

/**
 * Main function
 */
async function main() {
  console.log('\x1b[33mWilli-Mako Chat Test CLI\x1b[0m');
  log('Starting Willi-Mako Chat Test CLI', options);
  
  // Get authentication token
  const token = await authenticate();
  
  if (options.interactive) {
    // Interactive mode
    await runInteractiveMode(token);
  } else if (options.file) {
    // File mode - process all queries from file
    const queries = loadQueriesFromFile(options.file);
    
    console.log('\x1b[33mProcessing ' + queries.length + ' queries from file...\x1b[0m');
    
    for (const [index, query] of queries.entries()) {
      console.log('\x1b[33m\nQuery ' + (index + 1) + '/' + queries.length + '\x1b[0m');
      await sendChatMessage(token, query);
    }
    
    console.log('\x1b[32m\nAll queries processed successfully.\x1b[0m');
    log('All queries processed successfully');
  } else if (options.query) {
    // Single query mode
    await sendChatMessage(token, options.query);
  } else {
    console.log('\x1b[31mError: No query specified. Use --query, --file, or --interactive option.\x1b[0m');
    program.help();
  }
}

// Run the script
main().catch(error => {
  log('Unhandled error', error.message, 'error');
  console.error('\x1b[31mUnhandled error:\x1b[0m', error);
  process.exit(1);
});
