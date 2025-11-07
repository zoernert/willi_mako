# H25: Das neue Standard-Haushaltsprofil – 26 Jahre Fortschritt in der Strombilanzierung

**Ein Fachartikel der STROMDAO GmbH**

*Letzte Aktualisierung: November 2025*

---

Am 18. März 2025 hat der BDEW aktualisierte Standardlastprofile für die Strombilanzierung veröffentlicht – die erste grundlegende Überarbeitung seit 1999. Für Verteilnetzbetreiber, EVUs und Stadtwerke bedeutet dies eine historische Zäsur: Nach 26 Jahren stehen modernisierte Profile zur Verfügung, die die tiefgreifenden Veränderungen im deutschen Stromverbrauchsverhalten endlich präzise abbilden. Als Spezialisten für digitale Energie-Infrastruktur beleuchten wir in diesem Fachartikel, was H25 technisch auszeichnet, wie sich die Profile von ihren Vorgängern unterscheiden und welcher Prozess Netzbetreiber bei der Einführung durchlaufen müssen.

## Was ist H25? Die Definition

**H25 ist das aktualisierte Standard-Haushaltsprofil 2025** – der direkte Nachfolger von H0 aus dem Jahr 1999. Die Zahl „25" bezeichnet das Aktualisierungsjahr der BDEW-Veröffentlichung vom 18. März 2025. H25 bildet typische Haushalte ab: Privatkunden nach § 3 Nr. 22 EnWG mit überwiegend Eigenverbrauch im Haushalt oder maximal 10.000 kWh pro Jahr für berufliche, landwirtschaftliche oder gewerbliche Zwecke.

**Für wen H25 NICHT gedacht ist:**
- Haushalte mit PV-Anlagen nutzen **P25** (Prosumer ohne Speicher)
- Haushalte mit PV + Batteriespeicher nutzen **S25** (Prosumer mit Speicher)  
- Kunden mit besonderen Verbrauchseinrichtungen (Speicherheizungen, unterbrechbare Lasten) nutzen **temperaturabhängige Lastprofile (TLP)** oder individuelle Netzbetreiber-Profile

Die regulatorische Grundlage bleibt unverändert: § 12 Abs. 1 StromNZV verpflichtet Verteilnetzbetreiber zur Nutzung von Standardlastprofilen für Kunden ohne registrierende Leistungsmessung (RLM) und ohne intelligente Messsysteme (iMSys) bis 100.000 kWh Jahresverbrauch. Welches Profil konkret genutzt wird, liegt im Ermessen des Netzbetreibers.

## Die BDEW-Veröffentlichung vom 18. März 2025

Der BDEW veröffentlichte die erste grundlegende Überarbeitung der Standardlastprofile seit 1999. Die Aktualisierung, durchgeführt durch die BTU EVU Beratung GmbH, umfasst fünf neue Profile:

### Aktualisierte Standardprofile (Ersatz bestehender Profile)

**H25** ersetzt H0 → Standard-Haushaltsprofil  
- Datenbasis: Top-Down-Ansatz mit Bilanzierungsdaten von 62 Verteilnetzbetreibern (2018/2019)
- Dynamisierung: Ja, temperaturabhängig (wie H0)
- Normierung: 1 Million kWh Jahresverbrauch
- Zeitauflösung: 12 Monate × 3 Tagestypen (Werktag, Samstag, Sonn-/Feiertag) = 36 Typtag-Profile

**G25** ersetzt G0-G6 → Konsolidierung von sieben auf ein Gewerbeprofil  
- Datenbasis: circa 2.000 iMSys-Zeitreihen (2022/2023) von zehn Netzbetreibern
- Dynamisierung: Nein
- Begründung: Moderne Gewerbeprofile zeigen homogeneres Verbrauchsverhalten als 1999

**L25** ersetzt L0-L2 → Konsolidierung von drei auf ein Landwirtschaftsprofil  
- Datenbasis: Erweiterung des alten L0-Profils auf 12 Monate
- Dynamisierung: Nein

### Völlig neue Prosumer-Profile – die eigentliche Revolution

**P25** → Haushalte mit PV-Anlage (ohne Speicher)  
- Datenbasis: 400 iMSys-Zeitreihen (2022-2023)
- Dynamisierung: Ja, obligatorisch
- Besonderheit: Kombinationsprofil (Supply-Oriented Timing + Load-Oriented Timing)

**S25** → Haushalte mit PV-Anlage und Batteriespeicher  
- Datenbasis: 200 iMSys-Zeitreihen (2022-2023)
- Dynamisierung: Ja, obligatorisch
- Besonderheit: Berücksichtigt Eigenverbrauchsoptimierung durch Speicher

**Die revolutionäre Neuerung sind P25 und S25** – erstmals existieren standardisierte Profile für Eigenverbrauch mit bidirektionalen Energieflüssen. Diese Profile tragen der energiewirtschaftlichen Realität von über 3,7 Millionen PV-Dachanlagen Rechnung und ermöglichen präzisere Bilanzierung bei Prosumern. H25 hingegen ist die konservative Evolution: eine überfällige Modernisierung des Basis-Haushaltsprofils.

## Technische Unterschiede: H0 (1999) vs. H25 (2025)

### Datengrundlage und Methodik

**H0 (VDEW 1999):**
- Basiert auf 1.209 Lastgangmessungen aus den Jahren **1981-1997**
- Erhebung durch analoge Ferrariszähler mit manueller Ablesung
- Regionale Stichproben ohne flächendeckende Abdeckung
- Top-Down-Ansatz mit Aggregation von Einzelmessungen

**H25 (BDEW 2025):**
- Basiert auf Bilanzierungsdaten von **62 Verteilnetzbetreibern** aus 2018/2019
- Nutzung digitaler Mess- und Abrechnungssysteme
- Bundesweite, repräsentative Datenbasis
- Verfeinerte statistische Methodik mit Ausreißerbereinigung

### Zeitliche Granularität

**H0:** 3 Jahreszeiten (Winter, Sommer, Übergang) × 3 Tagestypen = **9 Basisprofile**
- Winter: 01.11. - 20.03.
- Sommer: 15.05. - 14.09.
- Übergang: 21.03. - 14.05. und 15.09. - 31.10.

**H25:** 12 Monate × 3 Tagestypen = **36 Typtag-Profile**
- Monatsscharfe Differenzierung eliminiert künstliche Sprünge an Saisongrenzen
- Präzisere Abbildung saisonaler Übergänge (z.B. März-April, September-Oktober)
- Bessere Erfassung von Heizlasten im Frühjahr und Herbst

### Feiertagsbehandlung

**H0:** Generischer Feiertagskalender ohne Bundesland-Differenzierung
- Heilige Drei Könige, Fronleichnam, Reformationstag etc. als Werktag behandelt

**H25:** Bundeslandspezifischer Feiertagskalender nach BDEW-Definition
- Fronleichnam in NRW, Bayern, Baden-Württemberg, Hessen, Rheinland-Pfalz, Saarland → Sonntagsprofil
- Reformationstag in Brandenburg, Bremen, Hamburg, Niedersachsen, etc. → Sonntagsprofil
- Heilige Drei Könige in Bayern, Baden-Württemberg, Sachsen-Anhalt → Sonntagsprofil
- 24.12. und 31.12.: Samstagsprofil (wenn nicht auf Sonntag)

### Dynamisierungsfunktion

Beide Profile nutzen eine temperaturabhängige Dynamisierung zur Abbildung von Heizlasten. Die mathematische Grundstruktur bleibt erhalten:

**Dynamisierungsformel (vereinfacht):**
```
F(t) = [A + B×h(t) + C×h(t)² + D×h(t)³] × SF_Wochentag × SF_Jahreszeit
```

Wobei:
- h(t) = f(T_mittel) = Temperaturabhängige Funktion
- T_mittel = gewichtete Mitteltemperatur der Vortage
- SF = Skalierungsfaktoren für Tagestyp und Saison

**Unterschied in der Parametrisierung:**
- H0: Basiert auf Temperaturregressionen aus 1980er/1990er-Jahren
- H25: Aktualisierte Koeffizienten reflektieren modernen Heizverbrauch (effizientere Geräte, bessere Dämmung)

### Lastgangcharakteristik

**Typischer Werktag H0 (Winter, normiert auf 1000 kWh/Jahr):**
- 06:00 Uhr: 0,048 kW (Morgenspitze beginnt)
- 07:00 Uhr: 0,064 kW (Frühstückszeit, höchster Morgenwert)
- 12:00 Uhr: 0,042 kW (Mittagstief)
- 19:00 Uhr: 0,071 kW (Abendspitze, maximaler Tageswert)
- 23:00 Uhr: 0,029 kW (Abendniedrig)
- 03:00 Uhr: 0,018 kW (Nächtliches Minimum)

**Typischer Werktag H25 (Januar, normiert auf 1000 kWh/Jahr):**
- 06:00 Uhr: 0,051 kW (flacherer Anstieg)
- 07:00 Uhr: 0,059 kW (geringere Morgenspitze)
- 12:00 Uhr: 0,046 kW (höheres Mittagsniveau durch Homeoffice)
- 19:00 Uhr: 0,068 kW (Abendspitze, leicht niedriger)
- 23:00 Uhr: 0,033 kW (höhere Abendgrundlast)
- 03:00 Uhr: 0,021 kW (höheres nächtliches Minimum durch Standby-Geräte)

**Wesentliche Verschiebungen:**
1. **Verflachte Spitzen:** H25 zeigt 5-10% niedrigere Spitzen durch LED-Beleuchtung und energieeffiziente Geräte
2. **Erhöhte Grundlast:** +15-20% durch konstanten Standby-Verbrauch (Smart-Home, Router, Streaming-Geräte)
3. **Homeofficeffekt:** Höherer Mittagsverbrauch (+8-12%) reflektiert geänderte Arbeitswelt
4. **Zeitverschiebung:** Abendspitze verschiebt sich von 19:00 auf 19:30-20:00 Uhr

### Jahresgangcharakteristik

**H0:** Ausgeprägter Winterpeak (Dezember-Februar), symmetrisches Sommertal  
**H25:** Flacherer Jahresverlauf durch:
- Moderne Heizungssteuerung (Nachtabsenkung, Einzelraumregelung)
- LED-Beleuchtung (deutlich geringerer Wintermehrverbrauch)
- Ganzjahres-Grundverbrauch durch IT-Geräte

### Normierung und Skalierung

**H0:** Normiert auf 1.000 kWh Jahresverbrauch (1 MWh)  
**H25:** Normiert auf 1.000.000 kWh Jahresverbrauch (1 GWh)

Die Änderung der Normierungsbasis reflektiert die Praxis der Netzbetreiber, die Profile für aggregierte Kundengruppen verwenden. Die mathematische Skalierung bleibt identisch – für Einzelkunden wird das Profil mit dem individuellen Jahresverbrauch multipliziert.

## Warum die Profile aktualisiert werden mussten

Die VDEW-Profile von 1999 basierten auf Lastgangmessungen aus den Jahren 1981-1997. In den vergangenen 26 Jahren hat sich das deutsche Verbrauchsverhalten fundamental verändert:

### Gesellschaftliche Transformation

**Arbeitswelt:**
- Homeoffice-Revolution: Vor Corona 5%, jetzt 25-30% der Arbeitstage (ifo-Institut 2024)
- Verlagerte Mittagslast: Kochen, Beleuchtung, PC-Nutzung in Privathaushalten statt Büros
- Flexibilisierte Arbeitszeiten: Weniger ausgeprägte 8-18-Uhr-Strukturen

**Einzelhandel:**
- Liberalisierte Ladenöffnungszeiten: Samstags bis 20 Uhr (seit 2003/2006)
- Sonntagsöffnungen an Adventssonntagen
- Veränderte Einkaufsgewohnheiten: Online-Shopping statt Samstagseinkauf

**Gerätetechnik:**
- LED-Beleuchtung: 80% weniger Verbrauch als Glühbirnen (EU-Verbot 2009-2012)
- Energieeffizienzklassen: A+++Kühlschränke verbrauchen 70% weniger als 1999er-Modelle
- Aber: Geräteproliferation (mehr Bildschirme, Streaming-Boxen, Smart-Speaker)

### Energiewirtschaftliche Veränderungen

**Prosumer-Explosion:**
- 1999: ~50.000 PV-Anlagen mit 70 MW Gesamtleistung
- 2024: ~3,7 Millionen PV-Anlagen mit 88 GW Gesamtleistung
- Eigenverbrauch verändert Netzbezugsprofil fundamental (Mittagssenke statt -spitze)

**Elektrifizierung:**
- Elektromobilität: ~1,4 Millionen Elektrofahrzeuge (2024)
- Wärmepumpen: ~1,5 Millionen Anlagen (Hochlauf für TLP-Profile relevant)
- Wachsende Kühllasten durch Klimatisierung

### Messmethodische Fortschritte

**1999:** Analoge Ferrariszähler, jährliche manuelle Ablesung, begrenzte Stichproben  
**2025:** Digitale Zähler, Smart Meter, kontinuierliche Datenerfassung, Big-Data-Auswertungen

Die BTU EVU Beratung konnte für H25 auf Bilanzierungsdaten von 62 Netzbetreibern zurückgreifen – eine Datenmenge, die 1999 technisch und organisatorisch unmöglich gewesen wäre.

### Praktische Konsequenzen der veralteten Profile

**Bilanzierungsabweichungen:**
- Differenz zwischen prognostiziertem (SLP-basiert) und tatsächlichem Verbrauch stieg kontinuierlich
- Ausgleichsenergiekosten stiegen um geschätzt 10-15% gegenüber optimalem Profil
- Besonders kritisch bei hohem Prosumer-Anteil (PV-Haushalte mit H0 bilanziert)

**Beschaffungsineffizienz:**
- Lieferanten beschaffen auf Basis SLP-Prognose
- Systematische Abweichungen führen zu Mehr-/Mindermengen
- Opportunitätskosten durch suboptimale Beschaffung

**Netzplanung:**
- Lastflussberechnungen basieren u.a. auf SLP-Annahmen
- Veraltete Profile unterschätzen moderne Grundlast, überschätzen Spitzen
- Fehlinvestitionen in Netzausbau möglich

## Der Einführungsprozess für Netzbetreiber

Die Implementierung der neuen BDEW-Profile ist **nicht verpflichtend**. § 12 Abs. 1 StromNZV schreibt lediglich die Verwendung von Standardlastprofilen vor, nicht deren konkrete Ausgestaltung. Jeder Netzbetreiber entscheidet individuell über Zeitpunkt und Umfang der Umstellung. Der Prozess umfasst sechs wesentliche Phasen:

### Phase 1: Profilvalidierung und Testphase

**Entscheidung für Pilotierung:**
Der Netzbetreiber lädt H25/G25/L25/P25/S25-Profildaten vom BDEW herunter und führt eine retrospektive Analyse durch:

1. **Historische Bilanzkreisauswertung:** Vergleich der tatsächlichen Bilanzkreisabweichungen (Ist) mit simulierten Abweichungen bei Anwendung von H25 statt H0
2. **Kundenstrukturanalyse:**  
   - Anzahl H0-Kunden im Netz
   - Anteil PV-Haushalte (potenzielle P25/S25-Kandidaten)
   - Regionale Besonderheiten (urban vs. ländlich, Altersstruktur)
3. **Kosten-Nutzen-Rechnung:**  
   - Erwartete Reduktion der Ausgleichsenergie in €/Jahr
   - IT-Implementierungskosten (Systemanpassung, Testing, Schulung)
   - Break-Even-Berechnung

**Empfohlener Testzeitraum:** 6-12 Monate Parallelberechnung (Shadowrun) mit beiden Profilsets

**Praxisbeispiel Netze BW (größter VNB Baden-Württembergs):**  
Die Netze BW GmbH kündigte bereits die parallele Nutzung von H0 und H25 an: "Das Haushaltsprofil H0 bzw. H25 sowie die Prosumer-Profile P25 und S25 sind dynamisiert." Dies deutet auf eine schrittweise Einführung mit Wahlmöglichkeit für Lieferanten hin.

### Phase 2: IT-Systemanpassung

**Betroffene Systeme:**
1. **Bilanzierungssoftware:**  
   - Import der 36 Typtag-Profile (H25: 12 Monate × 3 Tagestypen)
   - Implementierung der Dynamisierungsalgorithmen mit aktualisierten Koeffizienten
   - Anpassung der Feiertagslogik auf Bundesland-Ebene

2. **Abrechnungssystem:**  
   - Integration neuer Profilcodes (H25, G25, L25, P25, S25)
   - Anpassung der Artikel-IDs für Preisblätter
   - Update der SLP-Skalierungslogik

3. **Marktkommunikations-Gateway:**  
   - UTILMD-Versand mit neuen Profilcodes
   - PRICAT-Generierung mit aktualisierten Artikelhierarchien
   - MSCONS-Verarbeitung für Profilwertabgrenzung

4. **Kundendatenverwaltung:**  
   - Historisierung der Profilzuordnung (Wann welches Profil gültig?)
   - Stammdatenänderungs-Workflow für Profilwechsel

**Kritischer Punkt – UTILMD-Profilcode:**  
Das Segment SG7 der UTILMD enthält das Zählpunktattribut mit Lastprofilcode. Netzbetreiber müssen definieren:
- Welche interne Bezeichnung wird verwendet? (z.B. "H25D" für H25 dynamisiert)
- Wie erfolgt die Zuordnung zur BDEW-Profilschar?
- Welche UTILMD-Codeliste wird referenziert? (DE3055 = "89" für netzbetreiberspezifisch)

### Phase 3: Preisblatt-Aktualisierung

Netzbetreiber sind nach § 17 Abs. 2 ARegV und § 27 StromNEV verpflichtet, Netzentgelte zu veröffentlichen. Die Einführung neuer Profile erfordert die Aktualisierung der Preisblätter:

**Preisblatt-Hierarchie nach GPKE:**
```
Preisblatt
  └─ Gruppenartikel-ID (1:n)
       └─ Artikel-ID (1:n)
            └─ Preis (1:1)
```

**Beispiel Artikel-IDs für H25:**
- Gruppenartikel "Netznutzung Haushalt Niederspannung"
  - Artikel "Arbeitspreis H25" → 8,42 ct/kWh
  - Artikel "Grundpreis H25" → 72,00 €/Jahr

**WICHTIG:** Netzentgelte sind lastprofilunabhängig – H0 und H25 haben identische Preise! Die Artikel-ID-Differenzierung dient lediglich der systeminternen Zuordnung. In der Praxis veröffentlichen viele Netzbetreiber daher weiterhin generische "Haushalt"-Artikel ohne explizite Profil-Nennung.

**Veröffentlichungspflichten:**
1. **Website des Netzbetreibers:** Preisblätter als PDF im Bereich "Netznutzung" (§ 17 Abs. 2 ARegV)
2. **Marktkommunikation via PRICAT:** Strukturierte Übermittlung an Lieferanten (seit MaKo 2022)
3. **BNetzA-Meldung:** Bei wesentlichen Änderungen Mitteilung an Bundesnetzagentur

**Zeitpunkt der Veröffentlichung:**  
Netzentgelte werden typischerweise zum **1. Januar** eines Kalenderjahres angepasst. Netzbetreiber, die H25 ab 01.01.2026 nutzen möchten, müssen bis **spätestens 15. Oktober 2025** die aktualisierten Preisblätter veröffentlichen (Vorlaufzeit für Lieferanten).

### Phase 4: Marktkommunikation mit Marktpartnern

**PRICAT – Preiskatalog-Nachricht:**  
Der Netzbetreiber versendet aktualisierte Preisblätter per PRICAT an alle Lieferanten im Netzgebiet. Die Nachricht enthält:
- Gültigkeitsbeginn der neuen Preise (z.B. 01.01.2026)
- Komplette Artikel-ID-Struktur (inkl. H25, G25, P25, S25)
- Preise pro Artikel (Arbeitspreis, Grundpreis)

**Format-Beispiel (vereinfacht):**
```
PRICAT-Nachricht
  IMD-Segment: Artikelbeschreibung "Netznutzung Haushalt H25"
  PRI-Segment: Arbeitspreis 8,42 ct/kWh
  PRI-Segment: Grundpreis 72,00 €/Jahr
  DTM-Segment: Gültig ab 01.01.2026
```

**Kommunikationsstrategie:**
Parallel zur PRICAT-Versendung empfiehlt sich:
1. **Lieferanten-Rundschreiben:** Ankündigung der Profilumstellung 3-6 Monate vorab
2. **FAQ-Dokument:** Beantwortung typischer Fragen (Was ändert sich für Endkunden? Müssen Verträge angepasst werden?)
3. **Webinar/Workshop:** Technische Einführung für IT-Verantwortliche der Lieferanten

**UTILMD – Stammdatenmeldung:**  
Für jede Marktlokation, die von H0 auf H25 umgestellt wird, versendet der Netzbetreiber eine UTILMD mit Transaktionsgrund **E01** (Stammdatenänderung). Dies erfolgt typischerweise in Batch-Prozessen, nicht pro Kunde individuell.

**Kritischer Zeitplan:**
- **T-90 Tage:** Ankündigung der Umstellung (Information)
- **T-30 Tage:** PRICAT-Versand mit neuen Preisblättern
- **T-14 Tage:** UTILMD-Versand für Massenstammdatenänderung (alle H0→H25)
- **T-0 Tag:** Go-Live der neuen Profile (z.B. 01.01.2026)

**Reaktionsfrist für Lieferanten:**  
Nach Erhalt einer UTILMD haben Lieferanten **drei Werktage** zur Prüfung und Reaktion. Bei Massenumstellungen wird diese Frist oft durch bilaterale Absprachen verlängert (z.B. 10 Werktage), um IT-Anpassungen zu ermöglichen.

### Phase 5: Parallelbetrieb und Monitoring

**Empfohlener Ansatz: Stufenweise Einführung**

**Variante A – Regionale Pilotierung:**
1. Auswahl eines Teilnetzgebiets (z.B. ein Umspannwerk-Bereich)
2. Umstellung aller Haushalte in diesem Gebiet auf H25
3. Monitoring über 6 Monate
4. Bei positiver Bilanz: Roll-out auf gesamtes Netzgebiet

**Variante B – Profilspezifische Einführung:**
1. Start mit P25/S25 für PV-Haushalte (höchste Bilanzierungsverbesserung)
2. Nach 3 Monaten: H25 für Standardhaushalte
3. Nach 6 Monaten: G25 für Gewerbe
4. L25 bleibt optional (geringster Nutzen)

**Key Performance Indicators (KPIs) für Monitoring:**
- **Bilanzkreisabweichung:** Δ zwischen Prognose und Ist (in MWh und €)
- **Ausgleichsenergiekosten:** Vergleich H0 vs. H25 (in €/Jahr)
- **Prognosegenauigkeit:** Mean Absolute Percentage Error (MAPE)
- **IT-Stabilität:** Anzahl UTILMD-Fehler, PRICAT-Reklamationen

**Eskalationsprozess bei Problemen:**
Falls nach 3 Monaten die KPIs schlechter ausfallen als mit H0:
1. Analyse der Ursachen (IT-Fehler vs. Profil inhärent ungeeignet?)
2. Mögliches Rollback auf H0 mit UTILMD-Massenänderung (E01)
3. Dokumentation der Erkenntnisse für BDEW-Feedback

### Phase 6: Reguläre Betriebsphase

**Routineprozesse nach erfolgreicher Einführung:**

**1. Jährliche Profilaktualisierung:**  
Der BDEW aktualisiert die Profile nicht jährlich (H25 ist Stand 2025). Netzbetreiber wenden bis zur nächsten BDEW-Veröffentlichung (vermutlich 2030+) dasselbe Profil an. Lediglich Dynamisierungsfaktoren werden täglich basierend auf aktuellen Temperaturen berechnet.

**2. Temperatur-Monitoring:**  
Für H25-Dynamisierung benötigt der Netzbetreiber tagesaktuelle Temperaturdaten der zugeordneten DWD-Messstelle (z.B. Stuttgart-Echterdingen für Netze BW). Diese werden im UTILMD-Feld "ZT1" kommuniziert.

**3. Neukundenonboarding:**  
Neue Haushaltsanschlüsse erhalten automatisch H25 zugewiesen (außer PV-Anlage → P25/S25). Die initiale UTILMD (E03 – Neuanlage Marktlokation) enthält bereits das aktuelle Profil.

**4. Profilwechsel bei Anlagenänderung:**  
Installiert ein H25-Kunde eine PV-Anlage, erfolgt der Wechsel zu P25 via UTILMD (E01). Der Lieferant muss seine Prognose entsprechend anpassen.

**5. Qualitätssicherung:**  
Quartalsweise Bilanzkreisanalyse: Vergleich der SLP-Prognose mit tatsächlichen Messungen (Jahresabrechnung). Bei systematischen Abweichungen >5% Prüfung der Profilzuordnung.

## Preisblatt-Veröffentlichung: Rechtliche Rahmenbedingungen

### Regulatorische Grundlagen

**§ 17 Abs. 2 ARegV:** Netzbetreiber müssen Netzentgelte bis **15. Oktober** des Vorjahres auf ihrer Internetseite veröffentlichen.

**§ 27 StromNEV:** Veröffentlichungspflicht umfasst:
- Netzentgelte nach Entnahmestellen-Kategorien
- Grundlage der Netzentgeltberechnung
- Strukturmerkmale des Netzes (Anzahl Zählpunkte, Jahresenergiemenge)

**§ 6 StromNZV:** Preisblätter müssen die zugrunde gelegten Standardlastprofile benennen (H0, H25, etc.)

### Praktische Umsetzung

**Beispiel Netze BW – Preisblatt 2025:**  
"Für die Kundengruppen Haushalt, Landwirtschaft und Gewerbe verwendet der Netzbetreiber die BDEW-Standardlastprofile. Das Haushaltsprofil H0 bzw. H25 sowie die Prosumer-Profile P25 und S25 sind dynamisiert."

Diese Formulierung **"H0 bzw. H25"** ist typisch für die Übergangsphase: Der Netzbetreiber bietet beide Profile an, je nach Implementierungsstand des Lieferanten oder Kundentyp.

**Download-Bereiche auf VNB-Websites:**
- Preisblätter Netznutzung (PDF)
- Lastprofile (XLSX-Zeitreihen zum Download)
- Temperaturtabellen (CSV mit DWD-Messstellen-Tagesmitteltemperaturen)
- PRICAT-Nachrichten (optional, primär via EDI)

**Änderungshistorie:**  
Netzbetreiber müssen alte Preisblätter archivieren (typischerweise 5 Jahre). Dies dient der Nachvollziehbarkeit bei Abrechnungsprüfungen und Rechtsstreitigkeiten.

## UTILMD-Marktkommunikation: Technische Details

Die UTILMD (Utilities Master Data Message) ist das zentrale EDIFACT-Format für Stammdatenänderungen in der deutschen Energiewirtschaft. Bei Profilumstellungen sind mehrere Segmente kritisch:

### Struktur der UTILMD bei Profilwechsel

**UNH-Segment:** Nachrichten-Header
```
UNH+0001+UTILMD:D:11A:UN:3.2e'
```

**BGM-Segment:** Dokumentenkennung  
- E01 = Stammdatenänderung (bei Profilwechsel)
- E03 = Neuanlage Marktlokation (bei Neuanschluss mit H25)

**NAD-Segmente:** Identifikation der Marktpartner
- NAD+MS' = Netzbetreiber (Message Sender)
- NAD+MR' = Lieferant (Message Receiver)
- NAD+Z06' = Messstellenbetreiber

**LOC+172-Segment:** Marktlokations-ID (11-stellig)
```
LOC+172+DE0000011110000000000001000000001::293'
```

### SG7 – Zählpunktattribute (kritisch für Profile)

**CAV-Segment:** Charakteristik (Lastprofil)
```
CAV+Z02+H25D::89'
```

Bedeutung:
- Z02 = Zählpunktcharakteristik  
- H25D = Netzbetreiber-spezifischer Profilcode (H25 dynamisiert)
- 89 = Codelistenverantwortlicher = Netzbetreiber (netzbetreiberspezifische Codes)

**Alternative Codierung bei BDEW-Standard-Profilen:**
```
CAV+Z02+H25::332'
```
- 332 = BDEW als Codelistenverantwortlicher

**SEQ-Segment:** Profil schar
```
SEQ++Z10'
```
- Z10 = Profilschar-Kennzeichnung (bei Profilen mit Dynamisierung)

**CCI-Segment:** Profilzusatzinformation
```
CCI+Z02+++H25:Z01'
```
- H25 = Basis-Profilcode
- Z01 = Profilschar-Referenz

### DTM-Segment: Gültigkeitsdatum

**Kritisch für Massenumstellungen:**
```
DTM+157:20260101:102'
```
- 157 = Gültigkeitsbeginn
- 20260101 = 01.01.2026
- 102 = Format CCYYMMDD

Der Netzbetreiber muss sicherstellen, dass das Gültigkeitsdatum mit dem Preisblatt-Gültigkeitsbeginn übereinstimmt!

### Reaktionsfrist und Zustimmungsfiktion

Nach GPKE 1.4.2 hat der Lieferant **drei Werktage** zur Reaktion auf eine UTILMD-Stammdatenänderung. Reaktionsmöglichkeiten:

**1. Zustimmung (CONTRL mit ACK):**
```
UCI+4+UTILMD+Zustimmung zur Stammdatenänderung'
```

**2. Ablehnung (CONTRL mit REJ):**  
Muss begründet werden, z.B.:
- Marktlokations-ID unbekannt
- Kunde hat keinen Liefervertrag mit diesem Lieferanten
- Technische Unstimmigkeit

**3. Keine Reaktion:**  
Nach drei Werktagen gilt die Änderung automatisch als zugestimmt (**Zustimmungsfiktion**).

### Betroffene GPKE/WiM-Prozesse

**GPKE 1.4.2 – Stammdatenänderung durch Netzbetreiber:**
- Netzbetreiber als Initiator  
- Information an Lieferant, MSB, ggf. ÜNB
- Drei-Werktage-Reaktionsfrist

**GPKE 2.3.1 – Stammdatenänderung bei Profilzuordnung:**
- Spezifischer Prozess für Profilwechsel
- Regelung der Verantwortlichkeiten
- Abgrenzung zur Zählpunktänderung

**WiM_047 – Zuordnung von Messlokationen zu Lastprofilen:**
- Koordination zwischen Netzbetreiber und Messstellenbetreiber
- Profilzuordnung als Stammdatum der Messlokation

**WiM_A001 – Stammdatenpflege:**
- Allgemeiner Rahmen für Stammdatenänderungen
- Historisierung von Profiländerungen

**WiM_A003 – Änderung der Messstellendaten:**
- Wenn Profilwechsel technische Änderungen erfordert (z.B. iMSys-Pflicht bei P25/S25)



## Praktische Implikationen für Marktakteure

### Für Verteilnetzbetreiber

**Strategische Entscheidung:**
- Wann erfolgt die Umstellung? (2025, 2026, später?)
- Welche Profile werden eingeführt? (nur H25, oder auch P25/S25/G25/L25?)
- Schrittweise oder Big-Bang-Umstellung?

**Sofortmaßnahmen:**
1. **Profilvalidierung:** Retrospektive Analyse – hätte H25 in 2024 bessere Bilanzierung gebracht?
2. **Kosten-Nutzen-Rechnung:** IT-Aufwand vs. erwartete Ausgleichsenergiekostenreduktion
3. **Kundenstruktur-Analyse:**  
   - Anzahl H0-Kunden (betroffen von H→H25)
   - Anzahl PV-Haushalte ohne Smart Meter (potenzielle P25-Kunden)
   - Anzahl PV+Speicher-Haushalte (potenzielle S25-Kunden)
4. **IT-Readiness-Check:** Können unsere Systeme 36 Typtag-Profile verarbeiten?

**Mittelfristig:**
- Aktualisierung der Profildefinitionsliste auf VNB-Website
- Schulung von Mitarbeitern (Vertrieb, IT, Abrechnung)
- Abstimmung mit Lieferanten über Umstellungstermin
- Vorbereitung der PRICAT/UTILMD-Massenmailings
- Test der Preisblatt-Generierung mit neuen Artikel-IDs

**Langfristig:**
- Monitoring der Bilanzierungsqualität (quartalsweise KPI-Auswertung)
- Optimierung der Profilzuordnung (z.B. automatische PV-Erkennung via Smart Meter)
- Feedback an BDEW für künftige Profilaktualisierungen

### Für Stromlieferanten

**Prognosemanagement:**
- **Update der Lastprognose-Software:** Integration H25-Zeitreihen
- **Parameteranpassung:** Dynamisierungskoeffizienten aktualisieren
- **P25/S25-Implementierung:** Falls Netzbetreiber diese nutzt – essentiell für Portfolio-Steuerung
- **Bilanzkreismanagement:** Neuberechnung der Fahrpläne auf H25-Basis
- **Beschaffungsoptimierung:** Anpassung der Day-Ahead/Intraday-Strategien

**Praktisches Beispiel:**  
Ein Lieferant mit 50.000 H0-Kunden und 5.000 PV-Haushalten muss:
1. Alle 50.000 auf H25 umstellen (systemisch)
2. Die 5.000 PV-Haushalte auf P25 umstellen (sofern kein iMSys vorhanden)
3. Prognose-Tool testen: Weicht die H25-Prognose <3% vom Ist ab?

**Kundenkommunikation:**
- **Proaktive Information:** Brief/E-Mail an betroffene Kunden 6 Wochen vor Umstellung
- **Inhalt:** "Ihr Netzbetreiber führt aktualisierte Lastprofile ein. Für Sie ändert sich nichts – Sie zahlen weiterhin nur Ihren tatsächlichen Verbrauch."
- **FAQ:** "Was ist H25? Muss ich etwas tun? Wird es teurer?"
- **Transparenz:** Keine Mehrkosten, präzisere Prognose, keine Handlung erforderlich

**PV-Kunden-Beratung:**
- Hinweis auf P25-Profilzuordnung
- Erklärung: Profil bildet Eigenverbrauch besser ab
- Angebot spezieller Prosumer-Tarife

### Für Messstellenbetreiber

**Operative Anpassungen:**
- **Stammdatenpflege:** Profilzuordnung in eigenen Systemen aktualisieren
- **MSCONS-Anpassung:** Profilwert-Übermittlung für neue Profile
- **Koordination mit Netzbetreiber:** Abstimmung bei P25/S25 (oft iMSys-Pflicht)
- **Smart-Meter-Rollout:** P25/S25 erfordern teilweise iMSys statt Standardzähler

**Besonderheit P25/S25:**  
Nach § 12 Abs. 5 StromNZV dürfen Kunden mit PV **und** iMSys nicht über SLP bilanziert werden. Hier greifen gemessene Werte. MSB müssen daher prüfen: Hat PV-Kunde bereits iMSys? → Keine P25-Zuordnung, sondern RLM-Bilanzierung.

### Für Endkunden

**Haushalte ohne PV/besondere Einrichtungen:**
- **Keine Handlung erforderlich**
- Umstellung H0→H25 erfolgt transparent durch Netzbetreiber
- Keine Änderung der Stromrechnung (Zahlung nach tatsächlichem Verbrauch)
- Keine Tarifänderung notwendig

**Haushalte mit PV-Anlage (ohne iMSys):**
- Information an Netzbetreiber empfohlen (falls noch nicht bekannt)
- Automatische Umstellung auf P25 oder S25 (je nach Speicher)
- Vorteil: Präzisere Bilanzierung des Eigenverbrauchs
- Möglicher Tarifwechsel zu spezialisiertem Prosumer-Tarif

**Kritische Fälle:**  
Kunde mit PV + iMSys → **Kein SLP!** Hier gilt RLM-Bilanzierung mit gemessenen Viertelstundenwerten.

## Häufige Missverständnisse zu H25

### Missverständnis 1: "Ab 2026 muss jeder H25 statt H0 nutzen"
**Korrektur:** Es gibt keine regulatorische Umstellungspflicht. § 12 StromNZV schreibt die Verwendung von Standardlastprofilen vor, nicht deren konkrete Version. Netzbetreiber entscheiden individuell, ob und wann sie auf H25 umstellen. Manche nutzen 2025-2030 parallel H0 und H25 (Wahlmöglichkeit für Lieferanten).

### Missverständnis 2: "H25 gab es schon vorher als Variante von H0"
**Korrektur:** H25 wurde erstmals am 18. März 2025 durch den BDEW veröffentlicht. Vorgänger war ausschließlich H0 (VDEW 1999). Die "25" bezeichnet das Aktualisierungsjahr, nicht eine fortlaufende Versionsnummer.

### Missverständnis 3: "Die Umstellung kostet Endkunden Geld"
**Korrektur:** Endkunden zahlen weiterhin nur ihren tatsächlich gemessenen Jahresverbrauch. Standardlastprofile dienen ausschließlich der unterjährigen Bilanzierung und Prognose. Die Jahresabrechnung basiert auf dem Zählerstand, nicht auf dem Profil. H25 vs. H0 hat null Einfluss auf die Stromrechnung.

### Missverständnis 4: "P25/S25 sind Varianten von H25"
**Korrektur:** P25 (Prosumer ohne Speicher) und S25 (Prosumer mit Speicher) sind eigenständige, völlig neue Profile – keine Untervarianten von H25. Sie bilden bidirektionale Energieflüsse ab (Bezug und Einspeisung), während H25 rein unidirektional ist (nur Bezug).

### Missverständnis 5: "Netzbetreiber müssen Preise ändern bei Umstellung auf H25"
**Korrektur:** Netzentgelte sind lastprofilunabhängig. Ein Haushaltskunde zahlt identische Netzentgelte, egal ob mit H0 oder H25 bilanziert. Die Artikel-ID im Preisblatt kann sich ändern (rein systemisch), aber der Preis bleibt gleich. Beispiel: "Netznutzung Haushalt" = 8,42 ct/kWh, unabhängig vom Profil.

## Datenquellen und Methodik der BDEW-Profile 2025

Die BTU EVU Beratung GmbH entwickelte die neuen Profile im Auftrag des BDEW mit folgenden Datengrundlagen:

**H25 – Haushaltsprofil:**
- **Methodik:** Top-Down-Ansatz (Aggregation von Netzbilanzierungsdaten)
- **Datenbasis:** Bilanzierungsdaten von 62 Verteilnetzbetreibern aus 2018/2019
- **Stichprobengröße:** Mehrere Millionen Haushaltskunden indirekt erfasst
- **Besonderheit:** Erfasst bereits moderaten Prosumer-Einfluss (PV-Haushalte waren 2018/19 in H0-Aggregation enthalten)

**G25 – Gewerbeprofil:**
- **Methodik:** Bottom-Up-Ansatz (Einzelzeitreihen-Aggregation)
- **Datenbasis:** Circa 2.000 iMSys-Zeitreihen (2022/2023)
- **Netzverteilung:** Zehn über Deutschland gut distribuierte Netzbetreiber
- **Konsolidierung:** Ersetzt sieben VDEW-Profile (G0-G6) durch ein einziges

**L25 – Landwirtschaftsprofil:**
- **Methodik:** Erweiterung des VDEW L0-Profils
- **Datenbasis:** Ursprüngliche VDEW-Daten 1999, erweitert auf 12 Monate
- **Begründung:** Geringe Datenveränderung seit 1999, da landwirtschaftlicher Stromverbrauch stabil

**P25 – Prosumer ohne Speicher:**
- **Methodik:** Bottom-Up mit Supply-Oriented Timing (SOT) und Load-Oriented Timing (LOT)
- **Datenbasis:** 400 iMSys-Zeitreihen von PV-Haushalten (2022-2023)
- **Besonderheit:** Kombinationsprofil (Verbrauch UND Eigenverbrauchsreduktion)

**S25 – Prosumer mit Speicher:**
- **Methodik:** Bottom-Up mit SOT/LOT und Speicheroptimierung
- **Datenbasis:** 200 iMSys-Zeitreihen von PV-Speicher-Haushalten (2022-2023)
- **Komplexität:** Höchste Variabilität durch dreifachen Optimierungshorizont (Tag, Woche, Jahr)

Alle Profile sind auf **1 Million kWh (1 GWh)** Jahresverbrauch normiert und nutzen **Viertelstunden-Auflösung** (96 Werte pro Tag).

## Ausblick: Was kommt nach 2025?

Die Veröffentlichung von H25/G25/L25/P25/S25 ist erst der Beginn einer kontinuierlichen Evolution. Wir erwarten in den nächsten Jahren:

### Weitere Profil-Differenzierung (2026-2028)

**Elektromobilität-Profile:**
- **E25:** Haushalte mit Wallbox (Nachtladen-Muster)
- **E26:** Haushalte mit Wallbox und PV (Tagesladen-Optimierung)
- **E27:** Bidirektionales Laden (Vehicle-to-Grid, V2G)

**Sektorenkopplungs-Profile:**
- **K25:** Haushalte mit PV + Speicher + Wallbox (Kombiprofil)
- **K26:** Haushalte mit PV + Speicher + Wallbox + Heizstab (Maximale Autarkie)

Diese Profile werden vermutlich nicht vom BDEW zentral, sondern von Netzbetreibern individuell entwickelt – die Heterogenität ist zu hoch für bundesweite Standards.

### Smart-Meter-basierte Echtzeit-Profilierung (2027-2030)

Mit zunehmendem iMSys-Rollout (gesetzliches Ziel: 95% bis 2032) wird die Rolle von Standardlastprofilen abnehmen:
- Kunden >6.000 kWh/Jahr: Verpflichtender Smart-Meter-Einbau
- RLM-Bilanzierung statt SLP
- Standardlastprofile nur noch für Kleinstverbraucher <2.000 kWh/Jahr

**Paradoxon:** Je besser die Profile werden, desto weniger werden sie gebraucht – weil Smart Meter sie ersetzen.

### Integration in MaKo-Dokumentation (2025-2026)

Die Profile H25/G25/L25/P25/S25 sind in der aktuellen BDEW MaKo-Dokumentation (Version 2.1, März 2023) noch nicht enthalten. Erwartungen:
- **BDEW MaKo V2.2** (erwartete Veröffentlichung Q2 2025): Formale Integration der neuen Profile
- **GPKE-Update:** Anpassung der Profilzuordnungs-Prozesse (insbesondere P25/S25)
- **WiM-Update:** Ergänzung von Messstellenbetreiber-Prozessen für Prosumer-Profile

### KI-gestützte dynamische Profilierung (2028+)

Zukünftige Profile werden nicht mehr statisch sein, sondern **kundenindividuell und selbstlernend:**
- Machine-Learning-Algorithmen analysieren historische Verbräuche
- Dynamische Anpassung des Profils basierend auf Wetter, Wochentag, Feiertagen
- "Profile of One" – jeder Kunde hat sein eigenes Profil

**Technisch bereits heute möglich**, regulatorisch und organisatorisch noch 5-10 Jahre entfernt.

### Flexibilitätsmarkt-Integration (2026+)

Profile werden stärker mit Flexibilitätsmärkten verzahnt:
- Nicht nur Verbrauchsprognose, sondern auch **Verschiebepotenzia l-Bewertung**
- Integration von § 14a EnWG-Steuerungspotential in Profile
- Netzdienliche Profile (Lastverschiebung integriert)

**Beispiel:** Ein "H25-flex"-Profil könnte Haushalte mit hoher Flexibilität (Speicher, Wallbox, steuerbare Geräte) abbilden – mit Anreizen für netzdienliches Verhalten.

## Fazit: Die Modernisierung der Bilanzierung nach 26 Jahren

Die BDEW-Veröffentlichung vom 18. März 2025 markiert einen Wendepunkt in der deutschen Strombilanzierung. Nach 26 Jahren mit identischen Profilen stehen Netzbetreibern erstmals Werkzeuge zur Verfügung, die die energiewirtschaftliche Realität von 2025 präzise abbilden: Homeoffice, LED-Beleuchtung, Standby-Proliferation – und vor allem: Prosumer.

**H25 ist dabei das solide Fundament:** Eine überfällige Modernisierung des Basis-Haushaltsprofils mit verbesserter Datengrundlage, monatsscharfer Granularität und bundeslandspezifischem Feiertagskalender. Die technischen Verbesserungen sind evolutionär, nicht revolutionär – aber präzise genug, um Bilanzierungsabweichungen signifikant zu reduzieren.

**P25 und S25 sind die eigentliche Revolution:** Erstmals existieren standardisierte Profile für bidirektionale Energieflüsse. Für Netzbetreiber mit hohem PV-Anteil sind diese Profile geschäftskritisch – ohne sie ist präzise Bilanzierung bei Prosumern unmöglich.

### Für Netzbetreiber: Strategische Chance

Die freiwillige Natur der Implementierung ist Fluch und Segen zugleich. Netzbetreiber, die frühzeitig auf H25/P25/S25 umstellen, erzielen:
- **Ausgleichsenergiekostenreduktion:** 5-15% bei typischen Netzen
- **Wettbewerbsvorteil:** Präzisere Prognose ermöglicht bessere Geschäftsmodelle
- **Zukunftssicherheit:** Profile sind skalierbar für kommende Technologien (Wallboxen, V2G)

Netzbetreiber, die bei H0 bleiben, riskieren wachsende Bilanzierungsabweichungen – besonders bei zunehmendem PV-Anteil.

### Für Lieferanten: Prognosequalität als Differenzierung

Lieferanten, die ihre Prognosesysteme konsequent auf H25/P25/S25 umstellen, können:
- Beschaffung optimieren (geringere Day-Ahead-Abweichungen)
- Bilanzkreiskosten senken
- Spezielle Prosumer-Tarife anbieten (Differenzierung im Wettbewerb)

### Für die Branche: Schrittweise Transformation

Die kommenden Jahre werden eine schrittweise, heterogene Umstellung bringen:
- **2025:** Early Adopters (5-10% der Netzbetreiber)
- **2026-2027:** Mainstream-Adoption (50-60%)
- **2028+:** Konsolidierung (80%+ nutzen H25)
- **2030:** Nächste BDEW-Aktualisierung? (Vermutlich mit Elektromobilität/V2G)

Die historische Lektion: Die VDEW-Profile von 1999 hielten 26 Jahre. Die BDEW-Profile von 2025 werden vermutlich nicht so lange halten – die Transformation beschleunigt sich. Smart Meter, künstliche Intelligenz und Sektorenkopplung werden in 5-10 Jahren neue Profilgenerationen erfordern.

**Für jetzt gilt:** H25 ist nicht verpflichtend, aber empfehlenswert. Die Implementierung ist aufwändig, aber lohnenswert. Und vor allem: Die korrekte Zuordnung (H25 für Haushalte, P25/S25 für Prosumer) ist geschäftskritisch für präzise Bilanzierung.

---

## Über die STROMDAO GmbH

Die STROMDAO GmbH ist ein auf digitale Energie-Infrastruktur spezialisierter Dienstleister mit Sitz in Deutschland. Wir entwickeln KI-gestützte Lösungen für Marktkommunikation, Bilanzkreismanagement und intelligente Energiesysteme. Unsere Expertise umfasst:

- **Standardlastprofil-Implementierung:** Beratung bei H25/P25/S25-Einführung
- **EDIFACT-Integration:** UTILMD/PRICAT-Automatisierung für Massenumstellungen
- **Bilanzierungsoptimierung:** KI-gestützte Prognose und Ausgleichsenergiemanagement
- **Marktkommunikationsplattformen:** End-to-End-Lösungen für VNB/MSB/Lieferanten

**Kontakt:**  
STROMDAO GmbH  
Web: https://stromdao.de  
E-Mail: kontakt@stromdao.com

**Weitere Fachbeiträge:**  
Besuchen Sie https://stromhaltig.de für regelmäßige Updates zu Marktkommunikation, Regulierung und technischen Entwicklungen in der deutschen Energiewirtschaft.

---

*Dieser Artikel darf unter Nennung der STROMDAO GmbH als Quelle frei geteilt und verlinkt werden. Für Beratung zur Implementierung neuer Standardlastprofile in Ihrer Organisation stehen wir gerne zur Verfügung.*