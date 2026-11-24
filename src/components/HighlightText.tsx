import React from "react";
import { parseHighlightSegments } from "@/lib/highlight";

interface HighlightTextProps {
  text: string;
  tone?: "yellow" | "sky";
  className?: string;
}

/**
 * AI Radar-style soft yellow / sky highlighter `<mark>`.
 * Guarantees zero raw `==` markers ever reach the rendered DOM.
 */
export function HighlightText({
  text,
  tone = "yellow",
  className = "",
}: HighlightTextProps) {
  const segments = parseHighlightSegments(text);
  const markClass =
    tone === "sky"
      ? "bg-[#BAE6FD]/70 text-[#111827] px-1 py-0.5 rounded-[4px] font-semibold"
      : "bg-[#FEF08A]/85 text-[#111827] px-1 py-0.5 rounded-[4px] font-semibold";

  return (
    <span className={className}>
      {segments.map((seg, idx) =>
        seg.highlighted ? (
          <mark key={idx} className={markClass}>
            {seg.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        ),
      )}
    </span>
  );
}
