# DevSuite source instructions

This is the owned WinRecoveryProject DevSuite source, not an installed plugin cache.
Read README.md, references/policy.md and references/capability-matrix.json for the
product contract. Preserve existing App IDs and provider connections. Never copy
credentials or proprietary provider implementations into this source. Only original
code and explicitly permitted MIT adaptations belong in the redistributable package.

Run `python -m unittest discover -s tests -v` and `python scripts/devsuite.py doctor`
after changes. Test fixtures use temporary directories. No network or paid services
are required for local validation. Provider readiness is a separate, conditional
claim. Do not publish, install, mutate other packages or user settings from tests.
