#!/bin/bash
# Test script for direct willi_mako collection debugging
# This script demonstrates the use of the debug-willi-mako tool

# Make the script executable
chmod +x debug-willi-mako.sh
chmod +x debug-willi-mako-chat-flow.js

# Run with a standard lieferantenwechsel query
echo "Testing debug-willi-mako with lieferantenwechsel query..."
./debug-willi-mako.sh -v -y "Erkläre mir den Prozess des Lieferantenwechsels"

echo ""
echo "Test abgeschlossen. Überprüfen Sie die Ausgabe und die generierten Debug-Dateien."
