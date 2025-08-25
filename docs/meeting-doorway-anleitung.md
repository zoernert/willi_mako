# Anleitung: Meeting-Doorway-Seite für Beratungsgespräche

Diese Anleitung erklärt, wie Sie die "Doorway"-Seite für Beratungsgespräche in Willi-Mako erstellen, testen und verwenden können.

## 1. Überblick

Die Meeting-Doorway-Seite ist eine spezielle Seite, die als Einstiegspunkt für Beratungsgespräche dient. Sie zeigt wichtige Informationen an und leitet den Benutzer zum eigentlichen Google Meet-Gespräch weiter, nachdem er die Kostenhinweise bestätigt hat.

## 2. URL-Struktur

Die URL für die Meeting-Doorway-Seite folgt diesem Format:
```
https://stromhaltig.de/meeting/[meetingID]
```

Wobei `[meetingID]` die ID des Google Meet-Meetings ist. Google Meet-IDs haben typischerweise das Format `xxx-xxxx-xxx` (z.B. `abc-defg-hij`).

## 3. Meeting-Link erstellen

### Schritt 1: Google Meet Meeting erstellen
1. Gehen Sie zu [Google Meet](https://meet.google.com/)
2. Klicken Sie auf "Neues Meeting" und wählen Sie "Meeting für später erstellen"
3. Kopieren Sie die Meeting-ID aus der URL (der Teil nach `meet.google.com/`)
   - Beispiel: Bei `https://meet.google.com/abc-defg-hij` ist die Meeting-ID `abc-defg-hij`

### Schritt 2: Willi-Mako Meeting-URL erstellen
1. Nehmen Sie die Meeting-ID aus Google Meet (z.B. `abc-defg-hij`)
2. Fügen Sie sie an die Basis-URL an: `https://stromhaltig.de/meeting/abc-defg-hij`

## 4. Meeting-Link testen

Sie können die Meeting-Doorway-Seite lokal testen mit:

```bash
# Starten Sie die Entwicklungsumgebung
npm run dev

# Die Seite ist dann verfügbar unter:
# http://localhost:3000/meeting/[meetingID]
```

Für Testzwecke können Sie eine beliebige gültige Meeting-ID verwenden, z.B. `abc-defg-hij`.

## 5. Meeting-Link teilen

### Variante 1: Direkter Link per E-Mail
Sie können den Meeting-Link direkt per E-Mail an den Kunden senden:

```
Sehr geehrte/r [Kundenname],

vielen Dank für Ihre Beratungsanfrage. Wir haben einen Termin für Ihr Beratungsgespräch eingerichtet.

Bitte nutzen Sie folgenden Link, um am vereinbarten Termin teilzunehmen:
https://stromhaltig.de/meeting/[meetingID]

Bitte beachten Sie, dass für diese Beratung Kosten in Höhe von [Betrag] entstehen können. 
Die genauen Konditionen wurden in unserem Vorgespräch vereinbart.

Mit freundlichen Grüßen,
Ihr Willi-Mako Team
```

### Variante 2: Kalendereinladung
Sie können auch eine Kalendereinladung mit dem Link versenden:

1. Erstellen Sie eine Kalendereinladung in Google Calendar, Outlook etc.
2. Fügen Sie den Meeting-Link in die Beschreibung ein
3. Erwähnen Sie die möglichen Kosten in der Einladung
4. Senden Sie die Einladung an den Kunden

## 6. Funktionalität der Meeting-Seite

Wenn ein Benutzer die Meeting-Doorway-Seite aufruft:

1. Es wird eine Seite mit Informationen zum Meeting angezeigt
2. Der Benutzer klickt auf "Meeting beitreten"
3. Ein Dialog erscheint mit einem Hinweis zu möglichen Kosten
4. Der Benutzer muss bestätigen, dass er versteht, dass Kosten entstehen können
5. Nach der Bestätigung wird der Benutzer zu Google Meet weitergeleitet

## 7. Fehlerbehandlung

Die Meeting-Seite validiert automatisch die Meeting-ID:
- Bei einer ungültigen Meeting-ID wird eine Fehlermeldung angezeigt
- Der Benutzer kann zur Startseite zurückkehren

## 8. Direkter Google Meet-Link

Falls die Doorway-Seite nicht funktioniert oder der Kunde Probleme hat, können Sie auch direkt den Google Meet-Link teilen:
```
https://meet.google.com/[meetingID]
```

In diesem Fall müssen Sie den Kunden separat über mögliche Kosten informieren.

## 9. Beispiel-Meeting-ID für Tests

Sie können folgende Meeting-ID für Tests verwenden: `abc-defg-hij`

Lokale Test-URL: `http://localhost:3000/meeting/abc-defg-hij`  
Produktions-URL: `https://stromhaltig.de/meeting/abc-defg-hij`

## 10. Hinweise zur Nutzung im Produktivsystem

1. Verwenden Sie für echte Beratungsgespräche immer eine neue, einzigartige Meeting-ID
2. Testen Sie den Link vor dem Versenden an den Kunden
3. Stellen Sie sicher, dass der Kunde über mögliche Kosten informiert ist
4. Protokollieren Sie die Meetings für Abrechnungszwecke

Bei Fragen oder Problemen wenden Sie sich bitte an den Systemadministrator oder an thorsten.zoerner@stromdao.com.
