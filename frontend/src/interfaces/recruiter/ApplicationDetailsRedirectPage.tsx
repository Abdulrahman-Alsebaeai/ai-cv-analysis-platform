import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function ApplicationDetailsRedirectPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(["admin", "employer", "evaluator"]);
  const { id } = await params;

  // ✅ بعد التوحيد: id هو candidate_resume_id
  redirect(`/dashboard/candidate-resumes/${id}`);
}
