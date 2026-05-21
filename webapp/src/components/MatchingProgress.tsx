"use client";

import type { AppStep } from "@/lib/types";

const MESSAGES: Partial<Record<AppStep, string>> = {
  analyzing: "Detecting and embedding your face…",
  matching:  "Searching through photos…",
};

interface Props {
  step: AppStep;
}

export default function MatchingProgress({ step }: Props) {
  const message = MESSAGES[step];
  if (!message) return null;

  return (
    <div className="flex flex-col items-center gap-5 py-12 animate-fade-in">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "#C231FF",
            borderRightColor: step === "matching" ? "#5AAFFE" : "transparent",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}
