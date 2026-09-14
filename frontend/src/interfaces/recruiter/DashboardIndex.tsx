import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";

export async function DashboardIndex() {
    await requireRole(["admin", "employer", "evaluator"]);
    redirect("/dashboard/jobs");
}
