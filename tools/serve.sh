#!/usr/bin/env bash
# Tiny static dev server (any static host works; file:// also works but cannot load external audio). http://localhost:8000/
cd "$(dirname "$0")/.." && python3 -m http.server "${1:-8000}"
