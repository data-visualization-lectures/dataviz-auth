"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackSignupCompleted } from "@/lib/analytics/events";

export function GaSignupTracker() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ga = searchParams.get("ga");
    const method = searchParams.get("method");
    const academia = searchParams.get("academia");
    if (ga === "signup_completed" && method) {
      trackSignupCompleted(
        method as "email" | "google" | "apple",
        academia === "1",
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  return null;
}
