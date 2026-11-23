# Plugin files: plugin-skill-studio — `src/` (part 2 of 2)

Source: `plugins/plugin-skill-studio`. Files outside the `skills/*` folders, embedded as text.

## File: `src/eval/plugin-eval/renderers/html.js`

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

## File: `src/eval/plugin-eval/renderers/index.js`

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

## File: `src/eval/plugin-eval/renderers/markdown.js`

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

## File: `src/eval/static.mjs`

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {claudeManifestPath, inspectClaude} from './claude.mjs';

const MAX_FILES=5000, MAX_FILE=2*1024*1024, MAX_TOTAL=32*1024*1024;
const TEXT=/(?:\.(md|txt|json|ya?ml|m?js|cjs|ts|tsx|py|ps1|cmd|bat|sh|toml|xml|svg|dockerfile|containerfile)$|(?:^|[\\/])(?:Dockerfile|Containerfile)$)/i;
const IGNORED=new Set(['.git','node_modules','__pycache__','.plugin-eval','.studio-eval']);
const CODEX_MANIFESTS=['plugin.json','.codex-plugin/plugin.json'];
export const scoringVersion='pss-eval-2';
export function contained(root,file){const rel=path.relative(root,file);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
export function redact(text){return String(text).replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})\b/g,'[REDACTED]').replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,'Bearer [REDACTED]');}
export async function safeText(root,file,maxFileBytes=MAX_FILE){
  if(!contained(root,file))throw new Error('Path escapes target root');
  const parts=path.relative(root,file).split(path.sep).filter(Boolean); let current=root;
  for(const part of parts){current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink())throw new Error('Symbolic link or junction rejected');}
  const before=await fs.lstat(file);if(!before.isFile()||before.size>maxFileBytes)throw new Error('Expected bounded regular text file');
  const handle=await fs.open(file,'r');
  try{const opened=await handle.stat();if(opened.ino!==before.ino||opened.dev!==before.dev)throw new Error('File changed while opening');
    const text=await handle.readFile('utf8');const after=await fs.lstat(file);if(after.isSymbolicLink()||after.ino!==before.ino||after.dev!==before.dev||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw new Error('File changed while reading');return text;
  }finally{await handle.close();}
}
function add(findings,severity,code,message,file,line=1,evidence=''){findings.push({id:`F${findings.length+1}`,severity,code,message,file,line,evidence:redact(evidence).slice(0,300),remediation:remediation(code)});}
function remediation(code){
 if(code.startsWith('reference'))return 'Use a contained existing package-relative reference.';
 if(code.startsWith('frontmatter'))return 'Provide unambiguous YAML frontmatter with non-empty string name and description.';
 if(code.startsWith('risk'))return 'Remove the unsafe behavior or state and enforce its authorized boundary.';
 if(code.startsWith('path'))return 'Use real contained files; do not follow symbolic links or junctions.';
 if(code.startsWith('budget'))return 'Move supporting detail into locally referenced files and keep the entrypoint focused.';
 return 'Correct the evidenced issue and rerun evaluation.';
}
function scalar(value){
 value=value.trim();
 if(value.startsWith('"')){try{return JSON.parse(value);}catch{throw new Error('Malformed quoted scalar');}}
 if(value.startsWith("'")){if(!/^'(?:[^']|'')*'$/.test(value))throw new Error('Malformed quoted scalar');return value.slice(1,-1).replaceAll("''", "'");}
 if(/^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?)$/i.test(value))return null;
 if(/^[\[\]{}!&*]|\t|:\s/.test(value))throw new Error('Unsupported or ambiguous YAML scalar');
 return value.replace(/\s+#.*$/,'').trim();
}
export function frontmatter(text){
 text=text.replaceAll('\r\n','\n');const match=text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);if(!match)throw new Error('Missing or unclosed YAML frontmatter');
 const result={},lines=match[1].split('\n');const seen=new Set();
 for(let i=0;i<lines.length;i++){
   const line=lines[i];if(!line.trim()||/^\s*#/.test(line))continue;
   if(line.includes('\t'))throw new Error('YAML tabs are not supported');
   const m=line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
   if(!m){if(/^\s+/.test(line))continue;throw new Error(`Malformed YAML mapping at line ${i+2}`);}
   if(seen.has(m[1]))throw new Error(`Duplicate YAML key: ${m[1]}`);seen.add(m[1]);
   const value=m[2]??'';
   if(/^[!&*]/.test(value))throw new Error('YAML tags, anchors and aliases are not supported');
   if(m[1]==='name'||m[1]==='description'){
     if(/^[>|][-+]?\s*$/.test(value)){let block=[];while(i+1<lines.length&&/^\s+/.test(lines[i+1]))block.push(lines[++i].trim());result[m[1]]=block.join(value[0]==='>'?' ':'\n');}
     else result[m[1]]=scalar(value);
   }else if(value&&/^[\[{]/.test(value)){
     // Unknown nested metadata remains opaque, but malformed delimiters cannot pass.
     const open=value[0],close=open==='['?']':'}';if(!value.endsWith(close))throw new Error('Unclosed YAML flow collection');
   }
 }
 return {...result,body:text.slice(match[0].length),headerLines:match[0].split('\n').length-1};
}
async function walk(root,findings,limits){
 const files=[],directories=new Set();let bytes=0;
 async function visit(current){
   for(const entry of await fs.readdir(current,{withFileTypes:true})){
     if(IGNORED.has(entry.name))continue;const file=path.join(current,entry.name),rel=path.relative(root,file).split(path.sep).join('/');
     const stat=await fs.lstat(file);
     if(stat.isSymbolicLink()){add(findings,'error','path.link','Symbolic links and junctions are not evaluated.',rel);continue;}
     if(stat.isDirectory()){directories.add(rel);await visit(file);}
     else if(stat.isFile()){
       bytes+=stat.size;if(files.length>=limits.maxFiles||bytes>limits.maxTotalBytes)throw new Error('Target exceeds bounded evaluation limits');
       files.push({file,rel,bytes:stat.size});
       if(stat.size>limits.maxFileBytes&&TEXT.test(entry.name))add(findings,'error','file.limit',`Text member exceeds ${limits.maxFileBytes} byte evaluation limit.`,rel);
     }else add(findings,'error','path.special','Special files are not evaluated.',rel);
   }
 }
 await visit(root);return {files,directories};
}
function markdownProse(text){
 let fence=null;
 return text.replaceAll('\r\n','\n').split('\n').map(line=>{
   const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
   if(fence){if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;return ' '.repeat(line.length);}
   if(marker){fence={char:marker[1][0],length:marker[1].length};return ' '.repeat(line.length);}
   return line.replace(/(`+)(.*?)\1/g,m=>' '.repeat(m.length));
 }).join('\n');
}
function boundaryProse(body){
 let listContentIndent=null,indentedCode=false,blockStart=true,quoteDepth=0;
 return markdownProse(body).split('\n').map(line=>{
   let content=line,depth=0;
   while(/^ {0,3}>/.test(content)){content=content.replace(/^ {0,3}>[ \t]?/,'');depth++;}
   if(depth!==quoteDepth){listContentIndent=null;indentedCode=false;blockStart=true;quoteDepth=depth;}
   const expanded=content.replace(/^[ \t]+/,space=>{
     let column=0;for(const char of space)column+=char==='\t'?4-column%4:1;
     return ' '.repeat(column);
   });
   if(!expanded.trim()){blockStart=true;return line;}
   const indent=expanded.match(/^ */)[0].length;
   const marker=expanded.match(/^( *)(?:[-+*]|\d+[.)])( +)/);
   if(marker&&(indent<4||(listContentIndent!==null&&indent<listContentIndent+4))){
     listContentIndent=marker[0].length;indentedCode=false;blockStart=false;return line;
   }
   const codeIndent=listContentIndent===null?4:listContentIndent+4;
   if(indent>=codeIndent&&(indentedCode||blockStart)){
     indentedCode=true;return ' '.repeat(line.length);
   }
   indentedCode=false;
   if(indent===0)listContentIndent=null;
   blockStart=/^ {0,3}(?:#{1,6}(?:\s|$)|(?:=+|-+)\s*$)/.test(expanded);
   return line;
 }).join('\n');
}
function hasExplicitBoundary(body){
 if(/\b(do not|never|not for|out.of.scope|only|reject|refuse)\b/i.test(body))return true;
 // Danish instructions need Unicode word edges; bare "ikke" or "kun" is not a boundary.
 const prose=boundaryProse(body).normalize('NFC');
 return /(?<![\p{L}\p{N}_])(?:(?:må|skal|brug|benyt|udfør)\s+(?:ikke|kun)|(?:bed|spørg|del|gem|send|opret|udfør|vis)\s+aldrig|(?:kun|udelukkende|ikke)\s+til|afvis\s+(?:anmodninger|forespørgsler|opgaver))(?![\p{L}\p{N}_])/iu.test(prose);
}
async function inspectSkill(root,file,findings,records,limits){
 const rel=path.relative(root,file).split(path.sep).join('/');let text;
 try{text=await safeText(root,file,limits.maxFileBytes);}catch(err){add(findings,'error','path.read',err.message,rel);return;}
 let meta;
 try{meta=frontmatter(text);}catch(err){add(findings,'error','frontmatter.invalid',err.message,rel);return;}
 if(typeof meta.name!=='string'||!meta.name.trim()||!/^[-a-z0-9]+$/.test(meta.name)||meta.name.length>64)add(findings,'error','frontmatter.name','Skill name must be a non-empty portable string of at most 64 characters.',rel,2,String(meta.name));
 if(typeof meta.description!=='string'||!meta.description.trim())add(findings,'error','frontmatter.description','Skill description must be a non-empty string.',rel,3,String(meta.description));
 else if(meta.description.length>1024)add(findings,'warning','budget.description','Description is longer than 1024 characters.',rel,3,meta.description);
 const lines=text.replaceAll('\r\n','\n').split('\n');
 if(lines.length>500)add(findings,'warning','budget.entrypoint','Entrypoint exceeds 500 lines; use progressive disclosure.',rel);
 if(!/^#\s+\S/m.test(meta.body))add(findings,'warning','structure.title','No clear Markdown title was found.',rel);
 if(!/\b(use when|when|if|for)\b/i.test(meta.description??''))add(findings,'warning','discovery.trigger','Description does not make a triggering condition explicit.',rel,3,meta.description);
 if(!hasExplicitBoundary(meta.body))add(findings,'info','behavior.boundary','No explicit scope or refusal boundary was found.',rel);
 const proseLines=markdownProse('\n'.repeat(meta.headerLines)+meta.body).split('\n');
 for(let i=0;i<proseLines.length;i++){
   const line=proseLines[i];
   for(const m of line.matchAll(/\]\(([^)]+)\)/g)){
     let link=m[1].replace(/^<|>$/g,'').split('#')[0];if(!link||/^(https?:|mailto:)/i.test(link))continue;
     if(/^(?:plugin|app|codex):\/\//i.test(link)){add(findings,'info','reference.host','Host capability reference; availability is not established by local file analysis.',rel,i+1,link);continue;}
     try{link=decodeURIComponent(link);}catch{add(findings,'error','reference.invalid','Invalid encoded reference.',rel,i+1,m[1]);continue;}
     const target=path.resolve(path.dirname(file),link);
     if(path.isAbsolute(link)||/^[A-Za-z]:|^[a-z]+:/i.test(link)||!contained(root,target)){add(findings,'error','reference.escape','Reference escapes the evaluated package.',rel,i+1,m[1]);continue;}
     try{await safeText(root,target,limits.maxFileBytes);}catch(err){add(findings,'error',err.code==='ENOENT'?'reference.missing':'reference.unsafe',`Reference cannot be read safely: ${err.message}`,rel,i+1,m[1]);}
   }
 }
 records.push({name:meta.name??null,file:rel,description:meta.description??null,lineCount:lines.length,estimatedTokens:Math.ceil(text.length/4)});
}
function riskLines(file,text,findings){
 const rules=[
 ['risk.instruction-override',/ignore (?:all |any )?(?:previous|system|developer) instructions|hide (?:this|these|it) from (?:the )?user/i],
 ['risk.execution',/(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b[^\n]*(?:\|\s*(?:sh|bash|iex|Invoke-Expression)\b)/i],
 ['risk.credential',/\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/],
 ];
 for(const [i,line]of text.replaceAll('\r\n','\n').split('\n').entries())for(const[code,regex]of rules){
   if(regex.test(line)&&!(code!=='risk.credential'&&/\b(do not|never|reject|detect|flag|must not)\b/i.test(line))){
     // Preserve evidence from examples; do not equate literal fixture data or
     // scanner definitions with an active instruction. This is not an allowlist
     // for test directories: executable commands and Markdown remain blocking.
     const script=/\.[cm]?[jt]s$/i.test(file);
     const fixture=script&&/(?:^|\/)(?:tests?|fixtures?)\/|\.(?:test|spec)\.[cm]?[jt]s$/i.test(file)
       && /(?:\b(?:const|let|var)\s+\w+\s*=\s*['"`]|\b(?:fixture|writeFile|writeFileSync|res\.end)\s*\(|^\s*(?:const|let|var)\s+\w+\s*=\s*await\s+skill\s*\(\s*['"`])/u.test(line);
     const ruleLiteral=script&&/(?:\[\s*['"]risk\.[\w.-]+['"]\s*,\s*\/|\brule\(\s*['"][A-Z_]+['"]\s*,\s*['"][a-z]+['"]\s*,\s*\/)/u.test(line);
     const context=ruleLiteral?'rule-definition':fixture?'test-fixture':'active-or-unclassified';
     add(findings,fixture||ruleLiteral?'warning':'error',code,'Review this concrete instruction or credential pattern; context is not proof of runtime safety or malicious intent.',file,i+1,line);
     findings.at(-1).context=context;
   }
 }
}
async function declaredCapability(root,manifest,findings,limits){
 const ext=manifest.extensions?.['com.openai']??{};
 let found=false;
 for(const [kind,value]of [['apps',manifest.apps??ext.apps],['mcpServers',manifest.mcpServers??manifest.mcp??ext.mcpServers],['hooks',manifest.hooks]]){
   if(!value)continue;
   if(typeof value==='object'){found ||= Object.keys(value).length>0;continue;}
   if(typeof value!=='string')continue;
   const target=path.resolve(root,value);
   if(path.isAbsolute(value)||!contained(root,target)){add(findings,'error','reference.escape','Capability manifest escapes the package.',value);continue;}
   try{
     const data=JSON.parse(await safeText(root,target,limits.maxFileBytes));
     const entries=kind==='apps'?data.apps:kind==='mcpServers'?data.mcpServers:data.hooks??data;
     found ||= Boolean(entries&&typeof entries==='object'&&Object.keys(entries).length);
   }catch(error){add(findings,'error','reference.missing','Capability manifest cannot be read: '+error.message,value);}
 }
 return found;
}
export function evaluationLimits(value={}){
 const defaults={maxFiles:MAX_FILES,maxFileBytes:MAX_FILE,maxTotalBytes:MAX_TOTAL};
 const caps={maxFiles:25000,maxFileBytes:32*1024*1024,maxTotalBytes:256*1024*1024};
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid evaluation limits');
 for(const [key,n]of Object.entries(value))if(!Object.hasOwn(defaults,key)||!Number.isSafeInteger(n)||n<1||n>caps[key])throw new Error('Invalid evaluation limit: '+key);
 const result={...defaults,...value};
 if(result.maxFileBytes>result.maxTotalBytes)throw new Error('File limit exceeds total limit');
 return result;
}
export async function analyze(target,options={}){
 const limits=evaluationLimits(options.limits);
 let root=path.resolve(target),specific=null;const supplied=await fs.lstat(root);
 if(supplied.isSymbolicLink())throw new Error('Target symlink or junction rejected');
 if(supplied.isFile()){if(path.basename(root).toLowerCase()!=='skill.md')throw new Error('Supply a plugin root, skill root or SKILL.md');specific=root;root=path.dirname(root);}
 if(!supplied.isDirectory()&&!specific)throw new Error('Target must be a real directory');
 // A skill installed as an immediate child of a real plugin may reference its
 // own package's shared policy/resources. It may never cross that package root.
 let contextRoot=root;
 if(path.basename(path.dirname(root))==='skills'){
   const parent=path.dirname(path.dirname(root));
   for(const rel of [...CODEX_MANIFESTS,claudeManifestPath]){
     try{const candidate=path.join(parent,rel);await safeText(parent,candidate,limits.maxFileBytes);contextRoot=parent;break;}
     catch(error){if(error.code!=='ENOENT')throw error;}
   }
 }
 const findings=[],skills=[],{files,directories}=await walk(root,findings,limits);
 let manifest=null,codexManifestPath=null,claude=null,hasClaudeManifest=false;
 const contentHashes=[],entrypoints=new Set();
 const readText=relative=>safeText(root,path.join(root,relative),limits.maxFileBytes);
 for(const candidate of CODEX_MANIFESTS)try{
   const value=JSON.parse(await readText(candidate));
   if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected a plugin manifest object');
   if(!manifest){manifest=value;codexManifestPath=candidate;}
   else if(value.name!==manifest.name||value.version!==manifest.version)add(findings,'error','manifest.identity','Portable and compatibility identities differ.',candidate);
 }catch(err){if(err.code!=='ENOENT')add(findings,'error','manifest.invalid',err.message,candidate);}
 try{
   const value=JSON.parse(await readText(claudeManifestPath));
   hasClaudeManifest=true;
   if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected a Claude manifest object');
   const name=typeof value.name==='string'&&value.name&&!/[\s@:/\\\p{C}]/u.test(value.name)?value.name:null;
   const version=typeof value.version==='string'&&value.version.trim()?value.version:null;
   if(!name||value.version!==undefined&&!version){
     add(findings,'error','manifest.required','Claude requires a portable name and accepts an optional non-empty version.',claudeManifestPath);
   }
   const issue=(code,message,file=claudeManifestPath)=>add(findings,'error',code,message,file);
   const components=await inspectClaude(value,{files,directories,readText,issue});
   if(!Object.values(components).some(component=>component.length)){
     issue('manifest.capability','No discoverable Claude skills, commands, agents, hooks or MCP declarations.');
   }
   for(const file of components.skills)entrypoints.add(path.join(root,file));
   claude={manifest:claudeManifestPath,name,version,coverage:components.unverified.length?'PARTIAL':'CHECKED',components};
 }catch(err){
   if(err.code!=='ENOENT'){
     hasClaudeManifest=true;
     add(findings,'error','manifest.invalid',redact(err.message),claudeManifestPath);
   }
 }
 const kind=manifest||hasClaudeManifest?'plugin':'skill';
 if(kind==='skill')entrypoints.add(specific??path.join(root,'SKILL.md'));
 if(manifest){
   const defaultSkills=files.filter(f=>/^skills\/[^/]+\/SKILL\.md$/i.test(f.rel));
   if(!manifest.name||!manifest.version)add(findings,'error','manifest.required','Manifest name and version are required.',codexManifestPath);
   const declared=await declaredCapability(root,manifest,findings,limits);
   if(!defaultSkills.length&&!declared)add(findings,'error','manifest.capability','No discoverable skills, App, MCP or hook capability.',codexManifestPath);
   for(const file of defaultSkills)entrypoints.add(file.file);
 }
 for(const file of entrypoints)await inspectSkill(contextRoot,file,findings,skills,limits);
 for(const f of files)if(TEXT.test(f.rel)&&f.bytes<=limits.maxFileBytes){try{const text=await safeText(root,f.file,limits.maxFileBytes);contentHashes.push([f.rel,crypto.createHash('sha256').update(text).digest('hex')]);riskLines(f.rel,text,findings);}catch(err){add(findings,'error','path.read',err.message,f.rel);}}
 const metrics=[];
 if(options.metricPack){
   const pack=typeof options.metricPack==='string'?JSON.parse(await fs.readFile(options.metricPack,'utf8')):options.metricPack;
   if(pack.version!==1||!Array.isArray(pack.metrics)||pack.metrics.length>100)throw new Error('Metric pack requires version 1 and at most 100 data-only metrics');
   for(const item of pack.metrics){
     if(typeof item.id!=='string'||typeof item.pattern!=='string'||item.pattern.length>500||typeof item.file!=='string'||typeof item.expected!=='boolean')throw new Error('Invalid metric definition');
     const file=path.resolve(root,item.file);if(path.isAbsolute(item.file)||!contained(root,file))throw new Error('Metric file escapes target root');
     const regex=new RegExp(item.pattern,item.flags??'');const text=await safeText(root,file,limits.maxFileBytes);if(text.length>200000)throw new Error('Metric text exceeds bounded regex input');
     const passed=regex.test(text)===item.expected;metrics.push({id:item.id,status:passed?'PASS':'FAIL',file:item.file});
     if(!passed)add(findings,'error','metric.failed',`Metric failed: ${item.id}`,item.file);
   }
 }
 const errors=findings.filter(f=>f.severity==='error'),warnings=findings.filter(f=>f.severity==='warning');
 const score=Math.max(0,100-errors.length*14-warnings.length*6);
 const staticTokens=skills.reduce((sum,s)=>sum+s.estimatedTokens,0);
 const targetManifest=codexManifestPath??(hasClaudeManifest?claudeManifestPath:null);
 const report={schemaVersion:1,scoringVersion,limits,kind,mode:'static',target:{root,packageRoot:contextRoot,name:manifest?.name??claude?.name??skills[0]?.name??path.basename(root),version:manifest?manifest.version??null:claude?.version??null,manifest:targetManifest},
   ...(claude?{claude}:{}),
   ...(errors.length===0&&claude?.coverage==='PARTIAL'?{status:'INCOMPLETE'}:{}),
   valid:errors.length===0,readiness:errors.length?'BLOCKED':claude?.coverage==='PARTIAL'?'INCOMPLETE':'STATIC_READY',score,scoreMeaning:'Static readiness only. This score does not establish task success, safety certification, installation or publication.',
   counts:{errors:errors.length,warnings:warnings.length,info:findings.filter(f=>f.severity==='info').length},findings,skills,metrics,
   budget:{estimatedTokens:staticTokens,method:'characters/4',scope:'SKILL.md entrypoints',descriptionTokens:Math.ceil(skills.reduce((n,s)=>n+(s.description?.length??0),0)/4)},
   observedUsage:{status:'UNKNOWN',reason:'No actual Codex usage events supplied.'},behavior:{status:'UNKNOWN',reason:'No practical benchmark has been executed.'},
   fingerprint:crypto.createHash('sha256').update(JSON.stringify({members:files.map(f=>[f.rel,f.bytes]),content:contentHashes})).digest('hex'),
   improvementBrief:{fixFirst:errors.slice(0,10),then:warnings.slice(0,10),nextAction:errors.length?'Correct blocking findings and repeat static evaluation.':'Prepare representative cases and run an explicit isolated benchmark.'},
   dimensions:[['identity',errors.some(f=>f.code.startsWith('manifest')||f.code.startsWith('frontmatter'))],['references',errors.some(f=>f.code.startsWith('reference'))],['risk',errors.some(f=>f.code.startsWith('risk')||f.code.startsWith('path'))]].map(([name,fail])=>({name,status:fail?'FAIL':'PASS'}))};
 return report;
}
```

## File: `src/registry.mjs`

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function loadRegistry(root=packageRoot) {
  const registry=JSON.parse(await fs.readFile(path.join(root,'references/integration-registry.json'),'utf8'));
  for (const c of registry.capabilities) {
    const full=path.resolve(root,c.entrypoint);
    if (!full.startsWith(path.resolve(root)+path.sep)) throw new Error('Registry entry escapes package');
    if (!(await fs.stat(full)).isFile()) throw new Error('Missing capability: '+c.id);
  }
  return registry;
}

// [capability, mode|null, pattern]; the first match wins, so specific workflows precede broad ones.
const rules=[
 ['studio-git','safety',/force push|hard reset|history re-?writ|destructive|clean up git history|routine safe git/i],
 ['studio-git','conflicts',/merge conflicts?|rebase conflicts?|conflict markers|fix this merge|rebase pauses|routine rebasing without conflicts|creating new branches/i],
 ['studio-git','finish',/integration of a finished branch|merge\/pr\/keep\/discard|work needs to be integrated/i],
 ['studio-git','worktree',/isolation from current workspace|isolated workspace|git worktree/i],
 ['studio-debug','triage',/triage|incoming issues|external bug reports|out-of-scope requests|contributor tickets|tickets already produced by to-tickets/i],
 ['studio-debug','loop',/tight feedback loop|runtime exceptions|flaky ci|debug this|routine test-driven feature development/i],
 ['studio-debug','diagnose',/root causes? (through reproduction|of)|lacks a demonstrated cause/i],
 ['studio-execute','durable',/durable state file|interruption-prone|risks compaction|resume after interruption/i],
 ['studio-execute','spec-run',/full specification across task tickets|unified pr|build the whole spec|single isolated bug fixes|exploratory coding without tickets/i],
 ['studio-execute','parallel',/one subagent per independent problem|proceed concurrently|without shared state/i],
 ['studio-execute','subagent',/one subagent per task|per-task review gates|executing plans with independent tasks/i],
 ['studio-execute','execute',/inline, task by task|stopping only on blockers|subagent dispatch is unavailable|separate session/i],
 ['studio-execute','implement',/build scoped code changes|ready to implement|build or code a planned feature|initial architecture exploration|explicitly say "implement"/i],
 ['studio-plan','goal',/\/goal|goal prompt|unattended execution|overnight autonomous|autonomous goal contract|agentic mission/i],
 ['studio-plan','map',/decision tickets|multi-session|map out this massive|small, well-scoped features/i],
 ['studio-plan','questions',/questionnaire|stakeholder|what should i ask them|answer the questions themselves/i],
 ['studio-plan','tickets',/tracer-bullet|break this into tickets|tracker issues|initial requirements gathering/i],
 ['studio-plan','spec',/technical spec|write a spec|fuzzy and ungrilled/i],
 ['studio-plan','interview',/grill|interview the user|poke holes|domain modeling with doc generation|documentation trail is needed|immediate implementation/i],
 ['studio-plan','discover',/explores user intent|starting a new feature|whose requirements or design|trivial single-file changes/i],
 ['studio-plan','plan',/implementation plans?\b|needs planning/i],
 ['studio-review','verify',/about to claim|verification commands|success claims|bounded static-page capture|audits finished work|completion claim|double-check that|unsupported claims/i],
 ['studio-review','receive',/review feedback|pushes back|feedback is unclear|receiving code review/i],
 ['studio-review','request',/dispatch(es)? a bounded reviewer|read-only review before merge|request(ing)? (a )?code review/i],
 ['studio-review','decide',/review decision|require human attention|minimal, targeted or deep/i],
 ['studio-review','code',/review changed code|reviewing a branch|code review|review this (diff|branch|pr|change)|authoring new code or diagnosing/i],
 ['studio-build','lifecycle',/from scratch|full lifecycle|general software coding|pre-existing skills/i],
 ['studio-build','autopilot',/agentic repo|autopilot|repo.{0,15}(to|into).{0,20}plugin/i],
 ['studio-quality','risk',/risik|risk|malici|hemmelig|secret|sikkerhedsscan/i],
 ['studio-build','import',/\bgpt\b|gpts/i],
 ['studio-build','import',/(import|konvert|adapt).{0,25}(mappe|folder|skill|plugin)/i],
 ['studio-build','catalog',/find.{0,25}(skill|plugin)|discover|katalog|catalog|radar/i],
 ['studio-build','portfolio',/portfolio|worklist|directory of plugins/i],
 ['studio-build','install',/\binstall\b|inventory, preview/i],
 ['studio-build','update',/update an owned|git-managed plugin/i],
 ['studio-build','create-skill',/create or update a codex skill|scoped instructions/i],
 ['studio-build','create-plugin',/plugin candidate built|new local or marketplace plugin/i],
 ['studio-quality','doctor',/doctor|skillquiver|double-fire|conflicting skills|duplicate, shadow/i],
 ['studio-quality','improve',/improv|forbedr|rewrite brief|auto-?research|keep\/discard|pass count|research agents/i],
 ['studio-quality','metric-pack',/metric.?pack|verifiers and metrics|own evaluation criteria|rubric/i],
 ['studio-quality','walkthrough',/walkthrough|explaining what a skill does|forklar.{0,25}skill/i],
 ['studio-quality','review',/behavior-focused|technical review|review this skill/i],
 ['studio-quality','evidence',/evidensmatrix|evidence matrix|supplied evidence|freshwithin|kompetencebevis/i],
 ['studio-quality','eval',/skill.{0,35}(eval|vurder|test|analy[sz])|(?:eval|vurder|test|analy[sz]).{0,35}skill|plugin.{0,35}(eval|vurder|analy[sz])|(?:eval|vurder|analy[sz]).{0,35}plugin|evaluat|audit th|why did this .{0,10}score|fix first|token usage|assessing a plugin|benchmark/i],
 ['studio-build','release',/publicer|publish|release|submission|indsend|pakning|\bzip\b/i],
 ['local-management',null,/permission|tilladelse|installed|installeret|afhængighed|dependenc/i],
 ['modern-web',null,/html|css|\bdom\b|accessibility|tilgængelig|web\s*ui/i],
 ['studio-plan','plan',/\bplan\b|planlæg|specifikation/i],
 ['studio-debug','diagnose',/fejlsøg|debug|diagnos|failing|fejler/i],
 ['test-driven-development',null,/\btdd\b|test.driven|testdrevet/i],
 ['studio-build','create-skill',/(opret|create|byg|build|lav).{0,25}skill/i],
 ['studio-build','create-plugin',/(opret|create|byg|build|lav).{0,25}plugin/i],
 ['studio-build','update',/(opdat|update|extend|udvid).{0,25}plugin/i],
 ['automate-ui',null,/desktop|skærmfangst|museklik|screenshot|mouse.click/i],
];
export async function route(request,root=packageRoot) {
  if (typeof request!=='string'||!request.trim()) throw new Error('A nonempty request is required');
  const registry=await loadRegistry(root);
  const exact=registry.capabilities.find(x=>x.id===request.trim());
  const rule=exact?null:rules.find(([,,pattern])=>pattern.test(request));
  const selected=exact?.id ?? rule?.[0] ?? 'studio-build';
  const mode=rule?.[1]??null;
  const capability=registry.capabilities.find(x=>x.id===selected);
  if (!capability) throw new Error('Router target missing: '+selected);
  return {schemaVersion:1,request,selected:capability.id,entrypoint:capability.entrypoint,
          mode,reason:exact?'Exact local capability name':'Local intent routing',externalDependencies:[]};
}

export async function selfCheck(root=packageRoot) {
  const registry=await loadRegistry(root);
  const portable=JSON.parse(await fs.readFile(path.join(root,'plugin.json'),'utf8'));
  const compat=JSON.parse(await fs.readFile(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
  const errors=[];
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(pkg.version!==portable.version||registry.package!==portable.name||registry.version!==portable.version)errors.push('Package/integration registry version mismatch');
  if (portable.name!=='plugin-skill-studio'||compat.name!==portable.name||compat.version!==portable.version) errors.push('Manifest identity mismatch');
  if (JSON.stringify(portable.extensions['com.openai'].interface)!==JSON.stringify(compat.interface)) errors.push('Manifest interface mismatch');
  for (const source of registry.sources) {
    if (!source.files||!Object.keys(source.files).length) errors.push('Missing source provenance: '+source.id);
    for (const item of source.skills) {
      try { await fs.access(path.join(root,item.implementation)); }
      catch { errors.push('Unmapped source skill: '+source.id+'/'+item.sourceSkill); }
    }
  }
  for (const c of registry.capabilities) {
    const content=(await fs.readFile(path.join(root,c.entrypoint),'utf8')).replaceAll('\r\n','\n');
    if (!content.startsWith('---')||!content.includes('name: '+c.id+'\n')) errors.push('Skill identity mismatch: '+c.id);
    const links=[...content.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
    for (let link of links) {
      link=link.split('#')[0];
      if (!link||/^(https?:|mailto:|plugin:|skill:)/i.test(link)) continue;
      try { await fs.access(path.resolve(path.dirname(path.join(root,c.entrypoint)),link)); }
      catch { errors.push('Broken local reference: '+c.id+' -> '+link); }
    }
  }
  return {ok:errors.length===0,package:portable.name,version:portable.version,sources:registry.sources.length,
          capabilities:registry.capabilities.length,errors,installation:'not performed',publication:'not performed'};
}
```

## File: `src/services/README.md`

### Local service interfaces

These dependency-free ES modules implement Studio-owned services. They do not call plugin connectors, load external skills or execute target packages. Public imports are from `index.mjs`.

#### Evidence matrix

`evidenceMatrix({asOf, freshWithinDays, skills, evidence})` is synchronous. `asOf` and dated evidence use valid `YYYY-MM-DD` calendar dates; `freshWithinDays` is a nonnegative integer. `skills` is a string array. Each evidence record has `skill`, optional text `fact`/`source`, and optional date. Duplicate skill names group once with a warning. Unknown-skill evidence is counted in a warning. Undated/future records remain visible in facts/counts but cannot establish current recency.

Rows return `missing evidence`, `older evidence` or `recent evidence`. The freshness boundary is inclusive and measured in UTC calendar days. No competence or agent-quality score is inferred. Invalid dates fail instead of inventing recency.

#### Risk review

`await scanRisk(targetPath, options)` scans regular UTF-8 text without importing, executing, installing or uploading target content. Options: `severity` (`low|medium|high|critical`, default medium), `maxFiles` (default 10000), `maxFileBytes` (default 2 MiB), and `suppressions`. Suppressions accept an array or a local JSON file containing the array or `{suppressions:[...]}`. Each exact suppression requires `{fingerprint, ruleId, ruleVersion, reason}`. Wildcard/extra fields and empty reasons are rejected. Changed rule versions invalidate suppression matches.

Results contain redacted `findings` with rule/version, relative path, line/column, SHA-256 fingerprint and remediation. `complete:false` and `exitCode:2` mean some files could not be scanned reliably; `1` means unsuppressed findings meet the selected severity; `0` means no active deterministic match at that threshold. Binary/unsupported extensions are counted as skipped and reported separately. A clean scan is not a safety certification. `renderRisk(report, format)` supports `json`, `markdown`, and `sarif` (2.1.0).

#### Inventory

`await inventory(localPath, options)` returns `{records, errors, complete}`. It reads portable/compatibility manifests as data, groups both manifests for a root, lists public skill directories, records declared components and listing field presence, and observes compatibility manifest synchronization. Paths containing `cache`, `candidates` or an explicit archive segment are classified accordingly; other paths remain `unknown`. Merely finding a manifest never proves installation, host enablement, global account permissions, OAuth connection or publisher verification. Those fields remain `UNKNOWN`.

#### Installed and published versions

The `inventory-versions` command compares one host and account receipt with verified Git manifest observations and optionally related provider catalog IDs. See the [version audit contract](_plugin-references.md#file-referencesinventory-versionsmd) for capture and exit codes.

#### Exact installed-cache resolution

`await resolveInstalledPlugin({pluginId, cacheRoot, snapshot, skill?})` is read-only.
`snapshot` has `kind:'codex-cli-installed'`, `capturedAt` (`YYYY-MM-DDTHH:mm:ss[.sss]Z`,
no fractional seconds or exactly three digits), observed
`exitCode:0` and `data` containing the complete raw CLI `installed` array. Identity
is exact `name@namespace`; `cacheRoot` is an observed absolute physical local path;
`skill`, when supplied, is a relative forward-slash path under the manifest's
declared skills directory ending in `SKILL.md`. No version override is accepted.

Only one installed/enabled exact record is eligible. Its version and matching
current manifest determine the cache path; no glob, highest-version, source-path
or other-provider fallback occurs. A missing/unsafe/stale/incomplete observation or
path returns `UNAVAILABLE`. Successful `RESOLVED` means `PATH_RESOLUTION_ONLY`;
`skillEnabled:'UNKNOWN'`, `currentEntitlementVerified:false` and
`executionAuthorized:false` remain explicit. CLI unavailable results exit with 2.

The fixed 60-second timestamp check is a caller observation, not freshness attestation
or current account authorization. The optional `{now}` JavaScript test clock is not
a CLI request override. The resolver never executes an input command, invokes a
host lookup, installs, restores cache content or changes settings. On ENOENT the
calling host performs a new real read-only lookup, then retries once. See the
[cache recovery contract](_plugin-references.md#file-referencesinstalled-cache-resolutionmd) for limits.

#### Catalogs

`await catalogSnapshot(input, options)` accepts:

- a local package root or manifest path;
- a local JSON snapshot file (except a package's `plugin.json`), containing entries or `{entries, observedAt}`;
- an entries array or `{entries, observedAt}` object;
- one explicit HTTPS public URL returning JSON entries or visible HTML links.

Options: `asOf` observation timestamp (default current UTC); `maxEntries` (default 1000, maximum 10000); `maxBytes` (default 2 MiB, maximum 20 MiB); `timeoutMs` (default 10000, maximum 60000); `retries` (default 1, maximum 3). Retrieval pins a reviewed public DNS answer, bounds DNS/network time and streamed response size, and rejects embedded URL credentials, private/reserved addresses and redirects. Page links are returned as unverified candidates and never followed. `allowLocalhost:true` permits explicit loopback HTTP only for fixtures or deliberately selected local services. No endpoint named inside source files is automatically contacted.

`searchCatalog(snapshot, textQuery)` uses all case-insensitive query words across local name/display name/description/keywords. Popularity or page order is never converted into quality or rank. A supplied rank is retained only with a query and source attribution; otherwise it is null/`UNKNOWN`.

`compareCatalogs(before, after)` compares stable URL/name identities and substantive metadata, returning `added`, `removed`, and `changed` with observation/source metadata. Reversed observation order and ambiguous duplicate identities fail. Earlier history remains `UNKNOWN`; absence from a snapshot alone does not prove public directory removal.

These are local interfaces and calculations. Retrieval uses Node's standard networking APIs directly. No server/MCP route, telemetry, credential store or account administration is introduced.

## File: `src/services/catalog.mjs`

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import { readBounded, walkFiles, inside } from './files.mjs';

function timestamp(value) {
  const result = value ?? new Date().toISOString();
  const parsed = Date.parse(result);
  if (!Number.isFinite(parsed)) throw new Error('asOf must be an ISO observation date/time');
  return new Date(parsed).toISOString();
}
function uiOf(manifest) { return manifest.extensions?.['com.openai']?.interface ?? manifest.interface ?? {}; }
function listingOf(manifest) {
  const ui = uiOf(manifest);
  const fields = ['displayName', 'shortDescription', 'longDescription', 'developerName', 'websiteURL', 'privacyPolicyURL', 'termsOfServiceURL', 'logo', 'composerIcon'];
  return { inspected: fields, present: fields.filter(key => typeof ui[key] === 'string' && ui[key].trim()),
    missing: fields.filter(key => !(typeof ui[key] === 'string' && ui[key].trim())), verifiedPublisher: 'UNKNOWN',
    note: 'Presence is not proof of public URL reachability, directory approval or verified publisher identity.' };
}
function classify(root) {
  const parts = root.toLowerCase().split(/[\\/]/);
  if (parts.includes('cache')) return 'cache';
  if (parts.includes('candidates')) return 'candidate';
  if (parts.includes('archive') || parts.includes('cache-archive')) return 'archive';
  return 'unknown';
}
export async function inventory(target, options = {}) {
  const scan = await walkFiles(target, options), records = [], seen = new Set();
  // A manifest is data. No scripts, app routes or package manager hooks are loaded.
  const candidates = scan.files.filter(f => path.basename(f.absolute) === 'plugin.json' && (path.basename(path.dirname(f.absolute)) === '.codex-plugin' || path.dirname(f.absolute) === scan.root || !f.relative.includes('/skills/')));
  candidates.sort((a, b) => a.absolute.includes(`${path.sep}.codex-plugin${path.sep}`) - b.absolute.includes(`${path.sep}.codex-plugin${path.sep}`));
  for (const file of candidates) {
    const root = path.basename(path.dirname(file.absolute)) === '.codex-plugin' ? path.dirname(path.dirname(file.absolute)) : path.dirname(file.absolute);
    if (seen.has(root)) continue;
    try {
      const manifest = JSON.parse(await readBounded(file.absolute, options.maxFileBytes ?? 2 * 1024 * 1024));
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || typeof manifest.name !== 'string') throw new Error('Manifest needs a package name');
      seen.add(root);
      const ui = uiOf(manifest);
      const compatiblePath = path.join(root, '.codex-plugin', 'plugin.json');
      const compat = scan.files.find(f => f.absolute === compatiblePath);
      let compatibilitySynchronized = null;
      if (compat && compat.absolute !== file.absolute) {
        const other = JSON.parse(await readBounded(compat.absolute));
        compatibilitySynchronized = manifest.name === other.name && manifest.version === other.version && JSON.stringify(ui) === JSON.stringify(uiOf(other));
      }
      const ext = manifest.extensions?.['com.openai'] ?? {};
      const relevant = scan.files.filter(f => inside(root, f.absolute));
      records.push({ name: manifest.name, version: manifest.version ?? null, displayName: ui.displayName ?? manifest.name,
        description: manifest.description ?? ui.longDescription ?? '', keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
        root, manifestPath: file.absolute, classification: classify(root), installed: 'UNKNOWN', source: { kind: 'local-manifest', path: file.absolute },
        skills: relevant.filter(f => path.basename(f.absolute) === 'SKILL.md' && path.dirname(path.dirname(f.absolute)) === path.join(root, 'skills')).map(f => path.basename(path.dirname(f.absolute))).sort(),
        declaredPermissions: { skills: Boolean(manifest.skills), apps: Boolean(manifest.apps ?? ext.apps), mcp: Boolean(manifest.mcpServers ?? ext.mcpServers),
          hooks: Boolean(manifest.hooks ?? ext.hooks), capabilities: Array.isArray(ui.capabilities) ? ui.capabilities : [] },
        observed: { manifestPresent: true, compatibilityManifestPresent: Boolean(compat), compatibilitySynchronized,
          globalAccountPermissions: 'UNKNOWN', hostEnabled: 'UNKNOWN', oauthConnected: 'UNKNOWN' }, listing: listingOf(manifest) });
    } catch (error) { scan.errors.push({ path: file.relative, message: error.message }); }
  }
  return { kind: 'local-package-inventory', schemaVersion: 1, target: path.resolve(target), records, errors: scan.errors,
    complete: scan.errors.length === 0, limitation: 'Local files establish declarations and presence only; installation, account permissions and service access are separate evidence.' };
}

function isPublic(address) {
  if (net.isIP(address) === 4) {
    const p = address.split('.').map(Number);
    return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && (p[1] === 168 || (p[1] === 0 && (p[2] === 0 || p[2] === 2)) || (p[1] === 88 && p[2] === 99))) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      (p[0] === 198 && (p[1] === 18 || p[1] === 19 || (p[1] === 51 && p[2] === 100))) || (p[0] === 203 && p[1] === 0 && p[2] === 113));
  }
  if (net.isIP(address) === 6) {
    const a = address.toLowerCase();
    // Global unicast only; exclude documentation space and every IPv4 mapping/translation form.
    return /^[23][0-9a-f]{0,3}:/.test(a) && !a.startsWith('2001:db8:');
  }
  return false;
}
const localhost = address => address === '127.0.0.1' || address === '::1';
async function download(urlString, options) {
  const url = new URL(urlString);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (url.username || url.password) throw new Error('URL credentials are not accepted');
  if (url.protocol !== 'https:' && !(options.allowLocalhost === true && url.protocol === 'http:')) throw new Error('Public retrieval requires HTTPS');
  const timeoutMs = options.timeoutMs ?? 10000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('timeoutMs must be 1..60000');
  let dnsTimer;
  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await Promise.race([
    dns.lookup(hostname, { all: true }), new Promise((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('DNS lookup timeout')), timeoutMs); }),
  ]).finally(() => clearTimeout(dnsTimer));
  if (!addresses.length || addresses.some(a => !isPublic(a.address) && !(options.allowLocalhost === true && localhost(a.address)))) throw new Error('Only public network addresses are accepted');
  const selected = addresses[0], maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 20 * 1024 * 1024) throw new Error('maxBytes must be 1..20971520');
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, { agent: false, headers: { 'User-Agent': 'Plugin-Skill-Studio/0.3.0', Accept: 'application/json,text/html,text/plain' },
      lookup(_host, opts, callback) {
        // Pin the reviewed DNS answer for this connection, preventing a second lookup.
        if (opts?.all) callback(null, [selected]); else callback(null, selected.address, selected.family);
      } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400) { response.resume(); reject(new Error(`Redirect ${response.statusCode} is not followed; request the destination explicitly`)); return; }
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`HTTP ${response.statusCode}`)); return; }
      const chunks = []; let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > maxBytes) { reject(new Error('Response size limit exceeded')); response.destroy(); request.destroy(); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ text: new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)), contentType: response.headers['content-type'] ?? '', bytes: length }); }
        catch (error) { reject(new Error(`Response is not valid UTF-8: ${error.message}`)); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('Retrieval timeout')), timeoutMs);
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
  });
}
function textOnly(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function normalizeEntries(entries, source, maximum = 1000) {
  if (!Array.isArray(entries)) throw new Error('Snapshot entries must be an array');
  if (entries.length > maximum) throw new Error('Snapshot entry limit exceeded');
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`Entry ${index} requires a name`);
    return { ...entry, name: entry.name, description: typeof entry.description === 'string' ? entry.description : '',
      version: typeof entry.version === 'string' ? entry.version : null, source: entry.source ?? source,
      // A numeric rank is retained only when its query and observed source are recorded.
      rank: Number.isSafeInteger(entry.rank) && entry.rank > 0 && typeof entry.query === 'string' && entry.query && entry.source ? entry.rank : null,
      rankStatus: Number.isSafeInteger(entry.rank) && entry.rank > 0 && entry.query && entry.source ? 'supplied observation' : 'UNKNOWN' };
  });
}
function fromHTML(text, source, maximum) {
  const entries = [], seen = new Set();
  const clean = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const match of clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = textOnly(match[2]);
    if (!name || match[1].startsWith('#')) continue;
    let link;
    try { link = new URL(match[1], source.url); if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password) continue; } catch { continue; }
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    entries.push({ name, description: '', url: link.href, source: { ...source, pageTitle: textOnly(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') },
      extraction: 'visible link candidate; not a verified plugin listing' });
    if (entries.length >= maximum) break;
  }
  return entries;
}

export async function catalogSnapshot(input, options = {}) {
  const observedAt = timestamp(options.asOf);
  let entries, source, errors = [], warnings = [];
  const maximum = options.maxEntries ?? 1000;
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 10000) throw new Error('maxEntries must be 1..10000');
  if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
    const retries = options.retries ?? 1;
    if (!Number.isSafeInteger(retries) || retries < 0 || retries > 3) throw new Error('retries must be 0..3');
    let downloaded;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try { downloaded = await download(input, options); break; }
      catch (error) { if (attempt === retries || /Redirect|public|HTTPS|credentials|limit/.test(error.message)) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(1000, 100 * (2 ** attempt)))); }
    }
    source = { kind: 'direct-public-retrieval', url: input, observedAt, bytes: downloaded.bytes };
    if (/json/i.test(downloaded.contentType) || /^[\s]*[\[{]/.test(downloaded.text)) {
      const value = JSON.parse(downloaded.text);
      entries = Array.isArray(value) ? value : value.entries;
    } else {
      entries = fromHTML(downloaded.text, source, maximum);
      warnings.push('HTML links are candidates only; page order does not establish directory search rank. No links were followed.');
    }
  } else if (typeof input === 'string') {
    const resolved = path.resolve(input), stat = await fs.lstat(resolved);
    if (stat.isSymbolicLink()) throw new Error('Linked snapshot sources are not accepted');
    if (stat.isFile() && path.extname(resolved).toLowerCase() === '.json' && path.basename(resolved) !== 'plugin.json') {
      const value = JSON.parse(await readBounded(resolved, options.maxBytes ?? 2 * 1024 * 1024));
      entries = Array.isArray(value) ? value : value.entries;
      source = { kind: 'imported-snapshot', path: resolved, originalObservation: value.observedAt ?? null };
    } else {
      const local = await inventory(resolved, options);
      entries = local.records;
      source = { kind: 'local-package-inventory', path: resolved };
      errors = local.errors;
    }
  } else if (input && typeof input === 'object') {
    entries = Array.isArray(input) ? input : input.entries;
    source = { kind: 'supplied-snapshot', originalObservation: input.observedAt ?? null };
  } else throw new Error('Provide a local package path, snapshot object or explicit public URL');
  return { kind: 'studio-catalog-snapshot', schemaVersion: 1, observedAt, source,
    entries: normalizeEntries(entries, source, maximum), complete: errors.length === 0, errors, warnings,
    limitations: ['Only observations in this snapshot are represented.', 'Search rank and historical visibility are UNKNOWN unless explicitly supplied with provenance.',
      'Popularity, stars and installation counts do not establish quality or safety.'] };
}
export function searchCatalog(snapshot, query) {
  if (!snapshot || !Array.isArray(snapshot.entries) || typeof query !== 'string') throw new Error('Search requires a snapshot and text query');
  const words = query.toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  return snapshot.entries.filter(entry => {
    const haystack = [entry.name, entry.displayName, entry.description, ...(Array.isArray(entry.keywords) ? entry.keywords : [])].filter(Boolean).join(' ').toLocaleLowerCase('en');
    return words.every(word => haystack.includes(word));
  });
}
function identity(entry) { return entry.url ?? entry.name; }
function substantive(entry) {
  const { source, observedAt, root, manifestPath, ...values } = entry;
  return JSON.stringify(Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b))));
}
export function compareCatalogs(before, after) {
  if (!before || !after || !Array.isArray(before.entries) || !Array.isArray(after.entries)) throw new Error('Comparison requires two snapshots');
  if (Date.parse(before.observedAt) > Date.parse(after.observedAt)) throw new Error('Before snapshot must not be newer than after snapshot');
  const old = new Map(before.entries.map(e => [identity(e), e])), next = new Map(after.entries.map(e => [identity(e), e]));
  if (old.size !== before.entries.length || next.size !== after.entries.length) throw new Error('Snapshot has ambiguous duplicate entry identities');
  return { kind: 'catalog-comparison', schemaVersion: 1, before: { observedAt: before.observedAt, source: before.source }, after: { observedAt: after.observedAt, source: after.source },
    added: [...next].filter(([key]) => !old.has(key)).map(([, e]) => e), removed: [...old].filter(([key]) => !next.has(key)).map(([, e]) => e),
    changed: [...next].filter(([key, entry]) => old.has(key) && substantive(old.get(key)) !== substantive(entry)).map(([key, entry]) => ({ identity: key, before: old.get(key), after: entry })),
    historyBeforeFirstSnapshot: 'UNKNOWN', limitation: 'Absence from a snapshot is not proof of removal from a directory; compare source coverage before interpreting changes.' };
}
```

## File: `src/services/evidence.mjs`

```javascript
function dateValue(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be an ISO calendar date`);
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error(`${label} is not a valid date`);
  return time;
}

export function evidenceMatrix(input) {
  if (!input || typeof input !== 'object') throw new Error('Evidence input must be an object');
  const asOf = dateValue(input.asOf, 'asOf date');
  if (!Number.isSafeInteger(input.freshWithinDays) || input.freshWithinDays < 0) throw new Error('freshWithinDays must be a nonnegative integer');
  if (!Array.isArray(input.skills) || !Array.isArray(input.evidence)) throw new Error('skills and evidence must be arrays');
  if (!input.skills.every(x => typeof x === 'string' && x.trim())) throw new Error('skills must contain nonempty strings');
  const warnings = [], skills = [...new Set(input.skills)];
  if (skills.length !== input.skills.length) warnings.push('Duplicate skill names were grouped once.');
  const records = input.evidence.map((record, index) => {
    if (!record || typeof record.skill !== 'string' || !record.skill.trim()) throw new Error(`evidence[${index}].skill is required`);
    for (const key of ['source', 'fact']) if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error(`evidence[${index}].${key} must be text`);
    return { ...record, time: record.date == null || record.date === '' ? null : dateValue(record.date, `evidence[${index}] date`) };
  });
  const unlisted = records.filter(r => !skills.includes(r.skill));
  if (unlisted.length) warnings.push(`${unlisted.length} evidence records use unlisted skills.`);
  const rows = skills.map(skill => {
    const all = records.filter(r => r.skill === skill);
    const dated = all.filter(r => r.time !== null && r.time <= asOf);
    const future = all.filter(r => r.time !== null && r.time > asOf);
    const undated = all.filter(r => r.time === null);
    if (future.length) warnings.push(`${skill}: ${future.length} future evidence records excluded from current recency.`);
    if (undated.length) warnings.push(`${skill}: ${undated.length} undated records cannot establish recency.`);
    const latest = dated.length ? Math.max(...dated.map(r => r.time)) : null;
    const days = latest === null ? null : (asOf - latest) / 86400000;
    return { skill, evidenceCount: all.length, datedEvidenceCount: dated.length, futureEvidenceCount: future.length,
      latestEvidenceDate: latest === null ? null : new Date(latest).toISOString().slice(0, 10), daysSinceLatest: days,
      status: days === null ? 'missing evidence' : days <= input.freshWithinDays ? 'recent evidence' : 'older evidence',
      facts: all.map(r => r.fact).filter(Boolean).join('; '), sources: [...new Set(all.map(r => r.source).filter(Boolean))].join('; ') };
  });
  return { kind: 'skills-evidence-matrix', schemaVersion: 1, asOf: input.asOf, freshWithinDays: input.freshWithinDays,
    summary: `${rows.filter(r => r.status === 'recent evidence').length} of ${rows.length} skills have evidence within your chosen window.`,
    rows, warnings, limitations: ['Recency is a planning rule, not a competence rating, skill-quality score, or hiring decision.',
      'Only supplied facts are organized; no external verification, lookup, storage or sending is performed.'] };
}
```

## File: `src/services/files.mjs`

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';

export const ignored = new Set(['.git', '.hg', '.svn', 'node_modules', '.venv', '__pycache__']);
export function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export async function walkFiles(input, options = {}) {
  const supplied = path.resolve(input);
  const errors = [], files = [];
  const maximum = options.maxFiles ?? 10000;
  const ignoreNames = options.ignoreNames ?? ignored;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('maxFiles must be positive');
  let start;
  try { start = await fs.lstat(supplied); }
  catch (error) { return { root: supplied, files: [], errors: [{ path: '.', message: `Target unavailable: ${error.code ?? error.message}` }] }; }
  const root = start.isDirectory() ? supplied : path.dirname(supplied);
  const realRoot = await fs.realpath(root);
  let stopped = false;
  async function visit(file) {
    if (stopped) return;
    let stat, real;
    try {
      stat = await fs.lstat(file);
      real = await fs.realpath(file);
      if (stat.isSymbolicLink() || !inside(realRoot, real)) throw new Error('symbolic link or reparse escape is not accepted');
      if (stat.isDirectory()) {
        const members = await fs.readdir(file, { withFileTypes: true });
        for (const member of members.sort((a,b) => a.name.localeCompare(b.name))) {
          if (member.isDirectory() && ignoreNames.has(member.name)) continue;
          await visit(path.join(file, member.name));
        }
      } else if (stat.isFile()) {
        if (files.length >= maximum) { stopped = true; throw new Error('file count limit reached'); }
        files.push({ absolute: file, relative: path.relative(root, file).split(path.sep).join('/'), stat });
      } else throw new Error('special files are not accepted');
    } catch (error) { errors.push({ path: path.relative(root, file).split(path.sep).join('/'), message: error.message }); }
  }
  await visit(supplied);
  return { root, files, errors };
}

export async function readBounded(file, maxBytes = 2 * 1024 * 1024) {
  return new TextDecoder('utf-8', { fatal: true }).decode(await readBoundedBuffer(file, maxBytes));
}

export async function readBoundedBuffer(file, maxBytes = 2 * 1024 * 1024) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('not a regular file');
  if (before.size > maxBytes) throw new Error('file size limit exceeded');
  const handle = await fs.open(file, 'r');
  try {
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('file changed while opening');
    const currentPath = await fs.lstat(file);
    if (currentPath.isSymbolicLink() || currentPath.dev !== before.dev || currentPath.ino !== before.ino) throw new Error('file path changed while opening');
    const buffer = Buffer.alloc(Math.min(maxBytes + 1, opened.size + 1));
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!chunk.bytesRead) break;
      bytesRead += chunk.bytesRead;
    }
    const after = await handle.stat();
    const afterPath = await fs.lstat(file);
    if (bytesRead > maxBytes || after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
        afterPath.dev !== before.dev || afterPath.ino !== before.ino || afterPath.isSymbolicLink()) throw new Error('file changed while reading');
    return buffer.subarray(0, bytesRead);
  } finally { await handle.close(); }
}
```

## File: `src/services/index.mjs`

```javascript
export { evidenceMatrix } from './evidence.mjs';
export { scanRisk, renderRisk } from './risk.mjs';
export { catalogSnapshot, searchCatalog, compareCatalogs, inventory } from './catalog.mjs';
export { resolveInstalledPlugin } from './installed-resolver.mjs';
```

## File: `src/services/installed-inventory.mjs`

```javascript
// Pure data reconciliation: never runs a host command, changes settings or loads a target.
const ID=/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/i;
function text(value,label){if(typeof value!=='string'||!value.trim()||value.length>256)throw Error('Invalid '+label);return value;}
function records(snapshot){
 const {kind,data}=snapshot;
 if(kind==='cli'||kind==='scoped-cli'||kind==='historical'){
  const list=data?.installed??data?.plugins;
  if(!Array.isArray(list))throw Error('Expected an installed plugin list');
  return list.filter(p=>p.installed!==false).map(p=>({id:p.pluginId,version:p.version,enabled:p.enabled}));
 }
 if(kind==='catalog'){
  if(!Array.isArray(data?.marketplaces))throw Error('Expected a native catalog snapshot');
  return data.marketplaces.flatMap(m=>m.plugins??[]).filter(p=>p.installed===true).map(p=>({id:p.id,version:p.localVersion??null,enabled:p.enabled}));
 }
 throw Error('Unknown inventory kind');
}
function normalize(snapshot){
 text(snapshot.label,'snapshot label');
 const scoped=snapshot.kind==='scoped-cli';
 if(scoped&&(!snapshot.namespace||typeof snapshot.namespace!=='string'||!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(snapshot.namespace)))throw Error('Invalid scoped CLI namespace');
 return records(snapshot).map(r=>{
  if(scoped&&!(typeof r.id==='string'&&r.id.endsWith('@'+snapshot.namespace)))throw Error('Record outside scoped CLI namespace');
  if(typeof r.id!=='string'||!ID.test(r.id))throw Error('Expected an exact name@marketplace plugin identity');
  if(r.version!=null)text(r.version,'installed version');
  if(r.enabled!=null&&typeof r.enabled!=='boolean')throw Error('Invalid enabled state');
  return {id:r.id,version:r.version??null,enabled:r.enabled??null};
 });
}
export function reconcileInstalledInventories(input){
 if(!Array.isArray(input?.current)||!input.current.length||input.current.length>100)throw Error('Provide 1–100 current inventory snapshots');
 const current=new Map(),sources=[],incomplete=[];
 let hasCli=false,hasCatalog=false;
 for(const snapshot of input.current){
  if(!['cli','scoped-cli','catalog'].includes(snapshot.kind))throw Error('Current snapshots must be cli, scoped-cli or catalog');
  hasCli ||= snapshot.kind==='cli';hasCatalog ||= snapshot.kind==='catalog';
  const rows=normalize(snapshot);if(rows.length>20000)throw Error('Inventory member limit exceeded');
  if(snapshot.data.marketplaceLoadErrors?.length)incomplete.push('Catalog load errors: '+snapshot.label);
  const unique=new Set();
  for(const row of rows){
   unique.add(row.id);if(!current.has(row.id))current.set(row.id,{id:row.id,observations:[]});
   current.get(row.id).observations.push({source:snapshot.label,kind:snapshot.kind,...row});
  }
  sources.push({label:snapshot.label,kind:snapshot.kind,installedIdentities:unique.size,
    ...(snapshot.kind==='scoped-cli'?{namespace:snapshot.namespace}:{})});
 }
 if(!hasCli)incomplete.push('Full CLI installed list missing; catalog slices alone are incomplete');
 if(!hasCatalog)incomplete.push('Native remote installed catalog missing; CLI alone can omit personal remote packages');
 const plugins=[...current.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>{
  const versions=[...new Set(p.observations.map(o=>o.version).filter(v=>v!==null))];
  const enabled=[...new Set(p.observations.map(o=>o.enabled).filter(v=>v!==null))];
  const status=versions.length>1||enabled.length>1?'CONFLICT':versions.length===0?'VERSION_UNKNOWN':'CONSISTENT';
  if(status!=='CONSISTENT')incomplete.push(status+': '+p.id);
  return {...p,versions,status};
 });
 const historical=input.historical??[];
 if(!Array.isArray(historical)||historical.length>100)throw Error('Invalid historical inventories');
 const absentStatus=!hasCli&&input.current.some(snapshot=>snapshot.kind==='scoped-cli')?'HISTORICAL_ID_UNVERIFIED':'HISTORICAL_ID_ABSENT';
 const comparisons=historical.map(snapshot=>{
  if(snapshot.kind!=='historical')throw Error('History must be explicitly identified');
  const rows=normalize(snapshot),unique=new Map(rows.map(r=>[r.id,r]));
  const deltas=[...unique.values()].map(r=>({id:r.id,previousVersion:r.version,status:!current.has(r.id)?absentStatus:current.get(r.id).observations.some(o=>o.version===r.version)?'PRESENT':'PRESENT_VERSION_CHANGED'}));
  return {label:snapshot.label,previousInstalledIdentities:unique.size,deltas};
 });
 const appIds=input.apps?.apps?.map(a=>text(a.id,'App identity'))??null;
 return {schemaVersion:1,status:incomplete.length?'INCOMPLETE':'RECONCILED',complete:incomplete.length===0,
  installedPluginIdentities:plugins.length,identityMeaning:'Exact name@marketplace records; aliases are not automatically merged into one product.',
  apps:appIds?{installedAppIdentities:new Set(appIds).size,separateFromPluginCount:true}:null,
  sources,plugins,incomplete,historicalComparison:{status:comparisons.length?'COMPARED':'NOT_PROVIDED',snapshots:comparisons},
  safety:{targetExecuted:false,settingsChanged:false,networkRequests:0},
  limitation:'An absent historical identity does not prove lost functionality or authorize reinstalling a replacement. Record explicit source/account and adaptation evidence; do not infer aliases from display names.'};
}
```

## File: `src/services/installed-release.mjs`

```javascript
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readBounded, readBoundedBuffer, walkFiles } from './files.mjs';
import { cacheComponent, containedPath, directoryRoot } from './installed-resolver.mjs';

const runGit = promisify(execFile);
const gitEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/i.test(name)));
gitEnvironment.GIT_NO_REPLACE_OBJECTS = '1';
gitEnvironment.GIT_NO_LAZY_FETCH = '1';
gitEnvironment.GIT_TERMINAL_PROMPT = '0';
const revisionPattern = /^[0-9a-f]{40}$/;
const identityPattern = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/;
const digestPattern = /^[0-9a-f]{64}$/;
const cacheWalkOptions = { ignoreNames: new Set(), maxFiles: 20000 };
const maxPackageBytes = 512 * 1024 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

async function git(root, ...args) {
  const { stdout } = await runGit('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: gitEnvironment,
  });
  return stdout;
}

function publicationAttested(source, entry, published, marketplaceRevision) {
  if (entry.sourceKind !== 'reviewed-upstream-tree') return published?.revision === marketplaceRevision;
  return source?.source === 'git-subdir' && source.url === entry.repository && source.path === entry.sourceSubdir &&
    (source.sha === undefined || source.sha === entry.commit) && revisionPattern.test(entry.commit ?? '') &&
    published?.url === entry.repository && published?.revision === entry.commit &&
    published?.path === entry.sourceSubdir + '/.codex-plugin/plugin.json';
}

function hasValidWindowsHashes(entry) {
  if (entry.windowsCheckoutSha256 === undefined) return true;
  return entry.sourceKind === 'reviewed-upstream-tree' && object(entry.windowsCheckoutSha256) &&
    Object.entries(entry.windowsCheckoutSha256).every(([name, digest]) => Object.hasOwn(entry.files, name) &&
      typeof digest === 'string' && digestPattern.test(digest) && digest !== entry.files[name]);
}

async function verifyPackage(cacheRoot, name, namespace, version, locked, windowsHashes) {
  let root;
  try {
    root = await containedPath(cacheRoot, [namespace, name, version], 'directory');
  } catch (error) {
    return error.code === 'ENOENT'
      ? { status: 'DIFFERENT', code: 'CACHE_MISSING' }
      : { status: 'INCOMPLETE', code: 'CACHE_PATH_UNSAFE' };
  }
  const { files, errors } = await walkFiles(root, cacheWalkOptions);
  if (errors.length) return { status: 'INCOMPLETE', code: 'CACHE_SCAN_FAILED', errors };
  const actual = new Set(files.map(file => file.relative));
  const missing = Object.keys(locked).filter(file => !actual.has(file));
  const extra = files.filter(file => !Object.hasOwn(locked, file.relative)).map(file => file.relative);
  const different = [];
  let matchedFiles = 0;
  let windowsCheckoutMatches = 0;
  let bytesRead = 0;
  for (const file of files) {
    if (!Object.hasOwn(locked, file.relative)) continue;
    try {
      const path = await containedPath(root, file.relative.split('/'), 'file');
      const limit = Math.min(32 * 1024 * 1024, maxPackageBytes - bytesRead);
      const contents = await readBoundedBuffer(path, limit);
      bytesRead += contents.length;
      const hash = createHash('sha256').update(contents).digest('hex');
      if (hash === locked[file.relative]) {
        matchedFiles++;
      } else if (process.platform === 'win32' && Object.hasOwn(windowsHashes, file.relative) &&
                 hash === windowsHashes[file.relative]) {
        windowsCheckoutMatches++;
        matchedFiles++;
      } else {
        different.push(file.relative);
      }
    } catch (error) {
      return { status: 'INCOMPLETE', code: 'FILE_READ_FAILED', file: file.relative, reason: error.code ?? error.message };
    }
  }
  const status = missing.length || extra.length || different.length ? 'DIFFERENT' : 'MATCHED';
  if (status === 'MATCHED') {
    const after = await walkFiles(root, cacheWalkOptions);
    const attributes = new Map(files.map(({ relative, stat }) => [relative, stat]));
    if (after.errors.length || after.files.length !== files.length || after.files.some(({ relative, stat }) => {
      const before = attributes.get(relative);
      return !before || stat.dev !== before.dev || stat.ino !== before.ino ||
        stat.size !== before.size || stat.mtimeMs !== before.mtimeMs;
    })) return { status: 'INCOMPLETE', code: 'CACHE_CHANGED_DURING_CHECK' };
  }
  return { status, matchedFiles, expectedFiles: Object.keys(locked).length, missing, extra, different,
    ...(Object.keys(windowsHashes).length ? { windowsCheckoutMatches } : {}) };
}

export async function verifyInstalledRelease(audit, request) {
  const { checkout, cacheRoot, revision, ids } = request ?? {};
  if (typeof revision !== 'string' || !revisionPattern.test(revision) || !Array.isArray(ids) || ids.length < 1 || ids.length > 50 ||
      new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !identityPattern.test(id))) {
    throw new Error('Supply a full lowercase Git SHA and 1–50 distinct exact plug-in IDs.');
  }
  const context = {
    expectedRevision: revision,
    scope: { host: audit.scope.host, account: audit.scope.account, observedAt: audit.scope.observedAt },
  };
  const incomplete = (code) => ({ ...context, status: 'INCOMPLETE', exitCode: 2, code, results: [] });
  if (!audit.scope.workspaceFingerprint || !audit.installationCoverage.cli) return incomplete('CLI_SCOPE_UNATTESTED');
  let root, cache, release, registry, managedReceipt = 'ABSENT';
  try {
    root = await directoryRoot(checkout);
    cache = await directoryRoot(cacheRoot);
    const top = (await git(root, 'rev-parse', '--show-toplevel')).trim();
    if (await directoryRoot(top) !== root) return incomplete('CHECKOUT_ROOT_MISMATCH');
    const head = (await git(root, 'rev-parse', 'HEAD')).trim();
    if (head !== revision) {
      return { ...context, observedRevision: head, status: 'DIFFERENT', exitCode: 1, code: 'REVISION_MISMATCH', results: [] };
    }
    const [releaseBlob, registryBlob] = await Promise.all([
      git(root, 'cat-file', 'blob', `${revision}:plugin-sources.lock.json`),
      git(root, 'cat-file', 'blob', `${revision}:.agents/plugins/marketplace.json`),
    ]);
    release = JSON.parse(releaseBlob);
    registry = JSON.parse(registryBlob);
    if (!object(release.plugins) || !cacheComponent(registry.name) || !Array.isArray(registry.plugins)) {
      return incomplete('RELEASE_LEDGER_INVALID');
    }
  } catch {
    return incomplete('RELEASE_OR_CACHE_UNAVAILABLE');
  }
  try {
    const file = await containedPath(root, ['.codex-marketplace-install.json'], 'file');
    const receipt = JSON.parse(await readBounded(file, 128 * 1024));
    if (!object(receipt) || typeof receipt.revision !== 'string' || !revisionPattern.test(receipt.revision)) {
      return incomplete('MANAGED_RECEIPT_INVALID');
    }
    if (receipt.revision !== revision) {
      return { ...context, observedRevision: revision, receiptRevision: receipt.revision,
        status: 'DIFFERENT', exitCode: 1, code: 'MANAGED_RECEIPT_MISMATCH', results: [] };
    }
    managedReceipt = 'MATCHED';
  } catch (error) {
    if (error.code !== 'ENOENT') return incomplete('MANAGED_RECEIPT_UNAVAILABLE');
  }
  const results = [];
  for (const id of ids) {
    const [name, namespace] = id.split('@');
    const observed = audit.plugins.find(row => row.id === id);
    const entry = release.plugins[name];
    const listing = registry.plugins.find(row => row.name === name);
    if (namespace !== registry.name || !cacheComponent(name) || !listing ||
        !cacheComponent(entry?.version) || !object(entry?.files) || !Object.keys(entry.files).length ||
        Object.values(entry.files).some(digest => typeof digest !== 'string' || !digestPattern.test(digest)) ||
        !hasValidWindowsHashes(entry) || !publicationAttested(listing.source, entry, observed?.published?.source, revision) ||
        observed?.published?.version !== entry.version) {
      results.push({ id, status: 'INCOMPLETE', code: 'RELEASE_NOT_ATTESTED' });
      continue;
    }
    const packageEvidence = { id, version: entry.version, observedVersion: observed.installedVersion, enabled: observed.enabled };
    if (observed.installation === 'UNKNOWN' || observed.installation === 'UNCERTAIN' ||
        observed.installation === 'INSTALLED' && typeof observed.enabled !== 'boolean') {
      results.push({ ...packageEvidence, status: 'INCOMPLETE', code: 'INSTALLATION_UNATTESTED' });
    } else if (observed.installation !== 'INSTALLED' || observed.installedVersion !== entry.version || !observed.enabled) {
      results.push({ ...packageEvidence, status: 'DIFFERENT', code: 'INSTALLATION_DIFFERS' });
    } else {
      results.push({ ...packageEvidence, ...await verifyPackage(cache, name, namespace, entry.version, entry.files, entry.windowsCheckoutSha256 ?? {}) });
    }
  }
  if ((await git(root, 'rev-parse', 'HEAD').catch(() => '')).trim() !== revision) return incomplete('CHECKOUT_CHANGED');
  const exitCode = results.some(row => row.status === 'INCOMPLETE') ? 2 : results.some(row => row.status === 'DIFFERENT') ? 1 : 0;
  return { ...context, observedRevision: revision, managedReceipt,
    status: ['MATCHED', 'DIFFERENT', 'INCOMPLETE'][exitCode], exitCode, results };
}
```

## File: `src/services/installed-resolver.mjs`

```javascript
// Read-only current-cache resolution. Never starts a CLI, target, installer or network client.
import fs from 'node:fs/promises';
import path from 'node:path';
import {inside,readBounded} from './files.mjs';
import {frontmatter} from '../eval/static.mjs';

const ID=/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/;
const COMPONENT=/^[A-Za-z0-9_.+-]{1,128}$/;
const MAX_AGE_MS=60000;
const safety={targetExecuted:false,commandsExecuted:0,settingsChanged:false,networkRequests:0};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function component(value){
 return typeof value==='string'&&COMPONENT.test(value)&&!['.','..'].includes(value)&&!value.endsWith('.')&&
        !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
}
function relative(value){
 if(typeof value!=='string'||!value||value.includes('\\')||value.includes(':')||value.startsWith('/'))throw Error('unsafe path');
 const parts=value.split('/');if(!parts.every(component))throw Error('unsafe path');return parts;
}
async function directoryRoot(supplied){
 if(typeof supplied!=='string'||!path.isAbsolute(supplied)||/^[\\/]{2}/.test(supplied)||/[\x00-\x1f]/.test(supplied))throw Error('unsafe cache root');
 const resolved=path.resolve(supplied),parsed=path.parse(resolved);
 let current=parsed.root;
 // Check parents before following them, so a junction/UNC alias is not a local-cache shortcut.
 for(const part of path.relative(parsed.root,resolved).split(path.sep).filter(Boolean)){
  current=path.join(current,part);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('unsafe cache root');
 }
 const real=await fs.realpath(resolved);if(/^[\\/]{2}/.test(real))throw Error('unsafe cache root');
 return real;
}
async function containedPath(root,parts,kind){
 let current=root;
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||(i<parts.length-1?!stat.isDirectory():kind==='file'?!stat.isFile():!stat.isDirectory()))throw Error('unsafe cache path');
  const real=await fs.realpath(current);if(!inside(root,real))throw Error('cache path escapes root');
 }
 return fs.realpath(current);
}

export { directoryRoot, containedPath, component as cacheComponent };

export async function resolveInstalledPlugin(request,{now=Date.now()}={}){
 const common={schemaVersion:1,scope:'PATH_RESOLUTION_ONLY',skillEnabled:'UNKNOWN',executionAuthorized:false,
               currentEntitlementVerified:false,safety:{...safety}};
 const unavailable=(code,reason,extra={})=>({...common,status:'UNAVAILABLE',code,reason,
  next:'Obtain a fresh successful host CLI installed snapshot and retry the same exact identity; do not restore caches, install or change account/configuration.',...extra});
 if(!object(request)||Object.keys(request).some(k=>!['pluginId','cacheRoot','snapshot','skill'].includes(k))||typeof request.pluginId!=='string'||!ID.test(request.pluginId))return unavailable('INVALID_REQUEST','Supply an exact name@namespace identity, cache root and host snapshot.');
 const [name,namespace]=request.pluginId.split('@');
 if(!component(name)||!component(namespace))return unavailable('INVALID_REQUEST','Identity contains an unsafe cache component.');
 const snapshot=request.snapshot;
 if(!object(snapshot)||snapshot.kind!=='codex-cli-installed'||!object(snapshot.data)||!Array.isArray(snapshot.data.installed)||snapshot.data.installed.length>20000||
    typeof snapshot.capturedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(snapshot.capturedAt))return unavailable('SNAPSHOT_INCOMPLETE','A complete timestamped host CLI installed observation is required.');
 if(snapshot.exitCode!==0)return unavailable('LOOKUP_NOT_SUCCESSFUL','The observed host CLI lookup did not finish successfully.');
 const captured=Date.parse(snapshot.capturedAt),ageMs=now-captured;
 if(!Number.isFinite(now)||!Number.isFinite(captured)||ageMs<0||ageMs>MAX_AGE_MS)return unavailable('SNAPSHOT_STALE','The supplied observation is invalid, future-dated or older than 60 seconds.');
 const freshness={capturedAt:snapshot.capturedAt,ageMs,maxAgeMs:MAX_AGE_MS,
                  provenance:'Caller-supplied successful codex plugin list --json observation',independentlyVerified:false};
 const matches=snapshot.data.installed.filter(row=>object(row)&&row.pluginId===request.pluginId);
 if(matches.length!==1)return unavailable(matches.length?'REGISTRY_CONFLICT':'PLUGIN_NOT_INSTALLED','Exactly one matching installed identity must be observed.',{freshness});
 const row=matches[0];
 if(row.installed!==true||row.enabled!==true)return unavailable(row.enabled===false?'PLUGIN_DISABLED':'PLUGIN_NOT_INSTALLED','The exact package is not observed as both installed and enabled.',{freshness});
 if((row.name!==undefined&&row.name!==name)||(row.marketplaceName!==undefined&&row.marketplaceName!==namespace))return unavailable('REGISTRY_IDENTITY_MISMATCH','Registry name/namespace fields disagree with the exact identity.',{freshness});
 if(!component(row.version))return unavailable('UNSAFE_VERSION','The observed installed version is not a safe cache component.',{freshness});
 let cacheRoot,root,manifestPath,manifest;
 try{
  cacheRoot=await directoryRoot(request.cacheRoot);
  root=await containedPath(cacheRoot,[namespace,name,row.version],'directory');
 }catch(error){return unavailable(error.code==='ENOENT'?'CACHE_PATH_UNAVAILABLE':'UNSAFE_CACHE_PATH','The current exact cache directory is missing or unsafe.',{freshness});}
 try{
  try{manifestPath=await containedPath(root,['.codex-plugin','plugin.json'],'file');}
  catch(error){if(error.code!=='ENOENT')throw error;manifestPath=await containedPath(root,['plugin.json'],'file');}
  manifest=JSON.parse(await readBounded(manifestPath,128*1024));
  if(!object(manifest)||manifest.name!==name||manifest.version!==row.version)return unavailable('MANIFEST_IDENTITY_MISMATCH','Current manifest name/version does not match the exact installed record.',{freshness});
 }catch{return unavailable('MANIFEST_UNAVAILABLE','The current authoritative manifest is missing, malformed, oversized or unsafe.',{freshness});}
 let skillPath=null,skillName=null;
 if(request.skill!==undefined){
  try{
   const parts=relative(request.skill);if(parts.at(-1)!=='SKILL.md')throw Error('not a skill');
   if(typeof manifest.skills!=='string')throw Error('skills not declared');
   const declared=relative(manifest.skills.replace(/^\.\//,'').replace(/\/$/,''));
   if(parts.length<declared.length+2||declared.some((part,i)=>parts[i]!==part))throw Error('outside declared skills');
   skillPath=await containedPath(root,parts,'file');
   const metadata=frontmatter(await readBounded(skillPath,2*1024*1024));
   if(typeof metadata.name!=='string'||!metadata.name.trim())throw Error('skill name missing');
   skillName=metadata.name;
  }catch{return unavailable('SKILL_UNAVAILABLE','The exact requested skill is missing, undeclared, malformed or unsafe.',{freshness});}
 }
 try{
  // Detect a normal mid-lookup removal/replacement before returning a usable path.
  if(await directoryRoot(request.cacheRoot)!==cacheRoot||await containedPath(cacheRoot,[namespace,name,row.version],'directory')!==root||
     await containedPath(root,path.relative(root,manifestPath).split(path.sep),'file')!==manifestPath)throw Error('cache changed');
  const finalManifest=JSON.parse(await readBounded(manifestPath,128*1024));
  if(JSON.stringify(finalManifest)!==JSON.stringify(manifest))throw Error('manifest changed');
  if(skillPath&&await containedPath(root,relative(request.skill),'file')!==skillPath)throw Error('skill changed');
 }catch{return unavailable('CACHE_CHANGED','The selected package changed during lookup; repeat fresh host discovery.',{freshness});}
 return {...common,status:'RESOLVED',pluginId:request.pluginId,version:row.version,root,manifestPath,
         skillPath,skillName,freshness,observedInstalled:true,observedPluginEnabled:true,
         limitation:'Point-in-time path/identity resolution only. Check native per-skill activation, current account access and actual authorization separately; an injected host catalog can remain stale mid-session.'};
}
```

## File: `src/services/inventory-versions.mjs`

```javascript
import { reconcileInstalledInventories } from './installed-inventory.mjs';

const nativeNamespaces = { personal: 'created-by-me-remote', business: 'workspace-directory' };
const nativeNames = new Set(Object.values(nativeNamespaces));
const curatedMarketplace = 'openai-curated-remote';
const namespaceOf = value => typeof value === 'string' ? value.split('@')[1] : null;

function isNativeNamespace(value) {
  const canonical = typeof value === 'string' ? value.toLowerCase() : null;
  if (!nativeNames.has(canonical)) return false;
  if (value !== canonical) throw new Error('Native catalog namespaces must use canonical lowercase');
  return true;
}

const identifier = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/i;
const token = /^[a-z0-9][a-z0-9.+_-]{0,127}$/i;
const repository = /^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;
const manifestPath = /^(?:[a-z0-9_.-]+\/)*(?:\.codex-plugin\/)?plugin\.json$/i;
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-z-]+(?:\.[0-9a-z-]+)*))?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;

function check(value, condition, label) {
  if (!condition) throw new Error('Invalid ' + label);
  return value;
}

function id(value) {
  return check(value, typeof value === 'string' && value.length <= 240 && identifier.test(value), 'exact plugin ID');
}

function release(value) {
  return check(value, typeof value === 'string' && token.test(value), 'version');
}

function list(value, limit, label) {
  return check(value, Array.isArray(value) && value.length <= limit, label);
}

function parseVersion(value) {
  const match = semver.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split('.') ?? [];
  if (prerelease.some(part => /^0\d+$/.test(part))) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function compareIdentifiers(a, b) {
  const leftNumeric = /^\d+$/.test(a);
  const rightNumeric = /^\d+$/.test(b);
  if (leftNumeric && rightNumeric) return BigInt(a) < BigInt(b) ? -1 : 1;
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return a < b ? -1 : 1;
}

function semverOrder(a, b) {
  for (const [index, segment] of a.core.entries()) {
    if (segment !== b.core[index]) return segment < b.core[index] ? -1 : 1;
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return Math.sign(b.prerelease.length - a.prerelease.length);
  }
  for (const [index, segment] of a.prerelease.entries()) {
    if (index === b.prerelease.length) return 1;
    if (segment !== b.prerelease[index]) return compareIdentifiers(segment, b.prerelease[index]);
  }
  return Math.sign(a.prerelease.length - b.prerelease.length);
}

export function compareVersions(observed, reference) {
  release(observed);
  release(reference);
  if (observed === reference) return 'EXACT';
  const left = parseVersion(observed);
  const right = parseVersion(reference);
  if (!left || !right) return 'UNORDERED';
  const order = semverOrder(left, right);
  return order < 0 ? 'OLDER' : order > 0 ? 'NEWER' : 'SAME_PRECEDENCE';
}

function validateSource(source) {
  const { url, revision, path } = source ?? {};
  check(url, typeof url === 'string' && url.length <= 256 && repository.test(url), 'GitHub source URL');
  check(revision, typeof revision === 'string' && /^[0-9a-f]{40}$/i.test(revision), 'Git source revision');
  check(path, typeof path === 'string' && path.length <= 300 && manifestPath.test(path) &&
    !path.split('/').some(segment => segment === '.' || segment === '..'), 'manifest path');
  return { url, revision, path };
}

function publishedRows(input, gaps) {
  const expectedIds = list(input?.expected, 500, 'expected published identities').map(id);
  check(expectedIds, expectedIds.length > 0 && new Set(expectedIds).size === expectedIds.length, 'publication coverage');
  const expected = new Set(expectedIds);
  const published = new Map();
  for (const entry of list(input?.entries, 500, 'Git manifest observations')) {
    const key = id(entry.id);
    check(key, expected.has(key) && !published.has(key), 'unique expected publication identity');
    published.set(key, { id: key, version: release(entry.version), source: validateSource(entry.source) });
  }
  for (const key of expected) {
    if (!published.has(key)) gaps.push({ code: 'MISSING_PUBLICATION', id: key });
  }
  return { expected, published };
}

function filterInstallationSnapshot(snapshot, keep) {
  const data = snapshot.data;
  const key = data?.installed != null ? 'installed' : 'plugins';
  if (!Array.isArray(data?.[key])) return snapshot;
  const rows = data[key].filter(row => keep(namespaceOf(row.pluginId)));
  return { ...snapshot, data: { ...data, [key]: rows } };
}

function scopedInventory(inventory, namespace, attested, gaps) {
  const current = list(inventory?.current, 100, 'current inventory snapshots').map(snapshot => {
    if (snapshot.kind === 'cli') {
      return filterInstallationSnapshot(snapshot, value => !isNativeNamespace(value));
    }
    if (snapshot.kind === 'scoped-cli') {
      check(snapshot.namespace, !isNativeNamespace(snapshot.namespace), 'scoped CLI namespace');
      return snapshot;
    }
    const data = snapshot.data;
    if (snapshot.kind !== 'catalog' || !Array.isArray(data?.marketplaces)) return snapshot;
    const scoped = data.marketplaces.filter(section =>
      (section.targeted !== true || (attested && section.name === curatedMarketplace)) &&
      (!isNativeNamespace(section.name) || section.name === namespace));
    const invalidNativeState = scoped.some(section => section.name === namespace && section.plugins?.some(row =>
      namespaceOf(row?.id) === namespace && typeof row.installed !== 'boolean'));
    const marketplaceLoadErrors = invalidNativeState ? [
      ...(data.marketplaceLoadErrors ?? []), 'Invalid native installation state',
    ] : data.marketplaceLoadErrors;
    if (invalidNativeState) gaps.push({ code: 'NATIVE_INSTALLATION_STATE_INVALID', namespace });
    const nativeRowsVerified = attested && !marketplaceLoadErrors?.length;
    const marketplaces = scoped.map(section => ({
      ...section,
      plugins: section.plugins?.filter(row => {
        const observed = namespaceOf(row.id);
        if (section.targeted === true) return observed === section.name && row.installed === true;
        return !isNativeNamespace(observed) || (nativeRowsVerified && observed === section.name);
      }),
    }));
    return { ...snapshot, data: { ...data, marketplaces, marketplaceLoadErrors } };
  });
  const historical = list(inventory.historical ?? [], 100, 'historical inventory snapshots')
    .map(snapshot => filterInstallationSnapshot(snapshot, value => !isNativeNamespace(value) || value === namespace));
  return { ...inventory, current, historical };
}

function nativeCounterpartRows(sections, namespace, wanted) {
  const data = { installed: [], available: [] };
  for (const section of sections) {
    for (const row of list(section.plugins, 20000, 'native catalog records')) {
      if (!wanted.has(row?.id) || namespaceOf(row.id) !== namespace) continue;
      if (row.installed === true && row.localVersion != null) {
        data.installed.push({ pluginId: row.id, version: row.localVersion });
      }
      if (row.version != null) data.available.push({ pluginId: row.id, version: row.version });
    }
  }
  return { namespace, exitCode: 0, data };
}

function catalogRows(snapshots, wanted, gaps, attested) {
  const records = new Map();
  const seenNamespaces = new Set();
  for (const snapshot of snapshots) {
    const namespace = check(snapshot.namespace, typeof snapshot.namespace === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,100}$/i.test(snapshot.namespace), 'catalog namespace');
    check(namespace, !seenNamespaces.has(namespace), 'unique catalog namespace');
    seenNamespaces.add(namespace);
    const targeted = snapshot.scope === 'targeted';
    const usable = snapshot.exitCode === 0 && !snapshot.data?.marketplaceLoadErrors?.length &&
      Array.isArray(snapshot.data?.available) && Array.isArray(snapshot.data?.installed);
    if (!usable || targeted) gaps.push({ code: 'CATALOG_UNAVAILABLE', namespace });
    if (!usable || (targeted && (!attested || namespace !== curatedMarketplace))) continue;
    for (const kind of ['installed', 'available']) {
      for (const row of list(snapshot.data[kind], 20000, 'catalog records')) {
        if (!wanted.has(row?.pluginId) || !row.pluginId.endsWith('@' + namespace)) continue;
        const versions = records.get(row.pluginId) ?? { installed: new Set(), available: new Set(), targeted };
        versions[kind].add(release(row.version));
        records.set(row.pluginId, versions);
      }
    }
  }
  return records;
}

function assessCounterpart(pair, catalog, published, gaps) {
  const { publishedId, catalogId } = pair;
  const observed = catalog.get(catalogId);
  const source = published.get(publishedId);
  if (!observed || observed.available.size > 1 || observed.installed.size > 1) {
    gaps.push({ code: observed ? 'COUNTERPART_UNCERTAIN' : 'COUNTERPART_MISSING', id: catalogId, publishedId });
    return { publishedId, catalogId, comparison: 'UNKNOWN' };
  }
  if (!source) gaps.push({ code: 'COUNTERPART_UNCERTAIN', id: catalogId, publishedId });
  const [installedVersion = null] = observed.installed;
  const [availableVersion = null] = observed.available;
  const installedComparison = installedVersion && source ? compareVersions(installedVersion, source.version) : 'UNKNOWN';
  const availableComparison = availableVersion && source ? compareVersions(availableVersion, source.version) : 'UNKNOWN';
  return {
    publishedId, catalogId, installedVersion, availableVersion, installedComparison, availableComparison,
    evidence: availableVersion ? 'AVAILABLE_RELEASE' : 'INSTALLED_RELEASE',
    ...(observed.targeted ? { observationScope: 'TARGETED_VENDOR' } : {}),
    comparison: availableVersion ? availableComparison : installedComparison,
  };
}

export function auditInventoryVersions(input) {
  const { host, account, observedAt, workspaceFingerprint = null } = input?.scope ?? {};
  check(host, typeof host === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(host), 'host label');
  check(account, ['personal', 'business'].includes(account), 'account scope');
  check(observedAt, typeof observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(observedAt) &&
    Number.isFinite(Date.parse(observedAt)), 'UTC observation time');
  check(workspaceFingerprint, workspaceFingerprint === null || (typeof workspaceFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(workspaceFingerprint)), 'workspace fingerprint');
  const nativeNamespace = nativeNamespaces[account];
  const gaps = [];
  const inventory = scopedInventory(input.inventory, nativeNamespace, workspaceFingerprint !== null, gaps);
  const { cliFailure = null } = inventory;
  check(cliFailure, [null, 'TIMEOUT', 'FAILED'].includes(cliFailure), 'CLI failure reason');
  const cliSnapshots = inventory.current.filter(snapshot => snapshot.kind === 'cli');
  const fullCliObserved = cliSnapshots.some(snapshot => !snapshot.data?.marketplaceLoadErrors?.length);
  check(cliFailure, !cliFailure || !fullCliObserved, 'CLI failure without a successful CLI snapshot');
  if (!fullCliObserved) {
    const reason = cliFailure ?? (cliSnapshots.length ? 'FAILED' : 'NOT_CAPTURED');
    gaps.push({ code: 'CLI_EVIDENCE_MISSING', reason });
  }
  const reconciled = reconcileInstalledInventories(inventory);
  gaps.push(...reconciled.incomplete.map(message => ({ code: 'INVENTORY_INCOMPLETE', message })));
  const nativeSections = inventory.current
    .filter(snapshot => snapshot.kind === 'catalog' && !snapshot.data.marketplaceLoadErrors?.length)
    .flatMap(snapshot => snapshot.data.marketplaces.filter(section =>
      section.name === nativeNamespace && Array.isArray(section.plugins)));
  const nativeObserved = nativeSections.length > 0;
  const nativeAttested = nativeObserved && workspaceFingerprint !== null;
  if (!nativeObserved) {
    gaps.push({ code: 'NATIVE_SCOPE_MISSING', namespace: nativeNamespace });
  }
  const { expected, published } = publishedRows(input.published, gaps);
  const pairs = list(input.counterparts ?? [], 1000, 'explicit counterpart mappings').map(pair => ({
    publishedId: id(pair.publishedId), catalogId: id(pair.catalogId),
  }));
  const keys = new Set();
  for (const pair of pairs) {
    const key = pair.publishedId + '/' + pair.catalogId;
    check(key, expected.has(pair.publishedId) && pair.publishedId !== pair.catalogId && !keys.has(key), 'counterpart mapping');
    keys.add(key);
  }
  const wanted = new Set(pairs.map(row => row.catalogId));
  const catalogs = list(input.catalogs ?? [], 20, 'catalog observations')
    .filter(snapshot => !isNativeNamespace(snapshot.namespace));
  if (nativeAttested) {
    catalogs.push(nativeCounterpartRows(nativeSections, nativeNamespace, wanted));
  } else if (nativeObserved) {
    gaps.push({ code: 'NATIVE_SCOPE_UNATTESTED', namespace: nativeNamespace });
  }
  const catalog = catalogRows(catalogs, wanted, gaps, workspaceFingerprint !== null);
  const installed = new Map(reconciled.plugins.map(row => [row.id, row]));
  const plugins = [...expected].sort().map(key => {
    const source = published.get(key) ?? null;
    const local = installed.get(key);
    let comparison = 'UNKNOWN';
    const installation = !local ? (reconciled.complete && nativeObserved ? 'NOT_INSTALLED' : 'UNKNOWN') :
      local.status === 'CONSISTENT' ? 'INSTALLED' : 'UNCERTAIN';
    const installedVersion = installation === 'INSTALLED' ? release(local.versions[0]) : null;
    if (source && installedVersion) comparison = compareVersions(installedVersion, source.version);
    const enabled = installation === 'INSTALLED' ? observedEnabled(local) : null;
    return { id: key, installedVersion, installation, enabled, published: source, comparison };
  });
  const counterparts = pairs.sort((a, b) => a.publishedId.localeCompare(b.publishedId) || a.catalogId.localeCompare(b.catalogId))
    .map(pair => {
      const namespace = namespaceOf(pair.catalogId);
      if (isNativeNamespace(namespace) && namespace !== nativeNamespace) {
        return { ...pair, comparison: 'UNKNOWN', evidence: 'OUT_OF_SCOPE' };
      }
      return assessCounterpart(pair, catalog, published, gaps);
    });
  const outsidePublication = reconciled.plugins.filter(row => !expected.has(row.id)).map(row => ({
    id: row.id, versions: row.versions.map(release), status: row.status,
    enabled: row.status === 'CONSISTENT' ? observedEnabled(row) : null,
  }));
  const history = {
    ...reconciled.historicalComparison,
    snapshots: reconciled.historicalComparison.snapshots.map(snapshot => {
      const previousIds = new Set(snapshot.deltas.map(row => row.id));
      const deltas = snapshot.deltas.map(row => {
        const coverage = isNativeNamespace(namespaceOf(row.id)) ? nativeAttested : fullCliObserved;
        if (row.status === 'HISTORICAL_ID_ABSENT' || row.status === 'HISTORICAL_ID_UNVERIFIED') {
          return { ...row, status: coverage ? 'HISTORICAL_ID_ABSENT' : 'HISTORICAL_ID_UNVERIFIED' };
        }
        return row;
      });
      const newlyObserved = [...installed.keys()].filter(key => !previousIds.has(key) && !isNativeNamespace(namespaceOf(key)));
      return { ...snapshot, deltas, newlyObserved };
    }),
  };
  const drift = plugins.filter(row => row.comparison !== 'EXACT' && row.comparison !== 'UNKNOWN').length;
  const publicationInstallation = {
    installed: plugins.filter(row => row.installation === 'INSTALLED').length,
    exact: plugins.filter(row => row.comparison === 'EXACT').length,
    absent: plugins.filter(row => row.installation === 'NOT_INSTALLED').length,
    uncertain: plugins.filter(row => ['UNKNOWN', 'UNCERTAIN'].includes(row.installation)).length,
  };
  return {
    schemaVersion: 1, status: gaps.length ? 'INCOMPLETE' : drift ? 'DRIFT' : 'MATCHED',
    exitCode: gaps.length ? 2 : drift ? 1 : 0,
    scope: { host, account, observedAt, workspaceFingerprint }, installedPluginIdentities: reconciled.installedPluginIdentities,
    publicationsExpected: expected.size, sameIdentityDrift: drift, publicationInstallation, plugins, counterparts, gaps,
    installationCoverage: { cli: fullCliObserved, native: nativeAttested },
    scopedCliNamespaces: [...new Set(reconciled.sources.filter(row => row.kind === 'scoped-cli').map(row => row.namespace))],
    history, outsidePublication,
    limitation: 'Cross-catalog rows compare explicitly related products. They do not establish identity, replacement eligibility, account access or permission to install.',
  };
}

function observedEnabled(row) {
  return row.observations.find(observation => observation.enabled !== null)?.enabled ?? null;
}

function peerRecords(report) {
  const records = new Map();
  for (const row of report.plugins) {
    if (row.installation === 'INSTALLED' || row.installation === 'UNCERTAIN') {
      records.set(row.id, { version: row.installedVersion, enabled: row.enabled });
    }
  }
  for (const row of report.outsidePublication) {
    records.set(row.id, {
      version: row.status === 'CONSISTENT' ? row.versions[0] : null,
      enabled: row.enabled,
    });
  }
  return records;
}

function canVerifyAbsence(report, key) {
  return isNativeNamespace(namespaceOf(key)) ? report.installationCoverage.native : report.installationCoverage.cli;
}

export function compareHostInstallations(current, peer) {
  check(peer.scope, peer.scope.host.toLowerCase() !== current.scope.host.toLowerCase(), 'distinct hosts');
  check(peer.scope, current.scope.account === peer.scope.account && current.scope.workspaceFingerprint !== null &&
    current.scope.workspaceFingerprint === peer.scope.workspaceFingerprint, 'matching attested account scope');
  const currentRows = peerRecords(current);
  const peerRows = peerRecords(peer);
  const differences = [];
  const unverified = [];
  for (const key of [...new Set([...currentRows.keys(), ...peerRows.keys()])].sort()) {
    const a = currentRows.get(key) ?? null;
    const b = peerRows.get(key) ?? null;
    if (!a || !b) {
      const other = a ? peer : current;
      if (!canVerifyAbsence(other, key)) unverified.push({ id: key, reason: 'ABSENCE_UNVERIFIED' });
      else differences.push({ id: key, reasons: [a ? 'CURRENT_ONLY' : 'PEER_ONLY'], current: a, peer: b });
      continue;
    }
    const reasons = [];
    if (a.version === null || b.version === null) unverified.push({ id: key, reason: 'VERSION_UNVERIFIED' });
    else if (a.version !== b.version) reasons.push('VERSION_DIFFERS');
    if (a.enabled === null || b.enabled === null) unverified.push({ id: key, reason: 'ACTIVATION_UNVERIFIED' });
    else if (a.enabled !== b.enabled) reasons.push('ACTIVATION_DIFFERS');
    if (reasons.length) differences.push({ id: key, reasons, current: a, peer: b });
  }
  const coverageComplete = [current, peer].every(({ installationCoverage }) =>
    installationCoverage.cli && installationCoverage.native);
  return {
    status: !coverageComplete || unverified.length ? 'INCOMPLETE' : differences.length ? 'DIFFERENCES' : 'ALIGNED',
    currentHost: current.scope.host, peerHost: peer.scope.host,
    currentObservedAt: current.scope.observedAt, peerObservedAt: peer.scope.observedAt,
    currentInstalled: currentRows.size, peerInstalled: peerRows.size, differences, unverified,
  };
}
```

## File: `src/services/risk.mjs`

```javascript
import crypto from 'node:crypto';
import path from 'node:path';
import { readBounded, walkFiles } from './files.mjs';

const rule = (id, severity, pattern, title, remediation, version = '1.0.0') => ({ id, version, severity, pattern, title, remediation });
const rules = [
  rule('INSTRUCTION_OVERRIDE', 'high', /ignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions|disregard\s+(?:the\s+)?(?:system|developer)\s+(?:prompt|instructions)/i, 'Instruction hierarchy override', 'Remove authority claims; preserve host and user instructions.'),
  rule('HIDDEN_BEHAVIOR', 'high', /(?:do not|don.t|never)\s+(?:tell|inform|notify)\s+(?:the\s+)?user|hide\s+(?:this|these)\s+(?:action|command|instruction)/i, 'Concealed behavior instruction', 'Make side effects explicit and respect the user\'s scope.'),
  rule('REMOTE_EXECUTION', 'high', /(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm).{0,240}(?:\|\s*(?:sh|bash|iex)\b|Invoke-Expression)|(?:eval|exec)\s*\(.{0,100}(?:fetch|request)/i, 'Remote content executed', 'Download to a reviewable file, verify provenance and avoid piping remote text to execution.', '1.2.0'),
  rule('DESTRUCTIVE_COMMAND', 'high', /\brm\s+-(?:rf|fr)\b|Remove-Item\b.{0,160}-(?:Recurse|Force)|\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|push\b.{0,100}--force)/i, 'Destructive command present', 'Require an exact target, recovery evidence and authorization before destructive execution.'),
  rule('SECRET_PATTERN', 'critical', /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/i, 'Possible secret material', 'Remove credentials from distributable files and investigate the exact exposure.'),
  rule('SECRET_TRANSMISSION', 'high', /(?:fetch|requests?\.(?:post|get)|Invoke-RestMethod|curl).{0,220}(?:process\.env|os\.environ|\$env:|SECRET|TOKEN|API_KEY)/i, 'Possible secret transmission', 'Inspect data flow and destination; never transmit unrelated credentials.'),
  rule('BROAD_PERMISSION', 'medium', /danger-full-access|dangerously-bypass|executionpolicy\s+bypass|chmod\s+777|sudo\s+/i, 'Broad permission or bypass request', 'Use the smallest supported scope and document any required privilege.'),
  rule('AUTOMATIC_INSTALL', 'medium', /\bnpx\s+.+\s+(?:-g|--global)\b|\b(?:npm|pip)\s+install\b|\bskills\s+add\b.{0,100}(?:-y|--yes)/i, 'Installation command present', 'Keep discovery, review and authorized installation separate.'),
];
const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
const textExtensions = new Set(['.md', '.txt', '.json', '.jsonl', '.yml', '.yaml', '.toml', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.sh', '.ps1', '.bat', '.cmd', '.html', '.xml']);
export function redact(value) {
  return String(value).replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})/gi, '[REDACTED]')
    .replace(/((?:password|api[_-]?key|secret|token)\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1[REDACTED]').slice(0, 500);
}
function suppressions(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new Error('suppressions must be an array');
  for (const item of input) {
    if (!item || !/^[a-f0-9]{64}$/.test(item.fingerprint ?? '') || typeof item.ruleId !== 'string' || !item.ruleId || typeof item.ruleVersion !== 'string' || !item.ruleVersion || typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error('Each suppression requires an exact fingerprint, ruleId, ruleVersion and reason');
    }
    if (Object.keys(item).some(k => !['fingerprint', 'ruleId', 'ruleVersion', 'reason'].includes(k))) throw new Error('Unknown suppression field');
  }
  return input;
}
export async function scanRisk(target, options = {}) {
  const threshold = options.severity ?? 'medium';
  if (!(threshold in severityRank)) throw new Error('Unknown severity threshold');
  const suppressionInput = typeof options.suppressions === 'string'
    ? JSON.parse(await readBounded(path.resolve(options.suppressions), 1024 * 1024)) : options.suppressions;
  const selectedSuppressions = suppressions(Array.isArray(suppressionInput) ? suppressionInput : suppressionInput?.suppressions ?? suppressionInput);
  const scan = await walkFiles(target, options);
  const findings = [], errors = [...scan.errors];
  let scannedFiles = 0, skippedFiles = 0;
  for (const file of scan.files) {
    const buildFile=/^(?:Dockerfile|Containerfile)$|\.(?:dockerfile|containerfile)$/i.test(path.basename(file.absolute));
    if (!buildFile && !textExtensions.has(path.extname(file.absolute).toLowerCase()) && path.basename(file.absolute) !== 'LICENSE') { skippedFiles++; continue; }
    let text;
    try { text = await readBounded(file.absolute, options.maxFileBytes ?? 2 * 1024 * 1024); }
    catch (error) { errors.push({ path: file.relative, message: error.message }); continue; }
    scannedFiles++;
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      for (const r of rules) {
        const match = r.pattern.exec(line);
        if (!match) continue;
        const fingerprint = crypto.createHash('sha256').update(`${r.id}\0${r.version}\0${file.relative}\0${index + 1}\0${line.trim()}`).digest('hex');
        const accepted = selectedSuppressions.find(s => s.fingerprint === fingerprint && s.ruleId === r.id && s.ruleVersion === r.version);
        findings.push({ ruleId: r.id, ruleVersion: r.version, severity: r.severity, uncertainty: 'requires review', title: r.title,
          path: file.relative, line: index + 1, column: match.index + 1, evidence: redact(line), remediation: r.remediation,
          fingerprint, suppressed: Boolean(accepted), suppressionReason: accepted ? redact(accepted.reason) : null });
      }
    }
  }
  const active = findings.filter(f => !f.suppressed), actionable = active.filter(f => severityRank[f.severity] >= severityRank[threshold]);
  return { kind: 'skill-risk-report', schemaVersion: 1, target: path.resolve(target), complete: errors.length === 0,
    exitCode: errors.length ? 2 : actionable.length ? 1 : 0, threshold, scannedFiles, skippedFiles,
    activeCount: active.length, suppressedCount: findings.length - active.length, findings, errors,
    rules: rules.map(({ pattern, ...r }) => r), nonCoverage: ['Semantic intent, malicious code outside deterministic patterns, runtime data flow and host permissions are not proven.'],
    limitation: 'A clean deterministic scan is not a safety certification; findings require contextual review.' };
}

export function renderRisk(report, format = 'json') {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'sarif') return JSON.stringify({ version: '2.1.0', $schema: 'https://json.schemastore.org/sarif-2.1.0.json', runs: [{
    tool: { driver: { name: 'Plugin-Skill-Studio Risk Check', rules: report.rules.map(r => ({ id: r.id, name: r.title, shortDescription: { text: r.title }, properties: { version: r.version } })) } },
    results: report.findings.map(f => ({ ruleId: f.ruleId, level: ['critical', 'high'].includes(f.severity) ? 'error' : 'warning',
      message: { text: `${f.title}: ${f.evidence}` }, locations: [{ physicalLocation: { artifactLocation: { uri: f.path }, region: { startLine: f.line, startColumn: f.column } } }],
      fingerprints: { 'studio/v1': f.fingerprint }, ...(f.suppressed ? { suppressions: [{ kind: 'external', justification: f.suppressionReason }] } : {}) })),
    invocations: [{ executionSuccessful: report.complete, toolExecutionNotifications: report.errors.map(e => ({ level: 'error', message: { text: `${e.path}: ${e.message}` } })) }],
  }] }, null, 2);
  if (format !== 'markdown') throw new Error(`Unsupported risk report format: ${format}`);
  const safe = text => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return `# Risk Check\n\n${report.limitation}\n\nComplete: ${report.complete}; active: ${report.activeCount}; suppressed: ${report.suppressedCount}; exit: ${report.exitCode}\n\n| Severity | Location | Finding | State |\n| --- | --- | --- | --- |\n` +
    report.findings.map(f => `| ${f.severity} | ${safe(f.path)}:${f.line} | ${safe(f.title)} — ${safe(f.evidence)} | ${f.suppressed ? 'suppressed: ' + safe(f.suppressionReason) : 'active'} |`).join('\n') +
    (report.errors.length ? '\n\n## Incomplete checks\n\n' + report.errors.map(e => `- ${safe(e.path)}: ${safe(e.message)}`).join('\n') : '') + '\n';
}
```
