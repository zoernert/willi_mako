# Change Request: Meter-to-Cash Rollen als Benutzerkontext

**ID:** CR-M2C-ROLE-CONTEXT  
**Status:** Entwurf  
**Autor:** AI Assistant  
**Datum:** 2025-08-10  

## 1. Zusammenfassung

Diese Anforderung beschreibt die Implementierung einer neuen Funktionalität, die es Benutzern ermöglicht, optional eine oder mehrere für sie relevante "Meter-to-Cash" (M2C) Rollen in ihrem Profil auszuwählen. Die Beschreibung der ausgewählten Rolle(n) wird bei jeder Chat-Anfrage als initialer System-Kontext über den Benutzer mitgegeben. Ziel ist es, die Antworten des KI-Assistenten besser auf die spezifischen Aufgaben und Perspektiven des Benutzers abzustimmen und somit die Relevanz und Qualität der Antworten zu erhöhen.

## 2. Motivation

Benutzer in der Energiewirtschaft haben spezialisierte Aufgaben. Ein Mitarbeiter im Bereich Abrechnung hat andere Informationsbedürfnisse als ein Mitarbeiter, der für die Stammdatenpflege zuständig ist. Indem das System die Rolle des Benutzers kennt, kann es gezieltere und praxisnähere Antworten liefern. Beispielsweise kann bei einer Frage zu einer Fehlermeldung direkt der Bezug zum Aufgabenbereich der Rolle hergestellt werden.

## 3. Betroffene Komponenten

- **Frontend:**
    - `Profil-Seite`: Muss um einen Bereich zur Auswahl der M2C-Rollen erweitert werden.
    - `API-Client`: Muss die Auswahl des Benutzers speichern und abrufen können.
- **Backend:**
    - `Datenbank`: Das Benutzermodell muss erweitert werden, um die ausgewählten Rollen-IDs zu speichern. Eine neue Tabelle zur Speicherung der Rollendefinitionen wird benötigt.
    - `User Service`: Muss Endpunkte zum Lesen und Schreiben der Rollenauswahl des Benutzers bereitstellen.
    - `ChatConfigurationService`: Muss die Rolleninformationen des Benutzers abrufen und in den Kontext der KI-Anfrage integrieren.

## 4. High-Level Implementierungsplan

### Phase 1: Backend-Vorbereitung

1.  **Datenbank-Migration:**
    - Erstellung einer neuen Tabelle `m2c_roles` mit den Spalten `id`, `role_name`, `short_description`, `detailed_description`.
    - Erweiterung der `users`-Tabelle um eine Spalte `selected_m2c_role_ids` (z.B. als JSONB-Array von IDs).
2.  **Daten-Import:**
    - Erstellung eines Skripts, um die initialen Rollendefinitionen in die `m2c_roles`-Tabelle zu importieren.
3.  **API-Erweiterung (`UserService`):**
    - `GET /api/users/me/m2c-roles`: Ruft die aktuelle Rollenauswahl des Benutzers ab.
    - `PUT /api/users/me/m2c-roles`: Aktualisiert die Rollenauswahl des Benutzers.
    - `GET /api/m2c-roles`: Listet alle verfügbaren Rollen mit ihren Beschreibungen auf, damit das Frontend sie anzeigen kann.

### Phase 2: Frontend-Implementierung

1.  **UI-Komponente erstellen:**
    - Entwicklung einer neuen React-Komponente im Profilbereich, die die verfügbaren M2C-Rollen (abgerufen von `GET /api/m2c-roles`) anzeigt.
    - Die Komponente ermöglicht die Auswahl (z.B. über Checkboxen) und zeigt die `short_description` für jede Rolle an.
2.  **State-Management:**
    - Anbindung der Komponente an den API-Layer, um die Auswahl des Benutzers zu speichern (`PUT /api/users/me/m2c-roles`).

### Phase 3: Integration in den Chat-Flow

1.  **Anpassung `ChatConfigurationService`:**
    - Die Methode `generateConfiguredResponse` wird erweitert.
    - Vor dem Aufruf des `geminiService` werden die Rolleninformationen des anfragenden Benutzers (`userId`) geladen.
    - Die `detailed_description` der ausgewählten Rollen wird zu einem Kontext-String zusammengefügt (z.B. "Der Benutzer agiert in folgenden Rollen: [Beschreibung 1], [Beschreibung 2]").
    - Dieser String wird dem System-Prompt oder dem Benutzer-Kontext vorangestellt.

## 5. Rollendefinitionen

### Rollen und Schnittstellen im Meter-to-Cash-Prozess des deutschen Energiemarktes

#### Executive Summary

Der Meter-to-Cash (M2C)-Prozess bildet das operative und finanzielle Rückgrat eines jeden Energieversorgungsunternehmens (EVU), indem er die gesamte Wertschöpfungskette von der Messung des Energieverbrauchs bis zum finalen Zahlungseingang abdeckt. Die Komplexität dieses Prozesses wird durch die strengen regulatorischen Vorgaben der Marktkommunikation (MaKo) und eine Vielzahl beteiligter interner und externer Akteure maßgeblich bestimmt. Dieser Bericht stellt eine detaillierte Analyse der Kernrollen innerhalb des M2C-Prozesses dar, ergänzt um die vom Nutzer angefragten Funktionen wie Messwertmanagement, Kundenservice, Gerätewechsel und die Abrechnung zwischen den Marktpartnern.
Die zentrale Erkenntnis ist, dass der M2C-Prozess in spezialisierte, voneinander abhängige Rollen zerfällt, deren reibungsloses Zusammenspiel entscheidend für die Effizienz und den Erfolg des Unternehmens ist. Die vom Nutzer explizit angeführten Rollen des Datenaustauschmanagers und Wechselprozessmanagers sind hierfür paradigmatisch, da sie eine enge kausale Beziehung aufweisen. Der Wechselprozessmanager verantwortet den geschäftlichen Ablauf und die Klärfälle, während der Datenaustauschmanager die technische Integrität und regelkonforme Übertragung der dafür notwendigen Daten sicherstellt. Die Ergänzung weiterer Rollen wie der Messwertmanagement-Manager, der die Qualität der Messdaten sichert, und des Bilanzierungs- und Handelsmanagers, der die Ausgeglichenheit der Bilanzkreise überwacht, verdeutlicht die Spezialisierungstiefe. Eine besondere Herausforderung stellt die Kommunikation zwischen den verschiedenen Marktpartnern dar, weshalb auch die Rolle des Abrechnungsmanagers um die Abwicklung der inter-organisationalen Abrechnung von Netznutzungsentgelten und Mehr-/Mindermengen erweitert wird.
Als eine der größten Herausforderungen hat sich das in vielen Unternehmen verbreitete „fehlende Verständnis für den Gesamtprozess“ erwiesen.1 Diese organisatorische Fragmentierung führt zu unklaren Zuständigkeiten an den Schnittstellen und hemmt die Effizienz. Die Lösung liegt im Aufbau einer zentralen M2C-Verantwortung, die den gesamten Prozess analysiert, mit bereichsübergreifenden Kennzahlen (KPIs) steuert und eine kontinuierliche Optimierung vorantreibt. Die zunehmende Digitalisierung, die Verkürzung von Fristen wie beim 24-Stunden-Lieferantenwechsel und der Trend hin zu modularen IT-Plattformen erhöhen den Anpassungsdruck auf alle Rollen und erfordern eine ständige Weiterentwicklung der operativen und strategischen Fähigkeiten.

#### 1. Einführung: Das Meter-to-Cash-Konzept im deutschen Energiemarkt

##### 1.1. Definition und Abgrenzung des M2C-Prozesses

Der Meter-to-Cash (M2C)-Prozess ist der zentrale Geschäftsprozess für Versorgungsunternehmen, um Einnahmen von ihren Kunden zu generieren.2 Er beginnt mit der Erfassung des Energieverbrauchs (Meter) und endet mit der Gutschrift der Zahlung auf den Unternehmenskonten (Cash). Die Wertschöpfungskette ist eine komplexe Abfolge von Schritten, an denen verschiedene interne Abteilungen und externe Marktpartner beteiligt sind.
Die Prozessschritte umfassen typischerweise die folgenden Phasen:
Messdatenbeschaffung: Ein Lieferant initiiert eine Anfrage an den zuständigen Netzbetreiber, um Zählerstände oder Verbrauchsdaten zu erhalten.3
Messdatenverarbeitung: Die übermittelten Zählerstände werden vom System des Lieferanten empfangen, validiert und plausibilisiert.
Abrechnung: Auf Basis der validierten Messdaten werden Abrechnungen erstellt, die den Verbrauch, die Netznutzungsgebühren und weitere Dienstleistungen beinhalten.4
Rechnungsstellung und -versand: Die Rechnungen werden erzeugt, gedruckt oder digital übermittelt und an die Kunden versandt.3
Zahlungsmanagement: Die Zahlungen der Kunden werden verarbeitet, und offene Forderungen werden gemanagt, einschließlich des Mahnwesens und der Sperrprozesse.4
Diese Kette ist im deutschen Energiemarkt stark fragmentiert, da sie die Zusammenarbeit zwischen verschiedenen Organisationen (Lieferant, Netzbetreiber, Messstellenbetreiber) erfordert.2 Diese Fragmentierung birgt das Risiko von Engpässen und Prozessschwachstellen, wie sie bei einem analysierten Schweizer Stadtwerk auftraten, wo fehlerhafte Abrechnungen und unzureichende Kommunikation die Folge waren.1
Es ist wichtig, das Konzept des energiewirtschaftlichen M2C-Prozesses klar von anderen, ähnlich benannten Konzepten abzugrenzen. Einige Anbieter verwenden den Begriff M2C beispielsweise im Kontext von Gebäudemanagement, Facility Management oder anderen Sektoren.5 Diese Anwendungen haben keine Verbindung zum hier diskutierten, regulatorisch stark beeinflussten M2C-Prozess der Energie- und Wasserwirtschaft.

##### 1.2. Regulatorischer Rahmen als Fundament der Rollen

Die Aufgaben und Verantwortlichkeiten der M2C-Rollen sind im deutschen Energiemarkt nicht beliebig, sondern durch einen strengen regulatorischen Rahmen definiert. Die Bundesnetzagentur (BNetzA) legt die Bedingungen für den Netzzugang und den Datenaustausch fest.6 Die gesamte Marktkommunikation (MaKo) und die damit verbundenen Geschäftsprozesse sind in einer Reihe von Regelwerken festgeschrieben. Diese Regelwerke bilden die Grundlage für die operativen Rollen:
GPKE (Geschäftsprozesse zur Kundenbelieferung mit Elektrizität): Regelt die Prozesse für den Netzzugang und die Stromlieferung an Endkunden.7
GeLi Gas (Geschäftsprozesse Lieferantenwechsel Gas): Definiert die analogen Prozesse für den Gasmarkt.7
WiM (Wechselprozesse im Messwesen): Regelt die Prozesse für den Betrieb von Messstellen, den Gerätewechsel und die Messdatenerfassung.21
MaBiS (Marktregeln für die Bilanzierung Strom): Legt die Regeln für die Bilanzkreisabrechnung fest.7
Die operative Arbeit der hier beschriebenen Rollen besteht im Wesentlichen darin, diese gesetzlich vorgeschriebenen Prozesse in den internen Systemen abzubilden und fehlerfrei auszuführen. Die Marktkommunikation selbst basiert auf standardisierten EDIFACT-Formaten, wie etwa UTILMD für Stammdaten oder MSCONS für Zählerstände.4 Änderungen an diesen Formaten und den zugrundeliegenden Regelungen gelten für alle Marktteilnehmer gleichermaßen und erfordern eine ständige Anpassung der IT-Systeme und der Prozesse.7

#### 2. Detaillierte Rollenbeschreibungen im M2C-Prozess

Im M2C-Prozess agieren verschiedene Spezialisten, deren Aufgaben eng miteinander verknüpft sind, aber klar voneinander abgegrenzt werden können. Die folgende detaillierte Beschreibung ordnet die Verantwortlichkeiten den jeweiligen Rollen zu.

##### 2.1. M2C-Prozessmanager: Die übergeordnete Steuerungsinstanz

Der M2C-Prozessmanager ist eine strategische Rolle, die den gesamten Prozess ganzheitlich betrachtet. Seine primäre Aufgabe ist die Sicherstellung des reibungslosen, effizienten und transparenten Ablaufs der gesamten M2C-Kette.9 Diese Rolle schließt die Lücke, die durch eine rein funktionsorientierte Organisation entstehen kann, bei der Mitarbeiter nur Einblick in ihren direkten Arbeitsbereich haben, ohne die Zusammenhänge des Gesamtprozesses zu erkennen.1
**Kernverantwortlichkeiten:**
- **Prozessanalyse und -optimierung:** Er analysiert den Ist-Zustand des Prozesses, identifiziert Schwachstellen, Engpässe und Fehlerquellen und entwickelt konkrete Maßnahmen zur Behebung.1
- **Prozessgestaltung und -dokumentation:** Der M2C-Prozessmanager erarbeitet und pflegt Prozessmodelle, definiert klare Rollen- und Schnittstellenbeschreibungen und erstellt Arbeitsanweisungen.1
- **Performance-Monitoring und Qualitätssicherung:** Er ist für die Definition und Überwachung von Kennzahlensystemen (KPIs) zuständig, die die Leistung des Gesamtprozesses abbilden. Die Messung von Teilprozessen allein ist oft nicht ausreichend, um die Effizienz der gesamten Kette zu beurteilen.1
- **Steuerung und Koordination:** Der Prozessmanager koordiniert die verschiedenen Abteilungen, die am M2C-Prozess beteiligt sind, um verlustfreie Übergänge zu gewährleisten und Konflikte an den Schnittstellen zu lösen.9

##### 2.2. Wechselprozessmanager: Herzstück der Kundenbeziehung

Der Wechselprozessmanager ist ein operativer Fachexperte, dessen Fokus auf der end-to-end-Bearbeitung aller Geschäftsprozesse im Zusammenhang mit einem Kunden- oder Messstellenwechsel liegt.4 Die effiziente operative Abwicklung der Marktkommunikation mit den Marktpartnern ist seine oberste Priorität.13
**Kernverantwortlichkeiten:**
- **Steuerung der Wechselprozesse:** Er verantwortet die gesamte Abwicklung von Lieferantenwechselprozessen, Gerätewechseln und Sachbearbeiterentscheidungen gemäß den regulatorischen Vorgaben von GPKE, GeLi Gas und WiM.21
- **Klärfallbearbeitung:** Die fallabschließende Bearbeitung von Klärfällen aus den Marktprozessen, die durch die elektronische Marktkommunikation anfallen, ist eine zentrale Aufgabe. Dies kann beispielsweise durch fehlerhafte Stammdatenänderungen verursacht werden.4
- **Kommunikation mit Marktpartnern:** Er kommuniziert und koordiniert direkt mit Netzbetreibern und anderen Lieferanten, um den reibungslosen Ablauf zu gewährleisten.8

##### 2.3. Datenaustauschmanager (MaKo-Experte): Der technische Kommunikator

Diese Rolle ist auf die technische Ebene der Marktkommunikation spezialisiert. Der Datenaustauschmanager ist verantwortlich für die technische Integrität, das Monitoring und die regelkonforme Übertragung der Daten zwischen den Marktpartnern.4 Er ist der Fachexperte für die elektronischen Datenformate.
**Kernverantwortlichkeiten:**
- **Monitoring des Datenaustauschs:** Die Überwachung des Versands und der Eingangsprüfung von EDIFACT-Formaten wie UTILMD (Stammdaten), MSCONS (Zählerstände) und APERAK/CONTRL (Fehler- und Bestätigungsmeldungen) gehört zu seinen primären Aufgaben.4
- **Fehlerbehebung:** Bei der Übertragung fehlerhafter Nachrichten ist er für die fachliche Diagnose und die bilaterale Klärung mit den betroffenen Marktpartnern zuständig.4
- **Einhaltung der Compliance:** Er stellt sicher, dass die genutzten Systeme den gesetzlichen Anforderungen entsprechen und passt diese bei den halbjährlichen Formatumstellungen an.7

##### 2.4. Messstellen- und Gerätewechselmanager: Spezialist für die physische Infrastruktur

Diese Rolle ist für die physische Messinfrastruktur und die damit verbundenen Prozesse verantwortlich. Messstellenbetreiber (MSB), die diese Rolle typischerweise besetzen, sind eine eigenständige Instanz, die für den Betrieb der Messstelle zuständig ist.22
**Kernverantwortlichkeiten:**
- **Installation und Wartung von Messeinrichtungen:** Er verantwortet den Einbau, Ausbau, Betrieb und die Wartung von Zählern und Kommunikations- und Steuereinrichtungen.23
- **Gerätewechsel:** Der Manager plant, organisiert und führt den Austausch von Messgeräten durch und koordiniert hierbei die Termine.25
- **Störungsmanagement:** Er ist für die Annahme und Behebung von Gerätestörungen zuständig und leitet Maßnahmen zur Fehlerbehebung ein.25

##### 2.5. Messwertmanagement-Manager: Sicherung der Datenqualität

Der Messwertmanagement-Manager ist für die strukturierte Erfassung, Analyse und Weitergabe von Messwerten zuständig. Er stellt sicher, dass die "Energiewirtschaft nicht nur mit Strom, sondern auch mit Daten" läuft, und gewährleistet die Qualität und Plausibilität der Messdaten.22
**Kernverantwortlichkeiten:**
- **Messwerterfassung und -weitergabe:** Er koordiniert die Ablesung der Zählerstände und leitet die erfassten Werte an den Netzbetreiber und andere berechtigte Empfänger weiter.22
- **Qualitätssicherung:** Die Plausibilisierung der Messdaten und die Korrektur von Datenfehlern sind zentrale Aufgaben, ebenso wie die Bildung von Ersatzwerten bei fehlenden Messdaten.1
- **Datenaufbereitung:** Die übermittelten Messdaten werden aufbereitet und für die Abrechnung nutzbar gemacht.25

##### 2.6. Abrechnungsmanager: Vom Verbrauch zur Rechnung

Der Abrechnungsmanager ist eine wirtschaftlich entscheidende Rolle, die für die korrekte und pünktliche Abrechnung der Kunden sowie die Abrechnung zwischen den Marktpartnern verantwortlich ist.27 Die hohe Qualität der Abrechnungen ist notwendig, um Kundenkontakte mit dem Servicecenter und Stornierungen zu minimieren.11
**Kernverantwortlichkeiten:**
- **Abrechnungserstellung für Endkunden:** Er erstellt eine Vielzahl von Abrechnungen, darunter Turnus-, Zwischen- und Schlussabrechnungen.4
- **Abrechnung zwischen Marktpartnern:** Zu seinen Aufgaben gehört die Abrechnung von Netznutzungsentgelten und die Durchführung der komplexen Mehr-/Mindermengenabrechnung gegenüber dem Lieferanten.27
- **Datenqualität und Plausibilisierung:** Die Sicherstellung einer konstant hohen Datenqualität sowie die Durchführung von Plausibilitätsprüfungen sind essenziell, um Fehler in den Abrechnungen zu vermeiden.4
- **Reklamationsbearbeitung:** Er bearbeitet Rechnungsreklamationen und stellt die fristgerechte Übermittlung relevanter Daten an Marktpartner sicher.4

##### 2.7. Bilanzierungs- und Handelsmanager: Die Schnittstelle zum Handel

Diese Rolle agiert an der Schnittstelle zwischen den operativen M2C-Prozessen und dem Strom- oder Gashandel. Der Manager ist für die ausgeglichene Bewirtschaftung der Bilanzkreise verantwortlich und sorgt dafür, dass Einspeisungen und Entnahmen in jeder Viertelstunde im Gleichgewicht sind.30
**Kernverantwortlichkeiten:**
- **Bilanzkreismanagement:** Er überwacht und steuert die Bilanzkreise, um eine ausgeglichene Bilanz zwischen Einspeisungen und Entnahmen zu gewährleisten.30
- **Clearing und Abrechnung:** Er bearbeitet die Abrechnungspreise für Bilanzabweichungen, die von den Übertragungsnetzbetreibern (ÜNB) ermittelt werden.30
- **Koordinationsaufgaben:** Er koordiniert den Informationsfluss zwischen Kunden, Verteilnetzbetreibern (VNBs), Übertragungsnetzbetreibern (ÜNBs) und dem Handel.14

##### 2.8. Kundenservice-Manager: Bindeglied zum Endkunden

Der Kundenservice ist das entscheidende Bindeglied zwischen dem Energieversorger und dem Kunden.32 Seine Rolle hat sich von einer rein reaktiven Funktion zu einer proaktiven, strategischen Rolle gewandelt.
**Kernverantwortlichkeiten:**
- **Kundenkommunikation:** Er beantwortet und klärt alle Fragen von Endkunden zu energiewirtschaftlichen Geschäftsprozessen.4
- **Proaktive Kundenbetreuung:** Er nutzt intelligente Software, um die Customer Journey zu optimieren, Anfragen automatisiert zu analysieren und personalisierte Tipps zur Energieeinsparung zu geben.32
- **Vertragsmanagement:** Zu den Aufgaben gehören die Tarifberatung, das Vertragsmanagement und die Bearbeitung von Störungsmeldungen.26
- **Rechnungsprüfung:** Er ist Ansprechpartner für Kunden, die ihre Rechnung beanstanden und kümmert sich um die fristgerechte Korrektur fehlerhafter Rechnungen.33

##### 2.9. Forderungsmanager: Sicherung der Liquidität

Diese Rolle ist für das Debitorenmanagement und die Liquiditätssicherung des Unternehmens verantwortlich. Angesichts steigender Energiepreise und Ausfallrisiken hat sich diese Rolle in den letzten Jahren stark gewandelt.17
**Kernverantwortlichkeiten:**
- **Zahlungs- und Mahnwesen:** Er ist zuständig für die Bearbeitung von Zahlungseingängen und -ausgängen sowie für das vorgerichtliche Mahnwesen, einschließlich der Überwachung der Maßnahmen und der Vorbereitung der Übergabe an Inkasso-Dienstleister.4
- **Digitale Strategien:** Zur Reduzierung operativer Kosten und zur Verbesserung der Liquiditätsplanung werden zunehmend KI-basierte Tools eingesetzt. Diese prognostizieren die Zahlungswahrscheinlichkeit (Payment Probability) und optimieren die Kundenkommunikation (Smart Communication).18
- **Sperr- und Insolvenzbearbeitung:** Er kümmert sich um die Abwicklung von Sperrprozessen bei Nichtzahlung und die Bearbeitung von Insolvenzfällen.4

#### 3. Die Matrix der Zusammenarbeit: Schnittstellen der M2C-Rollen

Die Effizienz des M2C-Prozesses hängt maßgeblich von den Interaktionen zwischen den spezialisierten Rollen ab. Die folgende Matrix stellt die wichtigsten Schnittstellen und die damit verbundenen Abhängigkeiten dar.

| Rolle | Primäre Verantwortlichkeiten | Schlüsselschnittstellen |
| :--- | :--- | :--- |
| **M2C-Prozessmanager** | Analyse und Optimierung der gesamten M2C-Kette, Definition von KPIs, Koordination aller Teilprozesse. | Management, alle operativen Fachbereiche (z. B. Wechsel-, Abrechnungs- und Kundenservice-Manager), Projektteams. |
| **Wechselprozessmanager** | Abwicklung des Kunden- und Gerätewechsels, Bearbeitung von Klärfällen. | Datenaustauschmanager (Datenbereitstellung und Fehlerbehebung), Abrechnungsmanager (Abrechnungsstart), Messstellen- und Gerätewechselmanager (Gerätewechselkoordination), Kundenservice-Manager (Kundenanfragen). |
| **Datenaustauschmanager** | Technische Überwachung des Datenaustauschs, Fehlerbehebung, Einhaltung der MaKo-Vorgaben. | Wechselprozessmanager (Bearbeitung technischer Klärfälle), Messwertmanagement-Manager (Empfang von Messwerten), Abrechnungsmanager (Austausch von Rechnungs- und Zahlungsavis-Daten), Bilanzierungs- und Handelsmanager (Datenaustausch zu Bilanzkreisen). |
| **Messstellen- und Gerätewechselmanager** | Einbau, Ausbau und Wartung von Messeinrichtungen, Störungsmanagement. | Messwertmanagement-Manager (Sicherstellung der Messwertübermittlung), Wechselprozessmanager (Koordination von Gerätewechseln), Kundenservice-Manager (Terminabsprachen und Störungsmeldungen). |
| **Messwertmanagement-Manager** | Erfassung, Plausibilisierung und Weitergabe von Messwerten und Abrechnungsdaten. | Messstellen- und Gerätewechselmanager (Ablesung, Gerätestörung), Datenaustauschmanager (Übermittlung von Messwerten), Abrechnungsmanager (Bereitstellung abrechnungsrelevanter Daten), Bilanzierungs- und Handelsmanager (Bereitstellung von Messwerten für die Bilanzierung). |
| **Abrechnungsmanager** | Korrekte Erstellung und Fakturierung von Abrechnungen für Kunden und Marktpartner. | Messwertmanagement-Manager (Empfang plausibilisierter Messdaten), Datenaustauschmanager (EDIFACT-Formate INVOIC, REMADV), Wechselprozessmanager (Start von Abrechnungen nach Wechsel), Forderungsmanager (Übergabe von offenen Forderungen), Kundenservice-Manager (Rechnungsreklamationen). |
| **Bilanzierungs- und Handelsmanager** | Steuerung der Bilanzkreise, Abrechnung von Bilanzabweichungen. | Messwertmanagement-Manager (Empfang von Messdaten), Datenaustauschmanager (Austausch von Daten mit dem ÜNB), Abrechnungsmanager (Verbuchung von Abrechnungen für Ausgleichsenergie), Handel (Preisermittlung und Koordination). |
| **Kundenservice-Manager** | Beantwortung und Klärung von Kundenanliegen, proaktive Kundenkommunikation. | Wechselprozessmanager (Anfragen zum Wechselstatus), Abrechnungsmanager (Rechnungsanfragen und -reklamationen), Messstellen- und Gerätewechselmanager (Ablesetermine und Störungsmeldungen), Forderungsmanager (Zahlungsmodalitäten). |
| **Forderungsmanager** | Steuerung des Debitoren- und Mahnwesens, Liquiditätssicherung. | Abrechnungsmanager (Übergabe von offenen Posten), Kundenservice-Manager (Kommunikation zu Zahlungsmodalitäten mit dem Kunden), Inkasso-Dienstleister (Übergabe von Fällen). |

#### 4. Nuancierte Betrachtung: Abgrenzung ähnlicher Rollen

Die Komplexität des M2C-Prozesses führt dazu, dass bestimmte Rollen in ihrer Aufgabenbeschreibung ähnlich erscheinen können, obwohl sie unterschiedliche Schwerpunkte und Ziele verfolgen. Eine präzise Abgrenzung ist entscheidend für eine klare Organisationsstruktur und effiziente Abläufe.

##### 4.1. Datenaustauschmanager vs. Wechselprozessmanager: Eine kausale Beziehung

Die Ähnlichkeit der Rollen des Datenaustauschmanagers und des Wechselprozessmanagers ist so stark, dass sie in manchen Stellenausschreibungen als eine einzige Funktion (Datenaustauschmanager / Wechselprozessmanager) zusammengefasst werden.19 Diese Zusammenfassung ist allerdings eher ein Indiz für die enge kausale Verknüpfung der beiden Spezialgebiete als für eine tatsächliche Redundanz der Rollen.
Die Unterscheidung liegt in der primären Zuständigkeit:
Der **Wechselprozessmanager** ist der Prozessverantwortliche. Sein Fokus liegt auf dem geschäftlichen Ablauf und der Einhaltung der regulatorischen Logik (z.B. GPKE, GeLi Gas).8 Sein Ziel ist der erfolgreiche und fristgerechte Abschluss eines Kundenwechsels. Er bearbeitet die
Klärfälle und sorgt für eine fallabschließende Bearbeitung aller im Rahmen der Marktkommunikation anfallenden Änderungen.4
Der **Datenaustauschmanager** ist der technische Sachverständige. Sein Fokus liegt auf der technischen Übertragung und der Einhaltung der Formate (z.B. EDIFACT). Seine Aufgabe ist die fehlerfreie Übertragung der Datenpakete (z.B. UTILMD, MSCONS), die für den Wechselprozess notwendig sind.7 Er kümmert sich um die Fehler, die auf technischer Ebene auftreten und korrigiert beispielsweise fehlerhaft eingehende Nachrichten durch bilaterale Klärung.8
Der wesentliche Zusammenhang besteht darin, dass der Wechselprozess des Kunden nicht erfolgreich abgeschlossen werden kann, wenn der Datenaustausch fehlerhaft verläuft. Eine technische Störung im EDIFACT-Format, die der Datenaustauschmanager beheben muss, führt zwangsläufig zu einem Stopp im Prozess des Wechselprozessmanagers. Daher sind diese Rollen nicht austauschbar, sondern komplementär und kausal voneinander abhängig.

##### 4.2. Prozessmanager vs. Fachspezialist: Strategie vs. Operation

Eine weitere wichtige Abgrenzung besteht zwischen dem übergeordneten M2C-Prozessmanager und den operativen Fachspezialisten. Eine FMC-Studie zeigt, dass die Ursachen für Verrechnungsprobleme häufig im fehlenden Verständnis für den Gesamtprozess und der unzureichenden Klarheit über Zuständigkeiten an den Schnittstellen liegen.1 Die Spezialisierung auf Teilprozesse, ohne eine übergeordnete Steuerung, führt zu einer funktionalen Silobildung, bei der die Leistung des Gesamtprozesses nicht mehr transparent ist.
Der **M2C-Prozessmanager** ist die strategische Rolle, die diese Probleme behebt. Seine Aufgabe ist es, die Teilprozesse der Fachspezialisten zu harmonisieren, zu koordinieren und die Performance der gesamten Kette zu optimieren. Er ist nicht primär für die operative Ausführung eines einzelnen Prozesses verantwortlich, sondern für die strategische Gestaltung, das Monitoring und die kontinuierliche Verbesserung des gesamten Systems.9 Die Fachspezialisten hingegen sind für die operative Exzellenz innerhalb ihres jeweiligen, klar definierten Teilprozesses verantwortlich. Der Prozessmanager schafft somit die notwendige Governance, damit die Fachspezialisten effizient und koordiniert agieren können.

#### 5. Herausforderungen und Strategien zur Prozessoptimierung

##### 5.1. Die Notwendigkeit einer zentralen M2C-Verantwortung

Die Analyse zeigt, dass eine der größten Herausforderungen im M2C-Prozess in der organisatorischen Fragmentierung liegt. Unternehmen leiden unter Engpässen, Prozessschwachstellen und fehlenden oder fehlerhaften Abrechnungen, die auf mangelhafte Kommunikation und unklare Verantwortlichkeiten an den Schnittstellen zurückzuführen sind.1
Eine wirksame Strategie zur Behebung dieser Probleme ist der Aufbau und die sofortige Umsetzung einer **zentralen M2C-Verantwortung**.1 Diese übergeordnete Rolle agiert als eine zentrale Anlaufstelle, die den Prozess ganzheitlich betrachtet, analysiert und optimiert. Sie koordiniert die verschiedenen operativen Fachbereiche und stellt sicher, dass Rollen und Schnittstellen klar definiert sind. Dieser Schritt wurde in der Vergangenheit als der "wichtigste Schritt" zur Prozessverbesserung identifiziert.1

##### 5.2. Transparenz durch KPIs und Steuerungskonzepte

Die Überwachung der M2C-Prozessleistung ist oft ineffizient, da Monitoringinstrumente häufig nur auf Teilprozesse ausgerichtet sind und Kennzahlen fehlen, die über einzelne Prozessschritte hinausgehen.1
Die Implementierung eines **M2C-Steuerungskonzepts mit transparenten und bereichsübergreifenden KPIs** ist daher unerlässlich. Solche Kennzahlen können beispielsweise die durchschnittliche Dauer eines M2C-Prozesses, die Anzahl der erfolgreichen Rechnungen oder die Anzahl der pünktlich erreichten Deadlines umfassen.1 Durch diese ganzheitliche Betrachtung wird nicht nur Transparenz geschaffen, sondern auch die Grundlage für eine datengesteuerte, kontinuierliche Prozessoptimierung gelegt.

##### 5.3. Digitalisierung und Automatisierung

Der deutsche Energiemarkt befindet sich in einem rasanten Wandel, der von Digitalisierung und neuen Technologien getrieben wird.20 Der Trend geht weg von monolithischen IT-Lösungen hin zu modularen Systemlandschaften mit spezialisierten Lösungen, die über entsprechende Schnittstellen verbunden sind.20 Dies ermöglicht es EVU, flexibler auf Marktanforderungen zu reagieren und externe Dienstleister einfacher einzubinden.
Die Anforderungen an die M2C-Rollen steigen im Zuge dieser Entwicklung. Ein Beispiel hierfür ist die Verkürzung des Lieferantenwechsels auf 24 Stunden ab Juni 2025.7 Diese beschleunigten Prozesse können manuell kaum noch effizient bearbeitet werden und erfordern eine umfassende Automatisierung. Auch im Forderungsmanagement kommen bereits datengetriebene und KI-basierte Lösungen zum Einsatz, die die Zahlungswahrscheinlichkeit prognostizieren und die Kundenkommunikation optimieren, um Liquiditätsengpässe zu reduzieren.18 Zukünftige Rollenprofile müssen sich daher von reinen Sachbearbeitern zu Prozess- und Integrationsmanagern entwickeln, die automatisierte Workflows und neue Technologien steuern können.

#### 6. Fazit und Ausblick

Der Meter-to-Cash-Prozess im deutschen Energiemarkt ist eine komplexe, regulatorisch geprägte Kette, deren Effizienz maßgeblich vom Zusammenspiel hochspezialisierter Rollen abhängt. Die vom Nutzer angefragten Rollen des Datenaustauschmanagers und des Wechselprozessmanagers sind nicht identisch, sondern komplementär: Die technische Expertise des einen ermöglicht den reibungslosen Geschäftsprozess des anderen. Ihre enge Verknüpfung unterstreicht die Notwendigkeit einer ganzheitlichen Betrachtung.
Die größte Schwachstelle in der Organisation des M2C-Prozesses ist häufig das fehlende Verständnis für die gesamte Kette und die damit einhergehenden Schnittstellenprobleme. Die Implementierung einer zentralen M2C-Verantwortung und eines Steuerungskonzepts mit bereichsübergreifenden KPIs ist der wichtigste Schritt, um Transparenz zu schaffen und die Effizienz nachhaltig zu steigern.
Der Markt entwickelt sich rasant weiter. Regularien wie der 24-Stunden-Lieferantenwechsel, technologische Trends wie modulare IT-Systeme und der verstärkte Einsatz von Künstlicher Intelligenz werden die M2C-Rollen weiter formen und verändern. Die Fähigkeit, den gesamten Prozess zu überblicken, zu steuern und kontinuierlich an die neuen Anforderungen anzupassen, wird somit zum entscheidenden Wettbewerbsvorteil für Energieversorgungsunternehmen.


## 6. Offene Fragen

- Sollen Benutzer eine oder mehrere Rollen auswählen können? (Aktueller Entwurf geht von mehreren aus).
- Wie genau soll der Rollen-Kontext in den Prompt integriert werden? Als Teil des System-Prompts oder als separate "Benutzerprofil"-Information?

