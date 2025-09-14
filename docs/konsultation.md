# Konzept zur Nutzung und Veröffentlichung von API-Webdiensten

## Inhaltsverzeichnis

  * [cite\_start]**1** Warum veröffentlicht EDI@Energy ein Konzept? [cite: 13]
  * [cite\_start]**2** Einleitung [cite: 13]
  * [cite\_start]**3** Veröffentlichung auf GitHub [cite: 13]
      * [cite\_start]**3.1** Versionierung eines Repository [cite: 13]
      * [cite\_start]**3.2** Änderungsmanagement [cite: 13]
      * [cite\_start]**3.3** Änderungshistorie des Releases und eines API-Webdienstes [cite: 13]
          * [cite\_start]**3.3.1** Änderungshistorie eines Repository [cite: 13]
          * [cite\_start]**3.3.2** Änderungshistorie eines API-Webdienstes [cite: 13]
  * [cite\_start]**4** Umgang mit zukünftigen Konsultationsbeiträgen [cite: 13]
  * [cite\_start]**5** Fehler oder Änderungswunsch in einem API-Webdienst [cite: 13]
  * [cite\_start]**6** Aufbau der API-Webdienste [cite: 13]
      * [cite\_start]**6.1** Aufbau von API-Webdiensten und zentrale Ablage der Schemas [cite: 13]
      * [cite\_start]**6.2** Namenskonventionen der API-Webdienste [cite: 13]
      * [cite\_start]**6.3** Namenskonventionen der YAML-Dateien der API-Webdienste [cite: 13]
      * [cite\_start]**6.4** Namenskonventionen der Schemas [cite: 13]
      * [cite\_start]**6.5** Namenskonventionen der YAML-Dateien der Schemas [cite: 13]
      * [cite\_start]**6.6** Kombinationen von Schemas [cite: 13]
  * [cite\_start]**7** Visualisierung der API-Webdienste [cite: 13]
  * [cite\_start]**8** Zeitplan zur Umsetzung im Energiemarkt [cite: 13]
      * [cite\_start]**8.1** Zeitplan für bestehende API-Webdienste [cite: 13]
      * [cite\_start]**8.2** Zeitplan für neue API-Webdienste [cite: 13]
  * [cite\_start]**9** Ausgestaltung zukünftiger API-Webdienste [cite: 13]
      * [cite\_start]**9.1** Hinweise zu den API-Webdiensten zur Messwertübermittlung [cite: 13]
          * [cite\_start]**9.1.1** Ausprägung von Arrays bei API-Webdiensten zur Messwertübermittlung [cite: 13]
          * [cite\_start]**9.1.2** OBIS-Kennzahlen bei API-Webdiensten zur Messwertübermittlung [cite: 13]
  * [cite\_start]**10** Rückmeldung zum Konzept im Rahmen des Konsultationsverfahrens [cite: 13]
      * [cite\_start]**10.1** Rückmeldung zu Kapitel 1 bis 8 [cite: 13]
      * [cite\_start]**10.2** Rückmeldung zu Kapitel 9 [cite: 13]

-----

## 1 Warum veröffentlicht EDI@Energy ein Konzept?

[cite\_start]Ein Konzept ermöglicht es EDI@Energy, allen Marktteilnehmern eine neue Idee zur Weiterentwicklung der EDI@Energy-Dokumente vorzustellen und darüber in einer Konsultation zu diskutieren[cite: 21]. [cite\_start]Anhand der Rückmeldungen aus dem Markt wird dann das weitere Vorgehen mit der Bundesnetzagentur (BNetzA) beschlossen[cite: 22]. [cite\_start]Es gibt jedoch keinen Anspruch darauf, dass zukünftige Änderungen immer als Konzept im Voraus zur Verfügung gestellt werden[cite: 23].

-----

## 2 Einleitung

[cite\_start]Basierend auf der Mitteilung der Beschlusskammer 6 vom 27. Mai 2025 beabsichtigt die **Bundesnetzagentur**, die Kommunikation der IT-Systeme von Marktpartnern mit dem **MaBiS-Hub** künftig über **API-Webdienste** zu realisieren[cite: 26]. [cite\_start]Da sich die energiewirtschaftlichen Geschäftsprozesse im Zuge der Energiewende schneller verändern werden, sollen API-Webdienste bei Bedarf auch für bereits bestehende Prozesse eingesetzt werden[cite: 26]. [cite\_start]Aufgrund der Einführung und Nutzung vieler API-Webdienste in der Marktkommunikation war es notwendig, ein Regelwerk für deren Nutzung, Veröffentlichung und eine zentrale Bereitstellung der Schnittstellenbeschreibungen zu schaffen[cite: 27]. [cite\_start]Dieses Konzeptpapier schlägt daher Regeln für die zukünftige Nutzung, Veröffentlichung und Gestaltung von API-Webdiensten vor[cite: 27].

-----

## 3 Veröffentlichung auf GitHub

[cite\_start]EDI@Energy plant, alle API-Webdienste zukünftig zentral in öffentlichen Repositories auf der GitHub-Plattform unter der Organisation **EDI@Energy** zu veröffentlichen und zu pflegen[cite: 36]. [cite\_start]Dies ermöglicht es den Marktteilnehmern, die maschinenlesbaren Dokumentationen der Schnittstellen zu nutzen und so Änderungen leichter nachzuvollziehen[cite: 36].

Bisher sind folgende öffentliche Repositories geplant:

  * [cite\_start]**API\_Strom**: Enthält alle produktiven API-Webdienste und Konsultationsversionen, die für die Umsetzung von Prozessen aus den Festlegungen der Bundesnetzagentur (z. B. GPKE, WIM-Strom, MaBiS) benötigt werden[cite: 40, 41].
  * [cite\_start]**API\_Verzeichnisdienst**: Enthält ausschließlich API-Webdienste für Verzeichnisdienste zum Austausch von Endpunktadressen[cite: 42, 43].

[cite\_start]Es ist möglich, dass EDI@Energy bei Bedarf weitere Repositories einführt[cite: 44]. [cite\_start]Ein temporäres Repository namens **Konzept\_API\_Strom** dient ausschließlich der Veranschaulichung während der Konsultationsphase vom 01.09.2025 bis zum 15.10.2025[cite: 47, 48]. [cite\_start]Es wird danach gelöscht und seine Inhalte gehen nicht in den produktiven Betrieb über[cite: 49, 50].

-----

### 3.1 Versionierung eines Repository

[cite\_start]Jedes Repository auf GitHub erhält eine eindeutige Versionsnummer, die der Versionsnummer eines API-Webdienstes gleicht (siehe Kapitel 3.2 des EDI@Energy-Dokuments "API-Guideline")[cite: 52]. [cite\_start]Die Versionsnummern werden auf GitHub über sogenannte "Releases" abgebildet[cite: 53].

[cite\_start]Der Aufbau der Versionsnummer ist wie folgt: `<Major>.<Minor>.<Patch>`[cite: 55].

  * [cite\_start]Die **\<Major\>-Version** wird erhöht, wenn eine Konsultation eröffnet wird[cite: 57, 58].
  * [cite\_start]Die **\<Minor\>-Version** wird erhöht, wenn mindestens eine Fehlerkorrektur an einer Schnittstellenbeschreibung im Repository vorgenommen wurde[cite: 66, 67].
  * [cite\_start]Die **\<Patch\>-Version** wird erhöht, wenn an mindestens einer Schnittstellenbeschreibung eine Präzisierung oder Ergänzung der fachlichen Beschreibung erfolgte[cite: 68, 69].

[cite\_start]Die Versionierung erfolgt durch die Veröffentlichung eines Release am Repository selbst[cite: 70]. [cite\_start]Im Release wird auch eine Änderungshistorie veröffentlicht[cite: 71].

-----

### 3.2 Änderungsmanagement

[cite\_start]Das bestehende Änderungsmanagement für **EDIFACT- und XML-Formate** wird auch für API-Webdienste übernommen[cite: 125]. [cite\_start]Neue Schnittstellenversionen sollen in der Regel am **01.04. oder 01.10.** eines Jahres angewendet werden, was eine Übergangszeit von sechs Monaten zwischen Veröffentlichung und Nutzung ermöglicht[cite: 126, 127]. [cite\_start]Die bestehenden Regeln zur Abwärts- und Aufwärtskompatibilität aus der EDI@Energy API-Guideline bleiben erhalten[cite: 128].

-----

### 3.3 Änderungshistorie des Releases und eines API-Webdienstes

#### 3.3.1 Änderungshistorie eines Repository

[cite\_start]Die Dokumentation der Änderungen an Schemas oder Schnittstellen wird im Release des Repository veröffentlicht[cite: 132]. [cite\_start]Dabei handelt es sich um eine zusammenfassende Übersicht aller Änderungen in diesem Release[cite: 133].

#### 3.3.2 Änderungshistorie eines API-Webdienstes

[cite\_start]Detaillierte Änderungen an einer Schnittstellenbeschreibung werden in der Schnittstellenbeschreibung selbst unter dem Abschnitt "**Changelog**" dokumentiert[cite: 152]. [cite\_start]Änderungen an einem Schema, das in einem API-Webdienst verwendet wird, werden ebenfalls im Changelog des entsprechenden API-Webdienstes dokumentiert[cite: 152].

-----

## 4 Umgang mit zukünftigen Konsultationsbeiträgen

[cite\_start]Für zukünftige Konsultationen von API-Webdiensten und Schemas sollen Konsultationsbeiträge direkt im Repository auf GitHub über **Issues** eingereicht werden[cite: 168, 169]. [cite\_start]Jedes teilnehmende Unternehmen oder jede teilnehmende Privatperson benötigt dafür einen kostenlosen GitHub-Account[cite: 170, 171]. [cite\_start]Jedes Unternehmen darf nur einen Account für die Einreichung von Beiträgen nutzen[cite: 172]. [cite\_start]Damit die Beiträge berücksichtigt werden, muss der GitHub-Nutzername spätestens bis zum Ende des Konsultationszeitraums per E-Mail an datenformate@bnetza.de der Beschlusskammer 6 mitgeteilt werden[cite: 173].

Wichtige Hinweise zu diesem Verfahren:

  * [cite\_start]Issues sind für Dritte sofort sichtbar und können von ihnen kommentiert werden[cite: 175, 176].
  * [cite\_start]Das Anlegen von Issues ist nur innerhalb des Konsultationszeitraums möglich[cite: 177].
  * [cite\_start]Issues, die außerhalb der Konsultationszeit angelegt werden, werden nicht berücksichtigt[cite: 181, 182].

-----

## 5 Fehler oder Änderungswunsch in einem API-Webdienst

[cite\_start]Fehler und Änderungswünsche müssen der EDI@Energy per **standardisierter Exceltabelle** und E-Mail kommuniziert werden[cite: 192, 193]. [cite\_start]Das Melden von Fehlern oder Änderungswünschen durch das Anlegen eines Issues in einem GitHub-Repository ist nicht vorgesehen[cite: 194].

-----

## 6 Aufbau der API-Webdienste

### 6.1 Aufbau von API-Webdiensten und zentrale Ablage der Schemas

[cite\_start]Die API-Webdienste werden in Unterordnern des Ordners "**API**" abgelegt[cite: 197]. [cite\_start]Die Unterordner werden nach der jeweiligen Fachlichkeit benannt[cite: 197]. [cite\_start]Änderungen an der Ordnerstruktur müssen eine Konsultation durchlaufen[cite: 198].

[cite\_start]Jeder Unterordner im Ordner "API" hat in der Regel einen gleichnamigen Unterordner im Ordner "**Schema**"[cite: 206]. [cite\_start]Dieser enthält die Schemas, die im `requestBody` der entsprechenden API verwendet werden[cite: 207].

[cite\_start]Zusätzlich gibt es im Ordner "Schema" fachliche Unterordner, die zusammengehörige Schemas enthalten (z.B. `adresse1.yaml`, `city.yaml`, `street.yaml`)[cite: 222]. [cite\_start]Dies stellt sicher, dass zentral gepflegte Schemas in allen API-Webdiensten genutzt werden können[cite: 222].

-----

### 6.2 Namenskonventionen der API-Webdienste

[cite\_start]API-Webdienste werden auf **Englisch** benannt, beginnend mit einem Kleinbuchstaben, wobei jedes weitere Wort mit einem Großbuchstaben beginnt (camelCase)[cite: 246]. [cite\_start]Sonderzeichen sind nicht erlaubt[cite: 247]. [cite\_start]Die POST-, GET- oder anderen Befehle innerhalb der API-Webdienste werden ebenfalls auf Englisch verfasst[cite: 247].

-----

### 6.3 Namenskonventionen der YAML-Dateien der API-Webdienste

[cite\_start]Für die YAML-Dateien der API-Webdienste sind keine spezifischen Namenskonventionen vorgesehen[cite: 252].

-----

### 6.4 Namenskonventionen der Schemas

[cite\_start]Schemas werden auf **Englisch** benannt, beginnend mit einem Kleinbuchstaben (camelCase)[cite: 254, 255]. [cite\_start]Sonderzeichen und Leerzeichen zwischen Wörtern sind nicht erlaubt[cite: 255, 256]. [cite\_start]Arrays enthalten immer ein angehängtes Plural-s (z.B. `dataTechnicalResources`)[cite: 256].

-----

### 6.5 Namenskonventionen der YAML-Dateien der Schemas

[cite\_start]Der Dateiname ist identisch mit dem Namen des entsprechenden Schemas[cite: 258].

-----

### 6.6 Kombinationen von Schemas

[cite\_start]Kombinationen von Schemas in einem API-Webdienst werden über die OpenAPI-Schlüsselwörter `oneOf`, `anyOf`, `allOf` und `not` dargestellt[cite: 265].

-----

## 7 Visualisierung der API-Webdienste

[cite\_start]Eine Visualisierung der API-Webdienste über **Swagger UI** auf Basis der YAML-Dateien ist vorgesehen[cite: 267]. [cite\_start]Diese Visualisierung dient jedoch nur als zusätzliches Hilfsmittel, während die fachlichen und technischen Ausprägungen der API-Webdienste und deren Bereitstellung auf GitHub den Hauptbestandteil der Konsultation bilden[cite: 268, 269].

-----

## 8 Zeitplan zur Umsetzung im Energiemarkt

### 8.1 Zeitplan für bestehende API-Webdienste

[cite\_start]Bestehende API-Webdienste wie die "Abwicklung von Steuerungshandlungen in Verbindung mit intelligenten Messsystemen", "Ermittlung der MaLo-ID einer Marktlokation" und "Verzeichnisdienste Web-API" sollen bei Annahme dieses Konzepts vor der nächsten regulären Konsultation im Februar 2026 von SwaggerHub auf GitHub überführt werden[cite: 272].

### 8.2 Zeitplan für neue API-Webdienste

[cite\_start]Der Zeitpunkt der Anwendung neuer API-Webdienste hängt von der Einführung des MaBiS-Hubs ab[cite: 274].

-----

## 9 Ausgestaltung zukünftiger API-Webdienste

[cite\_start]Die Gestaltung der API-Webdienste im Repository **Konzept\_API\_Strom** wurde so gewählt, dass keine Informationen im Vergleich zur heutigen Kommunikation über EDIFACT verloren gehen[cite: 276]. Das Repository enthält beispielhafte Schnittstellen wie:

  * [cite\_start]Anfragen von Messwerten [cite: 279]
  * [cite\_start]Reklamationen von Messwerten [cite: 280]
  * [cite\_start]Stornierung von Werten [cite: 281]
  * [cite\_start]Versand von Werten [cite: 282]
  * [cite\_start]Anfrage einer Kündigung der Netznutzung [cite: 288]
  * [cite\_start]Übermittlung eines Kommunikationsdatenblattes eines LF [cite: 289]

-----

### 9.1 Hinweise zu den API-Webdiensten zur Messwertübermittlung

[cite\_start]Die Vollständigkeit eines übermittelten Zeitintervalls ergibt sich aus dem Zeitpunkt, zu dem die Werte beim Empfänger vorliegen[cite: 291]. [cite\_start]Einzelne Viertelstundenwerte können gesendet werden, und ein Lastgang muss nicht einen ganzen Kalendertag umfassen[cite: 292]. [cite\_start]Derzeit wird die Vollständigkeit an zwei Stellen geprüft: in der Schnittstelle selbst (z.B. ob ein ganzer Tag übermittelt wurde) und in den Backend-Systemen des Empfängers (z.B. ob der Lastgang eines Monats vollständig ist)[cite: 295, 296]. [cite\_start]In den zukünftigen API-Beschreibungen wird diese Prüfung nur noch an einer Stelle vorgenommen[cite: 297].

#### 9.1.1 Ausprägung von Arrays bei API-Webdiensten zur Messwertübermittlung

[cite\_start]Bei der Beschreibung der APIs wird weitgehend auf **Arrays** gesetzt, um im Body der API mehrere Wiederholungen zu ermöglichen[cite: 301]. [cite\_start]Dies können mehrere Werte zur selben Marktlokation und demselben Zeitpunkt (aber unterschiedlichen Tarifstufen) oder Werte zu unterschiedlichen Marktlokationen und Zeitpunkten sein[cite: 302]. [cite\_start]Wie viele Wiederholungsmöglichkeiten bestehen, wird durch `minItems` und `maxItems` angegeben[cite: 305]. [cite\_start]Bei der Aktualisierung von Werten werden grundsätzlich nur die Werte übermittelt, die aktualisiert werden sollen; das bisherige Vorgehen "stornieren und erneut senden" wird nicht fortgeführt[cite: 306]. [cite\_start]Ein API-Webdienst zur Stornierung von Werten wird nur dann verwendet, wenn ein Wert nicht mehr gültig ist und kein neuer Wert vorliegt[cite: 308].

#### 9.1.2 OBIS-Kennzahlen bei API-Webdiensten zur Messwertübermittlung

[cite\_start]Es gibt API-Webdienste, bei denen anstelle der **OBIS-Kennzahl** die **Fachlichkeit** übermittelt wird[cite: 316]. [cite\_start]Diese Fachlichkeit setzt sich aus den Informationen **Kanal, Werteart, Energieflussrichtung und Tarifstufe** zusammen[cite: 317]. [cite\_start]Die Verarbeitung beim Empfänger erfolgt nur, wenn die übermittelten Parameter (OBIS-Kennzahl oder das Tupel Kanal, Werteart, Energieflussrichtung und Tarifstufe) mit den vorab ausgetauschten Stammdaten des MSB übereinstimmen[cite: 320].

-----

## 10 Rückmeldung zum Konzept im Rahmen des Konsultationsverfahrens

### 10.1 Rückmeldung zu Kapitel 1 bis 8

  * [cite\_start]Wir stimmen der Umsetzung des Konzeptes zu. [cite: 323]
  * [cite\_start]Wir stimmen der Umsetzung des Konzeptes nicht zu, da: (Begründung) [cite: 324, 326]

### 10.2 Rückmeldung zu Kapitel 9

  * [cite\_start]Wir stimmen der vorgeschlagenen Ausgestaltung zukünftiger API-Webdienste in vollem Umfang zu. [cite: 327]
  * [cite\_start]Wir stimmen der vorgeschlagenen Ausgestaltung zukünftiger API-Webdienste grundsätzlich zu, haben aber folgende fachliche Hinweise: (Hinweise) [cite: 328, 329]
  * [cite\_start]Wir stimmen der vorgeschlagenen Ausgestaltung zukünftiger API-Webdienste nicht zu, da: (Begründung) [cite: 330, 331]