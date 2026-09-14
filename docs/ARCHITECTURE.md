# Architecture Notes

The platform separates user-facing recruitment workflows from AI-heavy analysis. Next.js handles public/applicant/recruiter interfaces, authenticated server routes, and Supabase session-aware access. The FastAPI service owns parsing, embedding, scoring, ranking, and PDF analysis endpoints. Supabase PostgreSQL is the shared data plane, with RLS policies enforcing user and organization boundaries.

The AI layer is intentionally configurable: a lightweight offline embedding path is available without model downloads, while Sentence Transformers and external structured parsers can be enabled when appropriate.
