# Skill: design-ui

- Plugin: `plugin-skill-studio` (0.7.0)
- Source: `plugins/plugin-skill-studio/skills/design-ui/SKILL.md`

> Builds accessible interfaces and verifies renders. Use when creating or redesigning a page, dashboard, or static HTML file.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Design UI

Translate the brief into explicit visual decisions, implement one coherent
system, and map every delivery claim to evidence.

#### Route before any tool call

If the prompt names one existing framework-free HTML file and explicit
preservation constraints, the bounded path below is mandatory. Accessibility,
visual-quality, and responsive wording do not select the full workflow. Read
only through the bounded path, then act; do not load this skill's references or
continue into the full workflow. Use the full workflow for every other task.

#### Bounded path for a small static page

Use this path when the request names one existing framework-free HTML file and
explicit preservation constraints:

This is a closed route. Do not enumerate the workspace, inspect version control
or package files, search for browsers, or reread this skill or the target for
confirmation. Visual, accessibility, or usability wording does not authorize
new product behavior; add JavaScript only when the prompt explicitly requests
an interaction. Do not probe the DOM, image pixels, or browser environment with
extra commands.

For this route, `focus` means the visible keyboard focus treatment and labeling
of the existing control. It never means implementing search, filtering, live
status, empty states, or other interaction. When the prompt requests no
interaction, the finished file must add no `script` element or event handler.

1. Read only that file and directly referenced local assets. Do not inspect
   package files, invoke other skills, or load this skill's references.
2. Before editing, send one sentence with this complete shape: `Direction:
   audience ...; layout ...; palette ...; typography ...; focus ...;
   responsive ...`. Do not edit until all six fields have concrete values.
   Preserve content and behavior; add no JavaScript or product behavior unless
   requested.
3. Apply one focused HTML/CSS patch. Preserve every named ID and constraint.
   Never delete the target file or replace it through a delete/add sequence.
   Make the 360px layout safe in the first patch: use border-box sizing, give
   grid or flex children `min-width: 0`, keep controls within `max-width: 100%`,
   and use a single-column flow below 480px. Put multi-column layout behind a
   `min-width` media query. At widths below 480px, use normal block flow with
   at least a 16px viewport gutter and borders instead of outer shadows. Do not
   use `100vw`, fixed or absolute positioning, transforms, decorative pseudo
   elements, grids, or flex containers there. Add only the visible label and,
   if needed, one short helper line; do not add badges, chips, eyebrow copy, or
   other content. Start from these shell invariants and keep their effect:
   `*,*::before,*::after{box-sizing:border-box}`, `body{margin:0;padding:16px}`,
   `main{width:100%;max-width:72rem;margin-inline:auto}`, and
   `input{display:block;width:100%;min-width:0;max-width:100%}`.
4. Run `node <this-skill-dir>/scripts/capture-static-page.cjs <page.html>
   <output-dir> <width...>` with every required width. It uses an already
   installed Chrome, Chromium, or Edge and installs nothing. Inspect each saved
   image at most once with the host image viewer, never with another command.
   For a capture below 480px, inspect only the returned `inspectionPath`; it
   centers the exact captured pixels on a wider canvas to avoid host-viewer
   cropping. Report the original `outputPath`, width, and height as evidence.
5. Report the returned image paths and dimensions. If it fails, stop and state
   that rendered verification is unavailable in the next response. Run no more
   commands after a failed capture. If the first captures expose a concrete
   defect, make one repair and repeat step 4 once. Run the capture command at
   most twice total. Do not repair, inspect, or recapture after the second run;
   issue the final response immediately even if a defect remains. A remaining
   defect at any required width means rendered verification failed; never call
   that width usable or the task complete.

For applications, multiple pages, uncertain behavior, or design-system work,
use the full workflow below. Accessibility and honest delivery apply to both.

#### Full workflow

##### 1. Record intent

Inspect the existing stack, routes, content, assets, dependencies, design
system, representative states, and user references. Record page kind
(greenfield, preserve, or overhaul), audience, delivery limits, required and
rejected directions, preserved behavior/content, and the brief's free axes:
palette, type, layout, motion, tone, and imagery. Keep the intent artifact
outside the repository unless the user requests a versioned design spec.

Ask one question only when two materially different directions remain equally
plausible. Otherwise state the design read and proceed. A visual redesign does
not authorize framework, route, logic, or content changes.

##### 2. Commit to a direction

Read [direction-plan.md](design-ui.md#file-referencesdirection-planmd) completely. Before code,
record and critique concrete tokens, contrast, type roles, layout family,
breakpoints, spacing ownership, desktop/mobile wireframes, ordered blocks,
interactions, and one bounded signature element. Mark missing content rather
than fabricating it. The brief wins every conflict.

##### 3. Implement one system

Use the existing stack and design system unless the request authorizes a
replacement or they cannot meet the brief. Verify version-sensitive APIs in
version-matched primary documentation.

- Trace every color, type, spacing, radius, elevation, and motion value to the
  direction plan; record an extension before using it.
- Preserve real content, assets, functionality, legal text, and responsive
  behavior.
- Use motion only for hierarchy, continuity, feedback, or brand character and
  provide reduced-motion behavior.
- Give each style decision one owner; avoid layered overrides and decorative
  competition with the signature.

When creating or changing interface text, read
[ui-copy.md](design-ui.md#file-referencesui-copymd). Include labels and empty, error, loading,
disabled, and success states; never invent evidence.

##### 4. Verify the render and behavior

Before the first render, read
[render-verification.md](design-ui.md#file-referencesrender-verificationmd) and freeze its
checklist. Use the available browser automation at mobile, desktop, meaningful
intermediate widths, and relevant non-happy states. Check content presence,
layout, overflow, contrast, focus, keyboard and assistive semantics, motion,
and actual interactions.

Keep screenshots, behavioral evidence, code review, and subjective judgment
separate. A screenshot does not prove an interaction. If the environment lacks
a browser or required access, report the exact limitation instead of claiming
rendered verification.

##### 5. Review touched UI structure

Read every touched UI file completely and review only component boundaries,
prop flow, and style-token ownership:

- Split or combine components along concepts that change together.
- Remove pass-through layers that add no contract, validation, or translation.
- Route repeated raw values through the direction plan's owning token.

Report actionable findings with exact file and line, reader cost, and named
fix; name clean files so reviewed scope is explicit. Route generic pre-merge
review to the repository's review workflow.

#### Deliver honestly

Report the design read, preserved constraints, material changes, tested
viewports and interactions, evidence paths, structural review, and every
unresolved visual or behavioral gap. Label subjective judgments and give
limitations the same prominence as completed work.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Design UI"
  short_description: "Design accessible responsive user interfaces"
  default_prompt: "Design and verify this user interface."

policy:
  allow_implicit_invocation: true
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `references/direction-plan.md`

#### Direction Plan

Resolve the visual system before implementation. Write this plan into the
intent artifact, run the critique, repair it once, and build only from the
repaired version.

##### Required decisions

Fill every field with concrete values. An adjective without a token, dimension,
or consequence leaves the decision to the implementer.

```text
## Direction

color
  surface: <hex, role>
  raised: <hex, role and boundary treatment>
  ink: <hex, contrast ratio on each ground>
  muted: <hex, contrast ratio on each ground>
  accent: <hex, semantic role and frequency>
  focus/border: <hex, 3:1 non-text contrast where perception is required>

type
  display: <family, weight, size range, line-height, tracking, reason>
  body: <family, weight, desktop/mobile size and leading, measure, reason>
  utility: <family, metrics, alignment, reason or explicit omission>

layout
  family: <named composition and content-based reason>
  widths: <mobile, breakpoints, desktop, max width>
  spacing: <token scale and owner for every step>
  shape/elevation: <tokens and roles>

inventory
  <ordered block>: <rank, content, state, preserved constraints>
  GAP: content: <designed slot and missing source>

interactions
  <action>: <location, affordance, label, timing, keyboard/assistive semantics>

signature
  what: <one element with geometry, tokens, and behavior at every width>
  why: <property of this subject that selects the element>
```

Measure text contrast at 4.5:1, or 3:1 for text at least 24 CSS px or
18.66 CSS px bold. Measure perceptible boundaries and focus indicators at 3:1.
Measure composited colors after blending; a proposed separator is not a remedy
until its rendered color passes.

Give each type role size, leading, tracking, and measure. Give each spacing
token one owner. Walk every rendered label, wordmark, placeholder, data value,
and internal gap so none inherits an accidental default.

List every page block in order, not only the opening screen. Mark unsupplied
content as `GAP: content` and design the slot without inventing its contents.
Select one signature element; specify its internal geometry, palette tokens,
responsive forms, motion, and reduced-motion behavior.

##### Wireframes

Draw desktop and mobile compositions with inventory names and approximate
geometry. For each block, state what changes at every breakpoint. “Stacks” is
insufficient: preserve or replace the relationship the desktop layout encoded,
and state where hidden navigation or content moves.

```text
desktop 1280                    mobile 375
┌───────────────┬───────────┐   ┌──────────────┐
│ primary block │ detail    │   │ primary      │
├───────────────┴───────────┤   ├──────────────┤
│ signature                  │   │ detail       │
├───────────────────────────┤   ├──────────────┤
│ next named block           │   │ signature    │
└───────────────────────────┘   └──────────────┘
```

Every drawn fill, stroke, label, marker, and gap must resolve to a named token
or inventory decision.

##### Critique gates

Record pass, failure, and repair for every gate. A self-review is a claim, not
independent evidence.

###### 1. Subject substitution

For every rationale, name the subject property it depends on and substitute the
nearest different subject that shares that property. Use adversarial examples,
report every substitute considered, and mutate the substitute that nearly
failed the test.

If the same geometry works after changing only labels, the rationale is
generic. Revise or remove the decision. Prefer institutional or product facts
that constrain geometry over broad data shapes that transfer across domains.
When the brief names only a category, state that specificity ceiling and the
one missing fact that would raise it.

###### 2. Default clusters

Identify category defaults and common generated patterns: centered hero plus
equal cards, bento grids, decorative sequence numbers, generic gradient SaaS,
dark surface with an arbitrary acid accent, editorial cream/serif/rust, or any
repeated sector layout. A match is allowed only with a reason grounded in the
brief, subject, or content hierarchy. “The category usually does the opposite”
explains a rejection, not the chosen replacement.

###### 3. Free axes

For every free axis from the intent record, name the decision and classify its
reason as brief-pinned, subject-derived, downstream consequence, or bare
convention. Count bare conventions and replace any that also matches a default
cluster. Check ground color, radius, icons, and motion explicitly.

###### 4. Concentration

Remove the signature: the page should lose its identity. Remove any other
decorative device: it should lose detail only. If two devices compete, visually
subordinate or remove one; renaming both as parts of the signature does not
resolve competition.

###### 5. Arithmetic and consistency

Recompute every value the plan makes falsifiable:

- contrast ratios, composite colors, and boundary remedies;
- sample totals, percentages, units, dates, and derived geometry;
- `clamp()` values at declared widths;
- inventory counts and spacing ownership;
- token coverage for every wireframe element;
- longest labels and failure widths;
- signature dimensions and alternate forms.

Illustrative values must be visibly marked in pixels and in accessible names,
use fictional identifiers, and never attach invented state to a real entity.

##### Plan closure

Close only when:

- every free axis, block, interaction, breakpoint, and preserved constraint is
  explicit;
- desktop and mobile wireframes agree with tokens and inventory;
- the signature is bounded and remains the sole identity-bearing device;
- contrast, formulas, counts, vocabulary widths, and sample state recompute;
- critique repairs tighten rather than silently loosen constraints;
- every repair has been checked against the complete gate set.

Record rejected directions and their reasons under `## Tried` so later work
does not converge on the same discarded default.

### File: `references/render-verification.md`

#### Render Verification

Read this reference before inspecting the first rendered artifact. Freeze the checks before looking at screenshots or interacting with the UI.

##### Evidence

Keep four evidence layers distinct:

- **Intent:** what the design must express and preserve.
- **Render:** screenshots tied to exact viewports and source state.
- **Review:** named checks evaluated against those renders.
- **Behavior:** browser assertions for interactions.

For every capture, record its path, viewport, source state, and what it demonstrates. A screenshot supports visual review but does not prove behavior. When the delivery target cannot be served, open the output directly and state that behavioral evidence is narrower.

##### Freeze the checklist

Write the checks before viewing the render. Checks invented in response to the artifact make the verdict depend on reviewer time rather than a stable standard and penalize auditable work more than vague work.

Anything noticed outside the frozen list is a **scope note**: record it for the next round without lowering the current verdict. A failed verdict requires a defect that changes what a reader does or believes; “could be tighter” is a scope note.

##### Required checks

Mark each pass, fail, or not-evaluated with a concrete note:

- **brief-fidelity:** audience, direction, dials, and preserved constraints match the intent.
- **hierarchy:** the primary task and information order are clear.
- **consistency:** typography, spacing, color, shape, imagery, and components form one system.
- **responsive:** composition remains intentional at every captured width.
- **content-integrity:** real content and preserved behavior were not silently changed or fabricated.
- **distinctiveness:** the signature exists in the render and remains the memorable element; every named default-cluster tell retains its recorded reason.
- **copy-quality:** actions keep one name, text is specific and active, and no fabricated evidence appears. Run [ui-copy.md](design-ui.md#file-referencesui-copymd) against the actual render.
- **contrast:** every declared text role, perceptible boundary, and composited value passes against the rendered colors rather than only the planned tokens.

Add motion, reduced-motion, theme-parity, loading-state, and image-fidelity checks only when the intent makes them relevant.

##### Viewports and behavior

Use real browser checks through `automate-ui`. Capture at minimum:

- Mobile: at or below 480 CSS px; prefer 375x812.
- Desktop: at or above 1024 CSS px; prefer 1280x800.
- Every intermediate width where the direction plan changes composition or where a solved constraint approaches failure.

Exercise every relevant interaction and keep navigation evidence separate from behavioral proof. Verify reduced-motion behavior when motion exists.

##### Claim boundary

A full pass means the declared checklist ran against specific mobile and desktop renders with passing relevant interaction checks. It does not prove universal accessibility, cross-browser behavior, production performance, or objective aesthetic quality. Distinctiveness is measured against the declared plan and named clusters; taste remains subjective.

Completion criterion: every required and intent-specific check has a recorded outcome against named renders, relevant interactions have behavioral evidence, and every limitation or scope note is explicit.

### File: `references/ui-copy.md`

#### Writing Interface Copy

Treat words as functional design material. Before writing a string, name what
the interface must communicate and what the reader is trying to do.

##### Rules

- Name what the person controls, not internal architecture.
- Prefer specific plain language over clever or promotional phrasing.
- Use active verbs; controls state the outcome: “Save changes”, not “Submit”.
- Keep one name for an action across button, progress, success, and state text.
- Give each element one job: label, example, helper, error, or status.
- Errors state what happened and the next action. Empty states state what would
  appear and provide the action that creates it.
- Explain why a control is disabled or still loading.
- Use sentence case and a voice appropriate to the audience.

##### Fabrication boundary

Create labels, navigation, headings, instructions, form help, validation,
empty/loading/error/disabled/success text, and descriptions of behavior that
actually exists. Use supplied facts for metrics, testimonials, customers,
awards, compliance, security, privacy, operational state, and capability
claims. If a source is missing, show a visible `GAP` or clearly marked sample;
do not invent plausible evidence.

Apply the marker to every block containing illustrative figures, dates, names,
records, charts, or states, both visibly and in its accessible name. Use
fictional identifiers; never attach invented state to a real person, company,
account, place, or product.

If user-controlled input changes a consequential verdict, distinguish the
reader's assumption from what the product actually determined. A threshold the
reader selected must not be presented as a legal, medical, financial, safety,
or operational fact supplied by the product.

##### Render check

Against the actual render, record pass, fail, or not evaluated:

- Every action keeps one name through its flow.
- Controls use direct verbs and labels match the person's mental model.
- Error, empty, disabled, and loading states explain cause or next action.
- Primary-path strings read as one coherent voice.
- Every factual claim has a supplied or cited source.
- Every illustrative block is marked visually and accessibly.

### File: `scripts/capture-static-page.cjs`

```javascript
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

function parseWidths(values) {
  const widths = values.map(value => Number(value));
  if (widths.length === 0 || widths.some(width =>
    !Number.isInteger(width) || width < 240 || width > 3840)) {
    throw new Error('Viewport widths must be integers between 240 and 3840.');
  }
  return widths;
}

function browserCandidates(env = process.env, platform = process.platform) {
  const candidates = [env.CHROME_PATH].filter(Boolean);
  if (platform === 'win32') {
    for (const root of [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA]) {
      if (!root) continue;
      candidates.push(
        path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      );
    }
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge'
    );
  }
  return [...new Set(candidates)];
}

function findBrowser() {
  return browserCandidates().find(candidate => fs.existsSync(candidate));
}

function captureArguments(pagePath, outputPath, width) {
  return [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--screenshot=${outputPath}`,
    `--window-size=${width},900`,
    pathToFileURL(pagePath).href
  ];
}

function inspectionFrameHtml(capturePath, width) {
  return `<!doctype html><meta name="viewport" content="width=device-width"><style>` +
    `html,body{margin:0;min-height:100%;background:#dce8e0}` +
    `img{display:block;width:${width}px;height:900px;margin:0 auto}` +
    `</style><img src="${pathToFileURL(capturePath).href}" alt="">`;
}

function captureStaticPage(pagePath, outputDirectory, widths, dependencies = {}) {
  const resolvedPage = path.resolve(pagePath);
  if (!fs.existsSync(resolvedPage)) throw new Error(`Page not found: ${resolvedPage}`);

  const findBrowserImpl = dependencies.findBrowser || findBrowser;
  const spawnSyncImpl = dependencies.spawnSync || spawnSync;
  const browser = findBrowserImpl();
  if (!browser) throw new Error('No installed Chrome, Chromium, or Edge executable was found.');

  const resolvedOutput = path.resolve(outputDirectory);
  fs.mkdirSync(resolvedOutput, { recursive: true });
  const pageName = path.basename(resolvedPage, path.extname(resolvedPage));

  return widths.map(width => {
    const outputPath = path.join(resolvedOutput, `${pageName}-${width}.png`);
    const result = spawnSyncImpl(
      browser,
      captureArguments(resolvedPage, outputPath, width),
      { encoding: 'utf8', windowsHide: true }
    );
    if (result.error || result.status !== 0 || !fs.existsSync(outputPath) ||
        fs.statSync(outputPath).size === 0) {
      const detail = result.error?.message || result.stderr?.trim() || `exit ${result.status}`;
      throw new Error(`Capture failed at ${width}px: ${detail}`);
    }

    let inspectionPath = null;
    if (width < 480) {
      inspectionPath = path.join(resolvedOutput, `${pageName}-${width}-inspect.png`);
      const framePath = path.join(resolvedOutput, `.${pageName}-${width}-inspect.html`);
      fs.writeFileSync(framePath, inspectionFrameHtml(outputPath, width));
      try {
        const inspection = spawnSyncImpl(
          browser,
          captureArguments(framePath, inspectionPath, 720),
          { encoding: 'utf8', windowsHide: true }
        );
        if (inspection.error || inspection.status !== 0 ||
            !fs.existsSync(inspectionPath) || fs.statSync(inspectionPath).size === 0) {
          const detail = inspection.error?.message || inspection.stderr?.trim() ||
            `exit ${inspection.status}`;
          throw new Error(`Inspection frame failed at ${width}px: ${detail}`);
        }
      } finally {
        fs.rmSync(framePath, { force: true });
      }
    }

    return { width, height: 900, outputPath, inspectionPath, browser };
  });
}

if (require.main === module) {
  try {
    const [pagePath, outputDirectory, ...widthValues] = process.argv.slice(2);
    if (!pagePath || !outputDirectory) {
      throw new Error('Usage: capture-static-page.cjs <page.html> <output-dir> <width...>');
    }
    const captures = captureStaticPage(pagePath, outputDirectory, parseWidths(widthValues));
    process.stdout.write(`${JSON.stringify({ captures })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  browserCandidates,
  captureArguments,
  captureStaticPage,
  findBrowser,
  inspectionFrameHtml,
  parseWidths
};
```
