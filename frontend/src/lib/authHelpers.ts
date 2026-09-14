export type AuthRole = "admin" | "recruiter" | "viewer" | "employer" | "evaluator" | "applicant";

export const STAFF_ROLES: AuthRole[] = ["admin", "employer", "evaluator", "recruiter", "viewer"];
export const ALL_ROLES: AuthRole[] = [...STAFF_ROLES, "applicant"];

export function normalizeRole(value: unknown, fallback: AuthRole = "applicant"): AuthRole {
  const role = String(value ?? "").trim().toLowerCase() as AuthRole;
  return ALL_ROLES.includes(role) ? role : fallback;
}

export function destinationForRole(role: AuthRole) {
  return role === "applicant" ? "/applicant/dashboard" : "/dashboard/jobs";
}

export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/auth/login") || value.startsWith("/auth/register")) return false;
  return true;
}

export function cleanFormValue(value: unknown) {
  return String(value ?? "").trim();
}

export function authErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return { ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", en: "Email or password is incorrect." };
  }


  if (lower.includes("email not confirmed")) {
    return { ar: "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.", en: "Please confirm your email before signing in." };
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return { ar: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.", en: "An account already exists for this email address." };
  }
  return { ar: message, en: message };
}
