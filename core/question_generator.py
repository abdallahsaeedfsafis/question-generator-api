import os
import re
from groq import Groq
from api.config import GROQ_API_KEY, GROQ_MODEL  # هذا السطر الجديد

# ===================== CONFIG =====================

# تهيئة عميل Groq
groq_client = Groq(api_key=GROQ_API_KEY)



# ===================== DETECTORS =====================

def detect_language(text):
    arabic_chars  = len(re.findall(r'[\u0600-\u06FF]', text))
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    if arabic_chars > english_chars:
        return "ar"
    elif english_chars > arabic_chars:
        return "en"
    else:
        return "mixed"


def detect_content_type(text):
    code_indicators = [
        "def ", "class ", "int ", "void ", "#include",
        "public static", "import ", "return ", "for(",
        "while(", "cout", "printf", "function ", "=>"
    ]
    code_score = sum(1 for indicator in code_indicators if indicator in text)
    return "code" if code_score >= 3 else "text"


# ===================== CLEANERS =====================

def is_academic_metadata(line):
    line_lower = line.lower().strip()
    english_patterns = [
        "presented by", "lecturer:", "prepared by",
        "instructor", "professor", "dr.", "ph.d",
        "office hours", "email:", "phone:",
        "course syllabus", "syllabus", "course description",
        "learning outcomes", "prerequisites", "textbook", "references",
        "credit hours", "office location",
        "grading", "grade distribution",
        "midterm", "final exam", "quiz", "assignment", "attendance",
        "total:", "total :", "points", "out of",
        "department of", "faculty of", "university", "college of",
        "semester", "week ", "lecture ", "lab ",
    ]
    arabic_patterns = [
        "مقدم من", "إعداد", "تقديم",
        "الدكتور", "الأستاذ", "د.", "أ.د", "المحاضر",
        "البريد الإلكتروني", "الهاتف", "ساعات المكتب",
        "خطة المساق", "توصيف المساق", "خطة الدرس",
        "مخرجات التعلم", "أهداف المساق", "وصف المساق",
        "المتطلب السابق", "الكتاب المقرر",
        "توزيع الدرجات", "الدرجات", "العلامات",
        "الامتحان النهائي", "الامتحان المنتصف", "اختبار",
        "الواجبات", "المشاريع", "الحضور والغياب",
        "قسم ", "كلية ", "جامعة ",
        "الفصل الدراسي", "الأسبوع", "المحاضرة", "المختبر",
        "المجموع", "النسبة", "من أصل", "درجة",
    ]
    for pattern in english_patterns:
        if pattern in line_lower:
            return True
    for pattern in arabic_patterns:
        if pattern in line:
            return True
    if re.search(r'\b\d+\s*%|\b\d+\s*/\s*\d+', line):
        return True
    return False


def clean_ocr_noise(text):
    lines = text.splitlines()
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            clean_lines.append(line)
            continue
        normal_chars = len(re.findall(
            r'[a-zA-Z\u0600-\u06FF0-9\s\.\,\:\;\-\(\)]', stripped
        ))
        ratio = normal_chars / len(stripped) if len(stripped) > 0 else 1
        if ratio >= 0.6:
            clean_lines.append(line)
    result = "\n".join(clean_lines)
    return re.sub(r'\n{3,}', '\n\n', result).strip()


def filter_academic_metadata(text):
    lines = text.splitlines()
    filtered_lines = []
    skip_block = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not skip_block:
                filtered_lines.append(line)
            continue
        if is_academic_metadata(stripped):
            skip_block = True
            continue
        skip_block = False
        filtered_lines.append(line)
    result = "\n".join(filtered_lines).strip()
    return re.sub(r'\n{3,}', '\n\n', result)


def clean_text_full(text):
    text = clean_ocr_noise(text)
    text = filter_academic_metadata(text)
    return text


# ===================== POST-PROCESSING =====================

FORBIDDEN_PATTERNS = [
    (r'وفقاً للمحتوى', ''), (r'وفقاً للنص', ''), (r'وفقاً للمادة', ''),
    (r'وفقاً للمساق', ''), (r'وفقًا للمحتوى', ''), (r'وفقًا للنص', ''),
    (r'وفقًا للمادة', ''), (r'وفقًا للمساق', ''),
    (r'حسب المحتوى', ''), (r'حسب النص', ''),
    (r'بحسب المحتوى', ''), (r'بحسب النص', ''),
    (r'كما ذكر', ''), (r'كما ورد', ''), (r'كما جاء', ''), (r'كما هو مذكور', ''),
    (r'استناداً إلى النص', ''), (r'استناداً إلى المحتوى', ''),
    (r'من المحتوى', ''), (r'من النص', ''), (r'من المادة', ''), (r'من المساق', ''),
    (r'في النص', ''), (r'في المحتوى', ''), (r'في المادة', ''),
    (r'المذكور في النص', ''), (r'المذكور في المحتوى', ''),
    (r'ادعم إجابتك بأمثلة من[^.،]*', ''),
    (r'استشهد بأمثلة من[^.،]*', ''),
    (r'بالاستناد إلى[^.،]*', ''),
    (r'according to the text', ''), (r'according to the passage', ''),
    (r'according to the content', ''), (r'according to the material', ''),
    (r'according to the lecture', ''),
    (r'based on the text', ''), (r'based on the passage', ''),
    (r'based on the content', ''), (r'based on the material', ''),
    (r'as mentioned in the text', ''), (r'as mentioned in the passage', ''),
    (r'as mentioned in the content', ''),
    (r'as stated in the text', ''), (r'as described in the text', ''),
    (r'the text says', ''), (r'the text states', ''),
    (r'the passage says', ''), (r'the content explains', ''),
    (r'from the course content', ''), (r'from the lecture', ''),
    (r'from the material', ''), (r'from the text', ''), (r'from the passage', ''),
    (r'support your answer with[^.]*examples from[^.]*', ''),
    (r'provide examples from[^.]*', ''),
    (r'with relevant examples from[^.]*', ''),
    (r'refer to the[^.]*', ''),
]


def remove_forbidden_phrases(text):
    result = text
    for pattern, replacement in FORBIDDEN_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    result = re.sub(r'\s+([؟?،,.])', r'\1', result)
    result = re.sub(r'([؟?،,.])(\s*[؟?،,.])+', r'\1', result)
    result = re.sub(r'[ \t]{2,}', ' ', result)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()


# ===================== CHUNKER =====================

def chunk_text(text, max_chars=3000):
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) <= max_chars:
            current_chunk += paragraph + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = paragraph + "\n\n"
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


# ===================== SHARED RULES =====================

SHARED_RULES = """STRICT RULES:
1. Questions ONLY from the educational content below.
2. No instructor names, course names, grades, or admin info.
3. NEVER use: "according to the text/content/material/passage",
   "based on the text", "as mentioned", "from the course content",
   "وفقاً للنص", "وفقاً للمحتوى", "حسب النص", "كما ذكر", "من المحتوى"
4. Every question must be STANDALONE — no reference to any source.
   WRONG: "ما التعريف الصحيح للحب وفقاً للمحتوى؟"
   RIGHT: "ما التعريف الصحيح للحب؟" """

ARABIC_EXTRA = """
قاعدة إلزامية: يُحظر تماماً في الأسئلة والأجوبة:
"وفقاً للمحتوى" أو "وفقاً للنص" أو "حسب النص" أو "كما ذكر" أو "من المحتوى"
اكتب الأسئلة مستقلة كأن الطالب لم يطلع على أي مصدر.
"""


# ===================== PROMPT BUILDERS =====================

def build_mcq_prompt(text, num_questions, lang, content_type):
    lang_instruction = {
        "ar":    "اكتب الأسئلة باللغة العربية فقط.",
        "en":    "Write the questions in English only.",
        "mixed": "Write the questions in the same language as the content."
    }[lang]
    arabic_extra = ARABIC_EXTRA if lang == "ar" else ""
    code_note = "\nNote: Content contains code. Focus on: functionality, output, bugs, complexity." if content_type == "code" else ""

    return f"""You are an expert academic teacher writing exam questions.
{lang_instruction}
{SHARED_RULES}
{arabic_extra}{code_note}

Generate exactly {num_questions} Multiple Choice Questions.
- 4 options (A B C D), one correct answer.
- All options in the same category.

Format:
Q1: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [letter]

Content:
\"\"\"{text}\"\"\"

Generate {num_questions} MCQ now:"""


def build_tf_prompt(text, num_questions, lang, content_type):
    lang_instruction = {
        "ar":    "اكتب الأسئلة باللغة العربية فقط.",
        "en":    "Write the questions in English only.",
        "mixed": "Write the questions in the same language as the content."
    }[lang]
    arabic_extra = ARABIC_EXTRA if lang == "ar" else ""
    code_note = "\nNote: Content contains code. Focus on: functionality, output, bugs, complexity." if content_type == "code" else ""
    fmt = "Q1: [جملة خبرية]\nAnswer: True / False" if lang == "ar" else "Q1: [statement]\nAnswer: True / False"

    return f"""You are an expert academic teacher writing exam questions.
{lang_instruction}
{SHARED_RULES}
{arabic_extra}{code_note}

Generate exactly {num_questions} True/False questions.
- Direct factual statement (not a question).
- MUST include Answer line for every question.
- Mix True and False.

Format:
{fmt}

Content:
\"\"\"{text}\"\"\"

Generate {num_questions} True/False now:"""


def build_essay_prompt(text, num_questions, lang, content_type):
    lang_instruction = {
        "ar":    "اكتب الأسئلة باللغة العربية فقط.",
        "en":    "Write the questions in English only.",
        "mixed": "Write the questions in the same language as the content."
    }[lang]
    arabic_extra = ARABIC_EXTRA if lang == "ar" else ""
    code_note = "\nNote: Content contains code. Focus on: functionality, output, bugs, complexity." if content_type == "code" else ""
    fmt = "Q1: [سؤال مباشر]\nModel Answer: [إجابة كاملة 3-5 جمل]" if lang == "ar" else "Q1: [direct question]\nModel Answer: [complete 3-5 sentence answer]"

    return f"""You are an expert academic teacher writing exam questions.
{lang_instruction}
{SHARED_RULES}
{arabic_extra}{code_note}

Generate exactly {num_questions} essay questions with model answers.
- Question: direct, standalone, no reference to any source.
- Model Answer: 3-5 sentences, complete, no reference to text or content.

Format:
{fmt}

Content:
\"\"\"{text}\"\"\"

Generate {num_questions} essay questions now:"""


# ===================== GROQ CALLER (بدلاً من Ollama) =====================

def call_groq(prompt):
    """
    استدعاء Groq API بدلاً من Ollama
    """
    try:
        # استخدام عميل Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=GROQ_MODEL,
            temperature=0.7,
            max_tokens=2048,  # زيادة لاستيعاب الأجوبة الطويلة
            top_p=0.9,
        )
        
        response = chat_completion.choices[0].message.content
        
        if not response:
            print("Warning: Groq returned an empty response")
            return ""
        
        return response.strip()
        
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        
        # معالجة أخطاء محددة
        if "rate_limit" in str(e).lower():
            print("Rate limit exceeded. Please wait a moment and try again.")
        elif "api_key" in str(e).lower():
            print("Invalid Groq API key. Check your GROQ_API_KEY environment variable.")
        elif "connection" in str(e).lower():
            print("Cannot connect to Groq API. Check your internet connection.")
        
        return ""


# ===================== MAIN GENERATOR =====================

def generate_all_questions(text, num_mcq=5, num_tf=2, num_essay=2):
    """
    الدالة الرئيسية:
    1. تنظيف النص
    2. كشف اللغة والنوع
    3. توليد الأسئلة حسب الأعداد المطلوبة
    4. post-processing لشيل العبارات الممنوعة
    """
    print("Cleaning and filtering text...")
    cleaned_text = clean_text_full(text)

    if not cleaned_text.strip():
        print("Warning: No educational content found after filtering.")
        return ""

    lang         = detect_language(cleaned_text)
    content_type = detect_content_type(cleaned_text)
    print(f"Language: {lang} | Content type: {content_type}")

    chunks     = chunk_text(cleaned_text)
    print(f"Text split into {len(chunks)} chunk(s)")
    main_chunk = "\n\n".join(chunks[:2])

    results = []

    # ── MCQ ───────────────────────────────────────────────
    if num_mcq > 0:
        print(f"Generating {num_mcq} MCQ questions...")
        mcq = call_groq(build_mcq_prompt(main_chunk, num_mcq, lang, content_type))
        if mcq:
            mcq = remove_forbidden_phrases(mcq)
            results.append("[ Multiple Choice Questions ]\n\n" + mcq)

    # ── True/False ────────────────────────────────────────
    if num_tf > 0:
        print(f"Generating {num_tf} True/False questions...")
        tf = call_groq(build_tf_prompt(main_chunk, num_tf, lang, content_type))
        if tf:
            tf = remove_forbidden_phrases(tf)
            results.append("[ True / False Questions ]\n\n" + tf)

    # ── Essay ─────────────────────────────────────────────
    if num_essay > 0:
        print(f"Generating {num_essay} Essay questions...")
        essay = call_groq(build_essay_prompt(main_chunk, num_essay, lang, content_type))
        if essay:
            essay = remove_forbidden_phrases(essay)
            results.append("[ Essay Questions ]\n\n" + essay)

    separator = "\n\n" + "─" * 50 + "\n\n"
    final_result = "\n\n" + separator.join(results) if results else ""
    
    return final_result


# ===================== EXAMPLE USAGE =====================
if __name__ == "__main__":
    # قراءة ملف مثال
    try:
        with open("sample_text.txt", "r", encoding="utf-8") as f:
            file_content = f.read()
        
        # توليد الأسئلة
        questions = generate_all_questions(file_content, num_mcq=3, num_tf=1, num_essay=1)
        print(questions)
        
    except FileNotFoundError:
        print("Please create a file named 'sample_text.txt' with your content")