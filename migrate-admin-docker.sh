#!/bin/bash

# Admin Panel Database Migration Script for Docker Environment

echo "Starting database migration for Admin Panel (Docker)..."

# Source environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-willi_mako}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

# Docker container name (adjust if needed)
DOCKER_CONTAINER=${POSTGRES_CONTAINER:-willi_mako_db}

echo "Connecting to database: $DB_NAME in Docker container: $DOCKER_CONTAINER"

# Check if migration.sql exists
if [ ! -f "migration.sql" ]; then
    echo "❌ migration.sql file not found!"
    echo "Please create the migration file first."
    exit 1
fi

# Check if Docker container is running
if ! docker ps | grep -q $DOCKER_CONTAINER; then
    echo "❌ Docker container '$DOCKER_CONTAINER' is not running!"
    echo "Please start the PostgreSQL container first."
    exit 1
fi

# Run migration via Docker
echo "Executing migration via Docker..."
docker exec -i $DOCKER_CONTAINER psql -U $DB_USER -d $DB_NAME < migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "Admin panel is now ready to use."
    echo ""
    echo "New features available:"
    echo "- Admin Dashboard with statistics"
    echo "- User management"
    echo "- Document management with upload"
    echo "- Detailed statistics"
    echo "- System settings"
    echo ""
    echo "Access the admin panel at: http://localhost:3000/admin"
else
    echo "❌ Database migration failed!"
    echo "Check the error messages above for details."
    exit 1
fi
