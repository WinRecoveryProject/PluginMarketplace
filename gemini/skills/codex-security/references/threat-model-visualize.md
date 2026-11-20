# Skill: threat-model-visualize

- Plugin: `codex-security` (0.1.33)
- Source: `plugins/codex-security/skills/threat-model-visualize/SKILL.md`

> Turn an existing threat model into an interactive architecture and threat-path explorer. Resolve simple requests for a target's last scan; do not perform a new assessment.

## Instructions

### Threat Model Visualize

Create a standalone explorer that shows application teams and leadership what can go wrong, how it could happen, why it matters, and where controls would stop or limit it. Use the shared workbench and role palette; do not use Mermaid or run a new scan.

A request such as “Visualize the threat model generated in the last scan of X” is sufficient. Resolve the target, latest assessment and snapshot. If the latest artifact is missing, disclose that before using an older fallback. The default input is the existing threat-model artifact, not an automatic import of a complete scan. Keep inputs immutable and do not silently combine snapshots. Do not inspect application code or invent topology, authority, controls, reachability or validation.

Capture source-supported deployment context: exposure, trust, tenant and process boundaries, identities, and conditional deployment assumptions. Do not treat repository defaults as proof of deployed configuration. Preserve uncertainty and the distinction between hypotheses, findings, declared controls and observed enforcement. For several explicitly supplied artifacts, pass one derived document to `--assessment`. Label verbatim excerpts with each source’s identity, snapshot and original finding status. Distinguish findings from hypotheses, identify local IDs, and preserve conflicting accounts and the original artifacts.

For a **fresh candidate or regeneration**, author a new view model; do not patch or copy a previous candidate model or HTML. Ordinary edits may reuse the existing model. Renderer-only polishing is a display update, not fresh generation.

#### 1. Enumerate and validate the source

Complete this phase before planning any visualization, choosing display groupings or routes, assigning geometry, or authoring the explorer JSON. Save `source-inventory.md` in the workspace. Validate fidelity to the supplied assessment, not the application implementation; do not run a new assessment to fill gaps.

Record the assessment identity, exact file hash and scope. Give inventory rows semantic IDs and supporting source spans or exact quotations, without assigning visual node or edge IDs. Enumerate:

- **Components and roles:** actors, inputs, application components, stores, external dependencies, trust boundaries, platform-specific instances and administrative contexts. Distinguish trusted operators, assumed compromise, controlled input, owned assets and enforcing components.
- **Relationships and capabilities:** each supported caller → operation → receiver relationship, meaningful return, independently sufficient authority or entry condition, prerequisites and platform/deployment conditions. Enumerate alternatives per operation: an account session and an issued capability may each authorize the same operation. Preserve known logical capabilities when transport or order is unknown; do not import a prerequisite from another entry point.
- **Controls and qualifications:** each protective mechanism → enforcing owner → constrained component → protected operation, with conditions and evidence. Record an unmapped enforcer explicitly; configuring or being subject to a restriction does not establish enforcement ownership. Classify existing mechanisms, proposals, security objectives, configuration behavior and caveats separately. Ownership, expanded permissions, disabled protection or documentation advice alone is not an existing safeguard.
- **Threat-model coverage:** substantive threats, supplied findings, hypotheses and consequential configurations, linked to the relevant components, relationships and controls. Retain source confidence, potential impact and unresolved questions.

Review the inventory against the complete assessment before proceeding. Check that evidence supports the same object, caller, operation and owner; distinguish configuration delivery from protected operations and assets from their managers. Do not transfer a validation rule between different inputs or infer platform endpoints from a group label. Account for every substantive source concern; reconcile aliases and record contradictions without inventing a resolution. Correct unsupported assertions, misclassified controls and unexplained omissions now.

Finish the inventory with source-reconciliation corrections and unresolved source gaps. Keep later model-repair notes and review verdicts in `correctness-review.md`, not this source inventory. It is ready for composition when its claims are supported or explicitly unknown and coverage has been reconciled. Source uncertainty may remain; it must not silently become a visual relationship or safeguard. Do not plan the visualization while performing this review.

#### 2. Compose from the validated inventory

Read the [view-model contract](threat-model-visualize.md#file-referencesview-modelmd) and [presentation guidance](threat-model-visualize.md#file-referencescontext-explorermd), then build a source-backed JSON model and geometry. The shell supplies interaction, colors and exports.

Default to **standard**: compose a readable architecture overview before adding threats. Show the actors and entry points, trust boundaries, application or library components, identity and authorization, stores, and external dependencies needed to explain the assessment. Include administrative, automation and build contexts when relevant. Connect them with meaningful request, data and authority relationships. Match platform relationships to the service endpoints named by the source; do not infer group membership or a UI handoff. Use grouping, clear boundaries, aligned flows and short labels while preserving distinctions that change a threat or control. Do not collapse the whole system into one threat's pipeline or move substantive sources and control owners off-map merely for sparsity.

Keep the primary architecture visible in muted colors when a threat is selected. Emphasize its complete source-supported route, including proxies, other transit components, handoffs and meaningful returns. Highlight active transit with fill while retaining its neutral outline; transit alone is not a weakness. Distinguish conditional transitions from ordinary flows. A partial or unmapped view needs an evidence-based scope explanation. Secondary connections may appear under **More connections**, but the basic architecture must stand on its own.

Use the validated inventory as the coverage ledger. Map each substantive operation and its supported authority alternatives to selectable relationships and controls, or an explicit source-supported scope exclusion. Showing an actor in another threat does not cover its access to this operation. Shared nodes and edges must be valid for every alternative that uses them; an unordered union may retain alternative-specific relationships when their membership is explicit. Prose such as “otherwise authorized” cannot broaden an account-only path. An embedded quotation is not selectable coverage. Label a user-requested subset incomplete. Optional authoring fidelity is `simple` for a more grouped summary, `standard` by default, or `detailed` for useful secondary connections and facets; it does not change claims or require a UI selector.

Bind each case's mechanism, priority, prerequisites, impact and evidence to its own substantive source section. Verify that each quotation matches and supports the same object, operation and enforcing owner as the claim. Do not turn ambiguous source language into a more specific existing safeguard. Do not invent a sequence, authority gain or successful transition. Where order is unsupported, show related components with an explicit scope note. Model the actual starting actor or input and least required authority. Trusted operator or administrator activity remains authorized context, even when it changes configuration or consumes resources; make it a threat source only when the assessment explicitly models its abuse or compromise. An added assumption of malicious intent is not source evidence. Classify a caller-controlled value as untrusted input only when the source supports that trust boundary. Keep alternative footholds distinct and scope each selection to its relevant relationships and controls, with other architecture muted.

Expose consequential supplied controls and proposals at their actual operations and enforcing owners. Split controls with different owners, operations or effects, including deployment reachability and protocol authentication. If an enforcing owner is unmapped, disclose the gap rather than assigning the control to its recipient. Label proposals **Proposed control** and their effects conditionally as “Would block” or “Would limit.” Show where and why a control acts, its conditions and residual effect; mark the effect unknown when it is not established. Preserve arrival at the decision owner where required; blocking a sensitive result does not necessarily stop ordinary traffic. Do not present a proposal as deployed or validated.

#### 3. Adversarial correctness review

Finish this review before starting a preview server, opening the explorer in a browser or testing exports. Static build and structural validation may run while review is pending; browser work may not. Try to disprove the saved JSON's claims, not confirm the author's intent. Use a fresh-context reviewer when delegation is available: explicitly disable history inheritance (`fork_turns: "none"` for `spawn_agent`) and send the review task and artifact paths, without the author's conclusions or screenshots. Omitting the history option can inherit the author's work. Wait for that review and its fix verification. Use a separate self-review only if delegation is unavailable or an attempted delegation fails; record the concrete reason and independence limit. Pending review is not grounds for that fallback. Do not inspect application code or perform a new assessment.

Have the reviewer read the complete assessment and view-model contract first, retrieving any portions omitted by truncated tool output, and save a compact set of source-derived obligations in `correctness-review.md` before inspecting the inventory or JSON. Include explicitly trusted roles, authorized operations and scope exclusions alongside substantive concerns, least starting authority, supported operation and result/recipient/asset consequence, deployment conditions, and controls with their enforcing owners. Then compare the inventory and actual JSON with those obligations. Neither a validated inventory nor the author's coverage ledger is proof that the JSON preserves the source.

Resolve each distinct source/route selection's effective highlighted relationships and applicable controls, including inherited defaults, overrides, grouped members, branches and control effects. Record the source span, starting authority, effective node/edge IDs, operation and consequence, control owners, and any discrepancy in the review. Equivalent selections may share a row if their equivalence and differences are explicit. Check the resolved IDs against their definitions, not only scenario prose: an override can remove a consequence, a source can impose an unnecessary prerequisite, and an owner marker can contradict an unmapped-owner note. Challenge these concrete failure modes:

- **Authority and prerequisites:** For each source-supported operation, match every independently sufficient authority or entry condition to an effective selection or justified exclusion. Compare node and edge captions as well as source prose: does a credential become process compromise, or a capability become an account-session requirement? Does a threat source contradict an explicitly trusted role or authorized operation? Is an actor mislabeled as an input, or trusted configuration as hostile? Do not require directory mutation for every file-permission concern.
- **Control ownership and operation:** For every control, including descriptive controls without effects, record the enforcer, constrained component, protected operation and the `control.nodes` owner markers. Identify who applies or evaluates the restriction, not who carries its configuration or is subject to it. Runtime restrictions, syscall filtering, mount permissions and token mounting are not application-owned checks merely because they constrain that process. A service's read-only mount does not constrain an independent writer. Split code-owned checks from deployment/runtime restrictions; leave owner markers empty when the actual enforcer is unmapped. Verify each marker against its node definition and evidence.
- **Effects and reachability:** Check every asserted outcome, condition and residual against the same named abuse. Ordinary traffic or unrelated residual risks do not establish that the abuse is only limited. For each blocking preview, derive the reached nodes and branches from the actual `step`, `edge`, `arrival` and traffic behavior. Does denying access still show the protected result reached? Preserve arrival at an evidenced decision owner without carrying arrival across a later protected transition. Descriptive or unknown effects must not become barriers.
- **Evidence and classification:** Read the cited passage for each substantive claim, including scenario fields and control owners. An exact quotation can come from the wrong row or support only part of the claim. Recheck aliases and parsed-table bindings. Distinguish existing mechanisms, proposals, expected objectives and caveats; authority alone or a disabled protection does not establish a safeguard.
- **Selection and coverage:** Check global overview and scope claims as well as selections. Preserve each alternative in source eligibility or reportability conditions; do not narrow "A or B" to "B" or add a prerequisite. Starting from the source concerns and inventory, find capabilities, independent entry points, control conditions or consequential configuration missing from selectable views. Conversely, challenge any highlighted relationship borrowed from unrelated context. Check that group membership and region geometry preserve the stated trust, process and deployment boundaries. Include the supported operation and impact context; do not stop a selection before its material consequence merely because an exploit sequence is unknown.

Require a concrete claim or selection, JSON pointer, supporting source span and explanation of the mismatch for each finding. Separate required corrections from optional clarity improvements. Faithful grouping, source-supported exclusions, descriptive controls and explicit source uncertainty are valid; do not demand invented topology, actors, ordering or safeguards to make the diagram more specific.

Correct supported findings in the JSON, not only in prose. The reviewer must reread the changed JSON and verify affected selections, including other selections sharing the changed objects or defaults. Before closing review, reconcile every source-derived obligation against the final effective selections; checking only the author's repair list is insufficient. New semantic claims must also pass the source-inventory review.

The reviewer records a timestamped `PASS` or `REVISION REQUIRED` (including time zone) in `correctness-review.md`, with the assessment and current JSON hashes, method, selection checks, findings, verified corrections and unresolved limits. `PASS` means no required correction remains; optional improvements and faithfully represented source unknowns may remain. The author checks that the saved JSON hash matches this receipt before proceeding to browser QA. An author-written summary or a request to recheck is not reviewer closure. If required work remains, continue correcting it or deliver a clearly labeled draft with the outstanding findings and browser QA marked incomplete.

After browser-driven JSON edits, repeat the affected source/selection checks and obtain an updated review receipt for the delivered hash. Preserve the initial pre-browser receipt alongside later rechecks so their order remains observable. Pure CSS changes need visual QA but do not invalidate an unchanged JSON hash. Report independent review, self-review and browser QA separately; none substitutes for the others.

#### 4. Build and inspect the explorer

Start browser QA only with the current JSON's `PASS` receipt from phase 3.

```sh
python3.12 <skill-directory>/scripts/build_explorer.py <model.json> --assessment <threat-model.md> --output <explorer.html>
```

Choose browser tooling available and permitted in the current environment before starting a preview server. In standalone CLI/CI, check known runtime or dependency locations for an installed headless browser (such as Playwright with Chromium); do not assume a desktop browser host exists. Use that browser for interaction checks, screenshot inspection, offline loading and export verification when policy permits. A missing desktop host does not establish that every browser is unavailable; a policy denial does not authorize a workaround. If no permitted browser is available, deliver the local files and mark browser QA incomplete.

Codex’s in-app browser automation does not support `file:` URLs. For browser QA there, use a local HTTP preview; do not try a file URL first. Other browsers may open the standalone HTML directly from disk. When HTTP is needed, bind your own server to `127.0.0.1` on an unused or OS-assigned port, serve only the output directory, and stop it after QA; do not assume another process on a familiar port serves these files.

Review the builder’s connector warnings. After moving or resizing a node, align adjacent bends with its ports and check that each connector approaches the node from outside. Rebuild after correcting the authored points.

Open the HTML in a browser and inspect the overview, selected scenarios and representative controls at desktop sizes. Check that the architecture, source, route, impact and control remain understandable in context. Inspect representative source and route alternatives and blocked and restored states where mapped. Check readable default-fit text, simple connector routing, text/component collisions, control markers, evidence, navigation, scope and residuals; repack rather than relying on zoom. Prefer minor connector crossings to convoluted detours. Verify offline loading and SVG export. The builder checks structure and exact quotations, not claim truth or visual clarity.

Deliver standalone HTML locally by default. Create, update or publish a site only when the user explicitly requests site hosting or publication; a visualization or preview request alone is insufficient. Do not create a site for local or inline previews. For requested hosting, use the Sites workflow and preserve the requested audience. Use visualize integration for an inline preview. Static requests use an SVG or PNG of the same selected state.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Threat Model Explorer"
  short_description: "Explore threat models, attack paths, and scoped controls"
  default_prompt: "Use $threat-model-visualize to visualize the threat model from the latest scan of the requested repository."
```

### File: `assets/control-effects.js`

```javascript
// Pure path semantics shared by the portable renderer and its regression checks.
const ControlEffects = (() => {
  function applicable(scenario, context = {}) {
    return (scenario?.controls || []).filter(c =>
      (!c.sourceIds || c.sourceIds.includes(context.sourceId)) &&
      (!c.routeIds || c.routeIds.includes(context.routeId)));
  }

  function selection(scenario, state, context = {}) {
    const controls = applicable(scenario, context);
    return {
      control: controls.some(c => c.id === state.control) ? state.control : null,
      proposal: controls.some(c => c.id === state.proposal && c.kind === 'proposed') ? state.proposal : null
    };
  }

  function active(scenario, proposal, context = {}) {
    return applicable(scenario, context).filter(c => c.effect &&
      (c.kind === 'existing' || c.id === proposal));
  }

  function resolve(scenario, proposal, context = {}) {
    const controls = active(scenario, proposal, context);
    // Compare step, then receipt: a prearrival block prevents an arrival check.
    // Existing controls win only when both barriers act at the same point.
    const blocker = controls.filter(c => c.effect.outcome === 'blocks' &&
      c.effect.traffic !== 'continues' && c.effect.basis !== 'unverified' && Number.isInteger(c.effect.step))
      .sort((a, b) => a.effect.step - b.effect.step ||
        Number(a.effect.arrival === true) - Number(b.effect.arrival === true) ||
        Number(a.kind === 'proposed') - Number(b.kind === 'proposed'))[0] || null;
    return { controls, blocker, stop: blocker ? blocker.effect.step - 1 : -1 };
  }

  function caption(control) {
    const e = control?.effect;
    if (!e) return 'Effect not mapped';
    if (e.outcome === 'blocks') {
      const basis = control.kind === 'proposed' ? 'Would block' :
        e.basis === 'verified' ? 'Blocks · verified in supplied evidence' : 'Blocks · if enforced';
      return basis + (e.traffic === 'continues' ? ' · this effect leaves traffic open' :
        e.arrival === true ? ' · decision after arrival' : '');
    }
    return {
      limits: control.kind === 'proposed' ? 'Would limit impact · path continues' : 'Limits impact · path continues',
      detects: control.kind === 'proposed' ? 'Would detect activity · path continues' : 'Detects activity · path continues',
      'does-not-block': control.kind === 'proposed' ? 'Would not block this path' : 'Does not block this path',
      unknown: 'Effect not established'
    }[e.outcome];
  }

  function basis(control) {
    if (control.kind === 'proposed') return 'Proposed control';
    return {
      declared: 'DECLARED · IF ENFORCED',
      verified: 'VERIFIED · SUPPLIED EVIDENCE',
      unverified: 'EXISTING · EFFECT UNVERIFIED'
    }[control.effect?.basis] || 'EXISTING · SOURCE-QUALIFIED';
  }

  // Split an authored polyline at a fraction of its length. The stop marker is
  // perpendicular to the actual route, including routes with several corners.
  function split(points, fraction) {
    const lengths = points.slice(1).map((p, i) =>
      Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = lengths.reduce((sum, n) => sum + n, 0);
    if (!total) throw new Error('A control needs a nonzero route.');
    const target = Math.min(1, Math.max(0, fraction)) * total;
    let distance = 0;
    for (let i = 0; i < lengths.length; i++) {
      const length = lengths[i];
      if (!length) continue;
      if (distance + length >= target || i === lengths.length - 1) {
        const t = (target - distance) / length, a = points[i], b = points[i + 1];
        const point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        return {
          before: [...points.slice(0, i + 1), point],
          after: [point, ...points.slice(i + 1)],
          point, normal: [-(b[1] - a[1]) / length, (b[0] - a[0]) / length]
        };
      }
      distance += length;
    }
  }
  return { applicable, selection, active, resolve, caption, basis, split };
})();
```

### File: `assets/explorer.css`

```text
:root{--ink:#18313d;--muted:#647783;--line:#dce4e6;--paper:#f6f8f7;--teal:#167765;--orange:#bc541e;--purple:#78549a;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--paper)}
*{box-sizing:border-box}body{margin:0}button{font:inherit;color:inherit;cursor:pointer;background:white;border:1px solid var(--line);border-radius:6px;padding:8px 10px}button:hover{border-color:#829d9f}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid #5199bd;outline-offset:2px}header{padding:12px 22px;background:white;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:18px}.brand{font-weight:750;font-size:15px}.brand small{display:block;font-size:8px;letter-spacing:1.6px;color:var(--muted);margin-top:4px}main{max-width:1900px;margin:auto;padding:0 18px}h1{font-size:25px;letter-spacing:-.6px;font-weight:650;margin:0 0 5px}h2{font-size:17px;font-weight:650;margin:0 0 8px}h3{font-size:12px;margin:0 0 7px}p{line-height:1.55;margin:6px 0;color:var(--muted);font-size:12px}.eyebrow{font-size:9px;font-weight:750;letter-spacing:1px;color:var(--teal)}.intro{display:flex;justify-content:space-between;align-items:center;gap:24px;min-height:94px;padding:14px 2px}.intro p{margin:0;font-size:12px}.snapshot{border-left:2px solid #9abcb0;padding-left:14px;max-width:270px;font-size:11px;line-height:1.6;color:var(--muted)}
.workspace{display:grid;grid-template-columns:190px minmax(0,1fr) 300px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:white;height:calc(100dvh - 176px);min-height:530px;max-height:980px}.rail{padding:17px 10px;background:#fafbfa;border-right:1px solid var(--line);overflow:auto;scrollbar-width:thin}.rail h2{font-size:11px;padding:0 8px;margin-bottom:15px}.rail button{display:block;width:100%;text-align:left;margin-bottom:7px;border-color:transparent;background:none;padding:10px 8px;font-size:11px;line-height:1.4}.rail button.active{background:#fff;border-color:#aec7c8;box-shadow:0 2px 8px #18313d08}.rail button b{display:block;margin-bottom:6px}.rail button small{display:block;color:#647783;font-size:9px}.rail .id{font:10px ui-monospace,monospace;color:#637f85;margin-right:6px}.rail .help{font-size:10px;border-top:1px solid var(--line);padding:12px 8px}.map-column{min-width:0;display:flex;flex-direction:column}.toolbar{padding:15px 18px;display:flex;align-items:center;min-height:77px}.toolbar h2{font-size:16px;margin-bottom:5px}.toolbar p{font-size:11px;margin:0}.canvas{position:relative;background-color:#fbfcfb;background-image:radial-gradient(#cdd9d9 .7px,transparent .7px);background-size:17px 17px;border-block:1px solid #e9eeee;flex:1;min-height:260px;overflow:hidden}.canvas svg{display:block;width:100%;height:100%;touch-action:none}.zoom{position:absolute;bottom:12px;right:12px;display:flex;background:white;border:1px solid var(--line);border-radius:6px;overflow:hidden}.zoom button{border:0;border-right:1px solid var(--line);border-radius:0;font-size:12px;min-width:32px}.zoom button:last-child{border-right:0}.legend{display:flex;gap:9px 14px;flex-wrap:wrap;padding:12px 16px;font-size:9px;color:var(--muted)}.legend span:before{content:'';display:inline-block;width:18px;border-top:2px solid #9fb5be;margin-right:5px;vertical-align:middle}.legend .risk:before{border-color:var(--orange)}.legend .unknown:before{border-top-style:dashed}.legend .existing:before{border-color:var(--teal)}.legend .proposed:before{border-color:var(--purple);border-top-style:dashed}
.detail-panel{border-left:1px solid var(--line);overflow:auto;scrollbar-width:thin;padding:0 16px 18px;background:#fdfefd}.detail-heading{display:flex;justify-content:space-between;align-items:center;padding:15px 0 9px}.detail-heading h2{font-size:12px;margin:0}.detail-heading span{font:10px ui-monospace,monospace;color:var(--muted)}.trace-navigation{position:sticky;top:0;z-index:3;background:#fdfefdf7;padding:6px 0 12px;display:flex;gap:5px;border-bottom:1px solid var(--line);margin-bottom:14px}.trace-navigation button{font-size:10px;padding:7px;flex:1;white-space:nowrap}.trace-title{font-size:16px;line-height:1.35;letter-spacing:-.2px;margin:8px 0}.badge{display:inline-block;background:#eef3f2;color:#49676b;padding:5px 7px;font-size:9px;border-radius:4px;margin-bottom:3px;line-height:1.5}.steps{display:grid;gap:6px;margin:13px 0}.steps button{text-align:left;font-size:11px;line-height:1.4;background:#fff;padding:8px 9px;position:relative}.steps button.current{background:#fff1e6;border-color:#bc754e}.steps span{display:block;font:9px ui-monospace,monospace;color:var(--muted);margin-bottom:4px}.steps button.stop{border-left:3px solid var(--teal);color:var(--teal);background:#f0f8f4}.steps button.proposed{border-color:#a789bd;color:var(--purple);background:#f8f2fd}.steps button.unreached{border-style:dashed;background:#f5f7f6;color:#5e727a;opacity:.7}.step-description{font-size:11px;padding:10px;border-left:2px solid #bc754e;background:#fff8f1;margin-bottom:14px}.controls{border-top:1px solid var(--line);padding-top:14px;margin-top:14px}.controls h3{font-size:11px}.controls .group-label{font-size:9px;color:var(--muted);letter-spacing:.6px;margin:12px 0 5px}.controls button{width:100%;font-size:11px;text-align:left;margin:0 0 6px;padding:9px 10px;line-height:1.4}.controls button span{display:block;font-size:9px;color:var(--muted);margin-top:4px}.controls button.existing{border-left:3px solid #8cb6a8}.controls button.proposed{border-left:3px solid #b39acb}.controls button.active{border-color:#698e88;background:#eef6f2}.controls button.proposed.active{border-color:#a789bd;background:#f7f0fd}.controls button.proposed b:before{content:'＋ ';font-weight:400}.controls button.proposed.active b:before{content:'− '}.effect-card{border:1px solid #b5d4c6;border-left:3px solid var(--teal);border-radius:6px;background:#f0f8f4;padding:11px;margin:12px 0}.effect-card.proposed{border-color:#c7b4da;border-left-color:var(--purple);background:#f8f3fc}.effect-card .eyebrow{font-size:8px;letter-spacing:.5px;color:var(--teal)}.effect-card.proposed .eyebrow{color:var(--purple)}.effect-card h3{font-size:13px;line-height:1.4;margin-top:7px}.effect-card p{font-size:11px;color:#49655f}.effect-card.proposed p{color:#695575}.effect-card .disposition{font-weight:650;margin-top:8px}.evidence{margin-top:9px;display:flex;gap:5px;flex-wrap:wrap}.evidence button{font:10px ui-monospace,monospace;background:#f2f5f5;text-align:left;overflow-wrap:anywhere;padding:6px 8px;max-width:100%}.detail-panel details{border-top:1px solid var(--line);padding-top:10px;margin-top:12px}.detail-panel summary{font-size:11px;font-weight:600;cursor:pointer;padding:3px 0}.detail-panel details p{font-size:11px}.detail-panel details h3{margin-top:12px;font-size:11px}.inspector{border-top:2px solid #698e97;margin-top:15px;padding-top:15px}.inspector .close{float:right;font-size:10px;padding:4px 6px}.inspector h2{font-size:15px;margin-top:9px}.inspector p{font-size:11px}
.metadata{margin-top:15px}.metadata summary{cursor:pointer;font-size:12px;font-weight:650;padding:10px 0}.metadata pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.65 ui-monospace,monospace;background:white;padding:18px;border:1px solid var(--line);border-radius:8px}dialog{width:min(850px,92vw);max-height:88vh;overflow:auto;border:1px solid #bbcdce;border-radius:12px;padding:25px;color:var(--ink);box-shadow:0 30px 100px #0d293e45}dialog::backdrop{background:#102c3b80}dialog blockquote{margin:18px 0;background:#f2f6f4;border-left:3px solid #86a99a;padding:17px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:13px}dialog .close{float:right}footer{font-size:10px;color:var(--muted);padding:18px 0;line-height:1.6}.actions{display:flex;gap:6px}.actions button{font-size:10px}.hidden{display:none!important}
@media(min-width:1700px){.workspace{grid-template-columns:215px minmax(0,1fr) 330px}.rail button{font-size:12px}.detail-panel p{font-size:12px}.steps button,.controls button{font-size:12px}}
@media(max-width:1150px){main{padding:0 10px}.snapshot{display:none}.workspace{grid-template-columns:155px minmax(0,1fr) 265px}.detail-panel{padding-inline:12px}.rail{padding-inline:5px}.toolbar{padding:12px}.toolbar h2{font-size:14px}.legend{gap:8px;padding:10px}.intro{min-height:85px}.workspace{height:calc(100dvh - 165px)}}
@media(max-width:850px){.workspace{grid-template-columns:minmax(0,1fr) 250px;grid-template-rows:auto minmax(0,1fr);min-height:620px}.rail{grid-column:1/-1;display:flex;gap:5px;padding:8px;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid var(--line)}.rail h2,.rail .help{display:none}.rail button{min-width:145px;max-width:175px;margin:0;font-size:10px}.rail button small{display:none}.rail button b{margin:0}.intro h1{font-size:22px}.canvas svg{min-height:0}.toolbar{min-height:70px}.map-column{min-height:0}}
@media(max-width:600px){header{padding:10px}.brand{font-size:12px}.actions button{font-size:9px;padding:6px}.intro{min-height:85px}.workspace{display:flex;flex-direction:column;height:auto}.rail{flex:none;min-height:68px}.map-column{min-height:450px}.canvas{min-height:330px}.detail-panel{max-height:520px;border-left:0;border-top:1px solid var(--line)}.snapshot{display:none}}
.trace-navigation[hidden]{display:none}.panel-tabs{display:flex;gap:6px;margin:12px 0}.panel-tabs button{flex:1;font-size:10px;padding:7px}.panel-tabs button[aria-selected=true]{background:#18313d;border-color:#18313d;color:white}.inspect-control{font-size:10px;background:transparent;border:0;border-bottom:1px solid #9ab8ab;border-radius:0;padding:3px 0;margin-top:5px}.control-hint,.earlier-block{font-size:10px!important}.controls:first-child{margin-top:0}
@media(min-width:601px){.map-column{min-height:0}.canvas{flex:1 1 0;min-height:0}}
.rail,.detail-panel{overscroll-behavior:contain}
.toolbar #edge-context{margin-left:auto;white-space:nowrap;font-size:10px}
.source-choice-label{display:block;font-size:10px;font-weight:650;margin-bottom:6px}#source-select{font:inherit;font-size:11px;line-height:1.4;width:100%;padding:8px;color:var(--ink);background:#fff;border:1px solid #aec7c8;border-radius:6px}
.source-context{margin:10px 0}.detail-panel .source-card{border:0;border-left:3px solid var(--source-ink);border-radius:5px;background:var(--source-fill);padding:8px 10px;margin:7px 0}.source-card summary{color:var(--source-ink);line-height:1.4;list-style:none}.source-card summary:after{content:'Details +';display:block;font-size:9px;font-weight:400;margin-top:3px}.source-card[open] summary:after{content:'Details −'}.source-card summary small{display:block;font-size:9px;font-weight:500;margin-bottom:3px}.source-card summary strong{font-size:12px}.source-card p{color:var(--ink)}.source-unmapped{display:block;font-size:9px;font-weight:400;margin-top:5px}.source-gap{font-size:10px!important}.source-inspect{padding:8px;background:var(--source-fill);border-left:3px solid var(--source-ink)}#source-legend{display:contents}.legend #source-legend:before,.legend .source-key:before{content:none}.source-key i{display:inline-block;width:18px;height:10px;border:1px solid;border-radius:2px;vertical-align:middle;margin-right:5px}
.route-picker{margin:12px 0;padding-bottom:10px;border-bottom:1px solid var(--line)}.route-picker label{display:block;font-size:10px;font-weight:650;margin-bottom:6px}.route-picker select{font-family:inherit;font-size:11px;line-height:1.4;color:var(--ink);width:100%;padding:8px;background:white;border:1px solid #aec7c8;border-radius:6px}.route-key{font-size:10px!important;line-height:1.5}.route-picker .evidence{margin:6px 0 0}.route-picker .evidence button{font-size:9px;padding:4px 5px}.legend .transit:before,.legend .focus:before{height:10px;border:1px solid #b5c9cd;border-radius:2px;background:#fff0d5}.legend .focus:before{border:2px solid var(--orange)}
@media(min-width:851px) and (max-width:1350px){.workspace{grid-template-columns:155px minmax(0,1fr) 265px}.detail-panel{padding-inline:12px}.rail{padding-inline:5px}.toolbar{padding:12px}.toolbar h2{font-size:14px}}
```

### File: `assets/explorer.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Threat model explorer</title>
<style>__EXPLORER_CSS__</style>
</head>
<body>
<header><div class="brand" id="brand"></div><div class="actions"><button id="svg-download">Download map SVG</button><button id="html-download">Download HTML</button></div></header>
<main>
<section class="intro"><div><h1 id="title"></h1><p id="subtitle"></p></div><div class="snapshot" id="snapshot"></div></section>
<section class="workspace" aria-label="Threat model workbench">
<nav class="rail" aria-label="Threat scenarios" id="rail"></nav>
<div class="map-column">
<div class="toolbar"><div><h2 id="map-title"></h2><p id="map-description"></p></div><button id="edge-context" hidden aria-pressed="false">More connections</button></div>
<div class="canvas"><svg id="map" role="group" aria-label="Interactive architecture map"></svg><div class="zoom"><button id="out" aria-label="Zoom out">−</button><button id="in" aria-label="Zoom in">+</button><button id="fit">Fit</button></div></div>
<div class="legend"><span id="source-legend"></span><span class="risk">Selected route</span><span class="transit">On route · normal outline</span><span class="focus">Scenario focus</span><span class="existing">Existing control</span><span class="proposed">Proposed control</span><span class="unknown">Conditional / unreached</span></div>
</div>
<aside class="detail-panel" aria-label="Path and controls">
<div class="detail-heading"><h2>Path & controls</h2><span id="trace-position"></span></div>
<div class="trace-navigation" id="trace-navigation"></div>
<section id="trace" aria-live="polite"></section>
<section id="inspector" class="inspector hidden" aria-live="polite"></section>
</aside>
</section>
<section class="metadata"><details><summary>Source & deployment context</summary><div id="metadata"></div></details><details><summary>Full supplied assessment</summary><p>The supplied assessment is preserved in full, including its qualifications.</p><pre id="assessment"></pre></details></section>
<footer id="footer"></footer>
</main>
<dialog id="dialog" aria-labelledby="evidence-title"><button class="close" id="close-dialog" aria-label="Close evidence">×</button><div id="dialog-content"></div></dialog>
<script id="model-data" type="application/json">__MODEL_JSON__</script>
<script id="assessment-data" type="application/json">__ASSESSMENT_JSON__</script>
<script>__CONTROL_EFFECTS_JS__</script>
<script>__ROUTE_PATHS_JS__</script>
<script>__SOURCE_ROLES_JS__</script>
<script>__SVG_LAYOUT_JS__</script>
<script>__EXPLORER_JS__</script>
</body>
</html>
```

### File: `assets/explorer.js`

```javascript
'use strict';
const M = JSON.parse(document.getElementById('model-data').textContent);
const assessment = JSON.parse(document.getElementById('assessment-data').textContent);
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textMeasureCache = new Map();
const mapLayoutCache = new Map();
function measureSvgText(text, size, weight = 400) {
  const family = typeof getComputedStyle === 'function' ? getComputedStyle($('map')).fontFamily : 'Arial,sans-serif';
  const key = JSON.stringify([text,size,weight,family]);
  if (textMeasureCache.has(key)) return textMeasureCache.get(key);
  let measured = SvgLayout.fallback(text,size);
  if (document.createElementNS && $('map').appendChild) {
    const node = document.createElementNS('http://www.w3.org/2000/svg','text');
    node.textContent = text; node.setAttribute('font-size',size); node.setAttribute('font-weight',weight);
    node.setAttribute('font-family',family); node.setAttribute('visibility','hidden'); $('map').appendChild(node);
    try { const box = node.getBBox(); if (box.width > 0) measured = {w:box.width,ascent:Math.max(size*.8,-box.y),descent:Math.max(size*.2,box.y+box.height)}; }
    finally { node.remove(); }
  }
  textMeasureCache.set(key,measured); return measured;
}
function captionSvg(p, color, region = null) {
  if (!p) return '';
  const x = p.x+p.w/2, y = p.y+4+p.ascent;
  let leader = '';
  if(region){
    const cy=p.y+p.h/2,rx=Math.max(region.x,Math.min(x,region.x+region.w)),ry=Math.max(region.y,Math.min(cy,region.y+region.h));
    const sides=[[region.x,ry],[region.x+region.w,ry],[rx,region.y],[rx,region.y+region.h]];
    sides.sort((a,b)=>Math.hypot(a[0]-x,a[1]-cy)-Math.hypot(b[0]-x,b[1]-cy));
    const targetFor=a=>[Math.max(p.x,Math.min(a[0],p.x+p.w)),Math.max(p.y,Math.min(a[1],p.y+p.h))];
    const anchor=sides.find(a=>!M.nodes.some(n=>SvgLayout.segmentIntersectsRect(a,targetFor(a),SvgLayout.padded(n,2)))) || sides[0],target=targetFor(anchor);
    if(Math.hypot(target[0]-anchor[0],target[1]-anchor[1])>2)leader=`<path data-caption-leader="true" d="M${esc(anchor[0])} ${esc(anchor[1])} L${esc(target[0])} ${esc(target[1])}" fill="none" stroke="${color}" stroke-width="1" opacity=".6"/>`;
  }
  if(p.edge){const anchor=SvgLayout.sample(p.edge.points,SvgLayout.nearestOffset(p.edge.points,[x,p.y+p.h/2]));
    const target=[Math.max(p.x,Math.min(anchor[0],p.x+p.w)),Math.max(p.y,Math.min(anchor[1],p.y+p.h))];
    if(Math.hypot(target[0]-anchor[0],target[1]-anchor[1])>12)leader=`<path data-caption-leader="true" d="M${esc(anchor[0])} ${esc(anchor[1])} L${esc(target[0])} ${esc(target[1])}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`;
  }
  return `<g data-caption="${esc(p.id)}" data-caption-kind="${p.kind}" data-layout-unresolved="${p.conflicts>0}" data-connector-crossings="${p.connectorCrossings||0}"><title>${esc(p.text)}</title>${leader}<text text-anchor="middle" font-size="${p.size}" font-weight="${p.weight}" fill="${color}" paint-order="stroke" stroke="#fbfcfb" stroke-width="5" stroke-linejoin="round">${p.lines.map((line,i)=>`<tspan x="${esc(x)}" y="${esc(y+i*p.lineHeight)}">${esc(line)}</tspan>`).join('')}</text></g>`;
}
const state = {scenario:null, route:null, source:null, step:-1, node:null, control:null, proposal:null, tab:'path', context:false, zoom:1, x:0, y:0};
const hypothesis = () => M.scenarios.find(s => s.id === state.scenario);
const evidence = id => M.evidence.find(e => e.id === id);
const controlContext = () => ({routeId:state.route, sourceId:sourceState().selected?.id});
const applicableControls = () => ControlEffects.applicable(hypothesis(), controlContext());
const selectedControl = () => applicableControls().find(c => c.id === state.control);
const refs = ids => `<div class="evidence">${(ids || []).map(id => `<button data-evidence="${esc(id)}">${esc(evidence(id).label)} ↗</button>`).join('')}</div>`;
const effectState = () => ControlEffects.resolve(hypothesis(), state.proposal, controlContext());
const routeState = () => RoutePaths.resolve(M, hypothesis(), state.route, effectState().stop, effectState().blocker?.effect.arrival === true);
const sourceState = () => SourceRoles.resolve(M, hypothesis(), state.route, state.source);
const controlColor = c => c?.kind === 'proposed' ? '#78549a' : '#167765';
const pointsText = points => esc(points.map(p => p.join(',')).join(' '));

function hash() {
  const q = new URLSearchParams();
  if (state.scenario) q.set('scenario', state.scenario);
  if (state.route) q.set('route', state.route);
  if (state.source) q.set('source', state.source);
  if (state.step >= 0) q.set('step', state.step + 1);
  if (state.node) q.set('node', state.node);
  if (state.control) q.set('control', state.control);
  if (state.proposal) q.set('preview', state.proposal);
  if (state.tab !== 'path') q.set('panel', state.tab);
  if (state.context && Array.isArray(M.overviewEdges)) q.set('context', '1');
  history.replaceState(null, '', '#' + q);
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  state.scenario = M.scenarios.some(s => s.id === q.get('scenario')) ? q.get('scenario') : null;
  const s = hypothesis();
  state.route = q.get('route');
  state.source = q.get('source');
  state.step = s && Number.isInteger(Number(q.get('step'))) && Number(q.get('step')) > 0 ? Math.min(s.steps.length - 1, Number(q.get('step')) - 1) : -1;
  state.node = M.nodes.some(n => n.id === q.get('node')) ? q.get('node') : null;
  state.control = q.get('control');
  state.proposal = q.get('preview') || state.control;
  state.tab = q.get('panel') === 'controls' ? 'controls' : 'path';
  state.context = Array.isArray(M.overviewEdges) && q.get('context') === '1';
  render();
}
function focusTarget() {
  const el = document.activeElement;
  if (!el) return null;
  for (const key of ['data-scenario','data-step','data-node','data-control','data-control-inspect','data-panel'])
    if (el.hasAttribute(key)) return '[' + key + '="' + CSS.escape(el.getAttribute(key)) + '"]';
  return el.id ? '#' + CSS.escape(el.id) : null;
}
function restoreFocus(selector) {
  if (!selector) return;
  let target = document.querySelector(selector);
  if (target?.disabled) target = document.querySelector('[data-step="' + state.step + '"]');
  if (!target) target = document.querySelector('#rail button.active');
  target?.focus({preventScroll:true});
}
function limitStep() {
  const {stop} = effectState();
  if (stop >= 0 && state.step > stop) state.step = stop;
  if (!hypothesis()?.steps.length) state.step = -1;
}
function effectCard(c, compact = false) {
  if (!c) return '';
  const e = c.effect;
  if (!e) return `<div class="effect-card ${esc(c.kind)}"><div class="eyebrow">${c.kind === 'proposed' ? 'Proposed control' : 'EXISTING · SOURCE-QUALIFIED'}</div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><p>Effect not mapped. This annotation does not stop the trace.</p>${refs(c.evidence)}</div>`;
  const duplicate = c.description === e.reason;
  return `<div class="effect-card ${esc(c.kind)}" data-effect-outcome="${esc(e.outcome)}"><div class="eyebrow">${esc(ControlEffects.basis(c))}</div><h3>${esc(e.label)}</h3>${compact ? '' : `<p><strong>${esc(c.title)}:</strong> ${esc(c.description)}</p>`}${compact || !duplicate ? `<p>${esc(e.reason)}</p>` : ''}<p class="disposition">${esc(ControlEffects.caption(c))}</p><p><strong>Applies when:</strong> ${esc(e.conditions)}</p><p><strong>What remains:</strong> ${esc(e.residual)}</p>${compact ? `<button class="inspect-control" data-control-inspect="${esc(c.id)}">Description & evidence ↗</button>` : refs(c.evidence)}</div>`;
}
function renderControls(s) {
  const {blocker} = effectState(), selected = selectedControl() || blocker;
  const group = kind => applicableControls().filter(c => c.kind === kind).map(c => {
    const chosen = c.kind === 'proposed' ? state.proposal === c.id : selected?.id === c.id;
    return `<button data-control="${esc(c.id)}" class="${kind} ${chosen ? 'active' : ''}" aria-pressed="${chosen}"><b>${esc(c.title)}</b><span>${esc(c.effect ? ControlEffects.caption(c) : 'Effect not mapped')}</span></button>`;
  }).join('');
  return `<div class="controls"><h3>Controls on this path</h3>${applicableControls().some(c => c.kind === 'existing') ? `<p class="group-label">EXISTING · AS DESCRIBED IN THE ASSESSMENT</p>${group('existing')}` : ''}${applicableControls().some(c => c.kind === 'proposed') ? `<p class="group-label">Proposed controls</p>${group('proposed')}<p class="control-hint">Select a proposed control to preview its effect; select it again to restore the assessed path.</p>` : ''}</div>${selected ? effectCard(selected) : '<p>Select a control to see where and why it acts.</p>'}${selectedControl()?.nodes?.length ? '<p>C marks the selected control locus; it does not establish enforcement.</p>' : ''}${blocker && selected && blocker.id !== selected.id ? `<p class="earlier-block"><strong>First barrier:</strong> ${esc(blocker.title)} ${blocker.kind === 'proposed' ? 'would stop' : 'stops'} this path at step ${esc(blocker.effect.step)}, under its stated conditions.${selected.effect?.traffic === 'continues' ? ' It may stop the flow before the selected effect occurs.' : ''}</p>` : ''}`;
}
function sourceContext(s) {
  const {sources, allSources, selected, jointRequirement} = sourceState();
  if (!sources.length) return s.sourceNote || s.sources?.length ? `<p class="source-gap">${esc(s.sourceNote || 'No supplied starting position is mapped to this documented flow.')}</p>` : '';
  const selector = selected && allSources.length > 1 ? `<label class="source-choice-label" for="source-select">Alternative starting positions · choose one</label><select id="source-select">${allSources.map(source => `<option value="${esc(source.id)}" ${source.id === selected.id ? 'selected' : ''}>${esc(source.label)}</option>`).join('')}</select><p class="source-gap">These are alternative starting positions. ${selected.relatedEdges ? 'Highlighted relationships are supplied for this source.' : 'Relationship highlights retain the scenario set unless a documented flow is selected.'}</p>` : '';
  return `<section class="source-context" aria-label="Threat sources">${selector}${jointRequirement ? `<p class="source-gap">${esc(jointRequirement)}</p>` : ''}${sources.map(source => {
    const p = SourceRoles.palette[source.kind];
    return `<details class="source-card" data-source-id="${esc(source.id)}" style="--source-fill:${p.fill};--source-ink:${p.ink}"><summary><small>${esc(p.label)} · ${source.basis === 'scenario-assumption' ? 'assumed' : source.basis === 'assessment-observed' ? 'source-observed' : 'uncertain'}</small><strong>${esc(source.label)}</strong>${source.node === null ? '<span class="source-unmapped">Source not mapped to a component in this view</span>' : ''}</summary><p>${esc(source.description)}</p><p><strong>Starting authority:</strong> ${esc(source.authority)}</p><p>${esc(SourceRoles.basis[source.basis])}. Scenario status remains ${esc(s.status)}.</p>${refs(source.evidence)}</details>`;
  }).join('')}${s.sourceNote ? `<p class="source-gap">${esc(s.sourceNote)}</p>` : ''}</section>`;
}
function branchEvidence(routing, scenario) {
  if (!routing?.branchStates.length) return '';
  const edges = new Map(M.edges.map(edge => [edge.id, edge]));
  const nodes = new Map(M.nodes.map(node => [node.id, node]));
  return `<details class="branch-evidence"><summary>Branch evidence · ${routing.branchStates.length}</summary>${routing.branchStates.map(({branch, active, reached}, index) => {
    const chain = branch.edges.map(id => edges.get(id));
    const path = [chain[0].from, ...chain.map(edge => edge.to)].map(id => nodes.get(id).title).join(' → ');
    const step = branch.beforeStep ?? branch.afterStep;
    const timing = step === undefined ? 'No occurrence order supplied.' :
      `${branch.beforeStep === undefined ? 'After successful' : 'Before'} step ${step}: ${scenario.steps[step - 1].title}.`;
    const reach = active ? 'Active in this view.' : reached ? `Partially reached in this view (${reached} of ${chain.length} connections).` : 'Not reached in this view.';
    return `<section data-route-branch="${index}" data-path-state="${active ? 'active' : reached ? 'partial' : 'unreached'}"><h3>${esc(path)}</h3><p>${reach} ${esc(timing)}</p>${refs(branch.evidence)}</section>`;
  }).join('')}</details>`;
}
function renderTrace(s) {
  if (!s) return `<h2 class="trace-title">${esc(M.overviewTitle)}</h2><p>${esc(M.overview)}</p><h3 style="margin-top:18px">Evidence boundary</h3><p>${esc(M.evidenceBoundary)}</p><p>Select a scenario to keep its map, steps and controls in this workspace.</p>`;
  const {blocker, stop} = effectState();
  const continuing = effectState().controls.filter(c => c.effect.outcome === 'blocks' && c.effect.traffic === 'continues');
  const resolvedRoute = routeState(), route = resolvedRoute?.route;
  const routing = route ? `<div class="route-picker">${s.routes.length > 1 ? `<label for="route-select">Documented flow · choose an alternative</label><select id="route-select">${s.routes.map(r => `<option value="${esc(r.id)}" ${r.id === route.id ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>` : `<p class="group-label">${esc(route.label)}</p>`}<p class="route-key">Filled components carry this route. Normal outlines indicate transit; orange outlines mark the scenario focus, subject to its stated confidence.</p>${refs(route.evidence)}${branchEvidence(resolvedRoute, s)}</div>` : '';
  const context = `<details><summary>Conditions, impact & source evidence</summary><h3>Required conditions</h3><p>${esc(s.prerequisites)}</p><h3>Potential impact</h3><p>${esc(s.impact)}</p><h3>Severity & confidence</h3><p>${esc(s.calibration)}</p>${s.pathNote ? `<p><strong>Path scope:</strong> ${esc(s.pathNote)}</p>` : ''}${refs(s.evidence)}</details>`;
  const tabs = `<div class="panel-tabs" role="tablist" aria-label="Inspector view"><button role="tab" data-panel="path" aria-selected="${state.tab === 'path'}">Path trace</button><button role="tab" data-panel="controls" aria-selected="${state.tab === 'controls'}">Controls · ${applicableControls().length}</button></div>`;
  const steps = `<div class="steps" aria-label="Ordered path">${s.steps.map((t, i) => {
    const stopped = i === stop, unreached = stop >= 0 && i > stop;
    return `<button data-step="${i}" class="${state.step === i ? 'current ' : ''}${stopped ? 'stop ' + esc(blocker.kind) : ''}${unreached ? 'unreached' : ''}" aria-pressed="${state.step === i}" ${unreached ? 'disabled' : ''}><span>${stopped ? blocker.kind === 'proposed' ? 'Proposed control · would stop at ' : 'CONTROL · STOP AT ' : unreached ? 'NOT REACHED · ' : ''}${String(i + 1).padStart(2, '0')}</span>${esc(stopped ? blocker.effect.label : t.title)}</button>`;
  }).join('')}</div>`;
  const stepText = state.step >= 0 ? `<div class="step-description">${state.step === stop ? esc(blocker.effect.reason) : esc(s.steps[state.step].description)}</div>` : '';
  const rating = (s.priority ? ' · ' + esc(s.priority) + ' review priority' : '') +
    (s.severity ? ' · ' + esc(s.severity) + ' severity' : '');
  return `<span class="badge">${esc(s.status)}${rating}</span><h2 class="trace-title">${esc(s.title)}</h2>${tabs}${state.tab === 'controls' ? renderControls(s) : `${sourceContext(s)}${routing}<p>${applicableControls().some(c => c.effect?.outcome === 'blocks' && c.effect.traffic === 'continues') ? '<strong>Assessment context:</strong> ' : ''}${esc(s.summary)}</p>${blocker ? effectCard(blocker, true) : ''}${blocker && continuing.length ? '<p>A separate barrier may stop the flow before another effect occurs.</p>' : ''}${continuing.map(c => effectCard(c, true)).join('')}${steps}${stepText}${!s.steps.length ? `<p>${esc(s.pathNote || 'Affected components only; an ordered path is not established.')}</p>` : ''}`}${context}`;
}
function render() {
  const focus = focusTarget(), s = hypothesis(), panel = document.querySelector('.detail-panel'), scroll = panel.scrollTop;
  state.route = hypothesis()?.routes?.find(r => r.id === state.route)?.id || hypothesis()?.routes?.[0]?.id || null;
  state.source = sourceState().selected?.id || null;
  Object.assign(state, ControlEffects.selection(s, state, controlContext()));
  limitStep();
  const {stop} = effectState();
  $('rail').innerHTML = `<h2>${esc(M.scenarioLabel || 'Threat scenarios')} · ${M.scenarios.length}</h2><button data-scenario="" class="${!s ? 'active' : ''}">⊞ System overview</button>` + M.scenarios.map(h => `<button data-scenario="${esc(h.id)}" class="${s === h ? 'active' : ''}" aria-pressed="${s === h}"><b><span class="id">${esc(h.id)}</span>${esc(h.title)}</b><small>${esc(h.status)}</small></button>`).join('') + '<p class="help">Select a scenario to inspect its relationships and controls. Step through an ordered path when supplied.</p>';
  $('map-title').textContent = s ? s.title : M.mapTitle;
  $('map-description').textContent = s ? `${s.id} · ${s.status}${routeState() ? ' · ' + routeState().route.label : ''}` : M.mapDescription;
  if (Array.isArray(M.overviewEdges) && !state.context)
    $('map-description').textContent += s ? ' · Architecture context retained' : ' · Primary relationships';
  $('edge-context').textContent = state.context ? 'Fewer connections' : 'More connections';
  $('edge-context').setAttribute('aria-pressed', String(state.context));
  $('trace-position').textContent = s?.steps.length ? state.step >= 0 ? `Step ${state.step + 1} / ${s.steps.length}` : 'All steps shown' : '';
  $('trace-navigation').hidden = !s?.steps.length;
  const last = stop >= 0 ? stop : (s?.steps.length || 0) - 1;
  $('trace-navigation').innerHTML = `<button id="previous" aria-label="Previous path step" ${state.step <= 0 ? 'disabled' : ''}>← Previous</button><button id="next" aria-label="Next path step" ${!s?.steps.length || state.step >= last ? 'disabled' : ''}>Next →</button><button id="full" title="Clear the step highlight; keep the selected route and architecture visible" ${state.step < 0 ? 'disabled' : ''}>Clear step</button>`;
  $('trace').innerHTML = renderTrace(s);
  renderMap(); renderInspector(); hash(); panel.scrollTop = scroll; restoreFocus(focus);
}
function renderInspector() {
  const n = M.nodes.find(n => n.id === state.node), s = hypothesis();
  $('inspector').classList.toggle('hidden', !n);
  if (!n) return;
  const role = sourceState().nodes.get(n.id);
  $('inspector').innerHTML = `<button class="close" id="close-inspector">Close</button><div class="eyebrow">COMPONENT</div><h2>${esc(n.title)}</h2>${role ? `<p class="source-inspect" style="--source-fill:${role.fill};--source-ink:${role.ink}"><strong>${esc(role.label)}</strong>${role.items.map(item => `<br>${esc(item.label)}${item.authority ? `: ${esc(item.authority)}` : ''}`).join('')}</p>${refs([...new Set(role.items.flatMap(item => item.evidence))])}` : ''}<p>${esc(n.description)}</p>${s ? `<p><strong>${esc(s.id)} remains selected.</strong> ${esc(s.prerequisites)}</p>` : ''}${refs(n.evidence)}`;
}
function markerSvg(c, isBarrier, placement) {
  const e = c.effect, marker = e?.marker;
  if (!marker) return '';
  const edge = M.edges.find(x => x.id === e.edge), split = ControlEffects.split(edge.points, marker.at);
  const [px, py] = isBarrier && e.arrival ? edge.points.at(-1) : split.point, [nx, ny] = split.normal, color = controlColor(c);
  const {x,y,w,h} = placement, label = placement.lines;
  const center = [Math.max(x + 12, Math.min(px, x + w - 12)), Math.max(y, Math.min(py, y + h))];
  return `<g data-control-inspect="${esc(c.id)}" data-barrier="${isBarrier}" data-arrival="${isBarrier && e.arrival === true}" tabindex="0" role="button" aria-label="Inspect ${esc(c.title)}: ${esc(ControlEffects.caption(c))}" style="cursor:pointer"><title>${esc(ControlEffects.caption(c))}. ${esc(e.reason)} ${esc(e.conditions)}</title><path d="M${esc(px)} ${esc(py)} L${esc(center[0])} ${esc(center[1])}" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 4" fill="none"/>${isBarrier && !e.arrival ? `<path d="M${esc(px - nx * 14)} ${esc(py - ny * 14)} L${esc(px + nx * 14)} ${esc(py + ny * 14)}" stroke="${color}" stroke-width="5"/><circle cx="${esc(px)}" cy="${esc(py)}" r="9" fill="${color}" stroke="white" stroke-width="2"/><path d="M${esc(px - 4)} ${esc(py)} h8" stroke="white" stroke-width="2"/>` : `<circle cx="${esc(px)}" cy="${esc(py)}" r="7" fill="white" stroke="${color}" stroke-width="2"/>`}<rect data-caption="${esc(placement.id)}" data-caption-kind="control" data-layout-unresolved="${placement.conflicts>0}" x="${esc(x)}" y="${esc(y)}" width="${esc(w)}" height="${esc(h)}" rx="7" fill="${c.kind === 'proposed' ? '#f7efff' : '#eaf6ef'}" stroke="${color}" stroke-width="1.5" ${c.kind === 'proposed' ? 'stroke-dasharray="5 3"' : ''}/><text x="${esc(x + 12)}" y="${esc(y + 18)}" fill="${color}" font-size="10" font-weight="700">${esc(ControlEffects.basis(c))}</text>${label.map((t, i) => `<text x="${esc(x + 12)}" y="${esc(y + 40 + i * placement.lineHeight)}" fill="${color}" font-size="16" font-weight="600">${esc(t)}</text>`).join('')}</g>`;
}
function renderMap() {
  const focus = focusTarget(), s = hypothesis(), {blocker, stop} = effectState();
  const inspected = selectedControl();
  const selected = inspected || (!blocker ? applicableControls().find(c => c.kind === 'existing' && c.effect?.marker) : null);
  const routing = routeState();
  const roles = sourceState();
  const path = s?.steps || [], edgesOnPath = new Map(path.map((t, i) => [t.edge, i]));
  const arrived = blocker?.effect.arrival === true;
  const visibleSteps = s ? state.step < 0 ? path.filter((t, i) => stop < 0 || i <= stop) : [path[state.step]] : [];
  const activeEdges = routing?.activeEdges || new Set([...visibleSteps.filter(Boolean).map(t => t.edge), ...(!path.length ? roles.relatedEdges : [])]);
  const activeNodes = routing?.activeNodes || new Set([...visibleSteps.filter(Boolean).flatMap(t => t === path[stop] && !arrived ? [t.from] : [t.from, t.to]), ...(!path.length ? roles.relatedNodes : [])]);
  const downstream = routing?.unreachedNodes || new Set(stop >= 0 ? path.slice(stop + (arrived ? 1 : 0)).map(t => t.to) : []);
  const selectedEdges = new Set([...activeEdges, ...(routing?.unreachedEdges || []),
    ...path.map(t => t.edge), ...(selected?.edges || []),
    ...[selected?.effect?.edge, blocker?.effect?.edge].filter(Boolean)]);
  const primaryEdges = new Set(M.overviewEdges || M.edges.map(e => e.id));
  $('edge-context').hidden = !M.edges.some(e => !primaryEdges.has(e.id) && !selectedEdges.has(e.id));
  const visibleEdges = M.edges.filter(e => state.context || primaryEdges.has(e.id) || selectedEdges.has(e.id));
  const edgeStates = new Map(visibleEdges.map(e => {
    const index=edgesOnPath.get(e.id), active=activeEdges.has(e.id);
    const controlAssociated=!!(selected?.edges?.includes(e.id) || selected?.effect?.edge===e.id);
    const stopped=!!blocker && !arrived && index===stop;
    const unreached=routing ? routing.unreachedEdges.has(e.id) : stop>=0 && index>stop;
    const highlighted=stopped || (!unreached && (active || controlAssociated));
    const split=stopped ? ControlEffects.split(e.points,blocker.effect.marker.at) : null;
    return [e.id,{index,active,controlAssociated,stopped,unreached,highlighted,split}];
  }));
  const markerControls = [...(blocker ? [{c:blocker,barrier:true}] : []), ...(selected?.effect?.marker && selected.id!==blocker?.id && (selected.effect.outcome!=='blocks' || selected.effect.traffic==='continues') ? [{c:selected,barrier:false}] : [])];
  const captionItems = [
    ...markerControls.map(({c})=>({id:'control:'+c.id,kind:'control',priority:0,text:c.effect.label,size:16,weight:600,widths:[...new Set([c.effect.marker.w,Math.min(300,c.effect.marker.w+60),Math.max(160,c.effect.marker.w-40)].map(w=>Math.max(w,measureSvgText(ControlEffects.basis(c),10,700).w+24)-24))],cardWidth:c.effect.marker.w,anchor:[c.effect.marker.x+c.effect.marker.w/2,c.effect.marker.y+36]})),
    ...visibleEdges.filter(e=>e.label).map(e=>({id:'edge:'+e.id,kind:'edge',priority:edgeStates.get(e.id).highlighted?1:3,text:e.label,size:13,weight:400,widths:[180,140,220,100],edge:e,anchor:[e.labelX,e.labelY-4]})),
    ...(M.regions||[]).map(r=>({id:'region:'+r.id,kind:'region',priority:2,text:r.title,size:14,weight:600,widths:[...new Set([Math.max(40,r.w-24),Math.min(420,r.w+96),...[360,220,160,120,90].map(w=>Math.max(40,Math.min(w,r.w-24)))])],region:r,anchor:[r.x+12+Math.min(measureSvgText(r.title,14,600).w,r.w-24)/2,r.y+17]}))
  ];
  const layoutEdges=visibleEdges.map(e=>{
    const {highlighted,split}=edgeStates.get(e.id);
    return {...e,layoutActive:highlighted,layoutActivePoints:split ? split.before : e.points};
  });
  const layoutKey=JSON.stringify([captionItems,M.nodes.map(n=>[n.x,n.y,n.w,n.h]),layoutEdges.map(e=>[e.id,e.points,e.layoutActive,e.layoutActivePoints]),M.canvas,typeof getComputedStyle==='function'?getComputedStyle($('map')).fontFamily:'Arial,sans-serif']);
  let layout=mapLayoutCache.get(layoutKey);
  if(!layout){
    layout=SvgLayout.plan(captionItems,M.nodes,layoutEdges,M.canvas,measureSvgText);
    if(mapLayoutCache.size>=64)mapLayoutCache.delete(mapLayoutCache.keys().next().value);
    mapLayoutCache.set(layoutKey,layout);
  }
  const layoutIssues=[...layout.values()].filter(p=>p.conflicts>0).map(p=>({id:p.id,kind:p.kind,conflicts:p.conflicts}));
  const heads=SvgLayout.heads(visibleEdges.filter(e=>{
    const {stopped,unreached}=edgeStates.get(e.id);
    return !stopped && !unreached;
  }),e=>edgeStates.get(e.id).highlighted?1:0);
  const arrowId = head => 'arrow-'+String(head.size).replace('.','_');
  const markerSizes=[...new Set([...heads.values()].map(h=>h.size))];
  const defs='<defs>'+markerSizes.map(size=>`<marker id="${arrowId({size})}" markerUnits="userSpaceOnUse" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="${size}" markerHeight="8" preserveAspectRatio="none" orient="auto"><path d="M0 0L8 3L0 6Z" fill="context-stroke"/></marker>`).join('')+'</defs>';
  const regions=(M.regions||[]).map(r=>`<rect x="${esc(r.x)}" y="${esc(r.y)}" width="${esc(r.w)}" height="${esc(r.h)}" rx="12" fill="#eef4f2" fill-opacity=".5" stroke="#afc8bf" stroke-dasharray="5 5"/>${captionSvg(layout.get('region:'+r.id),'#607e76',r)}`).join('');
  // Visibility includes unreached paths; paint priority follows actual highlighting.
  const mutedEdges = [], highlightedEdges = [];
  visibleEdges.forEach(e => {
    const {index,active,controlAssociated,stopped,unreached,highlighted,split} = edgeStates.get(e.id);
    const color = controlAssociated && !stopped ? controlColor(selected) : active ? '#bc541e' : '#9db2bc';
    let body;
    if (stopped) {
      mutedEdges.push(`<g data-edge-tail="${esc(e.id)}" data-path-state="unreached" aria-hidden="true"><polyline data-route-part="unreached" points="${pointsText(split.after)}" fill="none" stroke="#a8b6bd" stroke-width="1.6" stroke-dasharray="5 6" opacity=".5"/></g>`);
      body = `<polyline data-route-part="before" points="${pointsText(split.before)}" fill="none" stroke="#bc541e" stroke-width="3" ${e.conditional ? 'stroke-dasharray="7 5"' : ''}/>`;
    } else body = `<polyline points="${pointsText(SvgLayout.clean(e.points))}" fill="none" stroke="${color}" stroke-width="${active && state.step >= 0 && index === state.step ? 4.5 : active || controlAssociated ? 3 : 1.6}" ${e.conditional || unreached ? 'stroke-dasharray="6 5"' : ''} ${heads.get(e.id)?.visible ? `marker-end="url(#${arrowId(heads.get(e.id))})"` : ''}/>`;
    const layer = highlighted ? highlightedEdges : mutedEdges;
    layer.push(`<g data-edge="${esc(e.id)}" data-path-state="${stopped ? 'stopped' : unreached ? 'unreached' : active ? 'active' : 'context'}" opacity="${stopped ? 1 : unreached ? .35 : s && !active && !controlAssociated ? .65 : 1}">${body}<title>${esc(e.label || e.id)}: ${esc(e.from)} → ${esc(e.to)}${heads.get(e.id)?.shared>1 ? ' · shared destination arrow' : ''}</title>${captionSvg(layout.get('edge:'+e.id),active ? '#995122' : '#647e87')}</g>`);
  });
  const edges = `<g data-edge-layer="muted">${mutedEdges.join('')}</g><g data-edge-layer="highlighted">${highlightedEdges.join('')}</g>`;
  const nodes = M.nodes.map(n => {
    const a = activeNodes.has(n.id), co = selected?.nodes?.includes(n.id), muted = downstream.has(n.id) && !a;
    const role = roles.nodes.get(n.id);
    const focused = a && !!s?.focusNodes?.includes(n.id), transit = a && !focused;
    const transport = transit && !!(routing || path.length);
    const relation = focused ? 'focus' : transit ? (transport ? 'transit' : 'related') : 'context';
    const stroke = transport ? '#b5c9cd' : state.node === n.id ? '#326d83' : co ? controlColor(selected) : focused ? '#bc541e' : '#b5c9cd';
    const nums = path.flatMap((t, i) => t.to === n.id && (stop < 0 || i < stop) ? [i + 1] : []);
    const roleText = role ? `, ${role.label}: ${role.items.map(item => item.label).join('; ')}` : '';
    const badge = role?.kind === 'compromised-component' && role.items.every(item => item.basis === 'scenario-assumption') ? 'ASSUMED COMPROMISE' : role?.badge;
    const owner = inspected?.nodes?.includes(n.id);
    const ownerText = owner ? `, selected control locus: ${inspected.title}` : '';
    const ownerBadge = owner ? `<g data-control-owner="${esc(inspected.id)}"><title>Selected control locus: ${esc(inspected.title)}</title><circle cx="${esc(n.x + n.w - 11)}" cy="${esc(n.y + n.h - 11)}" r="9" fill="${controlColor(inspected)}" stroke="white" stroke-width="1.5"/><text x="${esc(n.x + n.w - 11)}" y="${esc(n.y + n.h - 8)}" fill="white" text-anchor="middle" font-size="9" font-weight="700">C</text></g>` : '';
    const nodeText=SvgLayout.nodeRows(n,role ? badge : null,measureSvgText);
    if(nodeText.overflow)layoutIssues.push({id:'node:'+n.id,kind:'node-text',conflicts:1});
    const textRows=nodeText.rows.map(row=>`<text data-node-text="${row.key}" x="${esc(n.x+10)}" y="${esc(row.y)}" fill="${row.key==='role'?role.ink:row.key==='title'?'#24414c':'#68818a'}" font-size="${row.size}" font-weight="${row.weight}">${esc(row.text)}</text>`).join('');
    return `<g data-node="${esc(n.id)}" data-source-kind="${role?.source ? esc(role.kind) : ''}" data-participant-role="${role && !role.source ? esc(role.kind) : ''}" data-route-role="${relation}" data-path-state="${muted ? 'unreached' : a ? 'active' : 'context'}" tabindex="0" role="button" aria-label="Inspect ${esc(n.title)}${esc(roleText)}${esc(ownerText)}${transport ? ', transit on selected route' : transit ? ', related component; order unestablished' : focused ? ', scenario focus' : ''}" style="cursor:pointer" opacity="${muted ? .4 : s && !a && !co && !role?.source ? .7 : 1}"><title>${esc(n.description)}${esc(roleText)}${esc(ownerText)}${role?.source ? ' This role is the selected scenario’s starting condition, not a newly verified compromise.' : ''}${transport ? ' Traversed by the selected route; no weakness is attributed by this highlight.' : transit ? ' Related to the scenario; no traversal order or weakness is attributed by this highlight.' : ''}</title><rect x="${esc(n.x)}" y="${esc(n.y)}" width="${esc(n.w)}" height="${esc(n.h)}" rx="8" fill="${role?.fill || (a ? '#fff0d5' : n.kind === 'asset' ? '#edf4f6' : n.kind === 'actor' ? '#f2f6f4' : '#fff')}" stroke="${stroke}" stroke-width="${transport ? 1.4 : focused || co || state.node === n.id ? 2.4 : 1.4}" ${co && !transport && selected.kind === 'proposed' ? 'stroke-dasharray="5 3"' : ''}/>${textRows}${ownerBadge}${nums.length ? `<circle cx="${esc(n.x + n.w - 2)}" cy="${esc(n.y)}" r="11" fill="#bc541e" stroke="white" stroke-width="2"/><text x="${esc(n.x + n.w - 2)}" y="${esc(n.y + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="white">${nums.join(',')}</text>` : ''}</g>`;
  }).join('');
  const markers = markerControls.map(({c,barrier})=>markerSvg(c,barrier,layout.get('control:'+c.id))).join('');
  $('map').setAttribute('data-layout-status',layoutIssues.length?'unresolved':'clear');
  $('map').setAttribute('data-layout-issues',JSON.stringify(layoutIssues));
  $('map').setAttribute('viewBox', `0 0 ${M.canvas.width} ${M.canvas.height}`);
  $('map').setAttribute('aria-label', `${M.title}${s ? ' — ' + s.title : ''}${blocker ? ' — ' + ControlEffects.caption(blocker) : ''}`);
  $('map').innerHTML = defs + `<g id="viewport">${regions}${edges}${nodes}${markers}</g>`;
  const legendRoles = [...new Set([...roles.sources.map(source => source.kind), ...[...roles.nodes.values()].filter(role => !role.source).map(role => role.kind)])];
  $('source-legend').innerHTML = legendRoles.map(kind => `<span class="source-key"><i style="background:${SourceRoles.palette[kind].fill};border-color:${SourceRoles.palette[kind].ink}"></i>${esc(SourceRoles.palette[kind].label)}</span>`).join('');
  document.querySelector('.legend .risk').textContent = s && !routing && !path.length ? 'Scenario relationships' : 'Selected route';
  document.querySelector('.legend .transit').textContent = s && !routing && !path.length ? 'Related component · normal outline' : 'On route · normal outline';
  transform(); restoreFocus(focus);
}
function transform() { $('viewport').setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.zoom})`); }
function showEvidence(id) {
  const e = evidence(id);
  $('dialog-content').innerHTML = `<div class="eyebrow">SUPPLIED ASSESSMENT EVIDENCE</div><h2 id="evidence-title">${esc(e.label)}</h2><p>Exact quotation from the supplied assessment${e.startLine ? ` · lines ${esc(e.startLine)}–${esc(e.endLine)}` : ''}.</p><blockquote>${esc(e.quote)}</blockquote>${e.paths?.length ? `<h3>Paths cited by the assessment</h3><p>${e.paths.map(esc).join('<br>')}</p>` : ''}<p>The explorer preserves the assessment’s attribution. It adds no independent code or runtime verification.</p>`;
  $('dialog').showModal();
}
document.addEventListener('click', event => {
  const t = event.target.closest('button,[data-node],[data-control-inspect]');
  if (!t) return;
  if (t.hasAttribute('data-scenario')) {
    state.scenario = t.dataset.scenario || null; state.route = null; state.source = null; state.step = -1; state.control = null; state.proposal = null; state.node = null; state.tab = 'path';
    document.querySelector('.detail-panel').scrollTop = 0; render();
  } else if (t.hasAttribute('data-step')) { state.step = Number(t.dataset.step); render(); }
  else if (t.hasAttribute('data-panel')) { state.tab = t.dataset.panel; render(); }
  else if (t.hasAttribute('data-control-inspect')) { state.control = t.dataset.controlInspect; state.tab = 'controls'; document.querySelector('.detail-panel').scrollTop = 0; render(); }
  else if (t.hasAttribute('data-control')) {
    const c = applicableControls().find(c => c.id === t.dataset.control);
    if (!c) return;
    if (c.kind === 'proposed') {
      const turnOff = state.proposal === c.id;
      state.proposal = turnOff ? null : c.id; state.control = turnOff ? null : c.id; state.step = -1;
    } else state.control = state.control === c.id ? null : c.id;
    render();
  } else if (t.hasAttribute('data-node')) {
    state.node = t.dataset.node; render(); $('inspector').scrollIntoView({block:'nearest'});
  } else if (t.hasAttribute('data-evidence')) showEvidence(t.dataset.evidence);
  else if (t.id === 'previous') { state.step--; render(); }
  else if (t.id === 'next') { state.step++; render(); }
  else if (t.id === 'full') { state.step = -1; state.tab = 'path'; render(); }
  else if (t.id === 'edge-context') { state.context = !state.context; render(); }
  else if (t.id === 'close-inspector') { state.node = null; render(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'route-select') {
    state.route = event.target.value; state.source = null; state.step = -1; state.node = null;
    render();
  } else if (event.target.id === 'source-select') {
    state.source = event.target.value; state.node = null;
    render();
  }
});
$('map').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && (e.target.dataset.node || e.target.dataset.controlInspect)) {
    e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
  }
});
$('close-dialog').onclick = () => $('dialog').close();
$('fit').onclick = () => { state.zoom = 1; state.x = state.y = 0; transform(); };
function zoom(k) { const z = Math.max(.5, Math.min(3, state.zoom * k)), r = z / state.zoom; state.x = M.canvas.width / 2 - (M.canvas.width / 2 - state.x) * r; state.y = M.canvas.height / 2 - (M.canvas.height / 2 - state.y) * r; state.zoom = z; transform(); }
$('in').onclick = () => zoom(1.2); $('out').onclick = () => zoom(1 / 1.2);
let drag = null;
$('map').onpointerdown = e => { if (e.target.closest('[data-node],[data-control-inspect]')) return; drag = {x:e.clientX, y:e.clientY, px:state.x, py:state.y}; $('map').setPointerCapture(e.pointerId); };
$('map').onpointermove = e => { if (!drag) return; const r = $('map').getBoundingClientRect(), scale = Math.min(r.width / M.canvas.width, r.height / M.canvas.height); state.x = drag.px + (e.clientX - drag.x) / scale; state.y = drag.py + (e.clientY - drag.y) / scale; transform(); };
$('map').onpointerup = $('map').onpointercancel = () => drag = null;
function download(data, type, name) { const a = document.createElement('a'), url = URL.createObjectURL(new Blob([data], {type})); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportMapSvg() {
  const clone = $('map').cloneNode(true), s = hypothesis(), {blocker, controls} = effectState(), c = selectedControl() || blocker || controls.find(item => item.effect.outcome === 'blocks' && item.effect.traffic === 'continues');
  clone.querySelector('#viewport').removeAttribute('transform');
  const qualifiedCaption = control => `${ControlEffects.basis(control)} · ${ControlEffects.caption(control)}`;
  const foot = [s ? `${s.id}: ${s.title} · ${s.status}` : M.title,
    Array.isArray(M.overviewEdges) && !state.context ? 'Primary architecture connections remain visible; additional connections are available in the HTML.' : '',
    s && !routeState() && !s.steps.length ? 'Amber fill: related components; order unestablished · orange outline: scenario focus · teal: existing control · purple: proposed control' : 'Amber fill: on selected route · normal outline: transit · orange outline: scenario focus · teal: existing control · purple: proposed control',
    [...new Set([...sourceState().nodes.values()].map(role => role.kind))].length ? 'Role fills: ' + [...new Set([...sourceState().nodes.values()].map(role => role.kind))].map(kind => `${SourceRoles.palette[kind].colorName}: ${SourceRoles.palette[kind].label}`).join(' · ') : '',
    sourceState().jointRequirement,
    ...sourceState().sources.map(source => `Threat source: ${source.label} (${SourceRoles.palette[source.kind].label}; ${SourceRoles.basis[source.basis]}${source.node === null ? '; not mapped on diagram' : ''}). Starting authority: ${source.authority}`),
    routeState() ? `Documented flow: ${routeState().route.label}` : s && !s.steps.length ? (sourceState().selected?.relatedNodes ? 'Related components: supplied for selected starting position; order unestablished.' : 'Related components: shared scenario set; order unestablished.') : '',
    s && applicableControls().some(item => item.effect?.outcome === 'blocks' && item.effect.traffic === 'continues') ? `Assessment context: ${s.summary}` : '',
    selectedControl()?.nodes?.length ? `C badge: selected control locus for ${selectedControl().title}; not proof of enforcement.` : '',
    blocker ? `${qualifiedCaption(blocker)}: ${blocker.effect.label}. ${blocker.effect.conditions} ${blocker.effect.residual}` : '',
    ...controls.filter(item => item.effect.outcome === 'blocks' && item.effect.traffic === 'continues').map(item => `${qualifiedCaption(item)}: ${item.effect.label}. ${item.effect.conditions} ${item.effect.residual}${blocker ? ' A separate barrier may stop the flow before this effect occurs.' : ''}`),
    c && c.id !== blocker?.id && !controls.some(item => item.id === c.id && item.effect.traffic === 'continues') ? `${qualifiedCaption(c)}: ${c.title}${c.effect ? `. ${c.effect.conditions} ${c.effect.residual}` : ''}` : '',
    !blocker && !c ? M.exportNote || 'Assessment evidence; no runtime validation implied.' : ''];
  const lines = foot.filter(Boolean).flatMap(line => SvgLayout.lines(line, M.canvas.width - 40, 14, 400, measureSvgText));
  const height = lines.length * 22 + 30;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('viewBox', `0 0 ${M.canvas.width} ${M.canvas.height + height}`); clone.setAttribute('width', M.canvas.width); clone.setAttribute('height', M.canvas.height + height); clone.setAttribute('style', `font-family:${typeof getComputedStyle === 'function' ? getComputedStyle($('map')).fontFamily : 'Arial,sans-serif'};background:#fbfcfb`);
  clone.insertAdjacentHTML('beforeend', `<rect x="0" y="${esc(M.canvas.height)}" width="${esc(M.canvas.width)}" height="${height}" fill="#fbfcfb"/>${lines.map((line, i) => `<text x="20" y="${esc(M.canvas.height + 25 + i * 22)}" font-size="14" fill="#49616b">${esc(line)}</text>`).join('')}`);
  return new XMLSerializer().serializeToString(clone);
}
$('svg-download').onclick = () => download(exportMapSvg(), 'image/svg+xml', 'threat-model-map.svg');
$('html-download').onclick = () => { const clone = document.documentElement.cloneNode(true); clone.querySelector('dialog').removeAttribute('open'); download('<!doctype html>\n' + clone.outerHTML, 'text/html', 'threat-model-explorer.html'); };
$('brand').innerHTML = esc(M.brand) + '<small>THREAT MODEL EXPLORER</small>';
$('title').textContent = M.title; $('subtitle').textContent = M.subtitle; $('snapshot').textContent = M.snapshotLabel;
$('assessment').textContent = assessment; $('metadata').innerHTML = (M.metadata || []).map(m => `<h3>${esc(m.label)}</h3><p>${esc(m.value)}</p>`).join('');
$('footer').textContent = M.footer; document.title = M.title;
window.addEventListener('hashchange', readHash); readHash();
```

### File: `assets/route-paths.js`

```javascript
/* Explicit assessment routes; never infer reachability from graph proximity. */
(function (root) {
  'use strict';
  function resolve(model, scenario, routeId, stop = -1, arrival = false) {
    const route = scenario?.routes?.find(r => r.id === routeId) || scenario?.routes?.[0];
    if (!route) return null;
    const edges = new Map(model.edges.map(e => [e.id, e]));
    const stopEdge = stop >= 0 ? scenario.steps[stop]?.edge : null;
    const stopIndex = stopEdge ? route.edges.indexOf(stopEdge) : -1;
    const owner = stopIndex < 0 ? null : edges.get(stopEdge).to;
    const activeEdges = new Set(), activeNodes = new Set();
    const prefix = stopIndex < 0 ? route.edges : route.edges.slice(0, stopIndex + 1);
    for (const id of prefix) {
      const {from, to} = edges.get(id);
      activeEdges.add(id);
      activeNodes.add(from);
      if (id !== stopEdge || arrival) activeNodes.add(to);
    }
    // Arrival displays the owner. Only a prior visit lets it start unrelated work.
    const independent = new Set(activeNodes);
    if (arrival && stopIndex >= 0) {
      const earlierVisit = prefix.slice(0, -1).some(id => edges.get(id).from === owner || edges.get(id).to === owner);
      if (!earlierVisit) independent.delete(owner);
    }

    const branchStates = (route.branches || []).map(branch => ({branch, active:false, reached:0}));
    // A later branch can reach an earlier branch's origin, or make a visible
    // prerequisite independently reachable. Both node sets grow monotonically.
    let nodeCount;
    do {
      nodeCount = activeNodes.size + independent.size;
      for (const state of branchStates) {
        const {branch} = state;
        const start = edges.get(branch.edges[0]).from;
        const prerequisite = stopIndex >= 0 && branch.beforeStep === stop + 1 && start === owner;
        if (branch.beforeStep !== undefined) {
          if (stopIndex >= 0 && (branch.beforeStep > stop + 1 || (prerequisite && !arrival))) continue;
        } else if (!activeNodes.has(start) ||
          (branch.afterStep !== undefined && stopIndex >= 0 && branch.afterStep >= stop + 1)) continue;

        // A prerequisite keeps its dependency even when its reply crosses a
        // previously visited relay. Reconsider it if its origin later becomes independent.
        const dependent = prerequisite || (branch.beforeStep === undefined && !independent.has(start));
        let reached = 0;
        for (const id of branch.edges) {
          const {from, to} = edges.get(id);
          if (branch.beforeStep === undefined && from === owner && !independent.has(owner)) break;
          activeEdges.add(id);
          activeNodes.add(from); activeNodes.add(to);
          if (!dependent) { independent.add(from); independent.add(to); }
          reached++;
        }
        state.reached = reached;
        state.active = reached === branch.edges.length;
      }
    } while (activeNodes.size + independent.size !== nodeCount);

    const unreachedEdges = new Set(), unreachedNodes = new Set();
    for (const id of [...route.edges, ...branchStates.flatMap(({branch}) => branch.edges)]) {
      const {from, to} = edges.get(id);
      if (!activeEdges.has(id)) unreachedEdges.add(id);
      if (!activeNodes.has(from)) unreachedNodes.add(from);
      if (!activeNodes.has(to)) unreachedNodes.add(to);
    }
    const focusNodes = new Set(scenario.focusNodes || []);
    return {route, activeEdges, activeNodes, unreachedEdges, unreachedNodes, focusNodes, branchStates};
  }
  const api = {resolve};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RoutePaths = api;
})(globalThis);
```

### File: `assets/source-roles.js`

```javascript
/* Scenario origins describe starting authority, never inferred compromise. */
(function (root) {
  'use strict';
  const palette = {
    adversary: {fill:'#fbe1e1', ink:'#912d35', colorName:'red', label:'Adversary', badge:'ADVERSARY'},
    'compromised-component': {fill:'#f1d9e7', ink:'#852653', colorName:'berry', label:'Compromised component', badge:'COMPROMISED'},
    'untrusted-input': {fill:'#fde9df', ink:'#944324', colorName:'peach', label:'Untrusted input', badge:'UNTRUSTED INPUT'},
    unknown: {fill:'#e9e9ed', ink:'#555568', colorName:'grey', label:'Source uncertain', badge:'SOURCE UNCERTAIN'},
    'authorized-user': {fill:'#e0edf9', ink:'#285b88', colorName:'blue', label:'Authorized use', badge:'AUTHORIZED USE'}
  };
  const basis = {
    'scenario-assumption':'Assumed starting condition',
    'assessment-observed':'Observed in supplied assessment',
    unknown:'Starting condition uncertain'
  };
  function resolve(model, scenario, routeId, sourceId) {
    const route = scenario?.routes?.find(r => r.id === routeId) || scenario?.routes?.[0];
    const allSources = (scenario?.sources || []).filter(s => !s.routeIds || s.routeIds.includes(route?.id));
    const selected = scenario?.sourceMode === 'alternatives' ? allSources.find(s => s.id === sourceId) || allSources[0] : null;
    const sources = selected ? [selected] : allSources;
    const nodes = new Map();
    for (const p of model.participants || []) {
      if (!nodes.has(p.node))
        nodes.set(p.node, {...palette[p.kind], kind:p.kind, items:[], source:false});
      nodes.get(p.node).items.push(p);
    }
    const mapped = new Map();
    for (const s of sources) {
      if (s.node === null) continue;
      if (!mapped.has(s.node)) mapped.set(s.node, []);
      mapped.get(s.node).push(s);
    }
    for (const [id, items] of mapped) {
      const kinds = new Set(items.map(s => s.kind)), kind = kinds.size === 1 ? items[0].kind : 'unknown';
      nodes.set(id, {...palette[kind], ...(kinds.size > 1 ? {label:'Multiple source roles',badge:'MULTIPLE ROLES'} : {}), kind, items, source:true});
    }
    // Explicit source sets describe relationships only; never derive reach from roles.
    const relatedNodes = selected?.relatedNodes ?? scenario?.affectedNodes ?? [];
    const relatedEdges = selected?.relatedEdges ?? scenario?.affectedEdges ?? [];
    const jointRequirement = scenario?.sourceMode === 'combined' && sources.length > 1
      ? 'All listed starting positions are required together.' : '';
    return {sources, allSources, selected, nodes, relatedNodes, relatedEdges, jointRequirement};
  }
  const api = {resolve, palette, basis};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SourceRoles = api;
})(globalThis);
```

### File: `assets/svg-layout.js`

```javascript
'use strict';
// Bounded SVG presentation geometry only: authored topology and model data stay unchanged.
const SvgLayout = (() => {
  const intersects = (a,b) => a.x < b.x+b.w && b.x < a.x+a.w && a.y < b.y+b.h && b.y < a.y+a.h;
  const padded = (r,p=4) => ({x:r.x-p,y:r.y-p,w:r.w+2*p,h:r.h+2*p});
  const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  const clean = points => points.filter((p,i)=>!i || distance(p,points[i-1])>1e-6);
  function fallback(text,size) { return {w:[...text].reduce((n,c)=>n+(/[MW@%]/.test(c)?.9:/[il.,:;' ]/.test(c)?.32:.62)*size,0),ascent:size*.8,descent:size*.2}; }
  function lines(text,width,size,weight,measure) {
    const result=[];let line='';
    for(const word of String(text).trim().split(/\s+/)) {
      if(!word)continue;
      if(line && measure(line+' '+word,size,weight).w>width){result.push(line);line='';}
      if(measure(word,size,weight).w>width){
        for(const char of word){if(line && measure(line+char,size,weight).w>width){result.push(line);line='';}line+=char;}
      } else line+=(line?' ':'')+word;
    }
    if(line)result.push(line);return result;
  }
  function sample(points,offset) {
    const p=clean(points),lengths=p.slice(1).map((b,i)=>distance(p[i],b)),total=lengths.reduce((a,b)=>a+b,0);let target=Math.max(0,Math.min(total,offset));
    for(let i=0;i<lengths.length;i++) {
      if(target<=lengths[i] || i===lengths.length-1){const t=target/lengths[i];return [p[i][0]+(p[i+1][0]-p[i][0])*t,p[i][1]+(p[i+1][1]-p[i][1])*t];}target-=lengths[i];
    }
    return p[0];
  }
  function nearestOffset(points,anchor) {
    let best=Infinity,offset=0,answer=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=distance(a,b);if(!length)continue;
      const t=Math.max(0,Math.min(1,((anchor[0]-a[0])*(b[0]-a[0])+(anchor[1]-a[1])*(b[1]-a[1]))/(length*length)));
      const d=distance(anchor,[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);if(d<best){best=d;answer=offset+t*length;}offset+=length;
    }return answer;
  }
  function joints(edges) {
    const points=new Map(),segments=[];
    const add=p=>points.set(p.map(n=>n.toFixed(2)).join(','),{x:p[0]-6,y:p[1]-6,w:12,h:12});
    for(const e of edges){const p=clean(e.points);p.forEach(add);p.slice(1).forEach((b,i)=>segments.push([p[i],b,e.id]));}
    for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
      const [a,b,id]=segments[i],[c,d,other]=segments[j];if(id===other)continue;
      const rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],cross=rx*sy-ry*sx;if(Math.abs(cross)<1e-8)continue;
      const t=((c[0]-a[0])*sy-(c[1]-a[1])*sx)/cross,u=((c[0]-a[0])*ry-(c[1]-a[1])*rx)/cross;
      if(t>=0 && t<=1 && u>=0 && u<=1)add([a[0]+t*rx,a[1]+t*ry]);
    }return [...points.values()];
  }
  function segmentIntersectsRect(a,b,box) {
    let low=0,high=1;
    for(const [axis,min,max] of [[0,box.x,box.x+box.w],[1,box.y,box.y+box.h]]){
      const delta=b[axis]-a[axis];
      if(Math.abs(delta)<1e-9){if(a[axis]<min || a[axis]>max)return false;continue;}
      const p=(min-a[axis])/delta,q=(max-a[axis])/delta;
      low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>high)return false;
    }return true;
  }
  function candidates(item,w,h,dense=false) {
    const [ax,ay]=item.anchor,result=[];
    const add=(cx,cy)=>result.push({x:cx-w/2,y:cy-h/2,w,h});
    if(dense){
      if(item.kind==='region'){
        const r=item.region,left=Math.min(r.x+8+w/2,r.x+r.w/2),right=Math.max(r.x+r.w-8-w/2,r.x+r.w/2);
        for(let cx=left;cx<=right+1e-6;cx+=Math.max(4,(right-left)/64))for(let dy=-64;dy<=64;dy+=4){add(cx,r.y+dy);add(cx,r.y+r.h+dy);}
        for(let dy=-64;dy<=r.h+64;dy+=Math.max(4,(r.h+128)/64)){add(r.x+4-w/2,r.y+dy);add(r.x+r.w-4+w/2,r.y+dy);}
      }else for(let dx=-176;dx<=176;dx+=8)for(let dy=-176;dy<=176;dy+=8)add(ax+dx,ay+dy);
      return result;
    }
    if(item.kind==='region'){
      const r=item.region,left=Math.min(r.x+8+w/2,r.x+r.w/2),right=Math.max(r.x+r.w-8-w/2,r.x+r.w/2);
      for(const dy of Array.from({length:23},(_,i)=>i*4-64))for(const dx of [0,12,-12,24,-24,48,-48,72,-72,96,-96,144,-144]) {
        const cx=Math.max(left,Math.min(right,ax+dx)),cy=ay+dy;add(cx,cy);
      }
      for(const cx of [left,(left+right)/2,right]){
        add(cx,r.y-h/2-4);add(cx,r.y+4+h/2);
        for(let dy=-24;dy<=64;dy+=4)add(cx,r.y+r.h+dy);
      }
      // A tight header strip can have no legal top slot. Keep its title attached
      // to the same boundary, with a short annotation leader, rather than cover a node.
      for(let dy=-64;dy<=r.h+64;dy+=16){
        add(r.x+4-w/2,r.y+dy);add(r.x+r.w-4+w/2,r.y+dy);
      }
    }else {
      for(const radius of [0,12,24,40,60,84,112,144])for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]])add(ax+dx*radius,ay+dy*radius);
      for(const dx of [-96,-72,-48,-32,-16,0,16,32,48,72,96])for(const dy of [-96,-72,-48,-32,-16,-8,0,8,16,32,48,72,96])add(ax+dx,ay+dy);
      if(item.edge){const offset=nearestOffset(item.edge.points,item.anchor);
        for(const along of [0,-24,24,-48,48,-80,80,-120,120]){const point=sample(item.edge.points,offset+along);for(const dy of [-16,16,-28,28,-44,44])add(point[0],point[1]+dy);}
      }
    }return result;
  }
  function plan(items,nodes,edges,canvas,measure=fallback) {
    const obstacles=nodes.map(n=>padded(n,2)),placed=new Map();
    const activeEdges=edges.filter(e=>e.layoutActive!==false).map(e=>({...e,points:e.layoutActivePoints||e.points}));
    const allJoints=joints(edges),activeJoints=joints(activeEdges);
    const segmentsFor=list=>list.flatMap(e=>{const points=clean(e.points);return points.slice(1).map((b,i)=>({id:e.id,a:points[i],b,box:padded({x:Math.min(points[i][0],b[0]),y:Math.min(points[i][1],b[1]),w:Math.abs(b[0]-points[i][0]),h:Math.abs(b[1]-points[i][1])},2.5)}));});
    const segments=segmentsFor(edges),activeSegments=segmentsFor(activeEdges);
    for(const item of [...items].sort((a,b)=>a.priority-b.priority || (a.id<b.id?-1:a.id>b.id?1:0))){
      let best=null;
      // Refine only an unresolved caption: ordinary views keep the cheap pass.
      for(const dense of [false,true,...(item.kind==='edge'?['fine','wrap']:[])]){
      if(dense && best?.conflicts===0)break;
      const refinementOrigin=best?[best.x+best.w/2,best.y+best.h/2]:item.anchor;
      // Whole-word wrapping is a last resort for a short caption whose
      // measured one-line width exceeds a legal local gap by even a fraction.
      const widths=dense==='wrap'?[Math.max(...String(item.text).trim().split(/\s+/).map(word=>measure(word,item.size,item.weight).w))]:item.widths;
      for(const maxWidth of widths){
        if(dense && best?.conflicts===0)break;
        const content=lines(item.text,maxWidth,item.size,item.weight,measure),metrics=content.map(t=>measure(t,item.size,item.weight));if(!content.length)continue;
        const ascent=Math.max(...metrics.map(m=>m.ascent)),descent=Math.max(...metrics.map(m=>m.descent)),lineHeight=Math.max(item.size*1.2,ascent+descent+2);
        const w=item.kind==='control'?maxWidth+24:Math.max(...metrics.map(m=>m.w))+8;
        const h=item.kind==='control'?Math.max(56,40+(content.length-1)*lineHeight+descent+8):ascent+descent+(content.length-1)*lineHeight+8;
        // Only a still-unresolved edge caption gets this 225-slot local nudge.
        const slots=dense==='fine'?Array.from({length:15},(_,i)=>i*2-14).flatMap(dx=>Array.from({length:15},(_,i)=>({x:refinementOrigin[0]+dx-w/2,y:refinementOrigin[1]+i*2-14-h/2,w,h}))):candidates(item,w,h,dense);
        if(dense){const origin=dense==='fine'?refinementOrigin:item.anchor;slots.sort((a,b)=>(a.x+w/2-origin[0])**2+(a.y+h/2-origin[1])**2-(b.x+w/2-origin[0])**2-(b.y+h/2-origin[1])**2);}
        for(const raw of dense?slots.slice(0,2048):slots){
          if(w>canvas.width-8 || h>canvas.height-8)continue;
          const box={...raw,x:Math.max(4,Math.min(raw.x,canvas.width-w-4)),y:Math.max(4,Math.min(raw.y,canvas.height-h-4))};
          if(item.kind==='edge' && distance([box.x+w/2,box.y+h/2],item.anchor)>180)continue;
          const hard=[...obstacles,...(item.kind==='control'?activeJoints:allJoints)].filter(o=>intersects(box,o));
          if(best?.conflicts===0 && hard.length)continue;
          const guard=padded(box,2.5);
          const crossed=segments.filter(s=>(item.kind==='control' || s.id!==item.edge?.id) && intersects(guard,s.box) && segmentIntersectsRect(s.a,s.b,guard));
          // Opaque cards must never hide a route. Short text halos can cross an
          // ordinary stroke when no nearby clear slot exists; this is a preference,
          // separate from actual text/component/junction overlap.
          const blocked=item.kind==='control'?activeSegments.filter(s=>intersects(guard,s.box)&&segmentIntersectsRect(s.a,s.b,guard)):[];
          const conflicts=[...hard,...blocked.map(s=>s.box)],area=conflicts.reduce((n,o)=>n+(Math.min(box.x+w,o.x+o.w)-Math.max(box.x,o.x))*(Math.min(box.y+h,o.y+o.h)-Math.max(box.y,o.y)),0);
          const cost=conflicts.length*1e8+area*1e4+distance([box.x+w/2,box.y+h/2],item.anchor)**2+(content.length-1)*100+(item.kind==='control' && blocked.length?0:crossed.length*2500);
          if(!best || cost<best.cost)best={...box,id:item.id,kind:item.kind,text:item.text,lines:content,size:item.size,weight:item.weight,ascent,descent,lineHeight,cost,edge:item.edge,conflicts:conflicts.length,connectorCrossings:crossed.length};
          if(dense && conflicts.length===0)break;
        }
      }
      }
      if(!best){const content=lines(item.text,item.widths[0],item.size,item.weight,measure);best={id:item.id,kind:item.kind,text:item.text,lines:content,size:item.size,weight:item.weight,ascent:item.size*.8,descent:item.size*.2,lineHeight:item.size*1.2,x:item.anchor[0],y:item.anchor[1],w:item.widths[0],h:content.length*item.size*1.2,conflicts:1};}
      placed.set(item.id,best);obstacles.push(best);
    }return placed;
  }
  function heads(edges,priority=()=>0) {
    const groups=new Map(),result=new Map();
    for(const e of edges){const p=clean(e.points);if(p.length<2)continue;const end=p.at(-1),before=p.at(-2),length=distance(before,end),direction=[(end[0]-before[0])/length,(end[1]-before[1])/length],key=e.to+'|'+end.map(n=>n.toFixed(3)).join(',')+'|'+direction.map(n=>n.toFixed(6)).join(',');const group=groups.get(key)||[];group.push({e,p});groups.set(key,group);}
    for(const group of groups.values()){
      group.sort((a,b)=>priority(b.e)-priority(a.e) || (a.e.id<b.e.id?-1:1));
      for(const item of group){const length=distance(item.p.at(-2),item.p.at(-1));const size=Math.min(9,Math.max(.25,Math.floor(length*.65*4)/4));result.set(item.e.id,{visible:item===group[0],size,shared:group.length,points:item.p});}
    }return result;
  }
  function nodeRows(node,role,measure=fallback) {
    const specs=[...(role?[{key:'role',text:role,size:9,weight:700}]:[]),{key:'title',text:node.title,size:17,weight:600},...(node.subtitle?[{key:'subtitle',text:node.subtitle,size:14,weight:400}]:[])];
    const rows=specs.map(s=>({...s,...measure(s.text,s.size,s.weight)}));const height=rows.reduce((n,r)=>n+r.ascent+r.descent,0)+Math.max(0,rows.length-1)*2+4;let y=node.y+2+Math.max(0,(node.h-height)/2);
    for(const row of rows){row.y=y+row.ascent;y=row.y+row.descent+2;}return {rows,overflow:height>node.h || rows.some(r=>r.w>node.w-20)};
  }
  return {intersects,padded,fallback,lines,plan,heads,nodeRows,clean,joints,sample,nearestOffset,segmentIntersectsRect};
})();
```

### File: `references/context-explorer.md`

#### Explorer presentation

The shared shell supplies the scenario rail, map, inspection, evidence, controls, navigation and offline exports. Keep its fixed palette: adversary red, compromised component berry, untrusted input peach, unknown grey, authorized use blue; selected routes use orange and transit keeps a neutral outline. Do not borrow project-specific topology from a reference example.

Compose the architecture before the threat overlay. A useful overview explains the ordinary system: who calls it, where trust changes, how services or library components cooperate, where identity and state live, and which external or operational contexts matter. Use source-supported boundary regions and spatial groupings to make those relationships legible. Components needed by distinct assessment cases should remain represented, even when outside the selected path. Do not force every repository into one pipeline or a disconnected grid.

Keep the primary architecture visible in muted colors during scenario selection. Paint all inactive connections and labels below active route and control edges, regardless of authoring order; keep nodes and control annotations above the connections. `overviewEdges` is the persistent architecture, not a shortlist for the first threat. **More connections** reveals secondary authored edges; **Clear step** removes only individual step focus. Optional returns, repeated dependency lines and incidental detail can stay in inspection. Keep authentication, state access and administrative relationships when they explain trust, authority or a substantive case. Group components only when selections preserve each member’s callers and controls. Split the group if a highlighted edge or control would give one member another’s access or safeguard; a prose caveat does not correct a misleading selection. Do not fabricate a shortcut to fill a source gap.

Keep the map, path and control interaction compact, with conditions and residual effects close to the selected control. Emphasize each selected source’s supported relationships and owners without combining unrelated alternatives. Keep endpoint highlights coherent with the selected edges.

Label the group **Proposed controls** and individual badges, markers and legend items **Proposed control**. Use conditional captions such as “Would block” or “Would limit”; retain the actual applicability conditions, residual effects and distinction between blocking a capability and stopping traffic. Avoid repeated “not implemented” badges.

Leave room for region headings, component roles and connector captions in the geometry. Keep node titles and subtitles short and size their boxes for the full rendered text; place qualifications in descriptions and evidence. Prefer direct straight connectors or simple right-angle routes with few bends. Minor connector-to-connector crossings are acceptable when endpoints remain clear; do not chase zero crossings with acute angles, zigzags, stair steps or long perimeter detours. A crossing does not imply a junction or handoff. Keep connectors out of unrelated node boxes and label text, and repack components when avoiding them would require an awkward route. Preserve actual destination ports and a useful final straight segment for arrowheads; avoid a tiny terminal bend. Use a nearby slot above or below a short connector gap instead of fitting text between component boxes.

The shell measures SVG text, wraps complete captions and tries bounded nearby positions, reserving component boxes, other captions and connector junctions. Opaque control cards must also clear highlighted route interiors, arrowheads and junctions, including arrival and the path before a stop; inactive architecture lines remain a placement preference. Caption placement prefers to avoid unrelated connectors; a short text halo may cross an ordinary connector stroke when nearby space is constrained. This differs from actual text/component overlap, and never permits an opaque card to cover the route. Active captions get space before context captions; a displaced caption stays associated with its own connector or region boundary. It does not reroute relationships, remove text or reduce the font to conceal a collision. Only connections sharing the same destination and final approach share an arrowhead.

Inspect actual overview and selected states at desktop widths; mobile usability is a bonus. Favor easy-to-follow connectors over eliminating every crossing. Resolve label collisions, preserve clear stopping markers and readable titles, and repack unused space. A successful build, zoom control or clear layout diagnostic does not prove legibility or correct endpoints. Treat unresolved `#map[data-layout-status="unresolved"]` / `data-layout-issues` entries, text/component overlap and obscured arrowheads as QA failures to resolve before publishing, using better authored spacing when bounded placement is insufficient. A minor connector crossing alone is not a failure. Check component text containment and any conditional stop and its restored state; leave unsupported responses, sequence and deployment behavior unknown.

[Overview](threat-model-visualize.md#not-embedded) and [selected path](threat-model-visualize.md#not-embedded) illustrate the workbench hierarchy, not a required topology or evidence.

Open either reference in an SVG-capable viewer. For a PNG-only viewer, use a local SVG renderer. For example, from the skill directory, run `rsvg-convert assets/context-reference-overview.svg -o /path/to/workspace/overview.png`. Use `assets/context-reference-path.svg` for the selected path.

### File: `references/view-model.md`

#### Explorer view-model contract

The model author maps the supplied assessment to JSON, exact evidence and explicit geometry. The shell owns visual roles, selection, inspection, control previews and offline HTML/SVG export. The builder validates references, geometry, exact quotes and some control semantics; it cannot verify security claims or layout.

```sh
python3.12 <skill-directory>/scripts/build_explorer.py MODEL.json --assessment threat-model.md --output index.html
```

Use Python 3.12+. Keep the full assessment intact. Optional fields need not be filled solely for completeness.

##### Map

Top-level `brand`, `title`, `subtitle`, `snapshotLabel`, `mapTitle`, `mapDescription`, `overviewTitle`, `overview`, `evidenceBoundary`, `footer`, and optional `scenarioLabel`, `exportNote` are display text. `canvas:{width,height}` uses positive finite units. `nodes`, `edges`, `scenarios`, and `evidence` are arrays with unique nonempty IDs; `regions` is optional. Optional `metadata` must be an array of objects with string `label` and `value`, for example `[{"label":"Fidelity","value":"standard"}]`; omit it or use `[]` if unnecessary. It is not a key-value object. `assessmentSha256` optionally pins the exact bytes of the supplied UTF-8 assessment, including its original line endings; the builder preserves them without normalization.

A node `{id,x,y,w,h,title,subtitle,description,evidence:[id]}` uses top-left geometry; `kind` may be `actor`, `asset` or `component`. A region `{id,x,y,w,h,title}` asserts a shared source-supported boundary. An edge `{id,from,to,points:[[x,y],...],label,labelX,labelY}` uses explicit directed geometry; `conditional:true` draws a dashed conditional relationship. Give nodes and lines concise labels, keep shared node captions valid across scenarios, and put detail in descriptions and evidence. Do not conflate meaningful authority boundaries or draw a direct edge merely to omit transit.

Optional `overviewEdges:[edgeId,...]` defines the persistent architecture backbone: the overview shows these authored edges, and selecting a scenario retains them in muted colors while adding its selected route or affected relationships, ordered steps, and selected control or stopping barrier. **More connections** reveals additional authored edges; the selection is preserved in the URL and SVG. `[]` is valid only when the source supports no architectural connections; do not use it to hide a known backbone. Omit the field for legacy all-edge display. It only filters visibility; it does not create edges, alter source claims, or suppress a selected stop. Nodes remain available for inspection. Compose an intelligible architecture; a toggle cannot restore components or relationships absent from the model.

Measure actual default-fit text and connector readability at desktop sizes. With diagram area W × H, the scale is `min(W/canvas.width, H/canvas.height)`; shell node titles, subtitles and connector labels are 17, 14 and 13 units. Aim for core text around 11 CSS px or larger. Check marker placement as well. Reserve space for measured role/title/subtitle rows and boundary headings. Put labels near a useful segment with room above or below it, and author clear destination ports with a straight terminal leg (roughly 14 units or more for a full-size arrowhead). The renderer can wrap and move captions within bounded nearby slots and share a head on an identical incoming stem. Validation alone cannot make a crowded topology legible. Full text and authored endpoints remain intact. Browser QA must resolve text/component overlap, obscured arrowheads and `data-layout-issues` failures before publishing; minor connector crossings are acceptable under the presentation guidance.

##### Scenarios and routes

A scenario is `{id,title,priority,status,summary,prerequisites,impact,calibration,evidence:[id],steps:[...]}`. Put the key prerequisite and potential impact in `summary`; use `prerequisites`, `impact` and evidence for fuller qualifications. `priority` is review priority; optional `severity` is a source rating, not inferred. `status` preserves the source's confidence. Each ordered step `{title,description,from,to,edge}` must match the directed edge. Keep order only when supported. Distinguish independent actor actions, separately triggered phases and parallel prerequisites without inventing a continuous causal traversal. Use `steps:[]`, optional `affectedNodes` / `affectedEdges`, and `pathNote` for unordered relationships; no traversal is implied. Supply `focusNodes` as source-supported failure sites, or `[]` when no site is established. Transit gets normal outlines, not a finding.

For a documented path, `routes:[{id,label,edges:[edgeId],evidence:[id],branches:[...]}]` selects an explicit continuous directed chain without repeated edges. Each scenario step must appear on every alternative route in order. Branches `{edges:[edgeId],evidence:[id]}` are connected chains beginning on the main route or an earlier branch. Draw secondary calls or returns only when useful to understand this path or its control; describe others in inspection. A route alone does not prove an exploit sequence.

If an evidenced branch happens after earlier steps but before a decision, `beforeStep` gives the one-based decision step; its origin must lie on the route at or before that decision. It stays visible at that decision, including a stop, but not behind an earlier barrier. If it starts at the destination of a stopping decision, evidence must support receipt and the effect needs `arrival:true`. A branch dependent on a later action uses `afterStep` and becomes visible only after that action succeeds and its origin is reachable. The annotations are mutually exclusive. Without either, the renderer uses node reachability, not occurrence order. Do not use `beforeStep` for a response after denial; do not infer a response or timing missing from evidence.

##### Sources and controls

Optional scenario `sources` entries are `{id,node,kind,basis,label,description,authority,evidence:[id]}`. `node` is the actual actor or controlled input, or `null` if unmapped. For a caller, use the caller’s node rather than the receiving service; represent their supported relationship separately. `kind` is `adversary`, `compromised-component`, `untrusted-input`, or `unknown`; `basis` is `scenario-assumption`, `assessment-observed`, or `unknown`. Preserve the actual least authority; an origin may be a recipient, not the initiator. Use `assessment-observed` only for an observed foothold; a hypothetical capability is `scenario-assumption`. Optional `routeIds` restricts a source to listed scenario routes. Multiple sources need `sourceMode:"alternatives"` or `"combined"`. Use combined only when the sources eligible for the selected route are jointly required. Use optional `sourceNote` to explain gaps.

Trusted operators and their configuration are not threat sources merely because they can change settings. Represent an authorized operator as a top-level `participants` entry with `kind:"authorized-user"`; omit `sources` or use `[]` when no threat foothold is established. Check each source node, kind and basis against its authority and evidence, including whether compromise is assumed or observed.

For alternative sources with no routes and `steps:[]`, optional `relatedNodes` / `relatedEdges` override each corresponding affected set independently; `[]` clears it, omission inherits it. Preserve independently sufficient authorities for each operation. Shared nodes and edges must be valid for every alternative that uses them. An unordered union may retain alternative-specific relationships when their membership is explicit; disclose it in `pathNote` or use source-specific overrides. An account-session-only path cannot represent capability-only access merely because prose says “otherwise authorized.” Optional top-level `participants` entries `{id,node,kind:"authorized-user",label,description,evidence:[id]}` require an actor node. The fixed palette and normal transit outlines are not evidence of security or reachability.

Scenario `controls` entries are `{id,kind,title,description,nodes:[id],edges:[id],evidence:[id]}` with `kind` set to `existing` or `proposed`. `nodes` marks enforcing owners even for descriptive controls; it is not a list of protected or constrained components. For an unmapped enforcer, use `nodes:[]`, disclose the owner gap, and describe the affected component/operation through `description` and supported `edges`. Runtime, syscall, mount and token-mount restrictions must not mark the application process as enforcer merely because it is constrained. Split these from code-owned checks and separate controls with different owners or operations. Optional nonempty `sourceIds` and `routeIds` scope it to their intersection; `sourceIds` requires alternative sources. Without an `effect` the control is descriptive and does not stop a route.

Optional `effect` contains `outcome`, `basis`, `label`, `reason`, `conditions`, `residual`, and control evidence. If an effect names an `edge`, it must occur on the main chain or a branch of each applicable route. Use `routeIds` or `sourceIds` when the operation applies to a subset. Outcomes: `blocks` prevents the named abuse under those conditions; `limits` requires both a reduced attacker capability and a supported route to the same abuse remaining; `detects` detects without prevention; `does-not-block` leaves the selected abuse unaffected; `unknown` is unestablished. Unrelated risks and authorized traffic do not establish continued abuse. Basis is `declared`, `verified`, `hypothetical`, or `unverified`; proposals require `hypothetical`, and unverified effects cannot block. A supported hypothetical effect does not establish live enforcement.

For a `blocks` effect, `traffic:"stops"` is the default; it requires one-based `step`, the matching `edge`, and a marker. Optional `arrival:true` keeps the incoming edge and decision owner reached only when evidence supports receipt; subsequent work stops. `traffic:"continues"` means the named harm is prevented while the displayed ordinary flow continues, not that the abuse continues. Use neutral transport labels and put modified content in the effect; a step is not required. Never claim an unknown rejection response. Independently occurring first and later traversals need distinct edges.

A marker `{at,x,y,w}` supplies the label's initial placement; `0 < at < 1`, width at least 180, and an initial 72-unit-high reservation must fit the canvas. The renderer measures the heading and full label and may wrap, resize or move the card to a nearby clear slot without changing font sizes. The marker remains attached to its authored edge location. Stopping effects mark the edge or arrival owner; continuing and nonblocking effects use a hollow ring. Check rendered caption, marker, selected path, conditions and residual against the same source and actor. Selecting an existing control inspects it; selecting a proposal toggles its preview. Existing controls remain active on restoration. Use the first traffic-stopping barrier along the route. Within one step, a barrier that prevents receipt acts before a check made after arrival. Prefer an existing control when both act at the same point.

##### Evidence and exports

Evidence `{id,label,quote,paths:[string]}` may include paired one-based `startLine,endLine`. The quote must be an exact assessment substring within the stated lines and include each listed path. Use a substantive row or passage that supports the attached claim and qualifications; file paths are assessment references, not inspected code. Unreferenced evidence is not inspectable.

Optional deep-link keys are `scenario`, `route`, `source`, `step`, `node`, `control`, `preview`, `panel=controls`, and `context=1` for expanded context. HTML embeds the model, assessment and all assets; SVG exports the displayed map, role key, control and source status. Check selected and restored views and export; no output verifies deployment or exploitation.

### File: `scripts/build_explorer.py`

```python
#!/usr/bin/env python3
"""Build a portable evidence-backed explorer. Python 3.12+, standard library only."""

import argparse
import hashlib
import json
import math
import re
from itertools import pairwise
from pathlib import Path

def require(condition, message):
    if not condition:
        raise ValueError(message)

def validate(model, assessment_bytes: bytes):
    """Check the explorer graph and its citations against the assessment before rendering.

    Args:
        model (dict): Parsed explorer JSON containing the graph, scenarios, and evidence.
        assessment_bytes (bytes): Original UTF-8 bytes used to match quotations, line ranges,
            and the optional assessment digest. Preserve the original line endings.

    Raises:
        ValueError: A graph relationship, layout value, or evidence check fails.
        KeyError: A required field is missing when accessed by name.
    """

    def indexed(key, default=None):
        """Index a model collection by its unique, nonempty string IDs."""
        items = model.get(key, default)
        require(isinstance(items, list), f"{key} must be a list")
        ids = [item.get("id") for item in items]
        require(all(isinstance(i, str) and i for i in ids), f"{key}: nonempty string IDs required")
        require(len(ids) == len(set(ids)), f"{key}: duplicate IDs")
        return dict(zip(ids, items))

    nodes, edges, scenarios, evidence = (
        indexed(k) for k in ("nodes", "edges", "scenarios", "evidence")
    )
    regions = indexed("regions", [])
    require(nodes, "At least one node is required")
    if "metadata" in model:
        metadata = model["metadata"]
        require(isinstance(metadata, list), "metadata must be an array of {label, value} objects")
        for i, item in enumerate(metadata):
            require(
                isinstance(item, dict)
                and all(isinstance(item.get(k), str) for k in ("label", "value")),
                f"metadata[{i}] must have string label and value",
            )

    def number(v, label):
        require(
            isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v),
            f"{label}: finite number required",
        )

    for axis in ("width", "height"):
        v = model["canvas"][axis]
        number(v, f"canvas.{axis}")
        require(v > 0, f"canvas.{axis} must be positive")
    for item in [*nodes.values(), *regions.values()]:
        for k in ("x", "y", "w", "h"):
            number(item[k], f"{item['id']}.{k}")
        require(item["w"] > 0 and item["h"] > 0, f"{item['id']}: dimensions must be positive")
        require(isinstance(item.get("title"), str), f"{item['id']}.title must be a string")
    for e in edges.values():
        require(
            e.get("label") is None or isinstance(e["label"], str),
            f"{e['id']}.label must be a string when supplied",
        )
        require(e["from"] in nodes and e["to"] in nodes, f"{e['id']}: unresolved endpoint")
        require(len(e["points"]) >= 2, f"{e['id']}: at least two route points required")
        for point in e["points"]:
            require(len(point) == 2, f"{e['id']}: point needs x,y")
            for v in point:
                number(v, e["id"])
        for k in ("labelX", "labelY"):
            number(e[k], f"{e['id']}.{k}")
    if "overviewEdges" in model:
        values = model["overviewEdges"]
        require(
            isinstance(values, list)
            and all(isinstance(i, str) and i in edges for i in values)
            and len(values) == len(set(values)),
            "overviewEdges must contain unique resolved edge IDs (may be empty)",
        )

    def id_array(item, field):
        values = item.get(field, [])
        require(
            isinstance(values, list) and all(isinstance(ref, str) for ref in values),
            f"{item['id']}: {field} must be an array of string IDs",
        )
        return values

    def refs(item):
        for ref in id_array(item, "evidence"):
            require(ref in evidence, f"{item['id']}: unresolved evidence {ref}")

    for n in nodes.values():
        require(
            n.get("subtitle") is None or isinstance(n["subtitle"], str),
            f"{n['id']}.subtitle must be a string when supplied",
        )
        refs(n)

    def source_roles(items, label, participant=False, routes=()):
        require(isinstance(items, list), f"{label}: source roles must be an array")
        ids = [item.get("id") for item in items]
        require(
            all(isinstance(i, str) and i for i in ids) and len(ids) == len(set(ids)),
            f"{label}: source role IDs must be unique nonempty strings",
        )
        for item in items:
            node = item.get("node")
            require(
                "node" in item and (node in nodes or (node is None and not participant)),
                f"{label}: source node must resolve or explicitly be null",
            )
            kinds = (
                {"authorized-user"}
                if participant
                else {"adversary", "compromised-component", "untrusted-input", "unknown"}
            )
            require(item.get("kind") in kinds, f"{label}: invalid source role kind")
            if participant:
                require(
                    nodes[node].get("kind") == "actor",
                    f"{label}: authorized user needs an actor node, not its receiving component",
                )
            for key in (
                ("label", "description") if participant else ("label", "description", "authority")
            ):
                require(
                    isinstance(item.get(key), str) and item[key].strip(),
                    f"{label}: source role requires {key}",
                )
            require(
                isinstance(item.get("evidence"), list) and item["evidence"],
                f"{label}: source role requires assessment evidence",
            )
            refs(item)
            if not participant:
                require(
                    item.get("basis") in {"scenario-assumption", "assessment-observed", "unknown"},
                    f"{label}: source role requires explicit basis",
                )
                if "routeIds" in item:
                    require(
                        isinstance(item["routeIds"], list)
                        and item["routeIds"]
                        and len(set(item["routeIds"])) == len(item["routeIds"])
                        and all(r in routes for r in item["routeIds"]),
                        f"{label}: source routeIds must resolve to scenario routes",
                    )

    source_roles(model.get("participants", []), "participants", participant=True)

    def chain(item, scenario_id, route_id):
        """Return the edge IDs of a connected route after checking its assessment references."""
        ids = item.get("edges", [])
        require(
            isinstance(ids, list) and ids and all(i in edges for i in ids),
            f"{scenario_id}: route needs resolved edges",
        )
        require(len(ids) == len(set(ids)), f"{scenario_id}: route cannot repeat an edge")
        require(
            all(edges[a]["to"] == edges[b]["from"] for a, b in pairwise(ids)),
            f"{scenario_id}: disconnected route",
        )
        require(item.get("evidence"), f"{scenario_id}: route requires assessment evidence")
        refs(dict(item, id=route_id))
        return ids

    def applicable_routes(control, routes, sources):
        """Return the routes selected by both the control and any sources it targets."""
        return [
            route
            for route in routes
            if (not control.get("routeIds") or route["id"] in control["routeIds"])
            and (
                not control.get("sourceIds")
                or any(
                    source["id"] in control["sourceIds"]
                    and (not source.get("routeIds") or route["id"] in source["routeIds"])
                    for source in sources
                )
            )
        ]

    for s in scenarios.values():
        refs(s)
        require(isinstance(s.get("steps"), list), f"{s['id']}: steps array required (may be empty)")
        require(
            all(i in nodes for i in id_array(s, "affectedNodes")),
            f"{s['id']}: unresolved affected node",
        )
        require(
            all(i in edges for i in id_array(s, "affectedEdges")),
            f"{s['id']}: unresolved affected edge",
        )
        if "focusNodes" in s:
            require(
                isinstance(s["focusNodes"], list) and all(i in nodes for i in s["focusNodes"]),
                f"{s['id']}: unresolved focus node",
            )
        routes = s.get("routes", [])
        require(isinstance(routes, list), f"{s['id']}: routes must be an array")
        require(len({r["id"] for r in routes}) == len(routes), f"{s['id']}: duplicate route ID")
        source_roles(s.get("sources", []), s["id"], routes={r["id"] for r in routes})
        if len(s.get("sources", [])) > 1 or "sourceMode" in s:
            require(
                s.get("sourceMode") in {"alternatives", "combined"},
                f"{s['id']}: multiple sources need explicit sourceMode",
            )
        for source in s.get("sources", []):
            for field, resolved in (("relatedNodes", nodes), ("relatedEdges", edges)):
                if field in source:
                    require(
                        s.get("sourceMode") == "alternatives" and not s["steps"] and not routes,
                        f"{source['id']}: source relationships require alternative unordered views without routes",
                    )
                    values = source[field]
                    require(
                        isinstance(values, list)
                        and all(isinstance(i, str) and i in resolved for i in values)
                        and len(values) == len(set(values)),
                        f"{source['id']}: {field} must contain unique resolved IDs (may be empty)",
                    )
        for route in routes:
            require(
                isinstance(route.get("id"), str) and route["id"] and route.get("label"),
                f"{s['id']}: route ID and label required",
            )
            require(
                "focusNodes" in s, f"{s['id']}: routes require explicit focusNodes (may be empty)"
            )
            ids = chain(route, s["id"], route["id"])
            positions = [ids.index(t["edge"]) if t["edge"] in ids else -1 for t in s["steps"]]
            require(
                all(i >= 0 for i in positions) and positions == sorted(set(positions)),
                f"{s['id']}: route must contain the scenario steps in order",
            )
            attached = {n for i in ids for n in (edges[i]["from"], edges[i]["to"])}
            for branch in route.get("branches", []):
                branch_ids = chain(branch, s["id"], route["id"])
                require(
                    edges[branch_ids[0]]["from"] in attached, f"{s['id']}: unattached route branch"
                )
                require(
                    not set(branch_ids) & set(ids), f"{s['id']}: branch repeats a main route edge"
                )
                require(
                    not ("beforeStep" in branch and "afterStep" in branch),
                    f"{s['id']}: branch cannot have both beforeStep and afterStep",
                )
                if "afterStep" in branch:
                    step = branch["afterStep"]
                    require(
                        isinstance(step, int)
                        and not isinstance(step, bool)
                        and 1 <= step <= len(s["steps"]),
                        f"{s['id']}: afterStep must be a one-based scenario step",
                    )
                if "beforeStep" in branch:
                    step = branch["beforeStep"]
                    require(
                        isinstance(step, int)
                        and not isinstance(step, bool)
                        and 1 <= step <= len(s["steps"]),
                        f"{s['id']}: beforeStep must be a one-based scenario step",
                    )
                    decision_edge = edges[s["steps"][step - 1]["edge"]]
                    decision_index = ids.index(decision_edge["id"])
                    prefix_nodes = {
                        n
                        for i in ids[: decision_index + 1]
                        for n in (edges[i]["from"], edges[i]["to"])
                    }
                    require(
                        edges[branch_ids[0]]["from"] in prefix_nodes,
                        f"{s['id']}: beforeStep branch must start on the route at or before its decision",
                    )
                attached.update(n for i in branch_ids for n in (edges[i]["from"], edges[i]["to"]))
        for step in s["steps"]:
            require(
                step["from"] in nodes and step["to"] in nodes, f"{s['id']}: unresolved step node"
            )
            require(step.get("edge") in edges, f"{s['id']}: unresolved step edge")
            edge = edges[step["edge"]]
            require(
                (edge["from"], edge["to"]) == (step["from"], step["to"]),
                f"{s['id']}: step edge does not connect stated nodes",
            )
        controls = s.get("controls", [])
        require(
            len({c["id"] for c in controls}) == len(controls), f"{s['id']}: duplicate control ID"
        )
        for c in controls:
            require(c["kind"] in ("existing", "proposed"), f"{c['id']}: invalid control kind")
            refs(c)
            require(
                all(i in nodes for i in id_array(c, "nodes")), f"{c['id']}: unresolved control node"
            )
            require(
                all(i in edges for i in id_array(c, "edges")), f"{c['id']}: unresolved control edge"
            )
            for field, resolved in (
                ("sourceIds", {source["id"] for source in s.get("sources", [])}),
                ("routeIds", {route["id"] for route in routes}),
            ):
                if field in c:
                    values = c[field]
                    require(
                        isinstance(values, list)
                        and values
                        and all(isinstance(i, str) and i in resolved for i in values)
                        and len(values) == len(set(values)),
                        f"{c['id']}: {field} must contain nonempty unique resolved IDs",
                    )
                    if field == "sourceIds":
                        require(
                            s.get("sourceMode") == "alternatives",
                            f"{c['id']}: source-scoped controls require alternative sources; combined semantics are not inferred",
                        )
            effect = c.get("effect")
            if effect is None:
                continue  # Legacy descriptive overlays never acquire blocking semantics.
            require(isinstance(effect, dict), f"{c['id']}: effect must be an object")
            require(
                effect.get("outcome")
                in ("blocks", "limits", "detects", "does-not-block", "unknown"),
                f"{c['id']}: invalid control outcome",
            )
            require(
                effect.get("basis") in ("declared", "verified", "hypothetical", "unverified"),
                f"{c['id']}: invalid effect basis",
            )
            require(
                (c["kind"] == "proposed") == (effect["basis"] == "hypothetical"),
                f"{c['id']}: proposals require hypothetical basis; existing controls cannot use it",
            )
            require(c.get("evidence"), f"{c['id']}: effects require assessment evidence")
            for field in ("label", "reason", "conditions", "residual"):
                require(
                    isinstance(effect.get(field), str) and effect[field].strip(),
                    f"{c['id']}: effect.{field} is required",
                )
            if "traffic" in effect:
                require(
                    effect["outcome"] == "blocks" and effect["traffic"] in ("stops", "continues"),
                    f"{c['id']}: traffic must be stops or continues on a blocking effect",
                )
            if "arrival" in effect:
                require(
                    effect["outcome"] == "blocks"
                    and effect.get("traffic", "stops") == "stops"
                    and isinstance(effect["arrival"], bool),
                    f"{c['id']}: arrival must be a boolean on a traffic-stopping block",
                )
            if "edge" in effect:
                require(effect["edge"] in edges, f"{c['id']}: unresolved effect edge")
                if (
                    s.get("sourceMode") == "alternatives"
                    and s.get("sources")
                    and not s["steps"]
                    and not routes
                ):
                    for source in s["sources"]:
                        if c.get("sourceIds") and source["id"] not in c["sourceIds"]:
                            continue
                        source_edges = source.get("relatedEdges", s.get("affectedEdges", []))
                        require(
                            effect["edge"] in source_edges,
                            f"{c['id']}: effect edge is outside source {source['id']}",
                        )
                else:
                    scoped = (
                        {step["edge"] for step in s["steps"]}
                        | set(s.get("affectedEdges", []))
                        | {edge for route in routes for edge in route["edges"]}
                        | {
                            edge
                            for route in routes
                            for branch in route.get("branches", [])
                            for edge in branch["edges"]
                        }
                    )
                    require(
                        effect["edge"] in scoped,
                        f"{c['id']}: effect edge is outside this scenario",
                    )
                for route in applicable_routes(c, routes, s.get("sources", [])):
                    route_edges = set(route["edges"]) | {
                        edge for branch in route.get("branches", []) for edge in branch["edges"]
                    }
                    require(
                        effect["edge"] in route_edges,
                        f"{c['id']}: effect edge must occur in each applicable route",
                    )
            if "step" in effect:
                step = effect["step"]
                require(
                    isinstance(step, int)
                    and not isinstance(step, bool)
                    and 1 <= step <= len(s["steps"]),
                    f"{c['id']}: effect.step must be a one-based scenario step",
                )
                require(
                    s["steps"][step - 1]["edge"] == effect.get("edge"),
                    f"{c['id']}: effect edge must match its scenario step",
                )
            if effect["outcome"] == "blocks":
                require(
                    effect["basis"] != "unverified", f"{c['id']}: unverified effect cannot block"
                )
            marker = effect.get("marker")
            if effect["outcome"] == "blocks" and effect.get("traffic", "stops") == "stops":
                require(
                    "step" in effect and marker is not None,
                    f"{c['id']}: blocking needs a step and marker",
                )
                require(
                    routes or all(a["to"] == b["from"] for a, b in zip(s["steps"], s["steps"][1:])),
                    f"{c['id']}: blocking needs a continuous ordered path; separate independent branches",
                )
                route = [step["edge"] for step in s["steps"]]
                require(
                    len(route) == len(set(route)),
                    f"{c['id']}: blocking cannot reuse an edge; separate repeated traversals",
                )
                if not effect.get("arrival", False):
                    for route in applicable_routes(c, routes, s.get("sources", [])):
                        for branch in route.get("branches", []):
                            require(
                                not (
                                    branch.get("beforeStep") == effect["step"]
                                    and edges[branch["edges"][0]]["from"]
                                    == edges[effect["edge"]]["to"]
                                ),
                                f"{c['id']}: beforeStep branch at the stopping decision destination requires arrival:true",
                            )
            if marker is not None:
                require(isinstance(marker, dict), f"{c['id']}: marker must be an object")
                require("edge" in effect, f"{c['id']}: marker needs an effect edge")
                for field in ("at", "x", "y", "w"):
                    number(marker.get(field), f"{c['id']}.marker.{field}")
                require(0 < marker["at"] < 1, f"{c['id']}: marker.at must be inside the edge")
                require(marker["w"] >= 180, f"{c['id']}: marker width must be at least 180")
                require(
                    0 <= marker["x"] <= model["canvas"]["width"] - marker["w"]
                    and 0 <= marker["y"] <= model["canvas"]["height"] - 72,
                    f"{c['id']}: marker label must fit the canvas (height 72)",
                )
                points = edges[effect["edge"]]["points"]
                require(
                    any(a != b for a, b in pairwise(points)),
                    f"{c['id']}: marker edge must have nonzero length",
                )
    # Byte lines keep CR, LF and CRLF intact and leave Unicode separators inside the line.
    lines = assessment_bytes.splitlines(keepends=True)
    for e in evidence.values():
        require(
            isinstance(e.get("quote"), str) and e["quote"].strip(), f"{e['id']}: quotation required"
        )
        # A lone surrogate in a JSON quote cannot match strictly decoded UTF-8 input.
        quote_bytes = e["quote"].encode("utf-8", errors="surrogatepass")
        require(
            quote_bytes in assessment_bytes, f"{e['id']}: quotation is not exact assessment text"
        )
        if "startLine" in e or "endLine" in e:
            a, b = e.get("startLine"), e.get("endLine")
            require(
                isinstance(a, int) and isinstance(b, int) and 1 <= a <= b <= len(lines),
                f"{e['id']}: invalid assessment line range",
            )
            require(
                quote_bytes in b"".join(lines[a - 1 : b]),
                f"{e['id']}: quotation outside stated range",
            )
        paths = e.get("paths", [])
        require(
            isinstance(paths, list) and all(isinstance(path, str) for path in paths),
            f"{e['id']}: paths must be an array of strings",
        )
        for path in paths:
            require(path in e["quote"], f"{e['id']}: cited path not present in quotation: {path}")
    if model.get("assessmentSha256"):
        require(
            hashlib.sha256(assessment_bytes).hexdigest() == model["assessmentSha256"],
            "Assessment SHA256 mismatch",
        )

def embedded(value):
    """Encode a value as JSON for an HTML script element, escaping HTML delimiters."""
    return (
        json.dumps(value, ensure_ascii=False, allow_nan=False)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )

def enters_node(start, end, node):
    """Return whether the segment between two (x, y) points enters the open node rectangle.

    Contact with an edge or corner alone is allowed when routing a connector.
    """
    enter, leave = 0, 1
    for a, b, low, size in zip(start, end, (node["x"], node["y"]), (node["w"], node["h"])):
        high = low + size
        if a == b:
            if not low < a < high:
                return False
        else:
            first, last = sorted(((low - a) / (b - a), (high - a) / (b - a)))
            enter, leave = max(enter, first), min(leave, last)
    return enter < leave

def connector_warnings(model):
    """Yield layout warnings for diagonal end bends and connectors that enter node interiors."""
    for edge in model["edges"]:
        segments = [(a, b) for a, b in pairwise(edge["points"]) if a != b]
        diagonal = [a[0] != b[0] and a[1] != b[1] for a, b in segments]
        if len(segments) > 1:
            for index, neighbor, port in ((0, 1, "source"), (-1, -2, "destination")):
                if diagonal[index] and not diagonal[neighbor]:
                    yield f"{edge['id']}: diagonal {port} leg meets an axis-aligned segment. Check the adjacent bend."
        for node in model["nodes"]:
            if any(enters_node(a, b, node) for a, b in segments):
                yield f"{edge['id']}: enters node {node['id']}. Route outside its box."

def main():
    """Validate the assessment and model, write a self-contained HTML file, and print layout warnings."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("--assessment", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        model = json.loads(args.model.read_text(encoding="utf-8-sig"))
        assessment_bytes = args.assessment.read_bytes()
        assessment = assessment_bytes.decode("utf-8")
        if args.output.exists():
            require(
                not any(args.output.samefile(path) for path in (args.model, args.assessment)),
                "output must not overwrite the model or assessment input",
            )
        validate(model, assessment_bytes)
        assets = Path(__file__).resolve().parents[1] / "assets"
        template = (assets / "explorer.html").read_text(encoding="utf-8")
        replacements = {
            "__MODEL_JSON__": embedded(model),
            "__ASSESSMENT_JSON__": embedded(assessment),
        }
        for placeholder, filename in (
            ("__CONTROL_EFFECTS_JS__", "control-effects.js"),
            ("__ROUTE_PATHS_JS__", "route-paths.js"),
            ("__SOURCE_ROLES_JS__", "source-roles.js"),
            ("__EXPLORER_CSS__", "explorer.css"),
            ("__SVG_LAYOUT_JS__", "svg-layout.js"),
            ("__EXPLORER_JS__", "explorer.js"),
        ):
            replacements[placeholder] = (assets / filename).read_text(encoding="utf-8")
        # Replace only template tokens, never token-like text in inserted source data.
        result = re.sub(
            "|".join(map(re.escape, replacements)),
            lambda match: replacements[match.group()],
            template,
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result, encoding="utf-8")
        print(
            f"Built {args.output} ({len(model['nodes'])} nodes, {len(model['scenarios'])} scenarios)"
        )
        for warning in connector_warnings(model):
            print(f"Connector warning: {warning}")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(2, f"Build error: {exc}\n")

if __name__ == "__main__":
    main()
```

### Not embedded

- `assets/context-reference-overview.svg` (binary asset, not embedded)
- `assets/context-reference-path.svg` (binary asset, not embedded)
