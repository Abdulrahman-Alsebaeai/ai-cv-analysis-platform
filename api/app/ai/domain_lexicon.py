from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Sequence, Set


_ARABIC_TRANSLATION = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
    "ى": "ي", "ئ": "ي", "ؤ": "و", "ة": "ه",
    "ـ": "", "َ": "", "ً": "", "ُ": "", "ٌ": "", "ِ": "", "ٍ": "", "ْ": "", "ّ": "",
})


STOPWORDS = {
    "and", "or", "the", "a", "an", "to", "for", "of", "in", "on", "with", "from", "by", "at", "as", "is", "are", "be", "this", "that",
    "job", "role", "position", "required", "requirements", "preferred", "experience", "years", "year", "candidate", "applicant", "cv", "resume",
    "must", "have", "must-have", "nice", "plus", "ability", "responsible", "responsibilities", "work", "working", "team", "company",
    "و", "او", "أو", "في", "من", "على", "مع", "عن", "الى", "إلى", "ال", "هذا", "هذه", "ذلك", "تلك", "لدي", "لديه", "لديها",
    "مطلوب", "مطلوبه", "مطلوبة", "وظيفه", "وظيفة", "دور", "منصب", "خبره", "خبرة", "سنوات", "سنه", "سنة", "مرشح", "متقدم",
    "العمل", "شركة", "الشركة", "فريق", "مسؤول", "مسؤولة", "مهام", "مسؤوليات", "قدرة", "القدرة", "يفضل", "اساسي", "أساسي",
}


@dataclass(frozen=True)
class TermGroup:
    canonical: str
    category: str
    aliases: tuple[str, ...]
    weight: float = 1.0


TERM_GROUPS: tuple[TermGroup, ...] = (
    # Healthcare / medicine / dentistry.
    TermGroup("doctor", "role", ("doctor", "physician", "medical doctor", "general practitioner", "gp", "طبيب", "طبيبه", "طبيبة", "دكتور", "دكتوره", "دكتورة", "ممارس عام"), 1.8),
    TermGroup("dentist", "role", ("dentist", "dental doctor", "dental surgeon", "general dentist", "dentistry", "طب اسنان", "طب الاسنان", "طب الأسنان", "طبيب اسنان", "طبيب أسنان", "طبيبة اسنان", "طبيبة أسنان", "دكتور اسنان", "عيادة اسنان"), 2.5),
    TermGroup("dental assistant", "role", ("dental assistant", "dental nurse", "مساعد طبيب اسنان", "مساعد اسنان", "مساعدة طبيب اسنان", "مساعدة اسنان", "تمريض اسنان"), 1.8),
    TermGroup("orthodontist", "role", ("orthodontist", "orthodontics", "تقويم الاسنان", "تقويم الأسنان", "اخصائي تقويم", "أخصائي تقويم"), 2.0),
    TermGroup("endodontics", "skill", ("endodontics", "endodontist", "root canal", "root canal treatment", "علاج العصب", "حشو العصب", "معالجة الجذور"), 1.4),
    TermGroup("oral surgery", "skill", ("oral surgery", "tooth extraction", "extractions", "surgical extraction", "جراحة الفم", "جراحة الاسنان", "خلع الاسنان", "خلع الأسنان", "خلع سن", "خلع ضرس"), 1.4),
    TermGroup("prosthodontics", "skill", ("prosthodontics", "dental prosthetics", "crowns", "bridges", "dentures", "تركيبات الاسنان", "تركيبات الأسنان", "تيجان", "جسور", "اطقم اسنان"), 1.2),
    TermGroup("periodontics", "skill", ("periodontics", "periodontal", "gum treatment", "اللثة", "اللثه", "امراض اللثه", "امراض اللثة", "علاج اللثه", "علاج اللثة"), 1.2),
    TermGroup("dental implants", "skill", ("dental implants", "implantology", "implants", "زراعة الاسنان", "زراعة الأسنان", "زرعات الاسنان"), 1.3),
    TermGroup("pediatric dentistry", "skill", ("pediatric dentistry", "paediatric dentistry", "children dentistry", "طب اسنان الاطفال", "اسنان الاطفال", "أسنان الأطفال"), 1.1),
    TermGroup("dental radiography", "skill", ("dental x-ray", "dental xray", "dental radiography", "panoramic xray", "opg", "اشعة الاسنان", "اشعه الاسنان", "تصوير الاسنان"), 1.0),
    TermGroup("nurse", "role", ("nurse", "registered nurse", "nursing", "staff nurse", "ممرض", "ممرضة", "تمريض", "اخصائي تمريض", "أخصائي تمريض"), 1.8),
    TermGroup("pharmacist", "role", ("pharmacist", "pharmacy", "clinical pharmacist", "صيدلي", "صيدلاني", "صيدلية", "صيدلة", "صيدله"), 1.7),
    TermGroup("laboratory technician", "role", ("lab technician", "laboratory technician", "medical laboratory", "مختبر", "فني مختبر", "فنية مختبر", "اخصائي مختبر", "تحاليل طبية"), 1.5),
    TermGroup("radiology technician", "role", ("radiology technician", "radiographer", "radiology technologist", "x ray technician", "فني اشعة", "فنية اشعة", "اخصائي اشعة", "اشعة"), 1.5),
    TermGroup("physiotherapist", "role", ("physiotherapist", "physical therapist", "physiotherapy", "physical therapy", "اخصائي علاج طبيعي", "علاج طبيعي", "معالج طبيعي"), 1.6),
    TermGroup("nutritionist", "role", ("nutritionist", "dietitian", "clinical nutrition", "اخصائي تغذية", "اخصائية تغذية", "تغذية علاجية", "تغذية"), 1.4),
    TermGroup("veterinarian", "role", ("veterinarian", "vet", "veterinary doctor", "طبيب بيطري", "طب بيطري", "بيطري"), 1.6),
    TermGroup("infection control", "skill", ("infection control", "sterilization", "cross infection", "مكافحة العدوى", "التعقيم", "تعقيم الادوات", "تعقيم الأدوات"), 1.0),
    TermGroup("patient care", "skill", ("patient care", "clinical care", "patient management", "رعاية المرضى", "التعامل مع المرضى", "خدمة المرضى", "العناية بالمرضى"), 0.9),

    # Real estate / property.
    TermGroup("real estate agent", "role", ("real estate agent", "realtor", "property agent", "real estate broker", "property broker", "real estate sales agent", "وكيل عقاري", "وسيط عقاري", "مسوق عقاري", "مندوب عقاري", "خبير عقاري", "سمسار عقاري"), 2.5),
    TermGroup("property consultant", "role", ("property consultant", "real estate consultant", "real estate advisor", "property advisor", "مستشار عقاري", "استشاري عقاري", "استشارات عقارية", "مستشار املاك", "مستشار أملاك"), 2.0),
    TermGroup("real estate sales", "skill", ("real estate sales", "property sales", "selling properties", "بيع العقارات", "مبيعات عقارية", "البيع العقاري", "عمليات البيع العقاري"), 1.5),
    TermGroup("property purchase", "skill", ("property purchase", "buying properties", "real estate purchase", "شراء العقارات", "عمليات الشراء", "الشراء العقاري"), 1.3),
    TermGroup("property leasing", "skill", ("property leasing", "property rental", "real estate leasing", "renting properties", "تأجير العقارات", "ايجار العقارات", "الإيجار العقاري", "التأجير العقاري", "عمليات التأجير"), 1.3),
    TermGroup("real estate marketing", "skill", ("real estate marketing", "property marketing", "digital real estate marketing", "التسويق العقاري", "استراتيجيات التسويق العقاري", "التسويق الرقمي العقاري"), 1.3),
    TermGroup("property valuation", "skill", ("property valuation", "real estate valuation", "property appraisal", "تقييم العقارات", "تقيم العقارات", "تثمين العقارات", "تقييم عقاري", "تثمين عقاري"), 1.4),
    TermGroup("real estate market analysis", "skill", ("real estate market analysis", "market analysis", "real estate trends", "تحليل السوق العقاري", "تحليل السوق", "تحليل الاتجاهات السوقية", "اتجاهات السوق", "ديناميكات سوق العقارات", "سوق العقارات"), 1.4),
    TermGroup("real estate developers coordination", "skill", ("coordination with developers", "real estate developers", "brokers and developers", "التنسيق مع الوكلاء", "التنسيق مع المطورين", "المطورين العقاريين", "الوكلاء والمطورين"), 1.0),
    TermGroup("property management", "role", ("property manager", "property management", "facility management", "مدير املاك", "مدير أملاك", "ادارة الاملاك", "إدارة الأملاك", "ادارة العقارات"), 1.7),

    # Business, sales, marketing, admin.
    TermGroup("sales", "role", ("sales", "sales representative", "sales executive", "sales specialist", "account executive", "مندوب مبيعات", "مبيعات", "مسؤول مبيعات", "اخصائي مبيعات", "تنفيذي مبيعات"), 1.4),
    TermGroup("marketing", "role", ("marketing", "digital marketing", "marketer", "marketing specialist", "marketing executive", "تسويق", "مسوق", "مسوقه", "تسويق رقمي", "اخصائي تسويق", "تنفيذي تسويق"), 1.4),
    TermGroup("social media marketing", "skill", ("social media", "social media marketing", "content marketing", "سوشيال ميديا", "وسائل التواصل", "التواصل الاجتماعي", "تسويق المحتوى", "ادارة حسابات التواصل"), 1.1),
    TermGroup("seo", "skill", ("seo", "search engine optimization", "تحسين محركات البحث", "محركات البحث"), 1.0),
    TermGroup("customer service", "role", ("customer service", "customer support", "call center", "contact center", "خدمة العملاء", "دعم العملاء", "كول سنتر", "مركز اتصال", "عناية العملاء"), 1.4),
    TermGroup("business development", "role", ("business development", "bd", "partnerships", "تطوير الاعمال", "تطوير الأعمال", "الشراكات", "مدير تطوير اعمال"), 1.4),
    TermGroup("human resources", "role", ("human resources", "hr", "recruiter", "talent acquisition", "people operations", "موارد بشرية", "الموارد البشريه", "الموارد البشرية", "توظيف", "استقطاب المواهب", "اخصائي موارد بشرية"), 1.4),
    TermGroup("administrative assistant", "role", ("administrative assistant", "admin assistant", "office administrator", "secretary", "executive assistant", "مساعد اداري", "مساعدة ادارية", "اداري", "ادارية", "سكرتير", "سكرتيرة", "مدير مكتب"), 1.3),
    TermGroup("project manager", "role", ("project manager", "project management", "pmp", "scrum master", "product owner", "مدير مشروع", "ادارة مشاريع", "إدارة مشاريع", "سكرم ماستر", "مالك المنتج"), 1.5),
    TermGroup("product manager", "role", ("product manager", "product management", "product owner", "مدير منتج", "ادارة المنتج", "إدارة المنتج", "مالك المنتج"), 1.5),
    TermGroup("operations manager", "role", ("operations manager", "operations", "operation manager", "مدير عمليات", "العمليات", "تشغيل", "ادارة التشغيل"), 1.4),
    TermGroup("procurement", "role", ("procurement", "purchasing", "buyer", "sourcing", "مشتريات", "اخصائي مشتريات", "مسؤول مشتريات", "توريد", "تعاقدات"), 1.3),

    # Finance / accounting / banking / legal.
    TermGroup("accountant", "role", ("accountant", "accounting", "general accountant", "محاسب", "محاسبة", "محاسبه", "الحسابات", "محاسب عام"), 1.6),
    TermGroup("auditor", "role", ("auditor", "internal auditor", "external auditor", "audit", "مدقق", "مراجع", "مراجع حسابات", "تدقيق", "مراجعة داخلية"), 1.5),
    TermGroup("financial analyst", "role", ("financial analyst", "finance analyst", "financial planning", "fp&a", "محلل مالي", "تحليل مالي", "تخطيط مالي"), 1.5),
    TermGroup("banking", "industry", ("banking", "bank", "teller", "مصرف", "بنك", "قطاع مصرفي", "صراف", "خدمات مصرفية"), 1.2),
    TermGroup("insurance", "industry", ("insurance", "claims", "underwriting", "تأمين", "تامين", "مطالبات", "اكتتاب تأميني"), 1.2),
    TermGroup("lawyer", "role", ("lawyer", "attorney", "legal counsel", "legal advisor", "محامي", "محامية", "مستشار قانوني", "قانوني", "الشؤون القانونية"), 1.6),
    TermGroup("compliance", "skill", ("compliance", "regulatory", "aml", "kyc", "امتثال", "الالتزام", "مكافحة غسل الاموال", "اعرف عميلك"), 1.2),

    # Education / research / translation.
    TermGroup("teacher", "role", ("teacher", "teaching", "instructor", "tutor", "مدرس", "مدرسة", "معلم", "معلمة", "تعليم", "تدريس", "مدرب", "مدربة"), 1.5),
    TermGroup("professor", "role", ("professor", "lecturer", "faculty", "محاضر", "دكتور جامعي", "استاذ جامعي", "أستاذ جامعي", "هيئة تدريس"), 1.5),
    TermGroup("researcher", "role", ("researcher", "research assistant", "scientist", "باحث", "باحثة", "مساعد باحث", "بحث علمي"), 1.3),
    TermGroup("translator", "role", ("translator", "interpreter", "translation", "مترجم", "مترجمة", "ترجمة", "مترجم فوري"), 1.4),

    # Software / data / IT / cyber.
    TermGroup("software engineer", "role", ("software engineer", "software developer", "programmer", "developer", "backend developer", "frontend developer", "full stack", "full-stack", "مبرمج", "مبرمجة", "مهندس برمجيات", "مطور برمجيات", "مطور ويب", "مطور تطبيقات"), 1.7),
    TermGroup("frontend developer", "role", ("frontend", "front end", "front-end", "react developer", "vue developer", "angular developer", "مطور واجهات", "مطور فرونت اند", "واجهات امامية"), 1.4),
    TermGroup("backend developer", "role", ("backend", "back end", "back-end", "api developer", "server-side", "مطور باك اند", "مطور خلفي", "برمجة خلفية"), 1.4),
    TermGroup("mobile developer", "role", ("mobile developer", "android developer", "ios developer", "flutter developer", "react native", "مطور تطبيقات", "مطور اندرويد", "مطور ايفون", "مطور فلاتر"), 1.4),
    TermGroup("data analyst", "role", ("data analyst", "business intelligence", "bi analyst", "محلل بيانات", "تحليل بيانات", "ذكاء الاعمال", "ذكاء الأعمال"), 1.5),
    TermGroup("data scientist", "role", ("data scientist", "machine learning", "ml engineer", "ai engineer", "artificial intelligence", "عالم بيانات", "علم البيانات", "تعلم الالة", "تعلم الآلة", "ذكاء اصطناعي", "مهندس ذكاء اصطناعي"), 1.6),
    TermGroup("database administrator", "role", ("database administrator", "dba", "database", "sql administrator", "مدير قواعد بيانات", "قواعد بيانات", "ادارة قواعد البيانات"), 1.4),
    TermGroup("devops engineer", "role", ("devops", "devops engineer", "site reliability", "sre", "ci/cd", "docker", "kubernetes", "مهندس ديف اوبس", "ديف اوبس", "بنية تحتية"), 1.5),
    TermGroup("cloud engineer", "role", ("cloud engineer", "aws", "azure", "gcp", "cloud architecture", "مهندس سحابة", "حوسبة سحابية", "خدمات سحابية"), 1.4),
    TermGroup("cybersecurity", "role", ("cybersecurity", "security analyst", "information security", "soc analyst", "penetration testing", "امن سيبراني", "الأمن السيبراني", "امن المعلومات", "محلل امن", "اختبار اختراق"), 1.5),
    TermGroup("network engineer", "role", ("network engineer", "network administrator", "ccna", "ccnp", "مهندس شبكات", "ادارة الشبكات", "فني شبكات", "شبكات"), 1.4),
    TermGroup("it support", "role", ("it support", "technical support", "help desk", "desktop support", "دعم فني", "تقنية معلومات", "فني حاسب", "مكتب مساعدة"), 1.3),
    TermGroup("qa tester", "role", ("qa", "quality assurance", "software tester", "test engineer", "manual testing", "automation testing", "ضمان الجودة", "اختبار برمجيات", "مختبر برامج"), 1.3),
    TermGroup("ui ux designer", "role", ("ui ux", "ui/ux", "ux designer", "ui designer", "product designer", "مصمم واجهات", "تجربة المستخدم", "واجهة المستخدم", "مصمم تجربة المستخدم"), 1.4),
    TermGroup("python", "tool", ("python", "بايثون"), 0.7),
    TermGroup("javascript", "tool", ("javascript", "typescript", "js", "ts", "جافاسكريبت", "تايب سكريبت"), 0.7),
    TermGroup("java", "tool", ("java", "spring", "spring boot", "جافا"), 0.7),
    TermGroup("dotnet", "tool", (".net", "dotnet", "c#", "asp.net", "سي شارب"), 0.7),
    TermGroup("php", "tool", ("php", "laravel", "بي اتش بي", "لارافيل"), 0.7),
    TermGroup("sql", "tool", ("sql", "mysql", "postgresql", "postgres", "oracle", "sqlite", "استعلامات", "اس كيو ال"), 0.7),
    TermGroup("excel", "tool", ("excel", "advanced excel", "spreadsheet", "اكسل", "إكسل", "جداول بيانات"), 0.7),
    TermGroup("power bi", "tool", ("power bi", "tableau", "looker", "لوحات بيانات", "باور بي اي", "تابلو"), 0.7),

    # Engineering / construction / industrial.
    TermGroup("civil engineer", "role", ("civil engineer", "civil engineering", "site engineer", "مهندس مدني", "هندسة مدنية", "مهندس موقع"), 1.6),
    TermGroup("architect", "role", ("architect", "architecture", "architectural engineer", "مهندس معماري", "معماري", "هندسة معمارية"), 1.6),
    TermGroup("mechanical engineer", "role", ("mechanical engineer", "mechanical engineering", "مهندس ميكانيكي", "هندسة ميكانيكية"), 1.6),
    TermGroup("electrical engineer", "role", ("electrical engineer", "electrical engineering", "مهندس كهرباء", "هندسة كهربائية"), 1.6),
    TermGroup("industrial engineer", "role", ("industrial engineer", "industrial engineering", "مهندس صناعي", "هندسة صناعية"), 1.5),
    TermGroup("chemical engineer", "role", ("chemical engineer", "chemical engineering", "مهندس كيميائي", "هندسة كيميائية"), 1.5),
    TermGroup("biomedical engineer", "role", ("biomedical engineer", "biomedical engineering", "مهندس اجهزة طبية", "هندسة طبية", "هندسة حيوية"), 1.5),
    TermGroup("construction", "industry", ("construction", "contracting", "site supervision", "مقاولات", "انشاءات", "إنشاءات", "اشراف موقع", "إشراف موقع"), 1.2),
    TermGroup("quantity surveyor", "role", ("quantity surveyor", "cost estimator", "boq", "حاسب كميات", "حصر كميات", "مقدر تكاليف", "جدول كميات"), 1.4),
    TermGroup("autocad", "tool", ("autocad", "revit", "bim", "solidworks", "اوتوكاد", "ريفيت", "نمذجة معلومات البناء"), 0.8),
    TermGroup("hse", "role", ("hse", "health and safety", "safety officer", "occupational safety", "مسؤول سلامة", "اخصائي سلامة", "السلامة والصحة المهنية", "امن وسلامة"), 1.4),
    TermGroup("quality control", "role", ("quality control", "quality assurance", "qc", "qa", "مراقبة جودة", "ضمان الجودة", "فحص جودة", "جودة"), 1.3),

    # Logistics / supply chain / transport.
    TermGroup("logistics", "role", ("logistics", "supply chain", "warehouse", "inventory", "لوجستيات", "سلاسل الامداد", "سلسلة الامداد", "مستودعات", "مخزون", "امين مستودع"), 1.4),
    TermGroup("driver", "role", ("driver", "delivery driver", "chauffeur", "سائق", "مندوب توصيل", "توصيل", "سائق خاص"), 1.3),
    TermGroup("fleet manager", "role", ("fleet manager", "fleet supervisor", "مدير اسطول", "مشرف اسطول", "ادارة الاسطول"), 1.3),
    TermGroup("customs clearance", "skill", ("customs clearance", "import export", "freight forwarding", "تخليص جمركي", "استيراد وتصدير", "شحن", "شحن دولي"), 1.1),

    # Hospitality / food / tourism / retail.
    TermGroup("hotel receptionist", "role", ("hotel receptionist", "front desk", "reservation agent", "موظف استقبال", "استقبال فندقي", "حجوزات", "الاستقبال"), 1.3),
    TermGroup("chef", "role", ("chef", "cook", "kitchen", "طباخ", "شيف", "طاهي", "مطبخ"), 1.4),
    TermGroup("barista", "role", ("barista", "coffee", "باريستا", "قهوة", "تحضير القهوة"), 1.3),
    TermGroup("waiter", "role", ("waiter", "waitress", "server", "نادل", "نادلة", "مقدم طعام", "خدمة مطاعم"), 1.2),
    TermGroup("tourism", "industry", ("tourism", "travel agent", "tour guide", "سياحة", "مرشد سياحي", "وكيل سفر", "حجز تذاكر"), 1.2),
    TermGroup("retail", "industry", ("retail", "cashier", "storekeeper", "store manager", "تجزئة", "كاشير", "امين صندوق", "بائع", "بائعة", "مدير متجر", "محل"), 1.3),

    # Media / creative / design.
    TermGroup("graphic designer", "role", ("graphic designer", "visual designer", "branding", "مصمم جرافيك", "تصميم جرافيك", "هوية بصرية", "علامة تجارية"), 1.4),
    TermGroup("photographer", "role", ("photographer", "photography", "photo editor", "مصور", "مصورة", "تصوير فوتوغرافي", "تحرير صور"), 1.3),
    TermGroup("video editor", "role", ("video editor", "motion graphics", "videographer", "montage", "محرر فيديو", "مونتاج", "موشن جرافيك", "مصمم فيديو"), 1.3),
    TermGroup("content writer", "role", ("content writer", "copywriter", "editor", "كاتب محتوى", "كتابة محتوى", "محرر", "محرر محتوى", "كتابة اعلانية"), 1.3),
    TermGroup("public relations", "role", ("public relations", "pr", "communications", "علاقات عامة", "اتصال مؤسسي", "اعلام", "إعلام"), 1.2),

    # Security / public services / labor roles.
    TermGroup("security guard", "role", ("security guard", "security officer", "guard", "حارس امن", "حارسة امن", "امن وحراسة", "رجل امن"), 1.3),
    TermGroup("police military", "industry", ("police", "military", "army", "defense", "شرطة", "عسكري", "جيش", "دفاع", "امن عام"), 1.2),
    TermGroup("cleaner", "role", ("cleaner", "cleaning", "housekeeping", "عامل نظافة", "عاملة نظافة", "تنظيف", "هاوس كيبنج"), 1.2),
    TermGroup("technician", "role", ("technician", "maintenance technician", "فني", "فني صيانة", "صيانة", "تقني"), 1.2),
    TermGroup("electrician", "role", ("electrician", "electrical technician", "كهربائي", "فني كهرباء", "تمديدات كهربائية"), 1.3),
    TermGroup("plumber", "role", ("plumber", "plumbing", "سباك", "سباكة", "تمديدات صحية"), 1.3),
    TermGroup("carpenter", "role", ("carpenter", "carpentry", "نجار", "نجارة"), 1.2),
    TermGroup("mechanic", "role", ("mechanic", "auto mechanic", "maintenance mechanic", "ميكانيكي", "فني ميكانيكا", "صيانة سيارات"), 1.3),

    # Agriculture / environment / beauty / sports.
    TermGroup("agriculture", "industry", ("agriculture", "farmer", "agronomy", "زراعة", "مزارع", "مهندس زراعي", "انتاج زراعي"), 1.2),
    TermGroup("environmental specialist", "role", ("environmental specialist", "environmental engineer", "sustainability", "اخصائي بيئة", "مهندس بيئة", "استدامة", "بيئة"), 1.3),
    TermGroup("beauty specialist", "role", ("beautician", "makeup artist", "hairdresser", "barber", "cosmetologist", "اخصائية تجميل", "تجميل", "مكياج", "كوافير", "حلاق", "مصفف شعر"), 1.3),
    TermGroup("fitness trainer", "role", ("fitness trainer", "personal trainer", "coach", "مدرب رياضي", "مدربة رياضية", "لياقة", "مدرب شخصي"), 1.3),

    # Cross-functional skills.
    TermGroup("negotiation", "skill", ("negotiation", "deal negotiation", "client negotiation", "التفاوض", "مهارات التفاوض", "التفاوض مع العملاء", "تحقيق أفضل الصفقات", "الصفقات"), 1.2),
    TermGroup("communication", "skill", ("communication", "customer communication", "client communication", "interpersonal skills", "مهارات التواصل", "التواصل", "التواصل مع العملاء", "التعامل مع العملاء"), 1.1),
    TermGroup("leadership", "skill", ("leadership", "team leadership", "supervision", "management", "قيادة", "قيادة فريق", "اشراف", "إشراف", "ادارة فريق", "إدارة فريق"), 1.1),
    TermGroup("problem solving", "skill", ("problem solving", "analytical thinking", "critical thinking", "حل المشكلات", "حل المشاكل", "تفكير تحليلي", "تفكير نقدي"), 0.9),
    TermGroup("english language", "language", ("english", "english language", "fluent english", "advanced english", "اللغة الانجليزية", "اللغة الإنجليزية", "انجليزي", "إنجليزي", "متقدم في الانجليزية"), 0.6),
    TermGroup("arabic language", "language", ("arabic", "arabic language", "native arabic", "اللغة العربية", "عربي", "العربية", "اللغة الام"), 0.6),
)


CONCEPT_ALIASES: Dict[str, tuple[str, ...]] = {
    "real_estate": ("real estate", "property", "properties", "realtor", "عقار", "عقاري", "العقارات", "املاك", "أملاك"),
    "sales": ("sales", "sell", "selling", "مبيعات", "بيع", "البيع"),
    "purchase": ("purchase", "buy", "buying", "شراء", "الشراء"),
    "leasing": ("leasing", "rental", "rent", "lease", "تاجير", "تأجير", "ايجار", "إيجار"),
    "marketing": ("marketing", "digital marketing", "تسويق", "التسويق", "رقمي"),
    "analysis": ("analysis", "analytics", "analyze", "تحليل", "تحليلي", "تحليلية"),
    "valuation": ("valuation", "appraisal", "evaluate", "assessment", "تقييم", "تقيم", "تثمين"),
    "customer": ("customer", "client", "patients", "عملاء", "العملاء", "عميل", "زبائن", "مرضى", "المرضى"),
    "negotiation": ("negotiation", "negotiate", "تفاوض", "التفاوض"),
    "medical": ("medical", "clinical", "healthcare", "طبي", "صحي", "عيادة", "مستشفى"),
    "dental": ("dental", "dentist", "tooth", "teeth", "اسنان", "أسنان", "سن", "ضرس"),
    "software": ("software", "developer", "programming", "برمجيات", "برمجة", "مطور", "مبرمج"),
    "data": ("data", "analytics", "بيانات", "البيانات"),
    "finance": ("finance", "accounting", "financial", "محاسبة", "مالي", "مالية", "حسابات"),
    "education": ("education", "teaching", "teacher", "تعليم", "تدريس", "معلم", "مدرس"),
    "engineering": ("engineering", "engineer", "مهندس", "هندسة"),
    "design": ("design", "designer", "تصميم", "مصمم"),
    "management": ("manager", "management", "supervisor", "ادارة", "إدارة", "مدير", "مشرف"),
}


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.translate(_ARABIC_TRANSLATION).lower()
    text = re.sub(r"[\u064b-\u065f]", "", text)
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text = re.sub(r"[^\u0600-\u06ffa-z0-9_+#./\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokens(text: str) -> List[str]:
    return [
        t for t in re.findall(r"[\u0600-\u06ffa-z0-9_+#./\-]{2,}", normalize_text(text))
        if t not in STOPWORDS and not t.isdigit()
    ]


def _token_set(text: str) -> Set[str]:
    return set(_tokens(text))


@lru_cache(maxsize=1)
def _compiled_aliases() -> tuple[tuple[TermGroup, tuple[re.Pattern[str], ...]], ...]:
    compiled: list[tuple[TermGroup, tuple[re.Pattern[str], ...]]] = []
    for group in TERM_GROUPS:
        pats: list[re.Pattern[str]] = []
        for alias in group.aliases:
            a = normalize_text(alias)
            if not a:
                continue
            pats.append(re.compile(rf"(?<![\w+#./-]){re.escape(a)}(?![\w+#./-])", re.I))
        compiled.append((group, tuple(pats)))
    return tuple(compiled)


@lru_cache(maxsize=1)
def _compiled_concepts() -> tuple[tuple[str, tuple[re.Pattern[str], ...]], ...]:
    compiled: list[tuple[str, tuple[re.Pattern[str], ...]]] = []
    for concept, aliases in CONCEPT_ALIASES.items():
        pats = tuple(
            re.compile(rf"(?<![\w+#./-]){re.escape(normalize_text(alias))}(?![\w+#./-])", re.I)
            for alias in aliases
            if normalize_text(alias)
        )
        compiled.append((concept, pats))
    return tuple(compiled)


def extract_domain_terms(text: str, *, categories: Iterable[str] | None = None) -> List[str]:
    norm = normalize_text(text)
    allowed = {c.lower() for c in categories} if categories else None
    found: list[str] = []
    for group, pats in _compiled_aliases():
        if allowed is not None and group.category.lower() not in allowed:
            continue
        if any(p.search(norm) for p in pats):
            found.append(group.canonical)
    return sorted(set(found))


def extract_concepts(text: str) -> List[str]:
    norm = normalize_text(text)
    found: list[str] = []
    for concept, pats in _compiled_concepts():
        if any(p.search(norm) for p in pats):
            found.append(concept)
    return sorted(set(found))


def extract_weighted_domain_terms(text: str) -> Dict[str, float]:
    norm = normalize_text(text)
    out: Dict[str, float] = {}
    for group, pats in _compiled_aliases():
        if any(p.search(norm) for p in pats):
            out[group.canonical] = max(out.get(group.canonical, 0.0), group.weight)

    for concept in extract_concepts(norm):
        out[f"concept:{concept}"] = max(out.get(f"concept:{concept}", 0.0), 0.55)

    return out


def all_alias_terms() -> List[str]:
    terms: Set[str] = set()
    for group in TERM_GROUPS:
        terms.add(group.canonical)
        terms.update(group.aliases)

    for concept, aliases in CONCEPT_ALIASES.items():
        terms.add(concept)
        terms.update(aliases)

    return sorted(terms, key=lambda x: (len(x), x))


def expand_text_with_aliases(text: str) -> str:
    """Append compact hidden hints so bilingual/offline embeddings can match equivalent concepts."""
    base = text or ""
    norm = normalize_text(base)
    hints: list[str] = []

    for group, pats in _compiled_aliases():
        if any(p.search(norm) for p in pats):
            aliases = [group.canonical, *group.aliases]
            hints.extend(normalize_text(a) for a in aliases if a)

    for concept in extract_concepts(norm):
        hints.append(concept)
        hints.extend(normalize_text(a) for a in CONCEPT_ALIASES.get(concept, ()))

    if not hints:
        return base

    dedup: list[str] = []
    seen: set[str] = set()
    for h in hints:
        if h and h not in seen:
            seen.add(h)
            dedup.append(h)

    return base + "\n\n[semantic aliases] " + " ; ".join(dedup)


def _weighted_overlap(a: Dict[str, float], b: Dict[str, float]) -> float:
    if not a or not b:
        return 0.0

    common = set(a) & set(b)
    if not common:
        return 0.0

    got = sum(min(a[k], b[k]) for k in common)
    denom = sum(a.values())
    return max(0.0, min(1.0, got / max(denom, 1e-6)))


def _token_overlap(job_text: str, resume_text: str) -> float:
    jt = _token_set(expand_text_with_aliases(job_text))
    rt = _token_set(expand_text_with_aliases(resume_text))

    if not jt or not rt:
        return 0.0

    common = jt & rt
    return max(0.0, min(1.0, len(common) / max(1, min(len(jt), 48))))


def _concept_overlap(a_text: str, b_text: str) -> float:
    a = set(extract_concepts(a_text))
    b = set(extract_concepts(b_text))

    if not a or not b:
        return 0.0

    return len(a & b) / max(1, len(a))


def _phrase_score(requirement: str, resume_pool: str) -> float:
    req_norm = normalize_text(requirement)
    pool_norm = normalize_text(resume_pool)

    if not req_norm:
        return 0.0

    if req_norm in pool_norm:
        return 1.0

    req_expanded = expand_text_with_aliases(requirement)
    pool_expanded = expand_text_with_aliases(resume_pool)

    req_terms = extract_weighted_domain_terms(req_expanded)
    pool_terms = extract_weighted_domain_terms(pool_expanded)
    term_score = _weighted_overlap(req_terms, pool_terms)

    req_tokens = _token_set(req_expanded)
    pool_tokens = _token_set(pool_expanded)

    if not req_tokens:
        token_score = 0.0
    else:
        token_score = len(req_tokens & pool_tokens) / max(1, len(req_tokens))

    concept_score = _concept_overlap(req_expanded, pool_expanded)

    score = max(term_score, concept_score, token_score)

    if term_score >= 0.55 or concept_score >= 0.70:
        score = max(score, 0.92)
    elif token_score >= 0.70:
        score = max(score, 0.82)
    elif token_score >= 0.50 and (term_score > 0 or concept_score > 0):
        score = max(score, 0.72)

    return max(0.0, min(1.0, score))


def requirement_match_score(
    requirement: str,
    resume_text: str,
    parsed: Dict[str, Any] | None = None,
) -> float:
    """Public helper for scoring_service.py if you want must-have checks to use the same logic."""
    parsed = parsed or {}
    extra = " ".join(str(x) for x in parsed.get("skills", []) or [])
    pool = f"{resume_text or ''}\n{extra}"
    return _phrase_score(requirement, pool)


def requirement_is_met(
    requirement: str,
    resume_text: str,
    parsed: Dict[str, Any] | None = None,
    *,
    threshold: float = 0.62,
) -> bool:
    return requirement_match_score(requirement, resume_text, parsed) >= threshold


def _requirement_overlap(
    requirements: Sequence[Dict[str, Any]],
    resume_text: str,
    parsed: Dict[str, Any] | None = None,
) -> float:
    if not requirements:
        return 0.0

    parsed = parsed or {}
    total = 0.0
    got = 0.0

    for req in requirements:
        val = str(req.get("req_value") or req.get("value") or req.get("text") or "").strip()
        if not val:
            continue

        try:
            weight = float(req.get("weight") or 1.0)
        except (TypeError, ValueError):
            weight = 1.0

        weight = max(0.1, weight)
        total += weight
        got += weight * requirement_match_score(val, resume_text, parsed)

    return 0.0 if total <= 0 else max(0.0, min(1.0, got / total))


def _extract_role_terms(text: str) -> Dict[str, float]:
    out: Dict[str, float] = {}

    for name in extract_domain_terms(text, categories=["role"]):
        for group in TERM_GROUPS:
            if group.canonical == name:
                out[name] = max(out.get(name, 0.0), group.weight)
                break

    return out


def _experience_signal(job_text: str, resume_text: str) -> float:
    """Small bonus when both texts mention years/experience; not used as a hard filter."""
    resume_norm = normalize_text(resume_text)
    job_norm = normalize_text(job_text)

    resume_years = [
        int(x)
        for x in re.findall(r"(\d{1,2})\s*(?:\+)?\s*(?:years?|سنوات|سنه|سنة)", resume_norm)
    ]
    job_years = [
        int(x)
        for x in re.findall(r"(\d{1,2})\s*(?:\+)?\s*(?:years?|سنوات|سنه|سنة)", job_norm)
    ]

    if not resume_years:
        years = [int(x) for x in re.findall(r"\b(19\d{2}|20\d{2})\b", resume_norm)]
        if len(years) >= 1:
            earliest = min(years)
            if 1980 <= earliest <= 2035:
                resume_years = [max(0, datetime.now().year - earliest)]

    if not job_years or not resume_years:
        return 0.0

    required = max(job_years)
    available = max(resume_years)

    if required <= 0:
        return 0.0

    return max(0.0, min(1.0, available / required))


def compute_local_cv_similarity(
    *,
    job_title: str,
    job_description: str,
    requirements: Sequence[Dict[str, Any]],
    resume_text: str,
    parsed_resume: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Deterministic bilingual similarity guardrail for cases where embeddings under-score obvious matches.

    This is intentionally conservative: it raises scores for genuine role/skill matches across Arabic/English,
    but it does not make unrelated CVs look good. Use it beside embeddings/Gemini, not as the only scorer.
    """
    parsed_resume = parsed_resume or {}

    job_text = (
        f"{job_title or ''}\n"
        f"{job_description or ''}\n"
        + "\n".join(str(r.get("req_value") or "") for r in requirements or [])
    )

    resume_augmented = resume_text or ""
    if parsed_resume.get("skills"):
        resume_augmented += "\n" + " ".join(str(x) for x in parsed_resume.get("skills") or [])

    job_terms = extract_weighted_domain_terms(job_text)
    resume_terms = extract_weighted_domain_terms(resume_augmented)

    role_terms_job = _extract_role_terms(job_text)
    role_terms_resume = _extract_role_terms(resume_augmented)

    domain_score = _weighted_overlap(job_terms, resume_terms)
    role_score = _weighted_overlap(role_terms_job, role_terms_resume)
    req_score = _requirement_overlap(requirements, resume_augmented, parsed_resume)
    overlap = _token_overlap(job_text, resume_augmented)
    concept_score = _concept_overlap(job_text, resume_augmented)
    exp_score = _experience_signal(job_text, resume_augmented)

    if requirements:
        score = (
            0.28 * domain_score
            + 0.24 * max(role_score, domain_score)
            + 0.28 * req_score
            + 0.10 * overlap
            + 0.07 * concept_score
            + 0.03 * exp_score
        )
    else:
        score = (
            0.42 * domain_score
            + 0.30 * max(role_score, domain_score)
            + 0.15 * overlap
            + 0.10 * concept_score
            + 0.03 * exp_score
        )

    exact_role = bool(set(role_terms_job) & set(role_terms_resume))
    strong_domain = domain_score >= 0.55 and concept_score >= 0.45
    strong_requirements = req_score >= 0.70

    if exact_role and strong_requirements:
        score = max(score, 0.88 + min(0.07, 0.04 * overlap + 0.03 * exp_score))
    elif exact_role:
        score = max(score, 0.80 + min(0.08, 0.05 * req_score + 0.03 * overlap))
    elif strong_domain and strong_requirements:
        score = max(score, 0.76 + min(0.08, 0.05 * overlap + 0.03 * exp_score))
    elif strong_requirements:
        score = max(score, 0.68 + min(0.08, 0.05 * domain_score + 0.03 * concept_score))

    # إذا لا يوجد أي تطابق تقريبًا، لا نرفع النتيجة حتى لا يصبح النظام غير دقيق.
    if domain_score == 0 and req_score < 0.20 and overlap < 0.12 and concept_score == 0:
        score = min(score, 0.18)

    return {
        "score": round(max(0.0, min(1.0, float(score))), 4),
        "domain_score": round(domain_score, 4),
        "role_score": round(role_score, 4),
        "requirements_overlap": round(req_score, 4),
        "token_overlap": round(overlap, 4),
        "concept_score": round(concept_score, 4),
        "experience_signal": round(exp_score, 4),
        "job_terms": sorted(job_terms),
        "resume_terms": sorted(resume_terms),
        "job_roles": sorted(role_terms_job),
        "resume_roles": sorted(role_terms_resume),
        "exact_role_match": exact_role,
    }