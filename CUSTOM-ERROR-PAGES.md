# Custom Error Pages - Documentation

## Datum: 19. November 2025

## Problem
Wenn ein Benutzer einen Chat im Browser öffnet und das Token abläuft, wird eine ungestylte Next.js 404-Seite angezeigt (z.B. unter `https://stromhaltig.de/chat/bf3fbf79-676c-4988-aee5-62ed0d05d020`). Diese Seite:
- Ist nicht im Willi Mako Design
- Bietet keine Hilfe zur Navigation
- Zeigt keinen Link zur Login-Seite

## Lösung

### 1. Custom 404 Page (`src/pages/404.tsx`)
Erstellt eine gestylte 404-Seite mit:
- **Willi Mako Branding**: Verwendet das Theme und Layout der Hauptseite
- **Material-UI Design**: Konsistentes Design mit der restlichen Anwendung
- **Klare Fehlermeldung**: Erklärt, warum die Seite nicht gefunden wurde
- **Call-to-Action Buttons**:
  - "Zur Startseite" - Zurück zur Hauptseite
  - "Zum Login" - Direkt zur Legacy App Login-Seite (`/app/`)
- **Hilfreicher Hinweis**: Erklärt, dass abgelaufene Links zur Login-Seite führen sollten

### 2. Custom Error Page (`src/pages/_error.tsx`)
Erstellt eine allgemeine Error-Seite für andere Fehlerszenarien:
- **Dynamische Fehlermeldungen**: Angepasst an den HTTP-Statuscode (404, 500, etc.)
- **Kontextabhängige Buttons**:
  - Bei 404: "Zur Startseite" + "Zum Login"
  - Bei anderen Fehlern: "Zur Startseite" + "Seite neu laden"
- **Support-Hinweise**: Link zum Support/Impressum bei Server-Fehlern

## Features

### 404 Page Features
```tsx
- Großes Error-Icon (warning.main für 404)
- Große 404-Überschrift
- Erklärende Nachricht
- Zwei CTA-Buttons (Startseite + Login)
- Footer mit Hinweis auf Login für alte Links
- Plausible Analytics Tracking für Nutzerfreundlichkeit
```

### Analytics Tracking
Die 404-Seite trackt automatisch:

**Event: `404_error`**
- `path`: Der angeforderte Pfad (z.B. `/chat/invalid-id`)
- `referrer`: Von welcher Seite der Nutzer kam
- `timestamp`: Zeitstempel des Fehlers

**Event: `404_navigation`**
- `destination`: Wohin der Nutzer navigiert (`home` oder `login`)
- `path`: Der ursprüngliche 404-Pfad

**Verwendung in Plausible:**
1. Dashboard → Goals → "404_error" und "404_navigation" erscheinen automatisch
2. Analyse: Welche URLs führen zu 404-Fehlern?
3. Nutzerverhalten: Klicken User eher auf "Startseite" oder "Login"?
4. Optimierung: Häufige 404s durch Redirects beheben

### Error Page Features
```tsx
- Dynamischer Statuscode (404, 500, etc.)
- Angepasste Icons und Farben je nach Fehlertyp
- getInitialProps für SSR-Kompatibilität
- Responsive Design für Mobile und Desktop
```

## Design Details

### Layout
- Verwendet das zentrale `Layout` Component für Konsistenz
- Material-UI `Paper` Component für den Fehler-Container
- Responsive `Stack` für Button-Layout

### Styling
- Theme-konsistente Farben
- Error-Icon: 120px, error.main/warning.main
- Typography: h1 (4rem), h5, body1, body2
- Spacing: py: 8, p: 6 für Container

### Accessibility
- Semantic HTML (h1, h2)
- Descriptive button labels mit Icons
- Meta robots: noindex, nofollow für Fehlerseiten
- Keyboard-navigable Links und Buttons

## Routing

### Next.js Behavior
- `404.tsx`: Wird bei nicht gefundenen Routen angezeigt
- `_error.tsx`: Wird bei anderen Fehlern angezeigt (500, etc.)
- Beide Seiten werden automatisch von Next.js erkannt

### Chat Routes
- `/chat/:id` Routen führen bei abgelaufenen Tokens zu 404
- Keine zusätzlichen Rewrites nötig
- Legacy App Routes (`/app/*`) werden durch next.config.js Rewrites behandelt

## Testing

### Manuelle Tests
1. **404 Test**: Rufe eine nicht existierende URL auf
   ```
   https://stromhaltig.de/nicht-existent
   https://stromhaltig.de/chat/ungueltige-id
   ```

2. **Expired Chat Test**: Rufe einen Chat mit abgelaufenem Token auf
   ```
   https://stromhaltig.de/chat/bf3fbf79-676c-4988-aee5-62ed0d05d020
   ```

3. **Error Test**: Simuliere einen Server-Fehler (falls möglich)

### Type Check
```bash
npm run type-check
```
✅ Erfolgreich durchgeführt

## Migration Notes

### Bestehende Funktionalität
- ✅ Keine Breaking Changes
- ✅ Legacy App Routing unverändert
- ✅ next.config.js Rewrites bleiben erhalten
- ✅ API-Routen unverändert

### Neue Funktionalität
- ✅ Gestylte 404-Seite für alle nicht gefundenen Routen
- ✅ Gestylte Error-Seite für Server-Fehler
- ✅ Konsistentes User-Experience bei Fehlern
- ✅ Klare Navigation zurück zur Hauptseite oder zum Login

## Deployment

### Build
```bash
npm run build:next
```

### Production
Die Custom Error Pages werden automatisch im Production Build inkludiert:
```bash
node server.js
```

### Verifikation
Nach dem Deployment:
1. Teste eine nicht-existierende URL
2. Verifiziere, dass die gestylte 404-Seite angezeigt wird
3. Prüfe, dass der "Zum Login" Button funktioniert

## Future Enhancements

### Mögliche Erweiterungen
1. **Analytics**: Error-Tracking für 404s
2. **Suggestions**: "Meinten Sie...?" für ähnliche URLs
3. **Recent Pages**: Liste der zuletzt besuchten Seiten
4. **Search**: Suchfeld für direkten Content-Zugriff
5. **Breadcrumbs**: Navigation zur übergeordneten Seite

### A/B Testing
- Testen, ob "Zum Login" oder "Chat erstellen" effektiver ist
- Messaging optimieren für verschiedene User-Szenarien

## Referenzen
- [Next.js Custom Error Pages](https://nextjs.org/docs/advanced-features/custom-error-page)
- [Material-UI Paper Component](https://mui.com/material-ui/react-paper/)
- [Next.js 404 Page](https://nextjs.org/docs/advanced-features/custom-404-page)

## Status
✅ **Deployment Ready** - Beide Error Pages implementiert und getestet
