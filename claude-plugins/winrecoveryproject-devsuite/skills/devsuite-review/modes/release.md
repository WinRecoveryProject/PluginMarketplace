# Release mode

Follow [the policy](../../../references/policy.md) and the review baseline in this skill.

<a id="src-devsuite-review-release"></a>
For immutable patch risk, record the artifact hash/head before review, affected runtime paths, blast radius, data/API/security boundaries, evidence gaps, rollout/rollback and recoverability. Recommend low/moderate/high risk with reasons and whether explicit repository auto-merge criteria are evidenced. This never applies, pushes or merges the patch.

For release readiness also check acceptance criteria, open defects, deployment/configuration, dependency/security changes, migrations, backups/rollback, observability, docs and manual checks. No release write is implied.
