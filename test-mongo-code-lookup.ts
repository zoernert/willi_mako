import * as dotenv from 'dotenv';
import { MongoCodeLookupRepository } from './src/modules/codelookup/repositories/mongo-codelookup.repository';
import { CodeLookupService } from './src/modules/codelookup/services/codelookup.service';

// Load environment variables
dotenv.config();

const testCodeLookup = async () => {
  try {
    console.log('🔗 Verbinde mit MongoDB...');

    const mongoRepository = new MongoCodeLookupRepository();
    const codeLookupService = new CodeLookupService(mongoRepository);

    // Test 1: Einfache Suche
    console.log('\n📝 Test 1: Suche nach "Stadt"');
    const searchResults = await codeLookupService.searchCodes('Stadt');
    console.log(`Gefunden: ${searchResults.length} Ergebnisse`);
    
    if (searchResults.length > 0) {
      const firstResult = searchResults[0];
      console.log('Erstes Ergebnis:', {
        code: firstResult.code,
        companyName: firstResult.companyName,
        city: firstResult.city,
        softwareSystemsCount: firstResult.softwareSystems?.length || 0
      });

      // Test 2: Detailsuche für ersten Code
      console.log('\n🔍 Test 2: Detailsuche für Code:', firstResult.code);
      const details = await codeLookupService.getCodeDetails(firstResult.code);
      if (details) {
        console.log('Details:', {
          code: details.code,
          companyName: details.companyName,
          findingsCount: details.findings.length,
          allSoftwareSystemsCount: details.allSoftwareSystems.length
        });

        if (details.allSoftwareSystems.length > 0) {
          console.log('Software-Systeme:');
          details.allSoftwareSystems.slice(0, 3).forEach((system, index) => {
            console.log(`  ${index + 1}. ${system.name} (${system.confidence})`);
          });
        }
      }
    }

    // Test 3: Filter-Optionen abrufen
    console.log('\n⚙️ Test 3: Filter-Optionen');
    const [softwareSystems, cities, functions] = await Promise.all([
      codeLookupService.getAvailableSoftwareSystems(),
      codeLookupService.getAvailableCities(),
      codeLookupService.getAvailableCodeFunctions()
    ]);

    console.log('Verfügbare Software-Systeme:', softwareSystems.slice(0, 5));
    console.log('Verfügbare Städte:', cities.slice(0, 5));
    console.log('Verfügbare Code-Funktionen:', functions.slice(0, 5));

    // Test 4: Suche mit Filtern
    if (softwareSystems.length > 0) {
      console.log('\n🎯 Test 4: Gefilterte Suche');
      const filteredResults = await codeLookupService.searchWithFilters('', {
        softwareSystems: [softwareSystems[0]]
      });
      console.log(`Ergebnisse mit Filter "${softwareSystems[0]}": ${filteredResults.length}`);
    }

    console.log('\n✅ Alle Tests erfolgreich abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  }
};

// Script ausführen, wenn direkt aufgerufen
if (require.main === module) {
  testCodeLookup();
}

export default testCodeLookup;
