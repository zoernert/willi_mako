#!/bin/bash

# Script to run PostgreSQL commands using settings from .env file
# Usage: ./psql-env.sh [command]
# If command is not provided, it will open a psql interactive session

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

# If a command is provided as argument, execute it
if [ $# -gt 0 ]; then
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$*"
else
  # Otherwise, open an interactive psql session
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
fi

# Reset password environment variable
unset PGPASSWORD
