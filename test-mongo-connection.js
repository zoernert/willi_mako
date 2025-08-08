const { MongoClient } = require('mongodb');

const testMongoConnection = async () => {
  try {
    console.log('🔗 Teste MongoDB-Verbindung...');
    
    const mongoUri = process.env.MONGO_URI || 'mongodb://10.0.0.2:27017/quitus?replicaSet=corrently-lake&readPreference=secondaryPreferred&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000&socketTimeoutMS=30000&maxPoolSize=10&retryWrites=false';
    
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    console.log('✅ MongoDB Verbindung erfolgreich');
    
    const db = client.db('quitus');
    const collection = db.collection('market_partners');
    
    // Test 1: Collection-Statistiken
    console.log('\n📊 Collection-Statistiken:');
    const count = await collection.countDocuments();
    console.log(`Anzahl Dokumente in market_partners: ${count}`);
    
    // Test 2: Erstes Dokument abrufen
    console.log('\n📝 Erstes Dokument:');
    const firstDoc = await collection.findOne();
    if (firstDoc) {
      console.log('Code:', firstDoc.partner?.['﻿BdewCode']);
      console.log('Unternehmen:', firstDoc.partner?.CompanyName);
      console.log('Stadt:', firstDoc.partner?.City);
      console.log('Anzahl Findings:', firstDoc.findings?.length || 0);
      
      if (firstDoc.findings && firstDoc.findings.length > 0) {
        const softwareSystems = [];
        firstDoc.findings.forEach(finding => {
          if (finding.software_systems) {
            softwareSystems.push(...finding.software_systems);
          }
        });
        console.log('Software-Systeme:', softwareSystems.slice(0, 3).map(s => s.name));
      }
    }
    
    // Test 3: Suche nach "Stadt"
    console.log('\n🔍 Suche nach "Stadt":');
    const searchResults = await collection.find({
      $or: [
        { 'partner.CompanyName': /Stadt/i },
        { 'partner.City': /Stadt/i }
      ]
    }).limit(5).toArray();
    
    console.log(`Gefunden: ${searchResults.length} Ergebnisse`);
    searchResults.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.partner?.CompanyName} (${doc.partner?.City})`);
    });
    
    // Test 4: Software-Systeme analysieren
    console.log('\n💻 Software-Systeme:');
    const pipeline = [
      { $unwind: '$findings' },
      { $unwind: '$findings.software_systems' },
      { $group: { _id: '$findings.software_systems.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];
    
    const softwareStats = await collection.aggregate(pipeline).toArray();
    console.log('Top 10 Software-Systeme:');
    softwareStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat._id}: ${stat.count} Erwähnungen`);
    });
    
    await client.close();
    console.log('\n✅ Test erfolgreich abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  }
};

testMongoConnection();
