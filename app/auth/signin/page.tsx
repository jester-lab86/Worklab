"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const result = await signIn("credentials", {
    password,
    redirect: false,
  });

  if (result?.ok) {
    window.location.href = "/dashboard";
  } else {
    setError("Invalid password. Access denied.");
  }
}

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020817]">
      <h1
        className="text-5xl font-extrabold tracking-widest mb-2"
        style={{ fontFamily: "var(--font-syne)", color: "#00d4ff" }}
      >
        FORGE
      </h1>
      <p className="text-xs tracking-widest uppercase opacity-40 mb-10">
        Authenticate to continue
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-72">
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[#0f172a] border border-[#00d4ff33] text-white px-4 py-3 rounded text-sm focus:outline-none focus:border-[#00d4ff] font-mono"
        />
        {error && (
          <p className="text-red-400 text-xs tracking-wide">{error}</p>
        )}
        <button
          type="submit"
          className="bg-[#00d4ff] text-[#020817] font-bold py-3 rounded tracking-widest uppercase text-sm hover:bg-[#00b8d9] transition-colors"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Access Forge
        </button>
      </form>
    </main>
  );
}