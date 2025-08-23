#!/bin/bash
# Install dependencies for the willi-mako-chat-test.js script

echo "Installing dependencies for willi-mako-chat-test.js..."
npm install --save-dev axios commander dotenv

echo "Making the script executable..."
chmod +x willi-mako-chat-test.js

echo "Installation complete!"
echo ""
echo "Usage examples:"
echo "  # Run in interactive mode:"
echo "  ./willi-mako-chat-test.js -i"
echo ""
echo "  # Run a single query:"
echo "  ./willi-mako-chat-test.js --query \"Was bedeutet GPKE?\""
echo ""
echo "  # Run all queries from test-queries.json file:"
echo "  ./willi-mako-chat-test.js --file test-queries.json"
echo ""
echo "  # Run with verbose output:"
echo "  ./willi-mako-chat-test.js --file test-queries.json --verbose"
echo ""
echo "  # Show all available options:"
echo "  ./willi-mako-chat-test.js --help"
