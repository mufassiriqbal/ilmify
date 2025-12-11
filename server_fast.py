#!/usr/bin/env python3
"""
Ilmify - Fast Lightweight Server
Optimized for speed and multiple device access
"""

import http.server
import socketserver
import threading
import json
from pathlib import Path
from datetime import datetime

# Configuration
PORT = 8080
HOST = "0.0.0.0"

SCRIPT_DIR = Path(__file__).parent.resolve()

class FastHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """Fast HTTP handler - minimal overhead."""
    
    protocol_version = "HTTP/1.0"  # Use HTTP/1.0 to avoid keep-alive issues
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPT_DIR), **kwargs)
    
    def handle(self):
        """Override to catch connection errors."""
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError, Exception):
            pass  # Ignore all connection errors
    
    def handle_one_request(self):
        """Handle a single HTTP request with better error handling."""
        try:
            super().handle_one_request()
        except Exception:
            pass  # Silently ignore malformed requests
    
    def do_GET(self):
        """Handle GET requests."""
        # Simple API endpoints
        if self.path == '/api/stats':
            self.send_json({'active_users': 1, 'total_unique_users': 1})
            return
        
        if self.path == '/api/courses':
            self.handle_get_courses()
            return
        
        # Serve static files
        super().do_GET()
    
    def do_POST(self):
        """Handle POST requests."""
        if self.path == '/api/heartbeat':
            self.send_json({'status': 'ok'})
            return
        
        if self.path == '/api/courses':
            self.handle_save_courses()
            return
        
        self.send_error(404)
    
    def do_OPTIONS(self):
        """Handle CORS."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def handle_get_courses(self):
        """Return courses."""
        try:
            courses_file = SCRIPT_DIR / 'portal' / 'data' / 'courses.json'
            if courses_file.exists():
                with open(courses_file, 'r', encoding='utf-8') as f:
                    courses = json.load(f)
                self.send_json({'success': True, 'courses': courses})
            else:
                self.send_json({'success': True, 'courses': []})
        except:
            self.send_json({'success': True, 'courses': []})
    
    def handle_save_courses(self):
        """Save courses."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            courses = data.get('courses', [])
            
            courses_file = SCRIPT_DIR / 'portal' / 'data' / 'courses.json'
            courses_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(courses_file, 'w', encoding='utf-8') as f:
                json.dump(courses, f, indent=2)
            
            self.send_json({'success': True})
        except:
            self.send_json({'error': 'Failed'}, 500)
    
    def send_json(self, data, status=200):
        """Send JSON response."""
        try:
            response = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(response))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(response)
        except Exception:
            pass  # Ignore write errors
    
    def end_headers(self):
        """Add caching headers."""
        path = self.path.split('?')[0]
        if path.endswith(('.css', '.js')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        elif path.endswith(('.png', '.jpg', '.ico')):
            self.send_header('Cache-Control', 'public, max-age=86400')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Minimal logging."""
        pass  # Disable logging for speed


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """Multi-threaded server."""
    allow_reuse_address = True
    daemon_threads = True
    
    def handle_error(self, request, client_address):
        """Silently ignore connection errors."""
        pass  # Don't print exceptions


def main():
    print("=" * 50)
    print("🚀 Ilmify - Fast Server")
    print("=" * 50)
    print(f"\n🌐 http://localhost:{PORT}")
    print(f"📱 Access from other devices on same WiFi")
    print("\nPress Ctrl+C to stop")
    print("=" * 50)
    
    try:
        with ThreadedServer((HOST, PORT), FastHTTPHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except OSError as e:
        if "10048" in str(e) or "address already in use" in str(e).lower():
            print(f"❌ Port {PORT} in use! Run: Get-Process python | Stop-Process -Force")
        else:
            raise


if __name__ == "__main__":
    main()
