"""
Range-capable HTTP server for local development.
Supports HTTP 206 Partial Content so browsers can seek/scrub video files.

Usage:  python serve.py [port]
"""

import sys
import os
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7890


class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler extended with HTTP Range (206) support."""

    def send_head(self):
        path = self.translate_path(self.path)
        # Fall back to parent for directories / non-files
        if os.path.isdir(path):
            return super().send_head()

        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        file_size = os.path.getsize(path)
        range_header = self.headers.get('Range')

        if range_header:
            # Parse "bytes=start-end", "bytes=start-", or "bytes=-suffix"
            try:
                byte_range = range_header.strip().replace('bytes=', '')
                # Only handle the first range (ignore multi-range requests)
                byte_range = byte_range.split(',')[0].strip()
                parts = byte_range.split('-')

                if parts[0] == '':
                    # Suffix range: bytes=-N  →  last N bytes
                    suffix = int(parts[1])
                    start = max(0, file_size - suffix)
                    end = file_size - 1
                elif parts[1] == '':
                    # Open-ended range: bytes=N-
                    start = int(parts[0])
                    end = file_size - 1
                else:
                    start = int(parts[0])
                    end = int(parts[1])
            except (ValueError, IndexError):
                self.send_error(400, "Invalid Range header")
                f.close()
                return None


            end = min(end, file_size - 1)
            content_length = end - start + 1

            self.send_response(206)
            self.send_header('Content-type', self.guess_type(path))
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(content_length))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            f.seek(start)
            remaining = content_length
            while remaining:
                chunk = min(remaining, 65536)
                data = f.read(chunk)
                if not data:
                    break
                self.wfile.write(data)
                remaining -= len(data)
            f.close()
            return None  # Already sent response
        else:
            # Normal full-file response, but advertise Range support
            self.send_response(200)
            self.send_header('Content-type', self.guess_type(path))
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            return f

    def log_message(self, fmt, *args):
        # Quieter logs — suppress 206 spam from video scrubbing
        if args and '206' in str(args[1]):
            return
        super().log_message(fmt, *args)


with socketserver.TCPServer(("", PORT), RangeRequestHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f"[OK] Serving with Range support at http://localhost:{PORT}")
    print(f"     Directory: {os.getcwd()}")
    print(f"     Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
