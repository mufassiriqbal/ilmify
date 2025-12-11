#!/usr/bin/env python3
"""
Ilmify - Hotspot Server
Education That Reaches You

Simple server that serves Ilmify on port 8080.
Students connect to your Mobile Hotspot and browse to your IP.

Usage:
    python hotspot_server.py
    
Students access:
    http://192.168.137.1:8080/
"""

import http.server
import socketserver
import threading
import time
import json
import re
import hashlib
from pathlib import Path
from datetime import datetime

# Configuration
PORT = 8080
HOST = "0.0.0.0"  # Listen on all interfaces
HOTSPOT_IP = "192.168.137.1"  # Default Windows Mobile Hotspot IP

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

CATEGORY_MAPPING = {
    'textbooks': 'textbooks',
    'videos': 'videos',
    'health-guides': 'health-guides',
}

WATCH_INTERVAL = 3


def filename_to_title(filename: str) -> str:
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
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(resources, f, indent=4, ensure_ascii=False)


class FileWatcher(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.last_hash = ""
        self.running = True
    
    def run(self):
        self.last_hash = get_content_hash()
        save_metadata(scan_content_directory())
        
        while self.running:
            time.sleep(WATCH_INTERVAL)
            current_hash = get_content_hash()
            if current_hash != self.last_hash:
                self.last_hash = current_hash
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"🔄 [{timestamp}] Content changed - updating metadata...")
                resources = scan_content_directory()
                save_metadata(resources)
                print(f"   ✅ {len(resources)} resource(s) indexed")
    
    def stop(self):
        self.running = False


class PortalHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler for the Ilmify portal."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPT_DIR), **kwargs)
    
    def handle(self):
        """Override to catch connection errors."""
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass
        except Exception:
            pass
    
    def do_GET(self):
        # Redirect root to portal
        if self.path == '/' or self.path == '':
            self.path = '/portal/index.html'
        elif self.path.startswith('/index'):
            self.path = '/portal' + self.path
        
        # Serve files
        super().do_GET()
    
    def log_message(self, format, *args):
        """Custom logging."""
        client_ip = self.client_address[0]
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"📱 [{timestamp}] {client_ip} → {args[0]}")


def print_banner():
    print("\033[1;33m")  # Yellow
    print("=" * 60)
    print("          📚 Ilmify - Education That Reaches You")
    print("                 تعلیم جو آپ تک پہنچے")
    print("=" * 60)
    print("\033[0m")  # Reset


def print_instructions():
    print(f"""
\033[1;36m🌐 Server Running!\033[0m

\033[1;32m✅ HOW STUDENTS ACCESS ILMIFY:\033[0m
   
   1. Turn ON your Windows Mobile Hotspot
      (Settings → Network & Internet → Mobile hotspot)
   
   2. Students connect their phone to your hotspot
   
   3. Students open browser and go to:
      \033[1;33m→ http://{HOTSPOT_IP}:8080/\033[0m
      or
      \033[1;33m→ http://192.168.137.1:8080/\033[0m

\033[1;34m📱 SHARE WITH STUDENTS:\033[0m
   WiFi Name: [Your Hotspot Name]
   URL: http://{HOTSPOT_IP}:8080/

\033[1;31m⚠️  Make sure Mobile Hotspot is ON!\033[0m
   
Press Ctrl+C to stop the server
""")


def main():
    print_banner()
    
    # Initial metadata scan
    print("📂 Scanning content directory...")
    resources = scan_content_directory()
    save_metadata(resources)
    print(f"   ✅ Found {len(resources)} resource(s)")
    print()
    
    # Start file watcher
    watcher = FileWatcher()
    watcher.start()
    
    # Create HTTP server
    try:
        with socketserver.ThreadingTCPServer((HOST, PORT), PortalHandler) as httpd:
            httpd.allow_reuse_address = True
            print_instructions()
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n👋 Shutting down server...")
                watcher.stop()
                httpd.shutdown()
    except OSError as e:
        if "Address already in use" in str(e) or "10048" in str(e):
            print(f"\n❌ Port {PORT} is already in use!")
            print("   Try closing other servers or using a different port.")
        else:
            print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()
