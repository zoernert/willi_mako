#!/bin/bash
# add-plausible-tracking.sh - Fügt Plausible Tracking Code zu bestehenden HTML-Dateien hinzu

echo "📊 Füge Plausible Analytics Tracking Code hinzu..."

# Server Details
PROD_SERVER=${1:-"root@10.0.0.2"}
DEPLOY_DIR="/opt/willi_mako"

# Tracking Code
TRACKING_CODE='<script defer data-domain="stromhaltig.de" src="https://stats.corrently.cloud/js/script.js"></script>'

# Füge Tracking Code zu bestehenden HTML-Dateien hinzu
ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR

echo "🔍 Prüfe Legacy App HTML..."
if [ -f "public/app/index.html" ]; then
  # Sichere die originale Datei
  cp public/app/index.html public/app/index.html.bak.\$(date +%Y%m%d_%H%M%S)
  
  # Prüfe ob der Tracking Code bereits vorhanden ist
  if grep -q "data-domain=\"stromhaltig.de\"" public/app/index.html; then
    echo "✅ Tracking Code ist bereits in der Legacy App vorhanden"
  else
    # Füge den Tracking Code vor dem schließenden </head> Tag ein
    sed -i 's|</head>|$TRACKING_CODE</head>|' public/app/index.html
    echo "✅ Tracking Code zur Legacy App hinzugefügt"
  fi
else
  echo "❌ Legacy App index.html nicht gefunden"
fi

echo "✅ Plausible Analytics Tracking Code hinzugefügt"
EOF

echo "✅ Tracking Code auf Server $PROD_SERVER hinzugefügt"
