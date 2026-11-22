# Catalog: every plugin and skill

## AgentMemory-ASUS (`agentmemory-asus`)

- Version: `1.0.0`
- Installs from: `plugins/agentmemory-asus` (this repository)
- Exported from: `plugins/agentmemory-asus`
- Gemini skill folder: `gemini/skills/agentmemory-asus/`
- Purpose: Use the existing AgentMemory-ASUS App for scoped memory lookup, diagnostics and user-authorized memory changes.

- **agentmemory-asus** — Use when the user requests shared project memory, earlier decisions, diagnostics or an explicitly authorized memory update through the existing AgentMemory-ASUS App.

## CloudStorage Portal (`cloudstorage-portal`)

- Version: `0.9.14`
- Installs from: `plugins/cloudstorage-portal` (this repository)
- Exported from: `plugins/cloudstorage-portal`
- Gemini skill folder: `gemini/skills/cloudstorage-portal/`
- Purpose: Coordinate Dropbox, Google Drive and OneDrive through existing authorized App or MCP connections and a unified skill layer.

- **clean-up-dropbox-content** — Clean up Dropbox content by identifying obsolete, duplicate, temporary, or unwanted files and deleting only after explicit review. Use when the user explicitly asks to delete, remove, or clean up Dropbox files or folders.
- **cloudstorage-connections** — Configure or inspect unified connection management for Dropbox, Google Drive and OneDrive. Use for OAuth, login, account IDs, token lifecycle, scopes, linking accounts and three-provider readiness.
- **cloudstorage-portal** — Use when the user wants to search, read, upload, organize, share, inspect file history or transfer files across Dropbox, Google Drive and OneDrive through their existing App or MCP connections.
- **cloudstorage-setup-docs** — Explain and reproduce the documented zero-cost CloudStorage Portal setup, Microsoft Entra app roles, hosted OneDrive broker, callbacks, DCR and secret-field mapping; use for setup documentation, onboarding and login troubleshooting.
- **collect-files-with-request** — Create, inspect, and manage Dropbox file requests for collecting uploads from other people. Use when the user asks to collect files, request uploads, create an upload portal, check a file request, or list existing file requests.
- **find-dropbox-content** — Find Dropbox files and folders relevant to a user request. Use when the user asks to search Dropbox, find a document, locate recent files, browse a folder, identify likely source files, or narrow down where content lives before reading, sharing, organizing, or restoring it.
- **google-docs** — Use when the user wants to create, read or edit a native Google Docs document through a connected Google Drive account.
- **google-drive** — Use connected Google Drive as the single entrypoint for Drive, Docs, Sheets, and Slides work. Use when the user wants to find, fetch, organize, share, export, copy, or delete Drive files, or summarize and edit Google Docs, Google Sheets, and Google Slides through one unified Google Drive plugin.
- **google-drive-comments** — Write, reply to, and resolve Google Drive comments on Docs, Sheets, Slides, and Drive files with evidence-backed location context. Use when the user asks to leave comments, review a file with comments, respond to comment threads, or resolve Drive comments.
- **google-sheets** — Analyze and edit connected Google Sheets with range precision. Use when the user wants to create Google Sheets, find a spreadsheet, inspect tabs or ranges, search rows, plan formulas, create or repair charts, clean or restructure tables, write concise summaries, or make explicit cell-range updates.
- **google-slides** — Route Google Slides authoring requests and derive a design system from a native template or reference deck. Use this skill when the user provides an existing native Google Slides deck as a template, reference, or prior-period source, or asks to edit, update, repair, restyle, or clean up an existing native Google Slides deck. Use the Presentations skill instead for net-new presentation creation when no existing native Google Slides deck must be followed.
- **inspect-dropbox-file** — Inspect a Dropbox file or folder by checking metadata, shared links, and file content when needed. Use when the user asks what a file is, whether it is shared, when it changed, what access links exist, or asks to read/analyze a Dropbox file.
- **onedrive** — Use when the user wants to read or manage OneDrive files through the existing OneDrive App: search, folders, uploads, downloads, rename, move, copy, sharing, permissions, versions, restore and quota.
- **organize-dropbox-folder** — Organize Dropbox files and folders by creating folders, copying content, or moving content into a cleaner structure. Use when the user asks to organize, archive, consolidate, restructure, copy, or move Dropbox content.
- **share-dropbox-content** — Share Dropbox files or folders by creating shared links, inspecting existing shared links, or explaining current shared-link state. Use only when the user explicitly asks to create a shared link, check access, or inspect a Dropbox shared link.
- **upload-to-dropbox** — Use when the user asks to save an attachment, generated file, or file-library selection from this conversation to Dropbox. Use the packaged file-request workflow for uploads from other people.

## CodeRabbit (`coderabbit`)

- Version: `1.1.7-wrp.1`
- Installs from: `plugins/coderabbit` (this repository)
- Exported from: `plugins/coderabbit`
- Gemini skill folder: `gemini/skills/coderabbit/`
- Purpose: AI-powered code review in Codex, powered by CodeRabbit.

- **code-review** — Run CodeRabbit code reviews and interpret their findings, scope, authentication failures, and completion status. Use for code reviews, PR feedback, and authorized fix-review cycles.

## Codex Coordinator (`codex-coordinator`)

- Version: `0.4.0`
- Installs from: `plugins/codex-coordinator` (this repository)
- Exported from: `plugins/codex-coordinator`
- Gemini skill folder: `gemini/skills/codex-coordinator/`
- Purpose: Coordinate parallel Codex tasks in one shared checkout with a small active-only boundary board.

- **codex-coordinator** — Keeps parallel Codex tasks in one shared Git checkout inside clear, visible boundaries. Uses a small local active-claim board and an optional user-invoked, goal-scoped Coordinator; it does not create background management, a heartbeat, scheduler, transcript store, or mandatory pull-request workflow.

## Codex Dev Workflows (`codex-dev-workflows`)

- Version: `0.4.2`
- Installs from: `plugins/codex-dev-workflows` (this repository)
- Exported from: `plugins/codex-dev-workflows`
- Gemini skill folder: `gemini/skills/codex-dev-workflows/`
- Purpose: Reusable software-development workflows and platform guidance for Codex.

- **bug-investigation** — Reproduce, isolate, fix, and verify a software defect with evidence and minimal scope.
- **code-review** — Review a change set for correctness, regressions, security, maintainability, and missing tests without changing unrelated code.
- **comprehensive-qa** — Perform a broad, evidence-based QA pass across software behavior, user journeys, state, regressions, accessibility, and operational risk.
- **create-agent-instructions** — Create or improve concise repository instructions that guide coding agents to authoritative project documentation and validation.
- **feature-development** — Implement a focused software feature with scoped investigation, verification, and a clear completion report.
- **feature-testing** — Test a recently implemented feature for intended behavior, edge cases, regressions, and meaningful missing coverage.
- **new-project** — Turn a new software idea into a scoped, buildable project plan before implementation begins.
- **orchestrate-work** — Coordinate complex, divisible work by planning, delegating independent tasks in parallel, integrating the results, and verifying the complete outcome.
- **platform-guidance** — Load focused development and QA guidance for Flutter, JavaScript/TypeScript, Python, or Laravel/PHP projects.
- **pre-release-review** — Assess whether a software change is ready to release by checking scope, validation, risk, operations, and rollback readiness.
- **resume-interrupted-task** — Safely resume interrupted software work by reconstructing the current state from repository evidence, preserving valid changes, and making the next step explicit.
- **session-handoff** — Create a concise, evidence-based handoff that lets the next development session continue safely without re-discovering context.

## Codex Engineering Guardrails (`codex-engineering-guardrails`)

- Version: `1.1.1`
- Installs from: `plugins/codex-engineering-guardrails` (this repository)
- Exported from: `plugins/codex-engineering-guardrails`
- Gemini skill folder: `gemini/skills/codex-engineering-guardrails/`
- Purpose: Skills-only bundle for scoped software implementation and independent code verification in Codex.

- **code-verification** — Independently review, test, diagnose, and verify software against explicit requirements, repository standards, and material risks using traceable fresh evidence. Use when Codex is asked to review code or a diff, inspect a pull request, diagnose a failing check without changing code, run or assess tests, validate a bug fix or feature, audit code quality, identify coverage gaps, judge release readiness, or report whether an implementation is correct. Default to read-only source inspection and existing checks; create or change tests only when explicitly requested, and do not modify production code unless the user separately authorizes a fix.
- **code-work** — Implement, modify, refactor, debug, and maintain software with strict scope control, repository-aware planning, root-cause analysis, incremental test-backed changes, adaptive parallelism, and fresh verification evidence. Use when Codex is asked to write or change production code, fix a defect, implement a feature, refactor a component, perform a migration, or complete another coding task that authorizes source changes. Use code-verification instead when the primary request is read-only review, testing, diagnosis, audit, or validation.

## Codex Process Jobs (`codex-process-jobs`)

- Version: `0.5.3-wrp.2`
- Installs from: `plugins/codex-process-jobs` (this repository)
- Exported from: `plugins/codex-process-jobs`
- Gemini skill folder: `gemini/skills/codex-process-jobs/`
- Purpose: Launch and manage durable, detached local process jobs from Codex.

- **cancel** — Safely request termination of a tracked detached process group using PID identity validation and a SIGTERM-to-SIGKILL grace period. Use only when the user asks to stop a job; critical repair, migration, firmware, or destructive jobs require explicit risk-aware approval and --force.
- **rerun** — Launch a finished Codex Process Jobs record again as a new detached job using its validated persisted argv, working directory, and execution mode. Use only when the user explicitly asks or approves rerunning a specific completed, failed, or cancelled build, test, benchmark, inference run, data job, or repair.
- **result** — Retrieve output for jobs and automatic CPJ completion notices.
- **start** — Launch an ordinary finite local workload as a durable detached process job, then release the assigning Codex turn instead of monitoring it. Use proactively for downloads, builds, test suites, evaluations, benchmarks, inference/model A/B runs, data jobs, and repairs whose underlying work may exceed 60 seconds or has uncertain duration. The user-visible parent must launch the job directly; never delegate local process execution or monitoring to a subagent.
- **status** — Inspect active and recent detached process jobs in a later user-requested turn, retrieve a lightweight activity preview, or wait once when explicitly requested. Use for questions such as "how's the build going?", later user-requested checks of test, inference, data-processing, or repair progress, or diagnosis of a disappeared worker. Never use it to monitor a job from the same turn that launched it or merely because an automatic Goal continuation arrived.
- **tail** — Read the latest bounded stdout or stderr from a tracked detached process job. Use to inspect live build progress, benchmark output, test failures, repair diagnostics, or other command output without loading the entire persisted log.

## Codex Security (`codex-security`)

- Version: `0.1.33` from upstream; this export: snapshot `0.1.33`
- Installs from: https://github.com/openai/plugins (plugins/codex-security)
- Exported from: `plugins/codex-security`
- Gemini skill folder: `gemini/skills/codex-security/`
- Purpose: Codex Security workflows for security scans, analysis, and investigation.

- **assess-patch-risk** — Assess an immutable patch artifact's program impact, regression risk, and auto-merge eligibility. Use for generated patch files, provider pull-request diffs, or commit ranges when reviewers need evidence about affected runtime paths, contracts, tests, and recoverability. This skill is read-only and does not generate, edit, apply, push, or merge the patch.
- **attack-path-analysis** — Use when Codex is already in the attack-path-analysis phase of a security scan or the user explicitly asks to trace a security finding from source to sink and calibrate severity. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans.
- **check-skills** — Review agent skills before installation or use. Use when a user or security team wants to check a skill file, bundle, or collection for unsafe instructions, scripts, permissions, or external dependencies.
- **cloud-findings** — Read existing Codex Security Cloud findings, reports, recorded assignment and verification, and scan status from the connected account. Use for Cloud read requests and finding links, not local scans or requests to change Cloud data.
- **deep-security-scan** — Run repeated Standard security scans of a repository or scoped path when the user requests a deep, exhaustive, or multi-pass audit. For changes to a PR, commit, branch or working tree, use security-diff-scan.
- **define-security-policy** — Define, review, or update SECURITY.md guidance for a repository or component. Use when the user wants to clarify what Codex Security should review, what is out of scope, which security properties must hold, or whether existing guidance still matches the code.
- **finding-discovery** — Use when Codex is already in the finding-discovery phase of a security scan or the user explicitly asks to discover candidate security findings in a repository or code change. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans.
- **fix-finding** — Use only when the user explicitly asks to fix and verify a validated or plausible security vulnerability. Do not use for ordinary bug fixes, correctness or design review findings, general validation, or full PR, commit, branch, patch, or repository scans.
- **propose-security-hardening** — Develop evidence-backed structural security hardening proposals from disclosures, findings, source code, or Codex Security scans. Use for systemic improvements, alternatives beyond individual patches, architectural tradeoffs, or implementation planning. Also use when a top-level scan requests final-report hardening guidance.
- **publish-findings** — Import findings from scanners, CI reports, vendor CLIs, APIs, or connected tools into the local workbench. Publish a selection of stored vendor findings to Codex Security Cloud.
- **resolve-dependency-alert** — Investigate a vulnerable dependency from a scanner alert, advisory, or SBOM match. Trace what pulls it in and determine whether it can be upgraded.
- **security-diff-scan** — Review a pull request, commit, branch diff, or working-tree patch for security vulnerabilities.
- **security-scan** — Find vulnerabilities in the current source of a whole repository or selected paths. This is the default single-pass audit. Use the diff skill for PR, commit, branch, or working-tree changes and the deep skill for an explicitly requested deep scan.
- **threat-model** — Use when Codex is already in the threat-modeling phase of a security scan, the user explicitly invokes $threat-model, or the user explicitly asks to create, update, or persist a repository threat model. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans.
- **threat-model-visualize** — Turn an existing threat model into an interactive architecture and threat-path explorer. Resolve simple requests for a target's last scan; do not perform a new assessment.
- **track-findings** — Track validated Codex Security findings in Linear, Jira, GitHub issues, or draft GitHub security advisories. Supports issue batches, duplicate checks, and reviewed writes. Do not use for scans or fixes.
- **triage-finding** — Triage supplied or imported security findings against a repository using its security policy and static code evidence. Accepts scanner reports, advisories, GitHub findings, and Jira or Linear tickets. Do not use for discovery, duplicate triage, runtime validation, or fixes.
- **validation** — Use when Codex is already in the validation phase of a security scan or the user explicitly asks to determine whether one or more candidate security findings are valid. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans.
- **verify-fix** — Use only when the user explicitly requests verification that a security fix remediates a reported vulnerability. Do not invoke automatically while implementing fixes, reviewing ordinary code changes, or running tests. Do not use for non-security fixes, candidate finding validation, or full repository scans.
- **vulnerability-writeup** — Turn vulnerability notes, disclosure reports, PoCs, source code, or Codex Security findings into self-contained vulnerability reports with clearly supported claims. Use for one vulnerability or a disclosure campaign; a Codex Security scan is optional.

## Component Forge (`component-forge`)

- Version: `0.1.3`
- Installs from: `plugins/component-forge` (this repository)
- Exported from: `plugins/component-forge`
- Gemini skill folder: `gemini/skills/component-forge/`
- Purpose: Archive-first PowerShell component extraction, dependency contracts, composition and evidence-based documentation workflows.

- **component-archive** — Use when extracting reusable PowerShell fragments, untangling shared variables, generating code from a component archive, or composing registered functions, scripts and modules.
- **component-docs** — Use when researching documentation for PowerShell components or extending XML, Batch, CMD and Lua documentation with verified applicability and source records.

## OneDrive (`onedrive`)

- Version: `1.2.2`
- Installs from: `plugins/onedrive` (this repository)
- Exported from: `plugins/onedrive`
- Gemini skill folder: `gemini/skills/onedrive/`
- Purpose: OneDrive files through the existing registered App and its hosted CloudStorage Portal MCP connection.

- **onedrive** — Use when reading or managing the authenticated OneDrive account through its existing App: files, folders, search, transfers, sharing, versions and quota.
- **onedrive-setup** — Use when configuring, verifying or diagnosing the existing OneDrive App's Microsoft login, hosted MCP tools, account identity or drive access without creating another connection.

## Plugin-Skill-Studio (`plugin-skill-studio`)

- Version: `0.6.0`
- Installs from: `plugins/plugin-skill-studio` (this repository)
- Exported from: `plugins/plugin-skill-studio`
- Gemini skill folder: `gemini/skills/plugin-skill-studio/`
- Purpose: Self-contained local plugin and skill creation, discovery, evidence, evaluation, risk review, conversion and deterministic packaging. Host execution capabilities and explicit public lookups remain separate.

- **ai-data-remediation** — Self-healing data pipeline layer using semantic anomaly clustering, AST-validated lambda transformations, and zero-loss mathematical reconciliation. Use when data quality checks fail, anomalous records break ETL/ELT pipelines, you need automated data cleansing with sandboxed Python transformations, or you want to group data errors into semantic clusters — even if they don't explicitly say "data remediation". Do NOT use for standard database schema migrations, routine CRUD queries, or basic pipeline scheduling.
- **ai-engineering** — Design, train, optimize, deploy, and evaluate production machine learning and LLM systems. Use when building ML models, training classifiers, fine-tuning LLMs with LoRA/PEFT, deploying low-latency inference endpoints, architecting vector RAG pipelines, or evaluating model bias and data leakage — even if they don't explicitly say "AI engineering". Do NOT use for standard backend CRUD development, basic SQL queries without ML, or simple UI styling.
- **automate-ui** — Automates web and desktop UIs while capturing evidence that separates navigation from verified behavior. Use when a task requires site navigation, browser reproduction, or native app operation. For one existing framework-free HTML page, use design-ui instead.
- **brand-designer** — Use when a ChatGPT/Codex Plugin needs a production-ready visual identity and SVG logo system that clearly expresses the Plugin's job across light and dark surfaces.
- **codebase-design** — Shared vocabulary and patterns for designing deep modules with narrow interfaces and clean seams. Use when designing module interfaces, finding deepening opportunities, deciding where seams go, or making code more testable and AI-navigable — even if the user says "improve this module". Do NOT use for whole-codebase architectural surveys.
- **communicate-clearly** — Controls report length while preserving evidence and explains external sources without overstating them. Use when a user requests concise handoffs, set verbosity, or plain-language explanations of dense material.
- **design-ui** — Builds accessible interfaces and verifies renders. Use when creating or redesigning a page, dashboard, or static HTML file.
- **diagnose-systematically** — Finds root causes through reproduction and falsifiable experiments. Use when a failure, flaky behavior, or regression lacks a demonstrated cause.
- **diagnosing-bugs** — Diagnose hard bugs, intermittent flakes, and performance regressions using a tight feedback loop. Use when the user reports broken behavior, runtime exceptions, failing tests, flaky CI, or says "debug this" / "diagnose this" — even if no error message is provided. Do NOT use for routine test-driven feature development.
- **dispatching-parallel-agents** — Dispatches one subagent per independent problem. Use when two or more investigations or fixes can proceed concurrently without shared state or sequential dependencies.
- **domain-modeling** — Build and sharpen a project's domain model, ubiquitous language, and architectural decision records. Use when establishing codebase terminology, challenging fuzzy concepts, writing ADRs, or updating CONTEXT.md — even if the user says "define our terms". Do NOT use for general code refactoring without domain shifts.
- **engineer-prompts** — Builds or audits testable prompt contracts with explicit outcomes, permissions, tools, evidence, and stop conditions. Use when writing reusable agent prompts, system prompts, or prompts with unclear success criteria.
- **engineering-workflow-guide** — Route engineering, AI/ML, cognitive, or productivity tasks to the narrowest effective specialist skill. Use when a task spans planning, implementation, debugging, review, architecture, research, setup, AI modeling, data remediation, or autonomous goals, when the user asks what to do next, or when unsure which workflow fits — even if they don't explicitly name a skill. Do NOT use when the specific specialist skill is already obvious and unambiguous.
- **execute-durably** — Runs long or interruption-prone work from a durable state file with falsifiable criteria and evidence. Use when work spans turns, risks compaction, or must resume after interruption.
- **executing-plans** — Executes a written implementation plan inline, task by task, stopping only on blockers. Use when a plan exists and subagent dispatch is unavailable, or the user wants the plan executed in a separate session.
- **experience-architect** — Use when a set of candidate Skills or app capabilities is technically valid but still needs to become a clear, useful ChatGPT/Codex Plugin that people can understand, discover, and invoke for real work.
- **finishing-a-development-branch** — Guides integration of a finished branch: verify tests, present merge/PR/keep/discard options to the user, and clean up worktrees. Use when implementation is complete, all tests pass, and the work needs to be integrated.
- **git-safety-guardrails** — Safeguard repositories against destructive, irreversible, or history-rewriting Git operations. Use when running force pushes, hard resets, branch deletions, cleans, destructive restores, or history re-writes — even if the user says "clean up git history". Do NOT use for routine safe git status, fetch, diff, or branch queries.
- **handle-host-boundaries** — Handles unavailable named capabilities and destructive filesystem roots. Use when a required tool, command, picker, dialog, gate, or form may be unavailable; apply before acting even if the prompt asks to assume consent.
- **handoff** — Compact current conversation context, decisions, evidence, and next actions into a portable markdown handoff for a fresh agent session. Use when ending a session, transferring work to another agent, switching workspaces, or preparing a resume point — even if the user just says "save progress". Do NOT use for committing code to git or creating branch PRs.
- **implement** — Build scoped code changes and run verification from an approved specification or plan. Use when a concrete spec, approved plan, or set of tickets is ready to implement, when the user asks to build or code a planned feature, or when executing tasks — even if they don't explicitly say "implement". Do NOT use for initial architecture exploration or vague requirements.
- **implement-spec** — Execute a full specification across task tickets using isolated subagent branches into a unified PR. Use when a specification with associated task-graph tickets is ready to implement across multiple subagents or isolated worktrees, and the goal is a complete pull request on a single branch — even if the user says "build the whole spec". Do NOT use for single isolated bug fixes or exploratory coding without tickets.
- **improve-codebase-architecture** — Survey codebases for shallow modules, weak seams, and deepening opportunities, producing a visual report. Use when conducting architectural reviews, identifying design debt, finding deepening opportunities, or preparing codebase refactors — even if the user says "analyze our architecture". Do NOT use for basic syntax linting or formatting.
- **j-space** — Operate the agent's inner cognitive workspace for multi-step reasoning, long-horizon planning, deep debugging, and calibrated self-monitoring. Use when tackling complex multi-step problems, architecture design, long mechanical tasks requiring goal preservation, suspicious input audits, or when asked to think deeper or harder — even if they don't explicitly say "J-space". Do NOT use for single-step trivial lookups, basic formatting, or conversational small talk.
- **listing-writer** — Use when a validated ChatGPT/Codex Plugin needs accurate Plugin Directory fields, discovery metadata, starter prompts, and reviewer-facing listing details grounded in the packaged product.
- **local-management** — Use when inspecting local plugin identities, dependencies and installation evidence, or comparing installed releases with Git and other catalogs.
- **migrate-to-shoehorn** — Migrate unsafe TypeScript test assertions to @total-typescript/shoehorn with explicit fixture intent. Use when test files contain unsafe `as` or `as unknown as` typecasts, when mock fixtures break under typechecking, or when modernizing test typing — even if the user says "fix test type assertions". Do NOT use for production code types.
- **ml-best-practices** — Statistical machine learning best practices, exploratory data analysis, feature engineering, and rigorous model evaluation. Use when analyzing tabular datasets, engineering features, training classifiers or regressors, forecasting time series, or computing 95% bootstrap confidence intervals — even if they don't explicitly say "ml best practices". Do NOT use for standard database queries without ML, basic spreadsheet formatting, or general application backend logic.
- **modern-web** — Use when building or reviewing Studio HTML reports, responsive tables, accessibility, CSS or client-side browser behavior.
- **prototype** — Build a throwaway prototype to answer a specific design, state model, or UI exploration question. Use when evaluating whether an interface feels right, exploring UI concepts, or testing logic before committing to a full spec — even if the user says "mock this up". Do NOT use for production implementation.
- **python-executor** — Use when a ChatGPT/Codex Plugin workflow needs deterministic computation, file processing, repository checks, package inspection, or other work that should be actually executed with host-native Python instead of answered from unverified reasoning.
- **refactor-safely** — Refactors working or legacy code without changing observable behavior, using characterization tests when needed. Use when code is messy, nested, duplicated, or uncovered.
- **repo-discovery** — Use when an existing repository contains agents, prompts, workflows, playbooks, commands, or Skills and you need to identify which capabilities are worth converting into a ChatGPT/Codex Plugin.
- **research** — Investigate a technical question against high-trust primary sources and capture findings as a cited Markdown note. Use when gathering API facts, reading documentation, verifying library capabilities, or delegating reading legwork — even if the user says "look into this library". Do NOT use for writing production feature code.
- **research-systematically** — Runs source-bound research and version-matched documentation lookup. Use when comparisons, experiments, benchmarks, investigations, or external library, SDK, CLI, and API facts must be verified.
- **resolving-merge-conflicts** — Resolve in-progress git merge or rebase conflicts by intent traced to primary sources. Use when hit with merge conflicts, CONFLICT markers in files, rebase pauses, or when git prompts to resolve conflicted hunks — even if the user just says "fix this merge". Do NOT use for creating new branches or routine rebasing without conflicts.
- **retro** — Conduct a retrospective on a coding session to systematically improve agent environment, navigation pointers, automated checks, coding standards, tool economy, or AGENTS.md instructions. Use when reflecting on completed work, auditing agent mistakes, or optimizing repository rules — even if the user says "run a retro". Do NOT use during active mid-task implementation.
- **scaffold-exercises** — Scaffold course, workshop, or tutorial exercises following repository conventions. Use when creating exercise folders, problem/solution/explainer variants, numbered lesson files, or workshop boilerplate — even if the user says "add a new exercise". Do NOT use for routine application feature scaffolding.
- **setup-engineering-workflows** — Configure repository issue-tracking, triage-label, domain-doc, and agent-instruction conventions. Use when initializing engineering workflows in a repo, configuring GitHub/GitLab issue labels, or establishing CONTEXT.md conventions — even if the user says "setup our workflows". Do NOT use for general project package installs.
- **setup-pre-commit** — Configure pre-commit quality checks with Husky and lint-staged while preserving package manager conventions. Use when setting up git pre-commit hooks, automated formatters, staged linters, or typecheck gates — even if the user says "add pre-commit hooks". Do NOT use for continuous integration (CI) pipeline setup.
- **setup-ts-deep-modules** — Enforce TypeScript package boundaries, entry points, and cyclic dependency rules with dependency-cruiser. Use when structuring monorepo packages, establishing public API entry points, or preventing circular imports — even if the user says "fix TS package boundaries". Do NOT use for non-TypeScript repositories.
- **solve-efficiently** — Routes multi-module work with progressive discovery, matched effort, and context economy. Use when boundaries are unclear, context must stay small, or a durable project map is needed.
- **studio-build** — Use when creating, updating, importing, installing, packaging, releasing or managing plugins and skills with the self-contained Studio: new plugin or skill candidates, safe plugin updates, folder or GPT imports, previewed skill installs, repo-to-plugin autopilot conversion, submission and release checkpoints, portfolio worklists, catalog discovery, and the full skill authoring lifecycle from scratch. Do NOT use for evaluating, reviewing, benchmarking or improving an existing skill (use studio-quality), for general software coding tasks, or for using pre-existing skills.
- **studio-plan** — Use when discovering intent and design before a new feature or behavior change, interviewing or grilling the user to stress-test an idea, plan or decision (even if they just say "grill me" or "poke holes in my plan"), recording domain terms and ADRs while grilling a feature, writing a buildable technical spec, writing an implementation plan, breaking a spec into dependency-linked tickets, turning stakeholder unknowns into a questionnaire, crafting a /goal prompt for unattended autonomous runs, or mapping a massive multi-session project through decision tickets. Do NOT use for executing an existing plan, writing code, or trivial single-file changes the user already specified.
- **studio-quality** — Use when evaluating, auditing, reviewing, explaining, benchmarking or improving an agent skill or plugin: static and benchmark evals, why it scored that way, what to fix first, token budget and real usage, trigger tests, comparing revisions, custom metric packs, deterministic risk scans, behavior reviews, walkthroughs, evidence matrices, autoresearch keep/discard improvement loops, or doctoring conflicting skills, plugins and hooks on the host. Do NOT use for creating, importing, installing, packaging or publishing plugins and skills; use studio-build.
- **studio-review** — Use when reviewing changed code, a branch, diff or pull request against standards and spec intent (even if the user just says "review this"); dispatching a bounded read-only reviewer before merge; receiving review feedback and pushing back with evidence; deciding which parts of a reviewed skill or plugin need human attention; gating any claim that work is complete, fixed or passing on fresh verification output; or independently auditing a finished delivery, completion claim or release readiness. Do NOT use for authoring new code, diagnosing failing runtime bugs, or evaluating skills and plugins (use studio-quality).
- **subagent-driven-development** — Executes an implementation plan by dispatching one subagent per task with per-task review gates, keeping the orchestrator's context small. Use when executing plans with independent tasks in the current session.
- **submission-builder** — Use when an exact ChatGPT/Codex Plugin artifact has passed local package, brand, and listing gates and you need reviewer-ready submission evidence without confusing preparation, submission, approval, and publication states.
- **tdd** — Implement features and bug fixes test-first using red-green-refactor cycles. Use when writing new functionality, adding regression tests, fixing bugs with test coverage, or designing behavior through test assertions — even if the user says "write tests for this". Do NOT use for throwaway exploratory prototypes.
- **teach** — Teach a technical concept interactively using the workspace as an active learning lab with durable learning records. Use when the user asks to understand a codebase concept, learn a language feature, explore design patterns, or practice coding skills — even if they say "explain how this works to me". Do NOT use for silent autonomous code generation.
- **test-driven-development** — Runs a recorded red-green-refactor cycle. Use when implementing a feature, bug fix, or behavior change.
- **triage** — Classify, verify, and prepare external bug reports and feature requests into agent-ready briefs. Use when processing incoming issues, validating bug reproductions, rejecting out-of-scope requests, or structuring contributor tickets — even if the user says "triage these issues". Do NOT use for internal tickets already produced by to-tickets.
- **using-git-worktrees** — Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
- **wait-what** — Re-pitch an explanation or proposal from a simpler angle with reset assumptions and plain English. Use when the previous explanation was confusing, jargon-heavy, or did not land — even if the user just says "what?" or "I don't get it". Do NOT use for general studio-plan discover mode or initial planning.
- **wizard** — Generate an interactive bash wizard to guide humans through manual setup, dashboard, or credential steps. Use when setting up API keys, third-party dashboards, CI secrets, or infrastructure where human authentication is required — even if the user says "create a setup wizard". Do NOT use for steps the AI agent can execute autonomously.
- **workflow-compiler** — Use when a repository has a valuable agentic workflow, prompt chain, playbook, command, or runbook that should become a portable ChatGPT/Codex Skill without losing its real decision logic.
- **workflow-designer** — Specify recurring operational, review, or content workflows with explicit triggers, inputs, actions, and ownership. Use when designing repeatable team routines, approval loops, release checklists, or automated processes — even if the user says "design a workflow for this". Do NOT use for one-off coding tasks.
- **workspace-operator** — Use when a ChatGPT/Codex Plugin workflow needs to inspect, search, modify, or verify files in the host workspace using the safest native tools available.
- **writing-beats** — Develop long-form writing through an interactive progression of narrative and argumentative beats. Use when drafting essays, articles, documentation, or blog posts where structure evolves beat by beat — even if the user says "write this post with me". Do NOT use for quick single-sentence copy edits.
- **writing-for-agents** — Author and refine agent-facing instructions, skills, AGENTS.md files, and context pointers. Use when creating new agent skills, optimizing prompt guidelines, writing steerable docs, or organizing progressive disclosure — even if the user says "write a skill for this". Do NOT use for human-facing marketing copy.
- **writing-fragments** — Capture and refine raw ideas, quotes, and observations before committing to an article outline. Use when collecting source material, studio-plan discover mode essay fragments, or exploring angles without structure pressure — even if the user says "help me brainstorm notes". Do NOT use for final draft formatting.
- **writing-shape** — Shape raw notes, transcript fragments, and research into a structured, coherent article draft. Use when assembling collected fragments into narrative sections, establishing flow, and building a draft block by block — even if the user says "turn these notes into a draft". Do NOT use for initial fragment generation.

## PowerShell Workbench (`powershell-workbench`)

- Version: `0.9.0-beta.7`
- Installs from: `plugins/powershell-workbench` (this repository)
- Exported from: `plugins/powershell-workbench`
- Gemini skill folder: `gemini/skills/powershell-workbench/`
- Purpose: Portable PowerShell and mixed-language scaffolding, refactoring, discovery, agent harnesses, game tooling, and opt-in quality workflows.

- **bash-docs** — Use when researching bash syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **batch-docs** — Use when researching batch syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **cmd-docs** — Use when researching cmd syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **csharp-docs** — Use when researching csharp syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **css-docs** — Use when researching css syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **game-tooling-development** — Use when asked to develop PowerShell-centered game tooling that combines Lua addons, VS Code extensions, Node, .NET, native tools, CASC/game data, or web documentation.
- **html-docs** — Use when researching html syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **javascript-docs** — Use when researching javascript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **json-docs** — Use when researching json syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **lua-docs** — Use when researching lua syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **microsoft-dism-docs** — Use when asked to research DISM.exe, DISM PowerShell cmdlets, Windows image servicing, WIM, VHD, FFU, WinPE, and ADK behavior from official Microsoft documentation.
- **microsoft-update-docs** — Use when asked to research Windows Update, Microsoft Update, UUP, update policy, deployment, troubleshooting, releases, and build history from official Microsoft sources.
- **ollama-docs** — Use when asked to research Ollama API, CLI, model, runtime, tool-calling, structured-output, context, and integration behavior from official Ollama documentation.
- **powershell-agent-harness-development** — Build or review PowerShell orchestration for local or hosted AI models, coding agents, capability registries, evaluations, checkpoints, session exports, and provider switching.
- **powershell-centered-project-development** — Use when asked to develop mixed-language projects where Windows PowerShell 5.1 or PowerShell 7 is the primary automation, orchestration, installation, build, or recovery layer.
- **powershell-checkpoint-resume-contract** — Create and validate fail-closed PowerShell checkpoint and resume contracts for staged workflows without executing servicing, mounting, or recovery operations.
- **powershell-docs** — Use when asked to research PowerShell language, engine, module, compatibility, and tooling questions from official Microsoft documentation with explicit version scope.
- **powershell-environment-bootstrap** — Use when asked to diagnose PowerShell, Codex CLI, Node/npm, Git, GitHub CLI, Docker, winget, and PATH availability on Windows before giving installation or plugin setup commands.
- **powershell-portfolio-discovery** — Use when asked to inventory several explicitly scoped project roots or a project-profile registry and route PowerShell-centered work without scanning entire drives or importing machine-specific paths into the plugin.
- **powershell-project-profile-portal** — Use when asked to show and safely update a portable PowerShell Workbench project profile through a human-readable, color-coded terminal portal.
- **powershell-quality-gate** — Use when asked to run requested PowerShell parser, import, PSScriptAnalyzer, Pester, MegaLinter, or Codex Security checks and report unavailable gates without silently passing them.
- **powershell-refactor** — Use when asked to refactor or optimize PowerShell scripts and modules while preserving behavior, exported commands, safety boundaries, and Windows PowerShell 5.1 plus PowerShell 7 compatibility.
- **powershell-safe-editing** — Use when asked to make precise, low-churn edits to compact, generated, or one-line PowerShell and mixed-language files, and diagnose patch payload, encoding, or invocation failures without executing the patch.
- **powershell-scaffold** — Use when asked to generate, extract and compose registered PowerShell components and mixed-language artifacts through archive-first lookup, dependency contracts, parser IDs and a mandatory pre-execution checkpoint.
- **powershell-workbench-portability** — Package PowerShell Workbench for another project, workstation, laptop, local marketplace, or Git-backed Codex marketplace without embedding machine-specific project paths.
- **python-docs** — Use when researching python syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **recovery-toolkit-development** — Use when asked to develop or review the local RecoveryToolkit using its split-function architecture, contract tests, safe local path rules, and non-executable recovery-media and servicing boundaries.
- **sql-docs** — Use when researching sql syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **toc-docs** — Use when researching WoW TOC metadata, addon load ordering and branch/build-specific manifest behavior for Workbench components.
- **typescript-docs** — Use when researching typescript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **winget-downloader-development** — Use when asked to modernize WingetDownloader with explicit exports, help, tests, structured status, cache integrity, safe paths, and recovery handoff compatibility.
- **xml-docs** — Use when researching xml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.
- **yaml-docs** — Use when researching yaml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Vercel (`vercel`)

- Version: `0.56.0-wrp.3`
- Installs from: `plugins/vercel` (this repository)
- Exported from: `plugins/vercel`
- Gemini skill folder: `gemini/skills/vercel/`
- Purpose: Build and deploy web apps and agents

- **access-protected-vercel-deployment** — Verify a Vercel deployment behind Deployment Protection when the user has authorized inspection and the existing account can access the exact project.
- **agent-browser** — Browser automation CLI for AI agents. Use when the user needs to interact with websites, verify dev server output, test web apps, navigate pages, fill forms, click buttons, take screenshots, extract data, or automate any browser task. Also triggers when a dev server starts so you can verify it visually.
- **agent-browser-verify** — Automated browser verification for dev servers. Triggers when a dev server starts to run a visual gut-check with agent-browser — verifies the page loads, checks for console errors, validates key UI elements, and reports pass/fail before continuing.
- **ai-elements** — AI Elements component library guidance — pre-built React components for AI interfaces built on shadcn/ui. Use when building chat UIs, message displays, tool call rendering, streaming responses, reasoning panels, or any AI-native interface with the AI SDK.
- **ai-gateway** — Vercel AI Gateway guidance for setup, model discovery, authentication, routing, fallbacks, virtual models, evaluation models, BYOK, budgets, spend reporting, observability, compatible APIs, and coding-agent configuration. Use when adding AI Gateway to an app, migrating provider calls, choosing models or providers, centralizing model configuration, evaluating application state, debugging gateway requests, or running `vercel ai-gateway` commands.
- **ai-generation-persistence** — AI generation persistence patterns — unique IDs, addressable URLs, database storage, and cost tracking for every LLM generation
- **ai-sdk** — Vercel AI SDK expert guidance. Use when building AI-powered features — chat interfaces, text generation, structured output, tool calling, agents, MCP integration, streaming, embeddings, reranking, image generation, or working with any LLM provider.
- **auth** — Authentication integration guidance — Clerk (native Vercel Marketplace), Better Auth, Descope, and Auth0 setup for Next.js applications, plus Sign in with Vercel, Vercel Passport, and Vercel KMS. Covers server config, route handlers, proxy.ts auth patterns, sign-in/sign-up flows, and Marketplace provisioning. Use when implementing user authentication, sessions, protected routes, or protecting deployments.
- **bootstrap** — Project bootstrapping orchestrator for repos that depend on Vercel-linked resources (databases, auth, and managed integrations). Use when setting up or repairing a repository so linking, environment provisioning, env pulls, and first-run db/dev commands happen in the correct safe order.
- **build-agents** — Default guidance for building AI agents. Use for generic requests to build, create, scaffold, design, architect, or implement an AI agent, agent app, tool-calling agent, durable agent, multi-agent system, or scheduled agent.
- **cdn-caching** — Use when diagnosing Vercel CDN cache misses, stale responses, revalidation, ISR or per-request cache behavior and cost.
- **chat-sdk** — Vercel Chat SDK expert guidance. Use when building multi-platform chat bots — Slack, Telegram, Microsoft Teams, Discord, Google Chat, GitHub, Linear — with a single codebase. Covers the Chat class, adapters, threads, messages, cards, modals, streaming, state management, and webhook setup.
- **cms** — Headless CMS integration guidance — Sanity (native Vercel Marketplace), Contentful, DatoCMS, Storyblok, and Builder.io. Covers studio setup, content modeling, preview mode, revalidation webhooks, and Visual Editing. Use when building content-driven sites with a headless CMS on Vercel.
- **create-a-backend** — Backend architecture guidance. Use when planning, building, or migrating an API or backend; choosing between Functions, Services, containers, Daemons, Workflow, Queues, and Marketplace databases; or selecting a supported backend framework or runtime.
- **cron-jobs** — Vercel Cron Jobs configuration and best practices. Use when adding, editing, or debugging scheduled tasks in vercel.json.
- **custom-metrics** — Emit and query Vercel Custom Metrics. Use proactively whenever you write or change server code that runs as a Vercel Function (route handlers, API routes, server actions, webhooks, scheduled jobs, queue consumers, AI or external API calls) to record outcomes and latency with metric() from @vercel/functions, even when the user did not ask for metrics. Also use when choosing metric names and attributes or querying emitted values with vc metrics.
- **daemons** — Vercel Daemons guidance — long-running background workers built from a Dockerfile and declared under the `daemons` key in vercel.json. Use when running queue consumers, Celery/Sidekiq/BullMQ workers, workflow workers, or job runners next to an app on Vercel; configuring daemon instances per region, memory, or command; handling SIGTERM; or choosing between Daemons, Functions, Queues, and Workflows.
- **deployments-cicd** — Vercel deployment and CI/CD expert guidance. Use when deploying, promoting, rolling back, inspecting deployments, building with --prebuilt, or configuring CI workflow files for Vercel.
- **domains** — Search, register, connect, transfer, and renew domain names on Vercel using the CLI or Domains Registrar API. Use for domain availability and pricing, custom domains, DNS records, nameservers, ownership verification, and domain orders.
- **email** — Email sending integration guidance — Resend (native Vercel Marketplace) with React Email templates. Covers API setup, transactional emails, domain verification, and template patterns. Use when sending emails from a Vercel-deployed application.
- **env-vars** — Vercel environment variable expert guidance. Use when working with .env files, vercel env commands, Secret or Config variable types, OIDC tokens, or managing environment-specific configuration.
- **eve** — eve framework guidance for durable AI agents and agent-powered applications. Use when creating, editing, or debugging an eve project, when the user explicitly asks for eve, or when the build-agents skill has selected eve as the default framework. Covers eve's filesystem-first runtime, durable sessions, tools, skills, connections, channels, sandboxes, subagents, schedules, evals, frontend clients, and Agent Runs observability. Do not use for incidental agent mentions, generic agent-building prompts, or established non-eve stacks unless the user asks for comparison or migration.
- **flags-sdk** — Implement feature flags in Next.js or SvelteKit code with the Flags SDK (`flags` npm package). Use when installing or configuring the SDK, declaring flags with `flag()`, reading a connected same-team project's flags through Project Connections (`createVercelAdapter({ projectId })`), wiring a provider adapter (`@flags-sdk/vercel`, Statsig, LaunchDarkly, PostHog, GrowthBook, Global Config, OpenFeature, and others), using `identify`, `dedupe`, or `evaluate`, keeping pages static with precompute, setting up Flags Explorer, or encrypting flag values. For planning a flag, Vercel Flags rollouts and experiments, the `vercel flags` CLI, or other frameworks, use the `vercel-flags` skill.
- **geist** — Expert guidance for Geist, Vercel's default typography system and font family for precise Next.js interfaces. Use when configuring Geist Sans, Geist Mono, or Geist Pixel, setting up font imports, or applying Vercel typography and aesthetic guidance.
- **geistdocs** — Expert guidance for Geistdocs, Vercel's documentation template built with Next.js and Fumadocs — MDX authoring, configuration, AI chat, i18n, feedback, deployment. Use when creating documentation sites, configuring geistdocs, writing MDX content, or setting up docs infrastructure.
- **investigation-mode** — Use when a Vercel workflow is stuck or returning errors. Triages logs, workflow state, deployment configuration and browser behavior.
- **is-agentic** — Score how ready a website, domain, or public MCP endpoint is for AI agents using Is Agentic, and read or act on the resulting report. Use when asked to check a site's agent readiness, get its Is Agentic score, fetch a scored report as JSON, or fix the issues that lower a site's score.
- **json-render** — AI chat response rendering guidance — handling UIMessage parts, tool call displays, streaming states, and structured data presentation. Use when building custom chat UIs, rendering tool results, or troubleshooting AI response display issues.
- **knowledge-update** — Use when the task requires current Vercel product behavior or a version-specific API. Verify against the official documentation.
- **marketplace** — Vercel Marketplace expert guidance — discovering, installing, and managing third-party integrations via the `vercel integration` CLI. Use when building any app that needs an external capability without a dedicated skill — commerce (stores, storefronts, selling products), payments (checkout, subscriptions, billing), observability/monitoring, messaging/email, search, or CMS — or when discovering, installing, or managing integrations.
- **micro** — Expert guidance for micro — asynchronous HTTP microservices framework by Vercel. Use when building lightweight HTTP servers, API endpoints, or microservices using the micro library.
- **microfrontends** — Guide for building, configuring, and deploying microfrontends on Vercel. Use this skill when the user mentions microfrontends, multi-zones, splitting an app across teams, independent deployments, cross-app routing, incremental migration, composing multiple frontends under one domain, microfrontends.json, @vercel/microfrontends, the microfrontends local proxy, or path-based routing between Vercel projects. Also use when the user asks about shared layouts across projects, navigation between microfrontends, fallback environments, asset prefixes, or feature flag controlled routing.
- **ncc** — Expert guidance for @vercel/ncc — a simple CLI for compiling Node.js modules into a single file with all dependencies included. Use when bundling serverless functions, CLI tools, or any Node.js project into a self-contained file.
- **next-cache-components** — Next.js 16 Cache Components guidance — PPR, use cache directive, cacheLife, cacheTag, updateTag, and migration from unstable_cache. Use when implementing partial prerendering, caching strategies, or migrating from older Next.js cache patterns.
- **next-forge** — next-forge expert guidance — production-grade Turborepo monorepo SaaS starter by Vercel. Use when working in a next-forge project, scaffolding with `npx next-forge init`, or editing @repo/* workspace packages.
- **next-upgrade** — Upgrade Next.js to the latest version following official migration guides and codemods. Use when upgrading Next.js versions, running codemods, or migrating between major releases.
- **nextjs** — Next.js App Router expert guidance. Use when building, debugging, or architecting Next.js applications — routing, Server Components, Server Actions, Cache Components, layouts, middleware/proxy, data fetching, rendering strategies, and deployment on Vercel.
- **observability** — Vercel Observability expert guidance — Drains (logs, traces, speed insights, web analytics), Web Analytics, Speed Insights, runtime logs, custom events, OpenTelemetry integration, and monitoring dashboards. Use when instrumenting, debugging, or optimizing application performance and user experience on Vercel.
- **offload-to-sandbox** — Run CI, builds or test shards in an existing authorized Vercel Sandbox, or plan a sandbox run when the project, files and spending limit still need to be approved.
- **payments** — Stripe payments integration guidance — native Vercel Marketplace setup, checkout sessions, webhook handling, subscription billing, and the Stripe SDK. Use when implementing payments, subscriptions, or processing transactions.
- **queues** — Vercel Queues guidance — durable topics with at-least-once delivery, independent consumer groups, retries, delays, and idempotency keys via @vercel/queue (JS) or vercel-queue (Python). Use when deferring background work, buffering traffic, fanning out events, or choosing between Queues and Workflows.
- **react-best-practices** — Vercel's React and Next.js performance rules (70 rules in 8 categories ordered by impact - eliminating waterfalls, bundle size, server-side performance, client-side data fetching, re-renders, rendering performance, JavaScript performance, and advanced patterns). Use when writing, reviewing, or refactoring React components, Next.js pages, or data fetching for performance. Not an accessibility or TypeScript style guide.
- **routing-middleware** — Vercel Routing Middleware guidance — request interception before cache, rewrites, redirects, personalization. Works with any framework. Supports Edge, Node.js, Bun, and Python runtimes. Use when intercepting requests at the platform level.
- **runtime-cache** — Vercel Runtime Cache API guidance — ephemeral per-region key-value cache with tag-based invalidation. Shared across Functions, Routing Middleware, and Builds. Use when implementing caching strategies beyond framework-level caching.
- **satori** — Expert guidance for Satori — Vercel's library that converts HTML and CSS to SVG, commonly used to generate dynamic OG images for Next.js and other frameworks.
- **shadcn** — shadcn/ui expert guidance — CLI, component installation, composition patterns, custom registries, theming, Tailwind CSS integration, and high-quality interface design. Use when initializing shadcn, adding components, composing product UI, building custom registries, configuring themes, or troubleshooting component issues.
- **sign-in-with-vercel** — Sign in with Vercel guidance — OAuth 2.0/OIDC identity provider for user authentication via Vercel accounts. Use when implementing user login with Vercel as the identity provider.
- **swr** — SWR data-fetching expert guidance. Use when building React apps with client-side data fetching, caching, revalidation, mutations, optimistic UI, pagination, or infinite loading using the SWR library.
- **turbopack** — Turbopack expert guidance. Use when configuring the Next.js bundler, optimizing HMR, debugging build issues, or understanding the Turbopack vs Webpack differences.
- **turborepo** — Turborepo expert guidance. Use when setting up or optimizing monorepo builds, configuring task caching, remote caching, parallel execution, or the --affected flag for incremental CI.
- **v0-dev** — v0 by Vercel expert guidance. Use when discussing AI code generation, generating UI components from prompts, v0 CLI usage, v0 SDK/API integration, or integrating v0 into development workflows with GitHub and Vercel deployment.
- **vercel-agent** — Vercel Agent guidance — dashboard and Slack chat, code review, Security Review, production investigation, approved actions, and product installation. Use when configuring or working with Vercel's AI assistant.
- **vercel-api** — Vercel app and REST API expert guidance. Use when the agent needs live access to Vercel projects, deployments, environment variables, domains, logs, or documentation through the connected Vercel app or REST API.
- **vercel-cli** — Vercel CLI expert guidance. Use when deploying, managing environment variables, linking projects, viewing logs, querying metrics, debugging a deployed app on Vercel (errors, 5xx responses, timeouts, slow routes, or a single failing request), managing domains, managing feature flags with vercel flags, reviewing security checks or Security Review vulnerabilities with vercel security, or interacting with the Vercel platform from the command line. Use the vercel-tracing skill instead for `vercel traces` span search, trace inspection, and sampling rules, or for OpenTelemetry setup.
- **vercel-connect** — Vercel Connect expert guidance for securely obtaining scoped credentials for third-party services on behalf of apps or users. Use when wiring up provider API access, OAuth, API-key services, MCP servers, triggers, framework adapters, eve agent connections, or provider tokens for Passport-authenticated users.
- **vercel-firewall** — Vercel Firewall expert guidance — automatic DDoS mitigation, the Vercel WAF (custom rules, IP blocking, managed rulesets, rate limiting), Attack Mode, system bypass, bot management, and the `vercel firewall` CLI. Use when configuring platform-level security, responding to attacks, or staging firewall rules.
- **vercel-flags** — Feature flags, A/B tests, and gradual rollouts with Vercel Flags, in any app or framework. Use whenever the user is planning, adding, changing, or cleaning up a feature flag, toggle, kill switch, experiment, percentage rollout, or targeting rule, or wants to gate or hide a feature for some users, even before a library or provider is chosen. Covers choosing an integration (Flags SDK, `@vercel/flags-core`, OpenFeature), the Vercel dashboard, the `vercel flags` CLI (create, inspect, set, split, rollout, rules, segments, evaluations, archive, connections), Project Connections, OIDC vs SDK keys, `FLAGS_SECRET`, and Flags Explorer overrides. For `flag()` declarations, adapters, precompute, and the Flags Explorer endpoint in Next.js or SvelteKit code, load the `flags-sdk` skill.
- **vercel-functions** — Vercel Functions expert guidance — Node.js/Bun/Python runtimes, Fluid Compute, long-duration (30 min) functions, large functions (5 GB bundles), Docker/OCI container images, plan limits, streaming, WebSockets, and legacy Cron Jobs (new scheduled work belongs to vercel-schedules). Use when configuring, debugging, or optimizing server-side code running on Vercel.
- **vercel-queues** — Vercel Queues guidance (public beta) — durable event streaming with topics, consumer groups, retries, and delayed delivery. $0.60/1M ops. Powers Workflow DevKit. Use when building async processing, fan-out patterns, or event-driven architectures.
- **vercel-sandbox** — Vercel Sandbox guidance — ephemeral Firecracker microVMs for running untrusted code safely. Supports AI agents, code generation, and experimentation. Use when executing user-generated or AI-generated code in isolation.
- **vercel-schedules** — Vercel Schedules guidance — run a private function, route, or Vercel Queues topic on a cron cadence or once at a set time. Covers static schedules in vercel.json, dynamic per-user schedules with @vercel/schedules, handleSchedule, the vercel schedules CLI, environments, jitter, and migrating from Cron Jobs. Use when adding scheduled or recurring work, one-time reminders, or replacing `crons`.
- **vercel-services** — Configure and troubleshoot Vercel Services for multiple frontends and backends in one project. Use when composing a polyglot or multi-service application on one Vercel deployment; defining the `services` key, service-targeted rewrites, or service bindings in `vercel.json`; or running all services with `vercel dev`.
- **vercel-storage** — Vercel storage expert guidance — Blob, Global Config (formerly Edge Config), and Marketplace storage (Neon Postgres, Upstash Redis). Use when choosing, configuring, or using data storage with Vercel applications.
- **vercel-tracing** — Set up OpenTelemetry instrumentation for Vercel Tracing and query the resulting spans. Use when adding or fixing `@vercel/otel`, wiring a framework's server startup hook (Next.js, SvelteKit, and others), adding custom spans, turning on spans from libraries such as the AI SDK, Flags SDK, or database clients, propagating trace context between services, configuring always-on tracing sampling, searching or inspecting spans with `vercel traces`, or debugging failed or slow server requests.
- **verification** — Use when verifying a Vercel application end to end across the browser, API, data and response, or when diagnosing a failing user flow.
- **workflow** — Vercel Workflow SDK expert guidance. Use when building durable workflows, long-running tasks, API routes or agents that need pause/resume, retries, step-based execution, or crash-safe orchestration with Vercel Workflow.

## Windows Dism Update Docs (`windows-dism-update-docs`)

- Version: `0.1.4`
- Installs from: `plugins/windows-dism-update-docs` (this repository)
- Exported from: `plugins/windows-dism-update-docs`
- Gemini skill folder: `gemini/skills/windows-dism-update-docs/`
- Purpose: Local Windows servicing knowledge assistant for DISM, .NET, Defender, ESU and Home/Pro integration evidence.

- **windows-dism-update-docs** — Find, verify and maintain Windows DISM and update-integration documentation for WindowsMaintainanceToolkit, including Windows 10 Home/Pro, .NET, Defender, ESU and setup automation. Use for source audits, integration requirements and interpreting servicing or VM evidence; not as authorization to install updates or modify images.

## WinRecoveryProject DevSuite (`winrecoveryproject-devsuite`)

- Version: `0.4.0`
- Installs from: `plugins/winrecoveryproject-devsuite` (this repository)
- Exported from: `plugins/winrecoveryproject-devsuite`
- Gemini skill folder: `gemini/skills/winrecoveryproject-devsuite/`
- Purpose: One development toolkit for planning, coding, security, testing, local processes and registered Codex tasks.

- **devsuite** — Use when development spans planning, implementation, security, verification, coordination, cloud work or conversion and needs one integrated workflow.
- **devsuite-convert** — Use for authorized file conversion through free/included CloudConvert or installed local tools, with verified output and no added charges.
- **devsuite-debug** — Use when observed software behavior differs from its expected contract and needs reproduction, root-cause diagnosis or an authorized fix.
- **devsuite-environment** — Use for local/cloud development, repositories, packages, Docker, networking/VPN, desktop testing and environment repair.
- **devsuite-handoff** — Use when development was interrupted and must resume, or when the user requests an evidence-based session handoff and precise next step.
- **devsuite-implement** — Use when authorized to implement, refactor, migrate or maintain software with bounded changes and fresh evidence.
- **devsuite-jobs** — Use when running or inspecting finite local builds, tests and background processes with exact job ownership; Windows uses real host sessions.
- **devsuite-planning** — Use for scoped project planning, architecture, concise AGENTS.md instructions, task-boundary coordination or project board lifecycle; discovering intent and design before a new feature; interviewing or grilling the user to stress-test an idea, plan or decision (even if they just say "grill me" or "poke holes in my plan"); recording domain terms and ADRs; writing a buildable technical spec or an implementation plan; breaking a spec into dependency-linked tickets; turning stakeholder unknowns into a questionnaire; crafting a /goal prompt for unattended autonomous runs; or mapping a massive multi-session project through decision tickets. Do NOT use for executing an existing plan, writing code, or trivial single-file changes the user already specified.
- **devsuite-review** — Use for independent code review of a branch, diff or pull request against standards and spec intent (even if the user just says "review this"); immutable patch risk assessment and release readiness; specification and quality verdicts; dispatching a bounded read-only reviewer before merge; receiving review feedback and pushing back with evidence; deciding which reviewed parts need human attention; gating any claim that work is complete, fixed or passing on fresh verification output, or independently auditing a finished delivery; and one shared quality gate: tests, lint/type/build gates and existing Linter or MegaLinter integration. Do NOT use for authoring new code or diagnosing failing runtime bugs.
- **devsuite-security-assess** — Use for repository or diff security audits, threat models, discovery, static triage, attack paths and controlled validation.
- **devsuite-security-fix** — Use when fixing security findings, verifying remediation, proposing hardening, writing policy/disclosures or tracking validated findings.
- **devsuite-tasks** — Use to discover registered Codex environments or inspect and, when explicitly requested, create or continue a durable remote Codex task.
- **devsuite-test** — Use for feature testing, broad QA, user journeys, regression checks and evidence-based verification.

## WinRecoveryProjectLinter (`winrecoveryproject-linter`)

- Version: `0.1.6`
- Installs from: `plugins/winrecoveryproject-linter` (this repository)
- Exported from: `plugins/winrecoveryproject-linter`
- Gemini skill folder: `gemini/skills/winrecoveryproject-linter/`
- Purpose: Local read-only linting for selected source types with visible coverage, pinned tools and no paid services.

- **lint-project** — Use when linting a local project's selected source types without executing scripts or changing source, with real parser findings and explicit coverage gaps.
- **setup-linters** — Use when explicitly setting up the locally detected or selected pinned linter tools, with no paid service and no global configuration changes.

## Zilvereyes Context Handoff (`zilvereyes-context-handoff`)

- Version: `0.3.5+zilvereyes.1`
- Installs from: `plugins/zilvereyes-context-handoff` (this repository)
- Exported from: `plugins/zilvereyes-context-handoff`
- Gemini skill folder: `gemini/skills/zilvereyes-context-handoff/`
- Purpose: Zilvereyes Context Handoff: MIT-derived personal candidate with preserved provenance and evidence-led workflows.

- **zilvereyes-context-handoff** — Detect context-window pressure and transfer an in-progress Codex task into a fresh thread without weakening acceptance criteria or evidence. Use automatically when a Context Handoff lifecycle message reports compaction, and whenever the user asks to hand off, continue in a new session or thread, avoid context overflow, or an active task shows high context usage, compaction, summary reliance, lost decisions, repeated rereads, or context-caused rework. Supports cross-repository use, safe checkpointing, validated handoff packets, Codex thread creation and navigation when authorized, and destination regression sentinels.
