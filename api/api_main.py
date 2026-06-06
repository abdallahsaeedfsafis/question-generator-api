"""
api_main.py  ←  ضعه باسم main.py داخل مجلد api/
FastAPI application الرئيسي
"""

import os
import uuid
import asyncio
from contextlib import asynccontextmanager
from functools import partial

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel

from .config import ALLOWED_ORIGINS, UPLOAD_DIR
from .file_validator import validate_file
from .rate_limiter import rate_limit_middleware, limiter

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from core.text_extractor import extract_text
from core.question_generator import generate_all_questions


# ===================== LIFESPAN =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"Upload directory ready: {UPLOAD_DIR}")
    yield
    limiter.cleanup()
    print("Server shutting down — cleanup done.")


# ===================== APP =====================

app = FastAPI(
    title="Question Generator API",
    description="API لتوليد أسئلة من ملفات المحاضرات",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)


# ===================== MIDDLEWARE =====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # يسمح للفرونت إند الخارجي بالاتصال بالباك إند أونلاين
    allow_credentials=True,
    allow_methods=["POST", "GET"],           # يسمح بجميع الطرق بما فيها OPTIONS و POST و GET
    allow_headers=["*"],           # يسمح بجميع الـ Headers المرسلة من المتصفح
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "question-generator-api-pol9.onrender.com"
    ],
)


# ===================== MODELS =====================

class GenerateResponse(BaseModel):
    success:   bool
    questions: str
    filename:  str
    message:   str = ""


class HealthResponse(BaseModel):
    status:  str
    version: str


# ===================== ROUTES =====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.post(
    "/generate",
    response_model=GenerateResponse,
    dependencies=[Depends(rate_limit_middleware)],
    summary="رفع ملف وتوليد أسئلة",
)
async def generate(
    file:      UploadFile = File(...),
    num_mcq:   int = Form(5),   # ← عدد أسئلة الاختيار المتعدد  (default 5)
    num_tf:    int = Form(2),   # ← عدد أسئلة الصح والخطأ        (default 2)
    num_essay: int = Form(2),   # ← عدد الأسئلة المقالية         (default 2)
):
    """
    الـ endpoint الرئيسي:
    1. استقبال الملف + عدد الأسئلة لكل نوع
    2. التحقق من الأمان
    3. استخراج النص → توليد الأسئلة → مسح الملف
    4. إرجاع الأسئلة
    """

    # ── التحقق من القيم ───────────────────────────────────
    num_mcq   = max(0, min(10, num_mcq))
    num_tf    = max(0, min(10, num_tf))
    num_essay = max(0, min(10, num_essay))

    if num_mcq + num_tf + num_essay == 0:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one question type."
        )

    # ── فحص الملف ─────────────────────────────────────────
    content = await validate_file(file)

    # ── حفظ مؤقت ──────────────────────────────────────────
    ext       = os.path.splitext(file.filename)[1].lower()
    temp_name = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_name)

    try:
        with open(temp_path, "wb") as f:
            f.write(content)

        # ── استخراج النص ──────────────────────────────────
        try:
            extracted = await asyncio.get_event_loop().run_in_executor(
                None, extract_text, temp_path
            )
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract text from file: {str(e)}"
            )

        if not extracted.strip():
            raise HTTPException(
                status_code=422,
                detail="No readable text found in the file."
            )

        # ── توليد الأسئلة ─────────────────────────────────
        # بنمرر الأعداد لـ generate_all_questions
        try:
            fn = partial(generate_all_questions, extracted,
                         num_mcq=num_mcq, num_tf=num_tf, num_essay=num_essay)
            questions = await asyncio.get_event_loop().run_in_executor(None, fn)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Question generation failed: {str(e)}"
            )

        if not questions.strip():
            raise HTTPException(
                status_code=500,
                detail="No questions were generated. Try a different file."
            )

        return GenerateResponse(
            success=True,
            questions=questions,
            filename=file.filename,
            message="Questions generated successfully."
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"Temp file deleted: {temp_name}")


# ===================== RUN =====================

if __name__ == "__main__":
    import uvicorn
    from .config import HOST, PORT

    uvicorn.run(
        "api_main:app",
        host=HOST,
        port=PORT,
        reload=True,
    )