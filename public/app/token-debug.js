/**
 * Debug-Script zur Überprüfung der Token-Funktionalität
 * Kann in der Browser-Console ausgeführt werden
 */

// Debug-Funktionen für die Browser-Console
window.tokenDebug = {
  // Aktueller Token-Status
  status() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ Kein Token gefunden');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = payload.exp - now;
      
      console.log('🔍 Token-Analyse:');
      console.log('📝 Token vorhanden:', token.length, 'Zeichen');
      console.log('👤 Benutzer:', payload.email);
      console.log('🏢 Rolle:', payload.role);
      console.log('⏰ Ablauf:', new Date(payload.exp * 1000).toLocaleString());
      console.log('⏳ Verbleibend:', Math.floor(timeLeft / 60), 'Minuten');
      console.log('✅ Gültig:', timeLeft > 0 ? 'Ja' : 'Nein');
      
      if (timeLeft > 0 && timeLeft < 300) {
        console.warn('⚠️ Token läuft in weniger als 5 Minuten ab!');
      }
      
      return {
        valid: timeLeft > 0,
        expiresIn: timeLeft,
        user: {
          email: payload.email,
          role: payload.role,
          id: payload.id
        }
      };
    } catch (error) {
      console.error('❌ Token-Dekodierung fehlgeschlagen:', error);
    }
  },

  // Token manuell setzen (für Tests)
  setToken(token) {
    if (!token) {
      console.error('❌ Token ist erforderlich');
      return;
    }
    
    localStorage.setItem('token', token);
    console.log('✅ Token gesetzt');
    this.status();
  },

  // Token löschen
  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('activeTimelineId');
    console.log('🗑️ Token und Timeline gelöscht');
  },

  // Alle Auth-Daten anzeigen
  showAuthData() {
    console.log('📊 LocalStorage Auth-Daten:');
    console.log('🔑 Token:', localStorage.getItem('token') ? 'Vorhanden' : 'Nicht vorhanden');
    console.log('📋 Timeline:', localStorage.getItem('activeTimelineId') || 'Keine');
    
    // Weitere Auth-relevante Keys prüfen
    const authKeys = ['token', 'activeTimelineId', 'user', 'authToken'];
    authKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`📁 ${key}:`, value.length > 50 ? `${value.substring(0, 50)}...` : value);
      }
    });
  },

  // API-Test mit aktuellem Token
  async testAPI() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Kein Token für API-Test vorhanden');
      return;
    }

    console.log('🔄 Teste API-Verbindung...');
    
    try {
      const response = await fetch('/api/v2/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API-Test erfolgreich');
        console.log('👤 Profil:', data.data);
        return data;
      } else {
        console.error('❌ API-Test fehlgeschlagen:', response.status, response.statusText);
        
        if (response.status === 401) {
          console.warn('🔒 Token ungültig - sollte gelöscht werden');
        }
      }
    } catch (error) {
      console.error('❌ API-Test Fehler:', error);
    }
  },

  // Lokale Token-Validierung vs Server-Validierung
  async compareValidation() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Kein Token für Vergleich vorhanden');
      return;
    }

    // Lokale Validierung
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const localValid = payload.exp > now;
      
      console.log('🏠 Lokale Validierung:', localValid ? '✅ Gültig' : '❌ Abgelaufen');
      
      // Server-Validierung
      const serverValid = await this.testAPI();
      
      console.log('🌐 Server-Validierung:', serverValid ? '✅ Gültig' : '❌ Ungültig');
      
      if (localValid !== !!serverValid) {
        console.warn('⚠️ Validierung unterschiedlich! Mögliche Ursachen:');
        console.warn('- Server-Zeit unterscheidet sich von lokaler Zeit');
        console.warn('- Token wurde server-seitig invalidiert');
        console.warn('- Netzwerk-Probleme');
      }
      
      return {
        local: localValid,
        server: !!serverValid,
        match: localValid === !!serverValid
      };
    } catch (error) {
      console.error('❌ Validierungs-Vergleich fehlgeschlagen:', error);
    }
  },

  // Simuliere Token-Ablauf (für Testing)
  simulateExpiry() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Kein Token zum Simulieren vorhanden');
      return;
    }

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      // Setze Ablaufzeit auf jetzt - 1 Minute
      payload.exp = Math.floor(Date.now() / 1000) - 60;
      
      // Erstelle neuen Token (Warnung: Signatur wird ungültig!)
      const newPayload = btoa(JSON.stringify(payload));
      const expiredToken = `${parts[0]}.${newPayload}.${parts[2]}`;
      
      localStorage.setItem('token', expiredToken);
      console.log('⏰ Token-Ablauf simuliert (Signatur ungültig für Server-Tests)');
      this.status();
      
      console.warn('⚠️ Hinweis: Signatur ist nun ungültig - nur für lokale Tests geeignet');
    } catch (error) {
      console.error('❌ Simulation fehlgeschlagen:', error);
    }
  },

  // Hilfe anzeigen
  help() {
    console.log('🛠️ Token Debug Funktionen:');
    console.log('📊 tokenDebug.status() - Zeigt Token-Status');
    console.log('🔑 tokenDebug.setToken(token) - Setzt Token manuell');
    console.log('🗑️ tokenDebug.clearToken() - Löscht Token');
    console.log('📁 tokenDebug.showAuthData() - Zeigt alle Auth-Daten');
    console.log('🔄 tokenDebug.testAPI() - Testet API mit aktuellem Token');
    console.log('⚖️ tokenDebug.compareValidation() - Vergleicht lokale vs Server-Validierung');
    console.log('⏰ tokenDebug.simulateExpiry() - Simuliert Token-Ablauf');
    console.log('❓ tokenDebug.help() - Zeigt diese Hilfe');
  }
};

// Beim Laden automatisch Status anzeigen
console.log('🚀 Token Debug Tools geladen');
console.log('💡 Verwende tokenDebug.help() für verfügbare Befehle');
console.log('');
window.tokenDebug.status();
