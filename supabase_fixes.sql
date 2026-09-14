-- =====================
-- CV Platform - Supabase fixes
-- الهدف: تفعيل التقديم ورفع CV ومنع أخطاء RLS
-- نفّذ هذا في Supabase SQL Editor
-- ملاحظة: عدّل أسماء الأدوار/الأعمدة إذا كانت مختلفة عندك.
-- =====================

-- 1) (اختياري) السماح للعامة بقراءة الوظائف المفتوحة بدون Service Role
-- إذا كنت تستخدم Service Role في الواجهة العامة يمكن تجاهل هذا الجزء.
--
-- ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Public can view open jobs" ON public.jobs;
-- CREATE POLICY "Public can view open jobs"
-- ON public.jobs FOR SELECT
-- TO anon
-- USING (status = 'open');

-- 2) applications: المتقدم يستطيع إنشاء/قراءة طلبه، والشركة/المقيّم يقرأ ويحدّث طلبات شركته
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can insert own applications" ON public.applications;
CREATE POLICY "Applicants can insert own applications"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;
CREATE POLICY "Applicants can view own applications"
ON public.applications FOR SELECT
TO authenticated
USING (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Company can view applications of their jobs" ON public.applications;
CREATE POLICY "Company can view applications of their jobs"
ON public.applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.profiles p ON p.company_id = j.company_id
    WHERE j.id = public.applications.job_id
      AND p.id = auth.uid()
      AND COALESCE(p.role,'') IN ('admin','employer','evaluator')
  )
);

DROP POLICY IF EXISTS "Company can update applications of their jobs" ON public.applications;
CREATE POLICY "Company can update applications of their jobs"
ON public.applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.profiles p ON p.company_id = j.company_id
    WHERE j.id = public.applications.job_id
      AND p.id = auth.uid()
      AND COALESCE(p.role,'') IN ('admin','employer','evaluator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.profiles p ON p.company_id = j.company_id
    WHERE j.id = public.applications.job_id
      AND p.id = auth.uid()
      AND COALESCE(p.role,'') IN ('admin','employer','evaluator')
  )
);

-- 3) resumes: المتقدم يضيف/يقرأ ملفات السيرة الذاتية لتقديماته
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can insert resumes for own applications" ON public.resumes;
CREATE POLICY "Applicants can insert resumes for own applications"
ON public.resumes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = public.resumes.application_id
      AND a.applicant_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants can view resumes for own applications" ON public.resumes;
CREATE POLICY "Applicants can view resumes for own applications"
ON public.resumes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = public.resumes.application_id
      AND a.applicant_id = auth.uid()
  )
);

-- (اختياري) السماح للشركة/المقيّم بقراءة resumes لتقديمات شركته
DROP POLICY IF EXISTS "Company can view resumes of their jobs" ON public.resumes;
CREATE POLICY "Company can view resumes of their jobs"
ON public.resumes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.profiles p ON p.company_id = j.company_id
    WHERE a.id = public.resumes.application_id
      AND p.id = auth.uid()
      AND COALESCE(p.role,'') IN ('admin','employer','evaluator')
  )
);

-- 4) Storage bucket resumes + policies (إذا لم تكن موجودة)
-- أنشئ Bucket باسم resumes من لوحة Supabase Storage.
-- ثم فعّل سياسات objects:
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- السماح للمتقدم برفع/قراءة/تحديث ملفاته فقط إذا كان المسار يبدأ بـ uid/
DROP POLICY IF EXISTS "Applicants can upload their resumes" ON storage.objects;
CREATE POLICY "Applicants can upload their resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND name LIKE (auth.uid()::text || '/%')
);

DROP POLICY IF EXISTS "Applicants can read their resumes" ON storage.objects;
CREATE POLICY "Applicants can read their resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND name LIKE (auth.uid()::text || '/%')
);

DROP POLICY IF EXISTS "Applicants can update their resumes" ON storage.objects;
CREATE POLICY "Applicants can update their resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND name LIKE (auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'resumes'
  AND name LIKE (auth.uid()::text || '/%')
);

-- 5) notifications: لو جدولك title/body بدون meta، هذا طبيعي.
-- لو تبغى رابط للتقديم داخل الإشعار، أضف عمود meta jsonb (اختياري):
-- ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS meta jsonb;

