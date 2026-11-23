# Skill: improve-codebase-architecture

- Plugin: `plugin-skill-studio` (0.8.0)
- Source: `plugins/plugin-skill-studio/skills/improve-codebase-architecture/SKILL.md`

> Survey codebases for shallow modules, weak seams, and deepening opportunities, producing a visual report. Use when conducting architectural reviews, identifying design debt, finding deepening opportunities, or preparing codebase refactors — even if the user says "analyze our architecture". Do NOT use for basic syntax linting or formatting.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Improve Codebase Architecture

Survey codebases for shallow modules, leaky abstractions, and weak seams, generating an interactive, visual HTML report in the OS temp directory with before/after architectural refactoring models.

---

#### Core Invariants

1. **YAGNI Scope First**: Prioritize hotspots in recent commit history (`git log --oneline`) where architectural friction is actively slowing development.
2. **Strict Design Vocabulary**: Frame all findings using canonical terms (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and domain vocabulary from `CONTEXT.md`.
3. **External Temp Report**: Write the visual report to the OS temporary directory (`<tmpdir>/architecture-review-<timestamp>.html`) with Tailwind CDN and Mermaid diagrams; never litter the repository with review HTML.
4. **Before/After Visual Models**: Every deepening candidate must feature a clear before/after structural diagram illustrating interface simplification and implementation depth.
5. **No Speculative Interface Proposing**: Propose candidate problem areas and deepening directions; do not propose concrete code interfaces until the user selects a candidate.

---

#### Architecture & Map of Content (MOC)

```
[ Hotspot & Git Log Analysis ] ──► [ Deepening Candidate Survey ] ──► [ Generate HTML Report in /tmp ] ──► [ Grilling on Chosen Candidate ]
```

| Component | Responsibility | Reference |
|---|---|---|
| **Hotspot Scanner** | Identify frequently changed, high-friction files | Git log & subagent exploration |
| **HTML Visual Report** | Render side-by-side Mermaid & Tailwind cards | `skills/improve-codebase-architecture/HTML-REPORT.md` |
| **Candidate Deepening** | Socratic review of selected candidate | `skills/studio-plan/modes/interview.md` + `skills/codebase-design/SKILL.md` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Scan Recent Codebase Hotspots
- **Action**: Inspect `git log --oneline -n 100` and `CONTEXT.md` to identify high-churn modules and domain boundaries.
- **Key Point**: Focus on modules where understanding one concept requires hopping between multiple fragmented files.
- **Why**: Deepening stable, untouched legacy files yields low ROI compared to active hotspots.

##### Step 2: Survey Deepening Opportunities
- **Action**: Evaluate candidate modules using the deletion test and locate shallow pass-throughs.
- **Key Point**: Check for extracted pure functions that lack locality and leak callers' state.
- **Inline Checklist**:
  - [ ] Hotspot files identified from git churn
  - [ ] 2–4 distinct deepening candidates formulated
  - [ ] Candidates categorized by recommendation strength (`Strong`, `Worth exploring`, `Speculative`)

##### Step 3: Generate Self-Contained Visual HTML Report
- **Action**: Write `<tmpdir>/architecture-review-<timestamp>.html` with Tailwind and Mermaid CDN scripts.
- **Key Point**: Include problem descriptions, leverage/locality benefits, and side-by-side before/after Mermaid diagrams.
- **Why**: Visual architecture diagrams communicate structural improvements far more effectively than walls of text.

##### Step 4: Open Report & Facilitate Candidate Selection
- **Action**: Launch the HTML report via `open <path>` (macOS) / `xdg-open` (Linux) / `start` (Windows) and ask the user which candidate to explore.
- **Key Point**: Upon selection, enter the grilling loop to settle module boundaries and update `CONTEXT.md` / ADRs.
- **Why**: Collaborative candidate selection ensures team buy-in before investing in refactoring.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Write the HTML review report directly into the repo root."* | **Write reports exclusively to the OS temp directory.** | Review artifacts should never pollute project Git history. |
| *"Draft full replacement code files immediately in the report."* | **Present architectural direction and diagrams first.** | Premature coding before agreeing on architectural seams leads to wasted effort. |
| *"Re-open settled ADR decisions without strong evidence."* | **Respect existing ADRs unless severe friction is demonstrated.** | Constant relitigation of settled decisions stalls progress. |

## Bundled files

### File: `HTML-REPORT.md`

#### HTML Report Format

The architectural review is rendered as a single self-contained HTML file in the OS temp directory. Tailwind and Mermaid both come from CDNs. Mermaid handles graph-shaped diagrams reliably; hand-built divs and inline SVG handle the more editorial visuals (mass diagrams, cross-sections). Mix the two: don't lean on Mermaid for everything, it'll start to look generic.

##### Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review for {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for things Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

##### Header

Repo name, date, and a compact legend: solid box = module, dashed line = seam, red arrow = leakage, thick dark box = deep module. No introduction paragraph. Straight into the candidates.

##### Candidate card

The diagrams carry the weight. Prose is sparse, plain, and uses the glossary terms (from the `/codebase-design` skill) without ceremony.

Each candidate is one `<article>`:

- **Title**: short, names the deepening (e.g. "Collapse the Order intake pipeline").
- **Badge row**: recommendation strength (`Strong` = emerald, `Worth exploring` = amber, `Speculative` = slate), plus a tag for the dependency category (`in-process`, `local-substitutable`, `ports & adapters`, `mock`).
- **Files**: monospaced list, `font-mono text-sm`.
- **Before / After diagram**: the centrepiece. Two columns, side by side. See patterns below.
- **Problem**: one sentence. What hurts.
- **Solution**: one sentence. What changes.
- **Wins**: bullets, ≤6 words each. e.g. "Tests hit one interface", "Pricing logic stops leaking", "Delete 4 shallow wrappers".
- **ADR callout** (if applicable): one line in an amber-tinted box.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

##### Diagram patterns

Pick the pattern that fits the candidate. Mix them. Don't make every diagram look the same. Variety is part of the point.

###### Mermaid graph (the workhorse for dependencies / call flow)

Use a Mermaid `flowchart` or `graph` when the point is "X calls Y calls Z, and look at the mess." Wrap it in a Tailwind-styled card so it doesn't feel parachuted in. Style with classDef to colour leakage edges red and the deep module dark. Sequence diagrams work well for "before: 6 round-trips; after: 1."

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

###### Hand-built boxes-and-arrows (when Mermaid's layout fights you)

Modules as `<div>`s with borders and labels. Arrows as inline SVG `<line>` or `<path>` elements positioned absolutely over a relative container. Reach for this when you want the "after" diagram to feel like one thick-bordered deep module with greyed-out internals, since Mermaid won't render that with the right weight.

###### Cross-section (good for layered shallowness)

Stack horizontal bands (`h-12 border-l-4`) to show layers a call passes through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled with the consolidated responsibility.

###### Mass diagram (good for "interface as wide as implementation")

Two rectangles per module: one for interface surface area, one for implementation. Before: interface rectangle is nearly as tall as the implementation rectangle (shallow). After: interface rectangle is short, implementation rectangle is tall (deep).

###### Call-graph collapse

Before: a tree of function calls rendered as nested boxes. After: the same tree collapsed into one box, with the now-internal calls shown faded inside it.

##### Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace. Serif optional for headings (`font-serif` works well with stone/slate).
- Colour sparingly: one accent (emerald or indigo) plus red for leakage and amber for warnings.
- Keep diagrams ~320px tall so before/after sits comfortably side by side without scrolling.
- Use `text-xs uppercase tracking-wider` for module labels inside diagrams, so they read as schematic, not as UI.
- The only scripts are the Tailwind CDN and the Mermaid ESM import. The report is otherwise static: no app code, no interactivity beyond Mermaid's own rendering.

##### Top recommendation section

One larger card. Candidate name, one sentence on why, anchor link to its card. That's it.

##### Tone

Plain English, concise, but the architectural nouns and verbs come straight from the `/codebase-design` skill. Concision is not an excuse to drift.

**Use exactly:** module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.

**Never substitute:** component, service, unit (for module) · API, signature (for interface) · boundary (for seam) · layer, wrapper (for module, when you mean module).

**Phrasings that fit the style:**

- "Order intake module is shallow: interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins bullets** name the gain in glossary terms: *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"*, because those terms aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it. If a term isn't in the `/codebase-design` glossary, reach for one that is before inventing a new one.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Improve Codebase Architecture"
  short_description: "Find and grill architecture improvements"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
