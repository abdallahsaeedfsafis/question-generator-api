import os
import tempfile
from pathlib import Path
from core.text_extractor import extract_text

pdf = (
    "%PDF-1.4\n"
    "1 0 obj\n"
    "<< /Type /Catalog /Pages 2 0 R >>\n"
    "endobj\n"
    "2 0 obj\n"
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n"
    "endobj\n"
    "3 0 obj\n"
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
    "endobj\n"
    "4 0 obj\n"
    "<< /Length 72 >>\n"
    "stream\n"
    "BT\n"
    "/F1 18 Tf\n"
    "50 60 Td\n"
    "(Hello PDF Test) Tj\n"
    "ET\n"
    "endstream\n"
    "endobj\n"
    "5 0 obj\n"
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n"
    "endobj\n"
    "xref\n"
    "0 6\n"
    "0000000000 65535 f \n"
    "0000000010 00000 n \n"
    "0000000062 00000 n \n"
    "0000000121 00000 n \n"
    "0000000248 00000 n \n"
    "0000000836 00000 n \n"
    "trailer\n"
    "<< /Root 1 0 R /Size 6 >>\n"
    "startxref\n"
    "934\n"
    "%%EOF\n"
)

fd, path = tempfile.mkstemp(suffix='.pdf', dir='.')
os.close(fd)
Path(path).write_bytes(pdf.encode('latin-1'))
print('PATH:', path)
text = extract_text(path)
print('HAS_TEXT:', bool(text))
print(text[:200] if text else 'NO_TEXT')
os.remove(path)
