"""
file_validator.py
طبقة حماية الملفات المرفوعة:
1. حماية من Path Traversal
2. فحص الامتداد
3. فحص الحجم
4. فحص Magic Bytes يدوياً بدون مكتبات خارجية
"""

import os
from fastapi import UploadFile, HTTPException
from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES


# ===================== MAGIC BYTES =====================
# أول bytes لكل نوع ملف — بنقارن فيها عشان نتأكد من النوع الفعلي
# مش من الامتداد بس
MAGIC_SIGNATURES = {
    # PDF: يبدأ بـ %PDF
    b"%PDF":                                          "pdf",

    # DOCX / PPTX: ملفات ZIP في الأساس (Office Open XML)
    b"PK\x03\x04":                                   "zip_office",

    # PNG
    b"\x89PNG\r\n\x1a\n":                            "png",

    # JPEG
    b"\xff\xd8\xff":                                  "jpeg",

    # BMP
    b"BM":                                            "bmp",

    # TIFF (little-endian)
    b"II*\x00":                                       "tiff",

    # TIFF (big-endian)
    b"MM\x00*":                                       "tiff",
}

# ربط الامتداد بالنوع المتوقع من Magic Bytes
EXTENSION_TO_MAGIC = {
    ".pdf":  {"pdf"},
    ".docx": {"zip_office"},
    ".pptx": {"zip_office"},
    ".txt":  {"text"},           # txt ما عنده magic bytes ثابتة
    ".png":  {"png"},
    ".jpg":  {"jpeg"},
    ".jpeg": {"jpeg"},
    ".bmp":  {"bmp"},
    ".tiff": {"tiff"},
}


def detect_file_type(content: bytes) -> str:
    """
    بتكشف نوع الملف من أول bytes فيه
    بترجع: "pdf" / "zip_office" / "png" / "jpeg" / "bmp" / "tiff" / "text" / "unknown"
    """
    # نجرب كل signature
    for signature, file_type in MAGIC_SIGNATURES.items():
        if content.startswith(signature):
            return file_type

    # txt: لو محتواه كله نص مقروء → text
    try:
        sample = content[:1024]
        sample.decode("utf-8")
        return "text"
    except UnicodeDecodeError:
        pass

    # utf-8-sig (BOM)
    try:
        sample = content[:1024]
        sample.decode("utf-8-sig")
        return "text"
    except UnicodeDecodeError:
        pass

    return "unknown"


def validate_magic_vs_extension(detected: str, ext: str) -> bool:
    """
    بتتأكد إن نوع الملف الفعلي يطابق الامتداد
    بترجع True لو متطابقين
    """
    expected_types = EXTENSION_TO_MAGIC.get(ext, set())
    return detected in expected_types


# ===================== MAIN VALIDATOR =====================

async def validate_file(file: UploadFile) -> bytes:
    """
    بتتحقق من الملف المرفوع وبترجع محتواه كـ bytes
    لو في أي مشكلة بترمي HTTPException بكود ورسالة واضحة

    الفحوصات بالترتيب:
    1. Path Traversal
    2. الامتداد مسموح
    3. الحجم ما تجاوز الحد
    4. Magic Bytes تطابق الامتداد
    """

    # ── 1. Path Traversal ─────────────────────────────────
    # مهاجم ممكن يرفع ملف باسم "../../etc/passwd"
    filename  = file.filename or ""
    safe_name = os.path.basename(filename)

    if (
        not safe_name
        or safe_name != filename
        or ".." in filename
        or "/" in filename
        or "\\" in filename
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid file name."
        )

    # ── 2. فحص الامتداد ───────────────────────────────────
    ext = os.path.splitext(safe_name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # ── 3. قراءة المحتوى وفحص الحجم ──────────────────────
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        size_mb = len(content) / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
        )

    # ── 4. Magic Bytes ────────────────────────────────────
    # بنتحقق إن محتوى الملف الفعلي يطابق امتداده
    detected = detect_file_type(content)

    if not validate_magic_vs_extension(detected, ext):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match its extension '{ext}'. Possible security issue."
        )

    return content
