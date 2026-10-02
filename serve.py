#!/usr/bin/env python3
"""Yerel oyun sunucusu: python3 serve.py [--port 8790]. Ctrl+C ile kapanır."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
import sys


def main():
    # Windows'un eski konsol kodlamasında Türkçe mesajlar da güvenle yazılır.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8790)
    parser.add_argument("--bind", default="0.0.0.0")
    options = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer((options.bind, options.port), handler) as server:
        print(f"Bilgisayarda: http://localhost:{options.port}/", flush=True)
        try:
            if options.bind not in ("127.0.0.1", "localhost", "::1"):
                print(f"Aynı ağdaki iPad'de: http://{socket.gethostbyname(socket.gethostname())}:{options.port}/", flush=True)
        except OSError:
            pass
        print("Durdurmak için Ctrl+C.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nOyun sunucusu kapandı.")


if __name__ == "__main__":
    main()
