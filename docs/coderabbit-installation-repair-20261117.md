# CodeRabbit installation instruction repair — 17 November 2026

## Change and provenance

CodeRabbit 1.1.4 instructed the agent to install a missing CLI by sending a remote
installer directly into a shell. That entrypoint was disabled in the earlier audit.

The original publisher has already corrected this behavior in its public 1.1.6
package. The initial repair used an exact, unmodified 1.1.6 snapshot from
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

## Initial installed result (before CLI setup)

CodeRabbit 1.1.6 is installed and enabled in Desktop. Native discovery reports
exactly one active CodeRabbit skill; the old 1.1.4 entrypoint remains disabled.
All eight installed files match the immutable upstream snapshot. Configuration
comparison confirms that only the new CodeRabbit Marketplace plugin entry was
added: all previous plugin settings, skill flags and other settings are unchanged.

The CodeRabbit executable was not found in PATH or the checked standard Windows
and user-local locations. A real AI review was therefore not run; no installer,
login, credentials or paid credits were used. The safety/instruction and native
activation checks passed. The two original portable-template conventions remain
documented above.

[Observed verification receipt](coderabbit-installation-repair-20261117.json).

## Authorized Windows CLI and practical follow-up

The follow-up installed CodeRabbit CLI 0.9.5 from the official pinned Windows
ZIP. Authenticode was verified before execution: valid CodeRabbit Inc. signer,
Microsoft ID Verified CS issuer, code-signing EKU and timestamp. The executable
SHA-256 is `67ee19096586e0803e260513a1690f2906d965a2a58d426cd9f42b2c37c2ffbd`.
No vendor installer script was run. Automatic updating of this manual binary
installation remains unverified; a future Desktop restart may be needed for its
new user PATH entry to reach the parent app. The exact installed binary was used
for all tests without restarting Desktop.

GitHub authentication succeeded in the EU region. The billing page explicitly
offered **Start free trial** as an unstarted action; that action was not taken.
CLI usage reported three included reviews and inactive usage billing before
the first review. No trial, paid plan, API key or `--use-credits` was requested.
The account token remains managed by the CLI, outside the plugin and repository.

The first practical review completed successfully with two findings: minor
installation-specific update advice and major parent traversal in skill icon
paths. It reviewed 12 text files across the two repair commits and excluded three
binary image files. This result is not a clean review.

Both findings were checked against official documentation and corrected in
`1.1.7-wrp.1`, a WinRecoveryProject packaging adaptation of upstream 1.1.6, not an
upstream CodeRabbit release. The original name, author, artwork, review skill
identity and license declaration are preserved. Skill-local icon copies remove
parent traversal; update advice now distinguishes Homebrew, script installation
and manual Windows copies. `plugin-sources.lock.json` retains original upstream
hashes separately from adapted package hashes.

Studio deep static analysis of the adapted package reports zero findings.
The two older portable-template convention errors remain the documented
limitations above; this follow-up does not claim public directory submission
approval. Native Desktop loading and practical review are separate checks.

The second practical review completed with **zero findings** across all four
changed text files in the adapted package. The copied binary icons are checked
separately by SHA-256 against the original artwork. This second review covers
the corrective package changes, not the whole Marketplace. The local Marketplace
validator passes 1,588 checks, including six adaptation-specific checks; isolated
native Desktop discovery also loads `1.1.7-wrp.1` and its original `code-review`
skill successfully. Both review runs explicitly used the free CLI allowance.

Final installation verification: `coderabbit@winrecoveryproject-digital` is
installed and enabled as `1.1.7-wrp.1`. All 11 packaged files match the canonical
Marketplace and its managed Desktop snapshot. Exactly one CodeRabbit skill is
active; the old 1.1.4 entrypoint remains disabled. Previous provider settings and
skill flags are unchanged. Billing remains inactive and the observed cost is
0 kr. The machine-readable receipt above records the final state.
