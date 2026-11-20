# Plugin files: winrecoveryproject-linter — `config/`

Source: `plugins/winrecoveryproject-linter`. Files outside the `skills/*` folders, embedded as text.

## File: `config/blinter-requirements.txt`

```text
# Isolated external tool, not bundled into MIT product. PyPI SHA-256 receipts, 2026-11-16.
Blinter==1.1.66 --hash=sha256:e6f2a8207cc2a55458888018d372104d127542377eaac6ccb1f4e6abc7dec169
charset-normalizer==3.5.2 --hash=sha256:b6b751274acb69d77b3323d6b7dbaa3c7fdfc1eb829b7eb61d262f32e1af9685
```

## File: `config/global-npmrc`

```text
# Deliberately empty trusted global configuration for local bootstrap.
```

## File: `config/markdown.json`

```json
{ "default": true, "MD013": false, "MD024": { "siblings_only": true } }
```

## File: `config/native-package.json`

```json
{
  "schemaVersion": 1,
  "id": "winrecoveryproject-linter",
  "entries": [
    ".codex-plugin/plugin.json",
    "LICENSE",
    "PRIVACY.md",
    "README.md",
    "TERMS.md",
    "THIRD-PARTY-NOTICES.md",
    "adapters/extract-shellcheck.ps1",
    "adapters/powershell.ps1",
    "adapters/python-syntax.py",
    "assets/asset-manifest.json",
    "assets/composer-icon.png",
    "assets/favicon-16.png",
    "assets/favicon-32.png",
    "assets/favicon-48.png",
    "assets/favicon.ico",
    "assets/logo.png",
    "assets/source/alpha-cleaned.png",
    "assets/source/generated-raw.png",
    "assets/source/logo-preparation.json",
    "assets/source/prompt.txt",
    "assets/thumbnail.png",
    "bin/wrp-lint.mjs",
    "chatgpt-app-submission.json",
    "config/blinter-requirements.txt",
    "config/global-npmrc",
    "config/markdown.json",
    "config/native-package.json",
    "config/npmrc",
    "licenses/libpg-query-upstream-BSD.txt",
    "licenses/libpg-query-wrapper-MIT.txt",
    "licenses/postgresql-COPYRIGHT.txt",
    "npm-shrinkwrap.json",
    "package-lock.json",
    "package.json",
    "scripts/package-native.py",
    "scripts/verify-fresh-runtime.mjs",
    "skills/lint-project/SKILL.md",
    "skills/lint-project/agents/openai.yaml",
    "skills/lint-project/assets/wrp-icon-128.png",
    "skills/lint-project/assets/wrp-icon-256.png",
    "skills/setup-linters/SKILL.md",
    "skills/setup-linters/agents/openai.yaml",
    "skills/setup-linters/assets/wrp-icon-128.png",
    "skills/setup-linters/assets/wrp-icon-256.png",
    "src/catalog.mjs",
    "src/engine.mjs",
    "src/powershell-batch.mjs",
    "src/process.mjs",
    "src/runtime-cache.mjs",
    "src/setup.mjs",
    "src/sql-process.mjs",
    "src/sql-worker.mjs",
    "test/executable-discovery.test.mjs",
    "test/linter.test.mjs",
    "test/package.test.mjs",
    "test/powershell-batching.test.mjs",
    "test/practical-regressions.test.mjs",
    "test/python-adapter.test.mjs",
    "test/runtime-cache.test.mjs",
    "test/setup-failure-isolation.test.mjs",
    "test/sql.test.mjs",
    "test/toc-regressions.test.mjs"
  ]
}
```

## File: `config/npmrc`

```text
# Deliberately empty trusted user configuration for local bootstrap.
```
