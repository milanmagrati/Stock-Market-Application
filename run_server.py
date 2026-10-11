import sys
import asyncio
import selectors
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.main import app

def main():
    if sys.platform == "win32":
        # Force SelectorEventLoop for psycopg async on Windows
        loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
        asyncio.set_event_loop(loop)
        config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="info")
        server = uvicorn.Server(config)
        try:
            loop.run_until_complete(server.serve())
        finally:
            loop.close()
    else:
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000)

if __name__ == "__main__":
    main()
