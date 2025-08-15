# Bilaterale Klärfälle - Benutzerhandbuch

## Einführung

Dieses Handbuch erklärt die Nutzung des Systems für bilaterale Klärfälle in Willi-Mako. Das System unterstützt Sie dabei, strukturiert und nachvollziehbar Probleme mit Marktpartnern zu bearbeiten - von der ersten Problemstellung bis zur finalen Lösung.

## Zugang zum System

1. Melden Sie sich bei Willi-Mako an
2. Navigieren Sie in der Sidebar zu **"Bilaterale Klärung"**
3. Sie sehen vier Hauptbereiche:
   - **Meine Klärfälle**: Ihre persönlichen Fälle
   - **Team-Klärfälle**: Mit dem Team geteilte Fälle
   - **Dashboard**: Übersicht und Statistiken
   - **Workflow Demo**: Interaktive Schulung

## Neuen Klärfall erstellen

### Schritt 1: Grunddaten eingeben
1. Klicken Sie auf **"Neuer Klärfall"**
2. Geben Sie einen aussagekräftigen **Titel** ein
3. Beschreiben Sie das Problem detailliert in der **Beschreibung**

### Schritt 2: Marktpartner auswählen
1. Geben Sie den **Marktpartner-Code** ein (z.B. "9900123456789")
2. Das System lädt automatisch die Firmendaten
3. Wählen Sie die relevante **Marktrolle** (LF, VNB, MSB, etc.)
4. Bestätigen Sie den **Kontakt** für diese Rolle

### Schritt 3: DAR eingeben
1. Wählen Sie den **Nachrichtentyp** (UTILMD, ORDERS, etc.)
2. Geben Sie die **Datenaustauschreferenz (DAR)** ein
3. Das System validiert das Format automatisch

### Schritt 4: Optionale Einstellungen
- **Priorität** festlegen (Niedrig, Mittel, Hoch, Kritisch)
- **Tags** für bessere Kategorisierung hinzufügen
- Fall an **anderen Bearbeiter** zuweisen (optional)

### Schritt 5: Erstellen
Klicken Sie auf **"Klärfall erstellen"** - der Fall wird angelegt und ist sofort bearbeitbar.

## Klärfall bearbeiten

### Klärfall öffnen
1. Klicken Sie in der Liste auf einen Klärfall
2. Das Detailfenster öffnet sich
3. Sie sehen alle relevanten Informationen und die Timeline

### Timeline verstehen
Die Timeline zeigt chronologisch alle Aktivitäten:
- **📝 Notizen**: Ihre dokumentierten Erkenntnisse
- **📧 E-Mails**: Versendete und empfangene Nachrichten
- **📎 Anhänge**: Hochgeladene Dokumente
- **🔄 Status-Änderungen**: Workflow-Fortschritt
- **👥 Team-Aktivitäten**: Kommentare und Freigaben

## Workflow-Phasen

### 1. Interne Klärung (Status: INTERNAL)

**Ziel**: Sachstand intern zusammentragen und analysieren

#### Chat nutzen
1. Klicken Sie auf **"Chat öffnen"**
2. Der Chat wird mit Klärfall-Details vorausgefüllt
3. Diskutieren Sie mit dem LLM oder Kollegen
4. Wichtige Erkenntnisse werden als Notizen zurückgeführt

#### Notizen erstellen
1. Klicken Sie auf **"Neue Notiz"** in der Timeline
2. Geben Sie einen **Titel** und **Inhalt** ein
3. Die Notiz wird automatisch mit dem Klärfall verknüpft
4. LLM kann Inhalte strukturieren und aufbereiten

#### Anhänge hinzufügen
1. Ziehen Sie Dateien auf das Upload-Feld oder klicken Sie darauf
2. Unterstützte Formate: PDF, DOC, XLS, Bilder, E-Mails
3. Maximal 5 Dateien à 10MB gleichzeitig
4. Anhänge erscheinen automatisch in der Timeline

### 2. An Marktpartner senden (Status: SEND_TO_PARTNER)

**Ziel**: Qualifizierte Anfrage an den Marktpartner versenden

#### LLM-E-Mail generieren
1. Klicken Sie auf **"An Marktpartner senden"**
2. Das System generiert einen E-Mail-Vorschlag
3. Alle Klärfall-Informationen werden berücksichtigt
4. Professionelle Formulierung mit Fachterminologie

#### E-Mail bearbeiten und versenden
1. **Betreff** und **Inhalt** können angepasst werden
2. **Empfänger** wird automatisch aus Marktpartner-Daten gesetzt
3. **Anhänge** optional hinzufügen
4. Wählen Sie eine Option:
   - **"Direkt senden"**: E-Mail wird sofort versendet
   - **"Bereits gesendet"**: Status wird aktualisiert (manueller Versand)
   - **"Abbrechen"**: Zurück zur internen Klärung

### 3. Antwort verarbeiten (Status: SENT)

**Ziel**: Partner-Antwort bewerten und nächste Schritte einleiten

#### Nach Erhalt einer Antwort
1. Der Status bleibt auf "SENT" bis Sie reagieren
2. Fügen Sie die Antwort als E-Mail-Record hinzu
3. Bewerten Sie die Antwort in einer Notiz

#### Entscheidung treffen
1. **"Antwort schließen"**: Problem ist gelöst
2. **"Interne Klärung fortsetzen"**: Weitere Bearbeitung nötig
3. **"Neue Anfrage"**: Erneute Kommunikation erforderlich

## Team-Funktionen

### Klärfall für Team freigeben
1. Öffnen Sie den Klärfall
2. Klicken Sie auf **"Für Team freigeben"**
3. Alle Team-Mitglieder können den Fall einsehen
4. Team-Kommentare sind möglich

### Team-Kommentare
1. In geteilten Fällen können Kollegen kommentieren
2. **@-Mentions** für direkte Benachrichtigungen
3. Verschachtelte Antworten auf Kommentare
4. Automatische Benachrichtigungen an Beteiligte

### Team-Klärfälle anzeigen
1. Wechseln Sie zum Tab **"Team-Klärfälle"**
2. Sehen Sie alle freigegebenen Fälle Ihres Teams
3. Filtern nach Status, Priorität, etc.
4. Eigene Beiträge zu fremden Fällen leisten

## Erweiterte Funktionen

### Filter und Suche
- **Status-Filter**: Nur offene, geschlossene, etc. Fälle
- **Priorität**: Nach Dringlichkeit filtern
- **Marktpartner**: Spezifische Partner-Fälle
- **Zeitraum**: Erstellungs- oder Fälligkeitsdatum
- **Volltext-Suche**: In Titel und Beschreibung

### Überfällige Fälle
- Automatische Kennzeichnung überfälliger Fälle
- Dashboard zeigt Übersicht aller überfälligen Fälle
- E-Mail-Benachrichtigungen (falls konfiguriert)

### Export-Funktionen
- Excel-Export der Klärfall-Liste
- PDF-Export einzelner Klärfälle
- Umfassende Berichte für Management

## Tipps für effiziente Nutzung

### Best Practices
1. **Aussagekräftige Titel**: Beschreiben Sie das Problem in wenigen Worten
2. **Detaillierte Beschreibung**: Je mehr Kontext, desto bessere LLM-Unterstützung
3. **Regelmäßige Notizen**: Dokumentieren Sie Zwischenschritte
4. **Tags nutzen**: Erleichtern das spätere Wiederfinden
5. **Team einbeziehen**: Bei komplexen Fällen Kollegen hinzuziehen

### Häufige Fehler vermeiden
- **Unvollständige DAR**: Achten Sie auf korrekte Format-Eingabe
- **Falsche Marktrolle**: Prüfen Sie die Zuständigkeit beim Partner
- **Fehlende Dokumentation**: Notieren Sie alle wichtigen Schritte
- **Verspätete Bearbeitung**: Nutzen Sie Fälligkeitsdaten und Erinnerungen

### Keyboard-Shortcuts
- **Strg + N**: Neuen Klärfall erstellen
- **Strg + F**: Suche aktivieren
- **Strg + R**: Liste aktualisieren
- **Esc**: Modale Dialoge schließen

## Problemlösung

### Häufige Probleme

#### "Marktpartner nicht gefunden"
- Prüfen Sie den eingegebenen Code auf Schreibfehler
- Verwenden Sie den vollständigen 13-stelligen Code
- Kontaktieren Sie Admin, falls Partner fehlt

#### "DAR-Format ungültig"
- Jeder Nachrichtentyp hat spezifische Format-Anforderungen
- UTILMD: 15-stellig numerisch
- ORDERS: Alphanumerisch, variabel
- Bei Unsicherheit: Workflow-Demo konsultieren

#### "E-Mail kann nicht gesendet werden"
- Prüfen Sie die Marktpartner-Kontaktdaten
- Stellen Sie sicher, dass eine E-Mail-Adresse hinterlegt ist
- Bei anhaltenden Problemen: IT-Support kontaktieren

#### "Anhang zu groß"
- Maximale Dateigröße: 10MB
- Komprimieren Sie große Dateien
- Nutzen Sie externe Links für sehr große Dokumente

### Support kontaktieren
Bei technischen Problemen oder Fragen:
1. Überprüfen Sie diese Dokumentation
2. Nutzen Sie die integrierte Workflow-Demo
3. Kontaktieren Sie Ihren Team-Lead
4. Wenden Sie sich an den IT-Support

## Workflow-Demo nutzen

Die integrierte Demo ist der beste Weg, das System kennenzulernen:

1. Wechseln Sie zum Tab **"Workflow Demo"**
2. Lesen Sie die Konzept-Erklärungen
3. Folgen Sie dem interaktiven Stepper
4. Erstellen Sie einen Test-Klärfall
5. Experimentieren Sie mit allen Funktionen

Die Demo verwendet echte System-Funktionen, aber in einem sicheren Testmodus.

---

**Erstellt**: 15. August 2025  
**Version**: 1.0  
**Zielgruppe**: Endbenutzer in der Marktkommunikation  
**Support**: IT-Team Willi-Mako
