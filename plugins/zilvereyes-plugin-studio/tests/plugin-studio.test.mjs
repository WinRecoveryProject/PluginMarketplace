import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inventory, scaffold, validate } from "../scripts/plugin-studio.mjs";
import { evaluateSkill, installSkill, scaffoldSkill, validateSkill } from "../scripts/skill-studio.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zilvereyes-plugin-studio-"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function minimalManifest(overrides = {}) {
  return {
    name: "test-plugin",
    version: "0.1.0",
    author: { name: "Zilvereyes" },
    license: "MIT",
    interface: {
      displayName: "Test Plugin",
      shortDescription: "Kort beskrivelse",
      developerName: "Zilvereyes",
      websiteURL: "https://example.com",
      privacyPolicyURL: "https://example.com/privacy",
      termsOfServiceURL: "https://example.com/terms"
    },
    ...overrides
  };
}

test("current package validates", () => {
  const report = validate(pluginRoot);
  assert.equal(report.valid, true, JSON.stringify(report.findings, null, 2));
});

test("short descriptions over 30 characters are blocking", () => {
  const root = tempRoot();
  writeJson(path.join(root, "plugin.json"), minimalManifest({ interface: { displayName: "Test", shortDescription: "x".repeat(31), developerName: "Zilvereyes", websiteURL: "https://example.com", privacyPolicyURL: "https://example.com/privacy", termsOfServiceURL: "https://example.com/terms" } }));
  const report = validate(root);
  assert.ok(report.findings.some((item) => item.code === "interface.short-description-length"));
});

test("compatibility identity mismatch is blocking", () => {
  const root = tempRoot();
  writeJson(path.join(root, "plugin.json"), minimalManifest());
  writeJson(path.join(root, ".codex-plugin", "plugin.json"), minimalManifest({ version: "9.9.9" }));
  const report = validate(root);
  assert.ok(report.findings.some((item) => item.code === "manifest.compat.version"));
});

test("inventory distinguishes portable and compatibility manifests", () => {
  const root = tempRoot();
  writeJson(path.join(root, "sample", "plugin.json"), minimalManifest());
  writeJson(path.join(root, "sample", ".codex-plugin", "plugin.json"), minimalManifest());
  const result = inventory(root);
  assert.deepEqual(result.records.map((item) => item.kind).sort(), ["codex-compatibility-manifest", "portable-manifest"]);
});

test("scaffold creates once and refuses overwrite", () => {
  const root = tempRoot();
  const options = { name: "new-candidate", "display-name": "New Candidate" };
  const result = scaffold(root, options);
  assert.ok(fs.existsSync(path.join(result.created, "plugin.json")));
  assert.equal(validate(result.created).valid, true);
  assert.throws(() => scaffold(root, options), /Refusing to overwrite/);
});

test("unsupported App ID prefixes are blocking", () => {
  const root = tempRoot();
  writeJson(path.join(root, "plugin.json"), minimalManifest());
  writeJson(path.join(root, ".app.json"), { apps: { wrong: { id: "azure-client-id", required: true } } });
  const report = validate(root);
  assert.ok(report.findings.some((item) => item.code === "app.unsupported-id"));
});

test("skill scaffold validates and refuses overwrite", () => {
  const root = tempRoot();
  const options = { name: "safe-skill", description: "Use when a safe test skill is required." };
  const result = scaffoldSkill(root, options);
  assert.equal(validateSkill(result.created).valid, true);
  assert.equal(evaluateSkill(result.created).score, 100);
  assert.throws(() => scaffoldSkill(root, options), /Refusing to overwrite/);
});

test("skill installation previews, hashes and never overwrites", () => {
  const root = tempRoot();
  const sourceParent = path.join(root, "sources");
  const source = scaffoldSkill(sourceParent, { name: "installable-skill", description: "Use when installation behavior needs testing." }).created;
  const destination = path.join(root, "installed");
  const preview = installSkill(source, { dest: destination, "dry-run": "true" });
  assert.equal(preview.written, false);
  assert.equal(fs.existsSync(preview.plan.target), false);
  assert.ok(preview.plan.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
  const installed = installSkill(source, { dest: destination });
  assert.equal(installed.written, true);
  assert.equal(validateSkill(installed.plan.target).valid, true);
  assert.ok(fs.existsSync(path.join(installed.plan.target, ".zilvereyes-install-receipt.json")));
  assert.throws(() => installSkill(source, { dest: destination }), /Refusing to overwrite/);
});
