#!/bin/bash

# Admin Panel Database Migration Script

echo "Starting database migration for Admin Panel..."

# Source environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-willi_mako}
DB_USER=${DB_USER:-postgres}

echo "Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"

# Run migration
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migration.sql
    
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
        exit 1
    fi
else
    echo "❌ psql command not found. Please install PostgreSQL client."
    exit 1
fi
