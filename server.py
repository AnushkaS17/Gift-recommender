import http.server
import socketserver
import os
import re

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            # Read the HTML file and inject the API key
            try:
                with open('index.html', 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace the placeholder with the actual API key
                api_key = os.environ.get('OPENROUTER_API_KEY', '')
                content = content.replace('{{ OPENROUTER_API_KEY }}', api_key)
                
                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.send_header('Content-length', str(len(content.encode('utf-8'))))
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
                
            except Exception as e:
                self.send_error(500, f"Error reading index.html: {str(e)}")
        else:
            # For all other files, use the default handler
            super().do_GET()

if __name__ == "__main__":
    PORT = 5000
    
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}")
        httpd.serve_forever()