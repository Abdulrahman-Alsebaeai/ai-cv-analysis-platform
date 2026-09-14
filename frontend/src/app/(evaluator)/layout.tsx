import "@/app/dashboard.css";
import { requireRole } from "@/lib/authGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
    return <DashboardShell kind="evaluator">{children}</DashboardShell>;
}
