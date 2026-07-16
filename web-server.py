import http.server
import socketserver
import mimetypes
import sys

PORT = 3000
DIRECTORY = "zando-web"

# Fix Windows registry MIME type association bug for JS modules/CSS
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Optional: log to stdout for debugging
        sys.stdout.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

if __name__ == "__main__":
    # Allow port override from command line arguments
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
            
    print(f"Starting ZANDO Web App Server on port {port}...")
    print(f"Serving directory: {DIRECTORY}")
    
    # Enable reuse address to avoid 'Address already in use' errors on quick restarts
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
            print("Server successfully started! Keep this window open.")
            print(f"Access the app at: http://127.0.0.1:{port}")
            httpd.serve_forever()
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")
        input("Press Enter to exit...")
