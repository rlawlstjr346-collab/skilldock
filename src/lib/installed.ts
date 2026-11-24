import type { InstallMethod, InstallScope, ToolTargetId } from "./types";

export const SKILLDOCK_INSTALLED_STORAGE_KEY = "skilldock_installed_history_v1";

export interface InstalledRecord {
  slug: string;
  kind: "skill" | "preset";
  presetSlug?: string;
  presetTitle?: string;
  tools: ToolTargetId[];
  scope: InstallScope;
  method: InstallMethod;
  installedAt: string;
}

export interface UpsertInstalledInput {
  slugs: string[];
  presetSlug?: string;
  presetTitle?: string;
  tools: ToolTargetId[];
  scope: InstallScope;
  method: InstallMethod;
  installedAt?: string;
}

const SLUG_RE = /^[a-z0-9-]+$/;

export function serializeInstalledParam(slugs: string[]): string {
  const unique = Array.from(
    new Set(
      slugs
        .map((s) => s.trim().toLowerCase())
        .filter((s) => SLUG_RE.test(s)),
    ),
  );
  return unique.join(",");
}

export function deserializeInstalledParam(
  raw: string | null | undefined,
  validSlugs?: Set<string>,
): string[] {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SLUG_RE.test(s));
  const unique = Array.from(new Set(parts));
  if (!validSlugs) return unique;
  return unique.filter((s) => validSlugs.has(s));
}

export function loadInstalledHistory(): InstalledRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKILLDOCK_INSTALLED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is InstalledRecord =>
        Boolean(item) &&
        typeof item.slug === "string" &&
        SLUG_RE.test(item.slug) &&
        Array.isArray(item.tools) &&
        typeof item.installedAt === "string",
    );
  } catch {
    return [];
  }
}

export function saveInstalledHistory(records: InstalledRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SKILLDOCK_INSTALLED_STORAGE_KEY,
      JSON.stringify(records),
    );
  } catch {
    // ignore storage quota errors
  }
}

export function upsertInstalledRecords(
  existing: InstalledRecord[],
  input: UpsertInstalledInput,
): InstalledRecord[] {
  const nowIso = input.installedAt ?? new Date().toISOString();
  const bySlug = new Map<string, InstalledRecord>();

  for (const rec of existing) {
    bySlug.set(rec.slug, rec);
  }

  for (const rawSlug of input.slugs) {
    const slug = rawSlug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) continue;
    const prev = bySlug.get(slug);
    const mergedTools = Array.from(
      new Set<ToolTargetId>([...(prev?.tools ?? []), ...input.tools]),
    );
    bySlug.set(slug, {
      slug,
      kind: input.presetSlug ? "preset" : prev?.kind ?? "skill",
      presetSlug: input.presetSlug ?? prev?.presetSlug,
      presetTitle: input.presetTitle ?? prev?.presetTitle,
      tools: mergedTools.length > 0 ? mergedTools : ["claude-code"],
      scope: input.scope,
      method: input.method,
      installedAt: nowIso,
    });
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    b.installedAt.localeCompare(a.installedAt),
  );
}

export function removeInstalledRecord(
  existing: InstalledRecord[],
  slug: string,
): InstalledRecord[] {
  return existing.filter((r) => r.slug !== slug);
}

export function mergeRestoredInstalledSlugs(
  existing: InstalledRecord[],
  slugs: string[],
  defaultTools: ToolTargetId[],
  nowIso = new Date().toISOString(),
): InstalledRecord[] {
  const existingSet = new Set(existing.map((r) => r.slug));
  const newOnes = slugs.filter((s) => SLUG_RE.test(s) && !existingSet.has(s));
  if (newOnes.length === 0) return existing;
  return upsertInstalledRecords(existing, {
    slugs: newOnes,
    tools: defaultTools.length > 0 ? defaultTools : ["claude-code"],
    scope: "project",
    method: "ai-chat-prompt",
    installedAt: nowIso,
  });
}

export function getInstallMethodLabel(method: InstallMethod): string {
  switch (method) {
    case "ai-chat-prompt":
      return "AI 자동설치문";
    case "web-builder-pack":
      return "웹 빌더 프롬프트 팩";
    case "live-bridge":
      return "Live Bridge 직접 장착";
  }
}

export function getMostUsedTools(
  records: InstalledRecord[],
  fallback: ToolTargetId[],
): ToolTargetId[] {
  if (records.length === 0) return fallback;
  const counts = new Map<ToolTargetId, number>();
  for (const r of records) {
    for (const t of r.tools) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tool]) => tool);
  return sorted.length > 0 ? sorted.slice(0, 3) : fallback;
}
