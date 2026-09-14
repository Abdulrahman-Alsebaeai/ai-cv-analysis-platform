import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function JobRankingRedirectPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(["admin", "employer", "evaluator"]);
  const { id } = await params;
  redirect(`/dashboard/jobs/${id}/candidates/ranking`);
}
