import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalNav from "@/components/GlobalNav";

export default async function SignalPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <>
      <GlobalNav breadcrumb="SIGNAL" />
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: "32px", fontWeight: 800, color: "#fbbf24", letterSpacing: "4px" }}>SIGNAL</div>
        <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: "12px", color: "var(--muted)", letterSpacing: "2px" }}>COMING SOON — v5.0</div>
      </div>
    </>
  );
}