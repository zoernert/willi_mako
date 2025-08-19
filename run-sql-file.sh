#!/bin/bash

# Script to run SQL files using PostgreSQL settings from .env file
# Usage: ./run-sql-file.sh path/to/your/sqlfile.sql

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

# Parse the .env file for database settings only
DB_HOST=$(grep -E "^DB_HOST=" .env | cut -d'=' -f2-)
DB_PORT=$(grep -E "^DB_PORT=" .env | cut -d'=' -f2-)
DB_NAME=$(grep -E "^DB_NAME=" .env | cut -d'=' -f2-)
DB_USER=$(grep -E "^DB_USER=" .env | cut -d'=' -f2-)
DB_PASSWORD=$(grep -E "^DB_PASSWORD=" .env | cut -d'=' -f2-)

# Extract database connection details
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Check if all required variables are set
if [[ -z "$DB_HOST" || -z "$DB_PORT" || -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
  echo "Error: Missing database connection details in .env file"
  exit 1
fi

# Export password for psql to use
export PGPASSWORD=$DB_PASSWORD

echo "Running SQL file $SQL_FILE on database $DB_NAME as user $DB_USER..."

# Execute the SQL file
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SQL_FILE"

# Check if psql command was successful
if [ $? -eq 0 ]; then
  echo "SQL file executed successfully"
else
  echo "Error executing SQL file"
fi

# Reset password environment variable
unset PGPASSWORD
