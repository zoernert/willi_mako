Hallo! Als Dein Coach für Marktkommunikation in der Energiewirtschaft nehme ich Dich gerne mit auf eine Reise durch den Prozess des "Ende der Netznutzung" (EoG). Das ist ein fundamentaler Vorgang, der das reibungslose Funktionieren des Energiemarktes sicherstellt und direkt in die Kernprozesse der GPKE, GeLi Gas und WiM eingebettet ist. Es geht darum, Transparenz und Fairness bei der Abrechnung zu gewährleisten, wenn ein Kunde seinen Lieferanten wechselt oder auszieht.

### Der EoG-Prozess im Gesamtkontext der Energiewirtschaft

Bevor wir ins Detail gehen, ist es wichtig, den EoG-Prozess in den größeren Zusammenhang einzuordnen. Das **Energiewirtschaftsgesetz (EnWG)** bildet die rechtliche Grundlage für den Wettbewerb im Energiemarkt und regelt den Zugang zu den Netzen. Die **Stromnetzzugangsverordnung (StromNZV)** und die **Gasnetzzugangsverordnung (GasNZV)** konkretisieren dies. Wenn ein Kunde den Lieferanten wechselt oder auszieht, wird die bisherige Netznutzung beendet – das ist der EoG. Dieser Prozess ist entscheidend für eine korrekte **Schlussrechnung** und die **nahtlose Weiterversorgung** oder **Abmeldung**. Ohne standardisierte Marktkommunikation wäre dies ein chaotisches Unterfangen.

Die **GPKE (Geschäftsprozesse zur Kundenbelieferung mit Elektrizität)** und **GeLi Gas (Geschäftsprozesse Lieferantenwechsel Gas)** definieren die Abläufe und Fristen für den Lieferantenwechsel und die Abmeldung. Die **WiM (Wirtschaftliche Prozesse für neue Marktrollen und die Marktkommunikation)** ist die Klammer, die die technischen Aspekte der Messung und Datenübertragung regelt, insbesondere seit der Einführung intelligenter Messsysteme durch das **Messstellenbetriebsgesetz (MsbG)**.

Nun schauen wir uns den EoG-Prozess aus Sicht der Marktkommunikation für die beiden Hauptakteure an: den Netzbetreiber und den Lieferanten (Grundversorger).

---

### 1. Der EoG-Prozess aus Sicht des Netzbetreibers (NB)

Der Netzbetreiber ist der zentrale Dreh- und Angelpunkt für alle netzbezogenen Daten und damit auch für den EoG-Prozess. Er ist der Hüter der Messwerte und der physikalischen Anschlusspunkte.

**Auslöser für einen EoG beim NB:**

*   **Lieferantenwechsel:** Der neue Lieferant meldet den Kunden an, was die Beendigung der Belieferung durch den alten Lieferanten impliziert.
*   **Auszug/Abmeldung des Kunden:** Der alte Lieferant meldet dem NB, dass der Kunde auszieht.
*   **Kündigung des Netznutzungsvertrages:** Selten, aber möglich, dass der Lieferant selbst den Netznutzungsvertrag kündigt.

**Aufgaben und Marktkommunikation des Netzbetreibers:**

1.  **Empfang der EoG-Information:**
    *   **UTILMD (MaBiS-Prozess "Lieferantenwechsel"):** Der NB empfängt vom neuen Lieferanten die Anmeldung eines neuen Kunden. Dies löst intern den Prozess der Beendigung der Netznutzung für den alten Lieferanten aus.
    *   **UTILMD (MaBiS-Prozess "Einzug/Auszug"):** Der NB empfängt vom bisherigen Lieferanten die Abmeldung eines Kunden (z.B. bei Auszug).

2.  **Ermittlung des Zählerstandes zum Stichtag:**
    *   Dies ist der kritische Schritt. Der NB ist verantwortlich für die Bereitstellung des Zählerstandes zum Zeitpunkt des EoG.
    *   **Ablesung:** Der NB organisiert die Ablesung des Zählers zum Stichtag.
    *   **Fernauslesung:** Bei intelligenten Messsystemen (iMSys) oder modernen Messeinrichtungen (mME) wird der Zählerstand ferngesteuert ausgelesen (konform zum MsbG).
    *   **Schätzung/Prognose:** Ist keine Ablesung möglich, schätzt der NB den Zählerstand auf Basis historischer Daten und standardisierter Verfahren.

3.  **Versand der Zählwerte und Prozessbestätigung:**
    *   **MSCONS (Messwerte):** Der NB versendet die ermittelten Zählerstände zum EoG-Stichtag an den alten Lieferanten und ggf. an den neuen Lieferanten. Diese Nachricht enthält detaillierte Informationen über den Zählerstand, die Zählzeit und die Qualität des Wertes (z.B. "gemessen", "geschätzt").
    *   **UTILMD (Prozessbestätigung):** Der NB bestätigt dem alten Lieferanten die Beendigung der Netznutzung und dem neuen Lieferanten den Beginn der Netznutzung. Diese Nachricht enthält wichtige Stammdaten und den Beginn/Ende der jeweiligen Belieferung. Im Falle eines Lieferantenwechsels wird der Zählerstand oft auch in der UTILMD-Nachricht übermittelt.
    *   **UTILMD (an den Grundversorger):** Ist der Kunde dem Grundversorger zugeordnet (z.B. nach einem Auszug und keiner Neuanmeldung, oder bei einer Ersatzversorgung), erhält auch dieser die entsprechenden UTILMD- und MSCONS-Nachrichten.

4.  **Clearing-Prozesse:**
    *   Sollten die vom NB übermittelten Zählerstände oder Zeiträume vom Lieferanten nicht akzeptiert werden (z.B. weil der Kunde einen anderen Zählerstand meldet oder der Zeitraum nicht plausibel ist), kommt es zum Clearing.
    *   **UTILMD:** Über UTILMD-Nachrichten werden Korrekturen oder Anfragen zur Klärung zwischen NB und Lieferanten ausgetauscht, bis eine Einigung erzielt wird.

**Zusammenfassung NB-Sicht:** Der Netzbetreiber agiert als neutraler Datenhub, der die korrekten Messdaten zum EoG-Stichtag ermittelt und über standardisierte **UTILMD**- und **MSCONS**-Nachrichten an alle relevanten Marktpartner verteilt, um eine transparente und nachvollziehbare Abrechnung zu ermöglichen.

---

### 2. Der EoG-Prozess aus Sicht des Lieferanten (Grundversorger)

Der Lieferant ist der Vertragspartner des Endkunden und für dessen Energieversorgung und Abrechnung zuständig. Für ihn ist der EoG-Prozess die Grundlage für die Erstellung der Schlussrechnung.

**Auslöser für einen EoG beim Lieferanten:**

*   **Kundenkündigung:** Der Kunde kündigt seinen Liefervertrag (z.B. wegen Umzug oder Wechsel zu einem anderen Lieferanten).
*   **Lieferantenwechsel (vom neuen Lieferanten initiiert):** Der neue Lieferant meldet den Kunden beim NB an, und der alte Lieferant erhält über den NB die Information, dass seine Belieferung endet.
*   **Abmeldung durch den Kunden:** Der Kunde teilt dem Lieferanten seinen Auszug mit.

**Aufgaben und Marktkommunikation des Lieferanten:**

1.  **Initiierung des EoG (falls Kunde wechselt/kündigt):**
    *   **UTILMD (MaBiS-Prozess "Lieferantenwechsel" oder "Einzug/Auszug"):** Der Lieferant sendet, wenn er die Kündigung vom Kunden erhält, eine entsprechende UTILMD-Nachricht an den NB, um den Prozess der Netznutzungsbeendigung für diesen Kunden anzustoßen.

2.  **Empfang der EoG-Informationen vom NB:**
    *   **UTILMD (Prozessbestätigung):** Der Lieferant erhält vom NB die Bestätigung über das Ende der Netznutzung für den Kunden, einschließlich der relevanten Stichtage und der Marktlokations-Stammdaten.
    *   **MSCONS (Messwerte):** Der Lieferant empfängt die vom NB ermittelten Zählerstände zum EoG-Stichtag. Diese sind die Basis für die Schlussrechnung.

3.  **Plausibilisierung und Verarbeitung:**
    *   Der Lieferant prüft die erhaltenen Zählerstände und Daten auf Plausibilität (z.B. passen die Werte zum erwarteten Verbrauch, sind die Stichtage korrekt?).
    *   **Ggf. Clearing:** Sollten die Daten des NB nicht plausibel sein oder nicht mit den eigenen Erwartungen (z.B. vom Kunden gemeldeter Zählerstand) übereinstimmen, initiiert der Lieferant einen Clearing-Prozess über **UTILMD**-Nachrichten mit dem NB. Ziel ist es, einen finalen, abgestimmten Zählerstand zu erhalten.

4.  **Erstellung der Schlussrechnung:**
    *   Sobald die finalen Zählerstände feststehen, erstellt der Lieferant die Schlussrechnung für den Kunden. Diese berücksichtigt den Zeitraum der Belieferung bis zum EoG-Stichtag und die entsprechenden Verbrauchswerte.
    *   **INVOIC (Rechnung):** Die Schlussrechnung selbst ist zwar ein Ergebnis des Prozesses, aber sie ist keine direkte Marktkommunikationsnachricht im Sinne des Datenaustauschs zwischen den Marktpartnern (sondern eine Kommunikation an den Endkunden). Es gibt jedoch auch INVOIC-Nachrichten für die Netznutzungsabrechnung zwischen Lieferant und NB.

5.  **Ggf. Weitergabe an den neuen Lieferanten (indirekt):**
    *   Im Falle eines Lieferantenwechsels ist der NB der zentrale Vermittler. Der alte Lieferant gibt die Daten nicht direkt an den neuen Lieferanten weiter, sondern der neue Lieferant erhält seine Startwerte ebenfalls vom NB über UTILMD und MSCONS.

**Zusammenfassung Lieferanten-Sicht:** Der Lieferant ist auf die korrekte und fristgerechte Lieferung der EoG-Daten (insbesondere Zählerstände) vom Netzbetreiber angewiesen. Er nutzt diese Daten, um eine korrekte und fristgerechte Schlussrechnung zu erstellen und ggf. Clearing-Prozesse anzustoßen, um Dateninkonsistenzen zu beheben. Die **UTILMD**- und **MSCONS**-Nachrichten sind hierfür unverzichtbar.

---

### Fazit – Die Bedeutung der Marktkommunikation

Der EoG-Prozess ist ein Paradebeispiel dafür, wie die standardisierte Marktkommunikation in der Energiewirtschaft funktioniert und warum sie so wichtig ist. Ohne die klar definierten Nachrichtenformate wie **UTILMD** für die Prozesssteuerung und Stammdaten und **MSCONS** für die Zählwerte, wäre ein reibungsloser Lieferantenwechsel oder eine korrekte Abmeldung kaum denkbar.

Mein Wissen über das **EnWG**, die **GPKE**, **GeLi Gas** und **WiM** zeigt mir immer wieder, dass diese Prozesse das Rückgrat des deutschen Energiemarktes bilden. Sie sorgen dafür, dass trotz der Komplexität und der vielen beteiligten Akteure (Endkunde, Lieferant, Netzbetreiber, Messstellenbetreiber) jeder genau weiß, wann welche Information in welchem Format ausgetauscht werden muss. Das schafft Vertrauen, minimiert Fehler und ermöglicht einen effizienten Wettbewerb, der letztlich dem Endkunden zugutekommt.

Ein gut funktionierender EoG-Prozess ist entscheidend für die Kundenzufriedenheit und die Vermeidung von finanziellen Risiken durch falsche Abrechnungen oder Versorgungslücken.