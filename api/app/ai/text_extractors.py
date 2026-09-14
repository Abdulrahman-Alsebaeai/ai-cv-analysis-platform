from __future__ import annotations
import io
import pdfplumber
from docx import Document
def extract_text_from_pdf(data:bytes)->str:
    parts=[]
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for p in pdf.pages:
            t=p.extract_text() or ""
            if t.strip(): parts.append(t)
    return "\n".join(parts).strip()
def extract_text_from_docx(data:bytes)->str:
    doc=Document(io.BytesIO(data))
    return "\n".join([p.text for p in doc.paragraphs if p.text and p.text.strip()]).strip()
def extract_text_by_file(data:bytes,mime_type:str,filename:str)->str:
    mt=(mime_type or "").lower(); fn=(filename or "").lower()
    if "pdf" in mt or fn.endswith(".pdf"): return extract_text_from_pdf(data)
    if "wordprocessingml" in mt or fn.endswith(".docx"): return extract_text_from_docx(data)
    if fn.endswith(".doc") or mt=="application/msword": raise ValueError("Unsupported .doc file. Please upload PDF or DOCX instead.")
    raise ValueError("Unsupported file type. Only PDF and DOCX are supported at the moment.")
