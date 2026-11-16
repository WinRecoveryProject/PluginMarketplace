---
name: devsuite-security-fix
description: "Use when fixing security findings, verifying remediation, proposing hardening, writing policy/disclosures or tracking validated findings."
---

# Remediate the broken boundary

Read [the policy](../../references/policy.md), [remediation methods](../../references/security-remediation.md) and [providers](../../references/providers.md). Classify current state as vulnerable, already safe or unproven before patching. Suspicion is not successful exploitation or a verified fix.

For an authorized fix inspect implementation, callers, representations, parser/validation-to-use transitions, lifecycle copies and sibling sinks. State invariant, narrowest shared enforcement boundary and legitimate API/error/compatibility requirements. Independently seek bypass/compatibility counterexamples in a separate pass; subagents require explicit authority. Reject truncation/reinterpretation or partial controls that preserve an alternate unsafe path.

Demonstrate safely, implement the smallest coherent complete boundary fix, test malicious variants and legitimate workflows, and inspect the patch independently. Repeat original and sibling/negative cases and repository checks. Compare against the prior vulnerable revision when safe/useful. Separate fixed, already safe, partial and unproven. Real workbench remediation/patch review owns its stages and artifact IDs when present; never spoof it.

Hardening, policy, vulnerability writeups and tracker/advisory batches follow [methods](../../references/security-remediation.md). Prepare evidence and concrete payloads. Honor existing authorization; external writes require explicit authority when not already covered. GitHub, Linear and optional Atlassian reuse existing bindings. Missing Jira access never authorizes connecting it. A scan finding never itself authorizes disclosure, messages, tickets or merging.

Report outcome, locations, invariant, patch/reproduction evidence, compatibility checks, risks and unavailable provider steps. Severity reflects impact/reachability rather than alarming wording.
