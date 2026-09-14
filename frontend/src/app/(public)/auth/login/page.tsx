import { Suspense } from "react";
import { LoginPage } from "@/interfaces/public/LoginPage";

function LoginFallback() {
  return (
    <section className="section dash-container">
      <div className="card">Loading sign-in...</div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}
