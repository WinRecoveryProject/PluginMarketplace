# Plugin files: plugin-eval — `src/`

Source: `plugins/plugin-eval`. Files outside the `skills/*` folders, embedded as text.

## File: `src/cli.js`

```javascript
import path from "node:path";

import { compareResults } from "./core/compare.js";
import { analyzePath, explainBudget, recommendMeasures } from "./core/analyze.js";
import { initializeBenchmark, runBenchmark } from "./core/benchmark.js";
import { buildWorkflowGuide } from "./core/workflow-guide.js";
import { readJson, writeText } from "./lib/files.js";
import { renderPayload } from "./renderers/index.js";

function usage() {
  return `Plugin Eval helps first-time skill authors start from chat and keep the workflow local-first.

Start here:
  plugin-eval start <path> [--request "<chat request>"] [--goal evaluate|budget|measure|benchmark|next] [--format json|markdown|html] [--output <file>]

Core workflows:
  plugin-eval analyze <path> [--format json|markdown|html] [--output <file>] [--metric-pack <manifest.json>] [--observed-usage <file>] [--brief-out <file>]
  plugin-eval explain-budget <path> [--format json|markdown] [--output <file>]
  plugin-eval measurement-plan <path> [--format json|markdown] [--observed-usage <file>] [--output <file>]
  plugin-eval init-benchmark <path> [--output <benchmark.json>] [--model <model>] [--format json|markdown]
  plugin-eval benchmark <path> [--config <benchmark.json>] [--usage-out <usage.jsonl>] [--result-out <result.json>] [--model <model>] [--format json|markdown|html] [--output <file>]

Reports:
  plugin-eval report <result.json> [--format json|markdown|html] [--output <file>]
  plugin-eval compare <before.json> <after.json> [--format json|markdown|html] [--output <file>]

Chat-first examples:
  plugin-eval start ./skills/my-skill --request "evaluate this skill" --format markdown
  plugin-eval start ./skills/my-skill --request "measure the real token usage of this skill" --format markdown
  plugin-eval start ./plugins/my-plugin --request "help me benchmark this plugin" --format markdown
  plugin-eval start ./skills/my-skill --request "what should I run next?" --format markdown

Compatibility aliases:
  guide -> start
  recommend-measures -> measurement-plan
`;
}

function parseOptions(argv) {
  const positional = [];
  const options = {
    format: "json",
    output: null,
    metricPackManifests: [],
    observedUsagePaths: [],
    configPath: null,
    usageOutPath: null,
    resultOutPath: null,
    model: null,
    goal: null,
    request: null,
    dryRun: false,
    briefOut: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      options.format = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
    } else if (arg === "--metric-pack") {
      options.metricPackManifests.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--observed-usage") {
      options.observedUsagePaths.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--config") {
      options.configPath = argv[index + 1];
      index += 1;
    } else if (arg === "--usage-out") {
      options.usageOutPath = argv[index + 1];
      index += 1;
    } else if (arg === "--result-out") {
      options.resultOutPath = argv[index + 1];
      index += 1;
    } else if (arg === "--model") {
      options.model = argv[index + 1];
      index += 1;
    } else if (arg === "--goal") {
      options.goal = argv[index + 1];
      index += 1;
    } else if (arg === "--request") {
      options.request = argv[index + 1];
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--brief-out") {
      options.briefOut = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

async function emit(payload, format, output) {
  const rendered = renderPayload(payload, format);
  if (output) {
    await writeText(path.resolve(output), rendered);
    return;
  }
  process.stdout.write(rendered);
}

export async function runCli(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  const { positional, options } = parseOptions(rest);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  if (command === "analyze") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const result = await analyzePath(positional[0], {
      metricPackManifests: options.metricPackManifests,
      observedUsagePaths: options.observedUsagePaths,
    });
    if (options.briefOut) {
      await writeText(path.resolve(options.briefOut), `${JSON.stringify(result.improvementBrief, null, 2)}\n`);
    }
    await emit(result, options.format, options.output);
    return;
  }

  if (command === "report") {
    if (positional.length < 1) {
      throw new Error("Missing result.json path.\n\n" + usage());
    }
    const result = await readJson(path.resolve(positional[0]));
    await emit(result, options.format, options.output);
    return;
  }

  if (command === "compare") {
    if (positional.length < 2) {
      throw new Error("Missing before/after result paths.\n\n" + usage());
    }
    const before = await readJson(path.resolve(positional[0]));
    const after = await readJson(path.resolve(positional[1]));
    await emit(compareResults(before, after), options.format, options.output);
    return;
  }

  if (command === "start" || command === "guide") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const payload = await buildWorkflowGuide(positional[0], {
      goal: options.goal,
      request: options.request,
    });
    await emit(payload, options.format, options.output);
    return;
  }

  if (command === "explain-budget") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const payload = await explainBudget(positional[0]);
    await emit(payload, options.format, options.output);
    return;
  }

  if (command === "measurement-plan" || command === "recommend-measures") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const payload = await recommendMeasures(positional[0], {
      observedUsagePaths: options.observedUsagePaths,
    });
    await emit(payload, options.format, options.output);
    return;
  }

  if (command === "init-benchmark") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const payload = await initializeBenchmark(positional[0], {
      outputPath: options.output,
      model: options.model,
    });
    await emit(payload, options.format, null);
    return;
  }

  if (command === "benchmark") {
    if (positional.length < 1) {
      throw new Error("Missing target path.\n\n" + usage());
    }
    const payload = await runBenchmark(positional[0], {
      configPath: options.configPath,
      usageOutPath: options.usageOutPath,
      resultOutPath: options.resultOutPath,
      model: options.model,
      dryRun: options.dryRun,
    });
    await emit(payload, options.format, options.output);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}
```

## File: `src/core/analyze.js`

```javascript
import path from "node:path";

import { loadBudgetBaseline } from "./baseline.js";
import { applyBudgetBands, computeBudgetProfile } from "./budget.js";
import { buildImprovementBrief } from "./improvement-brief.js";
import { buildMeasurementPlan } from "./measurement-plan.js";
import { runMetricPacks } from "./metric-packs.js";
import { analyzeObservedUsage } from "./observed-usage.js";
import { applyEvaluationPresentation, createBudgetNextAction, createMeasurementPlanNextAction } from "./presentation.js";
import { createArtifact, createCheck, createEvaluationResult, createMetric } from "./schema.js";
import { computeSummary } from "./scoring.js";
import { resolveTarget } from "./target.js";
import { buildWorkflowGuide } from "./workflow-guide.js";
import { analyzeCodeMetrics } from "../evaluators/code.js";
import { analyzeCoverageArtifacts } from "../evaluators/coverage.js";
import { evaluatePlugin } from "../evaluators/plugin.js";
import { evaluateSkill } from "../evaluators/skill.js";

function appendFragment(result, fragment) {
  result.checks.push(...(fragment.checks || []));
  result.metrics.push(...(fragment.metrics || []));
  result.artifacts.push(...(fragment.artifacts || []));
}

function addBudgetFindings(result, budgets, baselineEvidence) {
  result.budgets = budgets;
  const bucketNames = ["trigger_cost_tokens", "invoke_cost_tokens", "deferred_cost_tokens"];

  for (const bucketName of bucketNames) {
    const bucket = budgets[bucketName];
    result.metrics.push(
      createMetric({
        id: bucketName,
        category: "budget",
        value: bucket.value,
        unit: "tokens",
        band: bucket.band,
      }),
    );

    if (bucket.band === "heavy" || bucket.band === "excessive") {
      result.checks.push(
        createCheck({
          id: `${bucketName}-budget-high`,
          category: "budget",
          severity: bucket.band === "excessive" ? "error" : "warning",
          status: bucket.band === "excessive" ? "fail" : "warn",
          message: `${bucketName} is ${bucket.band} relative to the current Codex baseline.`,
          evidence: [
            `Value: ${bucket.value} tokens`,
            `Baseline samples: skills=${baselineEvidence.skillSamples}, plugins=${baselineEvidence.pluginSamples}`,
          ],
          remediation: ["Reduce repeated instruction text and move detail into deferred supporting files."],
        }),
      );
    }
  }

  if (budgets.explicit_only_invoke_cost_tokens) {
    result.metrics.push(
      createMetric({
        id: "explicit_only_invoke_cost_tokens",
        category: "budget",
        value: budgets.explicit_only_invoke_cost_tokens.value,
        unit: "tokens",
        band: budgets.explicit_only_invoke_cost_tokens.band,
      }),
    );
  }

  result.artifacts.push(
    createArtifact({
      id: "budget-breakdown",
      type: "budget",
      label: "Budget breakdown",
      description: "Trigger, invoke, and deferred token budget analysis.",
      data: {
        budgets,
        baselineEvidence,
      },
    }),
  );
}

function normalizeExtensionPayload(extension) {
  return {
    ...extension,
    checks: extension.checks.map((check) => ({ ...check, source: `extension:${extension.name}` })),
    metrics: extension.metrics.map((metric) => ({ ...metric, source: `extension:${extension.name}` })),
    artifacts: extension.artifacts.map((artifact) => ({ ...artifact, source: `extension:${extension.name}` })),
  };
}

export async function analyzePath(targetPath, options = {}) {
  const target = await resolveTarget(targetPath);
  const result = createEvaluationResult(target);

  if (target.kind === "skill") {
    appendFragment(result, await evaluateSkill(target.path));
  } else if (target.kind === "plugin") {
    appendFragment(result, await evaluatePlugin(target.path));
  } else {
    result.checks.push(
      createCheck({
        id: "generic-target-analysis",
        category: "best-practice",
        severity: "info",
        status: "info",
        message: "The target is not a skill or plugin root, so only generic code, coverage, and budget analysis will run.",
        evidence: [path.resolve(target.path)],
        remediation: ["Point the analyzer at a skill directory or plugin root for richer structural checks."],
      }),
    );
  }

  const baseline = await loadBudgetBaseline();
  const rawBudget = await computeBudgetProfile(target);
  addBudgetFindings(result, applyBudgetBands(rawBudget, baseline), baseline.evidence);

  const observedUsageFragment = await analyzeObservedUsage(options.observedUsagePaths || [], rawBudget, target);
  if (observedUsageFragment) {
    result.observedUsage = observedUsageFragment.observedUsage;
    appendFragment(result, observedUsageFragment);
  }

  appendFragment(result, await analyzeCodeMetrics(target.path, target));
  appendFragment(result, await analyzeCoverageArtifacts(target.path));

  const extensions = await runMetricPacks(target, options.metricPackManifests || []);
  result.extensions = extensions.map(normalizeExtensionPayload);

  result.summary = computeSummary(result);
  result.measurementPlan = buildMeasurementPlan(result);
  result.artifacts.push(result.measurementPlan.artifact);
  result.improvementBrief = buildImprovementBrief(result);
  result.workflowGuide = await buildWorkflowGuide(target.path, {
    goal: result.observedUsage?.sampleCount ? "measure" : "evaluate",
  });
  result.measurementPlan.nextAction = createMeasurementPlanNextAction(result.measurementPlan);
  applyEvaluationPresentation(result);
  return result;
}

export async function explainBudget(targetPath) {
  const target = await resolveTarget(targetPath);
  const baseline = await loadBudgetBaseline();
  const rawBudget = await computeBudgetProfile(target);
  const payload = {
    kind: "budget-explanation",
    createdAt: new Date().toISOString(),
    target,
    budgets: applyBudgetBands(rawBudget, baseline),
    baselineEvidence: baseline.evidence,
    workflowGuide: await buildWorkflowGuide(target.path, {
      goal: "budget",
    }),
  };
  payload.nextAction = createBudgetNextAction(payload);
  return payload;
}

export async function recommendMeasures(targetPath, options = {}) {
  const result = await analyzePath(targetPath, options);
  const payload = {
    ...result.measurementPlan,
    workflowGuide: await buildWorkflowGuide(result.target.path, {
      goal: "measure",
    }),
  };
  payload.nextAction = payload.nextAction || createMeasurementPlanNextAction(payload);
  return payload;
}
```

## File: `src/core/baseline.js`

```javascript
import os from "node:os";
import path from "node:path";

import { computePluginBudget, computeSkillBudget } from "./budget.js";
import { listImmediateDirectories, pathExists, readJson, relativePath } from "../lib/files.js";

const DEFAULT_BASELINE = {
  skill: {
    trigger_cost_tokens: [48, 92, 150],
    invoke_cost_tokens: [220, 480, 900],
    deferred_cost_tokens: [180, 520, 1200],
  },
  plugin: {
    trigger_cost_tokens: [120, 260, 420],
    invoke_cost_tokens: [500, 1200, 2400],
    deferred_cost_tokens: [320, 900, 2200],
  },
  directory: {
    trigger_cost_tokens: [1, 1, 1],
    invoke_cost_tokens: [1, 1, 1],
    deferred_cost_tokens: [240, 640, 1600],
  },
};

let cachedBaseline = null;

function quantile(values, percentile) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * percentile)));
  return sorted[index];
}

function summarizeSamples(samples) {
  if (samples.length < 4) {
    return null;
  }
  return {
    trigger_cost_tokens: [
      quantile(samples.map((sample) => sample.trigger_cost_tokens.value), 0.5),
      quantile(samples.map((sample) => sample.trigger_cost_tokens.value), 0.75),
      quantile(samples.map((sample) => sample.trigger_cost_tokens.value), 0.9),
    ],
    invoke_cost_tokens: [
      quantile(samples.map((sample) => sample.invoke_cost_tokens.value), 0.5),
      quantile(samples.map((sample) => sample.invoke_cost_tokens.value), 0.75),
      quantile(samples.map((sample) => sample.invoke_cost_tokens.value), 0.9),
    ],
    deferred_cost_tokens: [
      quantile(samples.map((sample) => sample.deferred_cost_tokens.value), 0.5),
      quantile(samples.map((sample) => sample.deferred_cost_tokens.value), 0.75),
      quantile(samples.map((sample) => sample.deferred_cost_tokens.value), 0.9),
    ],
  };
}

async function collectSkillSamples(skillRoot) {
  if (!(await pathExists(skillRoot))) {
    return [];
  }
  const directories = await listImmediateDirectories(skillRoot);
  const samples = [];
  for (const directory of directories) {
    const skillPath = path.join(directory, "SKILL.md");
    if (!(await pathExists(skillPath))) {
      continue;
    }
    try {
      samples.push(await computeSkillBudget(directory));
    } catch {
      // Ignore malformed shipped samples and keep the baseline usable.
    }
  }
  return samples;
}

async function collectPluginSamples(pluginRoot) {
  if (!(await pathExists(pluginRoot))) {
    return [];
  }
  const directories = await listImmediateDirectories(pluginRoot);
  const samples = [];
  for (const directory of directories) {
    const manifestPath = path.join(directory, ".codex-plugin", "plugin.json");
    if (!(await pathExists(manifestPath))) {
      continue;
    }
    try {
      const manifest = await readJson(manifestPath);
      samples.push(await computePluginBudget(directory, manifest));
    } catch {
      // Ignore malformed shipped samples and keep the baseline usable.
    }
  }
  return samples;
}

export async function loadBudgetBaseline() {
  if (cachedBaseline) {
    return cachedBaseline;
  }

  const home = os.homedir();
  const skillRoot = path.join(home, ".codex", "skills");
  const curatedPluginRoot = path.join(home, ".codex", "plugins", "cache", "openai-curated");
  const tempPluginRoot = path.join(home, ".codex", ".tmp", "plugins", "plugins");

  const skillSamples = await collectSkillSamples(skillRoot);
  const pluginSamples = [
    ...(await collectPluginSamples(curatedPluginRoot)),
    ...(await collectPluginSamples(tempPluginRoot)),
  ];

  cachedBaseline = {
    skill: summarizeSamples(skillSamples) || DEFAULT_BASELINE.skill,
    plugin: summarizeSamples(pluginSamples) || DEFAULT_BASELINE.plugin,
    directory: DEFAULT_BASELINE.directory,
    evidence: {
      skillSamples: skillSamples.length,
      pluginSamples: pluginSamples.length,
      sourceRoots: [
        relativePath(process.cwd(), skillRoot),
        relativePath(process.cwd(), curatedPluginRoot),
        relativePath(process.cwd(), tempPluginRoot),
      ],
    },
  };

  return cachedBaseline;
}
```

## File: `src/core/benchmark-events.js`

```javascript
function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeUsageCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const usage = candidate.usage && typeof candidate.usage === "object"
    ? candidate.usage
    : candidate.response?.usage && typeof candidate.response?.usage === "object"
      ? candidate.response.usage
      : candidate;

  const inputTokens = toNumber(usage.input_tokens);
  const outputTokens = toNumber(usage.output_tokens);
  const totalTokens = toNumber(usage.total_tokens) ?? ((inputTokens || 0) + (outputTokens || 0));

  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  return {
    input_tokens: inputTokens || 0,
    output_tokens: outputTokens || 0,
    total_tokens: totalTokens || 0,
    ...(usage.input_token_details ? { input_token_details: usage.input_token_details } : {}),
    ...(usage.output_token_details ? { output_token_details: usage.output_token_details } : {}),
    ...(usage.output_tokens_details ? { output_tokens_details: usage.output_tokens_details } : {}),
    raw: usage,
  };
}

function collectUsageCandidate(value, matches) {
  if (!value || typeof value !== "object") {
    return;
  }

  const normalized = normalizeUsageCandidate(value);
  if (normalized) {
    matches.push(normalized);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUsageCandidate(item, matches);
    }
    return;
  }

  for (const nested of Object.values(value)) {
    collectUsageCandidate(nested, matches);
  }
}

function extractLatestUsage(events) {
  const matches = [];
  for (const event of events) {
    collectUsageCandidate(event, matches);
  }
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

function collectErrorMessage(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  if (typeof event.message === "string" && event.type === "error") {
    return event.message;
  }

  if (typeof event.error?.message === "string") {
    return event.error.message;
  }

  return null;
}

function extractShellCommand(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const candidates = [
    event.command,
    event.cmd,
    event.parameters?.cmd,
    event.arguments?.cmd,
    event.payload?.command,
    event.payload?.cmd,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (event.recipient_name === "functions.exec_command") {
    return event.parameters?.cmd || event.arguments?.cmd || event.command || "functions.exec_command";
  }

  return null;
}

function extractToolName(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const candidates = [
    event.tool_name,
    event.tool?.name,
    event.name,
    event.recipient_name,
    event.payload?.tool_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof event.type === "string" && event.type.includes("tool")) {
    return event.type;
  }

  return null;
}

function isShellEvent(event) {
  const type = typeof event?.type === "string" ? event.type : "";
  return Boolean(
    extractShellCommand(event) ||
      type.includes("exec_command") ||
      type.includes("shell"),
  );
}

function isToolEvent(event) {
  const type = typeof event?.type === "string" ? event.type : "";
  return Boolean(
    extractToolName(event) ||
      type.includes("tool"),
  );
}

function isFailureEvent(event) {
  const type = typeof event?.type === "string" ? event.type : "";
  return type.includes("failed") || type === "error" || Boolean(event?.error);
}

export function parseCodexJsonStream(text) {
  const lines = String(text || "").split(/\r?\n/);
  const events = [];
  const ignoredLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      events.push(JSON.parse(trimmed));
    } catch {
      ignoredLines.push(line);
    }
  }

  return {
    events,
    ignoredLines,
  };
}

export function summarizeCodexEvents(events) {
  const errorMessages = [];
  const toolNames = [];
  const shellCommands = [];
  const failedShellCommands = [];
  let threadId = null;
  let turnFailed = false;

  for (const event of events) {
    if (!threadId && typeof event.thread_id === "string") {
      threadId = event.thread_id;
    }

    const errorMessage = collectErrorMessage(event);
    if (errorMessage) {
      errorMessages.push(errorMessage);
    }

    if (isToolEvent(event)) {
      toolNames.push(extractToolName(event) || event.type || "tool");
    }

    if (isShellEvent(event)) {
      const command = extractShellCommand(event) || event.type || "shell";
      shellCommands.push(command);
      if (isFailureEvent(event)) {
        failedShellCommands.push(command);
      }
    }

    if (event.type === "turn.failed") {
      turnFailed = true;
    }
  }

  const usage = extractLatestUsage(events);
  const completed = events.some((event) => event.type === "turn.completed");
  const failed = turnFailed || events.some((event) => event.type === "turn.cancelled");

  return {
    threadId,
    eventCount: events.length,
    ignoredLineCount: 0,
    finalStatus: failed ? "failed" : completed ? "completed" : "unknown",
    errorMessages,
    toolCallCount: toolNames.length,
    shellCommandCount: shellCommands.length,
    failedShellCommandCount: failedShellCommands.length,
    toolNames,
    shellCommands,
    usage,
    usageAvailability: usage ? "present" : "unavailable",
  };
}
```

## File: `src/core/benchmark-workspace.js`

```javascript
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { isProbablyTextFile, isDirectory, readText, relativePath } from "../lib/files.js";

const execFileAsync = promisify(execFile);

const SNAPSHOT_IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  ".tmp",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".plugin-eval",
]);

function testFilePattern(filePath) {
  return /(^|\/)(tests?|__tests__)\/|(\.test|\.spec)\.|(^|\/)test_[^/]+\.py$/.test(filePath);
}

async function copyDirectory(sourcePath, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
}

async function copyIfExists(sourcePath, destinationPath) {
  try {
    await fs.access(sourcePath);
  } catch {
    return false;
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  return true;
}

async function resolveGitRoot(sourcePath) {
  const { stdout } = await execFileAsync("git", ["-C", sourcePath, "rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

async function createWorkspaceCopy(sourcePath, workspacePath) {
  await copyDirectory(sourcePath, workspacePath);
  return {
    workspacePath,
    cleanup: async () => {
      await fs.rm(workspacePath, { recursive: true, force: true });
    },
  };
}

async function createWorkspaceFromGitWorktree(sourcePath, workspacePath) {
  const repoRoot = await resolveGitRoot(sourcePath);
  await execFileAsync("git", ["-C", repoRoot, "worktree", "add", "--detach", workspacePath]);
  return {
    workspacePath,
    cleanup: async () => {
      await execFileAsync("git", ["-C", repoRoot, "worktree", "remove", "--force", workspacePath]);
    },
  };
}

async function provisionSkillInstall(target, codexHomePath) {
  const skillPath = path.join(codexHomePath, "skills", target.name);
  await copyDirectory(target.path, skillPath);
  return skillPath;
}

async function provisionPluginInstall(target, workspacePath) {
  const pluginsRoot = path.join(workspacePath, "plugins");
  const installPath = path.join(pluginsRoot, target.name);
  await copyDirectory(target.path, installPath);

  const marketplacePath = path.join(workspacePath, ".agents", "plugins", "marketplace.json");
  const marketplace = {
    name: "plugin-eval-benchmark",
    interface: {
      displayName: "Plugin Eval Benchmark",
    },
    plugins: [
      {
        name: target.name,
        source: {
          source: "local",
          path: `./plugins/${target.name}`,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Developer Tools",
      },
    ],
  };

  await fs.mkdir(path.dirname(marketplacePath), { recursive: true });
  await fs.writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
  return installPath;
}

async function seedCodexHome(codexHomePath) {
  const sourceCodexHome = process.env.PLUGIN_EVAL_CODEX_HOME_SOURCE
    ? path.resolve(process.env.PLUGIN_EVAL_CODEX_HOME_SOURCE)
    : path.join(os.homedir(), ".codex");

  await fs.mkdir(codexHomePath, { recursive: true });
  await Promise.all([
    copyIfExists(path.join(sourceCodexHome, "auth.json"), path.join(codexHomePath, "auth.json")),
    copyIfExists(path.join(sourceCodexHome, "config.toml"), path.join(codexHomePath, "config.toml")),
  ]);
}

export function defaultTargetProvisioningMode(target) {
  if (target.kind === "skill") {
    return "isolated-skill-home";
  }
  if (target.kind === "plugin") {
    return "workspace-plugin-marketplace";
  }
  throw new Error("Benchmarking only supports Codex skills and plugins.");
}

export async function provisionBenchmarkWorkspace({ target, config, scenarioId }) {
  const sourcePath = path.resolve(config.workspace.sourcePath);
  if (!(await isDirectory(sourcePath))) {
    throw new Error(`Benchmark workspace.sourcePath must be a directory: ${sourcePath}`);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `plugin-eval-${scenarioId}-`));
  const workspacePath = path.join(tempRoot, "workspace");
  const homePath = path.join(tempRoot, "home");
  const codexHomePath = path.join(homePath, ".codex");
  const setupMode = config.workspace.setupMode || "copy";

  await seedCodexHome(codexHomePath);

  const workspace =
    setupMode === "git-worktree"
      ? await createWorkspaceFromGitWorktree(sourcePath, workspacePath)
      : await createWorkspaceCopy(sourcePath, workspacePath);

  let installedTargetPath = null;
  if (config.targetProvisioning.mode === "isolated-skill-home") {
    installedTargetPath = await provisionSkillInstall(target, codexHomePath);
  } else if (config.targetProvisioning.mode === "workspace-plugin-marketplace") {
    installedTargetPath = await provisionPluginInstall(target, workspacePath);
  } else {
    throw new Error(`Unsupported target provisioning mode: ${config.targetProvisioning.mode}`);
  }

  return {
    tempRoot,
    workspacePath,
    homePath,
    codexHomePath,
    installedTargetPath,
    setupMode,
    cleanup: async () => {
      await workspace.cleanup();
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

async function hashFile(filePath) {
  const hash = createHash("sha1");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

async function visitSnapshot(rootPath, currentPath, entries) {
  const directoryEntries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of directoryEntries) {
    const entryPath = path.join(currentPath, entry.name);
    const relativeEntryPath = relativePath(rootPath, entryPath);

    if (entry.isDirectory()) {
      if (SNAPSHOT_IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      await visitSnapshot(rootPath, entryPath, entries);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = await fs.stat(entryPath);
    const isText = isProbablyTextFile(entryPath);
    const text = isText ? await readText(entryPath) : null;

    entries.set(relativeEntryPath, {
      path: relativeEntryPath,
      absolutePath: entryPath,
      size: stats.size,
      hash: await hashFile(entryPath),
      isText,
      lineCount: text === null ? null : text.replace(/\r\n/g, "\n").split("\n").length,
    });
  }
}

export async function snapshotWorkspace(rootPath) {
  const entries = new Map();
  await visitSnapshot(rootPath, rootPath, entries);
  return entries;
}

export function diffWorkspaceSnapshots(beforeSnapshot, afterSnapshot) {
  const added = [];
  const modified = [];
  const deleted = [];

  for (const [filePath, afterEntry] of afterSnapshot.entries()) {
    const beforeEntry = beforeSnapshot.get(filePath);
    if (!beforeEntry) {
      added.push({
        path: filePath,
        status: "added",
        isText: afterEntry.isText,
        lineCountBefore: 0,
        lineCountAfter: afterEntry.lineCount,
        lineDelta: typeof afterEntry.lineCount === "number" ? afterEntry.lineCount : null,
      });
      continue;
    }

    if (beforeEntry.hash !== afterEntry.hash) {
      modified.push({
        path: filePath,
        status: "modified",
        isText: afterEntry.isText || beforeEntry.isText,
        lineCountBefore: beforeEntry.lineCount,
        lineCountAfter: afterEntry.lineCount,
        lineDelta:
          typeof beforeEntry.lineCount === "number" && typeof afterEntry.lineCount === "number"
            ? afterEntry.lineCount - beforeEntry.lineCount
            : null,
      });
    }
  }

  for (const [filePath, beforeEntry] of beforeSnapshot.entries()) {
    if (!afterSnapshot.has(filePath)) {
      deleted.push({
        path: filePath,
        status: "deleted",
        isText: beforeEntry.isText,
        lineCountBefore: beforeEntry.lineCount,
        lineCountAfter: 0,
        lineDelta: typeof beforeEntry.lineCount === "number" ? -beforeEntry.lineCount : null,
      });
    }
  }

  return {
    added: added.sort((a, b) => a.path.localeCompare(b.path)),
    modified: modified.sort((a, b) => a.path.localeCompare(b.path)),
    deleted: deleted.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export function summarizeWorkspaceDiff(diff) {
  const changedFiles = [...diff.added, ...diff.modified];
  return {
    addedFileCount: diff.added.length,
    modifiedFileCount: diff.modified.length,
    deletedFileCount: diff.deleted.length,
    changedFileCount: changedFiles.length,
    generatedFileCount: diff.added.length,
    generatedTestFileCount: diff.added.filter((entry) => testFilePattern(entry.path)).length,
    changedTestFileCount: changedFiles.filter((entry) => testFilePattern(entry.path)).length,
    changedTextLineDelta: changedFiles.reduce((sum, entry) => sum + (entry.lineDelta || 0), 0),
    changedFiles,
    allChanges: [...diff.added, ...diff.modified, ...diff.deleted],
  };
}
```

## File: `src/core/benchmark.js`

```javascript
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { analyzeCoverageArtifacts } from "../evaluators/coverage.js";
import { analyzePythonFiles } from "../evaluators/python.js";
import { analyzeTypeScriptFiles } from "../evaluators/typescript.js";
import { formatCommandPath, pathExists, readJson, readText, relativePath, writeJson, writeText } from "../lib/files.js";
import { createBenchmarkRunNextAction, createBenchmarkTemplateNextAction } from "./presentation.js";
import { createArtifact } from "./schema.js";
import { summarizeCodexEvents, parseCodexJsonStream } from "./benchmark-events.js";
import {
  defaultTargetProvisioningMode,
  diffWorkspaceSnapshots,
  provisionBenchmarkWorkspace,
  snapshotWorkspace,
  summarizeWorkspaceDiff,
} from "./benchmark-workspace.js";
import { resolveTarget } from "./target.js";
import { buildWorkflowGuide } from "./workflow-guide.js";

const BENCHMARK_SCHEMA_VERSION = 2;

function sanitizeId(value) {
  return String(value || "scenario")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "scenario";
}

function benchmarkDirectoryForTarget(target) {
  return path.join(target.path, ".plugin-eval");
}

function benchmarkRunsDirectoryForTarget(target) {
  return path.join(benchmarkDirectoryForTarget(target), "runs");
}

function defaultBenchmarkConfigPath(target) {
  return path.join(benchmarkDirectoryForTarget(target), "benchmark.json");
}

function defaultUsageLogPath(target) {
  return path.join(benchmarkDirectoryForTarget(target), "benchmark-usage.jsonl");
}

function defaultModelForTarget(target) {
  return target.kind === "plugin" ? "gpt-5.4" : "gpt-5.4-mini";
}

function createRunId() {
  return new Date().toISOString().replaceAll(":", "-").replace(/\..+$/, "");
}

function normalizeScenario(scenario, index) {
  return {
    id: sanitizeId(scenario.id || scenario.title || `scenario-${index + 1}`),
    title: scenario.title || `Scenario ${index + 1}`,
    purpose: scenario.purpose || "",
    userInput: scenario.userInput || "",
    successChecklist: Array.isArray(scenario.successChecklist) ? scenario.successChecklist : [],
  };
}

function normalizeConfig(config, target) {
  if (config?.schemaVersion === 1 || config?.harnessPrompt || config?.baseUrl || config?.apiKeyEnv) {
    throw new Error(
      "Legacy Responses-style benchmark configs are no longer supported. Re-run `plugin-eval init-benchmark <path>` to generate a CLI-only Codex benchmark config.",
    );
  }

  if (!config || config.kind !== "plugin-eval-benchmark") {
    throw new Error("Invalid benchmark config. Expected a plugin-eval benchmark config file.");
  }

  if (config.schemaVersion !== BENCHMARK_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported benchmark schema version: ${config.schemaVersion}. Re-run \`plugin-eval init-benchmark ${formatCommandPath(target.path)}\` to regenerate the config.`,
    );
  }

  if (config.runner?.type !== "codex-cli") {
    throw new Error("Benchmark runner.type must be \"codex-cli\".");
  }

  if (!config.workspace?.sourcePath) {
    throw new Error("Benchmark config must set workspace.sourcePath.");
  }

  if (!config.targetProvisioning?.mode) {
    throw new Error("Benchmark config must set targetProvisioning.mode.");
  }

  return config;
}

function buildSetupQuestions(target) {
  const label = target.kind === "plugin" ? "plugin" : "skill";
  return [
    `What are the 3 highest-value real tasks this ${label} should help complete inside a workspace?`,
    `Which scenario is the must-pass end-to-end task for this ${label}?`,
    `What output should exist on disk if the scenario succeeds?`,
    `Which verification command would tell you the result is actually usable?`,
    `What boundary case should this ${label} narrow, refuse, or hand off instead of overreaching on?`,
  ];
}

function buildSkillScenarios(target) {
  return [
    {
      id: "happy-path",
      title: "Happy path implementation",
      purpose: "Run a representative task that should clearly justify using this skill inside the workspace.",
      userInput: `Use the local Codex skill "${target.name}" if it helps. Complete a representative task for this skill in the current workspace and leave the result on disk.`,
      successChecklist: [
        "The task is completed in the workspace, not only described.",
        "The final answer explains what changed.",
        "The run stays aligned with the skill's specialty.",
      ],
    },
    {
      id: "follow-up",
      title: "Focused refinement",
      purpose: "Measure whether the skill can improve an implementation cleanly instead of restarting from scratch.",
      userInput: `Use the local Codex skill "${target.name}" if it helps. Refine or extend the current workspace with one focused follow-up improvement and finish the change end to end.`,
      successChecklist: [
        "The result makes a concrete change on disk.",
        "The follow-up remains scoped and coherent.",
      ],
    },
    {
      id: "boundary-case",
      title: "Boundary handling",
      purpose: "Check whether the skill avoids overreaching when the task is only a partial fit.",
      userInput: `This task is only a partial match for the local Codex skill "${target.name}". Handle the appropriate slice in the workspace and narrow or refuse the rest honestly.`,
      successChecklist: [
        "The run sets good boundaries instead of pretending the skill fits everything.",
        "Any edits stay aligned with the justified scope.",
      ],
    },
  ];
}

function buildPluginScenarios(target) {
  return [
    {
      id: "entrypoint-routing",
      title: "Entrypoint routing",
      purpose: "Check whether the plugin routes a representative request through the right capability and finishes the task in the workspace.",
      userInput: `Use the local Codex plugin "${target.name}" if it helps. Handle a representative request for this plugin in the current workspace and finish the task.`,
      successChecklist: [
        "The run uses the right plugin capability.",
        "The result changes the workspace instead of only describing work.",
      ],
    },
    {
      id: "multi-skill-follow-up",
      title: "Multi-capability follow-up",
      purpose: "Measure whether a second request stays coherent when the plugin needs a different angle.",
      userInput: `Use the local Codex plugin "${target.name}" if it helps. Complete a follow-up task in the current workspace that needs a different angle from the same plugin, and keep the result cohesive.`,
      successChecklist: [
        "The task completes end to end.",
        "The run stays coherent instead of redoing unrelated work.",
      ],
    },
    {
      id: "plugin-boundary",
      title: "Plugin boundary",
      purpose: "Check whether the plugin narrows scope when the request is a weak match.",
      userInput: `This task is a weak match for the local Codex plugin "${target.name}". Handle the appropriate slice in the workspace, leave unrelated work alone, and explain the boundary clearly.`,
      successChecklist: [
        "The run narrows scope instead of forcing a bad fit.",
        "Any edits stay justified by the request.",
      ],
    },
  ];
}

async function createStarterBenchmarkConfig(target, options = {}) {
  if (!["skill", "plugin"].includes(target.kind)) {
    throw new Error("Benchmarking only supports Codex skills and plugins.");
  }

  return {
    kind: "plugin-eval-benchmark",
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    version: BENCHMARK_SCHEMA_VERSION,
    targetKind: target.kind,
    targetName: target.name,
    runner: {
      type: "codex-cli",
      model: options.model || defaultModelForTarget(target),
      sandbox: "workspace-write",
      approvalPolicy: "never",
      extraArgs: [],
    },
    workspace: {
      sourcePath: path.resolve(options.sourcePath || process.cwd()),
      setupMode: "copy",
      preserve: "on-failure",
    },
    targetProvisioning: {
      mode: defaultTargetProvisioningMode(target),
    },
    verifiers: {
      commands: [],
    },
    notes: [
      "Edit workspace.sourcePath so it points at the repo or template you want Codex to work inside.",
      "Edit the scenarios so they match real tasks instead of generic starter prompts.",
      "Benchmark means real codex exec runs now. There is no simulated dry-run mode.",
    ],
    setupQuestions: buildSetupQuestions(target),
    scenarios: target.kind === "plugin" ? buildPluginScenarios(target) : buildSkillScenarios(target),
  };
}

async function loadBenchmarkConfig(target, options = {}) {
  if (options.configPath) {
    const config = readJson(path.resolve(options.configPath));
    return {
      config: normalizeConfig(await config, target),
      configPath: path.resolve(options.configPath),
      source: "file",
    };
  }

  const defaultConfigPath = defaultBenchmarkConfigPath(target);
  if (await pathExists(defaultConfigPath)) {
    const config = await readJson(defaultConfigPath);
    return {
      config: normalizeConfig(config, target),
      configPath: defaultConfigPath,
      source: "file",
    };
  }

  const generated = await createStarterBenchmarkConfig(target, options);
  return {
    config: generated,
    configPath: null,
    source: "generated",
  };
}

async function runProcessCapture({
  command,
  args,
  cwd,
  env,
  stdoutPath,
  stderrPath,
}) {
  const startedAt = Date.now();
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks = [];
  const stderrChunks = [];

  if (child.stdout) {
    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });
  }

  const outcome = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });

  const stdoutText = Buffer.concat(stdoutChunks).toString("utf8");
  const stderrText = Buffer.concat(stderrChunks).toString("utf8");

  if (stdoutPath) {
    await writeText(stdoutPath, stdoutText);
  }
  if (stderrPath) {
    await writeText(stderrPath, stderrText);
  }

  return {
    ...outcome,
    durationMs: Date.now() - startedAt,
    stdoutText,
    stderrText,
  };
}

function buildObservedUsageLine(target, scenario, usage) {
  return JSON.stringify({
    id: `${target.name}-${scenario.id}`,
    usage: usage.raw || usage,
    metadata: {
      scenario: scenario.title,
      scenario_id: scenario.id,
      benchmark_target_name: target.name,
      benchmark_target_kind: target.kind,
    },
  });
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function buildCodexExecArgs({
  config,
  model,
  workspacePath,
  finalMessagePath,
  prompt,
}) {
  return [
    "exec",
    "--json",
    "--ephemeral",
    "--skip-git-repo-check",
    "--cd",
    workspacePath,
    "--output-last-message",
    finalMessagePath,
    "-s",
    config.runner.sandbox || "workspace-write",
    "-c",
    `approval_policy=${tomlString(config.runner.approvalPolicy || "never")}`,
    "-m",
    model,
    ...(Array.isArray(config.runner.extraArgs) ? config.runner.extraArgs : []),
    prompt,
  ];
}

function filterCodeFiles(filePaths) {
  const tsFiles = [];
  const pyFiles = [];

  for (const filePath of filePaths) {
    const extension = path.extname(filePath).toLowerCase();
    if ([".ts", ".tsx", ".mts", ".cts"].includes(extension)) {
      tsFiles.push(filePath);
    } else if (extension === ".py") {
      pyFiles.push(filePath);
    }
  }

  return { tsFiles, pyFiles };
}

async function analyzeChangedWorkspaceCode(workspacePath, changedRelativePaths) {
  const absoluteFilePaths = changedRelativePaths
    .map((filePath) => path.join(workspacePath, filePath))
    .filter((filePath) => path.extname(filePath));
  const { tsFiles, pyFiles } = filterCodeFiles(absoluteFilePaths);
  const tsAnalysis = await analyzeTypeScriptFiles(tsFiles, workspacePath);
  const pyAnalysis = await analyzePythonFiles(pyFiles, workspacePath);
  const coverageAnalysis = await analyzeCoverageArtifacts(workspacePath);

  return {
    checks: [...tsAnalysis.checks, ...pyAnalysis.checks, ...coverageAnalysis.checks],
    metrics: [...tsAnalysis.metrics, ...pyAnalysis.metrics, ...coverageAnalysis.metrics],
    artifacts: [...tsAnalysis.artifacts, ...pyAnalysis.artifacts, ...coverageAnalysis.artifacts],
  };
}

async function runVerifierCommands({ commands, cwd, processRunner, basePath }) {
  const results = [];

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const stdoutPath = path.join(basePath, `verifier-${index + 1}.stdout.log`);
    const stderrPath = path.join(basePath, `verifier-${index + 1}.stderr.log`);
    const outcome = await processRunner({
      kind: "verifier",
      command: "/bin/zsh",
      args: ["-lc", command],
      cwd,
      env: process.env,
      stdoutPath,
      stderrPath,
    });

    results.push({
      command,
      status: outcome.code === 0 ? "passed" : "failed",
      exitCode: outcome.code,
      signal: outcome.signal || null,
      durationMs: outcome.durationMs,
      stdoutPath,
      stderrPath,
    });
  }

  return results;
}

function summarizeRunScenarios(runScenarios) {
  const usageSamples = runScenarios.filter((scenario) => scenario.usage);
  const completedScenarios = runScenarios.filter((scenario) => scenario.status === "completed").length;
  const failedScenarios = runScenarios.filter((scenario) => scenario.status !== "completed").length;
  const input = usageSamples.reduce((sum, scenario) => sum + (scenario.usage?.input_tokens || 0), 0);
  const output = usageSamples.reduce((sum, scenario) => sum + (scenario.usage?.output_tokens || 0), 0);
  const total = usageSamples.reduce((sum, scenario) => sum + (scenario.usage?.total_tokens || 0), 0);
  const generatedFileCount = runScenarios.reduce((sum, scenario) => sum + (scenario.workspaceSummary?.generatedFileCount || 0), 0);
  const generatedTestFileCount = runScenarios.reduce((sum, scenario) => sum + (scenario.workspaceSummary?.generatedTestFileCount || 0), 0);
  const toolCallCount = runScenarios.reduce((sum, scenario) => sum + (scenario.telemetry?.toolCallCount || 0), 0);
  const shellCommandCount = runScenarios.reduce((sum, scenario) => sum + (scenario.telemetry?.shellCommandCount || 0), 0);
  const failedShellCommands = runScenarios.reduce((sum, scenario) => sum + (scenario.telemetry?.failedShellCommandCount || 0), 0);
  const verifierPassCount = runScenarios.reduce(
    (sum, scenario) => sum + scenario.verifierResults.filter((result) => result.status === "passed").length,
    0,
  );
  const verifierFailCount = runScenarios.reduce(
    (sum, scenario) => sum + scenario.verifierResults.filter((result) => result.status === "failed").length,
    0,
  );

  return {
    scenarioCount: runScenarios.length,
    completedScenarios,
    failedScenarios,
    sampleCount: usageSamples.length,
    usageAvailability:
      usageSamples.length === 0
        ? "unavailable"
        : usageSamples.length === runScenarios.length
          ? "present"
          : "partial",
    averageInputTokens: usageSamples.length > 0 ? Number((input / usageSamples.length).toFixed(2)) : 0,
    averageOutputTokens: usageSamples.length > 0 ? Number((output / usageSamples.length).toFixed(2)) : 0,
    averageTotalTokens: usageSamples.length > 0 ? Number((total / usageSamples.length).toFixed(2)) : 0,
    generatedFileCount,
    generatedTestFileCount,
    toolCallCount,
    shellCommandCount,
    failedShellCommands,
    verifierPassCount,
    verifierFailCount,
  };
}

export async function initializeBenchmark(targetPath, options = {}) {
  const target = await resolveTarget(targetPath);
  const config = await createStarterBenchmarkConfig(target, options);
  const outputPath = path.resolve(options.outputPath || defaultBenchmarkConfigPath(target));
  await writeJson(outputPath, config);

  const payload = {
    kind: "benchmark-template-init",
    createdAt: new Date().toISOString(),
    target: {
      ...target,
      relativePath: relativePath(process.cwd(), target.path),
    },
    configPath: outputPath,
    scenarioCount: config.scenarios.length,
    notes: config.notes,
    setupQuestions: config.setupQuestions || [],
    nextSteps: [
      `Edit ${formatCommandPath(outputPath)} so workspace.sourcePath, scenarios, and verifiers match your real workflow.`,
      `Run the benchmark with: plugin-eval benchmark ${formatCommandPath(target.path)} --config ${formatCommandPath(outputPath)}`,
      "The benchmark result will be written under .plugin-eval/runs/<timestamp>/benchmark-run.json.",
    ],
    workflowGuide: await buildWorkflowGuide(target.path, {
      goal: "benchmark",
    }),
    artifact: createArtifact({
      id: "benchmark-template",
      type: "benchmark-template",
      label: "Benchmark template",
      description: "Starter benchmark config for Codex CLI execution.",
      path: outputPath,
    }),
  };
  payload.nextAction = createBenchmarkTemplateNextAction(payload);
  return payload;
}

export async function runBenchmark(targetPath, options = {}) {
  const target = await resolveTarget(targetPath);
  const { config, configPath, source } = await loadBenchmarkConfig(target, options);
  const scenarios = (config.scenarios || []).map(normalizeScenario).filter((scenario) => scenario.userInput);
  if (scenarios.length === 0) {
    throw new Error("Benchmark config does not contain any runnable scenarios.");
  }
  if (options.dryRun) {
    throw new Error("CLI-only benchmarking no longer supports --dry-run. Edit the benchmark config, then run `plugin-eval benchmark` for a real Codex execution.");
  }

  const processRunner = options.processRunner || runProcessCapture;
  const codexExecutable = options.codexExecutable || process.env.PLUGIN_EVAL_CODEX_EXECUTABLE || "codex";
  const runId = createRunId();
  const runDirectory = path.join(benchmarkRunsDirectoryForTarget(target), runId);
  await fs.mkdir(runDirectory, { recursive: true });

  let codexVersion = "unknown";
  try {
    const versionResult = await processRunner({
      kind: "codex-version",
      command: codexExecutable,
      args: ["--version"],
      cwd: process.cwd(),
      env: process.env,
      stdoutPath: path.join(runDirectory, "codex-version.stdout.log"),
      stderrPath: path.join(runDirectory, "codex-version.stderr.log"),
    });
    codexVersion = (versionResult.stdoutText || versionResult.stderrText || "unknown").trim().split(/\r?\n/).pop() || "unknown";
  } catch {
    codexVersion = "unknown";
  }

  const usageLines = [];
  const runScenarios = [];

  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    const scenarioDirectory = path.join(runDirectory, `${String(index + 1).padStart(2, "0")}-${scenario.id}`);
    await fs.mkdir(scenarioDirectory, { recursive: true });

    const provisioned = await provisionBenchmarkWorkspace({
      target,
      config,
      scenarioId: scenario.id,
    });
    const beforeSnapshot = await snapshotWorkspace(provisioned.workspacePath);
    const stdoutPath = path.join(scenarioDirectory, "codex.stdout.jsonl");
    const stderrPath = path.join(scenarioDirectory, "codex.stderr.log");
    const finalMessagePath = path.join(scenarioDirectory, "final-message.txt");

    const args = buildCodexExecArgs({
      config,
      model: options.model || config.runner.model || defaultModelForTarget(target),
      workspacePath: provisioned.workspacePath,
      finalMessagePath,
      prompt: scenario.userInput,
    });

    const codexRun = await processRunner({
      kind: "codex",
      command: codexExecutable,
      args,
      cwd: provisioned.workspacePath,
      env: {
        ...process.env,
        HOME: provisioned.homePath,
        CODEX_HOME: provisioned.codexHomePath,
      },
      stdoutPath,
      stderrPath,
    });

    const parsedEvents = parseCodexJsonStream(codexRun.stdoutText);
    const telemetry = summarizeCodexEvents(parsedEvents.events);
    telemetry.ignoredLineCount = parsedEvents.ignoredLines.length;

    const afterSnapshot = await snapshotWorkspace(provisioned.workspacePath);
    const workspaceDiff = diffWorkspaceSnapshots(beforeSnapshot, afterSnapshot);
    const workspaceSummary = summarizeWorkspaceDiff(workspaceDiff);
    const generatedCode = await analyzeChangedWorkspaceCode(
      provisioned.workspacePath,
      workspaceSummary.changedFiles.map((entry) => entry.path),
    );
    const verifierResults = await runVerifierCommands({
      commands: Array.isArray(config.verifiers?.commands) ? config.verifiers.commands : [],
      cwd: provisioned.workspacePath,
      processRunner,
      basePath: scenarioDirectory,
    });

    const finalMessage = await readText(finalMessagePath).catch(() => "");
    const codexSucceeded = codexRun.code === 0 && telemetry.finalStatus !== "failed";
    const verifiersPassed = verifierResults.every((result) => result.status === "passed");
    const scenarioStatus = codexSucceeded && verifiersPassed ? "completed" : "failed";

    if (telemetry.usage) {
      usageLines.push(buildObservedUsageLine(target, scenario, telemetry.usage));
    }

    const preserveMode = config.workspace.preserve || "on-failure";
    const shouldPreserveWorkspace =
      preserveMode === "always" ||
      (preserveMode === "on-failure" && scenarioStatus !== "completed");

    runScenarios.push({
      id: scenario.id,
      title: scenario.title,
      purpose: scenario.purpose,
      successChecklist: scenario.successChecklist,
      status: scenarioStatus,
      exitCode: codexRun.code,
      signal: codexRun.signal || null,
      durationMs: codexRun.durationMs,
      prompt: scenario.userInput,
      finalMessagePath: await pathExists(finalMessagePath) ? finalMessagePath : null,
      finalMessagePreview: finalMessage.trim() || null,
      rawEventLogPath: stdoutPath,
      stderrLogPath: stderrPath,
      usage: telemetry.usage,
      usageAvailability: telemetry.usageAvailability,
      telemetry,
      workspacePath: shouldPreserveWorkspace ? provisioned.workspacePath : null,
      workspaceSummary,
      workspaceChanges: workspaceSummary.allChanges,
      generatedCode,
      verifierResults,
      installedTargetPath: provisioned.installedTargetPath,
      codexHomePath: provisioned.codexHomePath,
    });

    if (!shouldPreserveWorkspace) {
      await provisioned.cleanup();
    }
  }

  const usageOutPath = usageLines.length > 0
    ? path.resolve(options.usageOutPath || defaultUsageLogPath(target))
    : null;
  if (usageOutPath) {
    await writeText(usageOutPath, `${usageLines.join("\n")}\n`);
    await writeText(path.join(runDirectory, "observed-usage.jsonl"), `${usageLines.join("\n")}\n`);
  }

  const resultOutPath = path.resolve(options.resultOutPath || path.join(runDirectory, "benchmark-run.json"));
  const summary = summarizeRunScenarios(runScenarios);
  const payload = {
    kind: "benchmark-run",
    createdAt: new Date().toISOString(),
    mode: "codex-cli",
    target: {
      ...target,
      relativePath: relativePath(process.cwd(), target.path),
    },
    codexVersion,
    config: {
      source,
      path: configPath,
      runnerType: config.runner.type,
      model: options.model || config.runner.model || defaultModelForTarget(target),
      sandbox: config.runner.sandbox || "workspace-write",
      approvalPolicy: config.runner.approvalPolicy || "never",
      scenarioCount: scenarios.length,
      workspaceSourcePath: path.resolve(config.workspace.sourcePath),
      workspaceSetupMode: config.workspace.setupMode || "copy",
      workspacePreserve: config.workspace.preserve || "on-failure",
      targetProvisioningMode: config.targetProvisioning.mode,
      verifierCount: Array.isArray(config.verifiers?.commands) ? config.verifiers.commands.length : 0,
    },
    runDirectory,
    usageLogPath: usageOutPath,
    resultPath: resultOutPath,
    summary,
    scenarios: runScenarios,
    nextSteps: usageOutPath
      ? [
          `Analyze the observed usage with: plugin-eval analyze ${formatCommandPath(target.path)} --observed-usage ${formatCommandPath(usageOutPath)} --format markdown`,
          `Review the measurement plan with: plugin-eval measurement-plan ${formatCommandPath(target.path)} --observed-usage ${formatCommandPath(usageOutPath)} --format markdown`,
        ]
      : [
          `Review the benchmark report with: plugin-eval report ${formatCommandPath(resultOutPath)} --format markdown`,
          "If token usage was unavailable, use the workspace outputs and verifier results as the primary quality signal.",
        ],
    workflowGuide: await buildWorkflowGuide(target.path, {
      goal: summary.sampleCount > 0 ? "measure" : "benchmark",
    }),
  };

  payload.nextAction = createBenchmarkRunNextAction(payload);
  await writeJson(resultOutPath, payload);
  return payload;
}
```

## File: `src/core/budget.js`

```javascript
import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, parseYamlDocument } from "../lib/frontmatter.js";
import { isDirectory, isProbablyTextFile, pathExists, readJson, readText, relativePath, walkFiles } from "../lib/files.js";
import { estimateTokenCount, sumTokenCounts } from "../lib/tokens.js";

function createComponent(label, componentPath, tokens, note) {
  return {
    label,
    path: componentPath,
    tokens,
    note,
  };
}

function buildBudgetBucket(value, thresholds, components) {
  const [goodMax, moderateMax, heavyMax] = thresholds;
  const band =
    value <= goodMax ? "good" : value <= moderateMax ? "moderate" : value <= heavyMax ? "heavy" : "excessive";
  return {
    value,
    band,
    thresholds: {
      goodMax,
      moderateMax,
      heavyMax,
    },
    components,
  };
}

async function gatherDeferredTextFiles(rootPath, excludeFiles = []) {
  const files = await walkFiles(rootPath);
  return files.filter(
    (filePath) => !excludeFiles.includes(filePath) && isProbablyTextFile(filePath),
  );
}

async function computeDeferredComponents(rootPath, excludeFiles = []) {
  const files = await gatherDeferredTextFiles(rootPath, excludeFiles);
  const components = [];
  for (const filePath of files) {
    const content = await readText(filePath);
    components.push(
      createComponent(
        relativePath(rootPath, filePath),
        filePath,
        estimateTokenCount(content),
        "Deferred supporting file",
      ),
    );
  }
  return components;
}

async function readInvocationPolicy(rootPath) {
  const policyPath = path.join(rootPath, "agents", "openai.yaml");
  if (!(await pathExists(policyPath))) {
    return {
      allowImplicitInvocation: true,
      path: null,
    };
  }

  try {
    const parsed = parseYamlDocument(await readText(policyPath));
    return {
      allowImplicitInvocation: parsed?.policy?.allow_implicit_invocation !== false,
      path: policyPath,
    };
  } catch {
    return {
      allowImplicitInvocation: true,
      path: policyPath,
    };
  }
}

export async function computeSkillBudget(skillRoot) {
  const skillPath = path.join(skillRoot, "SKILL.md");
  const content = await readText(skillPath);
  const parsed = parseFrontmatter(content);
  const name = parsed.data?.name || path.basename(skillRoot);
  const description = parsed.data?.description || "";
  const invocationPolicy = await readInvocationPolicy(skillRoot);

  const triggerComponents = invocationPolicy.allowImplicitInvocation ? [
    createComponent("skill-name", skillPath, estimateTokenCount(name), "Always-loaded skill identifier"),
    createComponent(
      "skill-description",
      skillPath,
      estimateTokenCount(description),
      "Always-loaded trigger description",
    ),
  ] : [];

  const invokeComponents = [
    createComponent("skill-file", skillPath, estimateTokenCount(content), "Loaded when the skill is invoked"),
  ];

  const deferredComponents = await computeDeferredComponents(skillRoot, [skillPath]);

  return {
    kind: "skill",
    method: invocationPolicy.allowImplicitInvocation ? "estimated-static" : "estimated-static-policy-aware",
    invocation_policy: {
      allow_implicit_invocation: invocationPolicy.allowImplicitInvocation,
      ...(invocationPolicy.path ? { path: invocationPolicy.path } : {}),
    },
    trigger_cost_tokens: {
      value: sumTokenCounts(triggerComponents),
      components: triggerComponents,
    },
    invoke_cost_tokens: {
      value: sumTokenCounts(invokeComponents),
      components: invokeComponents,
    },
    deferred_cost_tokens: {
      value: sumTokenCounts(deferredComponents),
      components: deferredComponents,
    },
  };
}

export async function computePluginBudget(pluginRoot, manifest) {
  const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  const manifestContent = await readText(manifestPath);
  const skillDirs = manifest?.skills
    ? await discoverSkillDirs(pluginRoot, manifest.skills)
    : await discoverSkillDirs(pluginRoot, "./skills/");

  const triggerComponents = [
    createComponent(
      "plugin-description",
      manifestPath,
      estimateTokenCount(manifest?.description || ""),
      "Plugin marketplace summary",
    ),
    createComponent(
      "default-prompts",
      manifestPath,
      estimateTokenCount((manifest?.interface?.defaultPrompt || []).join("\n")),
      "Starter prompts visible in the UI",
    ),
  ];

  const invokeComponents = [
    createComponent("plugin-manifest", manifestPath, estimateTokenCount(manifestContent), "Manifest load cost"),
  ];
  const explicitOnlyComponents = [];
  const implicitSkills = [];
  const explicitOnlySkills = [];

  for (const skillDir of skillDirs) {
    const skillPath = path.join(skillDir, "SKILL.md");
    if (!(await pathExists(skillPath))) {
      continue;
    }
    const content = await readText(skillPath);
    const parsed = parseFrontmatter(content);
    const skillName = path.basename(skillDir);
    const invocationPolicy = await readInvocationPolicy(skillDir);

    if (invocationPolicy.allowImplicitInvocation) {
      implicitSkills.push(skillName);
      triggerComponents.push(
        createComponent(
          `${skillName}-description`,
          skillPath,
          estimateTokenCount(parsed.data?.description || ""),
          "Skill trigger description exposed through the plugin",
        ),
      );
      invokeComponents.push(
        createComponent(
          `${skillName}-skill-file`,
          skillPath,
          estimateTokenCount(content),
          "Implicit skill invocation cost ceiling",
        ),
      );
    } else {
      explicitOnlySkills.push(skillName);
      explicitOnlyComponents.push(
        createComponent(
          `${skillName}-skill-file`,
          skillPath,
          estimateTokenCount(content),
          "Explicit-only skill file; excluded from implicit trigger/invoke budget",
        ),
      );
    }
  }

  const deferredComponents = await computeDeferredComponents(pluginRoot, [
    manifestPath,
    ...skillDirs.map((skillDir) => path.join(skillDir, "SKILL.md")),
  ]);

  return {
    kind: "plugin",
    method: explicitOnlySkills.length > 0 ? "estimated-static-policy-aware" : "estimated-static",
    invocation_policy: {
      implicit_skill_count: implicitSkills.length,
      explicit_only_skill_count: explicitOnlySkills.length,
      implicit_skills: implicitSkills,
      explicit_only_skills: explicitOnlySkills,
    },
    trigger_cost_tokens: {
      value: sumTokenCounts(triggerComponents),
      components: triggerComponents,
    },
    invoke_cost_tokens: {
      value: sumTokenCounts(invokeComponents),
      components: invokeComponents,
    },
    deferred_cost_tokens: {
      value: sumTokenCounts(deferredComponents),
      components: deferredComponents,
    },
    explicit_only_invoke_cost_tokens: {
      value: sumTokenCounts(explicitOnlyComponents),
      components: explicitOnlyComponents,
    },
  };
}

async function discoverSkillDirs(pluginRoot, skillsPath) {
  const directory = path.join(pluginRoot, skillsPath.replace(/^\.\//, ""));
  if (!(await isDirectory(directory))) {
    return [];
  }
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

export async function computeBudgetProfile(target) {
  if (target.kind === "skill") {
    return computeSkillBudget(target.path);
  }
  if (target.kind === "plugin") {
    const manifest = await readJson(path.join(target.path, ".codex-plugin", "plugin.json"));
    return computePluginBudget(target.path, manifest);
  }

  const files = await gatherDeferredTextFiles(target.path);
  const components = [];
  for (const filePath of files) {
    const content = await readText(filePath);
    components.push(
      createComponent(
        relativePath(target.path, filePath),
        filePath,
        estimateTokenCount(content),
        "Generic text file budget",
      ),
    );
  }
  return {
    kind: target.kind,
    trigger_cost_tokens: { value: 0, components: [] },
    invoke_cost_tokens: { value: 0, components: [] },
    deferred_cost_tokens: { value: sumTokenCounts(components), components },
  };
}

export function applyBudgetBands(rawBudget, baseline) {
  const profile = baseline?.[rawBudget.kind] || baseline?.directory || baseline?.skill;
  const trigger = buildBudgetBucket(
    rawBudget.trigger_cost_tokens.value,
    profile.trigger_cost_tokens,
    rawBudget.trigger_cost_tokens.components,
  );
  const invoke = buildBudgetBucket(
    rawBudget.invoke_cost_tokens.value,
    profile.invoke_cost_tokens,
    rawBudget.invoke_cost_tokens.components,
  );
  const deferred = buildBudgetBucket(
    rawBudget.deferred_cost_tokens.value,
    profile.deferred_cost_tokens,
    rawBudget.deferred_cost_tokens.components,
  );
  const explicitOnly = rawBudget.explicit_only_invoke_cost_tokens
    ? buildBudgetBucket(
        rawBudget.explicit_only_invoke_cost_tokens.value,
        profile.invoke_cost_tokens,
        rawBudget.explicit_only_invoke_cost_tokens.components,
      )
    : null;
  const total = trigger.value + invoke.value + deferred.value;
  return {
    method: rawBudget.method || "estimated-static",
    ...(rawBudget.invocation_policy ? { invocation_policy: rawBudget.invocation_policy } : {}),
    trigger_cost_tokens: trigger,
    invoke_cost_tokens: invoke,
    deferred_cost_tokens: deferred,
    ...(explicitOnly ? { explicit_only_invoke_cost_tokens: explicitOnly } : {}),
    total_tokens: {
      value: total,
      band:
        [trigger.band, invoke.band, deferred.band].includes("excessive")
          ? "excessive"
          : [trigger.band, invoke.band, deferred.band].includes("heavy")
            ? "heavy"
            : [trigger.band, invoke.band, deferred.band].includes("moderate")
              ? "moderate"
              : "good",
    },
  };
}
```

## File: `src/core/compare.js`

```javascript
import { createComparisonNextAction } from "./presentation.js";

export function compareResults(before, after) {
  const beforeFailures = new Set(
    before.checks.filter((check) => check.status === "fail").map((check) => check.id),
  );
  const afterFailures = new Set(
    after.checks.filter((check) => check.status === "fail").map((check) => check.id),
  );

  const resolvedFailures = [...beforeFailures].filter((id) => !afterFailures.has(id));
  const newFailures = [...afterFailures].filter((id) => !beforeFailures.has(id));

  const payload = {
    kind: "comparison",
    createdAt: new Date().toISOString(),
    target: after.target,
    scoreDelta: after.summary.score - before.summary.score,
    gradeBefore: before.summary.grade,
    gradeAfter: after.summary.grade,
    riskBefore: before.summary.riskLevel,
    riskAfter: after.summary.riskLevel,
    budgetDelta: {
      trigger_cost_tokens:
        (after.budgets.trigger_cost_tokens?.value || 0) - (before.budgets.trigger_cost_tokens?.value || 0),
      invoke_cost_tokens:
        (after.budgets.invoke_cost_tokens?.value || 0) - (before.budgets.invoke_cost_tokens?.value || 0),
      deferred_cost_tokens:
        (after.budgets.deferred_cost_tokens?.value || 0) - (before.budgets.deferred_cost_tokens?.value || 0),
    },
    resolvedFailures,
    newFailures,
    beforeSummary: before.summary,
    afterSummary: after.summary,
  };
  payload.nextAction = createComparisonNextAction(payload);
  return payload;
}
```

## File: `src/core/improvement-brief.js`

```javascript
export function buildImprovementBrief(result) {
  const failingChecks = result.checks.filter((check) => check.status === "fail");
  const warningChecks = result.checks.filter((check) => check.status === "warn");
  const prioritized = [...failingChecks, ...warningChecks].slice(0, 8);
  const measurementGoals =
    result.measurementPlan?.recommendedToolsets?.length > 0
      ? result.measurementPlan.recommendedToolsets
      : [];

  return {
    title: `Improve ${result.target.name}`,
    target: result.target,
    summary: `Raise the evaluation from grade ${result.summary.grade} (${result.summary.score}/100) with a focus on the highest-signal structural and budget issues first.`,
    goals: result.summary.topRecommendations,
    measurementGoals,
    requiredFixes: failingChecks.slice(0, 5).map((check) => ({
      id: check.id,
      message: check.message,
      remediation: check.remediation,
    })),
    recommendedFixes: warningChecks.slice(0, 5).map((check) => ({
      id: check.id,
      message: check.message,
      remediation: check.remediation,
    })),
    suggestedPrompt: [
      `Use the skill-creator guidance to improve ${result.target.name}.`,
      `Keep the structure compact and move bulky details into references or scripts.`,
      ...(measurementGoals.length > 0
        ? [`Define success measures with these toolsets: ${measurementGoals.join(", ")}.`]
        : []),
      ...prioritized.map((check) => `Address ${check.id}: ${check.message}`),
    ].join(" "),
  };
}
```

## File: `src/core/measurement-plan.js`

```javascript
import { createArtifact } from "./schema.js";
import { createMeasurementPlanNextAction } from "./presentation.js";

function hasMetric(result, id) {
  return result.metrics.some((metric) => metric.id === id);
}

function createToolset({
  id,
  label,
  priority,
  goal,
  why,
  signals,
  evidenceSources,
  starterPack,
}) {
  return {
    id,
    label,
    priority,
    goal,
    why,
    signals,
    evidenceSources,
    starterPack,
  };
}

export function buildMeasurementPlan(result) {
  const hasObservedUsage = Boolean(result.observedUsage?.sampleCount);
  const hasBudgetPressure =
    ["heavy", "excessive"].includes(result.budgets.trigger_cost_tokens?.band) ||
    ["heavy", "excessive"].includes(result.budgets.invoke_cost_tokens?.band);
  const hasCode =
    hasMetric(result, "ts_file_count") ||
    hasMetric(result, "py_file_count") ||
    result.target.kind === "directory";

  const toolsets = [
    createToolset({
      id: "token-usage-observer",
      label: "Token Usage Observer",
      priority: !hasObservedUsage || hasBudgetPressure ? "high" : "medium",
      goal: "Measure how many tokens the skill or plugin actually burns in representative runs.",
      why:
        "Static estimates are useful guardrails, but observed usage is what tells you whether a real workflow is affordable and whether caching or reasoning changes the picture.",
      signals: [
        "observed_usage_sample_count",
        "observed_input_tokens_avg",
        "observed_total_tokens_avg",
        "estimate_vs_observed_input_ratio",
      ],
      evidenceSources: [
        "Responses API usage logs",
        "Codex-like session exports",
        "JSONL traces captured from local benchmarking harnesses",
      ],
      starterPack: {
        manifestName: "token-usage-pack",
        focus: "Validate sample size, cold-start versus warm-cache behavior, and estimate drift over time.",
      },
    }),
    createToolset({
      id: "task-outcome-scorecard",
      label: "Task Outcome Scorecard",
      priority: "high",
      goal: "Measure whether the skill helps users finish the intended job with fewer retries and less cleanup.",
      why:
        "A low-token skill is still a miss if it fails the task, and a verbose skill may be worth it if it consistently improves first-pass success.",
      signals: [
        "task_success_rate",
        "first_pass_success_rate",
        "retry_rate",
        "human_override_rate",
      ],
      evidenceSources: [
        "Task run logs",
        "Structured user acceptance checklist",
        "Before/after comparison runs on the same prompts",
      ],
      starterPack: {
        manifestName: "task-outcomes-pack",
        focus: "Score success, retries, and manual intervention across a fixed prompt set.",
      },
    }),
    createToolset({
      id: "tool-call-audit",
      label: "Tool Call Audit",
      priority: result.target.kind === "plugin" ? "high" : "medium",
      goal: "Check whether the agent uses the right tools, arguments, and sequencing when the skill is active.",
      why:
        "For Codex plugins and many higher-agency skills, tool correctness is often the real determinant of user value.",
      signals: [
        "tool_call_success_rate",
        "invalid_tool_argument_rate",
        "recoverable_tool_failure_rate",
      ],
      evidenceSources: [
        "Tool invocation traces",
        "Recorded sessions",
        "Golden-path scenario replays",
      ],
      starterPack: {
        manifestName: "tool-audit-pack",
        focus: "Flag wrong tool selection, malformed args, and missing follow-up calls.",
      },
    }),
    createToolset({
      id: "latency-efficiency",
      label: "Latency And Efficiency",
      priority: hasBudgetPressure ? "high" : "medium",
      goal: "Track whether the skill speeds users up enough to justify its cost.",
      why:
        "DX improvements usually win when they reduce waiting or rework, not only when they reduce absolute token counts.",
      signals: [
        "p50_time_to_first_acceptable_answer_seconds",
        "p95_time_to_task_completion_seconds",
        "tokens_per_successful_run",
      ],
      evidenceSources: [
        "Benchmark harness timings",
        "Manual stopwatch runs on canonical tasks",
        "Responses API timestamps combined with usage logs",
      ],
      starterPack: {
        manifestName: "latency-efficiency-pack",
        focus: "Measure time-to-value and cost-per-success on a stable prompt suite.",
      },
    }),
    createToolset({
      id: "human-rubric-review",
      label: "Human Rubric Review",
      priority: "medium",
      goal: "Capture clarity, trust, and usefulness signals that automated checks will miss.",
      why:
        "The best skills often reduce confusion and editing effort in ways that do not show up in static lint-like checks.",
      signals: [
        "clarity_score_avg",
        "confidence_score_avg",
        "follow_up_question_rate",
      ],
      evidenceSources: [
        "Reviewer scorecards",
        "Team rubric sheets",
        "Annotated transcripts",
      ],
      starterPack: {
        manifestName: "human-rubric-pack",
        focus: "Collect 1 to 5 scores for clarity, trust, and edit burden across a small evaluator panel.",
      },
    }),
  ];

  if (hasCode) {
    toolsets.push(
      createToolset({
        id: "regression-suite",
        label: "Regression Suite",
        priority: "medium",
        goal: "Protect the repository behavior that the skill is supposed to improve.",
        why:
          "If a skill is meant to help coding workflows, outcomes should be paired with deterministic repo checks so quality gains do not come from cutting corners.",
        signals: [
          "test_pass_rate",
          "lint_pass_rate",
          "regression_escape_count",
        ],
        evidenceSources: [
          "Unit and integration test runs",
          "Coverage deltas",
          "Snapshot or golden-file checks",
        ],
        starterPack: {
          manifestName: "regression-pack",
          focus: "Blend repository test outcomes with evaluation-task success metrics.",
        },
      }),
    );
  }

  const recommendedToolsets = toolsets
    .filter((toolset) => toolset.priority === "high")
    .map((toolset) => toolset.id);

  const payload = {
    kind: "measurement-plan",
    createdAt: new Date().toISOString(),
    target: result.target,
    title: `Measurement plan for ${result.target.name}`,
    summary:
      "Combine cost, outcome, and trust signals so you can tell whether the skill or plugin is genuinely helping instead of only looking well-structured on paper.",
    recommendedToolsets,
    toolsets,
    artifact: createArtifact({
      id: "measurement-plan",
      type: "measurement-plan",
      label: "Measurement plan",
      description: "Recommended toolsets for measuring the real-world effect of this skill or plugin.",
      data: {
        recommendedToolsets,
        toolsets,
      },
    }),
  };
  payload.nextAction = createMeasurementPlanNextAction(payload);
  return payload;
}
```

## File: `src/core/metric-packs.js`

```javascript
import path from "node:path";
import { spawnSync } from "node:child_process";

import { pathExists, readJson } from "../lib/files.js";

function normalizeCommand(manifest) {
  if (Array.isArray(manifest.command)) {
    return manifest.command.map((part, index) => (index === 0 && part === "node" ? process.execPath : part));
  }
  if (typeof manifest.command === "string") {
    return manifest.command
      .split(/\s+/)
      .filter(Boolean)
      .map((part, index) => (index === 0 && part === "node" ? process.execPath : part));
  }
  return [];
}

export async function runMetricPacks(target, manifestPaths = []) {
  const extensions = [];

  for (const manifestPath of manifestPaths) {
    const resolvedManifestPath = path.resolve(manifestPath);
    if (!(await pathExists(resolvedManifestPath))) {
      throw new Error(`Metric pack manifest not found: ${resolvedManifestPath}`);
    }

    const manifest = await readJson(resolvedManifestPath);
    if (
      Array.isArray(manifest.supportedTargetKinds) &&
      !manifest.supportedTargetKinds.includes(target.kind)
    ) {
      continue;
    }

    const command = normalizeCommand(manifest);
    if (command.length === 0) {
      throw new Error(`Metric pack command is missing: ${resolvedManifestPath}`);
    }

    const [bin, ...args] = command;
    const execution = spawnSync(
      bin,
      [...args, target.path, target.kind],
      {
        cwd: path.dirname(resolvedManifestPath),
        encoding: "utf8",
        env: {
          ...process.env,
          PLUGIN_EVAL_TARGET: target.path,
          PLUGIN_EVAL_TARGET_KIND: target.kind,
          PLUGIN_EVAL_METRIC_PACK_MANIFEST: resolvedManifestPath,
        },
      },
    );

    if (execution.status !== 0) {
      throw new Error(
        `Metric pack failed (${manifest.name || resolvedManifestPath}): ${execution.stderr || execution.stdout}`,
      );
    }

    const payload = JSON.parse(execution.stdout || "{}");
    extensions.push({
      name: manifest.name || path.basename(resolvedManifestPath),
      version: manifest.version || "0.0.0",
      manifestPath: resolvedManifestPath,
      checks: Array.isArray(payload.checks) ? payload.checks : [],
      metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
      artifacts: Array.isArray(payload.artifacts) ? payload.artifacts : [],
    });
  }

  return extensions;
}
```

## File: `src/core/observed-usage.js`

```javascript
import path from "node:path";

import { pathExists, readText, relativePath } from "../lib/files.js";
import { createArtifact, createCheck, createMetric } from "./schema.js";

function round(value) {
  return Math.round(value * 100) / 100;
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildStat(values) {
  if (values.length === 0) {
    return {
      total: 0,
      average: 0,
      min: 0,
      max: 0,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    total,
    average: round(total / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function classifyEstimateAlignment(deltaRatio) {
  if (deltaRatio <= 0.2) {
    return "close";
  }
  if (deltaRatio <= 0.5) {
    return "drift";
  }
  return "wide-drift";
}

function extractUsagePayload(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  if (candidate.type === "response.done" && candidate.response?.usage) {
    return {
      usage: candidate.response.usage,
      responseId: candidate.response.id || candidate.id || null,
      label: candidate.metadata?.scenario || candidate.response?.metadata?.scenario || null,
    };
  }

  if (candidate.response?.usage) {
    return {
      usage: candidate.response.usage,
      responseId: candidate.response.id || candidate.id || null,
      label: candidate.metadata?.scenario || candidate.response?.metadata?.scenario || null,
    };
  }

  if (candidate.usage) {
    return {
      usage: candidate.usage,
      responseId: candidate.response_id || candidate.id || null,
      label: candidate.metadata?.scenario || candidate.scenario || null,
    };
  }

  if (
    typeof candidate.input_tokens === "number" ||
    typeof candidate.output_tokens === "number" ||
    typeof candidate.total_tokens === "number"
  ) {
    return {
      usage: candidate,
      responseId: candidate.response_id || candidate.id || null,
      label: candidate.metadata?.scenario || candidate.scenario || null,
    };
  }

  return null;
}

function normalizeSnapshot(candidate, sourcePath, index) {
  const extracted = extractUsagePayload(candidate);
  if (!extracted) {
    return null;
  }

  const usage = extracted.usage || {};
  const inputTokens = toNumber(usage.input_tokens);
  const outputTokens = toNumber(usage.output_tokens);
  const totalTokens = toNumber(usage.total_tokens) ?? ((inputTokens || 0) + (outputTokens || 0));
  const cachedTokens =
    toNumber(usage.input_token_details?.cached_tokens) ??
    toNumber(usage.cached_tokens) ??
    0;
  const reasoningTokens =
    toNumber(usage.output_tokens_details?.reasoning_tokens) ??
    toNumber(usage.reasoning_tokens) ??
    0;

  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  return {
    id: extracted.responseId || `${path.basename(sourcePath)}#${index + 1}`,
    label: extracted.label || null,
    sourcePath,
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens,
    cachedTokens,
    reasoningTokens,
  };
}

function collectSnapshots(value, sourcePath, results) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSnapshots(item, sourcePath, results));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const snapshot = normalizeSnapshot(value, sourcePath, results.length);
  if (snapshot) {
    results.push(snapshot);
    return;
  }

  Object.values(value).forEach((nested) => {
    if (nested && typeof nested === "object") {
      collectSnapshots(nested, sourcePath, results);
    }
  });
}

function parseUsageContent(content) {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    return [JSON.parse(trimmed)];
  }

  if (trimmed.startsWith("{")) {
    try {
      return [JSON.parse(trimmed)];
    } catch {
      // Fall through to JSONL parsing when the file contains multiple JSON objects.
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function loadSnapshotsFromFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (!(await pathExists(resolvedPath))) {
    throw new Error(`Observed usage file not found: ${resolvedPath}`);
  }

  const parsedItems = parseUsageContent(await readText(resolvedPath));
  const snapshots = [];
  parsedItems.forEach((item) => collectSnapshots(item, resolvedPath, snapshots));
  return snapshots;
}

function createObservedUsageChecks(summary) {
  const checks = [];

  if (summary.sampleCount < 3) {
    checks.push(
      createCheck({
        id: "observed-usage-small-sample",
        category: "measurement",
        severity: "warning",
        status: "warn",
        message: "Observed usage coverage is too small to trust as a stable benchmark yet.",
        evidence: [`Samples collected: ${summary.sampleCount}`],
        remediation: ["Capture at least 5 to 10 representative sessions before treating observed usage as a baseline."],
      }),
    );
  }

  const comparison = summary.estimateComparison;
  if (comparison) {
    if (comparison.band === "drift" || comparison.band === "wide-drift") {
      checks.push(
        createCheck({
          id: "observed-usage-estimate-drift",
          category: "budget",
          severity: comparison.band === "wide-drift" ? "error" : "warning",
          status: comparison.band === "wide-drift" ? "fail" : "warn",
          message: "Static budget estimates differ meaningfully from observed input token usage.",
          evidence: [
            `Estimated active tokens: ${comparison.estimatedActiveTokens}`,
            `Observed average input tokens: ${comparison.observedAverageInputTokens}`,
            `Delta ratio: ${round(comparison.deltaRatio * 100)}%`,
          ],
          remediation: [
            "Trim repeated instructions or supporting text if the observed value is higher than expected.",
            "If the static estimate is intentionally conservative, record that assumption in the skill or plugin references.",
          ],
        }),
      );
    }

    if (summary.cachedTokens.average > 0) {
      checks.push(
        createCheck({
          id: "observed-usage-cache-present",
          category: "measurement",
          severity: "info",
          status: "info",
          message: "Observed runs include cached tokens, so repeated sessions are cheaper than the cold-start estimate.",
          evidence: [`Average cached tokens: ${summary.cachedTokens.average}`],
          remediation: ["Track cold-start and warm-cache sessions separately if you need tighter budgeting."],
        }),
      );
    }
  }

  return checks;
}

export async function analyzeObservedUsage(usagePaths = [], rawBudget, target) {
  if (!Array.isArray(usagePaths) || usagePaths.length === 0) {
    return null;
  }

  const snapshots = [];
  for (const usagePath of usagePaths) {
    const loaded = await loadSnapshotsFromFile(usagePath);
    snapshots.push(...loaded);
  }

  if (snapshots.length === 0) {
    throw new Error("Observed usage files were provided, but no usage payloads could be parsed.");
  }

  const inputTokens = buildStat(snapshots.map((snapshot) => snapshot.inputTokens));
  const outputTokens = buildStat(snapshots.map((snapshot) => snapshot.outputTokens));
  const totalTokens = buildStat(snapshots.map((snapshot) => snapshot.totalTokens));
  const cachedTokens = buildStat(snapshots.map((snapshot) => snapshot.cachedTokens));
  const reasoningTokens = buildStat(snapshots.map((snapshot) => snapshot.reasoningTokens));
  const estimatedActiveTokens = rawBudget.trigger_cost_tokens.value + rawBudget.invoke_cost_tokens.value;
  const observedAverageInputTokens = inputTokens.average;
  const deltaTokens = round(observedAverageInputTokens - estimatedActiveTokens);
  const deltaRatio =
    estimatedActiveTokens > 0 ? round(Math.abs(deltaTokens) / estimatedActiveTokens) : 0;

  const observedUsage = {
    method: "observed-usage-files",
    target: {
      name: target.name,
      kind: target.kind,
      path: target.path,
      relativePath: relativePath(process.cwd(), target.path),
    },
    sampleCount: snapshots.length,
    files: [...new Set(snapshots.map((snapshot) => relativePath(process.cwd(), snapshot.sourcePath)))],
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens,
    reasoningTokens,
    estimateComparison: estimatedActiveTokens
      ? {
          estimatedActiveTokens,
          observedAverageInputTokens,
          deltaTokens,
          deltaRatio,
          band: classifyEstimateAlignment(deltaRatio),
        }
      : null,
    samples: snapshots.map((snapshot) => ({
      ...snapshot,
      sourcePath: relativePath(process.cwd(), snapshot.sourcePath),
    })),
  };

  const metrics = [
    createMetric({
      id: "observed_usage_sample_count",
      category: "measurement",
      value: observedUsage.sampleCount,
      unit: "samples",
      band: observedUsage.sampleCount >= 5 ? "good" : observedUsage.sampleCount >= 3 ? "moderate" : "heavy",
    }),
    createMetric({
      id: "observed_input_tokens_avg",
      category: "measurement",
      value: observedUsage.inputTokens.average,
      unit: "tokens",
      band: "info",
    }),
    createMetric({
      id: "observed_output_tokens_avg",
      category: "measurement",
      value: observedUsage.outputTokens.average,
      unit: "tokens",
      band: "info",
    }),
    createMetric({
      id: "observed_total_tokens_avg",
      category: "measurement",
      value: observedUsage.totalTokens.average,
      unit: "tokens",
      band: "info",
    }),
  ];

  if (observedUsage.cachedTokens.total > 0) {
    metrics.push(
      createMetric({
        id: "observed_cached_tokens_avg",
        category: "measurement",
        value: observedUsage.cachedTokens.average,
        unit: "tokens",
        band: "info",
      }),
    );
  }

  if (observedUsage.reasoningTokens.total > 0) {
    metrics.push(
      createMetric({
        id: "observed_reasoning_tokens_avg",
        category: "measurement",
        value: observedUsage.reasoningTokens.average,
        unit: "tokens",
        band: "info",
      }),
    );
  }

  if (observedUsage.estimateComparison) {
    metrics.push(
      createMetric({
        id: "estimate_vs_observed_input_delta",
        category: "measurement",
        value: observedUsage.estimateComparison.deltaTokens,
        unit: "tokens",
        band:
          observedUsage.estimateComparison.band === "close"
            ? "good"
            : observedUsage.estimateComparison.band === "drift"
              ? "moderate"
              : "heavy",
      }),
      createMetric({
        id: "estimate_vs_observed_input_ratio",
        category: "measurement",
        value: observedUsage.estimateComparison.deltaRatio,
        unit: "ratio",
        band:
          observedUsage.estimateComparison.band === "close"
            ? "good"
            : observedUsage.estimateComparison.band === "drift"
              ? "moderate"
              : "heavy",
      }),
    );
  }

  return {
    observedUsage,
    checks: createObservedUsageChecks(observedUsage),
    metrics,
    artifacts: [
      createArtifact({
        id: "observed-usage-summary",
        type: "measurement",
        label: "Observed usage summary",
        description: "Observed token telemetry aggregated from local usage log files.",
        data: observedUsage,
      }),
    ],
  };
}
```

## File: `src/core/presentation.js`

```javascript
import { formatCommandPath, relativePath } from "../lib/files.js";
import { enrichSummary } from "./scoring.js";

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function targetLabel(target) {
  if (target.kind === "plugin") {
    return "plugin";
  }
  if (target.kind === "skill") {
    return "skill";
  }
  return "target";
}

function targetTypeLabel(target) {
  if (target.kind === "plugin") {
    return "plugin";
  }
  if (target.kind === "skill") {
    return "skill";
  }
  return "item";
}

function buildStartCommand(target, chatPrompt) {
  return `plugin-eval start ${formatCommandPath(target.path)} --request ${shellQuote(chatPrompt)} --format markdown`;
}

function hasStructuralFailures(result) {
  return result.checks.some(
    (check) =>
      check.status === "fail" &&
      (check.category === "manifest" || check.category === "skill-structure"),
  );
}

function hasBudgetPressure(result) {
  return ["heavy", "excessive"].includes(result.budgets?.trigger_cost_tokens?.band) ||
    ["heavy", "excessive"].includes(result.budgets?.invoke_cost_tokens?.band);
}

function hasWarningsOrFailures(result) {
  return result.checks.some((check) => check.status === "fail" || check.status === "warn");
}

export function createEvaluationNextAction(result) {
  const labelName = targetLabel(result.target);

  if (hasStructuralFailures(result)) {
    return {
      label: "Fix structural issues first",
      why: "Failing manifest or skill structure issues reduce trust and can invalidate later measurements.",
      command: buildStartCommand(result.target, "What should I fix first?"),
      chatPrompt: "What should I fix first?",
    };
  }

  if (!result.observedUsage?.sampleCount && hasBudgetPressure(result)) {
    return {
      label: "Measure real token usage next",
      why: "The static budget looks heavy, so live usage is the fastest way to confirm whether the cost is acceptable.",
      command: buildStartCommand(result.target, `Measure the real token usage of this ${labelName}.`),
      chatPrompt: `Measure the real token usage of this ${labelName}.`,
    };
  }

  if (result.observedUsage?.sampleCount) {
    return {
      label: "Review the measurement plan",
      why: "You already have observed usage, so the highest-value next step is deciding what to instrument or improve.",
      command: buildStartCommand(result.target, "What should I run next?"),
      chatPrompt: "What should I run next?",
    };
  }

  if (hasWarningsOrFailures(result)) {
    return {
      label: "Fix the top findings and rerun the report",
      why: "A short pass on the highest-value findings will improve trust, readability, and the signal quality of future benchmarks.",
      command: buildStartCommand(result.target, "What should I fix first?"),
      chatPrompt: "What should I fix first?",
    };
  }

  return {
    label: "Choose the next workflow from chat",
    why: "The report is clean enough that the best next step depends on whether you want budgets, benchmarks, or comparisons.",
    command: buildStartCommand(result.target, "What should I run next?"),
    chatPrompt: "What should I run next?",
  };
}

export function applyEvaluationPresentation(result) {
  result.summary = enrichSummary(result, result.summary);
  if (!result.nextAction) {
    result.nextAction = createEvaluationNextAction(result);
  }
  return result;
}

export function createWorkflowGuideNextAction(guide) {
  const startHere = guide.startHere || guide.recommendedWorkflow;
  return {
    label: startHere?.label || guide.recommendedWorkflow?.label || "Start here",
    why: startHere?.routingExplanation || guide.recommendedWorkflow?.summary || guide.beginnerSummary,
    command: startHere?.firstCommand || guide.recommendedWorkflow?.firstCommand,
    chatPrompt: startHere?.chatPrompt || guide.recommendedWorkflow?.chatPrompt,
  };
}

export function createMeasurementPlanNextAction(plan) {
  const toolset = plan.toolsets.find((entry) => plan.recommendedToolsets.includes(entry.id)) || plan.toolsets[0];
  const targetKind = targetTypeLabel(plan.target);

  return {
    label: toolset ? `Start with ${toolset.label}` : "Decide what to measure next",
    why: toolset
      ? toolset.goal
      : "A small measurement pass will turn the current report into a more trustworthy workflow decision.",
    command: buildStartCommand(plan.target, `What should I run next?`),
    chatPrompt: `What should I run next?`,
    ...(toolset ? { toolsetId: toolset.id } : {}),
    ...(toolset
      ? {}
      : {
          why: `Use Plugin Eval to decide the next measurement move for this ${targetKind}.`,
        }),
  };
}

export function createBudgetNextAction(payload) {
  const labelName = targetLabel(payload.target);
  const hasHeavyBudget = ["heavy", "excessive"].includes(payload.budgets?.trigger_cost_tokens?.band) ||
    ["heavy", "excessive"].includes(payload.budgets?.invoke_cost_tokens?.band);

  if (hasHeavyBudget) {
    return {
      label: "Validate the budget with real usage",
      why: "The estimate looks heavy enough that measured usage is worth collecting before you rewrite the skill or plugin.",
      command: buildStartCommand(payload.target, `Measure the real token usage of this ${labelName}.`),
      chatPrompt: `Measure the real token usage of this ${labelName}.`,
    };
  }

  return {
    label: "Review the full evaluation",
    why: "The budget does not look alarming on its own, so the next useful step is the full structural and quality report.",
    command: buildStartCommand(payload.target, `Evaluate this ${labelName}.`),
    chatPrompt: `Evaluate this ${labelName}.`,
  };
}

export function createBenchmarkTemplateNextAction(payload) {
  const commandTargetPath = formatCommandPath(payload.target.path);
  const commandConfigPath = formatCommandPath(payload.configPath);
  return {
    label: "Run the Codex benchmark",
    why: "Benchmarking now means a real codex exec run, so the next step is to execute the edited scenarios in an isolated workspace.",
    command: `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath} --format markdown`,
    chatPrompt: `Help me benchmark this ${targetLabel(payload.target)}.`,
  };
}

export function createBenchmarkRunNextAction(payload) {
  const commandTargetPath = formatCommandPath(payload.target.path);
  return {
    label: payload.usageLogPath ? "Fold the usage log back into analysis" : "Review the benchmark report",
    why: payload.usageLogPath
      ? "The Codex run produced observed usage, so the next step is to re-run analysis with those measurements."
      : "This benchmark completed without usage telemetry, so the report and preserved artifacts are the primary signal.",
    command: payload.usageLogPath
      ? `plugin-eval analyze ${commandTargetPath} --observed-usage ${formatCommandPath(payload.usageLogPath)} --format markdown`
      : `plugin-eval report ${formatCommandPath(payload.resultPath)} --format markdown`,
    chatPrompt: payload.usageLogPath ? `What should I run next?` : `Help me benchmark this ${targetLabel(payload.target)}.`,
  };
}

export function createComparisonNextAction(diff) {
  const chatPrompt = diff.newFailures.length > 0 ? "What should I fix first?" : "What should I run next?";
  return {
    label: diff.newFailures.length > 0 ? "Address the new failures first" : "Continue from the improved baseline",
    why: diff.newFailures.length > 0
      ? "New failures block trust in the comparison, even if the score improved elsewhere."
      : "The comparison is trending in the right direction, so the next move is to keep the workflow tight and repeatable.",
    command: buildStartCommand(diff.target, chatPrompt),
    chatPrompt,
  };
}
```

## File: `src/core/schema.js`

```javascript
import { relativePath } from "../lib/files.js";

export const TOOL_NAME = "plugin-eval";
export const TOOL_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;

export function createEvaluationResult(target) {
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: {
      name: TOOL_NAME,
      version: TOOL_VERSION,
    },
    createdAt: new Date().toISOString(),
    target: {
      ...target,
      relativePath: relativePath(process.cwd(), target.path),
    },
    summary: {
      score: 0,
      grade: "F",
      riskLevel: "high",
      riskReasons: [],
      scoreBreakdown: {
        startingScore: 100,
        totalDeductions: 0,
        finalScore: 0,
      },
      checkCounts: {
        total: 0,
        pass: 0,
        warn: 0,
        fail: 0,
        info: 0,
        error: 0,
        warning: 0,
      },
      deductions: [],
      categoryDeductions: [],
      topRecommendations: [],
      whyBullets: [],
      fixFirst: [],
      watchNext: [],
    },
    budgets: {},
    observedUsage: null,
    checks: [],
    metrics: [],
    artifacts: [],
    extensions: [],
    measurementPlan: null,
    improvementBrief: null,
    nextAction: null,
  };
}

export function createCheck({
  id,
  category,
  severity,
  status,
  message,
  evidence = [],
  remediation = [],
  source = "core",
  targetPath = null,
  why = null,
}) {
  return {
    id,
    category,
    severity,
    status,
    message,
    evidence,
    remediation,
    source,
    ...(why ? { why } : {}),
    ...(targetPath ? { targetPath } : {}),
  };
}

export function createMetric({
  id,
  category,
  value,
  unit,
  band = "info",
  source = "core",
  targetPath = null,
}) {
  return {
    id,
    category,
    value,
    unit,
    band,
    source,
    ...(targetPath ? { targetPath } : {}),
  };
}

export function createArtifact({
  id,
  type,
  label,
  description,
  data = null,
  path = null,
  source = "core",
}) {
  return {
    id,
    type,
    label,
    description,
    source,
    ...(path ? { path } : {}),
    ...(data ? { data } : {}),
  };
}
```

## File: `src/core/scoring.js`

```javascript
const SEVERITY_WEIGHT = {
  error: 14,
  warning: 6,
  info: 1,
};

const STATUS_MULTIPLIER = {
  fail: 1,
  warn: 0.75,
  info: 0.25,
  pass: 0,
};

const GRADE_THRESHOLDS = {
  A: 93,
  B: 85,
  C: 70,
  D: 55,
};

const CATEGORY_PRIORITY = {
  manifest: 0,
  "skill-structure": 1,
  budget: 2,
  measurement: 3,
  "best-practice": 4,
  complexity: 5,
  readability: 6,
  "code-quality": 7,
};

const STATUS_PRIORITY = {
  fail: 0,
  warn: 1,
  info: 2,
  pass: 3,
};

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function summarizeChecks(checks) {
  return checks.reduce(
    (summary, check) => {
      summary.total += 1;
      summary[check.status] = (summary[check.status] || 0) + 1;
      summary[check.severity] = (summary[check.severity] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      pass: 0,
      warn: 0,
      fail: 0,
      info: 0,
      error: 0,
      warning: 0,
    },
  );
}

function computeCheckPenalty(check) {
  const weight = SEVERITY_WEIGHT[check.severity] ?? 0;
  const multiplier = STATUS_MULTIPLIER[check.status] ?? 0;
  return weight * multiplier;
}

function deriveCheckWhy(check) {
  if (check.why) {
    return check.why;
  }

  if (check.category === "manifest") {
    return "Manifest issues reduce trust because Codex may not discover or represent the plugin correctly.";
  }

  if (check.category === "skill-structure") {
    return "Skill structure issues reduce trigger quality and make the skill harder to trust or maintain.";
  }

  if (check.category === "budget") {
    return "Budget pressure matters because always-loaded or frequently-loaded text can make the workflow feel expensive fast.";
  }

  if (check.category === "measurement") {
    return "Weak measurement means you are still steering with estimates instead of evidence.";
  }

  if (check.category === "best-practice") {
    return "Best-practice gaps usually do not break the workflow immediately, but they make the skill harder to understand and improve.";
  }

  if (check.category === "complexity") {
    return "Complexity findings matter because they increase review cost and make generated or helper code harder to change safely.";
  }

  if (check.category === "readability") {
    return "Readability issues slow engineers down during review, debugging, and follow-up edits.";
  }

  if (check.category === "code-quality") {
    return "Code-quality findings matter because helper scripts and supporting code are part of the user experience too.";
  }

  return "This finding affects confidence, clarity, or trust in the overall workflow.";
}

function buildDeductions(checks) {
  return checks
    .map((check) => ({
      id: check.id,
      category: check.category,
      severity: check.severity,
      status: check.status,
      message: check.message,
      penalty: computeCheckPenalty(check),
      remediation: check.remediation,
      source: check.source,
      ...(check.targetPath ? { targetPath: check.targetPath } : {}),
    }))
    .filter((entry) => entry.penalty > 0)
    .sort((left, right) => {
      if (right.penalty !== left.penalty) {
        return right.penalty - left.penalty;
      }
      return left.id.localeCompare(right.id);
    });
}

function buildCategoryDeductions(deductions) {
  const totals = new Map();
  for (const deduction of deductions) {
    const current = totals.get(deduction.category) || {
      category: deduction.category,
      totalPenalty: 0,
      checks: 0,
    };
    current.totalPenalty += deduction.penalty;
    current.checks += 1;
    totals.set(deduction.category, current);
  }

  return [...totals.values()].sort((left, right) => {
    if (right.totalPenalty !== left.totalPenalty) {
      return right.totalPenalty - left.totalPenalty;
    }
    return left.category.localeCompare(right.category);
  });
}

function rankActionableChecks(checks) {
  return checks
    .filter((check) => check.status === "fail" || check.status === "warn")
    .map((check) => ({
      ...check,
      penalty: computeCheckPenalty(check),
      why: deriveCheckWhy(check),
    }))
    .sort((left, right) => {
      if (right.penalty !== left.penalty) {
        return right.penalty - left.penalty;
      }
      if ((STATUS_PRIORITY[left.status] ?? 99) !== (STATUS_PRIORITY[right.status] ?? 99)) {
        return (STATUS_PRIORITY[left.status] ?? 99) - (STATUS_PRIORITY[right.status] ?? 99);
      }
      if ((CATEGORY_PRIORITY[left.category] ?? 99) !== (CATEGORY_PRIORITY[right.category] ?? 99)) {
        return (CATEGORY_PRIORITY[left.category] ?? 99) - (CATEGORY_PRIORITY[right.category] ?? 99);
      }
      return left.id.localeCompare(right.id);
    });
}

function summarizeFinding(check) {
  return {
    id: check.id,
    category: check.category,
    severity: check.severity,
    status: check.status,
    message: check.message,
    why: check.why,
    remediation: check.remediation,
    penalty: check.penalty,
    source: check.source,
    ...(check.targetPath ? { targetPath: check.targetPath } : {}),
  };
}

function buildWhyBullets(result, summary, failedErrors, warningSignals) {
  const bullets = [];

  if (failedErrors > 0) {
    bullets.push(`${failedErrors} failing error check${failedErrors === 1 ? "" : "s"} are driving the highest-confidence problems.`);
  }

  if (warningSignals > 0) {
    bullets.push(`${warningSignals} warning signal${warningSignals === 1 ? "" : "s"} still need cleanup before this feels polished.`);
  }

  if (summary.categoryDeductions.length > 0) {
    const topCategory = summary.categoryDeductions[0];
    bullets.push(`${topCategory.category} is the largest source of score loss at -${topCategory.totalPenalty} points.`);
  }

  if (
    ["heavy", "excessive"].includes(result.budgets?.trigger_cost_tokens?.band) ||
    ["heavy", "excessive"].includes(result.budgets?.invoke_cost_tokens?.band)
  ) {
    bullets.push("Active budget pressure is high enough that token cost may dominate the user experience.");
  } else {
    bullets.push("Budget pressure is not the dominant issue right now.");
  }

  if (result.observedUsage?.sampleCount) {
    bullets.push(`Observed usage is available from ${result.observedUsage.sampleCount} sample${result.observedUsage.sampleCount === 1 ? "" : "s"}.`);
  } else {
    bullets.push("No observed usage is attached yet, so budget conclusions are still based on static estimates.");
  }

  if (bullets.length === 0) {
    bullets.push(`Current grade is ${summary.grade} with ${summary.riskLevel} reported risk.`);
  }

  return bullets.slice(0, 5);
}

function buildRiskReasons({ score, failedErrors, warningSignals, deductions, checkSummary }) {
  const reasons = [];
  if (failedErrors > 0) {
    const examples = deductions
      .filter((entry) => entry.status === "fail" && entry.severity === "error")
      .slice(0, 3)
      .map((entry) => entry.id);
    reasons.push(
      `Contains ${failedErrors} failing error check${failedErrors === 1 ? "" : "s"}${
        examples.length > 0 ? ` (${examples.join(", ")})` : ""
      }.`,
    );
  }
  if (score < GRADE_THRESHOLDS.C) {
    reasons.push(`Overall score is below ${GRADE_THRESHOLDS.C}, which the evaluator treats as high risk.`);
  } else if (warningSignals > 0) {
    reasons.push(
      `Contains ${warningSignals} warning signal${warningSignals === 1 ? "" : "s"} that still need attention.`,
    );
  }
  if (checkSummary.info > 0 && reasons.length === 0) {
    reasons.push("No failing or warning checks were found; remaining items are informational only.");
  }
  if (reasons.length === 0) {
    reasons.push("No failing error checks and no warning signals were found.");
  }
  return reasons;
}

export function computeSummary(result) {
  const deductions = buildDeductions(result.checks);
  const penalty = deductions.reduce((total, entry) => total + entry.penalty, 0);

  const score = Math.max(0, Math.round(100 - penalty));
  const grade =
    score >= GRADE_THRESHOLDS.A
      ? "A"
      : score >= GRADE_THRESHOLDS.B
        ? "B"
        : score >= GRADE_THRESHOLDS.C
          ? "C"
          : score >= GRADE_THRESHOLDS.D
            ? "D"
            : "F";

  const failedErrors = result.checks.filter(
    (check) => check.status === "fail" && check.severity === "error",
  ).length;
  const warningSignals = result.checks.filter((check) => check.status === "warn").length;
  const riskLevel = failedErrors > 0 || score < 70 ? "high" : warningSignals > 0 || score < 85 ? "medium" : "low";
  const checkCounts = summarizeChecks(result.checks);
  const riskReasons = buildRiskReasons({
    score,
    failedErrors,
    warningSignals,
    deductions,
    checkSummary: checkCounts,
  });

  const topRecommendations = unique(
    result.checks
      .filter((check) => check.status === "fail" || check.status === "warn")
      .flatMap((check) => check.remediation)
      .slice(0, 5),
  );

  return enrichSummary(result, {
    score,
    grade,
    riskLevel,
    riskReasons,
    scoreBreakdown: {
      startingScore: 100,
      totalDeductions: penalty,
      finalScore: score,
      gradeThresholds: GRADE_THRESHOLDS,
    },
    checkCounts,
    deductions,
    categoryDeductions: buildCategoryDeductions(deductions),
    topRecommendations,
  });
}

export function enrichSummary(result, summary) {
  const deductions = Array.isArray(summary?.deductions) ? summary.deductions : buildDeductions(result.checks);
  const categoryDeductions = Array.isArray(summary?.categoryDeductions)
    ? summary.categoryDeductions
    : buildCategoryDeductions(deductions);
  const failedErrors = result.checks.filter(
    (check) => check.status === "fail" && check.severity === "error",
  ).length;
  const warningSignals = result.checks.filter((check) => check.status === "warn").length;
  const actionableChecks = rankActionableChecks(result.checks).map(summarizeFinding);
  const nextSummary = {
    ...summary,
    deductions,
    categoryDeductions,
  };

  return {
    ...nextSummary,
    whyBullets:
      Array.isArray(nextSummary.whyBullets) && nextSummary.whyBullets.length > 0
        ? nextSummary.whyBullets
        : buildWhyBullets(result, { ...nextSummary, categoryDeductions }, failedErrors, warningSignals),
    fixFirst:
      Array.isArray(nextSummary.fixFirst) && nextSummary.fixFirst.length > 0
        ? nextSummary.fixFirst
        : actionableChecks.slice(0, 3),
    watchNext:
      Array.isArray(nextSummary.watchNext) && nextSummary.watchNext.length > 0
        ? nextSummary.watchNext
        : actionableChecks.slice(3, 6),
  };
}
```

## File: `src/core/target.js`

```javascript
import path from "node:path";

import { isDirectory, isFile, pathExists, listImmediateDirectories, readJson } from "../lib/files.js";

export async function resolveTarget(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  if (await isFile(resolvedPath)) {
    if (path.basename(resolvedPath) === "SKILL.md") {
      return {
        kind: "skill",
        path: path.dirname(resolvedPath),
        entryPath: resolvedPath,
        name: path.basename(path.dirname(resolvedPath)),
      };
    }
    if (
      path.basename(resolvedPath) === "plugin.json" &&
      path.basename(path.dirname(resolvedPath)) === ".codex-plugin"
    ) {
      return {
        kind: "plugin",
        path: path.dirname(path.dirname(resolvedPath)),
        entryPath: resolvedPath,
        name: path.basename(path.dirname(path.dirname(resolvedPath))),
      };
    }

    return {
      kind: "file",
      path: resolvedPath,
      entryPath: resolvedPath,
      name: path.basename(resolvedPath),
    };
  }

  if (!(await isDirectory(resolvedPath))) {
    throw new Error(`Target path does not exist: ${resolvedPath}`);
  }

  const pluginManifestPath = path.join(resolvedPath, ".codex-plugin", "plugin.json");
  if (await pathExists(pluginManifestPath)) {
    return {
      kind: "plugin",
      path: resolvedPath,
      entryPath: pluginManifestPath,
      name: path.basename(resolvedPath),
    };
  }

  const skillPath = path.join(resolvedPath, "SKILL.md");
  if (await pathExists(skillPath)) {
    return {
      kind: "skill",
      path: resolvedPath,
      entryPath: skillPath,
      name: path.basename(resolvedPath),
    };
  }

  return {
    kind: "directory",
    path: resolvedPath,
    entryPath: resolvedPath,
    name: path.basename(resolvedPath),
  };
}

export async function discoverPluginSkillDirectories(pluginRoot, manifest) {
  const configuredPath = manifest?.skills ? manifest.skills.replace(/^\.\//, "") : "skills";
  const skillsRoot = path.join(pluginRoot, configuredPath);
  if (!(await isDirectory(skillsRoot))) {
    return [];
  }

  const candidates = await listImmediateDirectories(skillsRoot);
  const directories = [];
  for (const candidate of candidates) {
    const skillFile = path.join(candidate, "SKILL.md");
    if (await pathExists(skillFile)) {
      directories.push(candidate);
    }
  }
  return directories;
}

export async function loadPluginManifest(pluginRoot) {
  const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  return readJson(manifestPath);
}
```

## File: `src/core/workflow-guide.js`

```javascript
import path from "node:path";

import { formatCommandPath, pathExists, relativePath } from "../lib/files.js";
import { createWorkflowGuideNextAction } from "./presentation.js";
import { resolveTarget } from "./target.js";

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function benchmarkConfigPath(target) {
  return path.join(target.path, ".plugin-eval", "benchmark.json");
}

function usageLogPath(target) {
  return path.join(target.path, ".plugin-eval", "benchmark-usage.jsonl");
}

function targetLabel(target) {
  if (target.kind === "plugin") {
    return "plugin";
  }
  if (target.kind === "skill") {
    return "skill";
  }
  return "target";
}

function chatPromptForGoal(goal, target) {
  const label = targetLabel(target);
  if (goal === "analysis") {
    return `Give me a full analysis of this ${label}, including benchmark setup.`;
  }
  if (goal === "evaluate") {
    return `Evaluate this ${label}.`;
  }
  if (goal === "budget") {
    return `Explain the token budget for this ${label}.`;
  }
  if (goal === "measure") {
    return `Measure the real token usage of this ${label}.`;
  }
  if (goal === "benchmark") {
    return `Help me benchmark this ${label}.`;
  }
  return "What should I run next?";
}

function requestSignal(phrases, reason) {
  return {
    phrases,
    reason,
  };
}

function inferGoalFromRequest(requestText) {
  const normalized = String(requestText || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  const signals = [
    [
      "analysis",
      requestSignal(
        [
          "full analysis",
          "full eval",
          "full evaluation",
          "analyze this",
          "analysis of",
          "give me an analysis",
          "deep analysis",
          "deep dive",
        ],
        "it asks for a fuller analysis flow instead of only a single report or benchmark step",
      ),
    ],
    [
      "measure",
      requestSignal(
        [
          "measure the real token usage",
          "real token usage",
          "observed usage",
          "actual token usage",
          "measure token usage",
        ],
        "it asks for measured or observed token usage",
      ),
    ],
    [
      "benchmark",
      requestSignal(
        [
          "benchmark",
          "dry-run",
          "dry run",
          "starter scenario",
          "scenario",
        ],
        "it asks for a benchmark flow or scenario harness",
      ),
    ],
    [
      "budget",
      requestSignal(
        [
          "explain the token budget",
          "token budget",
          "context cost",
          "cost feels heavy",
          "why is this expensive",
        ],
        "it asks why the target feels expensive before measuring live usage",
      ),
    ],
    [
      "evaluate",
      requestSignal(
        [
          "evaluate",
          "audit",
          "review",
          "score",
          "report on",
          "why did this score",
          "what should i fix first",
          "fix first",
        ],
        "it asks for the overall evaluation report or prioritized findings from it",
      ),
    ],
    [
      "next",
      requestSignal(
        [
          "what should i run next",
          "what next",
          "where should i start",
          "where do i start",
          "start here",
          "i'm not sure",
        ],
        "it asks for the best next step instead of a specific workflow",
      ),
    ],
  ];

  for (const [goal, signal] of signals) {
    if (signal.phrases.some((phrase) => normalized.includes(phrase))) {
      return {
        goal,
        reason: signal.reason,
      };
    }
  }

  return null;
}

function workflowLabel(goal, target) {
  if (goal === "analysis") {
    return target.kind === "plugin" ? "Full Plugin Analysis" : "Full Skill Analysis";
  }
  if (goal === "evaluate") {
    return target.kind === "plugin" ? "Evaluate Plugin" : "Evaluate Skill";
  }
  if (goal === "budget") {
    return "Explain Token Budget";
  }
  if (goal === "measure") {
    return "Measure Real Token Usage";
  }
  if (goal === "benchmark") {
    return "Benchmark With Starter Scenarios";
  }
  return "Start Here";
}

function commandsForGoal(goal, target, status) {
  const commandTargetPath = formatCommandPath(target.path);
  const commandConfigPath = formatCommandPath(benchmarkConfigPath(target));
  const commandUsagePath = formatCommandPath(usageLogPath(target));

  if (goal === "analysis") {
    if (!status.hasBenchmarkConfig) {
      return [
        `plugin-eval analyze ${commandTargetPath} --format markdown`,
        `plugin-eval init-benchmark ${commandTargetPath}`,
        `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
      ];
    }

    if (!status.hasUsageLog) {
      return [
        `plugin-eval analyze ${commandTargetPath} --format markdown`,
        `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
      ];
    }

    return [
      `plugin-eval analyze ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
      `plugin-eval measurement-plan ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
    ];
  }

  if (goal === "evaluate") {
    return [`plugin-eval analyze ${commandTargetPath} --format markdown`];
  }

  if (goal === "budget") {
    return [`plugin-eval explain-budget ${commandTargetPath} --format markdown`];
  }

  if (goal === "measure") {
    if (!status.hasBenchmarkConfig) {
      return [
        `plugin-eval init-benchmark ${commandTargetPath}`,
        `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
        `plugin-eval analyze ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
      ];
    }

    if (!status.hasUsageLog) {
      return [
        `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
        `plugin-eval analyze ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
      ];
    }

    return [
      `plugin-eval analyze ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
      `plugin-eval measurement-plan ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
    ];
  }

  if (goal === "benchmark") {
    if (!status.hasBenchmarkConfig) {
      return [
        `plugin-eval init-benchmark ${commandTargetPath}`,
      ];
    }

    return [
      `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
    ];
  }

  if (status.hasUsageLog) {
    return [
      `plugin-eval analyze ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
      `plugin-eval measurement-plan ${commandTargetPath} --observed-usage ${commandUsagePath} --format markdown`,
    ];
  }

  if (status.hasBenchmarkConfig) {
    return [
      `plugin-eval benchmark ${commandTargetPath} --config ${commandConfigPath}`,
    ];
  }

  return [`plugin-eval analyze ${commandTargetPath} --format markdown`];
}

function summaryForGoal(goal, target, status) {
  const label = targetLabel(target);

  if (goal === "analysis") {
    if (status.hasUsageLog) {
      return `Use this when you want the full report plus measured usage follow-through for this ${label}.`;
    }
    if (status.hasBenchmarkConfig) {
      return `Use this when you want the full report and already have benchmark scaffolding ready for this ${label}.`;
    }
    return `Use this when you want the full report and starter benchmark setup for this ${label} in one guided path.`;
  }

  if (goal === "evaluate") {
    return `Start here when you want the overall report for a ${label}, including structure, budgets, and code checks.`;
  }

  if (goal === "budget") {
    return `Use this when the main question is why the ${label} feels expensive before you collect any live measurements.`;
  }

  if (goal === "measure") {
    return status.hasUsageLog
      ? `You already have a local usage log, so the next step is to fold those real measurements back into the report.`
      : `Use this when you want real token usage instead of only the static estimate.`;
  }

  if (goal === "benchmark") {
    return `Use this when you want starter scenarios and a repeatable real-Codex benchmark run for this ${label}.`;
  }

  if (status.hasUsageLog) {
    return "You already collected benchmark output, so the best next step is to analyze the real usage and decide what to improve.";
  }

  if (status.hasBenchmarkConfig) {
    return "You already have a benchmark config, so the next step is to run it.";
  }

  return `If you are new to plugin-eval, start with the overall evaluation report for this ${label}.`;
}

function inferRecommendedGoal(status, explicitGoal) {
  if (explicitGoal && explicitGoal !== "next") {
    return explicitGoal;
  }

  if (status.hasUsageLog) {
    return "measure";
  }

  if (status.hasBenchmarkConfig) {
    return "benchmark";
  }

  return "evaluate";
}

function createEntry(goal, target, status) {
  const commandTargetPath = formatCommandPath(target.path);
  const chatPrompt = chatPromptForGoal(goal, target);
  const commands = commandsForGoal(goal, target, status);
  return {
    id: goal,
    label: workflowLabel(goal, target),
    chatPrompt,
    summary: summaryForGoal(goal, target, status),
    firstCommand: commands[0],
    commands,
    startCommand: `plugin-eval start ${commandTargetPath} --request ${shellQuote(chatPrompt)} --format markdown`,
  };
}

export async function buildWorkflowGuide(targetPath, options = {}) {
  const target = await resolveTarget(targetPath);
  const status = {
    hasBenchmarkConfig: await pathExists(benchmarkConfigPath(target)),
    hasUsageLog: await pathExists(usageLogPath(target)),
  };
  const requestMatch = inferGoalFromRequest(options.request || "");

  const entries = [
    createEntry("analysis", target, status),
    createEntry("evaluate", target, status),
    createEntry("budget", target, status),
    createEntry("measure", target, status),
    createEntry("benchmark", target, status),
    createEntry("next", target, status),
  ];

  const requestedGoal = options.goal || requestMatch?.goal || null;
  const recommendedGoal = inferRecommendedGoal(status, requestedGoal);
  const recommendedWorkflow = entries.find((entry) => entry.id === recommendedGoal) || entries[0];
  const routedRequest = options.request || recommendedWorkflow.chatPrompt;
  const commandTargetPath = formatCommandPath(target.path);
  const routingExplanation = requestMatch
    ? `Plugin Eval routed "${options.request}" to ${recommendedWorkflow.label} because ${requestMatch.reason}.`
    : `Plugin Eval recommended ${recommendedWorkflow.label} from the current local state for this ${targetLabel(target)}.`;

  const payload = {
    kind: "workflow-guide",
    createdAt: new Date().toISOString(),
    target: {
      ...target,
      relativePath: relativePath(process.cwd(), target.path),
    },
    requestedGoal,
    requestedChatPrompt: options.request || null,
    requestRouting: requestMatch,
    recommendedWorkflowId: recommendedWorkflow.id,
    recommendedWorkflow,
    workflowStatus: status,
    beginnerSummary:
      "Start with a natural chat request, then let plugin-eval show the exact local command sequence behind it.",
    startHere: {
      chatPrompt: routedRequest,
      label: recommendedWorkflow.label,
      summary: recommendedWorkflow.summary,
      routingExplanation,
      startCommand: `plugin-eval start ${commandTargetPath} --request ${shellQuote(routedRequest)} --format markdown`,
      firstCommand: recommendedWorkflow.firstCommand,
      commands: recommendedWorkflow.commands,
    },
    entrypoints: entries,
    nextSteps: recommendedWorkflow.commands,
  };
  payload.nextAction = createWorkflowGuideNextAction(payload);
  return payload;
}
```

## File: `src/evaluators/code.js`

```javascript
import path from "node:path";

import { walkFiles } from "../lib/files.js";
import { analyzePythonFiles } from "./python.js";
import { analyzeTypeScriptFiles } from "./typescript.js";

function filterLanguageFiles(files) {
  const tsFiles = [];
  const pyFiles = [];

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    if ([".ts", ".tsx", ".mts", ".cts"].includes(extension)) {
      tsFiles.push(filePath);
    } else if (extension === ".py") {
      pyFiles.push(filePath);
    }
  }

  return { tsFiles, pyFiles };
}

export async function analyzeCodeMetrics(rootPath, target) {
  const files =
    target.kind === "file"
      ? [target.path]
      : await walkFiles(rootPath, {
          excludeDirs: [],
          skipTopLevel: target.kind === "directory" ? [] : ["fixtures", "__fixtures__"],
        });
  const { tsFiles, pyFiles } = filterLanguageFiles(files);

  const tsAnalysis = await analyzeTypeScriptFiles(tsFiles, rootPath);
  const pyAnalysis = await analyzePythonFiles(pyFiles, rootPath);

  return {
    checks: [...tsAnalysis.checks, ...pyAnalysis.checks],
    metrics: [...tsAnalysis.metrics, ...pyAnalysis.metrics],
    artifacts: [...tsAnalysis.artifacts, ...pyAnalysis.artifacts],
  };
}
```

## File: `src/evaluators/coverage.js`

```javascript
import fs from "node:fs/promises";
import path from "node:path";

import { createArtifact, createCheck, createMetric } from "../core/schema.js";
import { pathExists, readJson, readText, relativePath } from "../lib/files.js";

async function findCoverageFiles(rootPath) {
  const results = [];
  const ignored = new Set([".git", "node_modules", ".venv", "venv", "__pycache__"]);

  async function visit(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) {
          continue;
        }
        await visit(entryPath);
        continue;
      }
      if (
        entry.isFile() &&
        ["lcov.info", "coverage.xml", "coverage-final.json", "coverage-summary.json"].includes(entry.name)
      ) {
        results.push(entryPath);
      }
    }
  }

  await visit(rootPath);
  return results.sort();
}

async function parseLcov(filePath) {
  const text = await readText(filePath);
  let found = 0;
  let hit = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("LF:")) {
      found += Number(line.slice(3));
    } else if (line.startsWith("LH:")) {
      hit += Number(line.slice(3));
    }
  }
  return found > 0 ? Number(((hit / found) * 100).toFixed(2)) : null;
}

async function parseCoverageXml(filePath) {
  const text = await readText(filePath);
  const lineRateMatch = /line-rate="([^"]+)"/.exec(text);
  if (lineRateMatch) {
    return Number((Number(lineRateMatch[1]) * 100).toFixed(2));
  }
  const coveredMatch = /lines-covered="([^"]+)"/.exec(text);
  const validMatch = /lines-valid="([^"]+)"/.exec(text);
  if (coveredMatch && validMatch && Number(validMatch[1]) > 0) {
    return Number(((Number(coveredMatch[1]) / Number(validMatch[1])) * 100).toFixed(2));
  }
  return null;
}

async function parseCoverageJson(filePath) {
  const payload = await readJson(filePath);
  if (payload.total?.lines?.pct != null) {
    return Number(payload.total.lines.pct);
  }

  const fileEntries = Object.values(payload).filter((value) => value && typeof value === "object" && value.s);
  let totalStatements = 0;
  let coveredStatements = 0;
  for (const entry of fileEntries) {
    for (const count of Object.values(entry.s)) {
      totalStatements += 1;
      if (Number(count) > 0) {
        coveredStatements += 1;
      }
    }
  }
  if (totalStatements === 0) {
    return null;
  }
  return Number(((coveredStatements / totalStatements) * 100).toFixed(2));
}

async function parseCoverageFile(filePath) {
  if (filePath.endsWith("lcov.info")) {
    return parseLcov(filePath);
  }
  if (filePath.endsWith("coverage.xml")) {
    return parseCoverageXml(filePath);
  }
  if (filePath.endsWith(".json")) {
    return parseCoverageJson(filePath);
  }
  return null;
}

export async function analyzeCoverageArtifacts(rootPath) {
  const checks = [];
  const metrics = [];
  const artifacts = [];
  const coverageFiles = await findCoverageFiles(rootPath);

  metrics.push(
    createMetric({
      id: "coverage_artifact_count",
      category: "coverage",
      value: coverageFiles.length,
      unit: "files",
      band: coverageFiles.length > 0 ? "good" : "info",
    }),
  );

  if (coverageFiles.length === 0) {
    checks.push(
      createCheck({
        id: "coverage-artifacts-unavailable",
        category: "coverage",
        severity: "info",
        status: "info",
        message: "No coverage artifacts were found for this target.",
        evidence: [relativePath(process.cwd(), rootPath)],
        remediation: ["Generate `lcov.info`, `coverage.xml`, or an Istanbul coverage JSON file if you want coverage scoring."],
      }),
    );
    return { checks, metrics, artifacts };
  }

  const fileSummaries = [];
  for (const filePath of coverageFiles) {
    const coverage = await parseCoverageFile(filePath);
    if (coverage != null) {
      fileSummaries.push({
        path: relativePath(rootPath, filePath),
        coverage,
      });
    }
  }

  if (fileSummaries.length > 0) {
    const bestCoverage = Math.max(...fileSummaries.map((item) => item.coverage));
    metrics.push(
      createMetric({
        id: "coverage_percent",
        category: "coverage",
        value: bestCoverage,
        unit: "percent",
        band: bestCoverage >= 85 ? "good" : bestCoverage >= 70 ? "moderate" : "heavy",
      }),
    );
    if (bestCoverage < 70) {
      checks.push(
        createCheck({
          id: "coverage-low",
          category: "coverage",
          severity: "warning",
          status: "warn",
          message: "Coverage artifacts were found, but the measured coverage is low.",
          evidence: fileSummaries.map((item) => `${item.path}: ${item.coverage}%`),
          remediation: ["Increase test coverage on the code that carries the most complexity or risk."],
        }),
      );
    }
  }

  artifacts.push(
    createArtifact({
      id: "coverage-artifacts",
      type: "coverage",
      label: "Coverage artifacts",
      description: "Coverage files discovered during evaluation.",
      data: {
        files: fileSummaries,
      },
    }),
  );

  return { checks, metrics, artifacts };
}
```

## File: `src/evaluators/plugin.js`

```javascript
import path from "node:path";

import { createArtifact, createCheck, createMetric } from "../core/schema.js";
import { evaluateSkill } from "./skill.js";
import { discoverPluginSkillDirectories } from "../core/target.js";
import { pathExists, readJson, relativePath } from "../lib/files.js";

function isHyphenCase(value) {
  return /^[a-z0-9-]+$/.test(value) && !value.startsWith("-") && !value.endsWith("-") && !value.includes("--");
}

export async function evaluatePlugin(pluginRoot) {
  const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  const targetPath = relativePath(process.cwd(), pluginRoot);
  const checks = [];
  const metrics = [];
  const artifacts = [];

  if (!(await pathExists(manifestPath))) {
    checks.push(
      createCheck({
        id: "plugin-manifest-missing",
        category: "manifest",
        severity: "error",
        status: "fail",
        message: "The plugin root is missing .codex-plugin/plugin.json.",
        evidence: [targetPath],
        remediation: ["Add .codex-plugin/plugin.json to the plugin root."],
        targetPath,
      }),
    );
    return { checks, metrics, artifacts };
  }

  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    checks.push(
      createCheck({
        id: "plugin-manifest-invalid-json",
        category: "manifest",
        severity: "error",
        status: "fail",
        message: "plugin.json could not be parsed as JSON.",
        evidence: [error instanceof Error ? error.message : String(error)],
        remediation: ["Fix the JSON syntax in .codex-plugin/plugin.json."],
        targetPath,
      }),
    );
    return { checks, metrics, artifacts };
  }

  const requiredFields = ["name", "version", "description", "author", "interface"];
  for (const field of requiredFields) {
    if (!(field in manifest)) {
      checks.push(
        createCheck({
          id: `manifest-missing-${field}`,
          category: "manifest",
          severity: "error",
          status: "fail",
          message: `plugin.json is missing the required \`${field}\` field.`,
          evidence: [manifestPath],
          remediation: [`Add \`${field}\` to plugin.json.`],
          targetPath,
        }),
      );
    }
  }

  if (manifest.name && !isHyphenCase(manifest.name)) {
    checks.push(
      createCheck({
        id: "manifest-name-not-hyphen-case",
        category: "manifest",
        severity: "error",
        status: "fail",
        message: "The plugin name should be lowercase hyphen-case.",
        evidence: [`Current name: ${manifest.name}`],
        remediation: ["Rename the plugin using lowercase letters, digits, and single hyphens only."],
        targetPath,
      }),
    );
  }

  if (manifest.name && manifest.name !== path.basename(pluginRoot)) {
    checks.push(
      createCheck({
        id: "manifest-name-directory-mismatch",
        category: "manifest",
        severity: "warning",
        status: "warn",
        message: "The plugin manifest name does not match the plugin directory name.",
        evidence: [`Directory: ${path.basename(pluginRoot)}`, `Manifest: ${manifest.name}`],
        remediation: ["Keep the plugin directory name and plugin.json name aligned."],
        targetPath,
      }),
    );
  }

  const interfaceFields = [
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "category",
    "capabilities",
    "websiteURL",
    "privacyPolicyURL",
    "termsOfServiceURL",
    "defaultPrompt",
  ];
  const iface = manifest.interface || {};
  for (const field of interfaceFields) {
    if (!(field in iface)) {
      checks.push(
        createCheck({
          id: `interface-missing-${field}`,
          category: "manifest",
          severity: "error",
          status: "fail",
          message: `plugin.json interface is missing \`${field}\`.`,
          evidence: [manifestPath],
          remediation: [`Add interface.${field} to plugin.json.`],
          targetPath,
        }),
      );
    }
  }

  const pathFields = [
    ["skills", manifest.skills],
    ["hooks", manifest.hooks],
    ["mcpServers", manifest.mcpServers],
    ["apps", manifest.apps],
    ["interface.composerIcon", iface.composerIcon],
    ["interface.logo", iface.logo],
  ];
  for (const [label, fieldValue] of pathFields) {
    if (!fieldValue) {
      continue;
    }
    if (typeof fieldValue !== "string" || !fieldValue.startsWith("./")) {
      checks.push(
        createCheck({
          id: `${label}-path-invalid`,
          category: "manifest",
          severity: "error",
          status: "fail",
          message: `${label} should use a plugin-relative path that starts with ./`,
          evidence: [`Current value: ${String(fieldValue)}`],
          remediation: [`Rewrite ${label} as a plugin-relative path like ./skills/.`],
          targetPath,
        }),
      );
      continue;
    }

    const resolvedPath = path.resolve(pluginRoot, fieldValue);
    if (!(await pathExists(resolvedPath))) {
      checks.push(
        createCheck({
          id: `${label}-path-missing`,
          category: "manifest",
          severity: "error",
          status: "fail",
          message: `${label} points to a missing file or directory.`,
          evidence: [fieldValue],
          remediation: [`Create the target for ${label} or remove the field.`],
          targetPath,
        }),
      );
    }
  }

  if (Array.isArray(iface.defaultPrompt)) {
    if (iface.defaultPrompt.length > 3) {
      checks.push(
        createCheck({
          id: "default-prompt-too-many",
          category: "manifest",
          severity: "warning",
          status: "warn",
          message: "Only the first three default prompts are used by Codex.",
          evidence: [`Prompt count: ${iface.defaultPrompt.length}`],
          remediation: ["Trim interface.defaultPrompt to three strong starters."],
          targetPath,
        }),
      );
    }
    const oversizedPrompts = iface.defaultPrompt.filter((prompt) => prompt.length > 128);
    if (oversizedPrompts.length > 0) {
      checks.push(
        createCheck({
          id: "default-prompt-too-long",
          category: "manifest",
          severity: "warning",
          status: "warn",
          message: "One or more default prompts exceed the UI-friendly length budget.",
          evidence: oversizedPrompts.map((prompt) => `${prompt.slice(0, 140)} (${prompt.length} chars)`),
          remediation: ["Keep default prompts under 128 characters and ideally closer to 50."],
          targetPath,
        }),
      );
    }
  }

  if (iface.brandColor && !/^#[0-9A-Fa-f]{6}$/.test(iface.brandColor)) {
    checks.push(
      createCheck({
        id: "brand-color-invalid",
        category: "manifest",
        severity: "warning",
        status: "warn",
        message: "brandColor should be a six-character hex color.",
        evidence: [`Current value: ${iface.brandColor}`],
        remediation: ["Use a color like #0F766E."],
        targetPath,
      }),
    );
  }

  const skillDirs = await discoverPluginSkillDirectories(pluginRoot, manifest);
  if (skillDirs.length === 0) {
    checks.push(
      createCheck({
        id: "plugin-skills-missing",
        category: "manifest",
        severity: "warning",
        status: "warn",
        message: "The plugin did not expose any discoverable skills.",
        evidence: [manifest.skills || "./skills/"],
        remediation: ["Add at least one skill under the configured skills path."],
        targetPath,
      }),
    );
  }

  for (const skillDir of skillDirs) {
    const prefix = `skill:${path.basename(skillDir)}`;
    const fragment = await evaluateSkill(skillDir, { prefix });
    checks.push(...fragment.checks);
    metrics.push(...fragment.metrics);
    artifacts.push(...fragment.artifacts);
  }

  metrics.push(
    createMetric({
      id: "plugin_skill_count",
      category: "manifest",
      value: skillDirs.length,
      unit: "skills",
      band: skillDirs.length > 0 ? "good" : "moderate",
      targetPath,
    }),
    createMetric({
      id: "plugin_keyword_count",
      category: "manifest",
      value: Array.isArray(manifest.keywords) ? manifest.keywords.length : 0,
      unit: "keywords",
      band: Array.isArray(manifest.keywords) && manifest.keywords.length > 0 ? "good" : "info",
      targetPath,
    }),
    createMetric({
      id: "plugin_default_prompt_count",
      category: "manifest",
      value: Array.isArray(iface.defaultPrompt) ? iface.defaultPrompt.length : 0,
      unit: "prompts",
      band:
        Array.isArray(iface.defaultPrompt) && iface.defaultPrompt.length <= 3
          ? "good"
          : "moderate",
      targetPath,
    }),
  );

  artifacts.push(
    createArtifact({
      id: "plugin-skill-inventory",
      type: "inventory",
      label: "Plugin skills",
      description: "Discoverable skills under the plugin.",
      data: {
        skills: skillDirs.map((skillDir) => relativePath(pluginRoot, skillDir)),
      },
    }),
  );

  return { checks, metrics, artifacts, manifest };
}
```

## File: `src/evaluators/python.js`

```javascript
import { createArtifact, createCheck, createMetric } from "../core/schema.js";
import { readText, relativePath } from "../lib/files.js";

function countMatches(text, expression) {
  return (text.match(expression) || []).length;
}

function countDecisionPoints(text) {
  return (
    countMatches(text, /\bif\b/g) +
    countMatches(text, /\belif\b/g) +
    countMatches(text, /\bfor\b/g) +
    countMatches(text, /\bwhile\b/g) +
    countMatches(text, /\bexcept\b/g) +
    countMatches(text, /\band\b/g) +
    countMatches(text, /\bor\b/g)
  );
}

function detectFunctions(lines) {
  const functions = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^(\s*)(?:async\s+def|def)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:/.exec(line);
    if (!match) {
      continue;
    }

    const indent = match[1].length;
    let endIndex = index;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const cursorLine = lines[cursor];
      const trimmed = cursorLine.trim();
      if (!trimmed) {
        continue;
      }
      const cursorIndent = cursorLine.length - cursorLine.trimStart().length;
      if (cursorIndent <= indent && !trimmed.startsWith("#")) {
        break;
      }
      endIndex = cursor;
    }

    const slice = lines.slice(index, endIndex + 1);
    const source = slice.join("\n");
    const maxIndent = slice.reduce((max, sliceLine) => {
      if (!sliceLine.trim()) {
        return max;
      }
      const currentIndent = sliceLine.length - sliceLine.trimStart().length;
      return Math.max(max, currentIndent);
    }, indent);
    const params = match[3]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length;

    functions.push({
      name: match[2],
      startLine: index + 1,
      endLine: endIndex + 1,
      length: slice.length,
      params,
      complexity: 1 + countDecisionPoints(source),
      nesting: Math.max(0, Math.round((maxIndent - indent) / 4)),
    });
  }
  return functions;
}

export async function analyzePythonFiles(filePaths, rootPath) {
  const checks = [];
  const metrics = [];
  const artifacts = [];

  if (filePaths.length === 0) {
    return { checks, metrics, artifacts };
  }

  const perFile = [];
  let totalCommentLines = 0;
  let totalCodeLines = 0;
  let totalLongLines = 0;
  let totalImports = 0;
  let totalClasses = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;
  let maxNesting = 0;
  let functionCount = 0;
  let totalFunctionLength = 0;
  let testFileCount = 0;

  for (const filePath of filePaths) {
    const source = await readText(filePath);
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const functions = detectFunctions(lines);
    const commentLines = lines.filter((line) => line.trim().startsWith("#")).length;
    const longLines = lines.filter((line) => line.length > 120).length;
    const imports = lines.filter((line) => /^(\s*)(import|from)\b/.test(line)).length;
    const classes = countMatches(source, /^\s*class\s+[A-Za-z0-9_]+/gm);
    const complexity = 1 + countDecisionPoints(source);
    const fileMaxComplexity = functions.reduce((max, fn) => Math.max(max, fn.complexity), complexity);
    const fileMaxFunctionLength = functions.reduce((max, fn) => Math.max(max, fn.length), 0);
    const fileMaxNesting = functions.reduce((max, fn) => Math.max(max, fn.nesting), 0);

    totalCommentLines += commentLines;
    totalCodeLines += lines.filter((line) => line.trim()).length;
    totalLongLines += longLines;
    totalImports += imports;
    totalClasses += classes;
    maxComplexity = Math.max(maxComplexity, fileMaxComplexity);
    maxFunctionLength = Math.max(maxFunctionLength, fileMaxFunctionLength);
    maxNesting = Math.max(maxNesting, fileMaxNesting);
    functionCount += functions.length;
    totalFunctionLength += functions.reduce((sum, fn) => sum + fn.length, 0);
    if (/(^|\/)(tests?|__tests__)\/|(^|\/)test_[^/]+\.py$/.test(filePath)) {
      testFileCount += 1;
    }

    perFile.push({
      path: relativePath(rootPath, filePath),
      functionCount: functions.length,
      complexity: fileMaxComplexity,
      maxFunctionLength: fileMaxFunctionLength,
      maxNesting: fileMaxNesting,
      longLines,
    });
  }

  const averageFunctionLength = functionCount > 0 ? Number((totalFunctionLength / functionCount).toFixed(2)) : 0;
  const commentRatio = totalCodeLines > 0 ? Number((totalCommentLines / totalCodeLines).toFixed(3)) : 0;

  metrics.push(
    createMetric({
      id: "py_file_count",
      category: "code-quality",
      value: filePaths.length,
      unit: "files",
      band: filePaths.length > 0 ? "good" : "info",
    }),
    createMetric({
      id: "py_function_count",
      category: "code-quality",
      value: functionCount,
      unit: "functions",
      band: functionCount > 0 ? "good" : "info",
    }),
    createMetric({
      id: "py_max_cyclomatic_complexity",
      category: "complexity",
      value: maxComplexity,
      unit: "score",
      band: maxComplexity >= 18 ? "heavy" : maxComplexity >= 10 ? "moderate" : "good",
    }),
    createMetric({
      id: "py_average_function_length",
      category: "readability",
      value: averageFunctionLength,
      unit: "lines",
      band: averageFunctionLength >= 50 ? "heavy" : averageFunctionLength >= 30 ? "moderate" : "good",
    }),
    createMetric({
      id: "py_max_nesting_depth",
      category: "complexity",
      value: maxNesting,
      unit: "levels",
      band: maxNesting >= 5 ? "heavy" : maxNesting >= 3 ? "moderate" : "good",
    }),
    createMetric({
      id: "py_comment_ratio",
      category: "readability",
      value: commentRatio,
      unit: "ratio",
      band: commentRatio < 0.03 ? "moderate" : "good",
    }),
    createMetric({
      id: "py_test_file_count",
      category: "best-practice",
      value: testFileCount,
      unit: "files",
      band: testFileCount > 0 ? "good" : "moderate",
    }),
  );

  if (maxComplexity >= 18) {
    checks.push(
      createCheck({
        id: "py-complexity-high",
        category: "complexity",
        severity: "warning",
        status: "warn",
        message: "At least one Python function has high cyclomatic complexity.",
        evidence: [`Max complexity: ${maxComplexity}`],
        remediation: ["Split complex functions into smaller helpers or guard clauses."],
      }),
    );
  }

  if (maxFunctionLength >= 80) {
    checks.push(
      createCheck({
        id: "py-function-length-high",
        category: "readability",
        severity: "warning",
        status: "warn",
        message: "At least one Python function is long enough to hurt readability.",
        evidence: [`Max function length: ${maxFunctionLength} lines`],
        remediation: ["Break large functions into smaller helpers with clear names."],
      }),
    );
  }

  if (totalLongLines > 0) {
    checks.push(
      createCheck({
        id: "py-long-lines",
        category: "readability",
        severity: "warning",
        status: "warn",
        message: "Some Python lines exceed 120 characters.",
        evidence: [`Long lines: ${totalLongLines}`],
        remediation: ["Wrap long expressions and keep docstrings or SQL fragments easier to scan."],
      }),
    );
  }

  if (filePaths.length > 0 && testFileCount === 0) {
    checks.push(
      createCheck({
        id: "py-tests-missing",
        category: "best-practice",
        severity: "warning",
        status: "warn",
        message: "Python source files were found without matching test files.",
        evidence: [`Source files: ${filePaths.length}`],
        remediation: ["Add `test_*.py` or `tests/` coverage for the main Python logic."],
      }),
    );
  }

  artifacts.push(
    createArtifact({
      id: "py-per-file-analysis",
      type: "analysis",
      label: "Python per-file analysis",
      description: "Heuristic Python quality and complexity breakdown by file.",
      data: {
        files: perFile,
      },
    }),
  );

  return { checks, metrics, artifacts };
}
```

## File: `src/evaluators/skill.js`

````javascript
import path from "node:path";

import { createArtifact, createCheck, createMetric } from "../core/schema.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { pathExists, readText, relativePath, walkFiles } from "../lib/files.js";

const ALLOWED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "disable-model-invocation",
  "user-invocable",
  "context",
  "agent",
]);

function countCodeFences(markdown) {
  return (markdown.match(/```/g) || []).length / 2;
}

function findRelativeLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter(
      (target) =>
        !target.startsWith("http://") &&
        !target.startsWith("https://") &&
        !target.startsWith("app://") &&
        !target.startsWith("plugin://") &&
        !target.startsWith("rules://") &&
        !target.startsWith("mailto:") &&
        !target.startsWith("#"),
    );
}

function isHyphenCase(value) {
  return /^[a-z0-9-]+$/.test(value) && !value.startsWith("-") && !value.endsWith("-") && !value.includes("--");
}

export async function evaluateSkill(skillRoot, options = {}) {
  const prefix = options.prefix ? `${options.prefix}:` : "";
  const skillPath = path.join(skillRoot, "SKILL.md");
  const targetPath = relativePath(process.cwd(), skillRoot);
  const checks = [];
  const metrics = [];
  const artifacts = [];

  if (!(await pathExists(skillPath))) {
    checks.push(
      createCheck({
        id: `${prefix}skill-file-missing`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The target skill directory is missing SKILL.md.",
        evidence: [targetPath],
        remediation: ["Add SKILL.md to the skill root."],
        targetPath,
      }),
    );
    return { checks, metrics, artifacts };
  }

  const content = await readText(skillPath);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const parsed = parseFrontmatter(content);
  const relativeLinks = findRelativeLinks(content);
  const supportFiles = (await walkFiles(skillRoot)).filter((filePath) => filePath !== skillPath);

  if (parsed.errors.length > 0) {
    checks.push(
      createCheck({
        id: `${prefix}frontmatter-invalid`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The skill frontmatter could not be parsed.",
        evidence: parsed.errors,
        remediation: ["Fix the YAML frontmatter at the top of SKILL.md."],
        targetPath,
      }),
    );
  }

  const frontmatter = parsed.data || {};
  const unexpectedKeys = Object.keys(frontmatter).filter((key) => !ALLOWED_FRONTMATTER_KEYS.has(key));
  if (unexpectedKeys.length > 0) {
    checks.push(
      createCheck({
        id: `${prefix}frontmatter-extra-keys`,
        category: "best-practice",
        severity: "warning",
        status: "warn",
        message: "The skill frontmatter contains keys outside the common Codex skill conventions.",
        evidence: unexpectedKeys.map((key) => `Unexpected key: ${key}`),
        remediation: ["Remove non-standard frontmatter keys or move the metadata into references."],
        targetPath,
      }),
    );
  }

  if (!frontmatter.name) {
    checks.push(
      createCheck({
        id: `${prefix}name-missing`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The skill frontmatter is missing `name`.",
        evidence: [targetPath],
        remediation: ["Add a hyphen-case `name` field to the frontmatter."],
        targetPath,
      }),
    );
  } else if (!isHyphenCase(frontmatter.name)) {
    checks.push(
      createCheck({
        id: `${prefix}name-not-hyphen-case`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The skill name should be lowercase hyphen-case.",
        evidence: [`Current name: ${frontmatter.name}`],
        remediation: ["Rename the skill using lowercase letters, digits, and single hyphens only."],
        targetPath,
      }),
    );
  }

  if (!frontmatter.description) {
    checks.push(
      createCheck({
        id: `${prefix}description-missing`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The skill frontmatter is missing `description`.",
        evidence: [targetPath],
        remediation: ["Add a description that explains what the skill does and when to use it."],
        targetPath,
      }),
    );
  } else {
    if (frontmatter.description.length > 1024) {
      checks.push(
        createCheck({
          id: `${prefix}description-too-long`,
          category: "budget",
          severity: "warning",
          status: "warn",
          message: "The skill description is long enough to create unnecessary always-loaded context cost.",
          evidence: [`Description length: ${frontmatter.description.length} characters`],
          remediation: ["Shorten the description and push details into SKILL.md or references."],
          targetPath,
        }),
      );
    }
    if (!/use when/i.test(frontmatter.description)) {
      checks.push(
        createCheck({
          id: `${prefix}description-trigger-weak`,
          category: "best-practice",
          severity: "warning",
          status: "warn",
          message: "The description does not clearly advertise when the skill should trigger.",
          evidence: ["Descriptions are the primary auto-load surface in Codex."],
          remediation: ["Rewrite the description to include a clear 'Use when ...' trigger sentence."],
          targetPath,
        }),
      );
    }
  }

  if (lines.length > 800) {
    checks.push(
      createCheck({
        id: `${prefix}skill-too-large`,
        category: "budget",
        severity: "error",
        status: "fail",
        message: "SKILL.md is extremely large for an always-loaded invocation surface.",
        evidence: [`Line count: ${lines.length}`],
        remediation: ["Move large details into references/ and keep SKILL.md focused on the core workflow."],
        targetPath,
      }),
    );
  } else if (lines.length > 500) {
    checks.push(
      createCheck({
        id: `${prefix}skill-large`,
        category: "budget",
        severity: "warning",
        status: "warn",
        message: "SKILL.md exceeds the recommended compact size for progressive disclosure.",
        evidence: [`Line count: ${lines.length}`],
        remediation: ["Trim repetitive detail and move long variants into references/."],
        targetPath,
      }),
    );
  }

  if (lines.length > 350 && supportFiles.filter((filePath) => filePath.includes("/references/")).length === 0) {
    checks.push(
      createCheck({
        id: `${prefix}progressive-disclosure-missing`,
        category: "best-practice",
        severity: "warning",
        status: "warn",
        message: "The skill is getting large without using references for progressive disclosure.",
        evidence: ["Large skills are easier to maintain when variants live under references/."],
        remediation: ["Move deep detail or edge-case variants into references/ and link them from SKILL.md."],
        targetPath,
      }),
    );
  }

  const brokenLinks = [];
  for (const target of relativeLinks) {
    const candidatePath = path.resolve(skillRoot, target);
    if (!(await pathExists(candidatePath))) {
      brokenLinks.push(target);
    }
  }
  if (brokenLinks.length > 0) {
    checks.push(
      createCheck({
        id: `${prefix}broken-relative-links`,
        category: "skill-structure",
        severity: "error",
        status: "fail",
        message: "The skill contains relative links that do not resolve inside the skill directory.",
        evidence: brokenLinks,
        remediation: ["Fix or remove broken links in SKILL.md."],
        targetPath,
      }),
    );
  }

  const extraDocs = supportFiles
    .map((filePath) => path.basename(filePath))
    .filter((name) => ["README.md", "CHANGELOG.md", "CONTRIBUTING.md"].includes(name));
  if (extraDocs.length > 0) {
    checks.push(
      createCheck({
        id: `${prefix}extra-doc-files`,
        category: "best-practice",
        severity: "warning",
        status: "warn",
        message: "The skill includes extra documentation files that usually belong in references/ or outside the skill bundle.",
        evidence: extraDocs,
        remediation: ["Move reusable guidance into references/ and avoid extra top-level docs inside the skill bundle."],
        targetPath,
      }),
    );
  }

  metrics.push(
    createMetric({
      id: `${prefix}skill_line_count`,
      category: "budget",
      value: lines.length,
      unit: "lines",
      band: lines.length > 500 ? "heavy" : lines.length > 350 ? "moderate" : "good",
      targetPath,
    }),
    createMetric({
      id: `${prefix}description_length_chars`,
      category: "budget",
      value: String(frontmatter.description || "").length,
      unit: "chars",
      band:
        String(frontmatter.description || "").length > 1024
          ? "heavy"
          : String(frontmatter.description || "").length > 512
            ? "moderate"
            : "good",
      targetPath,
    }),
    createMetric({
      id: `${prefix}relative_link_count`,
      category: "documentation",
      value: relativeLinks.length,
      unit: "links",
      band: relativeLinks.length > 10 ? "moderate" : "good",
      targetPath,
    }),
    createMetric({
      id: `${prefix}code_fence_count`,
      category: "readability",
      value: countCodeFences(content),
      unit: "blocks",
      band: countCodeFences(content) > 8 ? "moderate" : "good",
      targetPath,
    }),
    createMetric({
      id: `${prefix}support_file_count`,
      category: "documentation",
      value: supportFiles.length,
      unit: "files",
      band: supportFiles.length > 0 ? "good" : "info",
      targetPath,
    }),
  );

  artifacts.push(
    createArtifact({
      id: `${prefix}skill-link-inventory`,
      type: "inventory",
      label: "Skill relative links",
      description: "Relative links found in SKILL.md.",
      data: {
        links: relativeLinks,
      },
    }),
  );

  return { checks, metrics, artifacts };
}
````

## File: `src/evaluators/typescript.js`

```javascript
import { createArtifact, createCheck, createMetric } from "../core/schema.js";
import { readText, relativePath } from "../lib/files.js";

function countMatches(text, expression) {
  return (text.match(expression) || []).length;
}

function countDecisionPoints(text) {
  return (
    countMatches(text, /\bif\b/g) +
    countMatches(text, /\bfor\b/g) +
    countMatches(text, /\bwhile\b/g) +
    countMatches(text, /\bcase\b/g) +
    countMatches(text, /\bcatch\b/g) +
    countMatches(text, /&&/g) +
    countMatches(text, /\|\|/g) +
    countMatches(text, /\?/g)
  );
}

function detectFunctions(lines) {
  const functions = [];
  const startMatchers = [
    /\b(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/,
    /\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/,
    /^\s*(?:public|private|protected|static|readonly|\s)*(?!if\b|for\b|while\b|switch\b|catch\b)([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/,
  ];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = startMatchers.map((matcher) => matcher.exec(line)).find(Boolean);
    if (!match) {
      continue;
    }

    let braceBalance = countMatches(line, /\{/g) - countMatches(line, /\}/g);
    let endIndex = index;
    while (braceBalance > 0 && endIndex + 1 < lines.length) {
      endIndex += 1;
      braceBalance += countMatches(lines[endIndex], /\{/g) - countMatches(lines[endIndex], /\}/g);
    }

    const slice = lines.slice(index, endIndex + 1);
    const source = slice.join("\n");
    const params = match[2]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length;

    let braceDepth = 0;
    let maxDepth = 0;
    for (const sliceLine of slice) {
      braceDepth += countMatches(sliceLine, /\{/g);
      maxDepth = Math.max(maxDepth, braceDepth);
      braceDepth -= countMatches(sliceLine, /\}/g);
    }

    functions.push({
      name: match[1],
      startLine: index + 1,
      endLine: endIndex + 1,
      length: slice.length,
      params,
      complexity: 1 + countDecisionPoints(source),
      nesting: Math.max(0, maxDepth - 1),
    });
  }

  return functions;
}

export async function analyzeTypeScriptFiles(filePaths, rootPath) {
  const checks = [];
  const metrics = [];
  const artifacts = [];

  if (filePaths.length === 0) {
    return { checks, metrics, artifacts };
  }

  const perFile = [];
  let totalCommentLines = 0;
  let totalCodeLines = 0;
  let totalLongLines = 0;
  let totalImports = 0;
  let totalClasses = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;
  let maxNesting = 0;
  let functionCount = 0;
  let totalFunctionLength = 0;
  let testFileCount = 0;

  for (const filePath of filePaths) {
    const source = await readText(filePath);
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const functions = detectFunctions(lines);
    const commentLines = lines.filter((line) => line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")).length;
    const longLines = lines.filter((line) => line.length > 120).length;
    const imports = lines.filter((line) => line.trim().startsWith("import ")).length;
    const classes = countMatches(source, /\bclass\s+[A-Za-z0-9_$]+/g);
    const complexity = 1 + countDecisionPoints(source);
    const fileMaxComplexity = functions.reduce((max, fn) => Math.max(max, fn.complexity), complexity);
    const fileMaxFunctionLength = functions.reduce((max, fn) => Math.max(max, fn.length), 0);
    const fileMaxNesting = functions.reduce((max, fn) => Math.max(max, fn.nesting), 0);

    totalCommentLines += commentLines;
    totalCodeLines += lines.filter((line) => line.trim()).length;
    totalLongLines += longLines;
    totalImports += imports;
    totalClasses += classes;
    maxComplexity = Math.max(maxComplexity, fileMaxComplexity);
    maxFunctionLength = Math.max(maxFunctionLength, fileMaxFunctionLength);
    maxNesting = Math.max(maxNesting, fileMaxNesting);
    functionCount += functions.length;
    totalFunctionLength += functions.reduce((sum, fn) => sum + fn.length, 0);
    if (/(^|\/)(tests?|__tests__)\/|(\.test|\.spec)\./.test(filePath)) {
      testFileCount += 1;
    }

    perFile.push({
      path: relativePath(rootPath, filePath),
      functionCount: functions.length,
      complexity: fileMaxComplexity,
      maxFunctionLength: fileMaxFunctionLength,
      maxNesting: fileMaxNesting,
      longLines,
    });
  }

  const averageFunctionLength = functionCount > 0 ? Number((totalFunctionLength / functionCount).toFixed(2)) : 0;
  const commentRatio = totalCodeLines > 0 ? Number((totalCommentLines / totalCodeLines).toFixed(3)) : 0;

  metrics.push(
    createMetric({
      id: "ts_file_count",
      category: "code-quality",
      value: filePaths.length,
      unit: "files",
      band: filePaths.length > 0 ? "good" : "info",
    }),
    createMetric({
      id: "ts_function_count",
      category: "code-quality",
      value: functionCount,
      unit: "functions",
      band: functionCount > 0 ? "good" : "info",
    }),
    createMetric({
      id: "ts_max_cyclomatic_complexity",
      category: "complexity",
      value: maxComplexity,
      unit: "score",
      band: maxComplexity >= 18 ? "heavy" : maxComplexity >= 10 ? "moderate" : "good",
    }),
    createMetric({
      id: "ts_average_function_length",
      category: "readability",
      value: averageFunctionLength,
      unit: "lines",
      band: averageFunctionLength >= 50 ? "heavy" : averageFunctionLength >= 30 ? "moderate" : "good",
    }),
    createMetric({
      id: "ts_max_nesting_depth",
      category: "complexity",
      value: maxNesting,
      unit: "levels",
      band: maxNesting >= 5 ? "heavy" : maxNesting >= 3 ? "moderate" : "good",
    }),
    createMetric({
      id: "ts_comment_ratio",
      category: "readability",
      value: commentRatio,
      unit: "ratio",
      band: commentRatio < 0.03 ? "moderate" : "good",
    }),
    createMetric({
      id: "ts_test_file_count",
      category: "best-practice",
      value: testFileCount,
      unit: "files",
      band: testFileCount > 0 ? "good" : "moderate",
    }),
  );

  if (maxComplexity >= 18) {
    checks.push(
      createCheck({
        id: "ts-complexity-high",
        category: "complexity",
        severity: "warning",
        status: "warn",
        message: "At least one TypeScript function has high cyclomatic complexity.",
        evidence: [`Max complexity: ${maxComplexity}`],
        remediation: ["Split complex functions into smaller branches with clearer responsibilities."],
      }),
    );
  }

  if (maxFunctionLength >= 80) {
    checks.push(
      createCheck({
        id: "ts-function-length-high",
        category: "readability",
        severity: "warning",
        status: "warn",
        message: "At least one TypeScript function is long enough to hurt readability.",
        evidence: [`Max function length: ${maxFunctionLength} lines`],
        remediation: ["Break large functions into smaller helpers with single-purpose logic."],
      }),
    );
  }

  if (totalLongLines > 0) {
    checks.push(
      createCheck({
        id: "ts-long-lines",
        category: "readability",
        severity: "warning",
        status: "warn",
        message: "Some TypeScript lines exceed 120 characters.",
        evidence: [`Long lines: ${totalLongLines}`],
        remediation: ["Wrap long expressions and object literals to keep scanability high."],
      }),
    );
  }

  if (filePaths.length > 0 && testFileCount === 0) {
    checks.push(
      createCheck({
        id: "ts-tests-missing",
        category: "best-practice",
        severity: "warning",
        status: "warn",
        message: "TypeScript source files were found without matching test files.",
        evidence: [`Source files: ${filePaths.length}`],
        remediation: ["Add `.test.ts` or `.spec.ts` coverage for the main TypeScript logic."],
      }),
    );
  }

  artifacts.push(
    createArtifact({
      id: "ts-per-file-analysis",
      type: "analysis",
      label: "TypeScript per-file analysis",
      description: "Heuristic TypeScript quality and complexity breakdown by file.",
      data: {
        files: perFile,
      },
    }),
  );

  return { checks, metrics, artifacts };
}
```

## File: `src/index.js`

```javascript
export { analyzePath, explainBudget, recommendMeasures } from "./core/analyze.js";
export { initializeBenchmark, runBenchmark } from "./core/benchmark.js";
export { compareResults } from "./core/compare.js";
export { buildWorkflowGuide } from "./core/workflow-guide.js";
export { renderPayload } from "./renderers/index.js";
```

## File: `src/lib/files.js`

```javascript
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  ".tmp",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  "coverage",
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function readText(targetPath) {
  return fs.readFile(targetPath, "utf8");
}

export async function readJson(targetPath) {
  return JSON.parse(await readText(targetPath));
}

export async function writeText(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

export async function writeJson(targetPath, payload) {
  await writeText(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function isProbablyTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function relativePath(fromPath, toPath) {
  const value = path.relative(fromPath, toPath) || ".";
  return toPosixPath(value);
}

export function formatCommandPath(targetPath, options = {}) {
  const absoluteTargetPath = path.resolve(targetPath);
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || os.homedir());

  if (absoluteTargetPath === homeDir) {
    return "~";
  }

  const relativeToHome = path.relative(homeDir, absoluteTargetPath);
  if (relativeToHome && !relativeToHome.startsWith("..") && !path.isAbsolute(relativeToHome)) {
    return `~/${toPosixPath(relativeToHome)}`;
  }

  const relativeToCwd = path.relative(cwd, absoluteTargetPath) || ".";
  if (!relativeToCwd.startsWith("..") && !path.isAbsolute(relativeToCwd)) {
    return toPosixPath(relativeToCwd);
  }

  return toPosixPath(absoluteTargetPath);
}

export async function walkFiles(rootPath, options = {}) {
  const files = [];
  const {
    excludeDirs = [],
    skipTopLevel = ["fixtures", "__fixtures__"],
  } = options;
  const excluded = new Set([...IGNORED_DIRS, ...excludeDirs]);

  async function visit(currentPath, depth = 0) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (excluded.has(entry.name)) {
          continue;
        }
        if (depth === 0 && skipTopLevel.includes(entry.name)) {
          continue;
        }
        await visit(entryPath, depth + 1);
        continue;
      }
      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  await visit(rootPath);
  return files.sort();
}

export async function listImmediateDirectories(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootPath, entry.name))
    .sort();
}
```

## File: `src/lib/frontmatter.js`

```javascript
function countIndent(line) {
  return line.length - line.trimStart().length;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return "";
  }
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value === "null") {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map(parseScalar);
  }
  return value;
}

function nextMeaningfulIndex(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    return index;
  }
  return -1;
}

function parseBlockScalarHeader(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }
  if (!value.startsWith(">") && !value.startsWith("|")) {
    return null;
  }
  return {
    style: value[0],
  };
}

function foldBlockScalarLines(lines) {
  let result = "";
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];

    result += current;
    if (next === undefined) {
      continue;
    }
    if (current === "" || next === "") {
      result += "\n";
    } else {
      result += " ";
    }
  }
  return result;
}

function parseBlockScalar(lines, startIndex, parentIndent, style) {
  const blockLines = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const currentIndent = countIndent(line);

    if (trimmed && currentIndent <= parentIndent) {
      break;
    }

    blockLines.push(line);
    index += 1;
  }

  const contentIndent = blockLines.reduce((minimumIndent, line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return minimumIndent;
    }
    const currentIndent = countIndent(line);
    if (currentIndent <= parentIndent) {
      return minimumIndent;
    }
    return minimumIndent === null ? currentIndent : Math.min(minimumIndent, currentIndent);
  }, null);

  const normalizedLines = blockLines.map((line) => {
    if (!line.trim()) {
      return "";
    }
    if (contentIndent === null) {
      return line.trim();
    }
    return line.slice(contentIndent);
  });

  return {
    value: style === "|" ? normalizedLines.join("\n") : foldBlockScalarLines(normalizedLines),
    nextIndex: index,
  };
}

function parseBlock(lines, startIndex, indent) {
  const firstIndex = nextMeaningfulIndex(lines, startIndex);
  if (firstIndex === -1) {
    return { value: {}, nextIndex: lines.length };
  }

  const firstLine = lines[firstIndex];
  const isArray = firstLine.trim().startsWith("- ");
  const container = isArray ? [] : {};
  let index = firstIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      index += 1;
      continue;
    }

    const currentIndent = countIndent(line);
    if (currentIndent < indent) {
      break;
    }
    if (currentIndent > indent) {
      throw new Error(`Unexpected indentation at line ${index + 1}`);
    }

    if (isArray) {
      if (!trimmed.startsWith("- ")) {
        break;
      }
      const payload = trimmed.slice(2).trim();
      index += 1;
      if (!payload) {
        const nested = parseBlock(lines, index, indent + 2);
        container.push(nested.value);
        index = nested.nextIndex;
      } else {
        container.push(parseScalar(payload));
      }
      continue;
    }

    const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(trimmed);
    if (!match) {
      throw new Error(`Invalid key/value pair at line ${index + 1}`);
    }

    const [, key, remainder] = match;
    if (remainder.trim()) {
      const blockScalar = parseBlockScalarHeader(remainder);
      if (blockScalar) {
        const parsed = parseBlockScalar(lines, index + 1, indent, blockScalar.style);
        container[key] = parsed.value;
        index = parsed.nextIndex;
        continue;
      }

      container[key] = parseScalar(remainder.trim());
      index += 1;
      continue;
    }

    const nestedIndex = nextMeaningfulIndex(lines, index + 1);
    if (nestedIndex === -1 || countIndent(lines[nestedIndex]) <= indent) {
      container[key] = "";
      index += 1;
      continue;
    }

    const nested = parseBlock(lines, index + 1, indent + 2);
    container[key] = nested.value;
    index = nested.nextIndex;
  }

  return { value: container, nextIndex: index };
}

export function parseYamlDocument(yamlText) {
  const normalized = yamlText.replace(/\r\n/g, "\n");
  return parseBlock(normalized.split("\n"), 0, 0).value;
}

export function extractFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") {
    return {
      frontmatterText: "",
      body: normalized,
      errors: ["No YAML frontmatter found."],
    };
  }

  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    return {
      frontmatterText: "",
      body: normalized,
      errors: ["Frontmatter opening delimiter is missing a closing delimiter."],
    };
  }

  return {
    frontmatterText: lines.slice(1, closingIndex).join("\n"),
    body: lines.slice(closingIndex + 1).join("\n"),
    errors: [],
  };
}

export function parseFrontmatter(markdown) {
  const extracted = extractFrontmatter(markdown);
  if (extracted.errors.length > 0) {
    return {
      data: null,
      body: extracted.body,
      errors: extracted.errors,
    };
  }

  try {
    const parsed = parseYamlDocument(extracted.frontmatterText);
    return {
      data: parsed,
      body: extracted.body,
      errors: [],
    };
  } catch (error) {
    return {
      data: null,
      body: extracted.body,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
```

## File: `src/lib/tokens.js`

```javascript
export function estimateTokenCount(text) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function sumTokenCounts(items) {
  return items.reduce((total, item) => total + item.tokens, 0);
}
```

## File: `src/renderers/html.js`

```javascript
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function renderList(items) {
  if (items.length === 0) {
    return "<p>None.</p>";
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderOptionalList(items, emptyLabel = "None.") {
  return renderList(Array.isArray(items) && items.length > 0 ? items : [emptyLabel]);
}

function renderChecks(checks) {
  if (checks.length === 0) {
    return "<p>No checks recorded.</p>";
  }

  return `<ul>${checks
    .map(
      (check) =>
        `<li><strong>${escapeHtml(check.id)}</strong> [${escapeHtml(check.status)}] ${escapeHtml(check.message)}</li>`,
    )
    .join("")}</ul>`;
}

function renderMetrics(metrics) {
  if (metrics.length === 0) {
    return "<p>No metrics recorded.</p>";
  }

  return `<ul>${metrics
    .map(
      (metric) =>
        `<li><strong>${escapeHtml(metric.id)}</strong>: ${escapeHtml(metric.value)} ${escapeHtml(metric.unit)} (${escapeHtml(metric.band)})</li>`,
    )
    .join("")}</ul>`;
}

function renderDeductions(summary) {
  if (!summary.deductions || summary.deductions.length === 0) {
    return "<p>No deductions were applied.</p>";
  }

  return `<ul>${summary.deductions
    .map(
      (entry) =>
        `<li><strong>-${escapeHtml(entry.penalty)} points</strong> <code>${escapeHtml(entry.id)}</code> [${escapeHtml(entry.status)}/${escapeHtml(entry.severity)}] ${escapeHtml(entry.message)}</li>`,
    )
    .join("")}</ul>`;
}

function renderCategoryDeductions(summary) {
  if (!summary.categoryDeductions || summary.categoryDeductions.length === 0) {
    return "<p>No category deductions recorded.</p>";
  }

  return `<ul>${summary.categoryDeductions
    .map(
      (entry) =>
        `<li><strong>${escapeHtml(entry.category)}</strong>: -${escapeHtml(entry.totalPenalty)} points across ${escapeHtml(entry.checks)} check${entry.checks === 1 ? "" : "s"}</li>`,
    )
    .join("")}</ul>`;
}

function renderObservedUsage(observedUsage) {
  if (!observedUsage) {
    return "<p>No observed usage supplied.</p>";
  }

  const items = [
    `Samples: ${observedUsage.sampleCount}`,
    `Observed input avg: ${observedUsage.inputTokens.average}`,
    `Observed output avg: ${observedUsage.outputTokens.average}`,
    `Observed total avg: ${observedUsage.totalTokens.average}`,
  ];

  if (observedUsage.cachedTokens.total > 0) {
    items.push(`Observed cached avg: ${observedUsage.cachedTokens.average}`);
  }

  if (observedUsage.estimateComparison) {
    items.push(`Estimated active tokens: ${observedUsage.estimateComparison.estimatedActiveTokens}`);
    items.push(`Estimate delta: ${observedUsage.estimateComparison.deltaTokens}`);
    items.push(`Estimate ratio: ${observedUsage.estimateComparison.deltaRatio} (${observedUsage.estimateComparison.band})`);
  }

  return renderList(items);
}

function renderMeasurementPlan(plan) {
  if (!plan) {
    return "<p>No measurement plan available.</p>";
  }

  return `<p>${escapeHtml(plan.summary)}</p><ul>${plan.toolsets
    .map(
      (toolset) =>
        `<li><strong>${escapeHtml(toolset.label)}</strong> [${escapeHtml(toolset.priority)}] ${escapeHtml(toolset.goal)}</li>`,
    )
    .join("")}</ul>`;
}

function renderWorkflowGuide(guide) {
  if (!guide) {
    return "<p>No chat workflow guidance available.</p>";
  }

  const startHere = guide.startHere || {
    chatPrompt: guide.recommendedWorkflow.chatPrompt,
    routingExplanation: guide.recommendedWorkflow.summary,
    startCommand: guide.recommendedWorkflow.startCommand,
    firstCommand: guide.recommendedWorkflow.firstCommand,
  };

  return [
    `<p>${escapeHtml(guide.beginnerSummary)}</p>`,
    `<p><strong>Start with this chat request:</strong> ${escapeHtml(`"${startHere.chatPrompt}"`)}</p>`,
    `<p><strong>Why this path:</strong> ${escapeHtml(startHere.routingExplanation)}</p>`,
    `<p><strong>Quick local entrypoint:</strong> <code>${escapeHtml(startHere.startCommand)}</code></p>`,
    `<p><strong>Plugin Eval will run first:</strong> <code>${escapeHtml(startHere.firstCommand)}</code></p>`,
    "<h3>Other chat requests you can use</h3>",
    renderList(
      guide.entrypoints.map(
        (entry) => `${entry.label}: say "${entry.chatPrompt}" then run ${entry.firstCommand}`,
      ),
    ),
  ].join("");
}

function renderNextAction(nextAction) {
  if (!nextAction) {
    return "<p>No recommended next step.</p>";
  }

  return renderList([
    nextAction.label,
    `Why: ${nextAction.why}`,
    ...(nextAction.chatPrompt ? [`Chat request: "${nextAction.chatPrompt}"`] : []),
    ...(nextAction.command ? [`Local command: ${nextAction.command}`] : []),
  ]);
}

export function renderHtml(result) {
  if (result.kind === "workflow-guide") {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Plugin Eval Start Here</title>
  </head>
  <body>
    <main>
      <h1>Plugin Eval Start Here: ${escapeHtml(result.target.name)}</h1>
      ${renderWorkflowGuide(result)}
      <h2>Recommended Next Step</h2>
      ${renderNextAction(result.nextAction)}
      <h2>Current Local State</h2>
      ${renderList([
        `Benchmark config present: ${result.workflowStatus.hasBenchmarkConfig ? "yes" : "no"}`,
        `Usage log present: ${result.workflowStatus.hasUsageLog ? "yes" : "no"}`,
      ])}
      <h2>Full Local Sequence</h2>
      ${renderList(result.startHere?.commands || [])}
    </main>
  </body>
</html>`;
  }

  if (result.kind === "measurement-plan") {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Measurement Plan</title>
  </head>
  <body>
    <main>
      <h1>Measurement Plan: ${escapeHtml(result.target.name)}</h1>
      ${renderMeasurementPlan(result)}
      <h2>Recommended Next Step</h2>
      ${renderNextAction(result.nextAction)}
      <h2>Use From Codex Chat</h2>
      ${renderWorkflowGuide(result.workflowGuide)}
    </main>
  </body>
</html>`;
  }

  if (result.kind === "benchmark-template-init") {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Benchmark Template Ready</title>
  </head>
  <body>
    <main>
      <h1>Benchmark Template Ready: ${escapeHtml(result.target.name)}</h1>
      <p>Config: ${escapeHtml(result.configPath)}</p>
      <h2>Recommended Next Step</h2>
      ${renderNextAction(result.nextAction)}
      <h2>Setup Questions To Ask First</h2>
      ${renderOptionalList(result.setupQuestions, "No setup questions provided.")}
      ${renderList(result.nextSteps || [])}
      <h2>Use From Codex Chat</h2>
      ${renderWorkflowGuide(result.workflowGuide)}
    </main>
  </body>
</html>`;
  }

  if (result.kind === "benchmark-run") {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Benchmark Run</title>
  </head>
  <body>
    <main>
      <h1>Benchmark Run: ${escapeHtml(result.target.name)}</h1>
      <p>Mode: ${escapeHtml(result.mode)}</p>
      <p>Codex version: ${escapeHtml(result.codexVersion || "unknown")}</p>
      <p>Model: ${escapeHtml(result.config?.model || "")}</p>
      <p>Workspace source: ${escapeHtml(result.config?.workspaceSourcePath || "")}</p>
      <p>Run directory: ${escapeHtml(result.runDirectory || "")}</p>
      <h2>Recommended Next Step</h2>
      ${renderNextAction(result.nextAction)}
      <h2>Next Steps</h2>
      ${renderList(result.nextSteps || [])}
      <h2>Use From Codex Chat</h2>
      ${renderWorkflowGuide(result.workflowGuide)}
    </main>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Plugin Eval Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4faf8;
        --ink: #16302b;
        --accent: #0f766e;
        --panel: #ffffff;
        --border: #c8ece6;
      }
      body {
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background: radial-gradient(circle at top left, #d9fbe8 0, var(--bg) 40%);
        color: var(--ink);
        margin: 0;
        padding: 2rem;
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 20px 40px rgba(15, 118, 110, 0.08);
      }
      h1, h2 {
        margin-top: 0;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
      }
      .card {
        padding: 1rem;
        border-radius: 16px;
        background: #f0fdfa;
        border: 1px solid var(--border);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Plugin Eval Report: ${escapeHtml(result.target.name)}</h1>
      <section class="summary">
        <div class="card"><strong>Score</strong><div>${escapeHtml(result.summary.score)}/100</div></div>
        <div class="card"><strong>Grade</strong><div>${escapeHtml(result.summary.grade)}</div></div>
        <div class="card"><strong>Risk</strong><div>${escapeHtml(result.summary.riskLevel)}</div></div>
        <div class="card"><strong>Deductions</strong><div>-${escapeHtml(result.summary.scoreBreakdown?.totalDeductions || 0)}</div></div>
        <div class="card"><strong>Total Tokens</strong><div>${escapeHtml(result.budgets.total_tokens?.value || 0)}</div></div>
      </section>
      <h2>Why It Matters</h2>
      ${renderList(result.summary.whyBullets || [
        `Started at ${result.summary.scoreBreakdown?.startingScore || 100} and deducted ${result.summary.scoreBreakdown?.totalDeductions || 0} points.`,
        `Final score: ${result.summary.scoreBreakdown?.finalScore || result.summary.score}/100.`,
      ])}
      <h2>Fix First</h2>
      ${renderList((result.summary.fixFirst || []).map((item) => `${item.message} Why: ${item.why}`))}
      <h2>Recommended Next Step</h2>
      ${renderNextAction(result.nextAction)}
      <h2>Risk Assessment</h2>
      ${renderList(result.summary.riskReasons || [])}
      <h2>Deductions</h2>
      ${renderDeductions(result.summary)}
      <h2>Deductions By Category</h2>
      ${renderCategoryDeductions(result.summary)}
      <h2>Recommendations</h2>
      ${renderList(result.summary.topRecommendations)}
      <h2>Observed Usage</h2>
      ${renderObservedUsage(result.observedUsage)}
      <h2>Measurement Plan</h2>
      ${renderMeasurementPlan(result.measurementPlan)}
      <h2>Use From Codex Chat</h2>
      ${renderWorkflowGuide(result.workflowGuide)}
      <h2>Checks</h2>
      ${renderChecks(result.checks)}
      <h2>Metrics</h2>
      ${renderMetrics(result.metrics)}
    </main>
  </body>
</html>`;
}
```

## File: `src/renderers/index.js`

```javascript
import { renderHtml } from "./html.js";
import { renderMarkdown } from "./markdown.js";

export function renderPayload(payload, format) {
  if (format === "json") {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }
  if (format === "markdown" || format === "md") {
    return `${renderMarkdown(payload)}\n`;
  }
  if (format === "html") {
    return renderHtml(payload);
  }
  throw new Error(`Unsupported format: ${format}`);
}
```

## File: `src/renderers/markdown.js`

````javascript
import {
  applyEvaluationPresentation,
  createBenchmarkRunNextAction,
  createBenchmarkTemplateNextAction,
  createBudgetNextAction,
  createComparisonNextAction,
  createEvaluationNextAction,
  createMeasurementPlanNextAction,
  createWorkflowGuideNextAction,
} from "../core/presentation.js";
import { enrichSummary } from "../core/scoring.js";

function detailsBlock(summary, body) {
  const content = Array.isArray(body) ? body.join("\n") : body;
  if (!content || content.trim().length === 0) {
    return "";
  }

  return [`<details>`, `<summary>${summary}</summary>`, "", content, `</details>`].join("\n");
}

function section(title, lines) {
  return [`## ${title}`, ...lines].join("\n");
}

function renderNextAction(nextAction) {
  if (!nextAction) {
    return ["- No recommended next step."];
  }

  return [
    `- ${nextAction.label}`,
    `- Why: ${nextAction.why}`,
    ...(nextAction.chatPrompt ? [`- Chat request: "${nextAction.chatPrompt}"`] : []),
    ...(nextAction.command ? [`- Local command: \`${nextAction.command}\``] : []),
  ];
}

function renderBudgets(budgets) {
  const lines = [
    `- trigger_cost_tokens: ${budgets.trigger_cost_tokens.value} (${budgets.trigger_cost_tokens.band})`,
    `- invoke_cost_tokens: ${budgets.invoke_cost_tokens.value} (${budgets.invoke_cost_tokens.band})`,
    `- deferred_cost_tokens: ${budgets.deferred_cost_tokens.value} (${budgets.deferred_cost_tokens.band})`,
  ];

  if (budgets.explicit_only_invoke_cost_tokens) {
    lines.push(
      `- explicit_only_invoke_cost_tokens: ${budgets.explicit_only_invoke_cost_tokens.value} (${budgets.explicit_only_invoke_cost_tokens.band}, unscored)`,
    );
  }

  lines.push(`- total_tokens: ${budgets.total_tokens.value} (${budgets.total_tokens.band})`);

  if (budgets.invocation_policy?.explicit_only_skill_count > 0) {
    lines.push(
      `- invocation_policy: ${budgets.invocation_policy.implicit_skill_count} implicit skill(s), ${budgets.invocation_policy.explicit_only_skill_count} explicit-only skill(s)`,
    );
  }

  return lines.join("\n");
}

function renderObservedUsage(observedUsage) {
  if (!observedUsage) {
    return "- No observed usage supplied.";
  }

  const comparison = observedUsage.estimateComparison;
  return [
    `- samples: ${observedUsage.sampleCount}`,
    `- observed_input_tokens_avg: ${observedUsage.inputTokens.average}`,
    `- observed_output_tokens_avg: ${observedUsage.outputTokens.average}`,
    `- observed_total_tokens_avg: ${observedUsage.totalTokens.average}`,
    ...(observedUsage.cachedTokens.total > 0
      ? [`- observed_cached_tokens_avg: ${observedUsage.cachedTokens.average}`]
      : []),
    ...(comparison
      ? [
          `- estimated_active_tokens: ${comparison.estimatedActiveTokens}`,
          `- estimate_vs_observed_input_delta: ${comparison.deltaTokens}`,
          `- estimate_vs_observed_input_ratio: ${comparison.deltaRatio} (${comparison.band})`,
        ]
      : []),
  ].join("\n");
}

function renderFindingList(findings, emptyLabel) {
  if (!findings || findings.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return findings.map((finding) => {
    const parts = [`- [${finding.status}/${finding.severity}] ${finding.message}`];
    if (finding.why) {
      parts.push(`Why: ${finding.why}`);
    }
    if (finding.remediation?.length > 0) {
      parts.push(`Fix: ${finding.remediation.join(" ")}`);
    }
    return parts.join(" ");
  });
}

function renderChecks(checks) {
  if (checks.length === 0) {
    return "No checks recorded.";
  }

  return checks
    .map((check) => {
      const parts = [`- [${check.status.toUpperCase()}] ${check.id}: ${check.message}`];
      if (check.why) {
        parts.push(`Why: ${check.why}`);
      }
      if (check.evidence?.length > 0) {
        parts.push(`Evidence: ${check.evidence.join(" ")}`);
      }
      if (check.remediation?.length > 0) {
        parts.push(`Remediation: ${check.remediation.join(" ")}`);
      }
      return parts.join(" ");
    })
    .join("\n");
}

function renderMetrics(metrics) {
  if (metrics.length === 0) {
    return "No metrics recorded.";
  }

  return metrics
    .map((metric) => `- ${metric.id}: ${metric.value} ${metric.unit} (${metric.band})`)
    .join("\n");
}

function renderDeductions(summary) {
  if (!summary.deductions || summary.deductions.length === 0) {
    return "No deductions were applied.";
  }

  return summary.deductions
    .map(
      (entry) =>
        `- -${entry.penalty} points: ${entry.id} [${entry.status}/${entry.severity}] ${entry.message}`,
    )
    .join("\n");
}

function renderCategoryDeductions(summary) {
  if (!summary.categoryDeductions || summary.categoryDeductions.length === 0) {
    return "No category deductions recorded.";
  }

  return summary.categoryDeductions
    .map(
      (entry) =>
        `- ${entry.category}: -${entry.totalPenalty} points across ${entry.checks} check${entry.checks === 1 ? "" : "s"}`,
    )
    .join("\n");
}

function renderWorkflowGuide(guide) {
  if (!guide) {
    return "No chat workflow guidance available.";
  }

  const startHere = guide.startHere || guide.recommendedWorkflow;
  return [
    guide.beginnerSummary,
    "",
    `Start with this chat request: "${startHere.chatPrompt}"`,
    `Why this path: ${startHere.routingExplanation || startHere.summary}`,
    `Quick local entrypoint: ${startHere.startCommand}`,
    `Plugin Eval will run first: ${startHere.firstCommand}`,
    "",
    "Other chat requests you can use:",
    ...guide.entrypoints.map((entry) =>
      `- ${entry.label}: say "${entry.chatPrompt}" -> ${entry.firstCommand}`,
    ),
  ].join("\n");
}

function renderMeasurementPlan(plan) {
  if (!plan) {
    return "No measurement plan available.";
  }

  return [
    plan.summary,
    "",
    ...plan.toolsets.map(
      (toolset) =>
        `- ${toolset.label} [${toolset.priority}] ${toolset.goal} Signals: ${toolset.signals.join(", ")}. Evidence: ${toolset.evidenceSources.join(", ")}.`,
    ),
  ].join("\n");
}

function ensureEvaluationPayload(payload) {
  const nextPayload = {
    ...payload,
    summary: enrichSummary(payload, payload.summary || {}),
  };

  if (!nextPayload.nextAction) {
    nextPayload.nextAction = createEvaluationNextAction(nextPayload);
  }

  return applyEvaluationPresentation(nextPayload);
}

function ensureMeasurementPlanPayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createMeasurementPlanNextAction(payload),
  };
}

function ensureBudgetPayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createBudgetNextAction(payload),
  };
}

function ensureWorkflowPayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createWorkflowGuideNextAction(payload),
  };
}

function ensureBenchmarkTemplatePayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createBenchmarkTemplateNextAction(payload),
  };
}

function ensureBenchmarkRunPayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createBenchmarkRunNextAction(payload),
  };
}

function ensureComparisonPayload(payload) {
  return {
    ...payload,
    nextAction: payload.nextAction || createComparisonNextAction(payload),
  };
}

function renderEvaluation(payload) {
  const result = ensureEvaluationPayload(payload);

  return [
    `# Plugin Eval Report: ${result.target.name}`,
    "",
    section("At a Glance", [
      `- Score: ${result.summary.score}/100`,
      `- Grade: ${result.summary.grade}`,
      `- Risk: ${result.summary.riskLevel}`,
      `- Checks: ${result.summary.checkCounts.fail} fail, ${result.summary.checkCounts.warn} warn, ${result.summary.checkCounts.info} info`,
      `- Active budget: ${result.budgets.trigger_cost_tokens.value + result.budgets.invoke_cost_tokens.value} tokens (${result.budgets.invoke_cost_tokens.band})`,
      `- Observed usage: ${result.observedUsage?.sampleCount ? `${result.observedUsage.sampleCount} sample${result.observedUsage.sampleCount === 1 ? "" : "s"}` : "not supplied"}`,
    ]),
    "",
    section("Why It Matters", result.summary.whyBullets.map((item) => `- ${item}`)),
    "",
    section("Fix First", renderFindingList(result.summary.fixFirst, "No urgent fixes were identified.")),
    "",
    section("Recommended Next Step", renderNextAction(result.nextAction)),
    "",
    section("Details", [
      detailsBlock("Watch next", renderFindingList(result.summary.watchNext, "No secondary findings queued.")),
      detailsBlock(
        "Improvement brief",
        [
          `- ${result.improvementBrief?.summary || "No improvement brief available."}`,
          ...(result.improvementBrief?.goals?.length > 0
            ? result.improvementBrief.goals.map((item) => `- Goal: ${item}`)
            : []),
          ...(result.improvementBrief?.measurementGoals?.length > 0
            ? result.improvementBrief.measurementGoals.map((item) => `- Measure: ${item}`)
            : []),
          ...(result.improvementBrief?.suggestedPrompt
            ? [`- Suggested prompt: ${result.improvementBrief.suggestedPrompt}`]
            : []),
        ].join("\n"),
      ),
      detailsBlock(
        "Budgets and observed usage",
        [renderBudgets(result.budgets), "", renderObservedUsage(result.observedUsage)].join("\n"),
      ),
      detailsBlock("Measurement plan", renderMeasurementPlan(result.measurementPlan)),
      detailsBlock("Use From Codex Chat", renderWorkflowGuide(result.workflowGuide)),
      detailsBlock("Checks", renderChecks(result.checks)),
      detailsBlock("Metrics", renderMetrics(result.metrics)),
      detailsBlock("Score details", [
        `- Starting score: ${result.summary.scoreBreakdown.startingScore}`,
        `- Total deductions: -${result.summary.scoreBreakdown.totalDeductions}`,
        `- Final score: ${result.summary.scoreBreakdown.finalScore}`,
        ...(result.summary.riskReasons?.length > 0
          ? result.summary.riskReasons.map((item) => `- Risk: ${item}`)
          : []),
        "",
        renderDeductions(result.summary),
        "",
        renderCategoryDeductions(result.summary),
      ].join("\n")),
    ].filter(Boolean)),
  ].join("\n");
}

function renderWorkflowGuidePayload(payload) {
  const guide = ensureWorkflowPayload(payload);

  return [
    `# Plugin Eval Start Here: ${guide.target.name}`,
    "",
    section("At a Glance", [
      `- Recommended path: ${guide.startHere.label}`,
      `- Benchmark config present: ${guide.workflowStatus.hasBenchmarkConfig ? "yes" : "no"}`,
      `- Usage log present: ${guide.workflowStatus.hasUsageLog ? "yes" : "no"}`,
      `- Quick local entrypoint: \`${guide.startHere.startCommand}\``,
      `- First local command: \`${guide.startHere.firstCommand}\``,
    ]),
    "",
    section("Why It Matters", [
      `- ${guide.beginnerSummary}`,
      `- ${guide.startHere.routingExplanation}`,
    ]),
    "",
    section("Fix First", ["- Start with the recommended path before branching into secondary workflows."]),
    "",
    section("Recommended Next Step", renderNextAction(guide.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Full local sequence",
        guide.startHere.commands.map((command) => `- ${command}`).join("\n"),
      ),
      detailsBlock(
        "Other chat requests",
        guide.entrypoints
          .map((entry) => `- ${entry.label}: "${entry.chatPrompt}" -> ${entry.firstCommand}`)
          .join("\n"),
      ),
    ]),
  ].join("\n");
}

function renderBudgetExplanation(payload) {
  const budgetPayload = ensureBudgetPayload(payload);
  const budgets = budgetPayload.budgets;
  const whyBullets = [
    `- Budget method: ${budgets.method}.`,
    `- Trigger and invoke tokens matter most because they are closest to always-loaded or frequently-loaded context.`,
    ...(budgets.invocation_policy?.explicit_only_skill_count > 0
      ? [
          `- Explicit-only skills are excluded from trigger and invoke budgets, but their standalone load ceiling is shown separately.`,
        ]
      : []),
    ...(budgetPayload.baselineEvidence
      ? [`- Baseline corpus: skills=${budgetPayload.baselineEvidence.skillSamples}, plugins=${budgetPayload.baselineEvidence.pluginSamples}.`]
      : []),
  ];
  const fixFirst = ["- Nothing to fix from this view alone; use the next step to validate or contextualize the estimate."];

  if (["heavy", "excessive"].includes(budgets.trigger_cost_tokens.band) || ["heavy", "excessive"].includes(budgets.invoke_cost_tokens.band)) {
    fixFirst.unshift("- The active budget is heavy enough that measured usage is worth collecting before tuning copy or structure.");
  }

  return [
    `# Budget Explanation: ${budgetPayload.target.name}`,
    "",
    section("At a Glance", [
      ...renderBudgets(budgets).split("\n"),
    ]),
    "",
    section("Why It Matters", whyBullets),
    "",
    section("Fix First", fixFirst),
    "",
    section("Recommended Next Step", renderNextAction(budgetPayload.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Trigger components",
        budgets.trigger_cost_tokens.components.map((component) => `- ${component.label}: ${component.tokens} tokens`).join("\n"),
      ),
      detailsBlock(
        "Invoke components",
        budgets.invoke_cost_tokens.components.map((component) => `- ${component.label}: ${component.tokens} tokens`).join("\n"),
      ),
      detailsBlock(
        "Deferred components",
        budgets.deferred_cost_tokens.components.length > 0
          ? budgets.deferred_cost_tokens.components.map((component) => `- ${component.label}: ${component.tokens} tokens`).join("\n")
          : "- None",
      ),
      budgets.explicit_only_invoke_cost_tokens
        ? detailsBlock(
            "Explicit-only skill components",
            budgets.explicit_only_invoke_cost_tokens.components.length > 0
              ? budgets.explicit_only_invoke_cost_tokens.components.map((component) => `- ${component.label}: ${component.tokens} tokens`).join("\n")
              : "- None",
          )
        : "",
      detailsBlock("Use From Codex Chat", renderWorkflowGuide(budgetPayload.workflowGuide)),
    ]),
  ].join("\n");
}

function renderMeasurementPlanPayload(payload) {
  const plan = ensureMeasurementPlanPayload(payload);
  const recommendedToolsets = plan.toolsets.filter((toolset) => plan.recommendedToolsets.includes(toolset.id));

  return [
    `# Measurement Plan: ${plan.target.name}`,
    "",
    section("At a Glance", [
      `- Recommended toolsets: ${plan.recommendedToolsets.length > 0 ? plan.recommendedToolsets.join(", ") : "none"}`,
      `- Toolset count: ${plan.toolsets.length}`,
      `- Summary: ${plan.summary}`,
    ]),
    "",
    section("Why It Matters", [
      `- ${plan.summary}`,
      ...recommendedToolsets.map((toolset) => `- ${toolset.label}: ${toolset.goal}`),
    ]),
    "",
    section(
      "Fix First",
      recommendedToolsets.length > 0
        ? recommendedToolsets.map((toolset) => `- ${toolset.label}: ${toolset.why}`)
        : ["- No high-priority toolsets were selected."],
    ),
    "",
    section("Recommended Next Step", renderNextAction(plan.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Recommended toolsets",
        plan.recommendedToolsets.length > 0
          ? plan.recommendedToolsets.map((item) => `- ${item}`).join("\n")
          : "- None",
      ),
      detailsBlock(
        "All toolsets",
        plan.toolsets
          .map(
            (toolset) =>
              `- ${toolset.label} [${toolset.priority}] ${toolset.goal} Signals: ${toolset.signals.join(", ")}. Evidence: ${toolset.evidenceSources.join(", ")}. Starter pack: ${toolset.starterPack.manifestName}.`,
          )
          .join("\n"),
      ),
      detailsBlock("Use From Codex Chat", renderWorkflowGuide(plan.workflowGuide)),
    ]),
  ].join("\n");
}

function renderBenchmarkTemplateInit(payload) {
  const benchmarkPayload = ensureBenchmarkTemplatePayload(payload);

  return [
    `# Benchmark Template Ready: ${benchmarkPayload.target.name}`,
    "",
    section("At a Glance", [
      `- Config: \`${benchmarkPayload.configPath}\``,
      `- Scenarios: ${benchmarkPayload.scenarioCount}`,
    ]),
    "",
    section("Why It Matters", benchmarkPayload.notes.map((item) => `- ${item}`)),
    "",
    section("Fix First", ["- Edit the benchmark config so the scenarios match your real workflow before you trust the run."]),
    "",
    section("Recommended Next Step", renderNextAction(benchmarkPayload.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Setup questions to ask first",
        benchmarkPayload.setupQuestions?.length > 0
          ? benchmarkPayload.setupQuestions.map((item) => `- ${item}`).join("\n")
          : "- No setup questions provided.",
      ),
      detailsBlock("Next steps", benchmarkPayload.nextSteps.map((item) => `- ${item}`).join("\n")),
      detailsBlock("Use From Codex Chat", renderWorkflowGuide(benchmarkPayload.workflowGuide)),
    ]),
  ].join("\n");
}

function renderBenchmarkScenario(scenario, mode) {
  const lines = [
    `- Purpose: ${scenario.purpose || "Not provided"}`,
    ...(scenario.successChecklist?.length > 0
      ? scenario.successChecklist.map((item) => `- Success checklist: ${item}`)
      : []),
  ];

  lines.push(`- Status: ${scenario.status}`);
  lines.push(`- Duration: ${scenario.durationMs} ms`);
  lines.push(`- Tool calls: ${scenario.telemetry?.toolCallCount || 0}`);
  lines.push(`- Shell commands: ${scenario.telemetry?.shellCommandCount || 0}`);
  lines.push(`- Failed shell commands: ${scenario.telemetry?.failedShellCommandCount || 0}`);
  lines.push(`- Usage availability: ${scenario.usageAvailability || "unavailable"}`);

  if (scenario.usage) {
    lines.push(`- Input tokens: ${scenario.usage.input_tokens || 0}`);
    lines.push(`- Output tokens: ${scenario.usage.output_tokens || 0}`);
    lines.push(`- Total tokens: ${scenario.usage.total_tokens || 0}`);
  }

  if (scenario.workspaceSummary) {
    lines.push(`- Added files: ${scenario.workspaceSummary.addedFileCount}`);
    lines.push(`- Modified files: ${scenario.workspaceSummary.modifiedFileCount}`);
    lines.push(`- Deleted files: ${scenario.workspaceSummary.deletedFileCount}`);
    lines.push(`- Generated tests: ${scenario.workspaceSummary.generatedTestFileCount}`);
  }

  if (scenario.finalMessagePreview) {
    lines.push("", "```text", scenario.finalMessagePreview, "```");
  }

  if (scenario.workspaceChanges?.length > 0) {
    lines.push("", ...scenario.workspaceChanges.map((entry) => `- ${entry.status}: ${entry.path}`));
  }

  if (scenario.verifierResults?.length > 0) {
    lines.push("", ...scenario.verifierResults.map((result) => `- Verifier [${result.status}]: ${result.command}`));
  }

  if (scenario.generatedCode?.metrics?.length > 0) {
    lines.push("", ...scenario.generatedCode.metrics.map((metric) => `- ${metric.id}: ${metric.value} ${metric.unit} (${metric.band})`));
  }

  if (scenario.generatedCode?.checks?.length > 0) {
    lines.push("", ...scenario.generatedCode.checks.map((check) => `- [${check.status}] ${check.message}`));
  }

  return detailsBlock(scenario.title, lines.join("\n"));
}

function renderBenchmarkRun(payload) {
  const benchmarkPayload = ensureBenchmarkRunPayload(payload);

  return [
    `# Benchmark Run: ${benchmarkPayload.target.name}`,
    "",
    section("At a Glance", [
      `- Mode: ${benchmarkPayload.mode}`,
      `- Codex version: ${benchmarkPayload.codexVersion}`,
      `- Scenarios: ${benchmarkPayload.config.scenarioCount}`,
      `- Model: ${benchmarkPayload.config.model}`,
      `- Workspace source: \`${benchmarkPayload.config.workspaceSourcePath}\``,
      `- Setup mode: ${benchmarkPayload.config.workspaceSetupMode}`,
      `- Preserve policy: ${benchmarkPayload.config.workspacePreserve}`,
      ...(benchmarkPayload.usageLogPath ? [`- Usage log: \`${benchmarkPayload.usageLogPath}\``] : []),
      `- Run directory: \`${benchmarkPayload.runDirectory}\``,
      `- Usage availability: ${benchmarkPayload.summary.usageAvailability}`,
      `- Average input tokens: ${benchmarkPayload.summary.averageInputTokens}`,
      `- Average output tokens: ${benchmarkPayload.summary.averageOutputTokens}`,
      `- Average total tokens: ${benchmarkPayload.summary.averageTotalTokens}`,
      `- Tool calls: ${benchmarkPayload.summary.toolCallCount}`,
      `- Shell commands: ${benchmarkPayload.summary.shellCommandCount}`,
      `- Failed shell commands: ${benchmarkPayload.summary.failedShellCommands}`,
      `- Generated files: ${benchmarkPayload.summary.generatedFileCount}`,
      `- Generated tests: ${benchmarkPayload.summary.generatedTestFileCount}`,
    ]),
    "",
    section("Why It Matters", [
      "- Benchmarking now runs real `codex exec` sessions in isolated workspaces instead of simulating the skill or plugin through a single API request.",
      `- Completed scenarios: ${benchmarkPayload.summary.completedScenarios}/${benchmarkPayload.summary.scenarioCount}`,
      `- Usage samples collected: ${benchmarkPayload.summary.sampleCount}`,
    ]),
    "",
    section(
      "Fix First",
      benchmarkPayload.summary.failedScenarios > 0
        ? ["- At least one scenario failed. Inspect the scenario logs and any preserved workspace before trusting the benchmark."]
        : benchmarkPayload.summary.usageAvailability === "unavailable"
          ? ["- No usage telemetry was emitted, so treat workspace outcomes and verifier results as the primary benchmark signal."]
          : ["- Re-run analysis with the usage log before you start optimizing the skill or plugin."],
    ),
    "",
    section("Recommended Next Step", renderNextAction(benchmarkPayload.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Scenarios",
        benchmarkPayload.scenarios
          .map((scenario) => renderBenchmarkScenario(scenario, benchmarkPayload.mode))
          .join("\n\n"),
      ),
      detailsBlock("Workflow follow-up", benchmarkPayload.nextSteps.map((item) => `- ${item}`).join("\n")),
      detailsBlock("Use From Codex Chat", renderWorkflowGuide(benchmarkPayload.workflowGuide)),
    ]),
  ].join("\n");
}

function renderComparison(payload) {
  const diff = ensureComparisonPayload(payload);
  const whyBullets = [
    `- Score delta: ${diff.scoreDelta >= 0 ? "+" : ""}${diff.scoreDelta}.`,
    `- Grade moved from ${diff.gradeBefore} to ${diff.gradeAfter}.`,
    `- Risk moved from ${diff.riskBefore} to ${diff.riskAfter}.`,
  ];

  if (diff.newFailures.length > 0) {
    whyBullets.push(`- ${diff.newFailures.length} new failure${diff.newFailures.length === 1 ? "" : "s"} were introduced.`);
  }
  if (diff.resolvedFailures.length > 0) {
    whyBullets.push(`- ${diff.resolvedFailures.length} failure${diff.resolvedFailures.length === 1 ? "" : "s"} were resolved.`);
  }

  return [
    `# Plugin Eval Comparison: ${diff.target.name}`,
    "",
    section("At a Glance", [
      `- Score delta: ${diff.scoreDelta >= 0 ? "+" : ""}${diff.scoreDelta}`,
      `- Grade: ${diff.gradeBefore} -> ${diff.gradeAfter}`,
      `- Risk: ${diff.riskBefore} -> ${diff.riskAfter}`,
      `- Budget delta (trigger/invoke/deferred): ${diff.budgetDelta.trigger_cost_tokens >= 0 ? "+" : ""}${diff.budgetDelta.trigger_cost_tokens} / ${diff.budgetDelta.invoke_cost_tokens >= 0 ? "+" : ""}${diff.budgetDelta.invoke_cost_tokens} / ${diff.budgetDelta.deferred_cost_tokens >= 0 ? "+" : ""}${diff.budgetDelta.deferred_cost_tokens}`,
    ]),
    "",
    section("Why It Matters", whyBullets),
    "",
    section(
      "Fix First",
      diff.newFailures.length > 0
        ? diff.newFailures.map((item) => `- New failure: ${item}`)
        : ["- No new failures were introduced."],
    ),
    "",
    section("Recommended Next Step", renderNextAction(diff.nextAction)),
    "",
    section("Details", [
      detailsBlock(
        "Resolved failures",
        diff.resolvedFailures.length > 0
          ? diff.resolvedFailures.map((item) => `- ${item}`).join("\n")
          : "- No resolved failures.",
      ),
      detailsBlock(
        "New failures",
        diff.newFailures.length > 0
          ? diff.newFailures.map((item) => `- ${item}`).join("\n")
          : "- No new failures.",
      ),
    ]),
  ].join("\n");
}

export function renderMarkdown(payload) {
  if (payload.kind === "comparison") {
    return renderComparison(payload);
  }
  if (payload.kind === "workflow-guide") {
    return renderWorkflowGuidePayload(payload);
  }
  if (payload.kind === "budget-explanation") {
    return renderBudgetExplanation(payload);
  }
  if (payload.kind === "measurement-plan") {
    return renderMeasurementPlanPayload(payload);
  }
  if (payload.kind === "benchmark-template-init") {
    return renderBenchmarkTemplateInit(payload);
  }
  if (payload.kind === "benchmark-run") {
    return renderBenchmarkRun(payload);
  }
  return renderEvaluation(payload);
}
````
