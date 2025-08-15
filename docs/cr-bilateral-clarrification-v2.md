Ihre Präzisierung ist entscheidend für die korrekte Umsetzung. Die Anforderung, dass die E-Mail-Verarbeitung über ein externes IMAP-Postfach pro Team konfiguriert werden muss, wird dem Change Request hinzugefügt. Dies stellt sicher, dass die Trennung der Marktpartnerteams auch auf der technischen Ebene der E-Mail-Verarbeitung gewährleistet ist.

***

### 📝 Change Request für Willi-Mako: Optimierung des bilateralen Klärfall-Workflows

**CR-ID:** CR-WMAKO-001
**Titel:** Optimierung des bilateralen Klärfall-Workflows durch automatisierte Prozesse und verbesserte Datenextraktion
**Autor:** Willi-Mako Development Team
**Datum:** 15. August 2025

#### 1. Automatisierte E-Mail-Verarbeitung und Fall-Erkennung (IMAP-Integration)

Um manuelle E-Mail-Weiterleitungen zu minimieren und den Prozess zu beschleunigen, soll eine automatisierte Überwachung von E-Mail-Postfächern ermöglicht werden.

* **Funktion:** Das System soll die Möglichkeit bieten, ein externes IMAP-Postfach pro Team zu konfigurieren und automatisch auf neue Nachrichten zu scannen.
* **Logik:** E-Mails, die eine Dar-Nummer, eine MaLo-ID oder eine Vertragsnummer im Betreff oder Text enthalten, sollen als potenzieller Klärfall erkannt werden.
* **LLM-Integration:** Die vorhandene LLM-Funktion soll erweitert werden, um aus dem E-Mail-Text die relevanten Referenzen wie Dar-Nummer, MaLo-ID, oder andere Vertragsnummern zu extrahieren.
* **Prozess:** Bei Erkennung wird automatisch ein neuer Klärfall erstellt. Der Betreff der E-Mail wird zum Titel, der Inhalt zur Beschreibung und die E-Mail selbst wird als erster Eintrag in der Timeline hinterlegt. Der Absender wird als Marktpartner identifiziert und der Fall wird dem Team zugeordnet, dem das E-Mail-Postfach zugeordnet ist.
* [cite_start]**Bezug zu realen Fällen:** Dies adressiert Fälle wie `fehlende Antwort auf Angebot` [cite: 620-625, 666-671], bei denen die Klärung durch eine externe Partei initiiert wird.

***

#### 2. Verbesserte Team-Kollaboration und interne Aufgaben

Interne Weiterleitungen sollen als strukturierte Aufgaben im System abgebildet werden, um den Kontextverlust zu verhindern.

* **Funktion:** Wenn eine E-Mail als "interne Aufgabe" erkannt wird (z.B. durch Schlüsselwörter oder durch eine Weiterleitung von internen E-Mail-Adressen an die Klärfall-Mailbox), wird ein interner Klärfall erstellt.
* **Workflow:** Der ursprüngliche E-Mail-Inhalt wird als Problembeschreibung hinterlegt. Der Absender der E-Mail wird als interner Auftraggeber des Falls markiert und automatisch als Beteiligter hinzugefügt, der über Statusänderungen benachrichtigt wird.
* **Ziel:** Die manuelle E-Mail-Kommunikation innerhalb des Teams wird durch einen nachvollziehbaren, systeminternen Workflow ersetzt. Mitarbeiter können direkt im System Notizen, Kommentare und Anhänge zu den internen Aufgaben hinzufügen.
* [cite_start]**Bezug zu realen Fällen:** Dies betrifft Situationen wie `fehlendes Lieferende zu Malo` [cite: 1098-1102] [cite_start]und `fehlende Verträge im Vertrieb` [cite: 1167-1176], bei denen ein Mitarbeiter aus einer anderen Abteilung eine Klärung benötigt.

***

#### 3. Strukturierte Erfassung von Antworten und Datenextraktion

Um manuelle Dateneingabe zu reduzieren, soll die LLM-Integration zur Datenerkennung aus Freitext erweitert werden.

* **Funktion:** Die LLM-Engine soll eingehende E-Mails nach relevanten, strukturierten Informationen durchsuchen, wie zum Beispiel Zählerstände, alte/neue Zählernummern oder Datumsangaben.
* **Benutzeroberfläche:** Diese erkannten Daten werden dem Sachbearbeiter in der Detailansicht des Klärfalls als Vorschläge präsentiert. Der Mitarbeiter kann die erkannten Werte mit einem Klick in die entsprechenden Felder des Klärfalls übernehmen oder manuell korrigieren.
* **Vorteil:** Die Effizienz bei der Datenverarbeitung wird deutlich erhöht und das Risiko von Tippfehlern minimiert. Die Historie des Klärfalls dokumentiert, welche Daten aus welcher E-Mail übernommen wurden.
* [cite_start]**Bezug zu realen Fällen:** Dies ist besonders nützlich für Fälle wie `Zählerwechsel Malo` [cite: 313-314, 374-378, 402-403], bei denen wichtige technische Details im E-Mail-Fließtext kommuniziert werden.

***

#### 4. Flexibles E-Mail-Management pro Team

Die E-Mail-Adresse für den externen Versand muss anpassbar sein.

* **Funktion:** Die E-Mail-Adresse für den Versand externer Anfragen an Marktpartner soll nicht global, sondern pro Team konfigurierbar sein.
* **Pflege:** Ein Team-Administrator kann die E-Mail-Adresse des Teams über einen neuen Einstellungsbereich in der Administrationsoberfläche pflegen.
* **Vorteil:** Die Mitarbeiter können ihre Klärfälle unter einer für ihren Marktpartner relevanten und vertrauenswürdigen E-Mail-Adresse bearbeiten. Dies ist essentiell, da Nutzer von verschiedenen Marktpartnern getrennt kommen können.
* **Architektur:** Dieser neue Konfigurationspunkt wird in der Backend-Tabelle `clarification_team` mit einem neuen Feld `outbound_email_address` umgesetzt.

***

#### 5. Listenbasierte Klärfälle und Sammelbearbeitung

Die Verarbeitung mehrerer Anfragen in einem Kontext soll ermöglicht werden.

* **Funktion:** Ein neuer Klärfall-Typ **"Sammelklärung"** wird eingeführt. Dieser erlaubt die Verwaltung einer Liste von MaLo-IDs oder Dar-Nummern innerhalb eines einzigen Klärfalls.
* **Workflow:** Jeder Eintrag in dieser Liste kann einen eigenen Unterstatus erhalten (z.B. "offen", "in Bearbeitung", "gelöst"). Die Kommunikation mit dem Marktpartner kann gesammelt oder für jeden Unterfall einzeln erfolgen.
* **Vorteil:** Dies verbessert die Übersichtlichkeit bei Massen-Klärungen und ermöglicht eine effiziente Bearbeitung zusammenhängender Anfragen.
* [cite_start]**Bezug zu realen Fällen:** Dieser Punkt ist direkt auf den Fall `fehlende Verträge im Vertrieb` [cite: 1169-1176] zugeschnitten, bei dem mehrere MaLo/MeLo-IDs gleichzeitig abgefragt werden.