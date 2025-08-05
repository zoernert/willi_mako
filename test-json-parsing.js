const { safeParseJsonResponse } = require('./src/utils/aiResponseUtils.ts');

// Test mit der problematischen JSON-Antwort
const problematicJson = `{
  "title": "Sperr- und Entsperrprozess aus Sicht des Netzbetreibers",
  "description": "Wie läuft der Sperr- und Entsperrprozess von Stromanschlüssen aus Sicht des Netzbetreibers (NB) ab? Welche Fristen und Bedingungen sind zu beachten?",
  "context": "Der Sperr- und Entsperrprozess ist ein kritischer Bestandteil der Energiewirtschaft. Er regelt, wie Netzbetreiber (NB) auf Anweisung von Lieferanten (LF) die Versorgung von Kunden unterbrechen oder wiederherstellen. Die Einhaltung definierter Fristen und Abläufe ist dabei entscheidend.",
  "answer": "Der Sperrprozess beginnt mit einem Sperrauftrag des LF an den NB. Der NB prüft die Zuordnung der Marktlokation (MaLo) zum LF und die Berechtigung nach Netznutzungsvertrag. Bei Zustimmung legt der NB den Sperrtermin fest und informiert den Messstellenbetreiber (MSB), falls dessen Zustimmung erforderlich ist. Die Sperrung erfolgt innerhalb von 6 Werktagen nach dem frühestmöglichen Sperrtermin. Der Entsperrprozess verläuft analog, wobei der LF einen Entsperrauftrag erteilt und der NB die Entsperrung ebenfalls innerhalb von 6 Werktagen nach dem frühestmöglichen Entsperrtermin durchführt. \\n\\nSowohl für Sperrung als auch für Entsperrung gelten spezifische Fristen für die Übermittlung der Aufträge und Antworten. Die Abrechnung der Kosten erfolgt über den Use-Case "Abrechnung einer sonstigen Leistung".",
  "additionalInfo": "Voraussetzung für Sperrung und Entsperrung ist, dass es sich um eine verbrauchende bzw. entsperrbare MaLo in der Niederspannung handelt und der MSB der MaLo gleichzeitig der MSB aller Messlokationen ist. Bei Zutrittsverweigerung erfolgt kein weiterer Sperrversuch innerhalb desselben Sperrauftrags. Eine Stornierung des Sperr- oder Entsperrauftrags ist über den Use-Case "Stornieren der Unterbrechung und Wiederherstellung der Anschlussnutzung auf Anweisung des LF" möglich. Sofern die Bedingungen für EDIFACT-Kommunikation nicht erfüllt sind, erfolgt die Kommunikation NON-EDIFACT.",
  "tags": [
    "Energiemarkt",
    "Netzbetrieb",
    "Sperrung",
    "Entsperrung",
    "Marktkommunikation"
  ]
}`;

console.log('Testing JSON parsing...');
const result = safeParseJsonResponse(problematicJson);

if (result) {
  console.log('✅ JSON parsing successful!');
  console.log('Title:', result.title);
  console.log('Answer length:', result.answer.length);
  console.log('Tags:', result.tags);
} else {
  console.log('❌ JSON parsing failed');
}
