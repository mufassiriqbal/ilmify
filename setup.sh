#!/bin/bash
# ============================================
# Ilmify - Setup Script
# Education That Reaches You
# ============================================

echo "🌟 Setting up Ilmify folder structure..."

# Base directory
BASE_DIR="$(dirname "$0")"

# Create content directories
echo "📁 Creating content directories..."
mkdir -p "$BASE_DIR/content/textbooks"
mkdir -p "$BASE_DIR/content/health-guides"
mkdir -p "$BASE_DIR/content/videos"

# Create portal directories
echo "📁 Creating portal directories..."
mkdir -p "$BASE_DIR/portal/css"
mkdir -p "$BASE_DIR/portal/js"
mkdir -p "$BASE_DIR/portal/img"
mkdir -p "$BASE_DIR/portal/data"

# Set permissions (readable by web server)
echo "🔒 Setting permissions..."
chmod -R 755 "$BASE_DIR/content"
chmod -R 755 "$BASE_DIR/portal"

echo ""
echo "✅ Ilmify setup complete!"
echo ""
echo "📂 Folder structure created:"
echo "   ilmify/"
echo "   ├── content/"
echo "   │   ├── textbooks/    (Place PDF textbooks here)"
echo "   │   ├── health-guides/ (Place health PDF guides here)"
echo "   │   └── videos/       (Place MP4 videos here)"
echo "   ├── portal/"
echo "   │   ├── css/          (Stylesheets)"
echo "   │   ├── js/           (JavaScript files)"
echo "   │   ├── img/          (Images)"
echo "   │   └── data/         (metadata.json)"
echo "   └── setup.sh"
echo ""
echo "📝 Next steps:"
echo "   1. Add your content files to the appropriate folders"
echo "   2. Run 'python3 indexer.py' to generate metadata"
echo "   3. Start a local web server to serve the portal"
echo ""
