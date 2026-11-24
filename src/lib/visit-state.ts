export const LAST_VISIT_STORAGE_KEY = "skilldock_last_visit_ts";
export const READ_IDS_STORAGE_KEY = "skilldock_read_ids";
export const MAX_READ_IDS = 1000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 1:1 port of AI Radar visit-state:
 * Reads existing `skilldock_last_visit_ts` into session state on initial mount
 * and writes current `nowMs` back to storage.
 */
export function initSessionLastVisit(
  nowMs = Date.now(),
  storage: StorageLike | null = defaultStorage(),
): number | null {
  if (!storage) return null;
  let prevTs: number | null = null;
  try {
    const raw = storage.getItem(LAST_VISIT_STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= nowMs + 60_000) {
        prevTs = parsed;
      }
    }
    storage.setItem(LAST_VISIT_STORAGE_KEY, String(Math.floor(nowMs)));
  } catch {
    return prevTs;
  }
  return prevTs;
}

/** Load read item IDs (skills & presets) from localStorage (FIFO max 1,000) */
export function loadReadIds(
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(READ_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    return clean.slice(-MAX_READ_IDS);
  } catch {
    return [];
  }
}

/** Append newly read IDs with FIFO cap of MAX_READ_IDS (1,000) */
export function recordReadIds(
  currentIds: string[],
  idsToAdd: string[],
  storage: StorageLike | null = defaultStorage(),
): string[] {
  const filteredAdd = idsToAdd.filter(
    (id) => typeof id === "string" && id.trim().length > 0,
  );
  if (filteredAdd.length === 0) return currentIds;

  const existingSet = new Set(currentIds);
  const additions = filteredAdd.filter((id) => !existingSet.has(id));
  if (additions.length === 0) return currentIds;

  const next = [...currentIds, ...additions].slice(-MAX_READ_IDS);
  if (storage) {
    try {
      storage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export interface VisitDividerInfo {
  /** Block index in the displayed feed list immediately after the last new/unread item */
  afterIndex: number;
  /** Number of newly discovered / unread items above the divider */
  newCount: number;
}

export interface VisitTrackableEntry {
  id: string;
  timestampMs: number;
  isRead: boolean;
}

/**
 * Computes AI Radar-style VisitDivider boundary:
 * Places a subtle 1px divider immediately after the last newly discovered unread item
 * when there is at least 1 new/unread item above and at least 1 older/read item below.
 */
export function computeVisitDivider(
  entries: VisitTrackableEntry[],
  lastVisitTs: number | null,
): VisitDividerInfo | null {
  if (entries.length < 2) return null;

  let newCount = 0;
  let lastNewIndex = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isNewSinceVisit =
      lastVisitTs !== null && Number.isFinite(lastVisitTs)
        ? entry.timestampMs > lastVisitTs && !entry.isRead
        : !entry.isRead;

    if (isNewSinceVisit) {
      newCount += 1;
      lastNewIndex = i;
    }
  }

  // Only show divider if there are new items AND at least one already-seen/older item below them
  const hasOlderOrReadBelow =
    lastNewIndex >= 0 && lastNewIndex < entries.length - 1;
  const hasAnyRead = entries.some((e) => e.isRead);

  if (
    newCount === 0 ||
    !hasOlderOrReadBelow ||
    (lastVisitTs === null && !hasAnyRead)
  ) {
    return null;
  }

  return {
    afterIndex: lastNewIndex,
    newCount,
  };
}

export function formatVisitDividerLabel(
  info: Pick<VisitDividerInfo, "newCount">,
): string {
  return `여기까지 확인하셨습니다 · 새로 발견된 무기 ${info.newCount}건`;
}
