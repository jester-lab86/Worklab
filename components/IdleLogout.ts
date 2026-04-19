"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export default function IdleLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      signOut({ callbackUrl: "/auth/signin" });
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}