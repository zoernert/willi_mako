#!/bin/bash

# Team Gamification Migration Script
# This script runs the team gamification schema migration

set -e

echo "🔄 Running Team Gamification Migration..."
echo "========================================"

# Get database connection info from environment
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-willi_mako}
DB_USER=${DB_USER:-willi_user}
DB_PASSWORD=${DB_PASSWORD:-willi_password}

# Construct database URL
if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
else
    DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"

# Check if migration file exists
MIGRATION_FILE="migrations/team_gamification_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"

# Backup database (optional)
if [ "$BACKUP_BEFORE_MIGRATION" = "true" ]; then
    echo "💾 Creating database backup..."
    BACKUP_FILE="backup_before_team_migration_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump &> /dev/null; then
        pg_dump "$DB_URL" > "$BACKUP_FILE"
        echo "✅ Backup created: $BACKUP_FILE"
    else
        echo "⚠️  pg_dump not found, skipping backup"
    fi
fi

# Run migration
echo "🔄 Running migration..."

if command -v psql &> /dev/null; then
    # Use psql directly
    psql "$DB_URL" -f "$MIGRATION_FILE"
    echo "✅ Migration completed successfully using psql"
elif command -v docker &> /dev/null && docker ps | grep -q postgres; then
    # Use Docker if PostgreSQL is running in container
    echo "🐳 Using Docker PostgreSQL container..."
    POSTGRES_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)
    
    if [ -n "$POSTGRES_CONTAINER" ]; then
        docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"
        echo "✅ Migration completed successfully using Docker"
    else
        echo "❌ PostgreSQL container not found"
        exit 1
    fi
else
    echo "❌ Neither psql nor Docker PostgreSQL found"
    echo "Please install PostgreSQL client or ensure PostgreSQL is running in Docker"
    exit 1
fi

# Verify migration
echo "🔍 Verifying migration..."

# Check if team tables exist
VERIFICATION_SQL="
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN 'teams: ✅' ELSE 'teams: ❌' END as teams_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN 'team_members: ✅' ELSE 'team_members: ❌' END as team_members_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations') THEN 'team_invitations: ✅' ELSE 'team_invitations: ❌' END as team_invitations_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_join_requests') THEN 'team_join_requests: ✅' ELSE 'team_join_requests: ❌' END as team_join_requests_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_usage_points') THEN 'document_usage_points: ✅' ELSE 'document_usage_points: ❌' END as document_usage_points_table;
"

if command -v psql &> /dev/null; then
    psql "$DB_URL" -c "$VERIFICATION_SQL"
elif [ -n "$POSTGRES_CONTAINER" ]; then
    echo "$VERIFICATION_SQL" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
fi

echo ""
echo "🎉 Team Gamification Migration completed!"
echo "📋 Summary:"
echo "   - Teams table: Created"
echo "   - Team members table: Created"
echo "   - Team invitations table: Created"
echo "   - Team join requests table: Created"
echo "   - Document usage points table: Created"
echo "   - User points table: Extended with expires_at"
echo "   - User documents table: Extended with uploaded_by_user_id"
echo "   - Indices and constraints: Added"
echo ""
echo "🚀 Your application is now ready for team-based gamification!"
