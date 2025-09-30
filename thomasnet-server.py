#!/usr/bin/env python3
"""
Thomasnet Scraper Web Server
This server provides an HTTP API to run the Thomasnet scraper
"""

import json
import sys
import os
import subprocess
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

class ThomasnetHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/scrape':
            self.handle_scrape()
        else:
            self.send_error(404, "Not Found")

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_error(404, "Not Found")

    def handle_scrape(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Extract parameters
            state = data.get('state', 'California')
            service = data.get('service', 'CNC Machining')
            sort_order = data.get('sort_order', 'Ascending')
            max_results = data.get('max_results', 100)
            delay = data.get('delay', 2)
            
            print(f"Scraping request: {state}, {service}, {sort_order}, {max_results}")
            
            # Run the scraper
            prospects = self.run_scraper(state, service, sort_order, max_results, delay)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(prospects).encode())
            
        except Exception as e:
            print(f"Error handling scrape request: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode())

    def run_scraper(self, state, service, sort_order, max_results, delay):
        """Run the actual Thomasnet scraper"""
        try:
            # Get the path to the command-line scraper
            scraper_path = Path(__file__).parent / "thomasnet-scraper" / "run_scraper.py"
            
            if not scraper_path.exists():
                return {"error": "Thomasnet scraper not found"}
            
            # Run the actual scraper
            import subprocess
            import json
            
            cmd = [
                "python3",
                str(scraper_path),
                state,
                service,
                sort_order,
                str(max_results)
            ]
            
            print(f"Running scraper command: {' '.join(cmd)}")
            print(f"Working directory: {scraper_path.parent}")
            
            result = subprocess.run(
                cmd, 
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True, 
                cwd=str(scraper_path.parent),
                timeout=300  # 5 minute timeout
            )
            
            print(f"Scraper return code: {result.returncode}")
            print(f"Scraper stdout: {result.stdout[:500]}...")
            print(f"Scraper stderr: {result.stderr}")
            
            if result.returncode != 0:
                return {"error": f"Scraper failed: {result.stderr}"}
            
            # Parse the JSON output
            try:
                if not result.stdout.strip():
                    return {"error": "Scraper returned empty output"}
                    
                prospects = json.loads(result.stdout)
                if isinstance(prospects, list):
                    return prospects
                else:
                    return {"error": "Invalid scraper output format"}
            except json.JSONDecodeError as e:
                return {"error": f"Failed to parse scraper output: {e}. Output: {result.stdout[:200]}"}
            
        except subprocess.TimeoutExpired:
            return {"error": "Scraper timed out after 5 minutes"}
        except Exception as e:
            return {"error": f"Scraper failed: {str(e)}"}


    def log_message(self, format, *args):
        # Suppress default logging
        pass

def run_server(port=8080):
    """Start the Thomasnet scraper server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, ThomasnetHandler)
    print(f"Thomasnet scraper server running on port {port}")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Scrape endpoint: http://localhost:{port}/scrape")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)
