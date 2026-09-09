# 📚 AI Question Generator

An intelligent system that automatically generates academic exam questions from any educational text using AI. Supports Arabic, English, and mixed-language content.

---

## ✨ Features

- 🧠 **AI-Powered** — Uses Groq API (Llama 4) to generate high-quality questions
- 🌍 **Multilingual** — Auto-detects Arabic, English, or mixed content and responds accordingly
- 💻 **Code-Aware** — Detects programming content and generates relevant code-based questions
- 🧹 **Smart Cleaning** — Filters out administrative metadata (instructor names, grade tables, syllabus info) before generation
- 🚫 **No Source Leaking** — Ensures questions are fully standalone with no phrases like *"according to the text"* or *"وفقاً للمحتوى"*
- 📦 **Chunking Support** — Handles long documents by splitting them into processable chunks

---

## 📝 Question Types

| Type | Description |
|---|---|
| **Multiple Choice (MCQ)** | 4 options (A/B/C/D) with one correct answer |
| **True / False** | Factual statements with correct answer |
| **Essay** | Open-ended questions with a 3–5 sentence model answer |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-question-generator.git
cd ai-question-generator
```

### 2. Install dependencies

```bash
pip install requests
```

### 3. Set your Groq API key

Get a free API key from [console.groq.com](https://console.groq.com), then set it as an environment variable:

```bash
# Linux / macOS
export GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxx"

# Windows
set GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxx
```

### 4. Use it in your code

```python
from question_generator import generate_all_questions

text = """
Your educational content goes here.
Can be a lecture, textbook excerpt, or any study material.
"""

result = generate_all_questions(
    text,
    num_mcq=5,     # Number of MCQ questions
    num_tf=3,      # Number of True/False questions
    num_essay=2    # Number of Essay questions
)

print(result)
```

---

## ⚙️ Configuration

Edit the following constants at the top of `question_generator.py`:

```python
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")   # Set via environment variable
MODEL        = "meta-llama/llama-4-scout-17b-16e-instruct"  # Groq model to use
```

### Available Groq Models

| Model | Best For |
|---|---|
| `meta-llama/llama-4-scout-17b-16e-instruct` | Best quality, great Arabic support (default) |
| `llama-3.3-70b-versatile` | Higher accuracy, slightly slower |
| `llama-3.1-8b-instant` | Fastest response, lower accuracy |

---

## 🗂️ Project Structure

```
ai-question-generator/
│
├── question_generator.py   # Core logic (detection, cleaning, generation)
└── README.md
```

---

## 🌐 Deploying to Render

1. Push your code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Add your environment variable:
   ```
   GROQ_API_KEY = gsk_xxxxxxxxxxxxxxxxxx
   ```
4. No local AI model needed — Groq runs in the cloud ☁️

---

## 📖 Example Output

```
[ Multiple Choice Questions ]

Q1: What is the primary purpose of an operating system?
A) Managing hardware resources
B) Browsing the internet
C) Compiling source code
D) Designing user interfaces
Answer: A

──────────────────────────────────────────────────

[ True / False Questions ]

Q1: The CPU executes instructions stored in RAM.
Answer: True

──────────────────────────────────────────────────

[ Essay Questions ]

Q1: Explain the difference between process and thread.
Model Answer: A process is an independent program in execution with its own memory space...
```

---

## 🛠️ How It Works

```
Input Text
    │
    ▼
┌─────────────────┐
│  Text Cleaner   │  Remove OCR noise & academic metadata
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Language + Type │  Detect: Arabic / English / Code
│    Detector     │
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│  Text Chunker   │  Split long documents into chunks
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│   Groq API      │  Generate MCQ / True-False / Essay
│  (Llama 4)      │
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Post-Processor  │  Remove forbidden source-reference phrases
└────────┬────────┘
         │
    ▼
  Output Questions
```

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙌 Contributing

Pull requests are welcome! If you find a bug or have a feature request, feel free to open an issue.
