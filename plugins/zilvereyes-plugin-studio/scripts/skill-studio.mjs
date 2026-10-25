#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

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
    const skillName = options.name ?? validation.identity.name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName ?? "")) throw new Error("Installed skill name must be lowercase kebab-case.");
    const defaultHome = process.env.CODEX_HOME || path.join(process.env.USERPROFILE || os.homedir(), ".codex");
    const destinationRoot = path.resolve(options.dest ?? path.join(defaultHome, "skills"));
    const target = path.join(destinationRoot, skillName);
    const sourceFiles = filesBelow(materialized.sourceRoot);
    const files = sourceFiles.map((file) => ({ path: toPosix(path.relative(materialized.sourceRoot, file)), bytes: fs.statSync(file).size, sha256: sha256(file) }));
    const plan = { source: materialized.provenance, target, skillName, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
    if (options["dry-run"] === "true") return { mode: "dry-run", written: false, plan, validation };
    if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing skill: ${target}`);
    fs.mkdirSync(destinationRoot, { recursive: true });
    const staging = path.join(destinationRoot, `.zilvereyes-staging-${crypto.randomUUID()}`);
    const receipt = {
      schemaVersion: 1,
      installedAt: new Date().toISOString(),
      installer: "zilvereyes-plugin-studio",
      installerVersion: "0.2.1",
      source: materialized.provenance,
      target,
      files
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
