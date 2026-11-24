import React from "react";
import { parseHighlightSegments } from "@/lib/highlight";

interface HighlightTextProps {
  text: string;
  tone?: "emerald" | "cyan";
  className?: string;
}

/**
 * Renders `==highlighted==` phrases as crisp dark-editor tinted `<mark>` spans.
 * Guarantees zero raw `==` markers in production UI.
 */
export function HighlightText({
  text,
  tone = "emerald",
  className = "",
}: HighlightTextProps) {
  const segments = parseHighlightSegments(text);
  const markClass =
    tone === "cyan"
      ? "bg-[#38BDF8]/18 text-[#7DD3FC] border-b border-[#38BDF8]/60 px-1 py-0.5 rounded-[2px] font-semibold"
      : "bg-[#10B981]/18 text-[#6EE7B7] border-b border-[#10B981]/60 px-1 py-0.5 rounded-[2px] font-semibold";

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
