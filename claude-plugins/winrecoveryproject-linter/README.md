# WinRecoveryProjectLinter for Claude

~~~text
/plugin install winrecoveryproject-linter --marketplace WinRecoveryProject/PluginMarketplace
~~~

Use the `lint-project` skill or the plugin's `wrp-lint` command to scan a local project. The packaged launcher requires Node.js 24 or newer.

```text
node ./scripts/wrp-lint.mjs scan "<project-root>" --types lua,xml,toc --format json
```

Scans report language coverage, findings and missing tools. Use the `setup-linters` skill or the launcher's `setup` command when you want to prepare the pinned tools. See the upstream repository for supported languages and runtime requirements.

[Privacy policy](PRIVACY.md) · [Terms](TERMS.md)
