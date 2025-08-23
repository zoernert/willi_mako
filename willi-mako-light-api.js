#!/usr/bin/env node
/**
 * Willi-Mako-Light API
 * 
 * Ein einfacher HTTP-Service, der eine vereinfachte API für die Willi-Mako Chat-Funktionalität anbietet.
 * Ermöglicht das Testen der Chat-Funktion via curl.
 * 
 * Features:
 * - Automatische Authentifizierung mit festen Anmeldedaten
 * - Einfache Endpunkte für Chat-Anfragen
 * - Detaillierte Protokollierung von API-Interaktionen und Antwort-Metriken
 */

require('dotenv').config({ path: '.env.light-api' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// Konfiguration
const PORT = 3719; // Fester Port für den Light-API-Service
const API_BASE_URL = process.env.API_BASE_URL || 'https://stromhaltig.de/api';
const EMAIL = 'kontakt+demo@stromdao.com';
const PASSWORD = 'willi.mako';
const LOG_DIR = path.join(__dirname, 'logs');

// Express App initialisieren
const app = express();

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Stellen Sie sicher, dass das Log-Verzeichnis existiert
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Globaler Token-Cache
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Log-Informationen in Datei speichern
 */
function log(message, data = null, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    data
  };
  
  // Konsolenausgabe
  let prefix = `[${timestamp}] `;
  
  if (type === 'error') {
    console.log('\x1b[31m%s\x1b[0m', prefix + message); // Rot
  } else if (type === 'success') {
    console.log('\x1b[32m%s\x1b[0m', prefix + message); // Grün
  } else if (type === 'api') {
    console.log('\x1b[34m%s\x1b[0m', prefix + message); // Blau
  } else {
    console.log(prefix + message); // Standard
  }
  
  if (data) {
    console.log(data);
  }

  // Dateiausgabe
  const logFile = path.join(LOG_DIR, `willi-mako-light-${new Date().toISOString().split('T')[0]}.log.json`);
  const existingLog = fs.existsSync(logFile) ? 
    JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
  
  existingLog.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(existingLog, null, 2), 'utf8');
  
  return logEntry;
}

/**
 * Mit der API authentifizieren und einen Bearer Token abrufen
 */
async function authenticate() {
  // Prüfen, ob ein gültiger Token im Cache vorhanden ist
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  
  log(`Authentifiziere Benutzer: ${EMAIL}`, null, 'api');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    const { token, user } = response.data.data;
    
    // Token im Cache speichern (gültig für 23 Stunden)
    tokenCache = {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000
    };
    
    log('Authentifizierung erfolgreich', { userId: user.id, role: user.role }, 'success');
    return token;
  } catch (error) {
    log('Authentifizierung fehlgeschlagen', error.response?.data || error.message, 'error');
    throw new Error('Authentifizierung fehlgeschlagen: ' + (error.response?.data?.message || error.message));
  }
}

/**
 * Eine Chat-Nachricht senden und die Antwort erhalten
 */
async function sendChatMessage(token, query, contextSettings = null) {
  const logEntry = log(`Chat-Anfrage senden: "${query}"`, null, 'api');
  
  try {
    const startTime = Date.now();
    
    // Verwende die übergebenen contextSettings oder Standardwerte
    const defaultContextSettings = {
      useWorkspaceOnly: false,
      workspacePriority: "medium",
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: true
    };
    
    const finalContextSettings = contextSettings || defaultContextSettings;
    
    // Versuche den neuesten Chat zu finden oder einen zu erstellen
    let chatId;
    try {
      const chatsResponse = await axios.get(`${API_BASE_URL}/chat/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (chatsResponse.data.data && chatsResponse.data.data.length > 0) {
        // Verwende den ersten Chat
        chatId = chatsResponse.data.data[0].id;
        log(`Verwende existierenden Chat mit ID: ${chatId}`, null, 'api');
      } else {
        // Erstelle einen neuen Chat
        const createChatResponse = await axios.post(`${API_BASE_URL}/chat/chats`, {
          title: `Willi-Mako-Light API Chat (${new Date().toISOString()})`
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        chatId = createChatResponse.data.data.id;
        log(`Neuer Chat erstellt mit ID: ${chatId}`, null, 'api');
      }
    } catch (error) {
      log('Fehler beim Abrufen/Erstellen eines Chats', error.response?.data || error.message, 'error');
      throw new Error('Fehler beim Abrufen/Erstellen eines Chats: ' + (error.response?.data?.message || error.message));
    }
    
    // Sende die Nachricht an den spezifischen Chat
    const response = await axios.post(`${API_BASE_URL}/chat/chats/${chatId}/messages`, {
      content: query,
      contextSettings: finalContextSettings
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
     const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Antwortdaten extrahieren
    const { data } = response.data;
    
    // Verarbeite verschiedene Antworttypen
    let answer = null;
    let messageType = data.type || 'text';
    
    if (messageType === 'clarification' && data.assistantMessage && data.assistantMessage.content) {
      try {
        // Versuche, den JSON-String im content zu parsen
        const clarificationData = JSON.parse(data.assistantMessage.content);
        
        // Extrahiere die Klarstellungsfragen
        if (clarificationData.type === 'clarification' && clarificationData.clarificationResult) {
          const result = clarificationData.clarificationResult;
          
          // Formatiere die Antwort als Text mit den Klarstellungsfragen
          answer = `Für eine präzisere Antwort benötige ich weitere Informationen:\n\n`;
          
          if (result.suggestedQuestions && result.suggestedQuestions.length > 0) {
            result.suggestedQuestions.forEach((question, index) => {
              answer += `${index + 1}. ${question.question}\n`;
              if (question.options && question.options.length > 0) {
                answer += `   Optionen: ${question.options.join(', ')}\n\n`;
              }
            });
          }
          
          if (result.reasoning) {
            answer += `\nBegründung: ${result.reasoning}`;
          }
        }
      } catch (e) {
        answer = `Es wurde eine Klarstellung angefordert, aber die Daten konnten nicht verarbeitet werden.`;
        console.error('Fehler beim Parsen der Klarstellungsdaten:', e);
      }
    } else if (data.assistantMessage && data.assistantMessage.content) {
      // Normale Textantwort
      answer = data.assistantMessage.content;
    }
    
    // Metriken aus der Antwort extrahieren
    const metrics = {
      responseTime,
      messageType,
      hasCs30Response: data.hasCs30Response || false,
      cs30SourceCount: data.cs30Sources?.length || 0,
      hasEnhancedQuery: data.enhancedQuery ? true : false,
      vectorSearchScore: data.sources?.[0]?.score || null,
      sourceCount: data.sources?.length || 0,
      characterCount: answer?.length || 0
    };
    
    const responseLogEntry = log('Chat-Antwort erhalten', {
      query,
      answer,
      messageType,
      metrics,
      sources: data.sources,
      cs30Sources: data.cs30Sources,
      enhancedQuery: data.enhancedQuery
    }, 'success');
    
    return {
      data: {
        ...data,
        answer, // Füge die verarbeitete Antwort dem data-Objekt hinzu
        messageType
      },
      metrics,
      requestLog: logEntry,
      responseLog: responseLogEntry
    };
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const errorMessage = error.message || 'Unbekannter Fehler';
    const errorStatus = error.response?.status || 500;
    
    const errorLogEntry = log('Chat-Anfrage fehlgeschlagen', {
      message: errorMessage,
      status: errorStatus,
      details: errorDetails,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data
      } : null
    }, 'error');
    
    throw {
      error: errorMessage,
      status: errorStatus,
      details: errorDetails,
      requestLog: logEntry,
      errorLog: errorLogEntry
    };
  }
}

/**
 * Codes nach einem Suchbegriff suchen
 */
async function searchCodes(token, query, id = null) {
  const logEntry = log(`Code-Lookup-Anfrage senden: "${query}"${id ? ` (ID: ${id})` : ''}`, null, 'api');
  
  try {
    const startTime = Date.now();
    
    let endpoint = `${API_BASE_URL}/v1/codes/search?q=${encodeURIComponent(query)}`;
    
    // Falls eine ID angegeben wurde, füge sie zur Anfrage hinzu
    if (id) {
      endpoint += `&id=${encodeURIComponent(id)}`;
    }
    
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Antwortdaten extrahieren
    const { data } = response;
    
    const metrics = {
      responseTime,
      resultCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
    };
    
    const responseLogEntry = log('Code-Lookup-Antwort erhalten', {
      query,
      id,
      results: data,
      metrics
    }, 'success');
    
    return {
      data,
      metrics,
      requestLog: logEntry,
      responseLog: responseLogEntry
    };
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const errorMessage = error.message || 'Unbekannter Fehler';
    const errorStatus = error.response?.status || 500;
    
    const errorLogEntry = log('Code-Lookup-Anfrage fehlgeschlagen', {
      message: errorMessage,
      status: errorStatus,
      details: errorDetails,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      } : null
    }, 'error');
    
    throw {
      error: errorMessage,
      status: errorStatus,
      details: errorDetails,
      requestLog: logEntry,
      errorLog: errorLogEntry
    };
  }
}

// Endpunkte

/**
 * Statusendpunkt
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Willi-Mako-Light API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      '/': 'API-Status',
      '/chat': 'Chat-Anfrage senden (POST)',
      '/chat/query/:query': 'Chat-Anfrage senden (GET)',
      '/logs': 'Logs abrufen (GET)',
      '/logs/:date': 'Logs eines bestimmten Tages abrufen (GET)',
      '/codes/search': 'Code-Lookup (Suche)',
      '/codes/:id': 'Code-Lookup (Detail-Ansicht)'
    }
  });
});

/**
 * Logs abrufen
 */
app.get('/logs', (req, res) => {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(file => file.endsWith('.log.json'))
      .sort((a, b) => b.localeCompare(a)); // Sortieren nach Datum (neueste zuerst)
    
    res.json({
      success: true,
      logFiles: files.map(file => ({
        date: file.split('-').pop().split('.')[0],
        file,
        url: `${req.protocol}://${req.get('host')}/logs/${file.split('-').pop().split('.')[0]}`
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Logs',
      details: error.message
    });
  }
});

/**
 * Logs eines bestimmten Tages abrufen
 */
app.get('/logs/:date', (req, res) => {
  try {
    const { date } = req.params;
    const logFile = path.join(LOG_DIR, `willi-mako-light-${date}.log.json`);
    
    if (!fs.existsSync(logFile)) {
      return res.status(404).json({
        success: false,
        error: `Keine Logs für das Datum ${date} gefunden`
      });
    }
    
    const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    
    res.json({
      success: true,
      date,
      entriesCount: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Logs',
      details: error.message
    });
  }
});

/**
 * Code-Lookup Endpunkt (Suche)
 */
app.get('/codes/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Kein Suchbegriff angegeben. Bitte geben Sie einen "q"-Parameter an.'
      });
    }
    
    const token = await authenticate();
    const result = await searchCodes(token, query);
    
    res.json({
      success: true,
      query,
      results: result.data,
      metrics: result.metrics,
      logs: {
        request: result.requestLog,
        response: result.responseLog
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.error || 'Interner Serverfehler',
      logs: {
        request: error.requestLog,
        error: error.errorLog
      }
    });
  }
});

/**
 * Code-Lookup Endpunkt (Detail-Ansicht)
 */
app.get('/codes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = req.query.q || "";
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Keine ID angegeben.'
      });
    }
    
    const token = await authenticate();
    const result = await searchCodes(token, query, id);
    
    res.json({
      success: true,
      id,
      result: result.data,
      metrics: result.metrics,
      logs: {
        request: result.requestLog,
        response: result.responseLog
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.error || 'Interner Serverfehler',
      logs: {
        request: error.requestLog,
        error: error.errorLog
      }
    });
  }
});

/**
 * Chat-Endpunkt (POST)
 */
app.post('/chat', async (req, res) => {
  try {
    // Unterstützung für beide Parameterformate: 
    // - query/message (unser eigenes Format)
    // - content (Willi-Mako Frontend Format)
    const query = req.body.query || req.body.message || req.body.content;
    
    // Contexteinstellungen aus der Anfrage übernehmen oder Standardwerte verwenden
    const contextSettings = req.body.contextSettings || {
      useWorkspaceOnly: false,
      workspacePriority: "medium",
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: true
    };
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Keine Anfrage angegeben. Bitte geben Sie einen "query"-, "message"- oder "content"-Parameter an.'
      });
    }
    
    const token = await authenticate();
    const result = await sendChatMessage(token, query, contextSettings);
    
    res.json({
      success: true,
      query,
      answer: result.data.answer,
      metrics: result.metrics,
      sources: result.data.sources,
      cs30Sources: result.data.cs30Sources,
      enhancedQuery: result.data.enhancedQuery,
      logs: {
        request: result.requestLog,
        response: result.responseLog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.error || 'Interner Serverfehler',
      logs: {
        request: error.requestLog,
        error: error.errorLog
      }
    });
  }
});

/**
 * Chat-Endpunkt (GET mit Query-Parameter in URL)
 */
app.get('/chat/query/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    // Standardeinstellungen für den Context
    const contextSettings = {
      useWorkspaceOnly: false,
      workspacePriority: "medium",
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: true
    };
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Keine Anfrage angegeben. Bitte geben Sie einen "query"-Parameter an.'
      });
    }
    
    const token = await authenticate();
    const result = await sendChatMessage(token, query, contextSettings);
    
    res.json({
      success: true,
      query,
      answer: result.data.answer,
      metrics: result.metrics,
      sources: result.data.sources,
      cs30Sources: result.data.cs30Sources,
      enhancedQuery: result.data.enhancedQuery,
      logs: {
        request: result.requestLog,
        response: result.responseLog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.error || 'Interner Serverfehler',
      logs: {
        request: error.requestLog,
        error: error.errorLog
      }
    });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`\x1b[32mWilli-Mako-Light API läuft auf Port ${PORT}\x1b[0m`);
  console.log(`\x1b[34mEndpunkte:\x1b[0m`);
  console.log(`  - \x1b[33mGET  /\x1b[0m                  - API-Status`);
  console.log(`  - \x1b[33mPOST /chat\x1b[0m              - Chat-Anfrage senden (mit JSON-Body)`);
  console.log(`  - \x1b[33mGET  /chat/query/:query\x1b[0m - Chat-Anfrage senden (direkt in URL)`);
  console.log(`  - \x1b[33mGET  /logs\x1b[0m              - Logs abrufen`);
  console.log(`  - \x1b[33mGET  /logs/:date\x1b[0m        - Logs eines bestimmten Tages abrufen`);
  console.log(`  - \x1b[33mGET  /codes/search\x1b[0m        - Code-Lookup (Suche)`);
  console.log(`  - \x1b[33mGET  /codes/:id\x1b[0m          - Code-Lookup (Detail-Ansicht)`);
  console.log(`\x1b[34mBeispiele:\x1b[0m`);
  console.log(`  - \x1b[33mcurl http://localhost:${PORT}/chat/query/Was%20bedeutet%20GPKE?\x1b[0m`);
  console.log(`  - \x1b[33mcurl -X POST -H "Content-Type: application/json" -d '{"query":"Was bedeutet GPKE?"}' http://localhost:${PORT}/chat\x1b[0m`);
  console.log(`  - \x1b[33mcurl http://localhost:${PORT}/logs\x1b[0m`);
  console.log(`  - \x1b[33mcurl http://localhost:${PORT}/logs/2023-10-01\x1b[0m`);
  console.log(`  - \x1b[33mcurl http://localhost:${PORT}/codes/search?q=GPKE\x1b[0m`);
  console.log(`  - \x1b[33mcurl http://localhost:${PORT}/codes/12345\x1b[0m`);
});
