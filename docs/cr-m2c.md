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

## 7. Detaillierter Implementierungsplan für Code-Agent

### 7.1. Architektur-Prinzipien

**Feature Flag:** `ENABLE_M2C_ROLES=true` (Fallback: keine Prompt-Erweiterung)
**Design:** Nicht-invasiv, keine Änderung bestehender Auth-Flows
**Caching:** In-Memory Cache (TTL 10 Min) für Rollen-Katalog + User-Auswahl
**Sicherheit:** Nur authentifizierte User können eigene Auswahl lesen/schreiben
**Datenmodell:** JSONB-Array für User-Auswahl (schnelle Iteration)

### 7.2. Phase 1: Backend-Implementation

#### 7.2.1 Datenbank-Migration
**Datei:** `db/migrations/20250810_add_m2c_roles.sql`

```sql
-- Neue Tabelle für M2C-Rollen
CREATE TABLE m2c_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index für Performance
CREATE INDEX idx_m2c_roles_role_name ON m2c_roles(role_name);

-- Erweiterung der Users-Tabelle
ALTER TABLE users ADD COLUMN selected_m2c_role_ids UUID[] DEFAULT '{}';

-- Index für User-Rollen
CREATE INDEX idx_users_m2c_roles ON users USING GIN(selected_m2c_role_ids);
```

#### 7.2.2 Seed-Daten
**Datei:** `data/m2c_roles.seed.json`

```json
[
  {
    "role_name": "M2C-Prozessmanager",
    "short_description": "Strategische Steuerung des gesamten Meter-to-Cash-Prozesses",
    "detailed_description": "Der M2C-Prozessmanager ist eine strategische Rolle, die den gesamten Prozess ganzheitlich betrachtet. Seine primäre Aufgabe ist die Sicherstellung des reibungslosen, effizienten und transparenten Ablaufs der gesamten M2C-Kette. Er analysiert den Ist-Zustand des Prozesses, identifiziert Schwachstellen, Engpässe und Fehlerquellen und entwickelt konkrete Maßnahmen zur Behebung. Er koordiniert die verschiedenen Abteilungen und überwacht Kennzahlensysteme (KPIs) für die Leistung des Gesamtprozesses."
  },
  {
    "role_name": "Wechselprozessmanager",
    "short_description": "End-to-End Steuerung von Lieferanten- und Gerätewechseln",
    "detailed_description": "Der Wechselprozessmanager ist ein operativer Fachexperte, dessen Fokus auf der end-to-end-Bearbeitung aller Geschäftsprozesse im Zusammenhang mit einem Kunden- oder Messstellenwechsel liegt. Er verantwortet die gesamte Abwicklung von Lieferantenwechselprozessen, Gerätewechseln und Sachbearbeiterentscheidungen gemäß den regulatorischen Vorgaben von GPKE, GeLi Gas und WiM. Die fallabschließende Bearbeitung von Klärfällen aus den Marktprozessen ist eine zentrale Aufgabe."
  },
  {
    "role_name": "Datenaustauschmanager",
    "short_description": "Technische Integrität & Monitoring der EDIFACT-Kommunikation",
    "detailed_description": "Diese Rolle ist auf die technische Ebene der Marktkommunikation spezialisiert. Der Datenaustauschmanager ist verantwortlich für die technische Integrität, das Monitoring und die regelkonforme Übertragung der Daten zwischen den Marktpartnern. Die Überwachung des Versands und der Eingangsprüfung von EDIFACT-Formaten wie UTILMD (Stammdaten), MSCONS (Zählerstände) und APERAK/CONTRL gehört zu seinen primären Aufgaben. Er ist der Fachexperte für die elektronischen Datenformate."
  },
  {
    "role_name": "Messstellen- und Gerätewechselmanager",
    "short_description": "Physische Messinfrastruktur und Gerätewechsel-Prozesse",
    "detailed_description": "Diese Rolle ist für die physische Messinfrastruktur und die damit verbundenen Prozesse verantwortlich. Er verantwortet den Einbau, Ausbau, Betrieb und die Wartung von Zählern und Kommunikations- und Steuereinrichtungen. Der Manager plant, organisiert und führt den Austausch von Messgeräten durch und koordiniert hierbei die Termine. Störungsmanagement und die Annahme und Behebung von Gerätestörungen sind zentrale Aufgaben."
  },
  {
    "role_name": "Messwertmanagement-Manager",
    "short_description": "Strukturierte Erfassung, Analyse und Weitergabe von Messwerten",
    "detailed_description": "Der Messwertmanagement-Manager ist für die strukturierte Erfassung, Analyse und Weitergabe von Messwerten zuständig. Er koordiniert die Ablesung der Zählerstände und leitet die erfassten Werte an den Netzbetreiber und andere berechtigte Empfänger weiter. Die Plausibilisierung der Messdaten und die Korrektur von Datenfehlern sind zentrale Aufgaben, ebenso wie die Bildung von Ersatzwerten bei fehlenden Messdaten."
  },
  {
    "role_name": "Abrechnungsmanager",
    "short_description": "Korrekte Abrechnung für Endkunden und Marktpartner",
    "detailed_description": "Der Abrechnungsmanager ist eine wirtschaftlich entscheidende Rolle, die für die korrekte und pünktliche Abrechnung der Kunden sowie die Abrechnung zwischen den Marktpartnern verantwortlich ist. Er erstellt eine Vielzahl von Abrechnungen, darunter Turnus-, Zwischen- und Schlussabrechnungen. Zu seinen Aufgaben gehört die Abrechnung von Netznutzungsentgelten und die Durchführung der komplexen Mehr-/Mindermengenabrechnung gegenüber dem Lieferanten."
  },
  {
    "role_name": "Bilanzierungs- und Handelsmanager",
    "short_description": "Bilanzkreismanagement und Schnittstelle zum Energiehandel",
    "detailed_description": "Diese Rolle agiert an der Schnittstelle zwischen den operativen M2C-Prozessen und dem Strom- oder Gashandel. Der Manager ist für die ausgeglichene Bewirtschaftung der Bilanzkreise verantwortlich und sorgt dafür, dass Einspeisungen und Entnahmen in jeder Viertelstunde im Gleichgewicht sind. Er bearbeitet die Abrechnungspreise für Bilanzabweichungen und koordiniert den Informationsfluss zwischen verschiedenen Marktpartnern."
  },
  {
    "role_name": "Kundenservice-Manager",
    "short_description": "Bindeglied zum Endkunden und proaktive Kundenbetreuung",
    "detailed_description": "Der Kundenservice ist das entscheidende Bindeglied zwischen dem Energieversorger und dem Kunden. Er beantwortet und klärt alle Fragen von Endkunden zu energiewirtschaftlichen Geschäftsprozessen. Seine Rolle hat sich von einer rein reaktiven Funktion zu einer proaktiven, strategischen Rolle gewandelt. Er nutzt intelligente Software, um die Customer Journey zu optimieren und personalisierte Tipps zur Energieeinsparung zu geben."
  },
  {
    "role_name": "Forderungsmanager",
    "short_description": "Debitorenmanagement und Liquiditätssicherung",
    "detailed_description": "Diese Rolle ist für das Debitorenmanagement und die Liquiditätssicherung des Unternehmens verantwortlich. Er ist zuständig für die Bearbeitung von Zahlungseingängen und -ausgängen sowie für das vorgerichtliche Mahnwesen. Zur Reduzierung operativer Kosten werden zunehmend KI-basierte Tools eingesetzt, die die Zahlungswahrscheinlichkeit prognostizieren und die Kundenkommunikation optimieren."
  }
]
```

**Datei:** `scripts/seed-m2c-roles.ts`

```typescript
import { DatabaseHelper } from '../src/utils/database';
import * as fs from 'fs';
import * as path from 'path';

const seedRoles = async () => {
  try {
    const rolesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/m2c_roles.seed.json'), 'utf8')
    );

    for (const role of rolesData) {
      await DatabaseHelper.executeQuery(`
        INSERT INTO m2c_roles (role_name, short_description, detailed_description)
        VALUES ($1, $2, $3)
        ON CONFLICT (role_name) DO UPDATE SET
          short_description = EXCLUDED.short_description,
          detailed_description = EXCLUDED.detailed_description,
          updated_at = CURRENT_TIMESTAMP
      `, [role.role_name, role.short_description, role.detailed_description]);
    }

    console.log('M2C roles seeded successfully');
  } catch (error) {
    console.error('Error seeding M2C roles:', error);
    process.exit(1);
  }
};

seedRoles();
```

#### 7.2.3 Repository Layer
**Datei:** `src/repositories/m2cRoleRepository.ts`

```typescript
import { DatabaseHelper } from '../utils/database';

export interface M2CRole {
  id: string;
  role_name: string;
  short_description: string;
  detailed_description: string;
  created_at: Date;
  updated_at: Date;
}

export class M2CRoleRepository {
  async findAll(): Promise<M2CRole[]> {
    return await DatabaseHelper.executeQuery<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      ORDER BY role_name
    `);
  }

  async findByIds(roleIds: string[]): Promise<M2CRole[]> {
    if (roleIds.length === 0) return [];
    
    return await DatabaseHelper.executeQuery<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE id = ANY($1)
      ORDER BY role_name
    `, [roleIds]);
  }

  async findByName(roleName: string): Promise<M2CRole | null> {
    return await DatabaseHelper.executeQuerySingle<M2CRole>(`
      SELECT id, role_name, short_description, detailed_description, created_at, updated_at
      FROM m2c_roles
      WHERE role_name = $1
    `, [roleName]);
  }
}
```

#### 7.2.4 Service Layer
**Datei:** `src/services/m2cRoleService.ts`

```typescript
import { M2CRoleRepository, M2CRole } from '../repositories/m2cRoleRepository';
import { DatabaseHelper } from '../utils/database';

const MAX_USER_M2C_ROLES = 5;
const MAX_CONTEXT_LENGTH = 2500;
const MAX_DESCRIPTION_LENGTH = 800;

interface UserRoleSelection {
  roleIds: string[];
  roles: M2CRole[];
}

export class M2CRoleService {
  private roleRepository: M2CRoleRepository;
  private rolesCache: { data: M2CRole[]; loadedAt: number } | null = null;
  private userSelectionCache: Map<string, { ids: string[]; loadedAt: number }> = new Map();
  
  private readonly TTL_ROLES = 10 * 60 * 1000; // 10 minutes
  private readonly TTL_USER = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.roleRepository = new M2CRoleRepository();
  }

  async getAllRoles(): Promise<M2CRole[]> {
    const now = Date.now();
    
    if (this.rolesCache && (now - this.rolesCache.loadedAt) < this.TTL_ROLES) {
      return this.rolesCache.data;
    }

    const roles = await this.roleRepository.findAll();
    this.rolesCache = { data: roles, loadedAt: now };
    return roles;
  }

  async getUserRoleSelection(userId: string): Promise<UserRoleSelection> {
    const roleIds = await this.getUserSelectedRoleIds(userId);
    const roles = roleIds.length > 0 ? await this.roleRepository.findByIds(roleIds) : [];
    
    return { roleIds, roles };
  }

  async updateUserRoleSelection(userId: string, roleIds: string[]): Promise<void> {
    // Validation
    if (roleIds.length > MAX_USER_M2C_ROLES) {
      throw new Error(`Maximal ${MAX_USER_M2C_ROLES} Rollen können ausgewählt werden`);
    }

    // Validate UUIDs and existence
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length > 0) {
      const existingRoles = await this.roleRepository.findByIds(uniqueRoleIds);
      if (existingRoles.length !== uniqueRoleIds.length) {
        throw new Error('Einer oder mehrere der ausgewählten Rollen existieren nicht');
      }
    }

    // Update database
    await DatabaseHelper.executeQuery(`
      UPDATE users 
      SET selected_m2c_role_ids = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [uniqueRoleIds, userId]);

    // Invalidate cache
    this.userSelectionCache.delete(userId);
  }

  async buildUserRoleContext(userId: string): Promise<string> {
    if (!this.isFeatureEnabled()) {
      return '';
    }

    const roleIds = await this.getUserSelectedRoleIds(userId);
    if (roleIds.length === 0) {
      return '';
    }

    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length === 0) {
      return '';
    }

    // Sort roles alphabetically for deterministic output
    roles.sort((a, b) => a.role_name.localeCompare(b.role_name));

    let context = `Rollen aktiv: ${roles.map(r => r.role_name).join(', ')}\n\n`;
    context += 'Kurzzusammenfassung:\n';
    roles.forEach(role => {
      context += `- ${role.role_name}: ${role.short_description}\n`;
    });
    context += '\nDetails:\n';

    // Add detailed descriptions with length management
    for (const role of roles) {
      let description = role.detailed_description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        // Find last word boundary before limit
        const truncated = description.substring(0, MAX_DESCRIPTION_LENGTH);
        const lastSpace = truncated.lastIndexOf(' ');
        description = truncated.substring(0, lastSpace) + '...';
      }
      context += `${role.role_name}: ${description}\n---\n`;
    }

    // Final length check
    if (context.length > MAX_CONTEXT_LENGTH) {
      // Fallback to short descriptions only
      context = `Rollen aktiv: ${roles.map(r => r.role_name).join(', ')}\n\n`;
      roles.forEach(role => {
        context += `${role.role_name}: ${role.short_description}\n`;
      });
    }

    return context;
  }

  private async getUserSelectedRoleIds(userId: string): Promise<string[]> {
    const now = Date.now();
    const cached = this.userSelectionCache.get(userId);
    
    if (cached && (now - cached.loadedAt) < this.TTL_USER) {
      return cached.ids;
    }

    const result = await DatabaseHelper.executeQuerySingle<{ selected_m2c_role_ids: string[] }>(`
      SELECT selected_m2c_role_ids FROM users WHERE id = $1
    `, [userId]);

    const roleIds = result?.selected_m2c_role_ids || [];
    this.userSelectionCache.set(userId, { ids: roleIds, loadedAt: now });
    
    return roleIds;
  }

  private isFeatureEnabled(): boolean {
    return process.env.ENABLE_M2C_ROLES === 'true';
  }

  clearCache(): void {
    this.rolesCache = null;
    this.userSelectionCache.clear();
  }
}

export default new M2CRoleService();
```

#### 7.2.5 API Routes
**Datei:** `src/routes/m2cRoles.ts`

```typescript
import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/errors';
import { ResponseUtils } from '../utils/response';
import m2cRoleService from '../services/m2cRoleService';

const router = Router();

// Get all available M2C roles
router.get('/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const roles = await m2cRoleService.getAllRoles();
  const publicRoles = roles.map(role => ({
    id: role.id,
    role_name: role.role_name,
    short_description: role.short_description
  }));

  ResponseUtils.success(res, publicRoles, 'M2C-Rollen erfolgreich abgerufen');
}));

// Get user's selected M2C roles
router.get('/users/me/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const userId = req.user!.id;
  const selection = await m2cRoleService.getUserRoleSelection(userId);
  
  const response = {
    roleIds: selection.roleIds,
    roles: selection.roles.map(role => ({
      id: role.id,
      role_name: role.role_name,
      short_description: role.short_description
    }))
  };

  ResponseUtils.success(res, response, 'Benutzer M2C-Rollen erfolgreich abgerufen');
}));

// Update user's selected M2C roles
router.put('/users/me/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const userId = req.user!.id;
  const { roleIds } = req.body;

  if (!Array.isArray(roleIds)) {
    throw new AppError('roleIds muss ein Array sein', 400);
  }

  // Validate UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalidIds = roleIds.filter(id => typeof id !== 'string' || !uuidRegex.test(id));
  if (invalidIds.length > 0) {
    throw new AppError('Ungültige Rollen-IDs entdeckt', 400);
  }

  await m2cRoleService.updateUserRoleSelection(userId, roleIds);

  ResponseUtils.success(res, { roleIds }, 'M2C-Rollen erfolgreich aktualisiert');
}));

export default router;
```

#### 7.2.6 Chat Integration
**Datei:** Anpassung von `src/services/chatConfigurationService.ts`

```typescript
// Ergänzung in generateConfiguredResponse Methode:
import m2cRoleService from './m2cRoleService';

// In der generateConfiguredResponse Methode vor Step 4 (Response Generation):
      // Step 3.5: M2C Role Context (if enabled)
      let roleContext = '';
      if (this.isStepEnabled(config, 'response_generation')) {
        processingSteps.push({
          name: 'M2C Role Context',
          startTime: Date.now(),
          enabled: true
        });

        try {
          roleContext = await m2cRoleService.buildUserRoleContext(userId);
          if (roleContext) {
            console.log(`M2C Role context added for user ${userId}: ${roleContext.length} characters`);
          }
        } catch (error) {
          console.warn('Failed to load M2C role context:', error);
          roleContext = '';
        }

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          contextLength: roleContext.length,
          hasRoleContext: roleContext.length > 0
        };
      }

      // Step 4: Response Generation (if enabled) - Angepasst
      let response = '';
      if (this.isStepEnabled(config, 'response_generation')) {
        // ...existing code...

        // Enhanced system prompt with role context
        let enhancedSystemPrompt = config.config.systemPrompt;
        if (roleContext) {
          enhancedSystemPrompt += '\n\n[Benutzer-Rollenkontext]\n' + roleContext;
        }

        // Use enhanced system prompt in geminiService call
        response = await geminiService.generateResponse(
          messages,
          contextUsed,
          userPreferences,
          false,
          contextMode,
          enhancedSystemPrompt // Pass enhanced prompt if geminiService supports it
        );
        
        // ...rest of existing code...
      }
```

#### 7.2.7 Auth Route Erweiterung
**Datei:** Anpassung von `src/routes/auth.ts`

```typescript
// In der /profile Route ergänzen:
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const client = await pool.connect();
  
  try {
    const userResult = await client.query(
      'SELECT id, email, name, full_name, company, role, selected_m2c_role_ids FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Benutzer nicht gefunden', 404);
    }

    const user = userResult.rows[0];

    const profileData: any = {
      id: user.id,
      email: user.email,
      name: user.name,
      full_name: user.full_name,
      company: user.company,
      role: user.role
    };

    // Add M2C role info if feature is enabled
    if (process.env.ENABLE_M2C_ROLES === 'true') {
      profileData.selected_m2c_role_ids = user.selected_m2c_role_ids || [];
    }

    ResponseUtils.success(res, profileData, 'Profil erfolgreich abgerufen');

  } finally {
    client.release();
  }
}));
```

### 7.3. Phase 2: Frontend-Implementierung (Legacy React)

#### 7.3.1 API Client Erweiterung
**Datei:** `app-legacy/src/api/userApi.js` (oder `.ts`)

```javascript
// Ergänzung der bestehenden userApi

export const getUserM2CRoles = async () => {
  const response = await fetch('/api/users/me/m2c-roles', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user M2C roles');
  }
  
  return response.json();
};

export const updateUserM2CRoles = async (roleIds) => {
  const response = await fetch('/api/users/me/m2c-roles', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roleIds })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update user M2C roles');
  }
  
  return response.json();
};

export const getAllM2CRoles = async () => {
  const response = await fetch('/api/m2c-roles', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch M2C roles');
  }
  
  return response.json();
};
```

#### 7.3.2 M2C Role Selector Component
**Datei:** `app-legacy/src/components/profile/M2CRoleSelector.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { getAllM2CRoles, getUserM2CRoles, updateUserM2CRoles } from '../../api/userApi';

const M2CRoleSelector = () => {
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [initialSelectedIds, setInitialSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rolesResponse, userRolesResponse] = await Promise.all([
        getAllM2CRoles(),
        getUserM2CRoles()
      ]);
      
      setAllRoles(rolesResponse.data || []);
      setSelectedRoleIds(userRolesResponse.data?.roleIds || []);
      setInitialSelectedIds(userRolesResponse.data?.roleIds || []);
    } catch (err) {
      setError('Fehler beim Laden der M2C-Rollen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId) => {
    setSelectedRoleIds(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        if (prev.length >= 5) {
          setError('Maximal 5 Rollen können ausgewählt werden');
          return prev;
        }
        return [...prev, roleId];
      }
    });
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await updateUserM2CRoles(selectedRoleIds);
      setInitialSelectedIds([...selectedRoleIds]);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedRoleIds.sort()) !== JSON.stringify(initialSelectedIds.sort());

  if (loading) {
    return (
      <div className="m2c-roles-selector">
        <h3>Meter-to-Cash Rollen</h3>
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <div className="m2c-roles-selector">
      <fieldset>
        <legend>
          <h3>Meter-to-Cash Rollen</h3>
        </legend>
        
        <p className="description">
          Wählen Sie die für Sie relevanten M2C-Rollen aus. Diese Informationen helfen dem KI-Assistenten, 
          passendere Antworten auf Ihre spezifischen Aufgaben und Perspektiven zu geben.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            M2C-Rollen erfolgreich gespeichert!
          </div>
        )}

        <div className="roles-grid">
          {allRoles.map(role => (
            <div key={role.id} className="role-item">
              <label className="role-checkbox">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  disabled={saving}
                />
                <div className="role-content">
                  <strong className="role-name">{role.role_name}</strong>
                  <p className="role-description">{role.short_description}</p>
                </div>
              </label>
            </div>
          ))}
        </div>

        <div className="actions">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn btn-primary"
          >
            {saving ? 'Speichern...' : 'Änderungen speichern'}
          </button>
          
          <span className="selection-count">
            {selectedRoleIds.length} von 5 Rollen ausgewählt
          </span>
        </div>
      </fieldset>
    </div>
  );
};

export default M2CRoleSelector;
```

#### 7.3.3 CSS Styles
**Datei:** `app-legacy/src/components/profile/M2CRoleSelector.css`

```css
.m2c-roles-selector {
  margin: 2rem 0;
}

.m2c-roles-selector fieldset {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 0;
}

.m2c-roles-selector legend h3 {
  margin: 0;
  padding: 0 0.5rem;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.alert-error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.role-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0;
  transition: border-color 0.2s ease;
}

.role-item:hover {
  border-color: #007bff;
}

.role-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  margin: 0;
  width: 100%;
}

.role-checkbox input[type="checkbox"] {
  margin: 0;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.role-content {
  flex: 1;
}

.role-name {
  display: block;
  color: #333;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.role-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selection-count {
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
```

### 7.4. Phase 3: Integration & Testing

#### 7.4.1 Environment Configuration
**Datei:** `.env` Ergänzung

```bash
# M2C Roles Feature
ENABLE_M2C_ROLES=true
```

#### 7.4.2 Package.json Scripts Ergänzung
**Datei:** `package.json`

```json
{
  "scripts": {
    "seed:m2c-roles": "npx tsx scripts/seed-m2c-roles.ts"
  }
}
```

#### 7.4.3 Route Registration
**Datei:** `src/server.ts` oder Hauptrouter

```typescript
// Ergänzung der Route-Registration
import m2cRolesRouter from './routes/m2cRoles';

app.use('/api', m2cRolesRouter);
```

#### 7.4.4 Unit Tests
**Datei:** `src/services/__tests__/m2cRoleService.test.ts`

```typescript
import { M2CRoleService } from '../m2cRoleService';
import { M2CRoleRepository } from '../../repositories/m2cRoleRepository';

jest.mock('../../repositories/m2cRoleRepository');
jest.mock('../../utils/database');

describe('M2CRoleService', () => {
  let service: M2CRoleService;
  let mockRepository: jest.Mocked<M2CRoleRepository>;

  beforeEach(() => {
    mockRepository = new M2CRoleRepository() as jest.Mocked<M2CRoleRepository>;
    service = new M2CRoleService();
    (service as any).roleRepository = mockRepository;
    process.env.ENABLE_M2C_ROLES = 'true';
  });

  afterEach(() => {
    service.clearCache();
    delete process.env.ENABLE_M2C_ROLES;
  });

  describe('buildUserRoleContext', () => {
    it('should return empty string when feature disabled', async () => {
      process.env.ENABLE_M2C_ROLES = 'false';
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });

    it('should return empty string when user has no roles', async () => {
      // Mock empty role selection
      const context = await service.buildUserRoleContext('user-id');
      expect(context).toBe('');
    });

    it('should build proper context for multiple roles', async () => {
      const mockRoles = [
        {
          id: '1',
          role_name: 'Abrechnungsmanager',
          short_description: 'Abrechnung',
          detailed_description: 'Detailed description of billing manager role.',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2', 
          role_name: 'Datenaustauschmanager',
          short_description: 'Datenaustausch',
          detailed_description: 'Detailed description of data exchange manager role.',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockRepository.findByIds.mockResolvedValue(mockRoles);
      
      const context = await service.buildUserRoleContext('user-id');
      
      expect(context).toContain('Rollen aktiv: Abrechnungsmanager, Datenaustauschmanager');
      expect(context).toContain('Kurzzusammenfassung:');
      expect(context).toContain('- Abrechnungsmanager: Abrechnung');
      expect(context).toContain('- Datenaustauschmanager: Datenaustausch');
      expect(context).toContain('Details:');
    });

    it('should truncate context if too long', async () => {
      const longDescription = 'a'.repeat(1000);
      const mockRoles = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        role_name: `Role${i + 1}`,
        short_description: `Short${i + 1}`,
        detailed_description: longDescription,
        created_at: new Date(),
        updated_at: new Date()
      }));

      mockRepository.findByIds.mockResolvedValue(mockRoles);
      
      const context = await service.buildUserRoleContext('user-id');
      
      expect(context.length).toBeLessThanOrEqual(2500);
    });
  });

  describe('updateUserRoleSelection', () => {
    it('should reject more than 5 roles', async () => {
      const roleIds = Array.from({ length: 6 }, (_, i) => `role-${i}`);
      
      await expect(service.updateUserRoleSelection('user-id', roleIds))
        .rejects.toThrow('Maximal 5 Rollen können ausgewählt werden');
    });

    it('should reject non-existent roles', async () => {
      mockRepository.findByIds.mockResolvedValue([]);
      
      await expect(service.updateUserRoleSelection('user-id', ['non-existent']))
        .rejects.toThrow('Einer oder mehrere der ausgewählten Rollen existieren nicht');
    });
  });
});
```

#### 7.4.5 Integration Tests
**Datei:** `src/routes/__tests__/m2cRoles.integration.test.ts`

```typescript
import request from 'supertest';
import app from '../../app'; // Your Express app
import { DatabaseHelper } from '../../utils/database';

describe('M2C Roles API Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    process.env.ENABLE_M2C_ROLES = 'true';
  });

  afterAll(async () => {
    // Cleanup
    delete process.env.ENABLE_M2C_ROLES;
  });

  describe('GET /api/m2c-roles', () => {
    it('should return all M2C roles', async () => {
      const response = await request(app)
        .get('/api/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const role = response.body.data[0];
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('role_name');
      expect(role).toHaveProperty('short_description');
      expect(role).not.toHaveProperty('detailed_description'); // Should not expose detailed in list
    });

    it('should return 404 when feature disabled', async () => {
      process.env.ENABLE_M2C_ROLES = 'false';
      
      await request(app)
        .get('/api/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
        
      process.env.ENABLE_M2C_ROLES = 'true';
    });
  });

  describe('PUT /api/users/me/m2c-roles', () => {
    it('should update user role selection', async () => {
      // First get available roles
      const rolesResponse = await request(app)
        .get('/api/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`);
      
      const availableRoles = rolesResponse.body.data;
      const roleIds = availableRoles.slice(0, 2).map(r => r.id);

      const response = await request(app)
        .put('/api/users/me/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roleIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roleIds).toEqual(roleIds);
    });

    it('should reject invalid role IDs', async () => {
      await request(app)
        .put('/api/users/me/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roleIds: ['invalid-uuid'] })
        .expect(400);
    });

    it('should reject more than 5 roles', async () => {
      const roleIds = Array.from({ length: 6 }, () => '550e8400-e29b-41d4-a716-446655440000');
      
      await request(app)
        .put('/api/users/me/m2c-roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roleIds })
        .expect(400);
    });
  });
});
```

### 7.5. Phase 4: Deployment & Monitoring

#### 7.5.1 Migration Reihenfolge
1. `npm run build:backend`
2. Datenbankspräflichung: `psql -f db/migrations/20250810_add_m2c_roles.sql`
3. Seed-Daten: `npm run seed:m2c-roles`
4. `ENABLE_M2C_ROLES=true` setzen
5. Server-Neustart
6. Frontend-Build und Deploy

#### 7.5.2 Monitoring & Logging
```typescript
// In chatConfigurationService.ts nach Role Context Loading:
if (roleContext) {
  console.log(`M2C Role context applied for user ${userId}: ${roleContext.length} chars, ${roleContext.split('Rollen aktiv:')[1]?.split('\n')[0] || 'unknown roles'}`);
}
```

#### 7.5.3 Performance Monitoring
- Cache Hit Rate für Rollen-Daten
- Durchschnittliche Kontextlänge
- User Adoption Rate (% User mit ausgewählten Rollen)

### 7.6. Rollback Plan
1. `ENABLE_M2C_ROLES=false` setzen
2. Server-Restart (Feature deaktiviert, aber Daten bleiben)
3. Optional: Frontend ohne M2C-Komponente deployen
4. Bei Problemen: `ALTER TABLE users DROP COLUMN selected_m2c_role_ids;`

### 7.7. Agent Task Checklist

**Backend (Sequenziell):**
- [ ] Migration 20250810_add_m2c_roles.sql erstellen
- [ ] Seed-Daten JSON erstellen  
- [ ] Seed-Script schreiben
- [ ] M2CRoleRepository implementieren
- [ ] M2CRoleService implementieren
- [ ] API Routes implementieren
- [ ] ChatConfigurationService erweitern
- [ ] Auth Route erweitern
- [ ] Route Registration

**Frontend (Parallel möglich):**
- [ ] API Client erweitern
- [ ] M2CRoleSelector Component
- [ ] CSS Styles
- [ ] Profile Page Integration

**Testing & Deployment:**
- [ ] Unit Tests schreiben
- [ ] Integration Tests schreiben
- [ ] Environment Config
- [ ] Package.json Scripts
- [ ] Migration ausführen
- [ ] Seeds ausführen
- [ ] Feature Flag aktivieren

**Erfolg-Kriterien:**
- [ ] User kann Rollen auswählen und speichern
- [ ] Chat erhält Rollen-Kontext (sichtbar in Logs)
- [ ] Feature Flag OFF → keine DB-Zugriffe auf m2c_roles
- [ ] Max 5 Rollen Validation funktioniert

- [ ] Gesamter Kontext ≤ 3000 Zeichen

