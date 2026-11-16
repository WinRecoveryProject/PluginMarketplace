---
name: devsuite-security-assess
description: "Use for repository or diff security audits, threat models, discovery, static triage, attack paths and controlled validation."
---

# Assess security from evidence

Read [the policy](../../references/policy.md), [assessment methods](../../references/security-assessment.md) and [providers](../../references/providers.md). These are independently owned workflows. Proprietary Codex Security implementation, canonical sealing, workbench storage/indexing, Deep Scan SDK and model workers remain the licensed existing host provider. Never copy them or present a stand-in as that provider.

Choose one entry mode: standard is one source-backed repository/path pass; diff is the immutable PR/commit/branch/working-tree comparison plus necessary surrounding code; deep explicitly requests repeated independent whole-scope passes and needs the actual provider. Never silently reduce deep to standard or invoke deep for an ordinary diff. Preserve exact scope/context, supplied threat model and inherited SECURITY.md exclusions. Resolve revision and ignore rules without widening directly authorized files.

For host-backed scans, discover schemas; start/resume the exact owned scan, honor SDK lifecycle and returned IDs/claim tokens/paths. Run actual capability/configuration preflight. Save semantic partial checkpoints and honest coverage, record final drafts, complete/seal only through the real provider when ownership allows. SDK-owned completion returns to its owner. Progress reflects reviewed files/phases. Preserve failures and partial coverage. Never manufacture proprietary artifacts/completion. Standard/Deep reports, saved results, usage, feedback and cancellation use available provider tools. Without them, ordinary source review can produce a clearly labeled DevSuite assessment; Deep/workbench completion is UNAVAILABLE.

Build trust boundaries, discover broken-invariant candidates, statically triage imported reports, trace attacker-to-impact paths, test controlled reproductions and seek counterevidence. Findings need root cause, reachable control, location, impact, calibrated confidence/severity and reproduction state. Missing optional advisory access does not require new authentication; continue supported work with limitations. [Assessment methods](../../references/security-assessment.md) defines each function. Fixes and issue writes are distinct authorized phases in [remediation](../devsuite-security-fix/SKILL.md).
