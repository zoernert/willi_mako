#!/usr/bin/env node
/**
 * Upload Script für BookStack API
 * Veröffentlicht alle 5 Kapitel des EDIFACT-Buches auf docs.corrently.de
 * 
 * Nutzung: node upload-edifact-book-to-bookstack.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// BookStack API Credentials
const BOOKSTACK_API = {
  baseUrl: 'https://docs.corrently.de',
  tokenId: '0y5A9KTlTSe0N3rfbRQULofJzlrWmdne',
  secret: 'AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir',
  bookId: 27
};

// Kapitel-Daten (aus den generierten Inhalten)
const CHAPTERS = [
  {
    name: 'Kapitel 1: Was ist EDIFACT?',
    html: fs.readFileSync(path.join(__dirname, 'chapter-1-1.html'), 'utf8'),
    priority: 1
  },
  {
    name: 'Kapitel 2: Struktur einer EDIFACT-Nachricht',
    html: fs.readFileSync(path.join(__dirname, 'chapter-1-2.html'), 'utf8'),
    priority: 2
  },
  {
    name: 'Kapitel 3: UTILMD – Stammdaten',
    html: fs.readFileSync(path.join(__dirname, 'chapter-2.html'), 'utf8'),
    priority: 3
  },
  {
    name: 'Kapitel 4: MSCONS – Messwertübermittlung',
    html: fs.readFileSync(path.join(__dirname, 'chapter-3.html'), 'utf8'),
    priority: 4
  },
  {
    name: 'Kapitel 5: APERAK – Fehlerbehandlung',
    html: fs.readFileSync(path.join(__dirname, 'chapter-4.html'), 'utf8'),
    priority: 5
  },
  {
    name: 'Kapitel 6: Checkliste EDIFACT-Qualitätssicherung',
    html: fs.readFileSync(path.join(__dirname, 'chapter-5.html'), 'utf8'),
    priority: 6
  }
];

/**
 * HTTP Request Helper für BookStack API
 */
function bookstackRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BOOKSTACK_API.baseUrl);
    const authString = `${BOOKSTACK_API.tokenId}:${BOOKSTACK_API.secret}`;
    const options = {
      method,
      headers: {
        'Authorization': `Token ${authString}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Prüft ob ein Kapitel bereits existiert
 */
async function findExistingChapter(bookId, chapterName) {
  try {
    const book = await bookstackRequest('GET', `/api/books/${bookId}`);
    const chapters = book.contents.filter(item => item.type === 'chapter');
    return chapters.find(ch => ch.name === chapterName);
  } catch (error) {
    console.error(`Fehler beim Suchen des Kapitels "${chapterName}":`, error.message);
    return null;
  }
}

/**
 * Erstellt ein neues Kapitel in BookStack
 */
async function createChapter(bookId, name, priority) {
  try {
    const payload = {
      book_id: bookId,
      name,
      priority
    };
    
    const result = await bookstackRequest('POST', '/api/chapters', payload);
    console.log(`✅ Kapitel erstellt: ${name} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Kapitels "${name}":`, error.message);
    throw error;
  }
}

/**
 * Erstellt eine Page innerhalb eines Chapters
 */
async function createPage(chapterId, name, html, priority) {
  try {
    const payload = {
      chapter_id: chapterId,
      name,
      html,
      priority
    };
    
    const result = await bookstackRequest('POST', '/api/pages', payload);
    console.log(`  ✅ Page erstellt: ${name} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`  ❌ Fehler beim Erstellen der Page "${name}":`, error.message);
    throw error;
  }
}

/**
 * Aktualisiert eine existierende Page
 */
async function updatePage(pageId, name, html, priority) {
  try {
    const payload = {
      name,
      html,
      priority
    };
    
    const result = await bookstackRequest('PUT', `/api/pages/${pageId}`, payload);
    console.log(`  ✅ Page aktualisiert: ${name} (ID: ${pageId})`);
    return result;
  } catch (error) {
    console.error(`  ❌ Fehler beim Aktualisieren der Page "${name}":`, error.message);
    throw error;
  }
}

/**
 * Ersetzt [LINK:text|url] durch HTML-Links
 */
function processBacklinks(html) {
  return html.replace(/\[LINK:([^\]|]+)\|?([^\]]*)\]/g, (match, text, url) => {
    const href = url || 'https://www.stromhaltig.de';
    return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  });
}

/**
 * Hauptfunktion: Upload aller Kapitel
 */
async function uploadAllChapters() {
  console.log('📚 BookStack Upload gestartet...\n');
  console.log(`Ziel: ${BOOKSTACK_API.baseUrl}/books/${BOOKSTACK_API.bookId}\n`);

  for (const chapter of CHAPTERS) {
    try {
      // Prüfe ob Kapitel existiert
      let existingChapter = await findExistingChapter(BOOKSTACK_API.bookId, chapter.name);
      
      let chapterId;
      if (existingChapter) {
        console.log(`ℹ️  Kapitel existiert bereits: ${chapter.name} (ID: ${existingChapter.id})`);
        chapterId = existingChapter.id;
      } else {
        const newChapter = await createChapter(BOOKSTACK_API.bookId, chapter.name, chapter.priority);
        chapterId = newChapter.id;
      }

      // Verarbeite Backlinks im HTML
      const processedHtml = processBacklinks(chapter.html);

      // Erstelle Page innerhalb des Chapters
      const pageName = chapter.name; // Gleicher Name wie Chapter
      await createPage(chapterId, pageName, processedHtml, 1);

    } catch (error) {
      console.error(`❌ Fehler bei "${chapter.name}":`, error.message);
    }

    // Kurze Pause zwischen Uploads
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ Upload abgeschlossen!');
  console.log(`📖 Buch ansehen: ${BOOKSTACK_API.baseUrl}/books/${BOOKSTACK_API.bookId}`);
}

// Script ausführen
if (require.main === module) {
  uploadAllChapters().catch(error => {
    console.error('💥 Kritischer Fehler:', error);
    process.exit(1);
  });
}

module.exports = { uploadAllChapters, processBacklinks };
