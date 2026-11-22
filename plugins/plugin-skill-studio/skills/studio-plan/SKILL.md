---
name: studio-plan
description: "Use when discovering intent and design before a new feature or behavior change, interviewing or grilling the user to stress-test an idea, plan or decision (even if they just say \"grill me\" or \"poke holes in my plan\"), recording domain terms and ADRs while grilling a feature, writing a buildable technical spec, writing an implementation plan, breaking a spec into dependency-linked tickets, turning stakeholder unknowns into a questionnaire, crafting a /goal prompt for unattended autonomous runs, or mapping a massive multi-session project through decision tickets. Do NOT use for executing an existing plan, writing code, or trivial single-file changes the user already specified."
---

# Studio Plan

<a id="policy"></a>
Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

Pick one mode, read only that mode file, and follow it.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-discover"></a>discover | Explore intent, requirements and design before building; ends in plan mode | [modes/discover.md](modes/discover.md) |
| <a id="mode-interview"></a>interview | Grill the user round by round to expose ambiguity and weak assumptions; optionally record domain terms and ADRs | [modes/interview.md](modes/interview.md) |
| <a id="mode-spec"></a>spec | Synthesize settled decisions into an unambiguous, buildable technical specification | [modes/spec.md](modes/spec.md) |
| <a id="mode-plan"></a>plan | Write an implementation plan with interfaces, tests and open decisions | [modes/plan.md](modes/plan.md) |
| <a id="mode-tickets"></a>tickets | Decompose an approved spec or plan into dependency-linked tracer-bullet tickets | [modes/tickets.md](modes/tickets.md) |
| <a id="mode-questions"></a>questions | Turn stakeholder unknowns into a structured questionnaire | [modes/questions.md](modes/questions.md) |
| <a id="mode-goal"></a>goal | Synthesize a self-contained /goal prompt or contract for unattended autonomous runs | [modes/goal.md](modes/goal.md) |
| <a id="mode-map"></a>map | Map a massive multi-session effort through a shared graph of decision tickets | [modes/map.md](modes/map.md) |

## Visual companion

<a id="companion"></a>
Discover mode can offer a browser companion for mockups, diagrams and visual comparisons. Read [the companion guide](companion/visual-companion.md) before offering it. It starts a local Node server only after the user approves, and its scripts live in `companion/scripts/`.

The mode files are shared byte-for-byte with DevSuite's `devsuite-planning`. Change them only together with DevSuite, and update `references/consolidation/shared-plan-modes.json` in both packages.
