#!/bin/bash
# Fix for missing reference_id column in clarification_references table
# Created: August 20, 2025

# Load environment variables
if [ -f .env ]; then
  export $(grep -E "^DATABASE_URL=" .env | xargs)
else
  echo "❌ .env file not found!"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file!"
  exit 1
fi

echo "Fixing clarification_references table schema..."
PGPASSWORD=$(echo $DATABASE_URL | cut -d':' -f3 | cut -d'@' -f1) \
psql $(echo $DATABASE_URL | sed 's|postgresql://[^:]*:[^@]*@|postgresql://|') -f fix-clarification-references-column.sql

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "✅ Schema fix applied successfully!"
else
  echo "❌ Error applying schema fix. Check the logs."
  exit 1
fi

echo "Testing the fix by checking if reference_id column exists..."
COLUMN_EXISTS=$(PGPASSWORD=$(echo $DATABASE_URL | cut -d':' -f3 | cut -d'@' -f1) \
psql $(echo $DATABASE_URL | sed 's|postgresql://[^:]*:[^@]*@|postgresql://|') -t -c "SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'clarification_references' 
  AND column_name = 'reference_id'
);" | tr -d '[:space:]')

if [ "$COLUMN_EXISTS" = "t" ]; then
  echo "✅ Confirmed: reference_id column exists in clarification_references table"
else
  echo "❌ Error: reference_id column still missing from clarification_references table"
  exit 1
fi

echo "Migration completed successfully"
