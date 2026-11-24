import type { ContextWeightTier, RoleSlot, SkillItem } from "./types";

export const DOCK_SOFT_TOKEN_LIMIT = 4500;
export const DOCK_HARD_TOKEN_LIMIT = 8000;

export interface RoleConflictWarning {
  roleSlot: RoleSlot;
  roleLabelKo: string;
  skillSlugs: string[];
  skillNames: string[];
  messageKo: string;
}

export interface DockAnalysis {
  totalTokens: number;
  weightTier: ContextWeightTier;
  percentOfBudget: number;
  isHeavyWarning: boolean;
  heavyMessageKo: string | null;
  conflicts: RoleConflictWarning[];
}

export function classifyWeightTier(tokens: number): ContextWeightTier {
  if (tokens <= 1800) return "초경량";
  if (tokens <= DOCK_SOFT_TOKEN_LIMIT) return "보통";
  return "무거움";
}

export function analyzeDockSkills(skills: SkillItem[]): DockAnalysis {
  const totalTokens = skills.reduce((sum, s) => sum + s.contextTokens, 0);
  const weightTier = classifyWeightTier(totalTokens);
  const percentOfBudget = Math.min(
    100,
    Math.round((totalTokens / DOCK_HARD_TOKEN_LIMIT) * 100),
  );

  const byRole = new Map<RoleSlot, SkillItem[]>();
  for (const skill of skills) {
    const arr = byRole.get(skill.roleSlot) ?? [];
    arr.push(skill);
    byRole.set(skill.roleSlot, arr);
  }

  const conflicts: RoleConflictWarning[] = [];
  for (const [roleSlot, items] of byRole.entries()) {
    if (items.length >= 2) {
      const names = items.map((i) => i.name);
      const roleLabelKo = items[0].roleLabelKo;
      conflicts.push({
        roleSlot,
        roleLabelKo,
        skillSlugs: items.map((i) => i.slug),
        skillNames: names,
        messageKo: `${roleLabelKo} 역할이 중복 장착되었습니다 (${names.join(" + ")}). 지침 충돌과 토큰 낭비를 막으려면 1개만 남기는 것을 권장합니다.`,
      });
    }
  }

  const isHeavyWarning = totalTokens > DOCK_SOFT_TOKEN_LIMIT;
  const heavyMessageKo = isHeavyWarning
    ? `현재 상시 컨텍스트 점유량이 약 ${totalTokens.toLocaleString("en-US")} tokens로 다소 무겁습니다. 코딩 세션 집중도를 높이려면 당장 안 쓰는 스킬을 빼고 4,500 tokens 이하로 유지하세요.`
    : null;

  return {
    totalTokens,
    weightTier,
    percentOfBudget,
    isHeavyWarning,
    heavyMessageKo,
    conflicts,
  };
}

export function serializeDockParam(slugs: string[]): string {
  const unique = Array.from(
    new Set(
      slugs
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z0-9-]+$/.test(s)),
    ),
  );
  return unique.join(",");
}

export function deserializeDockParam(
  raw: string | null | undefined,
  validSlugs?: Set<string>,
): string[] {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]+$/.test(s));
  const unique = Array.from(new Set(parts));
  if (!validSlugs) return unique;
  return unique.filter((s) => validSlugs.has(s));
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return String(stars);
}
