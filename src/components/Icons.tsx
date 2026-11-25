import React from "react";
import type { ToolTargetId } from "@/lib/types";

/**
 * AI Radar-inspired rounded black squircle emblem + crisp `SkillDock` sans-serif wordmark.
 */
export function SkillDockLogo({ compact = false }: { compact?: boolean }) {
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        viewBox="0 0 36 36"
        fill="none"
        className={`${sizeClass} shrink-0`}
        aria-hidden="true"
      >
        <rect x="0.5" y="0.5" width="35" height="35" rx="9" fill="#111827" />
        <path
          d="M12.5 10H9.5V26H12.5"
          stroke="#FFFFFF"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23.5 10H26.5V26H23.5"
          stroke="#FFFFFF"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="14" y="11.5" width="8" height="5" rx="1.5" fill="#10B981" />
        <rect x="14" y="19.5" width="8" height="5" rx="1.5" fill="#38BDF8" />
      </svg>
      <span
        className={`font-extrabold tracking-[-0.03em] text-[#111827] leading-none ${
          compact ? "text-[19px]" : "text-[21px]"
        }`}
      >
        SkillDock
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
          <path d="M3 4.5L7 8L3 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 11.5H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "gemini-agy":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.8L9.7 6.3L14.2 8L9.7 9.7L8 14.2L6.3 9.7L1.8 8L6.3 6.3L8 1.8Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "agy":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2.2L13.2 13.2L8 10.6L2.8 13.2L8 2.2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="7.2" r="1.1" fill="currentColor" />
        </svg>
      );
    case "cursor":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 2.5L13 7.5L8.2 9L6.5 13.5L3 2.5Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "windsurf":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 11.5C4.5 9.5 6.5 9.5 8 11.5C9.5 13.5 11.5 13.5 13.5 11.5"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          <path
            d="M2.5 6.5C4.5 4.5 6.5 4.5 8 6.5C9.5 8.5 11.5 8.5 13.5 6.5"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
          />
        </svg>
      );
    case "codex":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.35" />
          <path d="M5.5 6L7.5 8L5.5 10M9 10H11" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case "web-builder":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.35" />
          <path d="M2 6.2H14M6 6.2V13" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      );
  }
}

export function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 8.5L8 12L14 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11.3L8 14.5L14 11.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RadarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 8L12.3 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CompassIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 5.6L9.1 9.1L5.6 10.4L6.9 6.9L10.4 5.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function DockBagIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 4.5V3.5C5.5 2.4 6.4 1.5 7.5 1.5H8.5C9.6 1.5 10.5 2.4 10.5 3.5V4.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({
  className = "w-3.5 h-3.5",
  strokeWidth = 1.9,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 5.5V3.5C10.5 2.95 10.05 2.5 9.5 2.5H3.5C2.95 2.5 2.5 2.95 2.5 3.5V9.5C2.5 10.05 2.95 10.5 3.5 10.5H5.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.5 2.5H13.5V6.5M13.5 2.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9.5V12.5C12 13.05 11.55 13.5 11 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V5C2.5 4.45 2.95 4 3.5 4H6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 8H3M7 4L3 8L7 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.6L10 5.6L14.4 6.2L11.2 9.3L12 13.7L8 11.6L4 13.7L4.8 9.3L1.6 6.2L6 5.6L8 1.6Z" />
    </svg>
  );
}

export function BarChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="8" width="2.8" height="5.8" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6.6" y="4.5" width="2.8" height="9.3" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2.2" width="2.8" height="11.6" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function LightbulbIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.5 11.2C4.2 10.2 3.5 8.8 3.5 7.2C3.5 4.7 5.5 2.7 8 2.7C10.5 2.7 12.5 4.7 12.5 7.2C12.5 8.8 11.8 10.2 10.5 11.2V12.5C10.5 13.1 10 13.5 9.5 13.5H6.5C6 13.5 5.5 13.1 5.5 12.5V11.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.2 11.2H9.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BoltIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9 1.8L3.5 9H8L7 14.2L12.5 7H8L9 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function BridgeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 2V5.5M10 2V5.5M4.5 5.5H11.5V8.5C11.5 10.4 9.9 12 8 12C6.1 12 4.5 10.4 4.5 8.5V5.5ZM8 12V14.5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.2L14.2 13.3H1.8L8 2.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.5V9.5M8 11.4V11.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 5H6.2L8.4 15.2C8.55 15.9 9.17 16.4 9.88 16.4H17.8C18.5 16.4 19.11 15.92 19.27 15.24L20.8 8.6H7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.2" cy="19.8" r="1.4" fill="currentColor" />
      <circle cx="17.2" cy="19.8" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5H13M6 4.5V3C6 2.45 6.45 2 7 2H9C9.55 2 10 2.45 10 3V4.5M4.5 4.5L5.1 13C5.15 13.55 5.6 14 6.15 14H9.85C10.4 14 10.85 13.55 10.9 13L11.5 4.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArchiveDockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="2.5" width="11.6" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 5.7V12.2C3.2 12.9 3.8 13.5 4.5 13.5H11.5C12.2 13.5 12.8 12.9 12.8 12.2V5.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.2 9.4L7.5 10.7L10 8.2" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeGridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="2.2" width="11.6" height="4.4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.2" y="8.8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.8" y="8.8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1.2C4.24 1.2 1.2 4.24 1.2 8c0 3 1.94 5.55 4.65 6.45.34.06.46-.15.46-.33 0-.16-.01-.7-.01-1.27-1.89.41-2.29-.8-2.29-.8-.31-.79-.75-1-.75-1-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.61 1.04 1.59.74 1.98.57.06-.44.24-.74.43-.91-1.51-.17-3.1-.76-3.1-3.36 0-.74.27-1.35.7-1.83-.07-.17-.3-.87.07-1.8 0 0 .57-.18 1.87.7.54-.15 1.13-.23 1.71-.23.58 0 1.17.08 1.71.23 1.3-.88 1.87-.7 1.87-.7.37.93.14 1.63.07 1.8.43.48.7 1.09.7 1.83 0 2.61-1.59 3.19-3.11 3.36.24.21.46.63.46 1.27 0 .92-.01 1.66-.01 1.88 0 .18.12.4.47.33A6.803 6.803 0 0 0 14.8 8c0-3.76-3.04-6.8-6.8-6.8Z"
      />
    </svg>
  );
}

export function HuggingFaceIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" fill="#FFD21E" stroke="#B45309" strokeWidth="1" />
      <circle cx="5.9" cy="6.7" r="0.85" fill="#1D1D1F" />
      <circle cx="10.1" cy="6.7" r="0.85" fill="#1D1D1F" />
      <path d="M5.4 9.5C6.1 10.6 7 11.1 8 11.1C9 11.1 9.9 10.6 10.6 9.5" stroke="#1D1D1F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 13.7C7.7 13.5 2 9.8 2 5.7C2 3.7 3.5 2.3 5.3 2.3C6.4 2.3 7.4 2.9 8 3.8C8.6 2.9 9.6 2.3 10.7 2.3C12.5 2.3 14 3.7 14 5.7C14 9.8 8.3 13.5 8 13.7Z" />
    </svg>
  );
}

export function HistoryReadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.6 8.2L7.3 9.9L10.6 6.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
