#!/bin/bash

# Script to run a SQL command using the DATABASE_URL from .env file
# Usage: ./run-sql-command.sh "SELECT * FROM users LIMIT 5;"

# Check if a SQL command was provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"SQL command\""
  exit 1
fi

SQL_COMMAND="$*"

# Parse the DATABASE_URL from .env
DATABASE_URL=$(grep -E "^DATABASE_URL=" .env | cut -d'=' -f2-)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env file"
  exit 1
fi

echo "Running SQL command: $SQL_COMMAND"

# Execute the SQL command using the DATABASE_URL
psql "$DATABASE_URL" -c "$SQL_COMMAND"

# Check if psql command was successful
if [ $? -eq 0 ]; then
  echo "SQL command executed successfully"
else
  echo "Error executing SQL command"
fi
