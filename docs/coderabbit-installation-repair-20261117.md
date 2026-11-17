# CodeRabbit installation instruction repair — 17 November 2026

## Change and provenance

CodeRabbit 1.1.4 instructed the agent to install a missing CLI by sending a remote
installer directly into a shell. That entrypoint was disabled in the earlier audit.

The original publisher has already corrected this behavior in its public 1.1.6
package. This Marketplace now carries an exact, unmodified snapshot from
[coderabbitai/codex-plugin](https://github.com/coderabbitai/codex-plugin/tree/35779b453cca18aa7cd3176f0bb73a8c75d11da8/plugins/coderabbit).
`plugin-sources.lock.json` records that immutable upstream revision and all eight
file hashes. The CodeRabbit name, publisher, MIT declaration, review skill name
and original image assets are preserved. There are no App or MCP bindings to add
or reconnect. The existing host-provided 1.1.4 entrypoint stays disabled; only the
corrected Marketplace package is activated.

The corrected execution reference requires a trusted existing CLI, forbids
automatic installation and automatic login, and preserves the credential store.
A missing executable is an unmet prerequisite; enabling this skill does not
install the CLI or prove that a remote review can run. No installer, login flow,
remote review or credit-funded command was executed in this repair. Budget: 0 kr.

## Verification

- Plugin-Skill-Studio 0.3.3 deep static analysis reproduces the old remote-execution
  finding in 1.1.4. The exact 1.1.6 candidate reports zero errors, warnings or
  information findings and static readiness score 100. This is static readiness,
  not a successful CodeRabbit AI review.
- Native Desktop `plugin/read` loads the new package with its existing
  `code-review` skill, ON_USE policy, zero Apps and zero MCP servers.
- The older portable-template validator reports two portability convention
  errors: the publisher's subtitle is longer than 30 characters, and the native
  skill name differs from its directory. These original fields are preserved.
  The native loader accepts them; this does not waive those portable rules for
  other packages or claim portable-template compliance.
- Package file integrity and the native effective activation state are checked
  again after installation. Configuration comparison permits only the new
  CodeRabbit Marketplace plugin entry; existing provider settings and all prior
  skill flags must remain unchanged.

## Official operational references

[CLI documentation](https://docs.coderabbit.ai/cli) describes current CLI use and
usage-based review consent. [Native Windows installation](https://docs.coderabbit.ai/cli/windows)
describes signed Windows binaries. Documentation links are references, not
authorization to run their installation examples. Use existing included/free
capabilities only; never authorize credits, change a plan or replace a connection
because the skill is enabled.

Installed state and observed verification are recorded in the accompanying
`coderabbit-installation-repair-20261117.json` receipt after deployment.
