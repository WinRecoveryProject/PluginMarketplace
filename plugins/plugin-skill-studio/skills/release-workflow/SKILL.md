---
name: release-workflow
description: "Use when preparing, packaging or resuming a plugin release with evidence and bounded retries."
---

# Plugin Release Workflow

Read [Studio policy](../../references/studio-policy.md) first.

Use local validator and `tools/package.py` for deterministic packaging. Keep a checkpoint through prepared, uploading, scanning, failed, passed, submitted and published. Run `release-checkpoint` and `release-advance` to validate recorded transitions. A checkpoint records external observations; it does not itself upload or prove publication. Use native authorized host browser access for remote operations, inspect existing draft identity before retrying, and bound retries. Preserve package/developer identity on updates. Public URLs and account facts must be verified. No Keybook, ego-browser or other companion plugin is required. Stop only at actual authorization, authentication, compliance or capability boundaries.
