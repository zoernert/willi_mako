# Indexing Offensive Checklist (Google & Bing)

**Prepared:** 22. November 2025  
**Owner:** SEO / Content Team  
**Goal:** Alle Phase-2/3-Artikel innerhalb von 14 Tagen in Google und Bing indexieren

---

## 1. Vorbereitung (15 Minuten)

1. **Aktuelle URLs sammeln**
   - Phase-2.4 Artikel (Meta-Description optimiert)
   - Phase-3 Artikel (Related Articles / neue Inhalte)
   - Speichern in Tabelle (URL, Thema, Status)
2. **Chrome Profile** mit Zugriff auf Search Console & Bing Webmaster bereitstellen
3. **Sitemaps prüfen**
   - `https://stromhaltig.de/sitemap.xml` im Browser öffnen
   - Sicherstellen, dass `/wissen/artikel/`-Pfad genutzt wird (Fix vom 18.11 aktiv)

---

## 2. Google Search Console (GSC) – URL Inspection (30 Minuten)

> Ziel: Für jede relevante URL Indexierung explizit beantragen

1. **Property wählen:** `https://stromhaltig.de/`
2. **URL einfügen:** `https://stromhaltig.de/wissen/artikel/<slug>`
3. **Status prüfen**
   - *Nicht indexiert?* → Button **"Indexierung beantragen"** klicken
   - *Bereits indexiert?* → Bei wichtigen Updates trotzdem erneut beantragen
4. **Priorisierung:**
   - `aperak-z20-fehler`
   - `eog-energierichtungsangabe`
   - `utilmd-stammdaten`
   - `gpke-geschaeftsprozesse`
   - `remadv-zahlungsavis`
   - `lieferantenwechsel-prozess`
   - `sperrprozess-strom-gas`
   - `bk6-24-210-verfahrensstand`
5. **Dokumentation:**
   - Spalte "GSC Request" mit Datum + Ergebnis (z. B. `22.11 – submitted`)

### Optional (aber empfohlen)
- **Abdeckung → Seiten**: Filter auf `Nicht indexiert` setzen, prüfen ob technische Gründe vorliegen
- **Sitemaps erneut einreichen:** Menü "Sitemaps", `sitemap.xml` abschicken (registriert Fix)

---

## 3. Bing Webmaster Tools (20 Minuten)

> Bing indexiert erfahrungsgemäß 2–3x schneller als Google – ideal für kurzfristige Sichtbarkeit

1. **Anmeldung:** https://www.bing.com/webmasters/
2. **Eigentum hinzufügen:**
   - Site URL: `https://stromhaltig.de/`
   - Verifizierung via HTML-Datei **oder** Meta-Tag (beides mit Next.js kompatibel)
3. **Sitemap einreichen:**
   - `https://stromhaltig.de/sitemap.xml`
4. **URL Submission:**
   - Menü "URL Inspection" → bis zu 10 URLs/Tag einreichen
   - Gleiche Prioritäten wie bei GSC (Liste oben)
5. **Bericht speichern:** Screenshot oder Export mit Status (Indexiert / Pending)

---

## 4. Kontroll-Loop (5 Minuten pro Tag)

| Tag | Aufgabe | Notizen |
|-----|---------|---------|
| +1  | GSC Coverage prüfen | Status "Gefunden – zurzeit nicht indexiert" → wieder anstoßen |
| +3  | Bing Performance Report | Klicks/Impressions? |
| +5  | Google Search Performance | Neue Queries? CTR? |
| +7  | Wiederholung (nicht indexierte URLs erneut einreichen) |
| +14 | Phase-4 Review (20. Dez) | Export aller KPIs |

---

## 5. Troubleshooting

| Problem | Ursache | Lösung |
|---------|---------|--------|
| "Indexierung beantragen" deaktiviert | Zu viele Requests | 24h warten, Batch splitten |
| URL noch mit `/articles/` im Index | Alte Sitemap gecached | Neue interne Links setzen, 410 für Alt-URLs prüfen |
| Bing zeigt 404 | Verifizierung fehlgeschlagen | HTML-File erneut hochladen, Deployment prüfen |
| Google listet aber CTR = 0 | Snippet noch alt | Titel/Description doppelt prüfen, interne Links verstärken |

---

## 6. Reporting Template

```
URL                                 | GSC Request | GSC Status | Bing Status | Notizen
https://stromhaltig.de/.../utilmd   | 22.11 Sent  | Pending    | Indexed 23.11 | -
https://stromhaltig.de/.../aperak   | 22.11 Sent  | Pending    | Pending       | -
```

- Tabelle täglich aktualisieren (Google Sheet oder Notion)
- Screenshots von GSC/Bing Bestätigungen archivieren (`/docs/strategy/indexing-proof/`)

---

## 7. Next Steps nach erfolgreichem Indexing

1. **CTR-Analyse** (Search Console → Leistung → Seiten)
2. **Bounce-Rate-Abgleich** (Plausible → Seiten)
3. **Content Iteration** starten (Phase 4, Woche 3)
4. **Neue Keywords identifizieren** anhand echter SERP-Daten

> **Reminder:** Ohne funktionierendes Tracking (Plausible `internal_link_clicked`) keine Aussage zur Wirkung der Related Articles möglich – Debug parallel durchführen.
