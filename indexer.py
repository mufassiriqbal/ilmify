#!/usr/bin/env python3
"""
Ilmify - Content Indexer
Automatically generates metadata.json by scanning the content directory.

Usage:
    python indexer.py

This script scans the /content directory recursively, detects file types,
and generates a metadata.json file for the frontend.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any


# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
CONTENT_DIR = SCRIPT_DIR / "content"
OUTPUT_FILE = SCRIPT_DIR / "portal" / "data" / "metadata.json"

# Supported file extensions and their formats
SUPPORTED_EXTENSIONS = {
    '.pdf': 'pdf',
    '.mp4': 'mp4',
    '.webm': 'video',
    '.mkv': 'video',
    '.avi': 'video',
}

# Category mapping based on folder names
CATEGORY_MAPPING = {
    'textbooks': 'textbooks',
    'videos': 'videos',
    'health-guides': 'health-guides',
    'health_guides': 'health-guides',
    'healthguides': 'health-guides',
}


def filename_to_title(filename: str) -> str:
    """
    Convert a filename to a human-readable title.
    
    Examples:
        'physics-class-9.pdf' -> 'Physics Class 9'
        'first_aid_guide.pdf' -> 'First Aid Guide'
        '9th-grade-math-urdu.pdf' -> '9th Grade Math Urdu'
    
    Args:
        filename: The filename to convert
        
    Returns:
        A human-readable title string
    """
    # Remove file extension
    name = Path(filename).stem
    
    # Replace hyphens and underscores with spaces
    name = name.replace('-', ' ').replace('_', ' ')
    
    # Handle camelCase (insert space before uppercase letters)
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    
    # Title case, but preserve numbers and handle edge cases
    words = name.split()
    titled_words = []
    
    for word in words:
        # If word is all numbers or starts with a number, keep as is
        if word.isdigit() or (word and word[0].isdigit()):
            titled_words.append(word)
        else:
            titled_words.append(word.capitalize())
    
    return ' '.join(titled_words)


def get_category_from_path(file_path: Path, content_dir: Path) -> str:
    """
    Determine the category based on the folder structure.
    
    Args:
        file_path: Full path to the file
        content_dir: Path to the content directory
        
    Returns:
        Category string (e.g., 'textbooks', 'videos', 'health-guides')
    """
    try:
        relative_path = file_path.relative_to(content_dir)
        parts = relative_path.parts
        
        if len(parts) > 1:
            # First folder after content/ is the category
            folder_name = parts[0].lower()
            return CATEGORY_MAPPING.get(folder_name, folder_name)
        else:
            # File is directly in content folder, use 'uncategorized'
            return 'uncategorized'
    except ValueError:
        return 'uncategorized'


def scan_content_directory(content_dir: Path) -> List[Dict[str, Any]]:
    """
    Recursively scan the content directory for supported files.
    
    Args:
        content_dir: Path to the content directory
        
    Returns:
        List of resource metadata dictionaries
    """
    resources = []
    resource_id = 1
    
    if not content_dir.exists():
        print(f"⚠️  Content directory not found: {content_dir}")
        print("   Creating content directory structure...")
        content_dir.mkdir(parents=True, exist_ok=True)
        (content_dir / "textbooks").mkdir(exist_ok=True)
        (content_dir / "videos").mkdir(exist_ok=True)
        (content_dir / "health-guides").mkdir(exist_ok=True)
        return resources
    
    # Walk through all files recursively
    for file_path in content_dir.rglob('*'):
        if file_path.is_file():
            extension = file_path.suffix.lower()
            
            if extension in SUPPORTED_EXTENSIONS:
                # Get relative path from the ilm-hotspot root
                relative_filepath = file_path.relative_to(SCRIPT_DIR)
                
                resource = {
                    'id': resource_id,
                    'title': filename_to_title(file_path.name),
                    'filepath': str(relative_filepath).replace('\\', '/'),  # Use forward slashes
                    'format': SUPPORTED_EXTENSIONS[extension],
                    'category': get_category_from_path(file_path, content_dir)
                }
                
                resources.append(resource)
                resource_id += 1
                
                print(f"   ✓ Found: {resource['title']} ({resource['format']})")
    
    return resources


def save_metadata(resources: List[Dict[str, Any]], output_file: Path) -> None:
    """
    Save the resources metadata to a JSON file.
    
    Args:
        resources: List of resource metadata dictionaries
        output_file: Path to the output JSON file
    """
    # Ensure the output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(resources, f, indent=4, ensure_ascii=False)
    
    print(f"\n✅ Metadata saved to: {output_file}")


def main():
    """Main function to run the indexer."""
    print("=" * 50)
    print("🔍 Ilmify Content Indexer")
    print("=" * 50)
    print(f"\n📂 Scanning: {CONTENT_DIR}")
    print("-" * 50)
    
    # Scan for content
    resources = scan_content_directory(CONTENT_DIR)
    
    print("-" * 50)
    
    if resources:
        # Print summary by category
        categories = {}
        for resource in resources:
            cat = resource['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        print("\n📊 Summary:")
        for category, count in sorted(categories.items()):
            print(f"   • {category}: {count} file(s)")
        print(f"   • Total: {len(resources)} file(s)")
        
        # Save metadata
        save_metadata(resources, OUTPUT_FILE)
    else:
        print("\n⚠️  No supported files found!")
        print("   Supported formats: .pdf, .mp4, .webm, .mkv, .avi")
        print("\n   Add files to these directories:")
        print(f"   • {CONTENT_DIR / 'textbooks'} (for PDFs)")
        print(f"   • {CONTENT_DIR / 'videos'} (for video files)")
        print(f"   • {CONTENT_DIR / 'health-guides'} (for health PDFs)")
        
        # Create empty metadata file
        save_metadata([], OUTPUT_FILE)
    
    print("\n✨ Done!")
    print("=" * 50)


if __name__ == "__main__":
    main()
