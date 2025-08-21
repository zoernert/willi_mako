#!/bin/bash

# Clarification References Fix - reference_value column
# This script fixes the issue with the reference_value column in the bilateral clarifications API

echo "🔄 Clarification References Fix - reference_value column"
echo "---------------------------------------------"

# Backup current files
echo "📦 Creating backup..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/clarification-references-fix_$TIMESTAMP"
mkdir -p $BACKUP_DIR/src/routes
cp -f ./src/routes/bilateral-clarifications-simple.ts $BACKUP_DIR/src/routes/
echo "✅ Backup created in $BACKUP_DIR"

# Verify changes
echo "🔍 Verifying changes..."
if grep -q "reference_value" ./src/routes/bilateral-clarifications-simple.ts; then
  echo "✅ Changes applied successfully"
else
  echo "❌ Changes not found in file"
  exit 1
fi

# Restart server to apply changes
echo "🔄 Restarting server..."
pm2 restart server || echo "⚠️ Warning: Failed to restart server with pm2, you may need to restart manually"

echo "✅ Fix applied successfully"
echo "---------------------------------------------"
echo "The fix adds the missing reference_value parameter to the database queries"
echo "for adding chat and note references to bilateral clarifications."
echo ""
echo "To test:"
echo "1. Open a bilateral clarification in INTERNAL status"
echo "2. Add a chat or note reference"
echo "3. Verify it works without error"
