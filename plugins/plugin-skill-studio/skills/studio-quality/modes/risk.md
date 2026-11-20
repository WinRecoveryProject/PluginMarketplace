# Risk mode

<a id="src-risk-review-intro"></a>

<a id="src-risk-review-skill-risk-check"></a>
## Skill Risk Check

Read [Studio policy](../../../references/studio-policy.md) first.

Run `node scripts/studio.mjs risk-scan <target> --format markdown`. Named `Dockerfile` and `Containerfile` members and files ending in `.dockerfile` or `.containerfile` are included as text; binary companions such as `Dockerfile.pkl` are excluded. Size limits still apply and an unreadable or oversized supported file makes coverage incomplete. Review each finding at its exact file and line. Scanning is read-only: never execute, import, source, install, enable, upload, or contact endpoints named by the target. Findings are signals, not proof of intent; clean output is not a safety certification. Suppress only an exact rule ID, rule version and fingerprint with a concrete reason. JSON, Markdown and SARIF are available. Installation remains a separately authorized action.
