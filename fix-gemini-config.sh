#!/bin/bash
# fix-gemini-config.sh - Fixes Gemini API configuration on production server
# Kopiert den Gemini API Key zu GOOGLE_AI_API_KEY und setzt das korrekte Modell

echo "🔧 Fixing Gemini API configuration..."

# Server Details
PROD_SERVER=${1:-"root@10.0.0.2"}
DEPLOY_DIR="/opt/willi_mako"

# Update .env Datei mit korrekten Gemini-Konfigurationen
ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR

# Sichere aktuelle .env Datei
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)

# Prüfe ob GEMINI_API_KEY existiert und kopiere zu GOOGLE_AI_API_KEY
if grep -q "GEMINI_API_KEY" .env; then
  GEMINI_KEY=\$(grep "GEMINI_API_KEY" .env | cut -d'=' -f2)
  
  # Aktualisiere GOOGLE_AI_API_KEY mit dem Wert von GEMINI_API_KEY
  if grep -q "GOOGLE_AI_API_KEY" .env; then
    # GOOGLE_AI_API_KEY existiert bereits, aktualisiere
    sed -i "s/GOOGLE_AI_API_KEY=.*/GOOGLE_AI_API_KEY=\$GEMINI_KEY/" .env
    echo "✅ GOOGLE_AI_API_KEY aktualisiert"
  else
    # GOOGLE_AI_API_KEY existiert nicht, füge hinzu
    echo "GOOGLE_AI_API_KEY=\$GEMINI_KEY" >> .env
    echo "✅ GOOGLE_AI_API_KEY hinzugefügt"
  fi
  
  # Setze Modellkonfigurationen, falls nicht vorhanden
  if ! grep -q "GEMINI_MODEL" .env; then
    echo "GEMINI_MODEL=gemini-3-pro-preview" >> .env
    echo "✅ GEMINI_MODEL hinzugefügt"
  else
    sed -i "s/GEMINI_MODEL=.*/GEMINI_MODEL=gemini-3-pro-preview/" .env
    echo "✅ GEMINI_MODEL aktualisiert"
  fi
  
  if ! grep -q "GEMINI_VISION_MODEL" .env; then
    echo "GEMINI_VISION_MODEL=gemini-3-pro-preview" >> .env
    echo "✅ GEMINI_VISION_MODEL hinzugefügt"
  else
    sed -i "s/GEMINI_VISION_MODEL=.*/GEMINI_VISION_MODEL=gemini-3-pro-preview/" .env
    echo "✅ GEMINI_VISION_MODEL aktualisiert"
  fi
  
  # Setze Gemini 3.0 spezifische Konfigurationen
  if ! grep -q "GEMINI_THINKING_LEVEL" .env; then
    echo "GEMINI_THINKING_LEVEL=high" >> .env
    echo "✅ GEMINI_THINKING_LEVEL hinzugefügt"
  fi
  
  if ! grep -q "LLM_TEMPERATURE" .env; then
    echo "LLM_TEMPERATURE=1.0" >> .env
    echo "✅ LLM_TEMPERATURE hinzugefügt (Gemini 3.0 empfiehlt 1.0)"
  fi
  
  echo "📋 Neue Gemini Konfiguration:"
  grep -E "GEMINI_API_KEY|GOOGLE_AI_API_KEY|GEMINI_MODEL|GEMINI_VISION_MODEL" .env
else
  echo "❌ GEMINI_API_KEY nicht in .env gefunden. Keine Änderung vorgenommen."
  exit 1
fi

# PM2 neu starten, damit die Änderungen wirksam werden
echo "🔄 Neustart der Anwendung..."
pm2 restart willi_mako_backend_4101
echo "✅ Backend neu gestartet"

echo "🔎 Prüfe ob timelineProcessor läuft..."
sleep 5
ps aux | grep -i "timeline" | grep -v grep || echo "Kein Timeline-Prozess gefunden"

echo "✅ Gemini-Konfiguration erfolgreich aktualisiert"
EOF

echo "✅ Konfiguration auf Server $PROD_SERVER aktualisiert"
echo "ℹ️ Überprüfe die Logs mit:"
echo "ssh $PROD_SERVER 'cd $DEPLOY_DIR && tail -f logs/backend_4101_err.log'"
