"use client";

import React, { useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildProCliCommands,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import {
  TOOL_TARGETS,
  type InstallScope,
  type SkillItem,
  type ToolTargetId,
} from "@/lib/types";
import {
  AlertTriangleIcon,
  BridgePlugIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  TerminalPromptIcon,
} from "./Icons";

export type InstallModalMode = "beginner-chat" | "web-builder" | "live-bridge";

export interface BridgeInstalledEntry {
  tool: string;
  slug: string;
  name: string;
  filePath: string;
  enabled: boolean;
}

interface InstallModalProps {
  open: boolean;
  mode: InstallModalMode;
  onClose: () => void;
  onSwitchMode: (mode: InstallModalMode) => void;
  dockSkills: SkillItem[];
  selectedTools: ToolTargetId[];
  scope: InstallScope;
  bridgeConnected: boolean;
  bridgeDetectedTools: Record<string, boolean>;
  bridgeCwd: string;
  bridgeInstalled: BridgeInstalledEntry[];
  onRefreshBridge: () => Promise<void>;
}

const BRIDGE_BASE = "http://127.0.0.1:4789";

export function InstallModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  dockSkills,
  selectedTools,
  scope,
  bridgeConnected,
  bridgeDetectedTools,
  bridgeCwd,
  bridgeInstalled,
  onRefreshBridge,
}: InstallModalProps) {
  const [subTab, setSubTab] = useState<"korean-prompt" | "pro-cli">(
    "korean-prompt",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeLog, setBridgeLog] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [projectDir, setProjectDir] = useState<string>(bridgeCwd);

  if (!open) return null;

  const beginnerPrompt = buildBeginnerAutoInstallPrompt(
    dockSkills,
    selectedTools,
    scope,
  );
  const proCli = buildProCliCommands(dockSkills, selectedTools, scope);
  const webPack = buildWebBuilderPromptPack(dockSkills, 6500);

  const localTools = selectedTools.filter((t) => t !== "web-builder");
  const effectiveLocalTools: ToolTargetId[] =
    localTools.length > 0 ? localTools : ["claude-code", "gemini-agy"];

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  }

  async function handleBridgeInstall() {
    setBridgeBusy(true);
    setBridgeError(null);
    setBridgeLog(null);
    try {
      const targetTool = effectiveLocalTools[0];
      const payload = {
        scope,
        projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
        tools: effectiveLocalTools,
        skills: dockSkills.map((s) => ({
          slug: s.slug,
          name: s.name,
          repoUrl: s.repoUrl,
          content: buildToolFilePreview(s, targetTool, scope).content,
        })),
      };
      const res = await fetch(`${BRIDGE_BASE}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setBridgeLog(
        `장착 완료 (${json.writtenFiles.length}개 파일 생성/갱신, 백업 ${json.backups.length}건): ${json.writtenFiles.join(", ")}`,
      );
      await onRefreshBridge();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  async function handleBridgeToggle(entry: BridgeInstalledEntry) {
    setBridgeBusy(true);
    setBridgeError(null);
    try {
      const res = await fetch(`${BRIDGE_BASE}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
          tool: entry.tool,
          slug: entry.slug,
          enabled: !entry.enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBridgeLog(
        `${entry.slug} (${entry.tool}) → ${json.enabled ? "ON 활성화" : "OFF 비활성화"} 완료`,
      );
      await onRefreshBridge();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  async function handleBridgeUninstall(entry: BridgeInstalledEntry) {
    setBridgeBusy(true);
    setBridgeError(null);
    try {
      const res = await fetch(`${BRIDGE_BASE}/uninstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
          tool: entry.tool,
          slug: entry.slug,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBridgeLog(`${entry.slug} (${entry.tool}) 원상복구 제거 완료`);
      await onRefreshBridge();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="SKILLDOCK 원클릭 장착 실행창"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#131822] border border-[#222938]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F131B] border-b border-[#222938]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] font-bold text-[#10B981]">
              SKILLDOCK DEPLOY
            </span>
            <span className="text-[12px] text-[#C2CDDC]">
              장착 대상 {dockSkills.length}개 · 적용 범위:{" "}
              <strong className="text-[#F1F5F9]">
                {scope === "project"
                  ? "이 프로젝트 폴더만 (격리)"
                  : "내 컴퓨터 전체 (전역)"}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#C2CDDC] hover:text-[#F1F5F9] border border-[#222938] bg-[#161C28]"
            aria-label="창 닫기"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-[#222938] bg-[#0B0E14] text-[12px]">
          <button
            type="button"
            onClick={() => onSwitchMode("beginner-chat")}
            className={`px-4 py-2.5 border-r border-[#222938] font-semibold ${
              mode === "beginner-chat"
                ? "bg-[#131822] text-[#10B981] border-t-2 border-t-[#10B981]"
                : "text-[#C2CDDC] hover:text-[#F1F5F9]"
            }`}
          >
            1. AI 채팅창 붙여넣기 자동 설치 (초보자 추천)
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode("web-builder")}
            className={`px-4 py-2.5 border-r border-[#222938] font-semibold ${
              mode === "web-builder"
                ? "bg-[#131822] text-[#38BDF8] border-t-2 border-t-[#38BDF8]"
                : "text-[#C2CDDC] hover:text-[#F1F5F9]"
            }`}
          >
            2. Lovable · Bolt · v0 프롬프트 팩
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode("live-bridge")}
            className={`px-4 py-2.5 border-r border-[#222938] font-semibold inline-flex items-center gap-1.5 ${
              mode === "live-bridge"
                ? "bg-[#131822] text-[#10B981] border-t-2 border-t-[#10B981]"
                : "text-[#C2CDDC] hover:text-[#F1F5F9]"
            }`}
          >
            <BridgePlugIcon className="w-3.5 h-3.5" />
            3. 내 PC 실시간 직결 장착 (Live Bridge)
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mode === "beginner-chat" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex border border-[#222938] bg-[#0B0E14]">
                  <button
                    type="button"
                    onClick={() => setSubTab("korean-prompt")}
                    className={`px-3 py-1.5 text-[12px] font-semibold ${
                      subTab === "korean-prompt"
                        ? "bg-[#10B981] text-[#0B0E14]"
                        : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                    }`}
                  >
                    초보자용 한글 자동설치 프롬프트 (터미널 0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab("pro-cli")}
                    className={`px-3 py-1.5 text-[12px] font-semibold inline-flex items-center gap-1.5 ${
                      subTab === "pro-cli"
                        ? "bg-[#38BDF8] text-[#0B0E14]"
                        : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                    }`}
                  >
                    <TerminalPromptIcon className="w-3.5 h-3.5" />
                    숙련자용 CLI 원라이너
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      subTab === "korean-prompt" ? beginnerPrompt : proCli,
                      subTab,
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] text-[#0B0E14] font-semibold text-[12px]"
                >
                  {copiedKey === subTab ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      클립보드 복사 완료
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      {subTab === "korean-prompt"
                        ? "한글 자동설치 프롬프트 복사"
                        : "CLI 원라이너 복사"}
                    </>
                  )}
                </button>
              </div>

              <div className="border border-[#222938] bg-[#161C28] px-3 py-2 text-[12px] text-[#C2CDDC]">
                {subTab === "korean-prompt"
                  ? `켜둔 AI 코딩 채팅창(${effectiveLocalTools
                      .map(
                        (id) =>
                          TOOL_TARGETS.find((t) => t.id === id)?.label ?? id,
                      )
                      .join(", ")})에 그대로 붙여넣고 엔터만 누르면, AI가 기존 파일을 백업한 뒤 스킬 파일을 자동 생성하고 결과를 보고합니다.`
                  : "터미널에 익숙한 개발자용 공식 CLI / npx skills / plugin 설치 명령입니다."}
              </div>

              <pre className="p-3.5 bg-[#0B0E14] border border-[#222938] font-mono text-[11.5px] leading-relaxed text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap max-h-[420px]">
                {subTab === "korean-prompt" ? beginnerPrompt : proCli}
              </pre>
            </>
          )}

          {mode === "web-builder" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] text-[#C2CDDC]">
                  압축 길이:{" "}
                  <span className="font-mono font-bold text-[#38BDF8]">
                    {webPack.length.toLocaleString("en-US")}자
                  </span>{" "}
                  / 6,500자 예산 (Lovable Knowledge · Bolt System Prompt · v0 Custom Instructions 호환)
                </div>
                <button
                  type="button"
                  onClick={() => copyText(webPack, "web-pack")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#38BDF8] text-[#0B0E14] font-semibold text-[12px]"
                >
                  {copiedKey === "web-pack" ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      웹 빌더 팩 복사 완료
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      Lovable · Bolt · v0 팩 복사
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 bg-[#0B0E14] border border-[#222938] font-mono text-[11.5px] leading-relaxed text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap max-h-[440px]">
                {webPack}
              </pre>
            </>
          )}

          {mode === "live-bridge" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border border-[#222938] bg-[#161C28] p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#F1F5F9]">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        bridgeConnected ? "bg-[#10B981]" : "bg-[#F59E0B]"
                      }`}
                    />
                    {bridgeConnected
                      ? "로컬 Live Bridge 연결됨 (http://127.0.0.1:4789)"
                      : "로컬 Live Bridge 미실행 상태 (무터미널 복사 모드 동작 중)"}
                  </div>
                  <div className="font-mono text-[11px] text-[#C2CDDC]">
                    감지된 로컬 CLI:{" "}
                    {Object.entries(bridgeDetectedTools)
                      .filter(([, ok]) => ok)
                      .map(([k]) => k)
                      .join(", ") || "감지 대기"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRefreshBridge}
                  className="px-3 py-1.5 border border-[#222938] bg-[#0B0E14] text-[12px] text-[#38BDF8] hover:border-[#38BDF8]"
                >
                  연결 상태 재확인
                </button>
              </div>

              {!bridgeConnected ? (
                <div className="border border-[#222938] bg-[#0B0E14] p-3.5 space-y-2.5 text-[12px] text-[#C2CDDC]">
                  <p className="text-[#F1F5F9] font-semibold">
                    로컬 PC에 Live Bridge 데몬을 1줄로 띄우면 복붙 없이 버튼 클릭만으로 장착·토글·원상복구가 가능합니다.
                  </p>
                  <div className="flex items-center justify-between gap-2 bg-[#161C28] border border-[#222938] px-3 py-2 font-mono text-[11.5px] text-[#10B981]">
                    <code>
                      curl -sS http://localhost:3000/bridge.mjs -o bridge.mjs && node bridge.mjs
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          "curl -sS http://localhost:3000/bridge.mjs -o bridge.mjs && node bridge.mjs",
                          "bridge-cmd",
                        )
                      }
                      className="shrink-0 px-2 py-1 border border-[#222938] bg-[#0B0E14] text-[#F1F5F9]"
                    >
                      {copiedKey === "bridge-cmd" ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <p>
                    보안 설계: 외부 패키지 0개(Node 내장 모듈만 사용),{" "}
                    <code className="text-[#38BDF8]">127.0.0.1:4789</code> 로컬 루프백 전용, Origin 검증, 경로 이탈 차단, 쓰기 전 자동 <code>.bak</code> 백업.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scope === "project" && (
                    <div className="border border-[#222938] bg-[#0B0E14] p-3">
                      <label className="block font-mono text-[11px] text-[#C2CDDC] mb-1">
                        대상 프로젝트 디렉터리 (격리 설치 경로)
                      </label>
                      <input
                        type="text"
                        value={projectDir}
                        onChange={(e) => setProjectDir(e.target.value)}
                        placeholder={bridgeCwd}
                        className="w-full px-2.5 py-1.5 bg-[#161C28] border border-[#222938] font-mono text-[12px] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[12px] text-[#C2CDDC]">
                      대상 툴:{" "}
                      <span className="text-[#F1F5F9] font-semibold">
                        {effectiveLocalTools.join(", ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={bridgeBusy || dockSkills.length === 0}
                      onClick={handleBridgeInstall}
                      className="px-4 py-2 bg-[#10B981] text-[#0B0E14] font-bold text-[12px] disabled:opacity-40"
                    >
                      {bridgeBusy
                        ? "안전 백업 및 장착 중..."
                        : `백업 후 ${dockSkills.length}개 스킬 즉시 로컬 장착`}
                    </button>
                  </div>

                  {bridgeLog && (
                    <div className="border border-[#10B981]/50 bg-[#10B981]/10 p-2.5 text-[12px] text-[#6EE7B7] font-mono break-all">
                      {bridgeLog}
                    </div>
                  )}
                  {bridgeError && (
                    <div className="border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-2.5 text-[12px] text-[#F59E0B] flex items-center gap-2">
                      <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                      <span>{bridgeError}</span>
                    </div>
                  )}

                  <div className="border border-[#222938] bg-[#0B0E14]">
                    <div className="px-3 py-2 border-b border-[#222938] bg-[#161C28] font-mono text-[11px] text-[#C2CDDC] flex justify-between">
                      <span>현재 대상 폴더에 장착된 SKILLDOCK 매니페스트</span>
                      <span>{bridgeInstalled.length}건</span>
                    </div>
                    {bridgeInstalled.length === 0 ? (
                      <div className="p-3 text-[12px] text-[#C2CDDC]">
                        아직 장착된 스킬이 없습니다. 위 버튼을 누르면 백업 후 안전하게 생성됩니다.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#222938]">
                        {bridgeInstalled.map((entry) => (
                          <div
                            key={`${entry.tool}:${entry.slug}`}
                            className="px-3 py-2 flex items-center justify-between gap-2 text-[12px]"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-[#F1F5F9]">
                                {entry.name}{" "}
                                <span className="font-mono text-[11px] text-[#38BDF8]">
                                  [{entry.tool}]
                                </span>
                              </div>
                              <div className="font-mono text-[10.5px] text-[#C2CDDC] truncate">
                                {entry.filePath}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={bridgeBusy}
                                onClick={() => handleBridgeToggle(entry)}
                                className={`px-2 py-1 font-mono text-[11px] border ${
                                  entry.enabled
                                    ? "border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]"
                                    : "border-[#222938] bg-[#161C28] text-[#C2CDDC]"
                                }`}
                              >
                                {entry.enabled ? "ON" : "OFF"}
                              </button>
                              <button
                                type="button"
                                disabled={bridgeBusy}
                                onClick={() => handleBridgeUninstall(entry)}
                                className="px-2 py-1 font-mono text-[11px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                              >
                                원상복구
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
