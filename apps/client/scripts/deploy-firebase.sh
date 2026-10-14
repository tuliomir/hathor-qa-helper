#!/bin/bash
set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

BUILD_DIR="${BUILD_DIR:-dist}"

echo "🔥 Deploying to Firebase Hosting..."
echo "   Build directory: $BUILD_DIR"
echo ""

# Check if dist folder exists
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Build directory '$BUILD_DIR' not found."
  echo "   Run 'bun run build' first."
  exit 1
fi

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
  echo "📦 Installing firebase-tools..."
  npm install -g firebase-tools
fi

# Deploy
firebase deploy --only hosting

echo ""
echo "✅ Firebase deployment complete!"
