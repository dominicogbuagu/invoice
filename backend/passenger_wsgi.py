"""
Namecheap/cPanel Passenger WSGI entry point for Realtouch Invoice.

The main backend app is FastAPI/ASGI in server.py. Some cPanel Python App
setups expect a WSGI callable named `application`, so this adapter wraps the
FastAPI app for Passenger-compatible hosting.
"""

import os
import sys

# Ensure the backend directory is importable when Passenger starts the app.
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from a2wsgi import ASGIMiddleware
from server import app as fastapi_app

application = ASGIMiddleware(fastapi_app)
