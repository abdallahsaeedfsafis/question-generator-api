"""
config.py
بيقرأ كل الإعدادات من ملف .env
مكان واحد لكل الإعدادات عشان ما نكرر القيم بكل ملف
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Server ────────────────────────────────────────────────
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))

# ── Ollama ────────────────────────────────────────────────
OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")

# ── File Upload ───────────────────────────────────────────
MAX_FILE_SIZE_MB   = int(os.getenv("MAX_FILE_SIZE_MB", 20))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS = set(
    os.getenv("ALLOWED_EXTENSIONS", ".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.bmp,.tiff").split(",")
)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# ── Rate Limiting ─────────────────────────────────────────
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", 10))
RATE_LIMIT_WINDOW   = int(os.getenv("RATE_LIMIT_WINDOW",   60))

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")
