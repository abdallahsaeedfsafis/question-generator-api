<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Syne&weight=800&size=40&pause=1000&color=F97316&center=true&vCenter=true&width=600&lines=QuizForge+🔥;AI-Powered+Question+Generator" alt="QuizForge" />

<br/>

**Transform any lecture file into smart exam questions — instantly.**

<br/>

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Ollama](https://img.shields.io/badge/Ollama-Qwen2.5-FF6B35?style=for-the-badge)](https://ollama.ai)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](LICENSE)

</div>

---

## ✨ What is QuizForge?

**QuizForge** is an AI-powered exam question generator that takes your lecture files and automatically produces high-quality exam questions — supporting Arabic, English, and mixed-language content.

Built with a local LLM (no cloud, no API costs), it runs entirely on your machine with full privacy.

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 📄 **Multi-format Support** | PDF, DOCX, PPTX, TXT, and Images (PNG, JPG, TIFF…) |
| 🤖 **AI Question Generation** | Powered by Qwen 2.5 7B via Ollama |
| 🎯 **3 Question Types** | Multiple Choice, True/False, and Essay with model answers |
| 🌍 **Bilingual** | Auto-detects Arabic, English, or mixed content |
| 🔢 **Custom Count** | Choose how many questions per type (0–10) |
| 🕒 **History** | Saves your last 20 sessions locally |
| 🔒 **Secure** | File validation, rate limiting, auto-delete after processing |
| 🌙 **Dark / Light Mode** | Full theme support |
| 📥 **Export** | Download questions as `.txt` |

---

## 🏗️ Architecture

```
QuizForge/
│
├── core/
│   ├── text_extractor.py       # Extracts text from files (OCR + direct)
│   └── question_generator.py   # Generates questions via Ollama
│
├── api/
│   ├── api_main.py             # FastAPI server
│   ├── config.py               # Environment configuration
│   ├── file_validator.py       # Security: Magic Bytes, size, path checks
│   └── rate_limiter.py         # IP-based rate limiting
│
├── frontend/
│   └── src/
│       └── App.jsx             # React single-page application
│
├── .env                        # Environment variables
└── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Link |
|------|---------|------|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Ollama | Latest | [ollama.ai](https://ollama.ai) |
| Tesseract OCR | Latest | [GitHub](https://github.com/UB-Mannheim/tesseract/wiki) |
| Poppler | Latest | [GitHub](https://github.com/oschwartz10612/poppler-windows/releases) |

---

### 1️⃣ Clone the repository

```bash
git clone https://github.com/GraduationGroup101/question-generator-ai.git
cd question-generator-ai
```

### 2️⃣ Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Configure environment

Edit `.env` and set your paths:

```env
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\Library\bin
```

### 4️⃣ Pull the AI model

```bash
ollama pull qwen2.5:7b-instruct
ollama run qwen2.5:7b-instruct
```

### 5️⃣ Start the API server

```bash
cd api
python api_main.py
```

> API runs on `http://127.0.0.1:8000`

### 6️⃣ Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs on `http://localhost:5173`

---

## 🔒 Security Features

- **Path Traversal Protection** — rejects filenames like `../../etc/passwd`
- **Magic Bytes Validation** — verifies actual file content, not just extension
- **File Size Limit** — configurable max (default 20MB)
- **Rate Limiting** — max 10 requests/minute per IP
- **Auto-Delete** — uploaded files are deleted immediately after processing
- **CORS** — restricted to localhost only

---

## 📸 Screenshots

> *Upload a lecture file → choose question counts → get AI-generated questions instantly*

| Dark Mode | Light Mode |
|-----------|------------|
| MCQ with correct answer highlighted | Same UI, light theme |
| True/False with answer badge | History panel with past sessions |

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com) — High-performance Python API
- [Ollama](https://ollama.ai) + [Qwen 2.5 7B](https://ollama.ai/library/qwen2.5) — Local LLM
- [pdfplumber](https://github.com/jsvine/pdfplumber) — PDF text extraction
- [pytesseract](https://github.com/madmaze/pytesseract) — OCR engine
- [python-docx](https://python-docx.readthedocs.io) / [python-pptx](https://python-pptx.readthedocs.io) — Office files

**Frontend**
- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- CSS Variables for theming
- localStorage for session history

---

## 👥 Team

<div align="center">

| Member | Role |
|--------|------|
| Abdallah | Full Stack Developer & AI Integration |

*Computer Engineering — Graduation Project 2026*

</div>

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute.

---

<div align="center">

Made with ❤️ by **GraduationGroup101**

⭐ Star this repo if you found it useful!

</div>