from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _register_font() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).is_file():
            try:
                pdfmetrics.registerFont(TTFont("AppSans", path))
                return "AppSans"
            except Exception:
                continue
    return "Helvetica"


def render_job_report(payload: Dict[str, Any]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
    )

    font_name = _register_font()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleBilingual", parent=styles["Title"], fontName=font_name)
    heading_style = ParagraphStyle("HeadingBilingual", parent=styles["Heading2"], fontName=font_name)
    body_style = ParagraphStyle("BodyBilingual", parent=styles["BodyText"], fontName=font_name, leading=15)
    normal_style = ParagraphStyle("NormalBilingual", parent=styles["Normal"], fontName=font_name, leading=14)

    story = []

    job = payload.get("job") or {}
    title = job.get("title") or "Job Report / تقرير الوظيفة"
    desc = (job.get("description") or "")[:2500]

    story.append(Paragraph(f"<b>{title}</b>", title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Generated at / تاريخ الإنشاء: {payload.get('generated_at') or ''}", normal_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Job Description Summary / ملخص الوصف الوظيفي</b>", heading_style))
    story.append(Paragraph(desc.replace("\n", "<br/>"), body_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>Candidate Ranking / ترتيب المرشحين</b>", heading_style))

    candidates = payload.get("candidates") or []
    data = [["#", "Candidate / المرشح", "Final", "Raw", "Penalty", "Warnings / ملاحظات"]]
    for c in candidates[:30]:
        w = c.get("warnings") or {}
        warn = ""
        if w.get("is_suspected"):
            warn = f"Stuffing suspected / اشتباه حشو (score={w.get('stuffing_score')}, pen={w.get('penalty')})"
        data.append([
            str(c.get("rank") or ""),
            str(c.get("name") or ""),
            f"{float(c.get('final_score') or 0):.3f}",
            f"{float(c.get('raw_score') or 0):.3f}",
            f"{float(c.get('penalty') or 0):.3f}",
            warn,
        ])

    tbl = Table(data, colWidths=[1.0 * cm, 6.0 * cm, 2.0 * cm, 2.0 * cm, 2.0 * cm, 5.0 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("ALIGN", (2, 1), (4, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.98, 0.98, 0.98)]),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>Candidate Details / تفاصيل المرشحين</b>", heading_style))
    for c in candidates[:12]:
        story.append(Paragraph(f"<b>{c.get('rank')}. {c.get('name')}</b> — {c.get('file_name', '')}", heading_style))
        story.append(Paragraph(
            f"Final={float(c.get('final_score') or 0):.3f} | Raw={float(c.get('raw_score') or 0):.3f} | Penalty={float(c.get('penalty') or 0):.3f}",
            normal_style,
        ))
        w = c.get("warnings") or {}
        if w.get("is_suspected"):
            story.append(Paragraph("<b>Warnings / ملاحظات:</b> Keyword stuffing suspected / تم الاشتباه في حشو الكلمات المفتاحية.", normal_style))
            reps = w.get("repeated_terms") or []
            if reps:
                top = ", ".join([f"{r.get('term')}({r.get('count')})" for r in reps[:6]])
                story.append(Paragraph(f"Repeated terms / الكلمات المتكررة: {top}", body_style))
        story.append(Spacer(1, 8))

    doc.build(story)
    return buf.getvalue()
