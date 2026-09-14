import { redirect } from "next/navigation";

// This route used to be job-specific by mistake.
// The real ranking lives under: /dashboard/jobs/[id]/candidates/ranking
export function CandidatesRankingRedirect() {
    redirect("/dashboard/jobs");
}
