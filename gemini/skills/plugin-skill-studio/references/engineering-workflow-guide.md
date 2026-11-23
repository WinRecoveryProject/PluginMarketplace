# Skill: engineering-workflow-guide

- Plugin: `plugin-skill-studio` (0.9.0)
- Source: `plugins/plugin-skill-studio/skills/engineering-workflow-guide/SKILL.md`

> Route engineering, AI/ML, cognitive, or productivity tasks to the narrowest effective specialist skill. Use when a task spans planning, implementation, debugging, review, architecture, research, setup, AI modeling, data remediation, or autonomous goals, when the user asks what to do next, or when unsure which workflow fits — even if they don't explicitly name a skill. Do NOT use when the specific specialist skill is already obvious and unambiguous.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Engineering Workflow Guide

Centrally analyze tasks, classify developer intent, and route engineering workflows to the narrowest, highest-leverage specialist skill across the curated skill catalog.

---

#### Core Invariants

1. **Narrowest Effective Skill**: Select the most specific skill that fully covers the task; avoid invoking broad, ceremonial meta-skills when a focused tool exists.
2. **One Primary Skill per Phase**: Designate exactly one primary specialist skill for the current turn; chain secondary skills only across distinct lifecycle gates (e.g. Planning $\rightarrow$ Implementation $\rightarrow$ Review).
3. **No Unpackaged Ghost Skills**: Every routed skill must exist verbatim in `references/catalog.md` and have an established `SKILL.md`.
4. **Fast-Path User Overrides**: If the user explicitly requests a valid skill by name, honor it immediately without redundant routing deliberation.
5. **Setup Pre-Requisite Check**: If repository issue tracking, triage labels, or domain docs are unconfigured, run `setup-engineering-workflows` prior to planning or triage.

---

#### Architecture & Map of Content (MOC)

```
[ Developer Intent / Request ]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│ 1. Intent Classification & Catalog Lookup               │
│    (Match job against `references/catalog.md`)          │
└──────────────────────────┬─────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
[ Discovery & Plan ]   [ Code & Architecture ]   [ AI, ML & Automation ]
- `studio-plan` (interview mode)    - `studio-execute` (implement mode)             - `ai-engineering`
- `studio-plan` (spec mode)            - `studio-review` (code mode)           - `ai-data-remediation`
- `studio-plan` (tickets mode)         - `studio-debug` (loop mode) - `ml-best-practices`
- `studio-plan` (map mode)          - `domain-modeling`       - `j-space`
- `prototype`          - `setup-ts-deep-modules` - `studio-plan` (goal mode)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Lifecycle Route Execution                           │
│    (State route briefly, invoke primary skill)         │
└────────────────────────────────────────────────────────┘
```

| Router Reference | Responsibility | File Location |
|---|---|---|
| **Skill Catalog** | Exhaustive index of all 42 packaged skills | [references/catalog.md](engineering-workflow-guide.md#file-referencescatalogmd) |
| **ChatGPT Routing Contract** | Runtime consumption & anti-hallucination protocol | [references/chatgpt-routing-contract.md](engineering-workflow-guide.md#file-referenceschatgpt-routing-contractmd) |
| **Routing Matrix** | 100+ intent patterns, triggers, and exclusions | [references/routing-matrix.md](engineering-workflow-guide.md#file-referencesrouting-matrixmd) |
| **Phase Boundaries** | Decision tree for `/clear`, `/compact`, `/handoff`, and subagents | [PHASE-BOUNDARIES.md](engineering-workflow-guide.md#file-phase-boundariesmd) |

| Lifecycle Scenario | Canonical Route Pipeline |
|---|---|
| **Fuzzy Greenfield Feature** | `studio-plan` (interview mode) $\rightarrow$ `studio-plan` (spec mode) $\rightarrow$ `studio-plan` (tickets mode) $\rightarrow$ `studio-execute` (implement mode) |
| **Hard Bug or Regression** | `studio-debug` (loop mode) $\rightarrow$ `tdd` |
| **Pull Request Review** | `studio-review` (code mode) (Two-axis: Standards & Spec) |
| **Deep Module Restructuring** | `improve-codebase-architecture` $\rightarrow$ `setup-ts-deep-modules` |
| **Large Multi-Session Map** | `studio-plan` (map mode) $\rightarrow$ `studio-plan` (spec mode) $\rightarrow$ `studio-plan` (tickets mode) |
| **Deep Multi-Step Reasoning** | `j-space` (Cognitive registers & seam audits) |
| **Autonomous Unattended Goal** | `studio-plan` (goal mode) (7-part prompt contract) |
| **Production ML / LLM System** | `ai-engineering` $\rightarrow$ `ml-best-practices` |
| **Self-Healing Data Pipeline** | `ai-data-remediation` |
| **Long-Form Writing & Essays** | `writing-fragments` $\rightarrow$ `writing-shape` / `writing-beats` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Ingest Request and Consult Catalog
- **Action**: Read `references/catalog.md` and classify the user's underlying intent, not just raw keywords.
- **Key Point**: Check whether repository setup is complete (`docs/agents/issue-tracker.md`).
- **Why**: Accurate intent classification ensures the agent doesn't jump into code when requirements are undefined.

##### Step 2: Formulate the Narrowest Route
- **Action**: Select the single primary specialist skill and state the multi-phase roadmap in 1–2 lines.
- **Inline Checklist**:
  - [ ] Target skill verified in `references/catalog.md`
  - [ ] Zero overlapping meta-skills invoked
  - [ ] Distinct lifecycle phases separated cleanly

##### Step 3: Execute Primary Phase
- **Action**: Invoke the selected skill instructions and proceed directly to execution.
- **Why**: Direct transition eliminates conversational overhead.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Invoke 4 skills at once for a single simple change."* | **Enforce 1 primary skill per lifecycle phase.** | Overlapping skill prompts create conflicting instructions and waste context budget. |
| *"Invent a new custom workflow name not in catalog."* | **Route exclusively to packaged skills in `catalog.md`.** | Routing to non-existent skills causes execution failures. |
| *"Overrule the user's explicit skill invocation."* | **Honor user-requested skill unless hard conflict exists.** | Respect developer intent and operational autonomy. |

## Bundled files

### File: `PHASE-BOUNDARIES.md`

#### Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. The definition is fuzzy on purpose: a phase ends when you think *"ok, we're done with that"*.

The **phase boundary** is the gap between two phases, and it is the only place this decision belongs. Mid-phase there is no decision to make: continue, or split the work that's left into subagents. Compacting mid-phase makes the agent lose the thread.

##### The five options

| Option       | What it does                                                    |
| ------------ | --------------------------------------------------------------- |
| **Continue** | Stay in the session. No context switch at all.                    |
| **`/clear`** | Empty the context window and start from nothing.                  |
| **`/handoff`** | Write a portable markdown file and seed a session anywhere with it. |
| **Subagent** | Send the task to its own context window and get a report back.     |
| **`/compact`** | Compress this context and seed a fresh session with the summary.  |

##### The tree

Work top to bottom at the boundary. The first **yes** wins.

**1. Can you continue in this session?** Two things make the answer yes: the next phase needs this phase as a **primary source**, or you have enough [smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone) left (~150k tokens) for the next phase to fit. Grilling → implementation is the standard yes: the implementation wants the reasoning verbatim, not a summary of it. Continue costs nothing and loses nothing, so rule it out before anything else.

**2. Is the context irrelevant to what comes next?** Is everything in this session (the exploration, the decisions, the dead ends) disposable? If so, **`/clear`**. It is the cheapest move on the board: it takes no time and hands back the whole window. `/clear` also isn't terminal: the old session stays resumable.

The cost of getting this wrong is one-way. Clear a *relevant* context and you lose the **why** behind what you built, and no amount of reading the diff back gets it returned.

**3. Do you need to hand off?** `/handoff` is narrow. You need it only when you are:

- swapping to a **new harness** (Claude → Codex),
- moving to a **new directory** or repo,
- sending the work to a **colleague**,
- or forking a side task you found **mid-phase** without derailing what you're doing.

That list is the whole clause. What `/handoff` buys is **portability**: a file that travels. If nothing is travelling, you don't need it.

**4. Can the task be done AFK?** Is it scoped tightly enough to run with you away from the keyboard, no steering? Then send it to a **subagent** and leave this session untouched. Automated review is the standard case: the agent reads the diff and reports, and you aren't needed while it does.

**5. Otherwise, `/compact`.** Relevant context, same harness, same directory, and you need to stay in the loop: this is where the tree lands, and it lands here often. Pass it an instruction (`/compact we're going to QA this area`) so the summary keeps what the next phase needs.

`/compact` is the **default, not the first reach**. It sits at the bottom because the four questions above it are all cheaper or more precise. The failure mode when people start here is a fresh session that is confidently wrong about a decision the summary flattened.

##### Primary and secondary sources

Every move except **Continue** turns a **primary source** into a **secondary source**: the session as it happened, replaced by a summary of it. The trade is always the same shape:

| Source                            | Information | Noise | Room to move |
| --------------------------------- | ----------- | ----- | ------------ |
| Primary (Continue)                | Full        | Lots  | Little       |
| Secondary (`/compact`, `/handoff`) | Lossy       | Less  | Lots         |

This is why question 1 comes first. You only pay the lossiness when staying costs more than it saves.

##### These are judgement calls

The questions are not objective: each has taste in it, and the same boundary can go two ways on two days. The value is in asking them **in order**, at the boundary rather than in the middle of the work.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Engineering Workflow Guide"
  short_description: "Route work to the right skill"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `references/catalog.md`

#### Curated Skill Catalog

Use one primary skill by default. Add another only for a distinct phase.

##### Discovery and planning

- `studio-plan` (interview mode): Use when a plan or design needs a focused interview and the resulting domain terms or architectural decisions should be captured in project documentation as they are resolved.
- `studio-plan` (interview mode): Use when a plan, design, requirement, or decision needs a focused interview to expose ambiguity, missing constraints, trade-offs, or weak assumptions before execution.
- `studio-plan` (interview mode): Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
- `studio-plan` (spec mode): Use when the current conversation and repository context are sufficient to synthesize a buildable specification without another interview, including implementation and testing decisions.
- `studio-plan` (tickets mode): Use when an approved plan, spec, or current conversation should be decomposed into ordered tracer-bullet implementation tickets with explicit dependencies on the configured tracker.
- `studio-plan` (map mode): Use when a goal is too large or uncertain for one agent session and needs a shared map of decision tickets, blockers, claims, and resolved context across multiple sessions.
- `prototype`: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
- `research`: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
- `studio-plan` (questions mode): Use when a decision, spec, or implementation question depends on facts only another stakeholder can provide and those unknowns should be turned into a precise questionnaire.
- `workflow-designer`: Use when a recurring task, operational routine, content process, review loop, or personal/team workflow should be turned into an implementable specification with triggers, inputs, actions, human checkpoints, outputs, failure handling, and ownership.

##### Implementation and quality

- `studio-execute` (implement mode): Use when a concrete spec, approved plan, or set of tickets is ready to implement and the task requires scoped code changes plus verification.
- `studio-execute` (spec-run mode): Use when a specification with associated task-graph tickets is ready to implement across multiple subagents or isolated branches, and the goal is a complete pull request on a single branch.
- `tdd`: Use when implementing a feature or fixing a bug test-first with a red-green cycle, or when the task needs durable integration-style tests around public behavior.
- `studio-review` (code mode): Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes - Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
- `studio-debug` (loop mode): Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
- `studio-git` (conflicts mode): Use when you need to resolve an in-progress git merge/rebase conflict.
- `migrate-to-shoehorn`: Use when TypeScript tests rely on unsafe `as` or `as unknown as` assertions for fixtures and the user wants to migrate those test-only values to `@total-typescript/shoehorn` with explicit intent.

##### AI and Machine Learning

- `ai-engineering`: Design, train, fine-tune, optimize, and serve production ML models and LLMs with strict train-test isolation, naive baselines, fairness audits, and sub-100ms latency budgets.
- `ai-data-remediation`: Self-healing data pipeline layer using semantic anomaly clustering, AST-validated lambda transformations, and zero-loss mathematical reconciliation.
- `ml-best-practices`: Statistical ML standards for exploratory data analysis, missing value strategy, dual-model benchmarks, 95% bootstrap confidence intervals, and story-first notebook structures.

##### Cognitive and Autonomous Orchestration

- `j-space`: Operate the inner cognitive workspace for multi-step chained reasoning, long-horizon planning, calibrated confidence, three registers (inner/ledger/outer), and seam invariant audits.
- `studio-plan` (goal mode): Synthesize high-leverage autonomous /goal prompts and contracts with observable done criteria, verified resource inventories, and terminal goal anchoring for unattended execution.
- `skill-conductor`: Full lifecycle management for agent skills (draft, test, review, improve, package) using the 10 canonical authoring principles and BinEval 5-dimension scoring.

##### Design and architecture

- `domain-modeling`: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
- `codebase-design`: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
- `improve-codebase-architecture`: Use when a codebase needs architectural review for shallow modules, weak seams, low locality, or deepening opportunities, followed by a visual report and focused design discussion.
- `setup-ts-deep-modules`: Use when a TypeScript repository should enforce package entry points, hidden implementation folders, tests through public interfaces, and cycle checks with dependency-cruiser, especially in a flat packages directory or monorepo.

##### Repository safety and setup

- `setup-engineering-workflows`: Use when repository workflows need explicit issue-tracker, triage-label, domain-document, or agent-instruction conventions before planning, triage, wayfinding, or ticket work can run reliably.
- `setup-pre-commit`: Use when a JavaScript or TypeScript repository needs reliable pre-commit quality checks with Husky and lint-staged, while preserving the repository's package manager, formatter, existing hooks, and test/typecheck conventions.
- `studio-git` (safety mode): Use when a repository needs explicit safeguards around destructive or irreversible Git operations, especially force pushes, hard resets, cleans, destructive restores, branch deletion, or history rewrites.
- `studio-debug` (triage mode): Use when repository issues or external contribution requests need classification, verification, missing-information follow-up, rejection handling, or a durable agent-ready implementation brief.
- `wizard`: Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.

##### Continuity and communication

- `handoff`: Use when the current work, decisions, evidence, blockers, and next actions need to be compacted into a durable handoff for another agent or a later session.
- `retro`: Use when conducting a retrospective on a coding session to identify actionable improvements to the agent environment, navigation pointers, automated checks, coding standards, tool economy, or AGENTS.md instructions.
- `wait-what`: Use when the previous explanation or proposal did not land and should be re-pitched from a different angle, with assumptions reset and the confusing part made explicit.
- `teach`: Use when the user wants to learn a technical concept or skill from the current workspace through an adaptive explanation, examples, checks for understanding, and durable learning records.
- `writing-for-agents`: Use when creating or editing agent-facing Skills, AGENTS.md or CLAUDE.md instructions, referenced agent documents, context pointers, templates, or other reusable guidance consumed by an agent.

##### Writing and learning content

- `writing-fragments`: Use when the user wants to develop an article, essay, post, script, or other long-form piece by first collecting strong raw fragments without committing to an outline or final structure.
- `writing-shape`: Use when the user has a fixed pile of notes, fragments, transcript material, or research and wants to shape it into a coherent article or long-form draft one block at a time without altering the source material.
- `writing-beats`: Use when the user wants an interactive long-form writing process that progresses through small narrative or argumentative beats, offering a few valid next moves at each step while keeping the reader's required context clear.
- `scaffold-exercises`: Use when a course, workshop, tutorial, or training repository needs new exercise folders, problem/solution/explainer variants, starter files, numbering, or lint-ready scaffolding that follows the repository's own conventions.

### File: `references/chatgpt-routing-contract.md`

#### ChatGPT & Codex Skill Routing Contract

This document specifies the authoritative runtime protocol for ChatGPT and Codex when consuming, executing, and transitioning between skills in the `matt-skills-curated` plugin pack.

---

##### 1. The ChatGPT Consumption Protocol

When a user interacts with ChatGPT / Codex, follow this strict 4-step execution lifecycle:

```
[ User Request ] ──► [ Step 1: Route & Select Primary Skill ]
                                  │
                                  ▼
                     [ Step 2: Ingest SKILL.md Core Invariants ]
                                  │
                                  ▼
                     [ Step 3: Execute Phase Procedures (TWI) ]
                                  │
                                  ▼
                     [ Step 4: Phase Handshake & Next Route ]
```

###### Step 1: Route & Select Exactly One Primary Skill
- **Action**: Match the user's intent against `references/catalog.md` and `references/routing-matrix.md`.
- **Constraint**: Designate **ONE primary specialist skill** for the current turn.
- **Rule**: Do NOT invoke multiple skills simultaneously for a single phase.

###### Step 2: Ingest `SKILL.md` and Core Invariants
- **Action**: Read the target skill's `SKILL.md` completely.
- **Constraint**: Immediately internalize the **Core Invariants** and **Anti-Rationalization Guardrails**.
- **Rule**: Never skip to code execution without verifying pre-flight prerequisites and public seams.

###### Step 3: Execute Step-by-Step Procedures (TWI)
- **Action**: Follow the Training Within Industry (TWI) steps: **Action**, **Key Point**, and **Why**.
- **Constraint**: Obey inline risk checklists (`- [ ]`) at every seam.
- **Rule**: Present clean, human-facing deliverables without dumping internal thought fragments.

###### Step 4: Phase Handshake & Next Route
- **Action**: Conclude each phase with a checkable completion bound and announce the subsequent phase in the lifecycle pipeline.
- **Example**: After finishing `studio-plan` (interview mode), announce transition to `studio-plan` (spec mode).

---

##### 2. Standard Multi-Phase Lifecycles

| Scenario | Canonical Multi-Phase Pipeline | Phase Transition Trigger |
|---|---|---|
| **Greenfield Feature** | `studio-plan` (interview mode) ➔ `studio-plan` (spec mode) ➔ `studio-plan` (tickets mode) ➔ `studio-execute` (implement mode) ➔ `studio-review` (code mode) | User approves spec & ticket graph |
| **Bug / Regression** | `studio-debug` (loop mode) ➔ `tdd` ➔ `studio-review` (code mode) | Red failure reproduced & minimal repro isolated |
| **Wide Refactoring** | `improve-codebase-architecture` ➔ `setup-ts-deep-modules` ➔ `studio-review` (code mode) | Visual architecture report approved |
| **AI / ML Initiative** | `ai-engineering` ➔ `ml-best-practices` ➔ `studio-review` (code mode) | Naive baseline beaten & 95% CIs verified |
| **Massive Initiative** | `studio-plan` (map mode) ➔ `studio-plan` (spec mode) ➔ `studio-plan` (tickets mode) ➔ `studio-execute` (spec-run mode) | Fog cleared & frontier tickets claimed |
| **Long-Form Essay** | `writing-fragments` ➔ `writing-shape` ➔ `writing-beats` | Raw pile assembled & candidate openings chosen |

---

##### 3. ChatGPT Anti-Hallucination Guardrails

1. **No Phantom Skills**: ChatGPT must NEVER invent skill names not present in `references/catalog.md`.
2. **No Unasked Scope Drift**: Implement strictly what the approved specification mandates.
3. **No Blind Approvals**: If a requirement is missing or contradictory, halt and clarify with `studio-plan` (interview mode) or `studio-plan` (questions mode).
4. **Zero Leaked Secrets**: Never echo private API keys, tokens, or environment passwords.

### File: `references/routing-matrix.md`

#### ChatGPT Skill Routing Matrix

This matrix maps common user prompts and engineering intents to the exact primary skill, secondary pipeline, and negative exclusions.

---

| User Intent / Phrasing | Primary Skill | Lifecycle Pipeline | Do NOT Use When |
|---|---|---|---|
| "Explore ideas", "Interview me", "Poke holes in my plan" | `studio-plan` (interview mode) | `studio-plan` (interview mode) ➔ `studio-plan` (spec mode) | Requirements already formal & clear |
| "Capture decisions into ADR", "Define domain terms" | `studio-plan` (interview mode) | `studio-plan` (interview mode) ➔ `studio-plan` (spec mode) | Writing production application code |
| "Write a technical spec", "Formalize requirements" | `studio-plan` (spec mode) | `studio-plan` (spec mode) ➔ `studio-plan` (tickets mode) | Spec already written & approved |
| "Break down into tickets", "Create task graph", "Tracer bullets" | `studio-plan` (tickets mode) | `studio-plan` (tickets mode) ➔ `studio-execute` (implement mode) | Requirements ambiguous or unapproved |
| "Ask stakeholder questions", "Async requirements survey" | `studio-plan` (questions mode) | `studio-plan` (questions mode) ➔ `studio-plan` (spec mode) | Information already in repository |
| "Quick prototype", "UI spike", "Throwaway exploration" | `prototype` | `prototype` ➔ `studio-plan` (interview mode) | Building permanent production features |
| "Design operational process", "Write SOP", "Review loop" | `workflow-designer` | `workflow-designer` ➔ `studio-plan` (spec mode) | One-off manual script execution |
| "Research third-party API", "Investigate documentation" | `research` | `research` ➔ `studio-plan` (spec mode) | Reading local project code files |
| "Define entity models", "Ubiquitous language", "CONTEXT.md" | `domain-modeling` | `domain-modeling` ➔ `codebase-design` | Generic database table migrations |
| "Design deep modules", "Module interface seams", "Ousterhout" | `codebase-design` | `codebase-design` ➔ `studio-execute` (implement mode) | Trivial one-line helper functions |
| "Audit codebase architecture", "Git churn hotspot analysis" | `improve-codebase-architecture` | `improve-codebase-architecture` ➔ `setup-ts-deep-modules` | Routine single-file bug fixing |
| "TypeScript boundaries", "dependency-cruiser rules" | `setup-ts-deep-modules` | `setup-ts-deep-modules` ➔ `studio-review` (code mode) | Non-TypeScript codebases |
| "Unsafe test typecasts", "Migrate to shoehorn" | `migrate-to-shoehorn` | `migrate-to-shoehorn` ➔ `studio-review` (code mode) | Production application types |
| "Implement approved spec", "Code feature", "Build ticket" | `studio-execute` (implement mode) | `studio-execute` (implement mode) ➔ `studio-review` (code mode) | Requirements fuzzy or unapproved |
| "Parallel subagents", "Isolated worktrees", "Multi-agent PR" | `studio-execute` (spec-run mode) | `studio-execute` (spec-run mode) ➔ `studio-review` (code mode) | Single developer / single-file edit |
| "Test-driven development", "Red-green-refactor", "Write tests" | `tdd` | `tdd` ➔ `studio-review` (code mode) | Throwaway exploratory spikes |
| "Diagnose bug", "Fix failing test", "Flaky CI", "Crash" | `studio-debug` (loop mode) | `studio-debug` (loop mode) ➔ `tdd` ➔ `studio-review` (code mode) | Trivial obvious syntax errors |
| "Review PR", "Review branch diff", "Check standards" | `studio-review` (code mode) | `studio-review` (code mode) | Writing new code or diagnosing bugs |
| "Merge conflict", "Rebase conflict", "Fix conflict markers" | `studio-git` (conflicts mode) | `studio-git` (conflicts mode) ➔ `studio-review` (code mode) | Routine safe git rebases without conflicts |
| "Prevent force push", "Block dangerous git", "Hard reset guard" | `studio-git` (safety mode) | `studio-git` (safety mode) | Safe git status or log commands |
| "Setup issue tracker", "Configure triage labels", "Setup docs" | `setup-engineering-workflows` | `setup-engineering-workflows` | General npm package installation |
| "Setup Husky", "lint-staged", "Prettier pre-commit hook" | `setup-pre-commit` | `setup-pre-commit` | Remote CI/CD pipeline automation |
| "Triage incoming issues", "Author agent brief", "Out of scope" | `studio-debug` (triage mode) | `studio-debug` (triage mode) ➔ `studio-execute` (implement mode) | Internal tickets from studio-plan tickets mode |
| "Map huge project", "Multi-session effort", "Fog of war" | `studio-plan` (map mode) | `studio-plan` (map mode) ➔ `studio-plan` (spec mode) | Small, single-session feature work |
| "Interactive bash wizard", "Dashboard credentials setup" | `wizard` | `wizard` | Tasks the AI can execute directly |
| "Train ML model", "LoRA fine-tuning", "vLLM serving" | `ai-engineering` | `ai-engineering` ➔ `ml-best-practices` | Standard CRUD backend development |
| "Self-healing data pipeline", "AST-validated data fixes" | `ai-data-remediation` | `ai-data-remediation` ➔ `studio-review` (code mode) | Routine database schema migrations |
| "Statistical ML", "95% bootstrap CIs", "EDA", "Data leakage" | `ml-best-practices` | `ml-best-practices` ➔ `ai-engineering` | Basic spreadsheet formatting |
| "Inner cognitive workspace", "Three registers", "Deep thinking" | `j-space` | `j-space` ➔ `studio-execute` (implement mode) | Trivial single-step lookups |
| "Synthesize /goal prompt", "Overnight autonomous run" | `studio-plan` (goal mode) | `studio-plan` (goal mode) ➔ `studio-execute` (spec-run mode) | Immediate single-turn execution |
| "Author new skill", "Skill evals", "10 Canonical Principles" | `skill-conductor` | `skill-conductor` ➔ `writing-for-agents` | General application coding |
| "Compact session", "Transfer context", "Save handoff" | `handoff` | `handoff` | Committing code to git |
| "Session retrospective", "Audit agent mistakes" | `retro` | `retro` ➔ `writing-for-agents` | Active mid-task implementation |
| "Re-pitch simpler", "Explain in plain English", "Wait what" | `wait-what` | `wait-what` | Initial planning or studio-plan discover mode |
| "Teach technical concept", "Interactive HTML lab", "ZPD" | `teach` | `teach` | Silent autonomous code generation |
| "Write agent instructions", "AGENTS.md rules", "Context pointers" | `writing-for-agents` | `writing-for-agents` ➔ `skill-conductor` | Human-facing marketing copy |
| "Brainstorm essay notes", "Capture raw fragments", "Metaphors" | `writing-fragments` | `writing-fragments` ➔ `writing-shape` | Final draft formatting |
| "Shape notes into draft", "Block-by-block article assembly" | `writing-shape` | `writing-shape` ➔ `writing-beats` | Initial raw fragment generation |
| "Narrative beats", "Beat-by-beat drafting journey" | `writing-beats` | `writing-beats` | Quick single-sentence edits |
| "Scaffold exercise folders", "Workshop tutorial boilerplate" | `scaffold-exercises` | `scaffold-exercises` ➔ `studio-review` (code mode) | Application feature scaffolding |
