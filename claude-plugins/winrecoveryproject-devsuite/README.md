# WinRecoveryProject DevSuite for Claude Code

DevSuite provides seven local software workflows and a start guide. Use it for planning, implementation, debugging, review, testing, quality checks and handoff. The package uses the same workflow router as DevSuite for Codex and VS Code.

The Claude package has no App bindings, MCP servers, lifecycle hooks or account setup. Codex Tasks, Cloud Environment, Codex Process Jobs, CloudConvert and Codex Security provider operations are unavailable in this package. The full Codex plugin still handles its existing connected workflows. [DevSuite source and capabilities](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite)

## Build and check

Build a standalone ZIP with Python 3.10 or later from the source repository root.

~~~text
python -I -B editors/claude/package.py --out "<destination>/winrecoveryproject-devsuite-claude-0.6.0.zip"
~~~

Extract the ZIP to a new directory. From that directory, check the package and preview a routing decision.

~~~text
claude plugin validate --strict .
python -I -B scripts/devsuite.py doctor
python -I -B scripts/devsuite.py route -- "Review the local diff"
~~~

The router accepts one literal argument and selects a local guide. It never interprets the request as shell code, executes a workflow, or calls a provider. Doctor checks package metadata, available guides and documentation links.

In an existing Claude Code session where the plugin is installed, invoke the DevSuite start skill or one of its local guides. Local workflow decisions still follow the authorization and scope of that session.

After this edition is listed in the project Marketplace, use this command in Claude Code.

~~~text
/plugin install winrecoveryproject-devsuite --marketplace WinRecoveryProject/PluginMarketplace
~~~
