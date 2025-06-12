#!/bin/bash

# Build script for mcp-stripe-monetization package
# This script handles the complete build process including TypeScript compilation and packaging

set -e

echo "🔨 Building mcp-stripe-monetization package..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist dist-cjs coverage .tsbuildinfo

# Run TypeScript compiler
echo "⚡ Compiling TypeScript..."
npm run type-check
npx tsc

# Build CommonJS version
echo "📦 Building CommonJS version..."
npm run build:cjs

# Copy package.json to dist for easier imports
echo "📋 Copying package metadata..."
cp package.json dist/
cp README.md dist/ 2>/dev/null || echo "README.md not found, skipping..."
cp LICENSE dist/ 2>/dev/null || echo "LICENSE not found, skipping..."

# Copy migration files if they exist
if [ -d "migrations" ]; then
    echo "📂 Copying migration files..."
    cp -r migrations dist/
fi

# Validate the build
echo "✅ Validating build..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

if [ ! -f "dist/index.d.ts" ]; then
    echo "❌ Build failed: dist/index.d.ts not found"
    exit 1
fi

# Check if CommonJS build exists
if [ ! -f "dist-cjs/index.cjs" ]; then
    echo "⚠️ Warning: CommonJS build not found at dist-cjs/index.cjs"
fi

echo "🎉 Build completed successfully!"
echo "📦 ESM build: dist/"
echo "📦 CommonJS build: dist-cjs/"

# Show build size
if command -v du >/dev/null 2>&1; then
    echo "📊 Build size:"
    du -sh dist/ 2>/dev/null || echo "Could not calculate build size"
fi

# Show the main files
echo "📋 Main files:"
ls -la dist/index.* 2>/dev/null || echo "Could not list main files"