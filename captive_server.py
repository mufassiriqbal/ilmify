#!/usr/bin/env python3
"""
Ilmify - Captive Portal Server
Education That Reaches You

This server acts as a captive portal - when students connect to WiFi,
their device automatically opens Ilmify in the browser.

Usage:
    Run as Administrator: python captive_server.py

Features:
- Captive portal detection (auto-opens browser on WiFi connect)
- Serves the web portal
- Auto-watches for content changes
- Works with Windows Mobile Hotspot
"""

import http.server
import socketserver
import threading
import time
import json
import re
import hashlib
import socket
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

# Configuration
HTTP_PORT = 80  # Must be 80 for captive portal to work
DNS_PORT = 53
HOST = "0.0.0.0"

SCRIPT_DIR = Path(__file__).parent.resolve()
CONTENT_DIR = SCRIPT_DIR / "content"
OUTPUT_FILE = SCRIPT_DIR / "portal" / "data" / "metadata.json"

# Get local IP automatically
def get_local_ip():
    """Get the local IP address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()

# Captive portal detection URLs that devices check
CAPTIVE_PORTAL_URLS = [
    # Android
    "/generate_204",
    "/gen_204",
    "/connecttest.txt",
    "/ncsi.txt",
    # Apple iOS/macOS
    "/hotspot-detect.html",
    "/library/test/success.html",
    "/success.txt",
    # Windows
    "/connecttest.txt",
    "/ncsi.txt",
    "/redirect",
    # Firefox
    "/success.txt",
    "/canonical.html",
    # Generic
    "/favicon.ico",
]

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


class CaptivePortalHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that implements captive portal detection."""
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Check if this is a captive portal detection request
        if self.is_captive_portal_request(path):
            self.send_captive_portal_response()
            return
        
        # Serve normal files
        super().do_GET()
    
    def is_captive_portal_request(self, path: str) -> bool:
        """Check if request is from device checking for captive portal."""
        # Check path
        for portal_url in CAPTIVE_PORTAL_URLS:
            if path == portal_url or path.endswith(portal_url):
                return True
        
        # Check host header for known captive portal domains
        host = self.headers.get('Host', '').lower()
        captive_domains = [
            'captive.apple.com',
            'www.apple.com',
            'connectivitycheck.gstatic.com',
            'clients3.google.com',
            'www.msftconnecttest.com',
            'msftconnecttest.com',
            'detectportal.firefox.com',
            'www.gstatic.com',
        ]
        for domain in captive_domains:
            if domain in host:
                return True
        
        return False
    
    def send_captive_portal_response(self):
        """Send response that triggers captive portal popup."""
        # Create redirect HTML
        redirect_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0;url=http://{LOCAL_IP}/">
    <title>Ilmify - Education That Reaches You</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #2c7a3f, #1e5a2d);
            color: white;
            text-align: center;
        }}
        .container {{
            padding: 40px;
        }}
        h1 {{
            font-size: 2.5rem;
            margin-bottom: 10px;
        }}
        p {{
            font-size: 1.2rem;
            opacity: 0.9;
        }}
        a {{
            display: inline-block;
            margin-top: 20px;
            padding: 15px 40px;
            background: #f5a623;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-size: 1.2rem;
            font-weight: bold;
        }}
        a:hover {{
            background: #d48c1a;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Welcome to Ilmify!</h1>
        <p>Education That Reaches You</p>
        <p>تعلیم جو آپ تک پہنچے</p>
        <a href="http://{LOCAL_IP}/">Enter Ilmify →</a>
        <p style="margin-top: 30px; font-size: 0.9rem;">Redirecting automatically...</p>
    </div>
    <script>
        setTimeout(function() {{
            window.location.href = "http://{LOCAL_IP}/";
        }}, 1500);
    </script>
</body>
</html>"""
        
        content = redirect_html.encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(content))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()
        self.wfile.write(content)
    
    def log_message(self, fmt, *args):
        try:
            if len(args) >= 1 and isinstance(args[0], str):
                request = args[0]
                # Skip logging static assets
                if any(ext in request for ext in ['.css', '.js', '.json', '.ico', '.png', '.jpg']):
                    return
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"🌐 [{timestamp}] {request}")
        except Exception:
            pass
    
    def log_error(self, fmt, *args):
        pass


class DNSHandler:
    """Simple DNS server that redirects all domains to local IP."""
    
    def __init__(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.running = True
    
    def start(self):
        try:
            self.socket.bind((HOST, DNS_PORT))
            print(f"📡 DNS Server running on port {DNS_PORT}")
            
            while self.running:
                try:
                    self.socket.settimeout(1)
                    data, addr = self.socket.recvfrom(512)
                    response = self.build_dns_response(data)
                    self.socket.sendto(response, addr)
                except socket.timeout:
                    continue
                except Exception:
                    continue
        except PermissionError:
            print(f"⚠️  DNS Server needs admin rights (port {DNS_PORT})")
            print("   Captive portal auto-redirect may not work.")
            print("   Students can still access via: http://{LOCAL_IP}/")
        except Exception as e:
            print(f"⚠️  DNS Server error: {e}")
    
    def build_dns_response(self, data):
        """Build DNS response pointing all domains to local IP."""
        # Parse the request
        transaction_id = data[:2]
        
        # Build response header
        flags = b'\x81\x80'  # Standard response, no error
        questions = data[4:6]
        answers = b'\x00\x01'  # 1 answer
        authority = b'\x00\x00'
        additional = b'\x00\x00'
        
        # Copy the question section
        question_end = 12
        while data[question_end] != 0:
            question_end += data[question_end] + 1
        question_end += 5  # null byte + qtype + qclass
        question = data[12:question_end]
        
        # Build answer section
        answer = b'\xc0\x0c'  # Pointer to domain name
        answer += b'\x00\x01'  # Type A
        answer += b'\x00\x01'  # Class IN
        answer += b'\x00\x00\x00\x3c'  # TTL (60 seconds)
        answer += b'\x00\x04'  # Data length
        answer += bytes(map(int, LOCAL_IP.split('.')))  # IP address
        
        return transaction_id + flags + questions + answers + authority + additional + question + answer
    
    def stop(self):
        self.running = False
        self.socket.close()


def main():
    print("=" * 55)
    print("🚀 Ilmify - Captive Portal Server")
    print("   Education That Reaches You")
    print("=" * 55)
    print()
    print(f"📍 Your IP Address: {LOCAL_IP}")
    print(f"📂 Content folder: {CONTENT_DIR}")
    print()
    
    # Start file watcher
    watcher = FileWatcher()
    watcher.start()
    resources = scan_content_directory()
    print(f"📊 Found {len(resources)} resource(s)")
    print()
    
    # Start DNS server in background
    dns_server = DNSHandler()
    dns_thread = threading.Thread(target=dns_server.start, daemon=True)
    dns_thread.start()
    
    # Start HTTP server
    try:
        with socketserver.TCPServer((HOST, HTTP_PORT), CaptivePortalHandler) as httpd:
            print(f"🌐 Web Server running on port {HTTP_PORT}")
            print()
            print("=" * 55)
            print("✅ CAPTIVE PORTAL ACTIVE!")
            print()
            print("📱 When students connect to your WiFi hotspot,")
            print("   Ilmify will open automatically in their browser!")
            print()
            print(f"🔗 Direct URL: http://{LOCAL_IP}/")
            print()
            print("⚠️  IMPORTANT: Run this as Administrator for")
            print("   captive portal to work properly.")
            print()
            print("Press Ctrl+C to stop")
            print("=" * 55)
            
            httpd.serve_forever()
    except PermissionError:
        print()
        print("❌ ERROR: Port 80 requires Administrator privileges!")
        print()
        print("   Please run this command as Administrator:")
        print("   Right-click PowerShell → 'Run as Administrator'")
        print()
        print(f"   Or use the regular server on port 8080:")
        print(f"   python server.py")
        print()
    except OSError as e:
        if "address already in use" in str(e).lower() or "10048" in str(e):
            print()
            print("❌ ERROR: Port 80 is already in use!")
            print("   Another program (like IIS or Skype) may be using it.")
            print()
            print("   Try stopping other web servers or use:")
            print("   python server.py")
        else:
            raise
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        watcher.stop()
        dns_server.stop()
        print("✅ Server stopped. Goodbye!")


if __name__ == "__main__":
    main()
