import { initDatabase } from './config/database';
import { QdrantService } from './services/qdrant';

async function initialize() {
  try {
    console.log('🚀 Initialisierung der Stromhaltig Anwendung...');
    
    // Initialize database
    console.log('📁 Initialisiere Datenbank...');
    await initDatabase();
    
    // Initialize Qdrant collection
    console.log('🔍 Initialisiere Qdrant Vector Store...');
    await QdrantService.createCollection();
    
    console.log('✅ Initialisierung erfolgreich abgeschlossen!');
    console.log('');
    console.log('🌟 Die Anwendung ist bereit:');
    console.log('   - Backend: http://localhost:3001');
    console.log('   - Frontend: http://localhost:3000');
    console.log('   - Admin Login: admin@willi-mako.com / admin123');
    console.log('');
    console.log('📋 Nächste Schritte:');
    console.log('   1. Starten Sie den Backend-Server: npm run server:dev');
    console.log('   2. Starten Sie den Frontend-Server: npm run client:dev');
    console.log('   3. Oder beide gleichzeitig: npm run dev');
    console.log('');
    
  } catch (error) {
    console.error('❌ Initialisierung fehlgeschlagen:', error);
    process.exit(1);
  }
}

initialize();
