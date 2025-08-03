"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./config/database");
const qdrant_1 = require("./services/qdrant");
async function initialize() {
    try {
        console.log('🚀 Initialisierung der Stromhaltig Anwendung...');
        console.log('📁 Initialisiere Datenbank...');
        await (0, database_1.initDatabase)();
        console.log('🔍 Initialisiere Qdrant Vector Store...');
        await qdrant_1.QdrantService.createCollection();
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
    }
    catch (error) {
        console.error('❌ Initialisierung fehlgeschlagen:', error);
        process.exit(1);
    }
}
initialize();
//# sourceMappingURL=init.js.map