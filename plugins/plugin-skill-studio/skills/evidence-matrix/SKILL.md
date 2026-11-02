---
name: evidence-matrix
description: "Use when arranging explicitly supplied evidence by skill and source with an explicit snapshot date."
---

# Skills Evidence Matrix

Read [Studio policy](../../references/studio-policy.md) first.

Run `node scripts/studio.mjs evidence-matrix <input.json>`. Inputs are asOf, freshWithinDays, skills and evidence records containing skill, source, fact and date. This is a local worksheet for supplied evidence, including adult user-controlled competency evidence. It does not fetch private data, infer ability, rank people or make hiring decisions. Distinguish recent, older and missing evidence. Future or invalid dates are not silently counted as recent. Evaluation receipts may be summarized separately; they do not turn recency into agent quality.
