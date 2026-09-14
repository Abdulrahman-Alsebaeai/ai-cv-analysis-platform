# Fixed authentication setup

This copy includes repaired login, registration, Supabase session handling, and role-based redirects.

## Required environment variables

Create `.env.local` from `.env.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` recommended for reliable profile sync when RLS is enabled
- `ANALYSIS_API_URL` and `ANALYSIS_API_KEY` if you use the analysis backend

## Run

```bash
npm install
npm run dev
```

## Auth notes

- Applicant registration creates a Supabase auth user with `role: applicant` metadata.
- If email confirmation is enabled, the confirmation URL goes through `/auth/callback`.
- After login or confirmed signup, `/api/auth/profile` synchronizes the `profiles` row.
- `/applicant/*` is protected for applicants, while `/dashboard/*` is protected for staff roles.
