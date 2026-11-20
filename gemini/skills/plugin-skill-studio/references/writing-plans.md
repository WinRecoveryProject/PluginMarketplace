# Skill: writing-plans

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/writing-plans/SKILL.md`

> Creates implementation plans with interfaces, tests, and open decisions. Use when a multi-step change needs planning.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#not-embedded); never load companion plugins.

### Writing Plans

Create a plan that another engineer can implement without inventing product
decisions. Announce: "I'm using the writing-plans skill to create the
implementation plan."

#### Choose one route

Use **Bounded inline planning** when the user explicitly requests planning
only, requests read-only work, or says not to write code, and the prompt already
supplies the behavior, constraints, and required interfaces.

Use **Full repository planning** when the user requests a saved plan artifact,
asks for alignment with an existing codebase, names existing paths that affect
the design, or leaves architecture dependent on repository evidence.

Bounded inline planning takes precedence whenever its conditions match. A
named interface without a repository path is part of the supplied contract,
not a request for repository alignment. Do not switch routes merely because
the future implementation will integrate with existing code.

Creating a plan file is a workspace change. Return the plan inline unless the
user requests an artifact or the active workflow already authorizes one.

#### Rules for every plan

- List externally observable decisions the requirements do not settle, such as
  exit status, output channel, overwrite policy, and partial-success semantics.
  Never silently choose them. Ask only when an answer changes plan structure.
- Do not add validation, normalization, or required-field rules for data the
  prompt only names. Preserve it as supplied and list any policy as unresolved.
- Never specify a behavior as required and then list that same behavior as
  unresolved. Describe the decision seam instead until the product choice exists.
- Label engineering recommendations as recommendations, not requirements.
- Define file responsibilities and interfaces. Mark unverified paths as
  proposed.
- Make each task an independently testable deliverable with focused tests.
- Include concrete behavior, edge cases, commands, and expected outcomes. Do
  not use `TBD`, `TODO`, "handle errors", or other placeholders.
- Split independent subsystems into separate plans when each can deliver useful
  software alone.

#### Bounded inline planning

1. Treat facts supplied in the prompt as the planning contract. Do not inspect the
   workspace unless the user requests repository alignment.
2. Return at most four implementation tasks. Each task names proposed files,
   consumed and produced interfaces, behavior, edge cases, and focused tests.
3. Omit code samples, commit steps, plan files, todo tools, and execution-choice
   menus unless the user asks for them.
4. Cover parsing, validation, success and failure flow, integration boundaries,
   and tests where applicable.
5. End with unresolved externally observable decisions only, then deliver the
   plan immediately.

#### Full repository planning

Read [references/full-plan.md](writing-plans.md#file-referencesfull-planmd) completely before
inspecting the repository or drafting the plan. Follow that reference in
addition to the rules above. An explicit user output path overrides its default
artifact location.

#### Self-review

Before responding, check specification coverage, placeholder absence, and
interface-name consistency. Fix gaps inline once; do not start a separate todo
or review workflow.

Completion requires a plan with complete behavior, interfaces, boundaries,
edge cases, and tests, plus an explicit list of unresolved product decisions.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Write Plans"
  short_description: "Create decision-complete implementation plans"
  default_prompt: "Create a decision-complete implementation plan."

policy:
  allow_implicit_invocation: true
```

### File: `references/full-plan.md`

#### Full Repository Plan Reference

Use this reference only for the Full repository planning route in `SKILL.md`.

##### Audience and scope

Assume a skilled implementer with no codebase context. Inspect only files needed
to identify conventions, entry points, interfaces, and test commands. Preserve
existing structure unless the feature requires a change.

Specify exact files, code or pseudocode, tests, docs, commands, and outcomes.
Apply DRY, YAGNI, TDD, and frequent small commits.

Map the files to create or modify and give each one a single responsibility.
Files that change together should live together. Split by responsibility, not
by technical layer. If the existing codebase uses large files, do not introduce
an unrelated restructuring.

##### Task sizing

A task is the smallest independently testable deliverable worth a review gate.
Fold setup, scaffolding, and docs into the task that needs them. Split only
where a reviewer could approve one task and reject its neighbor.

Within each task, use small ordered actions:

1. Add or update the focused failing test.
2. Run it and record the expected relevant failure.
3. Implement the minimum behavior.
4. Run the focused test and record the expected pass.
5. Run any affected integration check.
6. Commit the independently passing deliverable.

##### Plan document header

Every plan MUST start with this header:

```markdown
#### [Feature Name] Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [Two or three sentences describing the approach]

**Tech Stack:** [Relevant languages, frameworks, and tools]

##### Global Constraints

[Exact project-wide requirements copied from the specification]

---
```

##### Task template

Use this shape for each task:

````markdown
###### Task N: [Deliverable]

**Files:**
- Create: `exact/proposed/or/observed/path`
- Modify: `exact/observed/path:line`
- Test: `tests/exact/path`

**Interfaces:**
- Consumes: [exact existing or prior-task signatures]
- Produces: [exact signatures later tasks rely on]

- [ ] **Step 1: Add the focused failing test**

[Exact test cases and assertions]

- [ ] **Step 2: Verify the relevant failure**

Run: `[focused command]`
Expected: `[specific failure proving missing behavior]`

- [ ] **Step 3: Implement the minimum behavior**

[Exact logic, boundaries, and edge cases]

- [ ] **Step 4: Verify the focused pass**

Run: `[focused command]`
Expected: `[specific passing result]`

- [ ] **Step 5: Run the affected integration check**

Run: `[integration command]`
Expected: `[specific passing result]`

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add [exact files from this task]
git commit -m "feat: add specific behavior"
```
````

Repeat signatures when tasks may be implemented independently. Name exact
interfaces instead of referring only to "the previous task".

##### No Placeholders

Never write:

- `TBD`, `TODO`, "implement later", or "fill in details".
- "Add appropriate error handling" or "handle edge cases" without enumerating
  the exact cases and outcomes.
- "Write tests for the above" without exact cases and assertions.
- "Similar to Task N" instead of repeating required context.
- Steps that omit the actual code or pseudocode needed to implement them.
- A function, type, file, or command that no task defines or verifies.

##### Self-review details

Check the completed plan once:

1. **Specification coverage:** Every requirement maps to a task or global
   constraint.
2. **Placeholder scan:** Every step contains the information needed to act.
3. **Interface consistency:** Names and signatures match across tasks.
4. **Repository grounding:** Observed paths are distinguished from proposed
   paths, and commands match the repository's actual tooling.

Correct discovered gaps inline without starting another workflow.

##### Execution Handoff

Save an authorized artifact to `docs/plans/YYYY-MM-DD-<feature-name>.md` unless
the user supplied another path. Report that path and offer two execution modes
when the host exposes them:

1. **Subagent-Driven** — use `subagent-driven-development` for a fresh worker
   per task with review between tasks.
2. **Inline Execution** — use `executing-plans` for inline task-by-task
   execution, stopping on blockers.

Name the actual available host workflow behind each option. Do not claim a
subagent, worktree, or plan-execution tool is available unless the current host
exposes it.

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
