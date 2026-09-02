import os
import shutil
import pytesseract
import pdfplumber
try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None
try:
    from pdf2image import convert_from_path
except Exception:
    convert_from_path = None
from PIL import Image
from docx import Document
import zipfile
import tempfile
from pptx import Presentation
from difflib import SequenceMatcher


# ===================== CONFIG =====================

TESSERACT_CANDIDATES = [
    os.environ.get("TESSERACT_PATH"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]

for candidate in TESSERACT_CANDIDATES:
    if candidate and os.path.exists(candidate):
        pytesseract.pytesseract.tesseract_cmd = candidate
        break
else:
    tesseract_cmd = shutil.which("tesseract")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

POPPLER_PATH = os.environ.get("POPPLER_PATH") or r"C:\poppler\Library\bin"

DEFAULT_LANG = "ara+eng"  # يدعم العربي والإنجليزي مع بعض


def get_poppler_path():
    """
    يرجع مسار Poppler إن كان موجود، وإلا يرجع None.
    الهدف: تجنب فشل استخراج PDF عندما يكون Poppler غير مثبت في الجهاز.
    """
    candidates = []
    if POPPLER_PATH:
        candidates.append(POPPLER_PATH)
    candidates.extend([
        os.environ.get("POPPLER_PATH"),
        r"C:\poppler\Library\bin",
        r"C:\Program Files\poppler\Library\bin",
        r"C:\Program Files (x86)\poppler\Library\bin",
    ])

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate

    pdftoppm = shutil.which("pdftoppm")
    if pdftoppm:
        return os.path.dirname(pdftoppm)

    return None


# ===================== SIMILARITY =====================

def is_similar(a, b, threshold=0.85):
    """
    بتقارن سطرين وبترجع True إذا كانوا متشابهين بنسبة أعلى من الـ threshold
    بتستخدم لمنع التكرار الناتج عن فروقات بسيطة بين النص العادي والـ OCR
    """
    return SequenceMatcher(None, a, b).ratio() > threshold


def add_if_not_duplicate(line, seen_set, seen_list):
    """
    بتضيف السطر بس إذا مش موجود (exact أو similar)
    بترجع True إذا أضافت، False إذا كان مكرر
    - seen_set: للفحص السريع (exact match)
    - seen_list: للفحص الذكي (similarity check)
    """
    if line in seen_set:
        return False

    if any(is_similar(line, s) for s in seen_list):
        return False

    seen_set.add(line)
    seen_list.append(line)
    return True


# ===================== EXTRACTORS =====================

def extract_text_from_image(image_path, lang=DEFAULT_LANG):
    """
    بتستخرج النص من صورة باستخدام OCR
    بتدعم العربي والإنجليزي مع بعض
    """
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img, lang=lang)
        return text.strip()
    except Exception as e:
        print(f"Warning: could not extract text from image {image_path}: {e}")
        return ""


def extract_text_from_txt(txt_path):
    """
    بتقرأ ملف نصي وبترجع محتواه
    بتجرب utf-8 أولاً، وإذا فشلت بتجرب utf-8-sig للملفات العربية
    """
    try:
        with open(txt_path, "r", encoding="utf-8") as file:
            return file.read().strip()
    except UnicodeDecodeError:
        with open(txt_path, "r", encoding="utf-8-sig") as file:
            return file.read().strip()


def extract_text_from_docx(docx_path, lang=DEFAULT_LANG):
    """
    بتستخرج النص من ملف Word
    بتاخد النص العادي + بتعمل OCR على الصور الموجودة داخل الملف
    """
    doc = Document(docx_path)
    text_parts = []

    # استخراج النص العادي
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    if paragraphs:
        text_parts.append("\n".join(paragraphs))

    # استخراج النص من الصور بالـ OCR
    image_texts = []
    with tempfile.TemporaryDirectory() as temp_dir:
        with zipfile.ZipFile(docx_path, "r") as docx_zip:
            for file_name in docx_zip.namelist():
                if file_name.startswith("word/media/"):
                    extracted_path = docx_zip.extract(file_name, path=temp_dir)
                    try:
                        img = Image.open(extracted_path)
                        ocr_text = pytesseract.image_to_string(img, lang=lang).strip()
                        if ocr_text:
                            image_texts.append(ocr_text)
                    except Exception as e:
                        print(f"Warning: could not process image {file_name}: {e}")

    if image_texts:
        text_parts.append("\n".join(image_texts))

    return "\n\n".join(text_parts).strip()


def extract_text_from_pdf(pdf_path, lang=DEFAULT_LANG):
    """
    بتستخرج النص من PDF بطريقتين مع بعض لكل صفحة:
    1. النص المباشر من الملف باستخدام PyMuPDF / pdfplumber (بدون Poppler)
    2. OCR على صورة الصفحة إذا توفر Poppler/Tesseract
    بعدها بتدمجهم وبتشيل التكرار بالـ similarity check
    """
    pages_text = []
    images = []

    # 1) جرب استخراج النص مباشرة بدون أي تبعية خارجية
    if fitz is not None:
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                page_text = (page.get_text("text") or "").strip()
                if page_text:
                    pages_text.append(page_text)
            doc.close()
            if pages_text:
                return "\n\n".join(pages_text)
        except Exception as e:
            print(f"Warning: PyMuPDF extraction failed for {pdf_path}: {e}")

    # 2) fallback إلى pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = (page.extract_text() or "").strip()
                if page_text:
                    pages_text.append(page_text)
        if pages_text:
            return "\n\n".join(pages_text)
    except Exception as e:
        print(f"Warning: pdfplumber failed for {pdf_path}: {e}")

    # 3) OCR fallback فقط إذا أمكن تحويل الصفحات إلى صور
    if convert_from_path is not None:
        try:
            poppler_path = get_poppler_path()
            if poppler_path:
                images = convert_from_path(pdf_path, poppler_path=poppler_path)
            else:
                images = convert_from_path(pdf_path)
        except Exception as e:
            print(f"Warning: PDF pages could not be converted to images: {e}")
            images = []

    for i, page_text in enumerate(pages_text):
        # إذا كان النص موجود من الخطوات السابقة لا نحتاج OCR
        pass

    if images:
        for i, image in enumerate(images):
            try:
                ocr_text = pytesseract.image_to_string(image, lang=lang).strip()
                if ocr_text:
                    pages_text.append(ocr_text)
            except Exception as e:
                print(f"Warning: OCR failed on page {i + 1}: {e}")

    if not pages_text:
        return ""

    return "\n\n".join(pages_text)


def extract_text_from_pptx(pptx_path, lang=DEFAULT_LANG):
    """
    بتستخرج النص من PowerPoint
    بتاخد النص من كل الـ shapes + بتعمل OCR على الصور
    """
    prs = Presentation(pptx_path)
    text_parts = []
    image_texts = []

    with tempfile.TemporaryDirectory() as temp_dir:
        image_counter = 0

        for slide_num, slide in enumerate(prs.slides, start=1):
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    slide_text = shape.text.strip()
                    if slide_text:
                        text_parts.append(slide_text)

                if shape.shape_type == 13:  # Picture
                    try:
                        image = shape.image
                        image_bytes = image.blob
                        image_ext = image.ext
                        image_path = os.path.join(
                            temp_dir,
                            f"slide_image_{image_counter}.{image_ext}"
                        )
                        with open(image_path, "wb") as f:
                            f.write(image_bytes)

                        img = Image.open(image_path)
                        ocr_text = pytesseract.image_to_string(img, lang=lang).strip()
                        if ocr_text:
                            image_texts.append(ocr_text)

                        image_counter += 1

                    except Exception as e:
                        print(f"Warning: could not process image on slide {slide_num}: {e}")

    all_parts = []
    if text_parts:
        all_parts.append("\n".join(text_parts))
    if image_texts:
        all_parts.append("\n".join(image_texts))

    return "\n\n".join(all_parts).strip()


# ===================== CLEANER =====================

def clean_extracted_text(text, lang=DEFAULT_LANG):
    """
    بتنظف النص المستخرج:
    - بتشيل الأسطر الفاضية
    - بتشيل الأسطر القصيرة جداً (أقل من حرفين)
    - بتشيل التكرار بالـ similarity check
    - بتحافظ على الأحرف العربية والإنجليزية والأرقام
    """
    lines = text.splitlines()
    cleaned_lines = []
    seen_set = set()
    seen_list = []

    for line in lines:
        clean_line = " ".join(line.split()).strip()

        if not clean_line:
            continue

        if len(clean_line) < 2:
            continue

        if add_if_not_duplicate(clean_line, seen_set, seen_list):
            cleaned_lines.append(clean_line)

    return "\n".join(cleaned_lines).strip()


# ===================== MAIN EXTRACTOR =====================

def extract_text(file_path, lang=DEFAULT_LANG):
    """
    الدالة الرئيسية: بتحدد نوع الملف وبتوجهه للدالة المناسبة
    بتدعم: txt, docx, pdf, pptx, png, jpg, jpeg, bmp, tiff
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    extractors = {
        ".txt":  lambda: extract_text_from_txt(file_path),
        ".docx": lambda: extract_text_from_docx(file_path, lang=lang),
        ".pdf":  lambda: extract_text_from_pdf(file_path, lang=lang),
        ".pptx": lambda: extract_text_from_pptx(file_path, lang=lang),
        ".png":  lambda: extract_text_from_image(file_path, lang=lang),
        ".jpg":  lambda: extract_text_from_image(file_path, lang=lang),
        ".jpeg": lambda: extract_text_from_image(file_path, lang=lang),
        ".bmp":  lambda: extract_text_from_image(file_path, lang=lang),
        ".tiff": lambda: extract_text_from_image(file_path, lang=lang),
    }

    if ext not in extractors:
        raise ValueError(f"Unsupported file type: {ext}")

    print(f"Extracting text from: {os.path.basename(file_path)} (lang={lang})")
    text = extractors[ext]()
    return clean_extracted_text(text, lang=lang)


# ===================== TEST =====================

if __name__ == "__main__":
    path = r"uploads\22.docx"  # غيّر الاسم للتجربة
    text = extract_text(path)

    print("\nExtracted Text:\n")
    print(text)
