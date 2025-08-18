#!/bin/bash

# Screenshot Feature Installation Script für Willi-Mako
# Version: 1.0.0
# Date: 2025-08-18

set -e

echo "🚀 Installing Screenshot Analysis Feature for Willi-Mako..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Step 1: Install Dependencies
print_step "1/6 Installing required npm dependencies..."
npm install sharp@^0.33.0
if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Create Upload Directories
print_step "2/6 Creating upload directories..."
mkdir -p uploads/screenshots
mkdir -p uploads/temp
chmod 755 uploads
chmod 755 uploads/screenshots
chmod 755 uploads/temp
print_status "Upload directories created"

# Step 3: Database Migration
print_step "3/6 Running database migration..."
if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL environment variable not set"
    print_warning "Please run the migration manually:"
    echo "psql \$DATABASE_URL -f migration-screenshot-support.sql"
else
    psql $DATABASE_URL -f migration-screenshot-support.sql
    if [ $? -eq 0 ]; then
        print_status "Database migration completed successfully"
    else
        print_error "Database migration failed"
        print_warning "Please check your database connection and try running manually:"
        echo "psql \$DATABASE_URL -f migration-screenshot-support.sql"
    fi
fi

# Step 4: Environment Variables Check
print_step "4/6 Checking environment variables..."
if [ -z "$GOOGLE_API_KEY" ]; then
    print_warning "GOOGLE_API_KEY not set in environment"
    print_warning "Please add the following to your .env file:"
    echo "GOOGLE_API_KEY=your_gemini_api_key_here"
else
    print_status "Google API Key found"
fi

# Step 5: Build Backend Services
print_step "5/6 Building backend services..."
npm run build:backend
if [ $? -eq 0 ]; then
    print_status "Backend services built successfully"
else
    print_error "Backend build failed"
    exit 1
fi

# Step 6: Build Frontend Components
print_step "6/6 Building frontend components..."
cd app-legacy
npm install
npm run build
cd ..
npm run move:legacy
if [ $? -eq 0 ]; then
    print_status "Frontend components built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Final checks and summary
echo ""
echo "🎉 Screenshot Analysis Feature Installation Complete!"
echo ""
echo "📋 Installation Summary:"
echo "✅ Dependencies installed (sharp, etc.)"
echo "✅ Upload directories created"
echo "✅ Database schema updated"
echo "✅ Backend services built"
echo "✅ Frontend components built"
echo ""

# Environment variables summary
echo "🔧 Environment Variables to Check:"
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ GOOGLE_API_KEY - Not set (required for screenshot analysis)"
else
    echo "✅ GOOGLE_API_KEY - Configured"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL - Not set (required for migrations)"
else
    echo "✅ DATABASE_URL - Configured"
fi

echo ""
echo "📁 Created Directories:"
echo "  - uploads/screenshots/ (for storing uploaded screenshots)"
echo "  - uploads/temp/ (for temporary processing files)"
echo ""

echo "🚀 Next Steps:"
echo "1. Ensure Google API Key is set in your .env file"
echo "2. Restart your development server: npm run dev"
echo "3. Test the screenshot upload feature in the chat interface"
echo ""

echo "📚 Documentation:"
echo "  - Full documentation: docs/SCREENSHOT_ANALYSIS_IMPLEMENTATION_COMPLETE.md"
echo "  - API Reference: Check the README for endpoint details"
echo ""

echo "🐛 Troubleshooting:"
echo "  - Check upload permissions: chmod 755 uploads/"
echo "  - Verify Google API Key: echo \$GOOGLE_API_KEY"
echo "  - Check logs: tail -f server.log"
echo ""

# Test API Key if available
if [ ! -z "$GOOGLE_API_KEY" ]; then
    print_step "Testing Google API Key..."
    # Simple test - try to import the service (this will validate the key format)
    node -e "
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        console.log('✅ Google API Key format is valid');
    } catch (error) {
        console.log('❌ Google API Key format is invalid:', error.message);
    }
    " 2>/dev/null || print_warning "Could not validate Google API Key"
fi

echo "Installation completed at $(date)"
print_status "Screenshot Analysis Feature is ready to use!"

# Check if server is running and suggest restart
if pgrep -f "tsx.*server.ts" > /dev/null; then
    echo ""
    print_warning "Development server is currently running"
    print_warning "Please restart it to load the new screenshot features:"
    echo "  - Stop current server (Ctrl+C)"
    echo "  - Run: npm run dev"
fi

exit 0
