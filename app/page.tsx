export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020817]">
      <h1
        className="text-6xl font-extrabold tracking-widest"
        style={{ fontFamily: "var(--font-syne)", color: "#00d4ff" }}
      >
        FORGE
      </h1>
      <p
        className="mt-4 text-sm tracking-widest uppercase opacity-50"
        style={{ fontFamily: "var(--font-jetbrains)" }}
      >
        AI Project Tracker — Initializing...
      </p>
    </main>
  );
}