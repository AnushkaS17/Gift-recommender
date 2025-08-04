#!/usr/bin/env python3
import os
import re
import http.server
import socketserver

def inject_api_key():
    """Inject the API key from environment into script.js"""
    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    
    if not api_key:
        print("Warning: OPENROUTER_API_KEY environment variable not found")
        return
    
    # Read script.js
    with open('script.js', 'r') as f:
        content = f.read()
    
    # Replace the placeholder with the actual API key
    updated_content = content.replace('your-api-key-placeholder', api_key)
    
    # Write back to script.js
    with open('script.js', 'w') as f:
        f.write(updated_content)
    
    print(f"API key injected into script.js")

def start_server():
    """Start the HTTP server"""
    PORT = 3000
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory='.', **kwargs)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    inject_api_key()
    start_server()