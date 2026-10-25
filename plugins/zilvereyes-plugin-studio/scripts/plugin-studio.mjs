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
    mcpServer: fs.existsSync(path.join(pluginRoot, "mcp.json"))
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

  if (!fs.existsSync(portableFile)) findings.push(finding("error", "manifest.portable.missing", "Root plugin.json is required.", portableFile));
  else {
    try { portable = readJson(portableFile); }
    catch (error) { findings.push(finding("error", "manifest.portable.invalid-json", error.message, portableFile)); }
  }

  if (fs.existsSync(compatFile)) {
    try { compatibility = readJson(compatFile); }
    catch (error) { findings.push(finding("error", "manifest.compat.invalid-json", error.message, compatFile)); }
  }

  if (portable) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(portable.name ?? "")) findings.push(finding("error", "manifest.name", "Plugin name must be lowercase kebab-case.", portableFile));
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(portable.version ?? "")) findings.push(finding("error", "manifest.version", "Plugin version must be semantic versioning.", portableFile));
    if (!portable.author?.name) findings.push(finding("error", "manifest.author", "Plugin author name is required.", portableFile));
    if (!portable.license) findings.push(finding("warning", "manifest.license", "Declare the package license or proprietary status.", portableFile));
    const ui = manifestInterface(portable);
    if (!ui?.displayName) findings.push(finding("error", "interface.display-name", "Display name is required.", portableFile));
    if (!ui?.shortDescription) findings.push(finding("error", "interface.short-description", "Short description is required.", portableFile));
    else if ([...ui.shortDescription].length > 30) findings.push(finding("error", "interface.short-description-length", "Short description must be 30 characters or fewer.", portableFile));
    for (const key of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      if (!ui?.[key]) findings.push(finding("error", `interface.${key}`, `${key} is required for a publishable candidate.`, portableFile));
      else {
        try { new URL(ui[key]); }
        catch { findings.push(finding("error", `interface.${key}-invalid`, `${key} must be an absolute URL.`, portableFile)); }
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

  const mcpFile = path.join(pluginRoot, "mcp.json");
  if (fs.existsSync(mcpFile)) {
    try {
      const mcp = readJson(mcpFile);
      if (!mcp.mcpServers || typeof mcp.mcpServers !== "object") findings.push(finding("error", "mcp.servers", "mcp.json must declare mcpServers.", mcpFile));
    } catch (error) { findings.push(finding("error", "mcp.invalid-json", error.message, mcpFile)); }
  }

  const counts = { errors: 0, warnings: 0, info: 0 };
  const countKey = { error: "errors", warning: "warnings", info: "info" };
  for (const item of findings) counts[countKey[item.severity]] += 1;
  return {
    pluginRoot,
    identity: portable ? { name: portable.name ?? null, version: portable.version ?? null, author: portable.author?.name ?? null, license: portable.license ?? null } : null,
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
    privacyPolicyURL: "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/zilvereyes-plugin-studio-privacy.md",
    termsOfServiceURL: "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/zilvereyes-plugin-studio-terms.md",
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
