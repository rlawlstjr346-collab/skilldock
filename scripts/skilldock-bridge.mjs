#!/usr/bin/env node
/**
 * SKILLDOCK Local Live Bridge Daemon (Zero External Dependencies)
 * - Strictly binds to 127.0.0.1:4789
 * - Validates Origin allowlist
 * - Blocks all path traversal (`..`) and escapes outside allowed target root
 * - Read-only on startup: writes 0 bytes until explicit user POST action
 * - Always creates `.bak.<timestamp>` backup before modifying existing rule files
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number(process.env.SKILLDOCK_BRIDGE_PORT || 4789);
const VERSION = "1.0.0";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "https://skilldock.vercel.app",
]);

const TOOL_CONFIG = {
  "claude-code": {
    skillDir: ".claude/skills",
    ruleFile: "CLAUDE.md",
    ext: "SKILL.md",
    nestedDir: true,
  },
  "gemini-agy": {
    skillDir: ".gemini/skills",
    projectSkillDirs: [".gemini/skills"],
    globalSkillDirs: [".gemini/skills"],
    ruleFile: "GEMINI.md",
    globalRuleFile: ".gemini/GEMINI.md",
    ext: "SKILL.md",
    nestedDir: true,
  },
  agy: {
    skillDir: ".agent/skills",
    projectSkillDirs: [".agent/skills", ".gemini/skills"],
    globalSkillDirs: [".gemini/skills"],
    ruleFile: "GEMINI.md",
    globalRuleFile: ".gemini/GEMINI.md",
    ext: "SKILL.md",
    nestedDir: true,
  },
  cursor: {
    skillDir: ".cursor/rules",
    ruleFile: ".cursor/rules/skilldock.mdc",
    ext: ".mdc",
    nestedDir: false,
  },
  windsurf: {
    skillDir: ".windsurf/rules",
    ruleFile: ".windsurf/rules/skilldock.md",
    ext: ".md",
    nestedDir: false,
  },
  codex: {
    skillDir: ".agents/skills",
    ruleFile: "AGENTS.md",
    ext: "SKILL.md",
    nestedDir: true,
  },
};

export function validateSlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    throw new Error(`Invalid skill slug: ${String(slug)}`);
  }
  return slug;
}

export function assertSafeSubpath(rootDir, targetPath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);
  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error(`Path traversal blocked: ${targetPath}`);
  }
  if (targetPath.includes("..")) {
    throw new Error(`Relative traversal blocked: ${targetPath}`);
  }
  return resolvedTarget;
}

export function detectInstalledTools() {
  const bins = ["claude", "gemini", "agy", "codex", "cursor", "windsurf"];
  const detected = {};
  for (const bin of bins) {
    try {
      const out = execSync(`command -v ${bin}`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString("utf8")
        .trim();
      detected[bin] = Boolean(out);
    } catch {
      detected[bin] = false;
    }
  }
  return detected;
}

function readManifest(rootDir) {
  const manifestPath = assertSafeSubpath(
    rootDir,
    path.join(rootDir, ".skilldock-manifest.json"),
  );
  if (!fs.existsSync(manifestPath)) {
    return { version: 1, updatedAt: null, installed: {} };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(rootDir, manifest) {
  const manifestPath = assertSafeSubpath(
    rootDir,
    path.join(rootDir, ".skilldock-manifest.json"),
  );
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifestPath;
}

function backupIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.skilldock.bak.${stamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function upsertManagedRuleBlock(rulePath, activeSkills) {
  const startMarker = "<!-- SKILLDOCK:START -->";
  const endMarker = "<!-- SKILLDOCK:END -->";
  const backupPath = backupIfExists(rulePath);
  const existing = fs.existsSync(rulePath)
    ? fs.readFileSync(rulePath, "utf8")
    : "";

  const enabledList = activeSkills.filter((s) => s.enabled !== false);
  const blockBody =
    enabledList.length > 0
      ? [
          startMarker,
          "## SKILLDOCK 장착 스킬 목록",
          ...enabledList.map(
            (s) => `- **${s.name || s.slug}** (\`${s.slug}\`): ${s.repoUrl || ""}`,
          ),
          endMarker,
        ].join("\n")
      : "";

  const blockRe = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "m");
  let nextContent;
  if (blockRe.test(existing)) {
    nextContent = blockBody
      ? existing.replace(blockRe, blockBody)
      : existing.replace(blockRe, "").trimEnd() + "\n";
  } else if (blockBody) {
    nextContent = existing
      ? `${existing.trimEnd()}\n\n${blockBody}\n`
      : `${blockBody}\n`;
  } else {
    nextContent = existing;
  }

  fs.mkdirSync(path.dirname(rulePath), { recursive: true });
  fs.writeFileSync(rulePath, nextContent, "utf8");
  return backupPath;
}

function resolveSkillDirsForScope(cfg, scope = "project") {
  if (scope === "global") {
    return cfg.globalSkillDirs || [cfg.skillDir];
  }
  return cfg.projectSkillDirs || [cfg.skillDir];
}

function resolveRuleFileForScope(cfg, scope = "project") {
  if (scope === "global" && cfg.globalRuleFile) {
    return cfg.globalRuleFile;
  }
  return cfg.ruleFile;
}

function resolveSkillFilePaths(
  rootDir,
  tool,
  slug,
  enabled = true,
  scope = "project",
) {
  const cfg = TOOL_CONFIG[tool];
  if (!cfg) throw new Error(`Unsupported local bridge tool: ${tool}`);
  validateSlug(slug);
  const suffix = enabled ? "" : ".disabled";
  const dirs = resolveSkillDirsForScope(cfg, scope);
  return dirs.map((dir) => {
    if (cfg.nestedDir) {
      return assertSafeSubpath(
        rootDir,
        path.join(rootDir, dir, slug, `${cfg.ext}${suffix}`),
      );
    }
    return assertSafeSubpath(
      rootDir,
      path.join(rootDir, dir, `${slug}${cfg.ext}${suffix}`),
    );
  });
}

function collectRuleEntriesForRuleFile(manifest, ruleFileRel, fallbackScope = "project") {
  const bySlug = new Map();
  for (const entry of Object.values(manifest.installed)) {
    const entryCfg = TOOL_CONFIG[entry.tool];
    if (!entryCfg) continue;
    const entryRuleFile =
      entry.ruleFile || resolveRuleFileForScope(entryCfg, entry.scope || fallbackScope);
    if (entryRuleFile !== ruleFileRel) continue;
    const prev = bySlug.get(entry.slug);
    if (!prev || (prev.enabled === false && entry.enabled !== false)) {
      bySlug.set(entry.slug, entry);
    }
  }
  return Array.from(bySlug.values());
}

function isPathClaimedByOtherEntry(manifest, excludeKey, targetPath, onlyEnabled = false) {
  for (const [k, entry] of Object.entries(manifest.installed)) {
    if (k === excludeKey) continue;
    if (onlyEnabled && entry.enabled === false) continue;
    const paths = Array.isArray(entry.filePaths)
      ? entry.filePaths
      : entry.filePath
        ? [entry.filePath]
        : [];
    if (paths.includes(targetPath)) return true;
  }
  return false;
}

/**
 * Pure filesystem operations exported for isolated unit testing in os.tmpdir().
 */
export function installSkillsToRoot({ rootDir, tools, skills, scope = "project" }) {
  if (!rootDir || typeof rootDir !== "string") {
    throw new Error("rootDir is required");
  }
  const safeRoot = path.resolve(rootDir);
  const normalizedScope = scope === "global" ? "global" : "project";
  const targetTools = (tools || []).filter((t) => Boolean(TOOL_CONFIG[t]));
  if (targetTools.length === 0) {
    throw new Error("At least one valid local tool target is required");
  }
  if (!Array.isArray(skills) || skills.length === 0) {
    throw new Error("At least one skill payload is required");
  }

  const manifest = readManifest(safeRoot);
  const writtenFiles = [];
  const backups = [];
  const touchedRuleFiles = new Set();

  for (const tool of targetTools) {
    const cfg = TOOL_CONFIG[tool];
    const ruleFileRel = resolveRuleFileForScope(cfg, normalizedScope);
    for (const skill of skills) {
      const slug = validateSlug(skill.slug);
      const skillFiles = resolveSkillFilePaths(
        safeRoot,
        tool,
        slug,
        true,
        normalizedScope,
      );
      const disabledFiles = resolveSkillFilePaths(
        safeRoot,
        tool,
        slug,
        false,
        normalizedScope,
      );
      for (const disabledFile of disabledFiles) {
        if (fs.existsSync(disabledFile)) fs.unlinkSync(disabledFile);
      }

      const content =
        String(skill.content || skill.skillMdTemplate || "").trim() + "\n";

      for (const skillFile of skillFiles) {
        fs.mkdirSync(path.dirname(skillFile), { recursive: true });
        const bak = backupIfExists(skillFile);
        if (bak) backups.push(bak);
        fs.writeFileSync(skillFile, content, "utf8");
        writtenFiles.push(skillFile);
      }

      const key = `${tool}:${slug}`;
      manifest.installed[key] = {
        tool,
        slug,
        name: skill.name || slug,
        repoUrl: skill.repoUrl || "",
        scope: normalizedScope,
        ruleFile: ruleFileRel,
        filePath: skillFiles[0],
        filePaths: skillFiles,
        enabled: true,
        installedAt: new Date().toISOString(),
      };
    }

    touchedRuleFiles.add(ruleFileRel);
  }

  for (const ruleFileRel of touchedRuleFiles) {
    const rulePath = assertSafeSubpath(safeRoot, path.join(safeRoot, ruleFileRel));
    const ruleSkills = collectRuleEntriesForRuleFile(
      manifest,
      ruleFileRel,
      normalizedScope,
    );
    const ruleBak = upsertManagedRuleBlock(rulePath, ruleSkills);
    if (ruleBak) backups.push(ruleBak);
    writtenFiles.push(rulePath);
  }

  const manifestPath = writeManifest(safeRoot, manifest);
  return { ok: true, rootDir: safeRoot, writtenFiles, backups, manifestPath, manifest };
}

export function toggleSkillInRoot({
  rootDir,
  tool,
  slug,
  enabled,
  scope = "",
}) {
  const safeRoot = path.resolve(rootDir);
  validateSlug(slug);
  const manifest = readManifest(safeRoot);
  const key = `${tool}:${slug}`;
  const entry = manifest.installed[key];
  if (!entry) {
    throw new Error(`Skill not installed in manifest: ${key}`);
  }

  const effectiveScope =
    scope === "global" || scope === "project"
      ? scope
      : entry.scope || "project";
  const activePaths = resolveSkillFilePaths(
    safeRoot,
    tool,
    slug,
    true,
    effectiveScope,
  );
  const disabledPaths = resolveSkillFilePaths(
    safeRoot,
    tool,
    slug,
    false,
    effectiveScope,
  );

  if (enabled) {
    for (let i = 0; i < activePaths.length; i++) {
      if (fs.existsSync(disabledPaths[i])) {
        fs.renameSync(disabledPaths[i], activePaths[i]);
      }
    }
    entry.enabled = true;
    entry.filePath = activePaths[0];
    entry.filePaths = activePaths;
  } else {
    for (let i = 0; i < activePaths.length; i++) {
      if (
        fs.existsSync(activePaths[i]) &&
        !isPathClaimedByOtherEntry(manifest, key, activePaths[i], true)
      ) {
        fs.renameSync(activePaths[i], disabledPaths[i]);
      }
    }
    entry.enabled = false;
    entry.filePath = disabledPaths[0];
    entry.filePaths = disabledPaths;
  }

  const cfg = TOOL_CONFIG[tool];
  const ruleFileRel =
    entry.ruleFile || resolveRuleFileForScope(cfg, effectiveScope);
  const rulePath = assertSafeSubpath(safeRoot, path.join(safeRoot, ruleFileRel));
  const ruleSkills = collectRuleEntriesForRuleFile(
    manifest,
    ruleFileRel,
    effectiveScope,
  );
  upsertManagedRuleBlock(rulePath, ruleSkills);
  writeManifest(safeRoot, manifest);

  return { ok: true, key, enabled: entry.enabled, filePath: entry.filePath };
}

export function uninstallSkillFromRoot({
  rootDir,
  tool,
  slug,
  scope = "",
}) {
  const safeRoot = path.resolve(rootDir);
  validateSlug(slug);
  const manifest = readManifest(safeRoot);
  const key = `${tool}:${slug}`;
  const prevEntry = manifest.installed[key];
  const effectiveScope =
    scope === "global" || scope === "project"
      ? scope
      : prevEntry?.scope || "project";
  const removed = [];

  delete manifest.installed[key];

  for (const state of [true, false]) {
    const filePaths = resolveSkillFilePaths(
      safeRoot,
      tool,
      slug,
      state,
      effectiveScope,
    );
    for (const filePath of filePaths) {
      if (
        fs.existsSync(filePath) &&
        !isPathClaimedByOtherEntry(manifest, key, filePath, false)
      ) {
        fs.unlinkSync(filePath);
        removed.push(filePath);
      }
    }
  }

  const cfg = TOOL_CONFIG[tool];
  if (cfg?.nestedDir) {
    for (const dir of resolveSkillDirsForScope(cfg, effectiveScope)) {
      const skillDir = assertSafeSubpath(
        safeRoot,
        path.join(safeRoot, dir, slug),
      );
      if (fs.existsSync(skillDir) && fs.readdirSync(skillDir).length === 0) {
        fs.rmdirSync(skillDir);
      }
    }
  }

  const ruleFileRel =
    prevEntry?.ruleFile || resolveRuleFileForScope(cfg, effectiveScope);
  const rulePath = assertSafeSubpath(safeRoot, path.join(safeRoot, ruleFileRel));
  const ruleSkills = collectRuleEntriesForRuleFile(
    manifest,
    ruleFileRel,
    effectiveScope,
  );
  if (fs.existsSync(rulePath)) {
    upsertManagedRuleBlock(rulePath, ruleSkills);
  }
  writeManifest(safeRoot, manifest);

  return { ok: true, key, removed };
}

function sendJson(res, status, payload, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function resolveTargetRoot(scope, projectDir) {
  if (scope === "global") {
    return os.homedir();
  }
  const chosen = projectDir ? path.resolve(projectDir) : process.cwd();
  if (projectDir && projectDir.includes("..")) {
    throw new Error("Path traversal blocked in projectDir");
  }
  return chosen;
}

export function createBridgeServer() {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return sendJson(res, 403, { error: "Origin not allowed" });
    }
    if (req.method === "OPTIONS") {
      return sendJson(res, 204, {}, origin);
    }

    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);

    try {
      if (req.method === "GET" && urlObj.pathname === "/health") {
        return sendJson(
          res,
          200,
          {
            ok: true,
            service: "skilldock-bridge",
            version: VERSION,
            mode: "read-only-idle",
            host: HOST,
            port: PORT,
            cwd: process.cwd(),
            detectedTools: detectInstalledTools(),
          },
          origin,
        );
      }

      if (req.method === "GET" && urlObj.pathname === "/status") {
        const scope = urlObj.searchParams.get("scope") || "project";
        const projectDir = urlObj.searchParams.get("projectDir") || undefined;
        const rootDir = resolveTargetRoot(scope, projectDir);
        const manifest = readManifest(rootDir);
        return sendJson(
          res,
          200,
          {
            ok: true,
            rootDir,
            detectedTools: detectInstalledTools(),
            installed: Object.values(manifest.installed),
          },
          origin,
        );
      }

      if (req.method === "POST" && urlObj.pathname === "/install") {
        const body = await readBody(req);
        const scope = body.scope || "project";
        const rootDir = resolveTargetRoot(scope, body.projectDir);
        const result = installSkillsToRoot({
          rootDir,
          scope,
          tools: body.tools,
          skills: body.skills,
        });
        return sendJson(res, 200, result, origin);
      }

      if (req.method === "POST" && urlObj.pathname === "/toggle") {
        const body = await readBody(req);
        const scope = body.scope || "project";
        const rootDir = resolveTargetRoot(scope, body.projectDir);
        const result = toggleSkillInRoot({
          rootDir,
          scope,
          tool: body.tool,
          slug: body.slug,
          enabled: Boolean(body.enabled),
        });
        return sendJson(res, 200, result, origin);
      }

      if (req.method === "POST" && urlObj.pathname === "/uninstall") {
        const body = await readBody(req);
        const scope = body.scope || "project";
        const rootDir = resolveTargetRoot(scope, body.projectDir);
        const result = uninstallSkillFromRoot({
          rootDir,
          scope,
          tool: body.tool,
          slug: body.slug,
        });
        return sendJson(res, 200, result, origin);
      }

      return sendJson(res, 404, { error: "Not Found" }, origin);
    } catch (err) {
      return sendJson(
        res,
        400,
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        origin,
      );
    }
  });
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const server = createBridgeServer();
  server.listen(PORT, HOST, () => {
    console.log(
      `[SKILLDOCK Bridge] Listening on http://${HOST}:${PORT} (read-only idle, 0 bytes written)`,
    );
  });
}
