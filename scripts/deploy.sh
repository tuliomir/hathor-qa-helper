#!/bin/bash
set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Default values
PROJECT_NAME="${CLOUDFLARE_PROJECT_NAME:-hathor-qa-helper}"
BUILD_DIR="${BUILD_DIR:-dist}"

echo "🚀 Deploying to Cloudflare Pages..."
echo "   Project: $PROJECT_NAME"
echo "   Build directory: $BUILD_DIR"
echo ""

# Check if dist folder exists
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Build directory '$BUILD_DIR' not found."
  echo "   Run 'bun run build' first."
  exit 1
fi

# Deploy using Wrangler
# If CLOUDFLARE_ACCOUNT_ID is set, use it (for CI/CD)
if [ -n "$CLOUDFLARE_ACCOUNT_ID" ]; then
  npx wrangler pages deploy "$BUILD_DIR" --project-name="$PROJECT_NAME"
else
  # Interactive mode - will prompt for login if needed
  npx wrangler pages deploy "$BUILD_DIR" --project-name="$PROJECT_NAME"
fi

echo ""
echo "✅ Deployment complete!"
