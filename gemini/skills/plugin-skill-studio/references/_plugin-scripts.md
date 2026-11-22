# Plugin files: plugin-skill-studio — `scripts/`

Source: `plugins/plugin-skill-studio`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/plugin-eval.js`

```javascript
#!/usr/bin/env node

import { runCli } from "../src/eval/plugin-eval/cli.js";

runCli(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
```

## File: `scripts/plugin-studio.mjs`

```javascript
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ignoredDirectories = new Set([".git", "node_modules"]);
const supportedAppPrefixes = ["asdk_app_", "connector_", "templated_apps_"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function walk(root, visit) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}

function manifestInterface(manifest) {
  return manifest?.extensions?.["com.openai"]?.interface ?? manifest?.interface ?? null;
}

function componentSummary(pluginRoot) {
  const skillsRoot = path.join(pluginRoot, "skills");
  const skills = [];
  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md"))) skills.push(entry.name);
    }
  }
  return {
    skills: skills.sort(),
    appReference: fs.existsSync(path.join(pluginRoot, ".app.json")),
    mcpServer: fs.existsSync(path.join(pluginRoot, "mcp.json")) || fs.existsSync(path.join(pluginRoot, ".mcp.json"))
  };
}

export function inventory(rootInput) {
  const root = path.resolve(rootInput);
  if (!fs.existsSync(root)) throw new Error(`Source root does not exist: ${root}`);
  const records = [];
  walk(root, (file) => {
    const base = path.basename(file);
    const parent = path.basename(path.dirname(file));
    const portable = base === "plugin.json" && parent !== ".codex-plugin";
    const compatibility = base === "plugin.json" && parent === ".codex-plugin";
    if (!portable && !compatibility) return;
    try {
      const manifest = readJson(file);
      const pluginRoot = compatibility ? path.dirname(path.dirname(file)) : path.dirname(file);
      records.push({
        kind: portable ? "portable-manifest" : "codex-compatibility-manifest",
        path: toPosix(path.relative(root, file)) || base,
        pluginRoot: toPosix(path.relative(root, pluginRoot)) || ".",
        name: manifest.name ?? null,
        version: manifest.version ?? null,
        author: manifest.author?.name ?? null,
        license: manifest.license ?? null,
        displayName: manifestInterface(manifest)?.displayName ?? null,
        components: componentSummary(pluginRoot)
      });
    } catch (error) {
      records.push({ kind: "invalid-manifest", path: toPosix(path.relative(root, file)), error: error.message });
    }
  });
  return { root, count: records.length, records: records.sort((a, b) => a.path.localeCompare(b.path)) };
}

function parseSkillFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { error: "SKILL.md is missing YAML frontmatter" };
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return { name, description };
}

function finding(severity, code, message, file = null) {
  return { severity, code, message, file };
}

export function validate(pluginRootInput) {
  const pluginRoot = path.resolve(pluginRootInput);
  const findings = [];
  const portableFile = path.join(pluginRoot, "plugin.json");
  const compatFile = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  let portable = null;
  let compatibility = null;

  if (fs.existsSync(portableFile)) {
    try { portable = readJson(portableFile); }
    catch (error) { findings.push(finding("error", "manifest.portable.invalid-json", error.message, portableFile)); }
  }

  if (fs.existsSync(compatFile)) {
    try { compatibility = readJson(compatFile); }
    catch (error) { findings.push(finding("error", "manifest.compat.invalid-json", error.message, compatFile)); }
  }

  const primary = portable ?? compatibility;
  const primaryFile = portable ? portableFile : compatFile;
  if (!primary) findings.push(finding("error", "manifest.missing", "Either root plugin.json or .codex-plugin/plugin.json is required.", pluginRoot));

  if (primary) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(primary.name ?? "")) findings.push(finding("error", "manifest.name", "Plugin name must be lowercase kebab-case.", primaryFile));
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(primary.version ?? "")) findings.push(finding("error", "manifest.version", "Plugin version must be semantic versioning.", primaryFile));
    if (!primary.author?.name) findings.push(finding("error", "manifest.author", "Plugin author name is required.", primaryFile));
    if (!primary.license) findings.push(finding("warning", "manifest.license", "Declare the package license or proprietary status.", primaryFile));
    const ui = manifestInterface(primary);
    if (!ui?.displayName) findings.push(finding("error", "interface.display-name", "Display name is required.", primaryFile));
    if (!ui?.shortDescription) findings.push(finding("error", "interface.short-description", "Short description is required.", primaryFile));
    else if ([...ui.shortDescription].length > 30) findings.push(finding("error", "interface.short-description-length", "Short description must be 30 characters or fewer.", primaryFile));
    for (const key of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      if (!ui?.[key]) findings.push(finding("error", `interface.${key}`, `${key} is required for a publishable candidate.`, primaryFile));
      else {
        try { new URL(ui[key]); }
        catch { findings.push(finding("error", `interface.${key}-invalid`, `${key} must be an absolute URL.`, primaryFile)); }
      }
    }
    for (const key of ["logo", "composerIcon"]) {
      if (ui?.[key]) {
        const asset = path.resolve(pluginRoot, ui[key]);
        if (!fs.existsSync(asset)) findings.push(finding("error", `asset.${key}`, `Referenced ${key} does not exist.`, asset));
      }
    }
  }

  if (portable && compatibility) {
    for (const key of ["name", "version"]) {
      if (portable[key] !== compatibility[key]) findings.push(finding("error", `manifest.compat.${key}`, `Portable and compatibility manifests disagree on ${key}.`, compatFile));
    }
    const portableUi = manifestInterface(portable);
    const compatUi = manifestInterface(compatibility);
    for (const key of ["displayName", "shortDescription", "developerName", "websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      if ((portableUi?.[key] ?? null) !== (compatUi?.[key] ?? null)) findings.push(finding("error", `manifest.compat.interface.${key}`, `Portable and compatibility manifests disagree on ${key}.`, compatFile));
    }
  }

  const skillNames = new Map();
  const skillsRoot = path.join(pluginRoot, "skills");
  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        findings.push(finding("warning", "skill.layout", "Skills should be exactly one directory below skills/.", path.join(skillsRoot, entry.name)));
        continue;
      }
      const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        findings.push(finding("warning", "skill.missing", "Skill directory has no SKILL.md.", skillFile));
        continue;
      }
      const meta = parseSkillFrontmatter(skillFile);
      if (meta.error) findings.push(finding("error", "skill.frontmatter", meta.error, skillFile));
      if (!meta.name) findings.push(finding("error", "skill.name", "Skill frontmatter must contain name.", skillFile));
      else {
        if (meta.name !== entry.name) findings.push(finding("error", "skill.directory-name", "Skill name must match its directory.", skillFile));
        if (skillNames.has(meta.name)) findings.push(finding("error", "skill.duplicate-name", `Duplicate skill name: ${meta.name}.`, skillFile));
        skillNames.set(meta.name, skillFile);
      }
      if (!meta.description) findings.push(finding("error", "skill.description", "Skill frontmatter must contain description.", skillFile));
    }
  }

  const appFile = path.join(pluginRoot, ".app.json");
  if (fs.existsSync(appFile)) {
    try {
      const app = readJson(appFile);
      for (const [alias, value] of Object.entries(app.apps ?? {})) {
        if (!supportedAppPrefixes.some((prefix) => String(value?.id ?? "").startsWith(prefix))) findings.push(finding("error", "app.unsupported-id", `App ${alias} uses an unsupported or missing App ID.`, appFile));
      }
    } catch (error) { findings.push(finding("error", "app.invalid-json", error.message, appFile)); }
  }

  const mcpFile = fs.existsSync(path.join(pluginRoot, ".mcp.json"))
    ? path.join(pluginRoot, ".mcp.json")
    : path.join(pluginRoot, "mcp.json");
  if (fs.existsSync(mcpFile)) {
    try {
      const mcp = readJson(mcpFile);
      if (!mcp.mcpServers || typeof mcp.mcpServers !== "object") findings.push(finding("error", "mcp.servers", "The MCP manifest must declare mcpServers.", mcpFile));
    } catch (error) { findings.push(finding("error", "mcp.invalid-json", error.message, mcpFile)); }
  }

  const counts = { errors: 0, warnings: 0, info: 0 };
  const countKey = { error: "errors", warning: "warnings", info: "info" };
  for (const item of findings) counts[countKey[item.severity]] += 1;
  return {
    pluginRoot,
    identity: primary ? { name: primary.name ?? null, version: primary.version ?? null, author: primary.author?.name ?? null, license: primary.license ?? null } : null,
    components: componentSummary(pluginRoot),
    valid: counts.errors === 0,
    counts,
    findings
  };
}

export function evaluate(pluginRootInput) {
  const report = validate(pluginRootInput);
  const checks = [
    ["identity", Boolean(report.identity?.name && report.identity?.version && report.identity?.author)],
    ["license-and-provenance", Boolean(report.identity?.license)],
    ["package-validation", report.valid],
    ["skills", report.components.skills.length > 0],
    ["routing-declarations", report.components.appReference || report.components.mcpServer]
  ];
  const applicable = checks.filter(([name]) => name !== "routing-declarations" || report.components.appReference || report.components.mcpServer);
  const passed = applicable.filter(([, ok]) => ok).length;
  return {
    ...report,
    score: Math.round((passed / applicable.length) * 100),
    scoreMeaning: "Static package readiness only; live App, MCP, OAuth, installation and service access remain unverified.",
    checks: checks.map(([name, passedCheck]) => ({ name, passed: passedCheck, applicable: name !== "routing-declarations" || report.components.appReference || report.components.mcpServer })),
    fixFirst: report.findings.filter((item) => item.severity === "error").slice(0, 5)
  };
}

export function compare(beforeInput, afterInput) {
  const before = validate(beforeInput);
  const after = validate(afterInput);
  return {
    before: { root: before.pluginRoot, identity: before.identity, components: before.components, counts: before.counts },
    after: { root: after.pluginRoot, identity: after.identity, components: after.components, counts: after.counts },
    changes: {
      identityChanged: JSON.stringify(before.identity) !== JSON.stringify(after.identity),
      addedSkills: after.components.skills.filter((name) => !before.components.skills.includes(name)),
      removedSkills: before.components.skills.filter((name) => !after.components.skills.includes(name)),
      errorDelta: after.counts.errors - before.counts.errors,
      warningDelta: after.counts.warnings - before.counts.warnings
    }
  };
}

function parseScaffoldOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--")) options[args[index].slice(2)] = args[index + 1];
  }
  return options;
}

export function scaffold(parentInput, options) {
  const name = options.name;
  const displayName = options["display-name"];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name ?? "")) throw new Error("--name must be lowercase kebab-case.");
  if (!displayName) throw new Error("--display-name is required.");
  const target = path.join(path.resolve(parentInput), name);
  if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing target: ${target}`);
  const skillName = `${name}-workflow`;
  fs.mkdirSync(path.join(target, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(target, "skills", skillName), { recursive: true });
  const interfaceDefinition = {
    displayName,
    shortDescription: "Ny plugin-kandidat",
    developerName: "Zilvereyes",
    category: "Developer Tools",
    websiteURL: "https://github.com/WinRecoveryProject/PluginMarketplace",
    privacyPolicyURL: "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/plugin-skill-studio-privacy.md",
    termsOfServiceURL: "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/plugin-skill-studio-terms.md",
    capabilities: ["Interactive"]
  };
  const sharedManifest = {
    name,
    version: "0.1.0",
    description: `${displayName} plugin candidate.`,
    author: { name: "Zilvereyes" },
    license: "UNLICENSED"
  };
  const portableManifest = {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    ...sharedManifest,
    extensions: { "com.openai": { interface: interfaceDefinition } }
  };
  const compatibilityManifest = {
    ...sharedManifest,
    skills: "./skills",
    interface: interfaceDefinition
  };
  fs.writeFileSync(path.join(target, "plugin.json"), `${JSON.stringify(portableManifest, null, 2)}\n`);
  fs.writeFileSync(path.join(target, ".codex-plugin", "plugin.json"), `${JSON.stringify(compatibilityManifest, null, 2)}\n`);
  fs.writeFileSync(path.join(target, "skills", skillName, "SKILL.md"), `---\nname: ${skillName}\ndescription: Use when work should be routed through the ${displayName} candidate.\n---\n\n# ${displayName}\n\nPreserve upstream sources and implement the requested workflow here.\n`);
  return { created: target, overwritten: false };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === "inventory") return print(inventory(args[0] ?? "."));
  if (command === "validate") return print(validate(args[0] ?? "."));
  if (command === "evaluate") return print(evaluate(args[0] ?? "."));
  if (command === "compare") {
    if (!args[0] || !args[1]) throw new Error("compare requires <before> <after>.");
    return print(compare(args[0], args[1]));
  }
  if (command === "scaffold") return print(scaffold(args[0] ?? ".", parseScaffoldOptions(args.slice(1))));
  throw new Error("Usage: plugin-studio <inventory|validate|evaluate|compare|scaffold> [...args]");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { main(); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
```

## File: `scripts/skill-studio.mjs`

```javascript
#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const ignoredDirectories = new Set([".git", "node_modules", ".plugin-eval"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function filesBelow(root) {
  const result = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not accepted in skill sources: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  visit(root);
  return result.sort();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { error: "SKILL.md is missing YAML frontmatter." };
  const value = (key) => match[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim()?.replace(/^['\"]|['\"]$/g, "");
  return { name: value("name"), description: value("description"), metadata: match[1] };
}

function diagnostic(severity, code, message, file = null) {
  return { severity, code, message, file };
}

export function validateSkill(input) {
  const supplied = path.resolve(input);
  const skillFile = path.basename(supplied).toLowerCase() === "skill.md" ? supplied : path.join(supplied, "SKILL.md");
  const skillRoot = path.dirname(skillFile);
  const findings = [];
  if (!fs.existsSync(skillFile)) {
    findings.push(diagnostic("error", "skill.missing", "SKILL.md does not exist.", skillFile));
    return { kind: "skill", skillRoot, identity: null, valid: false, counts: { errors: 1, warnings: 0 }, findings };
  }
  const text = fs.readFileSync(skillFile, "utf8");
  const frontmatter = parseFrontmatter(text);
  if (frontmatter.error) findings.push(diagnostic("error", "skill.frontmatter", frontmatter.error, skillFile));
  if (!frontmatter.name) findings.push(diagnostic("error", "skill.name", "Frontmatter name is required.", skillFile));
  else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name)) findings.push(diagnostic("error", "skill.name-format", "Skill name must be lowercase kebab-case.", skillFile));
    if (frontmatter.name !== path.basename(skillRoot)) findings.push(diagnostic("error", "skill.directory-name", "Skill name must match its directory name.", skillFile));
    if (frontmatter.name.length > 64) findings.push(diagnostic("error", "skill.name-length", "Skill name must be 64 characters or fewer.", skillFile));
  }
  if (!frontmatter.description) findings.push(diagnostic("error", "skill.description", "Frontmatter description is required.", skillFile));
  else if (frontmatter.description.length > 1024) findings.push(diagnostic("warning", "skill.description-length", "Skill description is unusually long and may make discovery expensive.", skillFile));
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > 500) findings.push(diagnostic("warning", "skill.entrypoint-size", "SKILL.md exceeds 500 lines; consider progressive disclosure.", skillFile));
  const linkPattern = /\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const clean = match[1].split("#")[0].replace(/^<|>$/g, "");
    if (!clean) continue;
    const linked = path.resolve(skillRoot, clean);
    if (!fs.existsSync(linked)) findings.push(diagnostic("error", "skill.broken-link", `Relative reference does not exist: ${match[1]}`, skillFile));
  }
  const count = (severity) => findings.filter((item) => item.severity === severity).length;
  return {
    kind: "skill",
    skillRoot,
    identity: { name: frontmatter.name ?? null, description: frontmatter.description ?? null },
    valid: count("error") === 0,
    counts: { errors: count("error"), warnings: count("warning") },
    metrics: { lineCount, estimatedTokens: Math.ceil(text.length / 4), fileCount: filesBelow(skillRoot).length },
    findings
  };
}

export function evaluateSkill(input) {
  const report = validateSkill(input);
  const penalty = report.counts.errors * 20 + report.counts.warnings * 5;
  const score = Math.max(0, 100 - penalty);
  const grade = score >= 93 ? "A" : score >= 85 ? "B" : score >= 70 ? "C" : score >= 55 ? "D" : "F";
  return {
    ...report,
    score,
    grade,
    riskLevel: report.counts.errors > 0 || score < 70 ? "high" : report.counts.warnings > 0 ? "medium" : "low",
    scoreMeaning: "Static skill readiness only; real task success, host selection and live token usage remain unverified.",
    fixFirst: report.findings.filter((item) => item.severity === "error").slice(0, 5)
  };
}

export function inventorySkills(rootInput) {
  const root = path.resolve(rootInput);
  if (!fs.existsSync(root)) throw new Error(`Source root does not exist: ${root}`);
  const records = [];
  for (const file of filesBelow(root)) {
    if (path.basename(file).toLowerCase() !== "skill.md") continue;
    const report = validateSkill(file);
    records.push({
      path: toPosix(path.relative(root, file)),
      skillRoot: toPosix(path.relative(root, report.skillRoot)) || ".",
      name: report.identity?.name ?? null,
      description: report.identity?.description ?? null,
      valid: report.valid,
      counts: report.counts,
      metrics: report.metrics
    });
  }
  return { root, count: records.length, records: records.sort((a, b) => a.path.localeCompare(b.path)) };
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

export function scaffoldSkill(parentInput, options) {
  const name = options.name;
  const description = options.description;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name ?? "")) throw new Error("--name must be lowercase kebab-case.");
  if (name.length > 64) throw new Error("--name must be 64 characters or fewer.");
  if (!description) throw new Error("--description is required.");
  const target = path.join(path.resolve(parentInput), name);
  if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing target: ${target}`);
  fs.mkdirSync(path.join(target, "agents"), { recursive: true });
  const title = name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  fs.writeFileSync(path.join(target, "SKILL.md"), `---\nname: ${name}\ndescription: ${yamlString(description)}\n---\n\n# ${title}\n\nState the outcome, non-obvious constraints and the smallest useful workflow here.\n`);
  const policy = options["explicit-only"] === "true" ? "\npolicy:\n  allow_implicit_invocation: false" : "";
  fs.writeFileSync(path.join(target, "agents", "openai.yaml"), `interface:\n  display_name: ${yamlString(title)}\n  short_description: ${yamlString(description.slice(0, 80))}\n  default_prompt: ${yamlString(`Use $${name} to help with this task.`)}${policy}\n`);
  const validation = validateSkill(target);
  if (!validation.valid) throw new Error(`Generated skill failed validation: ${JSON.stringify(validation.findings)}`);
  return { created: target, overwritten: false, validation };
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function parseGitHubUrl(value) {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== "github.com") throw new Error("Only github.com URLs are supported for remote skill sources.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("GitHub URL must include owner and repository.");
  const owner = parts[0];
  const repository = parts[1].replace(/\.git$/i, "");
  let ref = "main";
  let subpath = "";
  if (parts[2] === "tree") {
    ref = parts[3] ?? "main";
    subpath = parts.slice(4).join("/");
  }
  return { owner, repository, ref, subpath, cloneUrl: `https://github.com/${owner}/${repository}.git` };
}

function materializeSource(sourceInput) {
  if (!/^https?:\/\//i.test(sourceInput)) return { sourceRoot: path.resolve(sourceInput), cleanup: null, provenance: { kind: "local", source: path.resolve(sourceInput) } };
  const github = parseGitHubUrl(sourceInput);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zilvereyes-skill-source-"));
  const checkout = path.join(temporaryRoot, "checkout");
  const result = spawnSync("git", ["clone", "--depth", "1", "--branch", github.ref, "--", github.cloneUrl, checkout], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error(`Git clone failed: ${(result.stderr || result.stdout).trim()}`);
  }
  const sourceRoot = github.subpath ? path.resolve(checkout, github.subpath) : checkout;
  if (!sourceRoot.startsWith(`${path.resolve(checkout)}${path.sep}`) && sourceRoot !== path.resolve(checkout)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error("GitHub subpath escapes the checkout root.");
  }
  return {
    sourceRoot,
    cleanup: () => fs.rmSync(temporaryRoot, { recursive: true, force: true }),
    provenance: { kind: "github", source: sourceInput, repository: `${github.owner}/${github.repository}`, ref: github.ref, subpath: github.subpath }
  };
}

export function installSkill(sourceInput, options = {}) {
  const materialized = materializeSource(sourceInput);
  try {
    if (!fs.existsSync(materialized.sourceRoot)) throw new Error(`Skill source does not exist: ${materialized.sourceRoot}`);
    const validation = validateSkill(materialized.sourceRoot);
    if (!validation.valid) throw new Error(`Skill source failed validation: ${JSON.stringify(validation.findings)}`);
    const scanArgs = [fileURLToPath(new URL("./studio.mjs", import.meta.url)), "risk-scan", materialized.sourceRoot];
    if (options.suppressions) scanArgs.push("--suppressions", path.resolve(options.suppressions));
    const scan = spawnSync(process.execPath, scanArgs, { encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    let riskReview;
    try { riskReview = JSON.parse(scan.stdout); }
    catch { throw new Error("Pre-install risk scan could not complete reliably: " + (scan.error?.message || scan.stderr || "invalid scanner response")); }
    if (scan.error || ![0, 1].includes(scan.status) || riskReview.complete === false) throw new Error("Pre-install risk scan is incomplete; installation is blocked.");
    const skillName = options.name ?? validation.identity.name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName ?? "")) throw new Error("Installed skill name must be lowercase kebab-case.");
    const defaultHome = process.env.CODEX_HOME || path.join(process.env.USERPROFILE || os.homedir(), ".codex");
    const destinationRoot = path.resolve(options.dest ?? path.join(defaultHome, "skills"));
    const target = path.join(destinationRoot, skillName);
    const sourceFiles = filesBelow(materialized.sourceRoot);
    const files = sourceFiles.map((file) => ({ path: toPosix(path.relative(materialized.sourceRoot, file)), bytes: fs.statSync(file).size, sha256: sha256(file) }));
    const plan = { source: materialized.provenance, target, skillName, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
    if (options["dry-run"] === "true") return { mode: "dry-run", written: false, plan, validation, riskReview };
    if (scan.status !== 0) throw new Error("Installation blocked by active risk findings; review exact evidence and supply only justified fingerprint/rule-version suppressions.");
    if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing skill: ${target}`);
    const installerVersion = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
    if (typeof installerVersion !== "string" || !installerVersion.trim()) throw new Error("Installer package version is missing; installation is blocked.");
    fs.mkdirSync(destinationRoot, { recursive: true });
    const staging = path.join(destinationRoot, `.zilvereyes-staging-${crypto.randomUUID()}`);
    const receipt = {
      schemaVersion: 1,
      installedAt: new Date().toISOString(),
      installer: "plugin-skill-studio",
      installerVersion,
      source: materialized.provenance,
      target,
      files,
      riskReview: { complete: true, exitCode: 0, safetyCertification: false }
    };
    try {
      fs.mkdirSync(staging, { recursive: false });
      for (const item of files) {
        const sourceFile = path.join(materialized.sourceRoot, item.path.split("/").join(path.sep));
        const targetFile = path.join(staging, item.path.split("/").join(path.sep));
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(sourceFile, targetFile, fs.constants.COPYFILE_EXCL);
        if (sha256(targetFile) !== item.sha256) throw new Error(`Post-copy hash mismatch: ${targetFile}`);
      }
      fs.writeFileSync(path.join(staging, ".zilvereyes-install-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
      fs.renameSync(staging, target);
    } catch (error) {
      if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
      throw error;
    }
    return { mode: "install", written: true, plan, receipt, validation: validateSkill(target) };
  } finally {
    if (materialized.cleanup) materialized.cleanup();
  }
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--")) {
      const key = args[index].slice(2);
      const next = args[index + 1];
      if (!next || next.startsWith("--")) options[key] = "true";
      else { options[key] = next; index += 1; }
    }
  }
  return options;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function main(argv = process.argv.slice(2)) {
  const [command, target = ".", ...rest] = argv;
  const options = parseOptions(rest);
  if (command === "inventory") return print(inventorySkills(target));
  if (command === "validate") return print(validateSkill(target));
  if (command === "evaluate") return print(evaluateSkill(target));
  if (command === "scaffold") return print(scaffoldSkill(target, options));
  if (command === "install") return print(installSkill(target, options));
  throw new Error("Usage: skill-studio <inventory|validate|evaluate|scaffold|install> <path-or-url> [options]");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { main(); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
```

## File: `scripts/studio.mjs`

```javascript
#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {loadRegistry,route,selfCheck} from '../src/registry.mjs';

function options(args) {
  const result={_ : []};
  for(let i=0;i<args.length;i++) {
    if(args[i].startsWith('--')) {
      const key=args[i].slice(2);
      result[key]=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;
    } else result._.push(args[i]);
  }
  return result;
}
async function json(file) { return JSON.parse(await fs.readFile(file,'utf8')); }
function required(value,label) { if(!value) throw new Error(label+' is required'); return value; }
export async function main(args=process.argv.slice(2)) {
  const [command,...rest]=args, opts=options(rest), [target,...more]=opts._;
  const format=opts.format??'json';
  let result, rendered;
  switch(command) {
    case 'desktop-windows': case 'desktop-scope': case 'desktop-inspect':
    case 'desktop-activate': case 'desktop-capture': case 'desktop-click': case 'desktop-scroll': {
      const desktop=await import('../src/desktop/index.mjs');
      if(['desktop-activate','desktop-click','desktop-scroll'].includes(command)&&opts.out)throw Error('Live desktop actions do not accept --out; capture stdout separately and never replay a failed action automatically');
      if(opts.out){await desktop.verifyLocalDesktopPaths([path.resolve(opts.out)]);desktop.assertPrivateDesktopOutput(opts.out);}
      const action=command==='desktop-windows'?'list':command.slice(8);
      const request={action};
      if(action==='scope')request.windowHandle=Number(required(target,'observed window handle'));
      else if(action!=='list')request.scope=await desktop.readDesktopScope(required(target,'scope JSON'));
      if(action==='capture')request.directory=path.resolve(required(opts.dir,'--dir private output directory'));
      if(['activate','click','scroll'].includes(action))request.execute=opts.execute===true;
      if(['click','scroll'].includes(action)){
        request.snapshot=path.resolve(required(opts.snapshot,'--snapshot fresh receipt'));
        request.x=Number(opts.x);request.y=Number(opts.y);
        if(action==='scroll')request.delta=Number(opts.delta);
      }
      result=await desktop.desktopRequest(request);
      if(action==='scope')result=result.scope;
      break;
    }
    case 'capabilities': result=await loadRegistry(); break;
    case 'route': result=await route(required(opts._.join(' '),'request')); break;
    case 'self-check': result=await selfCheck(); if(!result.ok) process.exitCode=1; break;
    case 'skill-eval': case 'plugin-eval': {
      const engine=await import('../src/eval/index.mjs');
      const mode=opts.mode??'static';
      if(!['static','benchmark'].includes(mode)) throw new Error('mode must be static or benchmark');
      const limits={}; for(const [flag,key]of [['max-files','maxFiles'],['max-file-bytes','maxFileBytes'],['max-total-bytes','maxTotalBytes']])if(opts[flag]!==undefined)limits[key]=Number(opts[flag]);
      const evalOptions={limits,configPath:opts.config,outDir:opts.mode==='benchmark'?opts.out:undefined,timeoutMs:opts.timeout?Number(opts.timeout):undefined,codexPath:opts.codex,metricPack:opts['metric-pack']};
      result=mode==='benchmark'?await engine.runBenchmark(required(target,'target'),evalOptions):await engine.analyze(required(target,'target'),evalOptions);
      if(result.valid===false||['FAIL','BLOCKED'].includes(result.status))process.exitCode=1;
      if(result.status==='INCOMPLETE')process.exitCode=2;
      rendered=engine.render(result,format); break;
    }
    case 'benchmark-init': {
      const engine=await import('../src/eval/index.mjs');
      result=await engine.createBenchmarkConfig(required(target,'target'),{sourcePath:opts.fixture}); break;
    }
    case 'compare-reports': {
      const engine=await import('../src/eval/index.mjs');
      result=engine.compareReports(await json(required(target,'before report')),await json(required(more[0],'after report'))); break;
    }
    case 'consolidation-seed': {
      const engine=await import('../src/consolidation/check.mjs');
      result=await engine.seedMatrix(await json(required(target,'sources JSON')),{repoRoot:path.resolve(opts['repo-root']??'.')}); break;
    }
    case 'consolidation-check': {
      const engine=await import('../src/consolidation/check.mjs');
      result=await engine.checkMatrix(await json(required(target,'matrix JSON')),{repoRoot:path.resolve(opts['repo-root']??'.')});
      if(!result.ok)process.exitCode=1; break;
    }
    case 'autoresearch-start': case 'autoresearch-judge': case 'autoresearch-report': {
      const engine=await import('../src/eval/autoresearch.mjs');
      try {
        if(command==='autoresearch-start') result=await engine.startRun(required(target,'skill root'),{configPath:opts.config,runsRoot:opts['runs-root']});
        else if(command==='autoresearch-judge') { result=await engine.judgeExperiment(required(target,'run directory'),{description:typeof opts.description==='string'?opts.description:''}); process.exitCode={KEEP:0,DISCARD:3,UNKNOWN:2}[result.verdict]; }
        else result=await engine.reportRun(required(target,'run directory'));
      } catch(error) { result={ok:false,error:error.message}; process.exitCode=1; }
      break;
    }
    case 'risk-scan': {
      const service=await import('../src/services/index.mjs');
      result=await service.scanRisk(required(target,'target'),{suppressions:opts.suppressions?await json(opts.suppressions):undefined});
      process.exitCode=result.exitCode;
      rendered=service.renderRisk(result,format); break;
    }
    case 'evidence-matrix': {
      const service=await import('../src/services/index.mjs'); result=service.evidenceMatrix(await json(required(target,'input JSON'))); break;
    }
    case 'catalog-snapshot': {
      const service=await import('../src/services/index.mjs'); result=await service.catalogSnapshot(required(target,'source'),{asOf:opts['as-of']}); break;
    }
    case 'catalog-search': {
      const service=await import('../src/services/index.mjs'); result=service.searchCatalog(await json(required(target,'snapshot')),required(more.join(' '),'query')); break;
    }
    case 'catalog-compare': {
      const service=await import('../src/services/index.mjs'); result=service.compareCatalogs(await json(required(target,'before')),await json(required(more[0],'after'))); break;
    }
    case 'local-inventory': {
      const service=await import('../src/services/index.mjs'); result=await service.inventory(required(target,'root')); break;
    }
    case 'inventory-reconcile': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {reconcileInstalledInventories}=await import('../src/services/installed-inventory.mjs');
      result=reconcileInstalledInventories(JSON.parse(await readBounded(path.resolve(required(target,'inventory input JSON')),8*1024*1024)));
      if(!result.complete)process.exitCode=2;
      break;
    }
    case 'inventory-versions': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {auditInventoryVersions,compareHostInstallations}=await import('../src/services/inventory-versions.mjs');
      const readAudit=async file=>auditInventoryVersions(JSON.parse(await readBounded(path.resolve(file),32*1024*1024)));
      result=await readAudit(required(target,'version audit input JSON'));
      if(opts.against!==undefined){
        if(typeof opts.against!=='string')throw Error('--against requires the other host’s capture JSON');
        result.peerInstallation=compareHostInstallations(result,await readAudit(opts.against));
      }
      if(opts['installed-files']!==undefined){
        if(typeof opts['installed-files']!=='string')throw Error('--installed-files requires a release check request JSON');
        const request=JSON.parse(await readBounded(path.resolve(opts['installed-files']),64*1024));
        const {verifyInstalledRelease}=await import('../src/services/installed-release.mjs');
        result.installedFiles=await verifyInstalledRelease(result,request);
      }
      const exitCode=Math.max(result.exitCode,result.installedFiles?.exitCode??0);
      if(exitCode)process.exitCode=exitCode;
      break;
    }
    case 'resolve-installed': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {resolveInstalledPlugin}=await import('../src/services/installed-resolver.mjs');
      result=await resolveInstalledPlugin(JSON.parse(await readBounded(path.resolve(required(target,'request JSON')),8*1024*1024)));
      if(result.status!=='RESOLVED')process.exitCode=2;
      break;
    }
    case 'import-preview': {
      const engine=await import('../src/conversion/index.mjs'); result=await engine.previewImport(required(target,'source root')); break;
    }
    case 'import-apply': {
      const engine=await import('../src/conversion/index.mjs'); result=await engine.applyImport(await json(required(target,'plan')),required(opts.out,'--out destination')); break;
    }
    case 'gpt-import': {
      const engine=await import('../src/conversion/index.mjs');
      const text=await fs.readFile(required(target,'input file'),'utf8');
      let input; try{input=JSON.parse(text);}catch{input={instructions:text};}
      result=await engine.importGpt(input,{outputParent:required(opts.out,'--out parent directory'),name:opts.name,sourcePath:path.resolve(target)}); break;
    }
    case 'release-checkpoint': {
      const engine=await import('../src/conversion/index.mjs'); result=engine.createReleaseCheckpoint(await json(required(target,'input file'))); break;
    }
    case 'release-advance': {
      const engine=await import('../src/conversion/index.mjs'); result=engine.advanceRelease(await json(required(target,'checkpoint')),await json(required(more[0],'event'))); break;
    }
    default: throw new Error('Commands: capabilities, route, self-check, skill-eval, plugin-eval, benchmark-init, compare-reports, consolidation-seed, consolidation-check, autoresearch-start, autoresearch-judge, autoresearch-report, risk-scan, evidence-matrix, catalog-snapshot, catalog-search, catalog-compare, local-inventory, inventory-reconcile, inventory-versions, resolve-installed, import-preview, import-apply, gpt-import, release-checkpoint, release-advance, desktop-windows, desktop-scope, desktop-inspect, desktop-activate, desktop-capture, desktop-click, desktop-scroll. Legacy commands remain in plugin-studio.mjs and skill-studio.mjs.');
  }
  const output=rendered??JSON.stringify(result,null,2);
  // --out is a directory for mutating workflows and benchmarks; only reports use a file path.
  if(opts.out && !['import-apply','gpt-import'].includes(command) && !(opts.mode==='benchmark')) {
    await fs.writeFile(opts.out,output+'\n',{encoding:'utf8',flag:'wx'});
  }
  process.stdout.write(output+'\n');
  return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  main().catch(error=>{const result={ok:false,error:error.message};if(error.desktopOutcome!==undefined)result.inputSent=error.desktopOutcome;process.stderr.write(JSON.stringify(result)+'\n');process.exitCode=2;});
}
```

## File: `scripts/windows-desktop.ps1`

```powershell
# Private local evidence only. No network, credentials, app bindings or installers.
$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$inputSent=$false
$cursorMoved=$false
try {
  $raw=[Console]::In.ReadToEnd()
  if($raw.Length -gt 131072){throw 'Request exceeds limit'}
  $request=$raw|ConvertFrom-Json
  function Assert-LocalPath([string]$value){
    if($value -notmatch '^[A-Za-z]:[\\/]'){throw 'Only absolute local drive paths are supported; UNC/device paths are refused'}
    $drive=New-Object IO.DriveInfo($value.Substring(0,3))
    if($drive.DriveType -eq [IO.DriveType]::Network -or -not $drive.IsReady){throw 'Network or unavailable drives are refused'}
    $full=[IO.Path]::GetFullPath($value);$cursor=[IO.Path]::GetPathRoot($full)
    foreach($part in $full.Substring($cursor.Length).Split([char[]]@('\','/'),[StringSplitOptions]::RemoveEmptyEntries)){
      $cursor=[IO.Path]::Combine($cursor,$part)
      try{$attributes=[IO.File]::GetAttributes($cursor)}catch [IO.FileNotFoundException]{break}catch [IO.DirectoryNotFoundException]{break}
      if(($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse-point paths are refused; use a physical local directory'}
    }
  }
  function Get-Sha([string]$file){
    Assert-LocalPath $file
    $sha=[Security.Cryptography.SHA256]::Create();$stream=[IO.File]::OpenRead($file)
    try{return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','')}finally{$stream.Dispose();$sha.Dispose()}
  }
  if($request.action -eq 'validate-paths'){
    if(-not $request.paths -or $request.paths.Count -gt 8){throw 'Supply bounded local paths'}
    foreach($file in $request.paths){Assert-LocalPath ([string]$file)}
    [ordered]@{ok=$true;localPaths=$true;inputSent=$false}|ConvertTo-Json -Compress
    exit 0
  }
  if($request.action -notin @('list','scope','inspect','activate','capture','click','scroll')){throw 'Unknown desktop action'}
  if($request.action -in @('activate','click','scroll') -and ($request.execute -isnot [bool] -or $request.execute -ne $true)){throw 'Live input requires execute=true and prior user authorization'}
  Add-Type -AssemblyName System.Drawing
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class StudioDesktop {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint Size,Tick; }
 public delegate bool EnumProc(IntPtr hwnd,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder text,int size);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
 [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern bool GetPhysicalCursorPos(out POINT point);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int mode);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
'@
  $oldDpi=[StudioDesktop]::SetThreadDpiAwarenessContext([IntPtr](-4))
  function Get-Tick {
    $v=New-Object StudioDesktop+LASTINPUTINFO;$v.Size=[Runtime.InteropServices.Marshal]::SizeOf($v)
    if(-not [StudioDesktop]::GetLastInputInfo([ref]$v)){throw 'Cannot observe recent input'}
    return $v.Tick
  }
  function Get-Identity([long]$handle){
    $hwnd=[IntPtr]$handle
    if($handle -le 0 -or -not [StudioDesktop]::IsWindow($hwnd)){throw 'Window no longer exists'}
    [uint32]$owner=0;[void][StudioDesktop]::GetWindowThreadProcessId($hwnd,[ref]$owner)
    $p=Get-Process -Id $owner -ErrorAction Stop
    if($p.ProcessName -match '^(LockApp|LogonUI|winlogon|CredentialUIBroker|consent|SecurityHealth.*|Taskmgr|SystemSettings|regedit|WindowsTerminal|powershell|pwsh|cmd|KeePass.*|1Password|Bitwarden)$'){throw 'Protected or unsupported desktop target'}
    $title=New-Object Text.StringBuilder 1024;[void][StudioDesktop]::GetWindowText($hwnd,$title,$title.Capacity)
    return [ordered]@{kind='studio-desktop-scope';windowHandle=$handle;processId=[int]$owner;processStart=$p.StartTime.ToUniversalTime().ToString('o');executable=$p.Path;processName=$p.ProcessName;title=$title.ToString()}
  }
  function Assert-Scope {
    $live=Get-Identity ([long]$request.scope.windowHandle)
    foreach($key in @('kind','windowHandle','processId','processStart','executable','processName')){
      if($live[$key] -cne $request.scope.$key){throw "Target identity changed ($key); no input sent"}
    }
    return $live
  }
  function Get-Bounds {
    $null=Assert-Scope;$hwnd=[IntPtr]([long]$request.scope.windowHandle)
    if(-not [StudioDesktop]::IsWindowVisible($hwnd) -or [StudioDesktop]::IsIconic($hwnd)){throw 'Target must be visible and restored'}
    if([StudioDesktop]::GetAncestor([StudioDesktop]::GetForegroundWindow(),2) -ne $hwnd){throw 'Target is not foreground; reobserve before activating'}
    $r=New-Object StudioDesktop+RECT
    if(-not [StudioDesktop]::GetWindowRect($hwnd,[ref]$r)){throw 'Cannot read target geometry'}
    $w=$r.Right-$r.Left;$h=$r.Bottom-$r.Top
    if($w -lt 1 -or $h -lt 1 -or $w -gt 8192 -or $h -gt 8192){throw 'Invalid target geometry'}
    return [ordered]@{left=$r.Left;top=$r.Top;width=$w;height=$h}
  }
  function Save-NewJson($value,[string]$file){
    $bytes=[Text.Encoding]::UTF8.GetBytes(($value|ConvertTo-Json -Depth 10))
    $stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew)
    try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  }
  $result=[ordered]@{ok=$true;action=$request.action;backend='local-windows-gdi-user32';inputSent=$false}
  switch($request.action){
    'list' {
      $windows=New-Object Collections.Generic.List[object]
      $callback=[StudioDesktop+EnumProc]{param($hwnd,$unused)
        if([StudioDesktop]::IsWindowVisible($hwnd)){
          try{$item=Get-Identity $hwnd.ToInt64();if($item.title){$windows.Add($item)}}catch{}
        }
        return $true
      }
      [void][StudioDesktop]::EnumWindows($callback,[IntPtr]::Zero)
      $result.windows=@($windows.ToArray())
    }
    'scope' {$result.scope=Get-Identity ([long]$request.windowHandle)}
    'inspect' {
      $result.scope=Assert-Scope
      Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
      $element=[Windows.Automation.AutomationElement]::FromHandle([IntPtr]([long]$request.scope.windowHandle))
      $all=$element.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
      $items=New-Object Collections.Generic.List[object]
      for($i=0;$i -lt $all.Count -and $items.Count -lt 500;$i++){
        $e=$all[$i]
        try{
          $c=$e.Current;if($c.IsOffscreen -or $c.IsPassword){continue}
          $b=$c.BoundingRectangle
          $coordinates=@($b.X,$b.Y,$b.Width,$b.Height)
          if($b.IsEmpty -or @($coordinates|Where-Object {[double]::IsNaN($_) -or [double]::IsInfinity($_)}).Count){$coordinates=@()}
          $item=[ordered]@{name=$c.Name;type=$c.ControlType.ProgrammaticName;enabled=$c.IsEnabled;focused=$c.HasKeyboardFocus;bounds=$coordinates}
          $value=$null;if($e.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$value)){$item.value=$value.Current.Value}
          $items.Add($item)
        }catch{}
      }
      $result.elements=@($items.ToArray());$result.truncated=$items.Count -ge 500
    }
    'activate' {
      $result.scope=Assert-Scope
      $foreground=[StudioDesktop]::GetForegroundWindow()
      if($foreground -ne [IntPtr]::Zero){$null=Get-Identity $foreground.ToInt64()}
      $hwnd=[IntPtr]([long]$request.scope.windowHandle)
      [void][StudioDesktop]::ShowWindow($hwnd,9)
      [void][StudioDesktop]::SetForegroundWindow($hwnd)
      if([StudioDesktop]::GetForegroundWindow() -ne $hwnd){throw 'Windows refused foreground activation; user restoration is required'}
      $result.activated=$true
    }
    'capture' {
      $bounds=Get-Bounds;$tick=Get-Tick
      Assert-LocalPath $request.directory
      $null=[IO.Directory]::CreateDirectory($request.directory)
      $stem='studio-desktop-'+[Guid]::NewGuid().ToString('N')
      $image=Join-Path $request.directory ($stem+'.png');$receipt=$image+'.json'
      $bitmap=New-Object Drawing.Bitmap($bounds.width,$bounds.height);$graphics=[Drawing.Graphics]::FromImage($bitmap)
      try{
        $graphics.CopyFromScreen($bounds.left,$bounds.top,0,0,$bitmap.Size,[Drawing.CopyPixelOperation]::SourceCopy)
        $after=Get-Bounds
        if(($bounds|ConvertTo-Json -Compress) -ne ($after|ConvertTo-Json -Compress) -or (Get-Tick) -ne $tick){throw 'Target or input changed during capture; retry observation'}
        $stream=[IO.File]::Open($image,[IO.FileMode]::CreateNew)
        try{$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)}finally{$stream.Dispose()}
      }finally{$graphics.Dispose();$bitmap.Dispose()}
      $snapshot=[ordered]@{kind='studio-desktop-snapshot';at=[DateTimeOffset]::UtcNow.ToString('o');scope=$request.scope;bounds=$bounds;lastInputTick=$tick;imagePath=$image;imageSha256=(Get-Sha $image);receiptPath=$receipt}
      Save-NewJson $snapshot $receipt
      $result.snapshot=$snapshot
    }
    {$_ -in @('click','scroll')} {
      Assert-LocalPath $request.snapshot
      $bounds=Get-Bounds;$snapshot=[IO.File]::ReadAllText($request.snapshot)|ConvertFrom-Json
      if($snapshot.kind -ne 'studio-desktop-snapshot'){throw 'Invalid snapshot kind'}
      foreach($key in @('windowHandle','processId','processStart','executable','processName')){if($snapshot.scope.$key -cne $request.scope.$key){throw 'Snapshot target mismatch'}}
      $age=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($snapshot.at)).TotalSeconds
      if($age -lt 0 -or $age -gt 60){throw 'Snapshot is stale'}
      if(($bounds|ConvertTo-Json -Compress) -ne ($snapshot.bounds|ConvertTo-Json -Compress)){throw 'Target geometry changed'}
      if((Get-Sha $snapshot.imagePath) -ne $snapshot.imageSha256){throw 'Snapshot image changed'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred since capture; reobserve'}
      $x=[int]$request.x;$y=[int]$request.y
      if($x -lt 0 -or $y -lt 0 -or $x -ge $bounds.width -or $y -ge $bounds.height){throw 'Point is outside captured target'}
      $old=[Drawing.Bitmap]::FromFile($snapshot.imagePath);$current=New-Object Drawing.Bitmap($bounds.width,$bounds.height);$g=[Drawing.Graphics]::FromImage($current)
      try{
        $g.CopyFromScreen($bounds.left,$bounds.top,0,0,$current.Size)
        $changed=0;$samples=0
        for($row=-3;$row -le 3;$row++){for($col=-5;$col -le 5;$col++){
          $px=[Math]::Min($bounds.width-1,[Math]::Max(0,$x+$col*6));$py=[Math]::Min($bounds.height-1,[Math]::Max(0,$y+$row*6))
          $a=$old.GetPixel($px,$py);$b=$current.GetPixel($px,$py)
          if(([Math]::Abs([int]$a.R-[int]$b.R)+[Math]::Abs([int]$a.G-[int]$b.G)+[Math]::Abs([int]$a.B-[int]$b.B)) -gt 90){$changed++};$samples++
        }}
        if($changed/[double]$samples -gt 0.04){throw 'Target pixels changed since capture; reobserve'}
      }finally{$g.Dispose();$current.Dispose();$old.Dispose()}
      $point=New-Object StudioDesktop+POINT;$point.X=$bounds.left+$x;$point.Y=$bounds.top+$y
      if([StudioDesktop]::GetAncestor([StudioDesktop]::WindowFromPoint($point),2) -ne [IntPtr]([long]$request.scope.windowHandle)){throw 'Point is occluded by another window'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred before cursor movement; reobserve'}
      if(-not [StudioDesktop]::SetCursorPos($point.X,$point.Y)){throw 'Cursor positioning failed'}
      $cursorMoved=$true
      $physical=New-Object StudioDesktop+POINT
      if(-not [StudioDesktop]::GetPhysicalCursorPos([ref]$physical) -or $physical.X -ne $point.X -or $physical.Y -ne $point.Y){throw 'Physical cursor does not match target pixels'}
      $after=Get-Bounds
      if(($bounds|ConvertTo-Json -Compress) -ne ($after|ConvertTo-Json -Compress)){throw 'Window moved before input'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred before mouse button/wheel input; reobserve'}
      if([StudioDesktop]::GetAncestor([StudioDesktop]::WindowFromPoint($point),2) -ne [IntPtr]([long]$request.scope.windowHandle)){throw 'Point became occluded before input'}
      if($request.action -eq 'click'){
        [StudioDesktop]::mouse_event(2,0,0,0,[UIntPtr]::Zero);$inputSent=$true
        [StudioDesktop]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
      }else{
        $delta=[int]$request.delta;if($delta -eq 0 -or [Math]::Abs($delta) -gt 720){throw 'Invalid scroll amount'}
        $data=[BitConverter]::ToUInt32([BitConverter]::GetBytes($delta),0)
        [StudioDesktop]::mouse_event(0x0800,0,0,$data,[UIntPtr]::Zero);$inputSent=$true
      }
      $result.inputSent=$true;$result.cursorMoved=$cursorMoved;$result.refreshRequired=$true;$result.point=@($x,$y)
    }
  }
  if($oldDpi -ne [IntPtr]::Zero){[void][StudioDesktop]::SetThreadDpiAwarenessContext($oldDpi)}
  $result|ConvertTo-Json -Depth 12 -Compress
}catch{
  [ordered]@{ok=$false;error=$_.Exception.Message;inputSent=$inputSent;cursorMoved=$cursorMoved;reobserveRequired=$true}|ConvertTo-Json -Compress
  exit 1
}
```
