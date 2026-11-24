import React from "react";
import type { ToolTargetId } from "@/lib/types";

export function SkilldockLogo({ className = "h-6" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="22"
          height="22"
          rx="4"
          fill="#131822"
          stroke="#2A3447"
          strokeWidth="1.2"
        />
        <path
          d="M7 6H4.5V18H7"
          stroke="#38BDF8"
          strokeWidth="1.8"
          strokeLinecap="square"
        />
        <path
          d="M17 6H19.5V18H17"
          stroke="#10B981"
          strokeWidth="1.8"
          strokeLinecap="square"
        />
        <rect x="8.5" y="7.5" width="7" height="3" rx="0.8" fill="#10B981" />
        <rect x="8.5" y="13.5" width="7" height="3" rx="0.8" fill="#38BDF8" />
      </svg>
      <span className="font-mono text-[14px] font-bold tracking-[0.12em] text-[#F1F5F9]">
        SKILL<span className="text-[#10B981]">DOCK</span>
      </span>
    </span>
  );
}

export function ToolIcon({
  tool,
  className = "w-3.5 h-3.5",
}: {
  tool: ToolTargetId;
  className?: string;
}) {
  switch (tool) {
    case "claude-code":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 4.5L7 8L3 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          <path d="M8.5 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      );
    case "gemini-agy":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case "cursor":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 2.5L13 7.5L8.2 9L6.5 13.5L3 2.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case "windsurf":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 11.5C4.5 9.5 6.5 9.5 8 11.5C9.5 13.5 11.5 13.5 13.5 11.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M2.5 6.5C4.5 4.5 6.5 4.5 8 6.5C9.5 8.5 11.5 8.5 13.5 6.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      );
    case "codex":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 6L7.5 8L5.5 10M9 10H11" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "web-builder":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 6H14M6 6V13" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
  }
}

export function FolderIcon({ open = true, className = "w-3.5 h-3.5" }: { open?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M1.5 3.5H6L7.5 5H14.5V12.5H1.5V3.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="currentColor"
          fillOpacity="0.12"
        />
      ) : (
        <path d="M1.5 3.5H6L7.5 5H14.5V12.5H1.5V3.5Z" stroke="currentColor" strokeWidth="1.3" />
      )}
    </svg>
  );
}

export function FileCodeIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 2H10L12.5 4.5V14H3.5V2Z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6.5 7.5L5 9L6.5 10.5M9.5 7.5L11 9L9.5 10.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function RadarPulseIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 8L12.5 4.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function LayersIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2 8.5L8 12L14 8.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2 11.2L8 14.5L14 11.2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function SearchIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 5.5V3C10.5 2.7 10.3 2.5 10 2.5H3C2.7 2.5 2.5 2.7 2.5 3V10C2.5 10.3 2.7 10.5 3 10.5H5.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" />
    </svg>
  );
}

export function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

export function CloseIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.5 2.5H13.5V6.5M13.5 2.5L7 9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
      <path d="M12 9.5V13.5H2.5V4H6.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function BridgePlugIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 2V5.5M10 2V5.5M4.5 5.5H11.5V8.5C11.5 10.4 9.9 12 8 12C6.1 12 4.5 10.4 4.5 8.5V5.5ZM8 12V14.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    </svg>
  );
}

export function AlertTriangleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2L14.5 13.5H1.5L8 2Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="miter" />
      <path d="M8 6.5V9.5M8 11.3V11.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function StarIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5L10 5.6L14.5 6.2L11.2 9.4L12 13.9L8 11.8L4 13.9L4.8 9.4L1.5 6.2L6 5.6L8 1.5Z" />
    </svg>
  );
}

export function TerminalPromptIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6.2L6.8 8.2L4.5 10.2M8.2 10.2H11.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
    </svg>
  );
}
