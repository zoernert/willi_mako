#!/bin/bash

# Deploy script for iteration tracking features
# Adds new fields to chat_test_sessions table for detailed iteration tracking

echo "🚀 Deploying Iteration Tracking Features..."
echo "================================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
    echo "✅ Environment variables loaded from .env"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check database connection
echo ""
echo "🔍 Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed!"
    echo "Please check your database credentials in .env file"
    exit 1
fi

# Run migration
echo ""
echo "📊 Running iteration tracking migration..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/add_iteration_tracking_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration executed successfully"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Verify migration
echo ""
echo "🔍 Verifying migration..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d chat_test_sessions" | grep -E "(iterations|iteration_count|final_confidence)" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migration verification successful - new fields are present"
else
    echo "❌ Migration verification failed - new fields not found"
    exit 1
fi

# Build client
echo ""
echo "🏗️  Building client..."
cd client && npm run build

if [ $? -eq 0 ]; then
    echo "✅ Client build successful"
    cd ..
else
    echo "❌ Client build failed!"
    cd ..
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "New Features Available:"
echo "✅ Detailed iteration tracking with per-step results"
echo "✅ QDrant Vector Store results with scores and content previews"
echo "✅ Confidence scoring for each iteration"
echo "✅ Enhanced test history with iteration data"
echo ""
echo "💡 Next Steps:"
echo "1. Restart the server: npm run dev"
echo "2. Create a complete configuration with all steps enabled"
echo "3. Test with: node test-complete-vector-config.js"
echo "4. Check admin interface for detailed Vector Store results"

echo ""
echo "📚 Documentation updated in: docs/admin-chat-configuration.md"
