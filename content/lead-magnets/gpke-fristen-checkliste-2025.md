# GPKE-Fristen-Checkliste 2025

**Für Sachbearbeiter Marktkommunikation · Netzbetreiber · Messstellenbetreiber · Lieferanten**

---

## Einleitung

Die GPKE (Geschäftsprozesse zur Kundenbelieferung mit Elektrizität) ist ein von der Bundesnetzagentur (BNetzA) festgelegter Rahmen, der die Regeln und Prozesse für die Marktkommunikation zwischen den Akteuren des deutschen Strommarktes definiert. Sie stellt sicher, dass der Wechsel von Stromlieferanten, die Abwicklung von Umzügen und andere kundenbezogene Prozesse reibungslos, transparent und diskriminierungsfrei ablaufen.

### Warum sind Fristen kritisch?

Die Einhaltung der in der GPKE definierten Fristen ist von entscheidender Bedeutung:

*   **Rechtssicherheit und Compliance:** Nichteinhaltung kann zu Bußgeldern führen
*   **Prozessstabilität:** Verzögerungen lösen Kaskadeneffekte aus
*   **Kundenorientierung:** Endkunden erwarten nahtlose Übergänge
*   **Datenqualität:** Pünktliche Daten = fehlerfreie Bilanzierung
*   **Wettbewerb:** Faire Bedingungen für alle Marktteilnehmer

---

## 1. Lieferantenwechsel

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Anmeldung beim NB** | T+1 | LF (neuer) | Neuer Lieferant meldet Belieferung beim Netzbetreiber an | Falsche MaLo-ID, fehlende Kundendaten |
| **Prüfung und Bestätigung durch NB** | T+1 nach Anmeldung | NB | Netzbetreiber prüft technische Machbarkeit und bestätigt | Verzögerung durch Rückfragen |
| **Information an LF (alter)** | Unverzüglich | NB | Netzbetreiber informiert alten Lieferanten über Wechsel | Falsche oder verspätete Kommunikation |
| **Zustimmung/Ablehnung LF (alt)** | T+1 nach Information | LF (alter) | Alter Lieferant kann Wechseltermin ablehnen (z.B. laufender Vertrag) | Fehlende Vertragsdetails |
| **Abmeldung durch LF (alt)** | T+6 nach NB-Info | LF (alter) | Alter Lieferant meldet Vertragsende | Versäumte Frist = 24h-Wechsel |
| **Lieferbeginn** | Am Wunschtermin oder T+1 nach Fristablauf | LF (neuer) | Neuer Lieferant beginnt Belieferung | Stammdaten-Inkonsistenzen |
| **Abschlussrechnung LF (alt)** | 6 Wochen nach Vertragsende | LF (alter) | Abrechnung der bis zum Wechsel gelieferten Energie | Fehlerhafte Zählerstände |

### Best Practices Lieferantenwechsel
- ✅ MaLo-ID vor Anmeldung beim NB verifizieren
- ✅ Automatische Fristen-Tracker implementieren
- ✅ Schnittstellen-Monitoring für UTILMD/MSCONS
- ✅ Vertragsende-Datum immer mit Kunden abgleichen
- ✅ Backup-Prozesse für Fristversäumnis definieren

---

## 2. End-of-Gas/Strom (EoG)

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Abmeldung EoG** | Unverzüglich | LF | Lieferant meldet Ende der Belieferung (z.B. Auszug) | Verspätete Kundenmeldung |
| **Bestätigung NB** | T+1 | NB | Netzbetreiber bestätigt Erhalt der Abmeldung | - |
| **Abschluss-Zählerstand** | Am Auszugstag | MSB | Zählerstand wird erfasst (Kunde anwesend oder geschätzt) | Kunde nicht erreichbar |
| **Übermittlung Zählerstand** | T+6 nach Ablesung | MSB | MSB sendet finalen Zählerstand an LF | Verzögerung durch manuelle Ablesung |
| **Abschlussrechnung** | 6 Wochen nach EoG | LF | Rechnung auf Basis Abschluss-Zählerstand | Fehlerhafte Schätzungen |

### Best Practices EoG
- ✅ Kundenkommunikation: Auszugstermin frühzeitig erfragen
- ✅ MSB rechtzeitig über geplanten Termin informieren
- ✅ Schätzwert-Logik im System hinterlegen (falls Ablesung nicht möglich)
- ✅ Automatische Benachrichtigung bei fehlendem Zählerstand nach T+7

---

## 3. Sperrprozess

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Sperrankündigung an Kunde** | 4 Wochen vor Sperrung | LF | Lieferant kündigt Sperrung wegen Zahlungsverzug an | Rechtliche Anforderungen nicht erfüllt |
| **Sperrankündigung an NB** | 8 Werktage vor Sperrung | LF | Lieferant informiert NB über bevorstehende Sperrung | Falsche MaLo-ID |
| **Sperrauftrag an MSB** | 4 Werktage vor Sperrung | NB | Netzbetreiber leitet Sperrauftrag an MSB weiter | Verzögerung in Weiterleitung |
| **Durchführung Sperrung** | Am angekündigten Termin | MSB | Physische oder elektronische Sperrung des Zählpunkts | Technische Probleme vor Ort |
| **Benachrichtigung LF** | Unverzüglich | MSB | MSB bestätigt erfolgte Sperrung an NB → NB an LF | Fehlende Rückmeldung |

### Best Practices Sperrprozess
- ✅ Alle rechtlichen Voraussetzungen prüfen (EnWG §19)
- ✅ Fristen-Kalender führen (Sperrankündigung ≠ Sperrtermin)
- ✅ Zahlungseingang bis letzter Werktag vor Sperrung prüfen
- ✅ Notfallprozess für Härtefälle (Krankheit, etc.)
- ✅ Sofortige Systemmeldung bei fehlgeschlagener Sperrung

---

## 4. Entsperrprozess

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Zahlungseingang bestätigt** | Sofort | LF | Lieferant stellt Zahlung fest | Verzögerung durch Zahlungsabgleich |
| **Entsperrauftrag an NB** | Unverzüglich | LF | Lieferant beauftragt NB mit Entsperrung | Fehlende Auftragsdetails |
| **Entsperrauftrag an MSB** | Unverzüglich | NB | NB leitet Auftrag an MSB weiter | - |
| **Durchführung Entsperrung** | 2 Werktage | MSB | MSB entsperrt Zählpunkt wieder | Technische Probleme, Kunde nicht anwesend |
| **Bestätigung Entsperrung** | Unverzüglich | MSB | MSB bestätigt Entsperrung an NB → NB an LF | Fehlende Statusmeldung |

### Best Practices Entsperrprozess
- ✅ 24/7-Erreichbarkeit für dringende Fälle
- ✅ Automatisches Triggering bei Zahlungseingang
- ✅ Kunde vorab über Entsperrungs-Termin informieren
- ✅ Eskalationsprozess für überschrittene 2-Tages-Frist

---

## 5. Abmeldung

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Abmeldung vom NB** | T+1 vor Vertragsende | LF | Lieferant meldet Ende der Belieferung | Falsche Abmeldedatum |
| **Bestätigung NB** | T+1 | NB | Netzbetreiber bestätigt Abmeldung | - |
| **Information an MSB** | Unverzüglich | NB | NB informiert MSB über Vertragsende | Verzögerte Kommunikation |
| **Abschluss-Zählerstand** | Am Vertragsende | MSB | MSB erfasst finalen Zählerstand | Terminverwechslung |
| **Übermittlung Werte** | T+6 | MSB | Zählerstände an NB → NB an LF | Fehlende oder falsche Werte |

### Best Practices Abmeldung
- ✅ Vertragsende immer im Kalender markieren (T-7 Alert)
- ✅ Parallele Abmeldung + Anmeldung bei Wechsel koordinieren
- ✅ Zählerstand doppelt prüfen (Plausibilität)
- ✅ MSCONS-Nachricht zeitnah erwarten

---

## 6. Stammdaten-Synchronisation

| Prozessschritt | Frist (Kalendertage) | Verantwortlicher | Beschreibung | Häufige Fehlerquellen |
|----------------|---------------------|------------------|--------------|----------------------|
| **Stammdaten-Änderung erfassen** | Unverzüglich | NB/MSB | Änderung (z.B. Zählertausch, Umzug) wird im System erfasst | Fehlerhafte Dateneingabe |
| **UTILMD-Nachricht senden** | T+1 | NB/MSB | Änderungen per UTILMD an betroffene Marktpartner | Falsche Empfängerliste |
| **Bestätigung/Ablehnung** | T+1 nach Empfang | Empfänger | Marktpartner sendet APERAK/CONTRL | Syntaxfehler in UTILMD |
| **Korrektur bei Fehler** | T+1 nach Ablehnung | NB/MSB | Fehlerhafte Daten korrigieren und erneut senden | Verzögerung durch Rückfragen |
| **Synchronisation abgeschlossen** | T+3 nach erster Meldung | Alle | Alle Systeme haben konsistente Daten | Asynchronität zwischen Systemen |

### Best Practices Stammdaten-Synchronisation
- ✅ Validierung vor UTILMD-Versand (EDIFACT-Syntax + Geschäftslogik)
- ✅ Monitoring für APERAK/CONTRL-Fehler
- ✅ Automatische Retry-Logik bei Ablehnung
- ✅ Master-Data-Management-Tool nutzen
- ✅ Regelmäßige Stammdaten-Audits (quartalsweise)

---

## Praxis-Tipps: 5 Best Practices zur Fristeneinhaltung

### 1. **Automatisierte Fristen-Tracker implementieren**
   - **Was:** Softwaregestütztes System, das alle laufenden Prozesse überwacht
   - **Warum:** Menschen vergessen Fristen. Maschinen nicht.
   - **Wie:** Integration mit ERP-System, automatische Eskalation bei T-2 (2 Tage vor Fristablauf)
   - **Tool-Tipp:** Willi-Mako kann GPKE-Fristen automatisch überwachen und Alerts senden

### 2. **Prozess-Checklisten für Mitarbeiter**
   - **Was:** Standardisierte Checklisten für jeden Prozesstyp
   - **Warum:** Reduziert menschliche Fehler, beschleunigt Onboarding
   - **Wie:** Pro Prozess (Lieferantenwechsel, Sperrung, etc.) eine Schritt-für-Schritt-Anleitung
   - **Beispiel:** "Lieferantenwechsel-Checklist: 1. MaLo-ID prüfen → 2. UTILMD senden → 3. APERAK erwarten..."

### 3. **EDIFACT-Monitoring & Validierung**
   - **Was:** Automatische Prüfung aller ein- und ausgehenden Nachrichten
   - **Warum:** Fehlerhafte EDIFACT-Nachrichten verzögern Prozesse massiv
   - **Wie:** Pre-Send-Validierung (UTILMD, MSCONS, etc.) + automatisches Retry bei Fehlern
   - **Kritisch:** APERAK Z17 (Zuordnungsfehler) sofort eskalieren

### 4. **Bilaterale Klärfälle strukturiert managen**
   - **Was:** Zentrale Ticketing-Lösung für alle Klärfälle mit Marktpartnern
   - **Warum:** 30-40% der Fristversäumnisse entstehen durch unklare Stammdaten
   - **Wie:** Jeder Klärfall = ein Ticket. Status, Verantwortlicher, Frist dokumentieren
   - **Eskalation:** Nach 3 Tagen ohne Lösung → Manager informieren

### 5. **Quartalsweise Prozess-Audits**
   - **Was:** Review aller abgeschlossenen Prozesse auf Fristen-Einhaltung
   - **Warum:** Systematische Schwachstellen identifizieren (z.B. "MSB XY bestätigt immer 2 Tage zu spät")
   - **Wie:** KPIs tracken: Durchschnittliche Bearbeitungszeit, Fristversäumnisse, Fehlerquellen
   - **Maßnahme:** Mit auffälligen Marktpartnern bilaterale Prozess-Optimierung vereinbaren

---

## Häufige Fallstricke

### ❌ **"T+1 gilt ab Erhalt der Nachricht, nicht ab Versand"**
   - **Problem:** Lieferant sendet UTILMD um 23:59 Uhr und erwartet am nächsten Tag Antwort
   - **Lösung:** Zeitstempel der Empfängerseite ist maßgeblich. Buffer einplanen (vor 15:00 Uhr senden)

### ❌ **"Feiertage und Wochenenden verlängern Fristen nicht automatisch"**
   - **Problem:** T+6 fällt auf Sonntag → Team arbeitet Montag daran → zu spät
   - **Lösung:** Kalendertage = inkl. Wochenende. Bei "Werktagen" zählen Sa/So nicht

### ❌ **"Fehlende APERAK-Rückmeldung = implizite Zustimmung?"**
   - **Problem:** UTILMD wurde gesendet, keine Antwort erhalten → Annahme: "ist akzeptiert"
   - **Lösung:** Falsch! Fehlende APERAK = technisches Problem. Nach 2 Tagen nachfassen

### ❌ **"Schätzwerte ohne Dokumentation"**
   - **Problem:** Zählerstand geschätzt, aber keine Notiz hinterlegt → spätere Reklamation nicht nachvollziehbar
   - **Lösung:** Jeder Schätzwert muss im System dokumentiert werden (wer, wann, warum)

### ❌ **"Parallele Prozesse ohne Koordination"**
   - **Problem:** Lieferantenwechsel + Umzug gleichzeitig → doppelte Abmeldungen, Chaos
   - **Lösung:** Zentrale Prozess-Orchestrierung. Ein Prozess wartet auf Abschluss des anderen

---

## Automatisierungs-Möglichkeiten mit Willi-Mako

### 🤖 **GPKE-Fristen automatisch überwachen**
   Willi-Mako kann für jeden laufenden Prozess die Fristen tracken und dich rechtzeitig warnen.

### 🤖 **EDIFACT-Nachrichten vor Versand validieren**
   UTILMD, MSCONS, ORDERS werden automatisch auf Syntax- und Inhaltsfehler geprüft.

### 🤖 **APERAK/CONTRL-Fehler sofort erklären**
   Z17, Z19, Z42 Fehlercodes werden analysiert und Lösungsvorschläge gegeben.

### 🤖 **Bilaterale Klärfälle dokumentieren**
   Alle Kommunikationen mit Marktpartnern zentral speichern und nach Typ kategorisieren.

### 🤖 **Automatische Eskalation bei Fristversäumnis**
   Wenn ein Marktpartner nach T+3 nicht reagiert, wird automatisch eine Eskalation ausgelöst.

**→ [Willi-Mako 14 Tage kostenlos testen](https://stromhaltig.de/app/register)**

---

## Checkliste: Vor jedem Prozess (zum Ausdrucken)

```
□ MaLo-ID / MeLo-ID validiert?
□ Kundendaten vollständig & aktuell?
□ Vertragsdetails geprüft (Start-/Enddatum)?
□ Zuständiger Netzbetreiber / MSB identifiziert?
□ Fristen-Kalender gepflegt?
□ Automatische Alerts für diesen Prozess aktiviert?
□ EDIFACT-Nachrichten vorbereitet und validiert?
□ Backup-Plan bei Fristversäumnis definiert?
□ Relevante Marktpartner informiert?
□ Dokumentation für späteren Audit vollständig?
```

---

## Weiterführende Ressourcen

- **GPKE Festlegung:** Bundesnetzagentur BK6-22-024
- **EDIFACT-Formate:** edi@energy Nachrichtenformate
- **Schulungen:** [training.stromhaltig.de](https://training.stromhaltig.de/)
- **KI-Unterstützung:** [Willi-Mako App](https://stromhaltig.de/app)

---

**Stand:** November 2025  
**Herausgeber:** STROMDAO GmbH / Willi-Mako  
**Kontakt:** support@stromhaltig.de

---

*Diese Checkliste dient als praktische Arbeitshilfe und ersetzt nicht die Lektüre der offiziellen GPKE-Festlegung und ihrer Anlagen. Bei Abweichungen zwischen diesem Dokument und den offiziellen BNetzA-Veröffentlichungen sind letztere maßgeblich.*
