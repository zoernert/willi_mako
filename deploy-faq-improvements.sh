#!/bin/bash

# Deploy FAQ Improvements
# =======================

echo "🚀 Deploying FAQ Improvements..."
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Step 1: Install any new dependencies (if needed)
echo "📦 Checking dependencies..."
cd client && npm install
cd ..

# Step 2: Build frontend
echo "🏗️ Building frontend..."
cd client && npm run build
cd ..

# Step 3: Restart backend (if using pm2)
echo "🔄 Restarting backend..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || echo "⚠️ PM2 not running or not configured"
else
    echo "ℹ️ PM2 not found, please restart your backend manually"
fi

# Step 4: Run FAQ migration (optional)
echo ""
read -p "🔄 Do you want to migrate existing FAQs to the vector store? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Running FAQ vector store migration..."
    node migrate-faqs-to-vector-store.js
else
    echo "⏭️ Skipping FAQ migration"
fi

# Step 5: Test the deployment
echo ""
read -p "🧪 Do you want to run the FAQ features test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Running FAQ features test..."
    node test-faq-features.js
else
    echo "⏭️ Skipping test"
fi

echo ""
echo "🎉 FAQ Improvements Deployment Complete!"
echo "========================================"
echo ""
echo "✨ New Features Available:"
echo "  🔍 Advanced search functionality"
echo "  🏷️ Tag-based filtering"
echo "  📊 Multiple sorting options (newest first by default)"
echo "  📄 Pagination support"
echo "  🔗 Direct links to FAQ details"
echo "  📱 Responsive design"
echo "  🧠 Vector store integration for semantic search"
echo ""
echo "🌐 Access the improved FAQ list at:"
echo "   Frontend: http://localhost:3000/faq"
echo "   API: http://localhost:3003/faqs"
echo ""
echo "📚 Key improvements implemented:"
echo "  ✅ FAQ list shows cards instead of full content"
echo "  ✅ Search bar for finding specific topics"
echo "  ✅ Clickable tag filters"
echo "  ✅ Sort by: newest, most viewed, alphabetical"
echo "  ✅ Links to individual FAQ detail pages"
echo "  ✅ Vector store integration for future AI features"
echo "  ✅ Backend pagination and filtering"
echo ""

# Optional: Open browser
if command -v xdg-open &> /dev/null; then
    read -p "🌐 Open FAQ page in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "http://localhost:3000/faq"
    fi
elif command -v open &> /dev/null; then
    read -p "🌐 Open FAQ page in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "http://localhost:3000/faq"
    fi
fi

echo "✅ Deployment completed successfully!"
