#!/usr/bin/env python3
"""
Ilmify - Multi-User Production Server
Education That Reaches You

Features:
- Multi-threaded for handling multiple concurrent users
- Error isolation - one user's issue won't affect others
- Active user tracking for admin dashboard
- Auto-refresh and file watching
- PDF compression and embeddings support
"""

import http.server
import socketserver
import threading
import time
import json
import re
import hashlib
import sys
from pathlib import Path
from datetime import datetime

# Try to import embeddings module
try:
    sys.path.insert(0, str(Path(__file__).parent / 'scripts'))
    from embeddings import build_embeddings, vector_store
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    build_embeddings = None
    vector_store = None
    print("⚠️  Embeddings module not available. Vector search disabled.")

# Try to import PDF compressor module
try:
    sys.path.insert(0, str(Path(__file__).parent / 'scripts'))
    from pdf_compressor import compress_pdf
    COMPRESSOR_AVAILABLE = True
except ImportError:
    COMPRESSOR_AVAILABLE = False
    compress_pdf = None
    print("⚠️  PDF compressor module not available.")

# Configuration
PORT = 8080
HOST = "0.0.0.0"  # Listen on all interfaces for mobile access
SESSION_TIMEOUT = 300  # 5 minutes for active session

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

# Watch interval in seconds (increased for performance)
WATCH_INTERVAL = 10


# ============================================
# USER TRACKING SYSTEM WITH RATE LIMITING
# ============================================

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 120  # max requests per window per IP

class UserTracker:
    """Thread-safe user activity tracking with rate limiting."""
    
    def __init__(self):
        self._lock = threading.Lock()
        self._active_sessions = {}  # ip -> session data
        self._total_requests = 0
        self._total_unique_ips = set()
        self._error_count = 0
        self._start_time = time.time()
        self._rate_limits = {}  # ip -> {count, window_start}
    
    def check_rate_limit(self, client_ip):
        """Check if client is rate limited. Returns True if allowed."""
        with self._lock:
            current_time = time.time()
            
            if client_ip not in self._rate_limits:
                self._rate_limits[client_ip] = {'count': 1, 'window_start': current_time}
                return True
            
            rate_data = self._rate_limits[client_ip]
            
            # Reset window if expired
            if current_time - rate_data['window_start'] > RATE_LIMIT_WINDOW:
                self._rate_limits[client_ip] = {'count': 1, 'window_start': current_time}
                return True
            
            # Check if over limit
            if rate_data['count'] >= RATE_LIMIT_MAX_REQUESTS:
                return False
            
            rate_data['count'] += 1
            return True
    
    def record_activity(self, client_ip, user_agent='', path=''):
        """Record user activity."""
        with self._lock:
            current_time = time.time()
            
            if client_ip not in self._active_sessions:
                self._active_sessions[client_ip] = {
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'ip': client_ip,
                    'user_agent': user_agent[:100] if user_agent else 'Unknown',
                    'pages_visited': 1,
                    'requests': 1
                }
            else:
                self._active_sessions[client_ip]['last_seen'] = current_time
                self._active_sessions[client_ip]['requests'] += 1
                if path and not path.endswith(('.css', '.js', '.json', '.png', '.jpg', '.ico')):
                    self._active_sessions[client_ip]['pages_visited'] += 1
            
            self._total_requests += 1
            self._total_unique_ips.add(client_ip)
    
    def record_error(self):
        """Record an error."""
        with self._lock:
            self._error_count += 1
    
    def cleanup_inactive(self):
        """Remove inactive sessions."""
        with self._lock:
            current_time = time.time()
            inactive = [
                ip for ip, data in self._active_sessions.items()
                if current_time - data['last_seen'] > SESSION_TIMEOUT
            ]
            for ip in inactive:
                del self._active_sessions[ip]
    
    def get_stats(self):
        """Get current statistics."""
        with self._lock:
            self.cleanup_inactive()
            current_time = time.time()
            
            active_users = len(self._active_sessions)
            active_list = []
            
            for ip, data in self._active_sessions.items():
                active_time = int(current_time - data['first_seen'])
                minutes = active_time // 60
                seconds = active_time % 60
                active_list.append({
                    'ip': self._mask_ip(ip),
                    'device': self._parse_device(data['user_agent']),
                    'pages': data['pages_visited'],
                    'requests': data['requests'],
                    'duration': f"{minutes}m {seconds}s"
                })
            
            uptime = int(current_time - self._start_time)
            uptime_hours = uptime // 3600
            uptime_minutes = (uptime % 3600) // 60
            
            return {
                'active_users': active_users,
                'total_unique_users': len(self._total_unique_ips),
                'total_requests': self._total_requests,
                'error_count': self._error_count,
                'active_sessions': active_list,
                'uptime': f"{uptime_hours}h {uptime_minutes}m",
                'uptime_seconds': uptime,
                'timestamp': datetime.now().isoformat()
            }
    
    def _mask_ip(self, ip):
        """Partially mask IP for privacy."""
        parts = ip.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.*.*"
        return ip[:10] + '...'
    
    def _parse_device(self, user_agent):
        """Parse device type from user agent."""
        ua = user_agent.lower()
        if 'mobile' in ua or 'android' in ua:
            return '📱 Mobile'
        elif 'ipad' in ua or 'tablet' in ua:
            return '📱 Tablet'
        elif 'windows' in ua:
            return '💻 Windows'
        elif 'mac' in ua:
            return '💻 Mac'
        elif 'linux' in ua:
            return '💻 Linux'
        return '🖥️ Desktop'


# Global user tracker
user_tracker = UserTracker()


# ============================================
# UTILITY FUNCTIONS
# ============================================

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
    """Scan and update metadata."""
    resources = scan_content_directory()
    save_metadata(resources)
    return True


# ============================================
# FILE WATCHER
# ============================================

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
            
            try:
                current_hash = get_content_hash()
                if current_hash != self.last_hash:
                    self.last_hash = current_hash
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"\n🔄 [{timestamp}] Change detected! Updating metadata...")
                    
                    resources = scan_content_directory()
                    save_metadata(resources)
                    
                    print(f"   ✅ Updated: {len(resources)} resource(s) indexed")
                    
                    for res in resources:
                        print(f"      • {res['title']} ({res['format']})")
                    
                    # Compress and update embeddings in background
                    if COMPRESSOR_AVAILABLE:
                        self._compress_pdfs(resources)
                    
                    if EMBEDDINGS_AVAILABLE:
                        self._update_embeddings(resources)
                        
            except Exception as e:
                print(f"⚠️  Watcher error (non-fatal): {e}")
    
    def _compress_pdfs(self, resources):
        """Compress large PDFs."""
        try:
            pdf_files = [r for r in resources if r['format'] == 'pdf']
            if pdf_files:
                for pdf_res in pdf_files:
                    pdf_path = SCRIPT_DIR / pdf_res['filepath']
                    if pdf_path.exists():
                        size_mb = pdf_path.stat().st_size / (1024 * 1024)
                        if size_mb > 10:
                            print(f"   🗜️  Compressing {pdf_res['title']}...")
                            result = compress_pdf(pdf_path)
                            if result.get('success') and result.get('reduction_percent', 0) > 0:
                                print(f"      ✅ Reduced by {result['reduction_percent']}%")
        except Exception as e:
            print(f"   ⚠️  Compression error: {e}")
    
    def _update_embeddings(self, resources):
        """Update embeddings for PDFs."""
        try:
            pdf_count = sum(1 for r in resources if r['format'] == 'pdf')
            if pdf_count > 0:
                print(f"   🔄 Updating embeddings for {pdf_count} PDF(s)...")
                new_embeddings = build_embeddings(force=False)
                if new_embeddings > 0:
                    print(f"   ✅ Created {new_embeddings} new embeddings")
        except Exception as e:
            print(f"   ⚠️  Embedding error: {e}")
    
    def stop(self):
        self.running = False


# ============================================
# THREAD-SAFE HTTP HANDLER
# ============================================

class ThreadedHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """Thread-safe HTTP handler with error isolation."""
    
    def handle_one_request(self):
        """Handle a single HTTP request with error isolation."""
        try:
            super().handle_one_request()
        except ConnectionResetError:
            pass  # Client disconnected - normal
        except BrokenPipeError:
            pass  # Client disconnected - normal
        except Exception as e:
            user_tracker.record_error()
            # Don't crash - isolate errors from other users
    
    def do_GET(self):
        """Handle GET requests with user tracking and rate limiting."""
        try:
            client_ip = self.client_address[0]
            
            # Rate limit check (skip for static assets)
            if not self.path.endswith(('.css', '.js', '.json', '.png', '.jpg', '.ico', '.woff', '.woff2')):
                if not user_tracker.check_rate_limit(client_ip):
                    self._send_error_response(429, "Too many requests. Please slow down.")
                    return
            
            user_agent = self.headers.get('User-Agent', '')
            user_tracker.record_activity(client_ip, user_agent, self.path)
            
            # Handle API endpoints
            if self.path == '/api/stats':
                self.handle_admin_stats()
                return
            
            if self.path == '/api/courses':
                self.handle_get_courses()
                return
            
            # Serve static files
            super().do_GET()
            
        except Exception as e:
            user_tracker.record_error()
            self._send_error_response(500, "Server error")
    
    def do_POST(self):
        """Handle POST requests with error isolation."""
        try:
            client_ip = self.client_address[0]
            user_agent = self.headers.get('User-Agent', '')
            user_tracker.record_activity(client_ip, user_agent, self.path)
            
            if self.path == '/upload':
                self.handle_upload()
            elif self.path == '/api/search':
                self.handle_semantic_search()
            elif self.path == '/api/heartbeat':
                self.handle_heartbeat()
            elif self.path == '/api/courses':
                self.handle_save_courses()
            else:
                self.send_error(404, "Not Found")
                
        except Exception as e:
            user_tracker.record_error()
            self._send_error_response(500, "Internal server error")
    
    def handle_admin_stats(self):
        """Return admin statistics."""
        try:
            stats = user_tracker.get_stats()
            self.send_json_response(200, stats)
        except Exception as e:
            self.send_json_response(500, {'error': str(e)})
    
    def handle_heartbeat(self):
        """Handle heartbeat for keeping session alive."""
        try:
            client_ip = self.client_address[0]
            user_tracker.record_activity(client_ip)
            self.send_json_response(200, {'status': 'ok', 'timestamp': time.time()})
        except Exception as e:
            self.send_json_response(500, {'error': str(e)})
    
    def handle_get_courses(self):
        """Return courses from server storage."""
        try:
            courses_file = SCRIPT_DIR / 'portal' / 'data' / 'courses.json'
            if courses_file.exists():
                with open(courses_file, 'r', encoding='utf-8') as f:
                    courses = json.load(f)
                self.send_json_response(200, {'success': True, 'courses': courses})
            else:
                self.send_json_response(200, {'success': True, 'courses': []})
        except Exception as e:
            self.send_json_response(500, {'error': str(e)})
    
    def handle_save_courses(self):
        """Save courses to server storage."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            courses = data.get('courses', [])
            
            courses_file = SCRIPT_DIR / 'portal' / 'data' / 'courses.json'
            courses_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(courses_file, 'w', encoding='utf-8') as f:
                json.dump(courses, f, indent=2, ensure_ascii=False)
            
            self.send_json_response(200, {'success': True, 'message': 'Courses saved'})
        except Exception as e:
            self.send_json_response(500, {'error': str(e)})
    
    def handle_semantic_search(self):
        """Handle semantic search API request."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            query = data.get('query', '').strip()
            top_k = data.get('top_k', 5)
            
            if not query:
                self.send_json_response(400, {'error': 'Query is required'})
                return
            
            if not EMBEDDINGS_AVAILABLE:
                self.send_json_response(503, {'error': 'Vector search not available'})
                return
            
            results = vector_store.search(query, top_k=top_k)
            
            self.send_json_response(200, {
                'success': True,
                'query': query,
                'results': results,
                'count': len(results)
            })
            
        except json.JSONDecodeError:
            self.send_json_response(400, {'error': 'Invalid JSON'})
        except Exception as e:
            self.send_json_response(500, {'error': 'Search failed'})
    
    def handle_upload(self):
        """Process file upload with error handling."""
        try:
            content_type = self.headers.get('Content-Type', '')
            
            if 'multipart/form-data' not in content_type:
                self.send_json_response(400, {'error': 'Invalid content type'})
                return
            
            boundary_part = content_type.split('boundary=')[1]
            if boundary_part.startswith('"'):
                boundary_part = boundary_part[1:].split('"')[0]
            boundary = boundary_part.encode()
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            parts = body.split(b'--' + boundary)
            
            file_data = None
            filename = None
            title = None
            category = None
            
            for part in parts:
                if b'Content-Disposition' not in part:
                    continue
                
                header_end = part.find(b'\r\n\r\n')
                if header_end == -1:
                    continue
                    
                header = part[:header_end].decode('utf-8', errors='ignore')
                content = part[header_end + 4:].rstrip(b'\r\n-')
                
                if 'name="file"' in header:
                    fn_match = re.search(r'filename="([^"]+)"', header)
                    if fn_match:
                        filename = fn_match.group(1)
                    file_data = content
                elif 'name="title"' in header:
                    title = content.decode('utf-8', errors='ignore').strip()
                elif 'name="category"' in header:
                    category = content.decode('utf-8', errors='ignore').strip()
            
            if not file_data or not filename or not title or not category:
                self.send_json_response(400, {'error': 'Missing required fields'})
                return
            
            if len(file_data) < 10:
                self.send_json_response(400, {'error': 'File appears empty'})
                return
            
            safe_title = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
            file_ext = filename.split('.')[-1].lower() if '.' in filename else 'pdf'
            new_filename = f"{safe_title}.{file_ext}"
            
            category_path = CONTENT_DIR / category
            category_path.mkdir(parents=True, exist_ok=True)
            
            file_path = category_path / new_filename
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            saved_size = file_path.stat().st_size
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"\n📤 [{timestamp}] File uploaded: {new_filename}")
            print(f"   Category: {category}, Size: {saved_size / 1024:.1f} KB")
            
            # Background processing for PDF
            if file_ext == 'pdf':
                threading.Thread(target=self._process_pdf, args=(file_path,), daemon=True).start()
            
            resources = scan_content_directory()
            save_metadata(resources)
            
            self.send_json_response(200, {
                'success': True,
                'message': 'File uploaded successfully',
                'filename': new_filename,
                'filepath': f'content/{category}/{new_filename}'
            })
            
        except Exception as e:
            self.send_json_response(500, {'error': 'Upload failed'})
    
    def _process_pdf(self, file_path):
        """Process PDF in background."""
        try:
            if COMPRESSOR_AVAILABLE:
                size_mb = file_path.stat().st_size / (1024 * 1024)
                if size_mb > 5:
                    compress_pdf(file_path)
            
            if EMBEDDINGS_AVAILABLE:
                build_embeddings(force=False)
        except Exception as e:
            print(f"⚠️  PDF processing error: {e}")
    
    def send_json_response(self, status, data):
        """Send JSON response."""
        try:
            response = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(response))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(response)
        except Exception:
            pass
    
    def _send_error_response(self, status, message):
        """Send error response safely."""
        try:
            self.send_json_response(status, {'error': message})
        except Exception:
            pass
    
    def end_headers(self):
        """Add caching headers for static files."""
        path = self.path.split('?')[0]
        
        # Cache static assets for 1 hour
        if path.endswith(('.css', '.js', '.woff', '.woff2', '.ttf')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        # Cache images for 1 day
        elif path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
            self.send_header('Cache-Control', 'public, max-age=86400')
        # Cache PDFs/videos for 1 hour
        elif path.endswith(('.pdf', '.mp4', '.webm')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        # Don't cache HTML and JSON (dynamic content)
        elif path.endswith(('.html', '.json')):
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format_str, *args):
        """Custom logging - reduced for performance."""
        try:
            if len(args) >= 1 and isinstance(args[0], str):
                request = args[0]
                # Skip logging static assets to reduce console output
                if any(ext in request for ext in ['.css', '.js', '.json', '.ico', '.png', '.jpg', '.woff']):
                    return
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"🌐 [{timestamp}] {request}")
        except (IndexError, TypeError):
            pass
    
    def log_error(self, format_str, *args):
        """Suppress standard error logging."""
        # Intentionally suppressed to avoid noisy logs
        _ = format_str, args


# ============================================
# THREADED TCP SERVER
# ============================================

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """Multi-threaded TCP server with error resilience."""
    
    allow_reuse_address = True
    daemon_threads = True
    
    def handle_error(self, request, client_address):
        """Handle errors without crashing the server."""
        user_tracker.record_error()
        # Don't print stack trace for client disconnections


# ============================================
# MAIN
# ============================================

def main():
    print("=" * 50)
    print("🚀 Ilmify - Multi-User Production Server")
    print("=" * 50)
    print(f"\n📂 Content folder: {CONTENT_DIR}")
    print(f"📄 Metadata file: {OUTPUT_FILE}")
    print()
    
    # Start file watcher
    watcher = FileWatcher()
    watcher.start()
    
    # Start session cleanup thread
    def cleanup_sessions():
        while True:
            time.sleep(60)
            user_tracker.cleanup_inactive()
    
    cleanup_thread = threading.Thread(target=cleanup_sessions, daemon=True)
    cleanup_thread.start()
    
    # Start HTTP server
    try:
        with ThreadedTCPServer((HOST, PORT), ThreadedHTTPHandler) as httpd:
            print("\n🌐 Server running at:")
            print(f"   • Local:   http://localhost:{PORT}")
            print(f"   • Network: http://<your-ip>:{PORT}")
            print()
            print("📱 To access from mobile devices on the same WiFi,")
            print("   use your computer's IP address")
            print()
            print("✨ Features enabled:")
            print("   • Multi-threaded (handles many users)")
            print("   • Error isolation (users isolated)")
            print("   • User tracking (admin dashboard)")
            print(f"   • PDF compression: {'✅' if COMPRESSOR_AVAILABLE else '❌'}")
            print(f"   • Vector search: {'✅' if EMBEDDINGS_AVAILABLE else '❌'}")
            print()
            print("📊 Admin stats API: GET /api/stats")
            print()
            print("Press Ctrl+C to stop the server")
            print("=" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down server...")
        watcher.stop()
        stats = user_tracker.get_stats()
        print(f"📊 Final stats: {stats['total_requests']} requests, {stats['total_unique_users']} unique users")
        print("✅ Server stopped. Goodbye!")
    except OSError as e:
        if "Address already in use" in str(e) or "10048" in str(e):
            print(f"\n❌ Port {PORT} is already in use!")
            print("   Try: Get-Process -Name python | Stop-Process -Force")
        else:
            raise


if __name__ == "__main__":
    main()
