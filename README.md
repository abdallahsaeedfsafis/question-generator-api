# QuizForge

**Automated Academic Question Generation from Lecture Files**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Groq](https://img.shields.io/badge/Groq-API-FF6B35?style=for-the-badge)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-6D28D9?style=for-the-badge)](LICENSE)

---

## Overview

QuizForge is an AI-powered question generation module developed as part of the EduFusion AI graduation project. It falls under the domain of **Natural Language Processing (NLP)**, specifically **Automated Question Generation (AQG)**.

The system accepts academic lecture files in multiple formats and automatically produces diverse, high-quality exam questions — reducing the manual effort required by instructors and enabling students to self-assess their understanding of lecture material.

Questions are generated using the **Groq API**, a high-speed cloud inference engine, and are fully self-contained with no reference to the source document. The system supports both **Arabic and English** content with automatic language detection.

---

## Features

| Feature | Description |
|---------|-------------|
| Multi-format input | PDF, DOCX, PPTX, TXT, PNG, JPG, BMP, TIFF |
| Three question types | Multiple Choice (MCQ), True/False, Essay with model answers |
| Bilingual support | Automatic Arabic and English detection |
| Configurable output | User-defined question count per type (0–10) |
| Security pipeline | Magic-byte validation, size limits, path traversal protection |
| Rate limiting | 10 requests per minute per IP address |
| Auto-cleanup | Uploaded files deleted immediately after processing |
| Session history | Last 20 sessions stored locally in the browser |
| Theme support | Dark and Light modes with RTL rendering for Arabic |

---

## System Architecture

QuizForge follows a layered pipeline architecture composed of three main layers.

### Security and Extraction Layer

Files are validated through a three-stage security check before any processing begins. The extension is first matched against an allowlist of supported formats. The file size is then checked against a configurable maximum of 20 MB. Finally, the binary content is inspected using a magic-byte matching algorithm that compares the file header against known signatures for each supported format — preventing malicious files disguised with legitimate extensions from entering the pipeline.

Text extraction routes each file to the appropriate extractor based on its validated type. Digital documents use direct extraction via `pdfplumber` and `python-docx`. Scanned content is processed using `Tesseract OCR` on rendered page images. PowerPoint files are handled by `python-pptx` with OCR applied to embedded images. When both extraction methods produce output for the same page, a similarity-based deduplication algorithm using `SequenceMatcher` at a threshold of 0.85 merges the results and removes near-duplicate lines.

A normalization module then processes the extracted text line by line, filtering administrative content such as instructor names, course syllabi, grading breakdowns, and office hours using curated pattern lists for both Arabic and English. Lines where fewer than 60% of characters are readable are treated as OCR noise and discarded.

### AI Generation Layer

The cleaned text is passed to the **Groq API** for question generation. Three separate API calls are made — one per question type — each using a dedicated prompt builder that includes a shared constraint set called `SHARED_RULES`. This prompt instructs the model to generate questions exclusively from the provided content, without referencing the source material using phrases such as "according to the text" or the Arabic equivalent. A post-processing step using regular expressions removes any forbidden phrases that appear in the model output despite the prompt constraints.

Language is detected automatically by counting Arabic Unicode characters against English alphabetic characters. The result determines the language instruction injected into each prompt.

All Groq API calls are executed asynchronously using `asyncio` and `run_in_executor` to prevent blocking the main server event loop.

### Frontend Layer

The React 18 frontend provides a drag-and-drop upload interface, interactive question count controls, and a real-time progress bar with descriptive stage labels. Generated questions are displayed in structured cards organized by type, with correct MCQ answers highlighted and True/False answers labeled. Each section includes clipboard copy and text download options.

Arabic content is rendered right-to-left automatically using the `dir="auto"` attribute on all question text elements. A history panel built on `localStorage` preserves the last 20 generation sessions with filename, question counts, and date.

---

## Project Structure

```
QuizForge/
│
├── core/
│   ├── text_extractor.py       # File routing, OCR, deduplication
│   └── question_generator.py   # Groq API calls, prompts, post-processing
│
├── api/
│   ├── api_main.py             # FastAPI application and endpoint
│   ├── config.py               # Environment variable management
│   ├── file_validator.py       # Magic-byte inspection and validation
│   └── rate_limiter.py         # Sliding-window IP rate limiter
│
├── frontend/
│   └── src/
│       └── App.jsx             # React single-page application
│
├── .env                        # Environment configuration
├── requirements.txt            # Python dependencies
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| Tesseract OCR | 5.x | Required for image and scanned PDF support |
| Poppler | Latest | Required for PDF-to-image conversion |
| Groq API key | — | Free tier available at groq.com |

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/GraduationGroup101/question-generator-ai.git
cd question-generator-ai
```

**2. Install Python dependencies**

```bash
pip install -r requirements.txt
```

**3. Configure environment variables**

Create a `.env` file in the root directory:

```env
HOST=127.0.0.1
PORT=8000
GROQ_API_KEY=your_groq_api_key_here
MAX_FILE_SIZE_MB=20
ALLOWED_EXTENSIONS=.pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.bmp,.tiff
UPLOAD_DIR=uploads
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**4. Start the API server**

```bash
cd api
python api_main.py
```

The API will be available at `http://127.0.0.1:8000`.  
Interactive documentation is available at `http://127.0.0.1:8000/docs`.

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

The interface will be available at `http://localhost:5173`.

---

## API Reference

### POST /generate

Accepts a multipart form request and returns generated questions.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file` | File | required | Lecture file to process |
| `num_mcq` | Integer | 5 | Number of Multiple Choice questions (0–10) |
| `num_tf` | Integer | 2 | Number of True/False questions (0–10) |
| `num_essay` | Integer | 2 | Number of Essay questions (0–10) |

**Response**

```json
{
  "success": true,
  "questions": "[ Multiple Choice Questions ]\n\nQ1: ...",
  "filename": "lecture.pdf",
  "message": "Questions generated successfully."
}
```

**Error codes**

| Code | Meaning |
|------|---------|
| 400 | Invalid file name, type, or content mismatch |
| 413 | File exceeds size limit |
| 422 | No readable text found in file |
| 429 | Rate limit exceeded |
| 500 | Question generation failed |

---

## Security

- **Path traversal protection** — filenames are sanitized using `os.path.basename`
- **Extension allowlist** — only supported formats are accepted
- **File size limit** — configurable maximum, default 20 MB
- **Magic-byte validation** — binary header verified against known signatures
- **Rate limiting** — sliding-window algorithm, 10 requests per minute per IP
- **Auto-deletion** — uploaded files removed immediately after processing
- **CORS restriction** — only configured origins are accepted
- **Trusted host middleware** — host header injection prevented

---

## AI Classification

QuizForge falls under the following AI domains:

- **Natural Language Processing (NLP)**
- **Automated Question Generation (AQG)**
- **Document AI** — multi-format text extraction
- **Generative AI** — LLM-based content generation
- **Prompt Engineering** — structured constraint-based prompting
- **OCR** — optical character recognition for scanned content

---

## Tech Stack

**Backend** — Python, FastAPI, Uvicorn, pdfplumber, pdf2image, pytesseract, python-docx, python-pptx, Pillow, Groq API

**Frontend** — React 18, Vite, localStorage

**External services** — Groq API (LLM inference), Tesseract OCR, Poppler

---

## Team

Developed by **GraduationGroup101** as a graduation project in Computer Engineering, 2026.

---

## License

This project is licensed under the MIT License.
