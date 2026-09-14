import "@/app/dashboard.css";
import { requireRole } from "@/lib/authGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function ApplicantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole(["applicant"]);
    return <DashboardShell kind="applicant">{children}</DashboardShell>;
}
