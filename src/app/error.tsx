"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-dark dark:text-white">
      <h1 className="text-4xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted mb-6">{error.message || "An unexpected error occurred"}</p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
