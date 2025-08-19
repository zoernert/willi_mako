#!/bin/bash

# Script to run SQL files using the DATABASE_URL from .env file
# Usage: ./run-sql-with-url.sh path/to/your/sqlfile.sql

# Check if a SQL file was provided
if [ $# -ne 1 ]; then
  echo "Usage: $0 path/to/your/sqlfile.sql"
  exit 1
fi

SQL_FILE=$1

# Check if the SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file '$SQL_FILE' not found"
  exit 1
fi

# Parse the DATABASE_URL from .env
DATABASE_URL=$(grep -E "^DATABASE_URL=" .env | cut -d'=' -f2-)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env file"
  exit 1
fi

echo "Running SQL file $SQL_FILE with DATABASE_URL..."

# Execute the SQL file using the DATABASE_URL
psql "$DATABASE_URL" -f "$SQL_FILE"

# Check if psql command was successful
if [ $? -eq 0 ]; then
  echo "SQL file executed successfully"
else
  echo "Error executing SQL file"
fi
