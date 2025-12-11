#!/usr/bin/env python3
"""
Ilmify - Auto-Refresh Server
Education That Reaches You

Usage:
    python server.py

Features:
- Serves the web portal
- Handles file uploads from faculty
- Watches content folder for new/modified/deleted files
- Auto-regenerates metadata.json when changes detected
- Works on Windows, Mac, and Linux
"""

import http.server
import socketserver
import threading
import time
import json
import re
import hashlib
import os
import io
from pathlib import Path
from datetime import datetime

# Configuration
PORT = 8080
HOST = "0.0.0.0"  # Listen on all interfaces for mobile access

SCRIPT_DIR = Path(__file__).parent.resolve()
CONTENT_DIR = SCRIPT_DIR / "content"
OUTPUT_FILE = SCRIPT_DIR / "portal" / "data" / "metadata.json"

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    '.pdf': 'pdf',
    '.mp4': 'mp4',
    '.webm': 'video',
    '.mkv': 'video',
    '.avi': 'video',
}

# Category mapping
CATEGORY_MAPPING = {
    'textbooks': 'textbooks',
    'videos': 'videos',
    'health-guides': 'health-guides',
    'health_guides': 'health-guides',
    'healthguides': 'health-guides',
}

# Watch interval in seconds
WATCH_INTERVAL = 3


def filename_to_title(filename: str) -> str:
    """Convert filename to human-readable title."""
    name = Path(filename).stem
    name = name.replace('-', ' ').replace('_', ' ')
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    words = name.split()
    titled_words = []
    for word in words:
        if word.isdigit() or (word and word[0].isdigit()):
            titled_words.append(word)
        else:
            titled_words.append(word.capitalize())
    return ' '.join(titled_words)


def get_category_from_path(file_path: Path, content_dir: Path) -> str:
    """Determine category from folder structure."""
    try:
        relative_path = file_path.relative_to(content_dir)
        parts = relative_path.parts
        if len(parts) > 1:
            folder_name = parts[0].lower()
            return CATEGORY_MAPPING.get(folder_name, folder_name)
        return 'uncategorized'
    except ValueError:
        return 'uncategorized'


def scan_content_directory() -> list:
    """Scan content directory and return list of resources."""
    resources = []
    resource_id = 1

    if not CONTENT_DIR.exists():
        return resources

    for file_path in CONTENT_DIR.rglob('*'):
        if file_path.is_file():
            extension = file_path.suffix.lower()
            if extension in SUPPORTED_EXTENSIONS:
                relative_filepath = file_path.relative_to(SCRIPT_DIR)
                resource = {
                    'id': resource_id,
                    'title': filename_to_title(file_path.name),
                    'filepath': str(relative_filepath).replace('\\', '/'),
                    'format': SUPPORTED_EXTENSIONS[extension],
                    'category': get_category_from_path(file_path, CONTENT_DIR)
                }
                resources.append(resource)
                resource_id += 1

    return resources


def get_content_hash() -> str:
    """Generate a hash of current content state for change detection."""
    files_info = []
    
    if CONTENT_DIR.exists():
        for file_path in sorted(CONTENT_DIR.rglob('*')):
            if file_path.is_file():
                extension = file_path.suffix.lower()
                if extension in SUPPORTED_EXTENSIONS:
                    stat = file_path.stat()
                    files_info.append(f"{file_path}:{stat.st_mtime}:{stat.st_size}")
    
    return hashlib.md5('|'.join(files_info).encode()).hexdigest()


def save_metadata(resources: list) -> None:
    """Save resources to metadata.json."""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(resources, f, indent=4, ensure_ascii=False)


def update_metadata() -> bool:
    """Scan and update metadata. Returns True if changes were made."""
    resources = scan_content_directory()
    save_metadata(resources)
    return True


class FileWatcher(threading.Thread):
    """Background thread that watches for file changes."""
    
    def __init__(self):
        super().__init__(daemon=True)
        self.last_hash = ""
        self.running = True
    
    def run(self):
        print(f"👁️  Watching for changes in: {CONTENT_DIR}")
        print(f"   Auto-refresh interval: {WATCH_INTERVAL} seconds")
        print("-" * 50)
        
        # Initial scan
        self.last_hash = get_content_hash()
        update_metadata()
        resources = scan_content_directory()
        print(f"📊 Initial scan: {len(resources)} resource(s) found")
        
        while self.running:
            time.sleep(WATCH_INTERVAL)
            
            current_hash = get_content_hash()
            if current_hash != self.last_hash:
                self.last_hash = current_hash
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"\n🔄 [{timestamp}] Change detected! Updating metadata...")
                
                resources = scan_content_directory()
                save_metadata(resources)
                
                print(f"   ✅ Updated: {len(resources)} resource(s) indexed")
                
                # Show what files are now available
                for res in resources:
                    print(f"      • {res['title']} ({res['format']})")
    
    def stop(self):
        self.running = False


class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with quieter logging and file upload support."""
    
    def do_POST(self):
        """Handle file uploads."""
        if self.path == '/upload':
            self.handle_upload()
        else:
            self.send_error(404, "Not Found")
    
    def handle_upload(self):
        """Process file upload from faculty."""
        try:
            content_type = self.headers.get('Content-Type', '')
            
            if 'multipart/form-data' not in content_type:
                self.send_json_response(400, {'error': 'Invalid content type'})
                return
            
            # Parse boundary - handle with or without quotes
            boundary_part = content_type.split('boundary=')[1]
            if boundary_part.startswith('"'):
                boundary_part = boundary_part[1:].split('"')[0]
            boundary = boundary_part.encode()
            
            # Read content
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse multipart data
            parts = body.split(b'--' + boundary)
            
            file_data = None
            filename = None
            title = None
            category = None
            description = ''
            
            for part in parts:
                if b'Content-Disposition' not in part:
                    continue
                
                # Get the content disposition header
                header_end = part.find(b'\r\n\r\n')
                if header_end == -1:
                    continue
                    
                header = part[:header_end].decode('utf-8', errors='ignore')
                content = part[header_end + 4:]
                
                # Remove trailing boundary markers and whitespace
                content = content.rstrip(b'\r\n-')
                
                if 'name="file"' in header:
                    # Extract filename
                    fn_match = re.search(r'filename="([^"]+)"', header)
                    if fn_match:
                        filename = fn_match.group(1)
                    # For file data, we need to be more careful with trimming
                    # Only remove the final \r\n before the boundary
                    file_data = content
                elif 'name="title"' in header:
                    title = content.decode('utf-8', errors='ignore').strip()
                elif 'name="category"' in header:
                    category = content.decode('utf-8', errors='ignore').strip()
                elif 'name="description"' in header:
                    description = content.decode('utf-8', errors='ignore').strip()
            
            if not file_data or not filename or not title or not category:
                self.send_json_response(400, {'error': f'Missing required fields: file={bool(file_data)}, filename={filename}, title={title}, category={category}'})
                return
            
            # Validate file has actual content
            if len(file_data) < 10:
                self.send_json_response(400, {'error': 'File appears to be empty or corrupted'})
                return
            
            # Generate safe filename
            safe_title = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
            file_ext = filename.split('.')[-1].lower() if '.' in filename else 'pdf'
            new_filename = f"{safe_title}.{file_ext}"
            
            # Create category folder if needed
            category_path = CONTENT_DIR / category
            category_path.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file_path = category_path / new_filename
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # Verify file was saved
            if not file_path.exists():
                self.send_json_response(500, {'error': 'File failed to save'})
                return
            
            saved_size = file_path.stat().st_size
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"\n📤 [{timestamp}] File uploaded: {new_filename}")
            print(f"   Category: {category}")
            print(f"   Size: {saved_size / 1024:.1f} KB")
            print(f"   Path: {file_path}")
            
            # Update metadata immediately
            resources = scan_content_directory()
            save_metadata(resources)
            print(f"   ✅ Metadata updated: {len(resources)} resources total")
            
            self.send_json_response(200, {
                'success': True,
                'message': 'File uploaded successfully',
                'filename': new_filename,
                'filepath': f'content/{category}/{new_filename}'
            })
            
        except Exception as e:
            print(f"❌ Upload error: {str(e)}")
            self.send_json_response(500, {'error': str(e)})
    
    def send_json_response(self, status, data):
        """Send JSON response."""
        response = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response)
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, fmt, *args):
        # Skip logging errors - they're handled elsewhere
        try:
            if len(args) >= 1 and isinstance(args[0], str):
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"🌐 [{timestamp}] {args[0]}")
        except (IndexError, TypeError):
            pass
    
    def log_error(self, fmt, *args):
        # Suppress error logging to keep console clean
        pass


def main():
    print("=" * 50)
    print("🚀 Ilmify - Auto-Refresh Server")
    print("=" * 50)
    print(f"\n📂 Content folder: {CONTENT_DIR}")
    print(f"📄 Metadata file: {OUTPUT_FILE}")
    print()
    
    # Start file watcher
    watcher = FileWatcher()
    watcher.start()
    
    # Start HTTP server
    with socketserver.TCPServer((HOST, PORT), QuietHTTPHandler) as httpd:
        print(f"\n🌐 Server running at:")
        print(f"   • Local:   http://localhost:{PORT}")
        print(f"   • Network: http://<your-ip>:{PORT}")
        print()
        print("📱 To access from mobile devices on the same WiFi,")
        print("   use your computer's IP address")
        print()
        print("✨ Drop files into the content folder - they'll")
        print("   automatically appear in the portal!")
        print()
        print("Press Ctrl+C to stop the server")
        print("=" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Shutting down server...")
            watcher.stop()
            print("✅ Server stopped. Goodbye!")


if __name__ == "__main__":
    main()
