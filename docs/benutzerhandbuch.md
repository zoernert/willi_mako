# Willi‑Mako Benutzerhandbuch – Praxisleitfaden für die Marktkommunikation

> Zielgruppe: Sachbearbeiter Marktkommunikation, Teamleiter, Prozess-/IT‑Verantwortliche in EVU und Dienstleistern. Einsatz als öffentliches Praxis‑Handbuch und Entscheidungsgrundlage. Preisorientierung: ab 199–200 € pro Nutzer/Monat. Wissensbasis: kuratierte Inhalte in einer optimierten Qdrant‑Collection.

## Warum dieses Handbuch?
Die Marktkommunikation der Energiewirtschaft ist durch hohe Prozessdisziplin, strenge Fristen und standardisierte Formate (z. B. EDIFACT/EDM, AS4/ebMS3, BDEW‑Prozesse) geprägt. Fehler bedeuten Aufwand, Pönalen oder Erlösrisiken. Willi‑Mako unterstützt hier mit praxiserprobten Funktionen, die Fachwissen direkt in die Bearbeitung bringen – ohne Tool‑Bruch.

Dieses Handbuch zeigt für jeden Funktionsbereich:
- Problem: typischer Painpoint aus der Praxis
- Lösungsweg: wie Willi‑Mako die Aufgabe abbildet
- Praxisbezug: konkretes Szenario, Schritt‑für‑Schritt

---

## Grundlagen der Marktkommunikation (Überblick)
- Rechts-/Regelwerke: BDEW‑Prozessbeschreibungen (u. a. GPKE, WiM, MaBiS), Festlegungen der BNetzA, Vorgaben zu AS4/ebMS3 (MPES), EDI@Energy, ENTSO‑E EIC‑System.
- Formate & Inhalte: EDIFACT (z. B. UTILMD, MSCONS, INVOIC, REMADV), XML/AS4‑Payloads, CSV‑Exporte, PDF‑Belege.
- Marktrollen & Stammdaten: LF, NB, ÜNB, Msb; GLN/EIC, Bilanzkreis, Marktpartnerkennungen.
- Prozesse & Fristen: Lieferantenwechsel, Netznutzungsabrechnung, Bilanzierung/Mehr‑/Mindermengen, Messwertkommunikation, Störungs-/Klärfälle.

Hinweis: Willi‑Mako ersetzt kein Gateway – es ergänzt operatives Fachwissen, Prüfungen, Recherche, Dokumentation und Zusammenarbeit um Bearbeitungszeit zu senken und Qualität zu steigern.

---

## Zielgruppen und Rollen in der Anwendung
- Sachbearbeitung Marktkommunikation: Tägliche Vorgangsabwicklung, Nachrichtenanalyse, Fristenverwaltung.
- Teamleitung/Koordination: Aufgabensteuerung, Eskalationsmanagement, Qualitätssicherung und Schulung.
- Fachverantwortliche/Compliance: Regelwerksänderungen bewerten, interne Richtlinien und Vorlagen pflegen.
- IT/Prozess: Schnittstellen, Datenexporte, Monitoring und Audit‑Anforderungen.

Rollenabbildung in Willi‑Mako
- Zugriff über Teams: Rollenbezogene Checklisten, Vorlagen und Ordnerstrukturen
- Sichtbarkeit von Objekten: Team‑geteilte Notizen, Aufgaben und Analysen
- Protokollierung: Chronik pro Vorgang für spätere Nachweise

---

## Fach‑Chat (KI‑gestützter Assistent)
- Problem: Fachfragen entstehen ad‑hoc (z. B. Segmentbedeutung in UTILMD, Fristberechnung, Prozessvariante in WiM). Manuelle Suche kostet Zeit.
- Lösungsweg in Willi‑Mako: Chat greift auf kuratierte, versionierte Wissensquellen in Qdrant zu. Antworten mit Quellenhinweis/Citations; strukturierte Schritte und Verweise auf relevante Paragraphen/Prozessschritte.
- Praxisbezug: „Warum wurde unser Lieferantenwechsel abgelehnt?“ – Chat erklärt den UTILMD‑Fehlercode, zeigt betroffene Datensegmente (z. B. NAD, LOC, RFF), gibt Prüfliste und Standard‑Antworttext für die Gegenstelle aus.

Tipps
- Verwenden Sie präzise Kontexte („Vorgang: Lieferantenwechsel, Fehlercode: …, Nachricht: …“).
- Speichern Sie Antworten als Team‑Notiz oder Vorlage (siehe Teams).

---

## Teams‑Funktion (Wissensverteilung und Übergaben)
- Problem: Wissen sitzt bei Einzelnen; Urlaubs-/Schichtübergaben sind anfällig; Nachverfolgung verstreut über Mails/Fileshares.
- Lösungsweg: Teams bündeln Fälle, Notizen, Checklisten und Vorlagen. Aufgaben mit Zuständigkeit und Fälligkeit; gemeinsame Sammlungen von Chat‑Antworten und Prüfpfaden.
- Praxisbezug: „Routinetasks Lieferantenwechsel täglich“ – Team nutzt vordefinierte Checkliste (Eingangsnachrichten, Ablehnungen, Fristen, Eskalationen), verlinkt Nachrichtenanalyse und generiert Standard‑Kommunikation an Gegenstellen.

Nutzen
- Einheitliche Arbeitsweise, weniger Einarbeitungszeit
- Audit‑sichere Übergaben mit Verlauf und Verantwortlichkeit

---

## Community Hub (Best Practices, Diskussion, Konsultationen)
- Problem: Änderungen (z. B. Mitteilungen, Konsultationen, BDEW‑Updates) wirken sich schnell auf Prozesse aus; Wissen verteilt sich in Silos.
- Lösungsweg: Öffentliche/kuratierte Threads, Praxislösungen, Beispiel‑Mappings und Vorlagen. Konsultationsseiten mit Lesefassung, Download und Handlungsempfehlungen.
- Praxisbezug: „Mitteilung Nr. 53 – API‑Webdienste MaBiS‑Hub“ – Lesefassung im Portal, verlinkte Quellen, empfohlene Maßnahmenliste, Export als PDF/DOCX für interne Freigaben.

---

## Nachrichtenanalyse (EDIFACT/AS4/CSV/PDF)
- Problem: Fehlerklassifizierung in Eingangsnachrichten ist zeitintensiv; wiederkehrende Muster werden nicht konsequent erkannt.
- Lösungsweg: Upload/Einfügen von Nachrichteninhalten. Parser extrahiert Segmente/Elemente, ordnet den Prozess zu, prüft Plausibilitäten und Fristen. Ergebnis mit Fehlerklasse, Ursache, Handlungsempfehlung und optionalen Antworttexten.
- Praxisbezug: MSCONS mit fehlender OBIS‑Kennzahl – Analyse markiert betroffene Stellen, verweist auf Regelwerk, schlägt Korrektur und Kommunikationstext an den Marktpartner vor; Export als Ticket‑Kommentar.

Funktionen im Detail
- Unterstützung typischer Nachrichtentypen (z. B. UTILMD, MSCONS, INVOIC)
- Erkennung wiederkehrender Fehlerbilder; Lernkurve über Team‑Vorlagen
- Fristen‑/Eskalationshinweise in der Ergebnisansicht

Checkliste – Nachrüstbare interne Arbeitsschritte
- Eingangsquellen klären (Gateway, E‑Mail, Portal) und einheitlich ins Tool bringen (Copy‑Paste/Upload)
- Ergebnisarten festlegen: „Sofort korrigieren“, „Nachforderung“, „Rückfrage an MP“, „Monitoring“
- Vorlagen anlegen (z. B. Ablehnungstexte je Fehlerklasse)
- Übergaben ins Ticket‑/ERP‑System definieren (CSV/Kommentar/Link)

---

## EDIFACT Praxisbeispiele

### UTILMD – Lieferantenwechsel (Ablehnung/Annahme)
- Problem: Wechselanmeldung wird abgelehnt, Grund unklar; Rückfragen verzögern Fristen.
- Vorgehen in Willi‑Mako: Nachricht einfügen/hochladen → Analyse erkennt Prozesskontext (Wechsel), Segment‑Hinweise (z. B. NAD, LOC, RFF, DTM) und häufige Ablehnungsgründe (z. B. Zählpunkt unbekannt, Zeitraum kollidiert, Stammdateninkonsistenz).
- Praxis‑Schritte:
	1) Analyse öffnen → markierte Segmente prüfen (betroffene RFF/DTM).
	2) „Handlungsempfehlung“ übernehmen (z. B. Korrektur der Zuordnung, Nachfrage an NB) und als Team‑Aufgabe speichern.
	3) Optional: Standardkommunikation erzeugen und an Gegenstelle senden.

Hinweise
- Häufige Ablehnung: Zählpunkt-ID abweichend, Stammdateninkonsistenz (PLZ, Hausnr.), Lieferbeginn/Ende kollidiert.
- Achten Sie auf RFF-Referenzen (z. B. Z19/Z13) und DTM‑Zeiten (Zeitzone, Periodizität).

### MSCONS – Messwerte (Plausibilitäten/OBIS)
- Problem: Unplausible/fehlende OBIS‑Werte; Abrechnung blockiert.
- Vorgehen in Willi‑Mako: MSCONS analysieren → OBIS‑Kennzahl und Messzeitraum prüfen; Lücken/Überlappungen und Zeitbezüge hervorheben.
- Praxis‑Schritte:
	1) Ergebnis prüfen: „Fehlende OBIS 1-0:1.8.0“ oder „Zeitraum überlappt“.
	2) Empfohlene Korrektur übernehmen (z. B. Messzeitraum anpassen, Nachforderung beim Msb/NB).
	3) Ticket‑Kommentar/Export nutzen für Drittsysteme.

Hinweise
- OBIS‑Kennzahlen eindeutig halten (1‑0:1.8.0 u. a.), keine Lücken/Überlappungen im DTM‑Zeitraum.
- Messlokationsbezug prüfen (Zählpunkt, Register, Profiltyp bei RLM/SLP).

### ORDERS – Beschaffung/Bestellung (Prozessbezug)
- Problem: Bestellnachricht (ORDERS) muss fachlich geprüft und mit Energiedaten (z. B. Profil/Lastgang) korreliert werden.
- Vorgehen in Willi‑Mako: ORDERS importieren → Strukturprüfung und Feldermapping; optionaler Bezug zu Bilanzkreis/Zeiträumen.
- Praxis‑Schritte:
	1) Pflichtfelder und Referenzen (RFF, NAD) verifizieren.
	2) Abgleich gegen bekannte Stammdaten (z. B. EIC/GLN) über Marktpartnersuche.
	3) Team‑Freigabe und Übergabe in den internen Prozess (z. B. Vertrags-/Bilanzkreismanagement).
Hinweise
- RFF‑Ketten stabil halten (Bestell‑, Vertrags‑, Bilanzkreisreferenz); NAD‑Partner sauber pflegen (GLN/EIC).
- Ordnungskriterien definieren (z. B. pro Bilanzkreis/Periode) für spätere Abgleiche.

---

## Fristberechnungen (Praxis)

Hinweis: Fristen variieren je Prozess/Regelwerksauslegung. Willi‑Mako zeigt im Kontext die jeweils geltenden Stichtage und Eskalationspunkte und berechnet diese automatisch aus der Nachricht/den Stammdaten.

### Lieferantenwechsel
- Typisch: Stichtage ergeben sich aus gewünschtem Lieferbeginn, Meldewegen und Rückmeldefristen der Marktrollen.
- Mit Willi‑Mako: Lieferbeginn erfassen/erkennen → System zeigt Meldefenster, Rückmeldefrist und Eskalationszeitpunkt; Kalender‑Reminder im Team setzen.
- Beispiel: „Lieferbeginn 01.MM.“ → Anmeldefenster, Rückmeldefrist NB, ggf. erneute Anmeldung bei Ablehnung; Darstellung in UTC serverseitig, lokale Anzeige im Client.

Checkliste
- Lieferbeginn, Zählpunkt, bisheriger Lieferant verifizieren
- Meldefenster und Rückmeldefrist bestätigen
- Eskalationszeitpunkt setzen (Team‑Aufgabe/Reminder)

### Grundversorgung
- Typisch: Eintritt/Austritt aus Grundversorgung bei Lieferantenlosigkeit oder Vertragsende; Mitteilungspflichten innerhalb definierter Zeitfenster.
- Mit Willi‑Mako: Auslöser erkennen (z. B. Beendigungsnachricht/keine gültige Zuordnung) → To‑do‑Kette mit Meldezeitpunkten, Dokumentationspflichten und Eskalationshinweisen.

Checkliste
- Auslöser dokumentieren (Lieferantenlosigkeit/Beendigung)
- Mitteilungspflichten und Fristkette anlegen
- Wiedervorlage für Exit aus Grundversorgung

### Netznutzungsabrechnung
- Typisch: Periodische Abrechnung, Fristen für Rechnungsstellung, Einwendungsfrist und Zahlung.
- Mit Willi‑Mako: Eingang der Abrechnung → Fristplan generieren (Prüffrist, Einwendungsfrist, Zahlungsziel); Team‑Aufgaben für Prüfpfad (MSCONS‑Plausibilitäten, Summenvergleich, Bilanzkreisbezug).
Checkliste
- Eingang dokumentieren, Prüffrist setzen
- Summen-/Saldenabgleich, Messwerte (MSCONS), SLP/RLM‑Bezug
- Einwendungsfrist + Zahlungsziel steuern

---

## Marktpartnersuche
- Problem: Richtigen Ansprechpartner/Marktpartnerdaten (GLN/EIC, Rolle, Region, Bilanzkreis) schnell finden – besonders bei Eskalationen.
- Lösungsweg: Suchmaske nach GLN/EIC, Name, Rolle, Region; Anzeige von Kontakten, Kommunikationskanälen, ggf. Zertifikaten/Öffnungszeiten.
- Praxisbezug: „Eskalation REMADV“ – Suche liefert NB‑Kontakt, Telefon und E‑Mail, plus Hinweis auf übliche Antwortzeiten. Direkt in Team‑Aufgabe verlinkbar.

---

## Weitere Funktionen, die in der Praxis helfen
- Wissen/FAQ: Redaktionsgepflegte Antworten mit Prozessbezug; Verlinkung in Chat/Analyse.
- Dokumentenvorlagen: Standardtexte für Ablehnungen/Nachforderungen, exportierbar und im Team teilbar.
- Fristenkalender: Konfigurierbare Fristen/Erinnerungen je Prozess; Übergabe an Teams.
- Audit & Protokoll: Chronik je Fall, exportierbar für Revision.
- Schnittstellen: CSV‑Ex-/Importe, Public‑APIs für spezifische Abfragen (z. B. Community/Konsultationen). Sicherheit gemäß CORS/Rate‑Limits.

KPIs & Monitoring (Beispiele)
- First‑Time‑Fix‑Rate in der Nachrichtenanalyse
- Durchschnittliche Durchlaufzeit je Vorgangstyp
- Ablehnungsquote je Gegenstelle/Fehlerklasse
- Anteil wiederverwendeter Vorlagen/Checklisten

---

## Whitepaper‑Verweise
- Projektinterne Whitepaper fassen Änderungen und Best Practices zusammen (z. B. Konsultationen, Format‑Updates) und sind kontextuell im Chat, in Artikeln und in der Nachrichtenanalyse verlinkt.
- Nutzung: Bei komplexen Änderungen (z. B. AS4‑Anpassungen, MaBiS/GPKE‑Updates) direkt aus dem Ergebnisfenster zum passenden Whitepaper springen.

Empfohlene Whitepaper
- Stammdaten Navigator: Grundlagen und Praxis von Stamm‑/Prozessdaten, Prüfroutinen und Datenhygiene für UTILMD und Folgeprozesse. → /whitepaper/stammdaten_navigator
- MaBiS‑Hub: API‑Webdienste und prozessuale Einbettung im MaBiS‑Kontext; Auswirkungen auf Messwerte/Abrechnung und Fristen. → /whitepaper/mabis-hub

---

## Onboarding und Betrieb
- Start in 1 Tag: Zugang anfordern, Benutzer anlegen, Teamstruktur definieren.
- Datenquellen: Nachrichten können ad‑hoc analysiert werden; optionale Verknüpfung mit bestehenden Tools via Export/Copy‑Paste.
- Schulung: 60‑Min‑Kickoff und Rollen‑basierte Kurztrainings. Meist reicht das Handbuch + In‑App‑Hinweise.
- Sicherheit: Zugriffskontrollen, Protokollierung, serverseitige Verarbeitung in UTC; sensible Felder werden nicht ungefragt geloggt.

Compliance & Sicherheit
- CORS/Rate‑Limits für Public‑APIs; keine unnötige Protokollierung sensibler Inhalte
- Zeitverarbeitung serverseitig in UTC; clientseitige Darstellung lokalisiert
- Öffentliche Routen (`/api/public/*`) bleiben ohne Authentifizierung, interne Funktionen geschützt

---

## Wirtschaftlichkeit (Beispielrechnung)
- Lizenz: ab 199–200 € pro Nutzer/Monat.
- Einsparungen: 10 Minuten pro Fall bei 150 Fällen/Monat ≈ 25 Std./Monat – bereits ein Nutzer amortisiert sich i. d. R. in < 4 Wochen.
- Zusatznutzen: Geringere Fehlerquoten, schnellere Einarbeitung, bessere Nachweisdokumentation.

---

## Häufige Praxisfragen (Kurz‑FAQ)
- „Kann ich Nachrichten ohne EDIFACT‑Kenntnisse analysieren?“ – Ja, die Analyse erklärt Struktur/Segmente und gibt Handlungsoptionen.
- „Wie bleiben wir prozesskonform?“ – Inhalte folgen BDEW/BNetzA‑Regelwerken; Antworten enthalten Quellen/Normbezüge.
- „Wie teilen wir Wissen im Team?“ – Antworten/Checklisten als Team‑Notizen speichern, Aufgaben verlinken, Übergaben mit Verlauf.
- „Welche Daten speichert Willi‑Mako?“ – Prozessnotizen, Teamobjekte und Analyseergebnisse laut Sicht; sensible Daten nur zweckgebunden.

---

## Jetzt starten
- 7 Tage kostenfrei und unverbindlich testen: https://stromhaltig.de/app/login
- Beratung anfragen: Nutzen Sie den Chat auf der Startseite oder kontaktieren Sie uns über die Impressum‑Daten.

> Stand: automatisch generiert aus kuratierten Inhalten. Änderungen in den Regelwerken (BDEW/BNetzA/EDI@Energy) werden laufend in der Wissensbasis berücksichtigt.

---

## Glossar (Auswahl)
- EDIFACT: Nachrichtenstandard mit Segmenten/Datenelementen, z. B. UTILMD (Stammdaten), MSCONS (Messwerte), INVOIC (Rechnung)
- OBIS: Kennzeichnung von Messgrößen (z. B. 1‑0:1.8.0)
- RFF/NAD/DTM: Referenz‑, Partner‑, Datums/Zeit‑Segmente
- GPKE/WiM/MaBiS: Prozessrahmen in der Marktkommunikation
- GLN/EIC: Identifikatoren für Marktpartner/Bilanzkreise
