# Feature Flags – Bilaterale Klärung

Diese Flags steuern die Sichtbarkeit/Default-Verhalten der Welle‑1 Features im Legacy‑Client. Standardmäßig sind alle aktiv.

Aktuelle Flags
- boardView.enabled: Boardansicht als Default sowie Toggle sichtbar (Default: true)
- emailImport.enabled: E‑Mail Import (Paste/EML) sichtbar (Default: true)
- sendAsIdentity.enabled: "Senden als" Auswahl + From‑Adresse sichtbar (Default: true)

Override (Pilot/Debug)
- Browser Console (vor App‑Load):
  window.__FEATURE_FLAGS__ = { boardView: { enabled: false } }
- LocalStorage (persistenter):
  Key: featureFlags.override
  Wert (JSON): {"boardView":{"enabled":false},"emailImport":{"enabled":true},"sendAsIdentity":{"enabled":true}}

Hinweise
- Flags werden beim Client‑Start gelesen. Nach Änderung Seite neu laden.
- Serverseitige Flags/Policies können später ergänzt werden.
