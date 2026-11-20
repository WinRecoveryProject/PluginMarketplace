# Plugin files: codex-process-jobs — manifests and top-level files

Source: `plugins/codex-process-jobs`. Files outside the `skills/*` folders, embedded as text.

## File: `.codexignore`

```text
.DS_Store
.git/
.github/
benchmarks/
dist/
docs/
node_modules/
coverage/
test/
*.tmp
*.log
.env
.env.*
!.env.example
AGENTS.md
CHANGELOG.md
CONTRIBUTING.md
package.json
package-lock.json
scripts/install.mjs
scripts/npm-cli.mjs
scripts/package-openai-directory.py
scripts/smoke.mjs
hooks/
```

## File: `COPY-COMPLETE.json`

```json
{
  "complete": true,
  "files": 39,
  "installedInHost": false
}
```

## File: `IMPORT-RECEIPT.json`

```json
{
  "schemaVersion": 1,
  "installer": "plugin-skill-studio",
  "source": "installed:created-by-me-remote/codex-process-jobs/0.5.2",
  "sourceHash": "3b7f54ebc4ec89ef76fc05bc0faeef6152ee481d02d3fc8a0b89956697e66513",
  "target": "marketplace:plugins/codex-process-jobs",
  "files": [
    {
      "path": ".codex-plugin/plugin.json",
      "bytes": 1485,
      "sha256": "0a381484c44931b13f0e35f6a562dfddb9f4c1c206d5b4c2abb2ff5bbd01c27c"
    },
    {
      "path": ".codexignore",
      "bytes": 288,
      "sha256": "4825bb2e794aded76ba0ffc21dbb67649f8f2fc63df62f203719ff204d0d943a"
    },
    {
      "path": "assets/icon.png",
      "bytes": 229722,
      "sha256": "79b90b2edfc4dd679992e1df12000ecf10e4416550e2308907a3cbe6cdf557d9"
    },
    {
      "path": "LICENSE",
      "bytes": 11357,
      "sha256": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
    },
    {
      "path": "plugin.json",
      "bytes": 1712,
      "sha256": "13a07825465b835cb73408a1949dd8898effcd26d2c02d0c20e64241261aedee"
    },
    {
      "path": "PRIVACY.md",
      "bytes": 634,
      "sha256": "4290abfcaa04f2a16da09e203064e758b8bd2737f0a4aa310ee9af6d590c46c3"
    },
    {
      "path": "README.md",
      "bytes": 6032,
      "sha256": "dc9dadad756f971270e49d5575a77066821fe662e74eb3a0c642dcfec11f9a88"
    },
    {
      "path": "references/windows-process-execution.md",
      "bytes": 2506,
      "sha256": "f87ed30d887ddfc638fcc7def803317ca31eff5a0a5419e5f00fff191f5649a8"
    },
    {
      "path": "scripts/cli-app-server-ipc.mjs",
      "bytes": 16372,
      "sha256": "590fef5ae674bfb50490f3db714c2825360ebe520cecbdc161bf2ae9f14950b7"
    },
    {
      "path": "scripts/cli-entry.mjs",
      "bytes": 737,
      "sha256": "7b78bf23f655ec3dd7a968cdb193841ef50998ca6ce2d8badffafdaef242340b"
    },
    {
      "path": "scripts/client-surface.mjs",
      "bytes": 2658,
      "sha256": "844eb4ddcd12e2fe48ac1b6918d720382084591409671b0c627701ecaea408d2"
    },
    {
      "path": "scripts/codex-queue.mjs",
      "bytes": 4724,
      "sha256": "1d3d9c895fb9f0d1240f0c30acfa18e99566a219ef7edcbddfb69b18e73db72f"
    },
    {
      "path": "scripts/cpj-command.mjs",
      "bytes": 6173,
      "sha256": "a7583e62fa9ddbffe3881ed657622410807ac9c7b354d8f80e29a067edb994f1"
    },
    {
      "path": "scripts/desktop-ipc.mjs",
      "bytes": 10216,
      "sha256": "f60ff5d4a1231fffcc85afd036a7648103959f776483d4c1746ff4e2615c5068"
    },
    {
      "path": "scripts/execution.mjs",
      "bytes": 2300,
      "sha256": "178c01d60629bc58f9963ace329fcc8e197ae52a6e068b0df63557663f256fd1"
    },
    {
      "path": "scripts/job.mjs",
      "bytes": 38408,
      "sha256": "55d20c1345b5d3bf26efb31585552032f37287a07ac8ea70fadde284a67dc98c"
    },
    {
      "path": "scripts/logs.mjs",
      "bytes": 6563,
      "sha256": "69bd6c4849d6e78919e82ecc8c6f0b1f5036e69b8c92ef700c7db14e1904afbe"
    },
    {
      "path": "scripts/notifier.mjs",
      "bytes": 29363,
      "sha256": "3399bafd2377b3d6c14f685d914ed46d7f8fd77131e2dbee1e445de5de5b64c5"
    },
    {
      "path": "scripts/plugin-identity.mjs",
      "bytes": 2150,
      "sha256": "23da5232dfab1389872a1b8f72fb410970401975a4ca6cf0e409d2da7b51eb02"
    },
    {
      "path": "scripts/preferences.mjs",
      "bytes": 4979,
      "sha256": "a4fc21996537a4ef3cd444dd23c00b9f54825fb4056127249f227d314f98f6df"
    },
    {
      "path": "scripts/process-control.mjs",
      "bytes": 5112,
      "sha256": "cfc88b3901122821bd1cc8713ba43a0dc42706a332d42768ddbadda2a233ec47"
    },
    {
      "path": "scripts/session.mjs",
      "bytes": 5787,
      "sha256": "95c074be9c8987a6c4378211225e8ec7baaa89860d8011b32e9e34d45006323f"
    },
    {
      "path": "scripts/state.mjs",
      "bytes": 18258,
      "sha256": "de65f1bca6b709dce8c29eb7bc95aafc6992973c4f9dfbb1e50d6ecd658496cd"
    },
    {
      "path": "scripts/worker.mjs",
      "bytes": 8584,
      "sha256": "37fb9c5a154ae01104cea70d27afea98db6533e480197142d813daeb301a630c"
    },
    {
      "path": "SECURITY.md",
      "bytes": 1388,
      "sha256": "45d37814377d583cc93dcca49eecd1d4174892ee6dd5ba33ac6b27d42efa372e"
    },
    {
      "path": "skills/cancel/agents/openai.yaml",
      "bytes": 182,
      "sha256": "0474ed198883982ef0e1ad131d67075159a63a835620172fb05030eab2d52d71"
    },
    {
      "path": "skills/cancel/SKILL.md",
      "bytes": 2035,
      "sha256": "13c082083fc903bc72b2beaaf207b5bc92117f113f114badd3abad3e33080911"
    },
    {
      "path": "skills/rerun/agents/openai.yaml",
      "bytes": 180,
      "sha256": "ec4142b1ba5b5f097ea61ea847b456baf914ed10102a6bc8c64b38b0011d1425"
    },
    {
      "path": "skills/rerun/SKILL.md",
      "bytes": 3042,
      "sha256": "1c9ec2a0e23ee85f364fb5615d039675ecaf63d73f60ae730671df7579a6ea6b"
    },
    {
      "path": "skills/result/agents/openai.yaml",
      "bytes": 190,
      "sha256": "d3fb9d5aed793d3a2fb547275af1db316836c97e0ab20ec5f69102124856e378"
    },
    {
      "path": "skills/result/references/options.md",
      "bytes": 333,
      "sha256": "9306340fb24fa90598b6bbde7cd942701421b30fffa4a125e95465919af0bbac"
    },
    {
      "path": "skills/result/SKILL.md",
      "bytes": 1635,
      "sha256": "ff4ae813577b0a91e7d36c1a236c0225d807f55bb59e62c6a2801448a899b0cc"
    },
    {
      "path": "skills/start/agents/openai.yaml",
      "bytes": 195,
      "sha256": "495b2dce90ed7e3dff6543a3cb1e76f1731c0ce37ecc3ae1938ab3f94a4f349c"
    },
    {
      "path": "skills/start/SKILL.md",
      "bytes": 6728,
      "sha256": "54b9f5a81aa325b2eed51c7dc52bc42affc515b19de8fb62538698ed2e925c20"
    },
    {
      "path": "skills/status/agents/openai.yaml",
      "bytes": 181,
      "sha256": "7ccae39f014775ece71e407b00eacb2c7f1d66f89b2ed91298915525f9c239ff"
    },
    {
      "path": "skills/status/SKILL.md",
      "bytes": 3711,
      "sha256": "beb16480702b7e31515f5fe2556eb56cea43cc38390f1f9ffd4ac9503ef92f17"
    },
    {
      "path": "skills/tail/agents/openai.yaml",
      "bytes": 180,
      "sha256": "8e6c4481279274ba17954976b30569d6b314bd3f1be54c7dc2d273bdf99f9c48"
    },
    {
      "path": "skills/tail/SKILL.md",
      "bytes": 1873,
      "sha256": "5a9d09fa6c5c9970533937660a7e6ffa17cb08c04caf16188e417ddba1c1b9c5"
    }
  ],
  "createdAt": "2026-11-16T01:16:32.360Z",
  "state": "local-candidate",
  "installedInHost": false,
  "executedTarget": false,
  "pathDisclosure": "portable",
  "historicalReceipt": true
}
```

## File: `LICENSE`

```text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

## File: `PRIVACY.md`

### Privacy Policy

The CPJ privacy policy is published at https://filamentlabs.io/CPJ/privacy.

CPJ stores job metadata, command arguments, working directories, notification state, and bounded output locally. These records have no automatic age-based expiration. Commands can print secrets; output is not automatically redacted. Returned results may be processed by OpenAI. The website uses Cloudflare services and Google Fonts. Support messages are processed by Filament Labs and its email providers. The linked policy describes retention, recipients, and deletion controls.

This experimental package contains no local plugin hooks.

## File: `README.md`

### Codex Process Jobs

Codex Process Jobs (CPJ) runs finite local commands as durable detached jobs on macOS and Linux. Jobs retain their status and bounded output after the launching turn ends. You can inspect results, request cancellation, or explicitly rerun a finished job.

CPJ is an independent community plugin. OpenAI does not develop or support it. Automatic conversational completion uses experimental local Codex transports on a best-effort basis.

#### Install and update

Install Codex Process Jobs from the OpenAI Plugins Directory. After an update, restart Codex App or CLI, or run **Developer: Reload Window** in VS Code. Start a fresh task to load the new plugin snapshot. Existing tasks may retain an earlier version.

Version 0.5.1 contains no plugin hooks. There is no new CPJ hook to approve. The local installer does not enable the hooks feature or write hook trust. Existing unrelated hooks and preserved older plugin generations remain unchanged.

The Plugins Directory is the supported distribution channel. GitHub Releases provide source provenance and immutable archives. Do not install from npm. The Homebrew formula remains deprecated and frozen at 0.2.2.

#### Use

Ask Codex to run a finite build, test, download, evaluation, or data job in the background. The start skill launches the command and releases the turn. Servers and persistent watchers are not finite CPJ jobs.

The plugin provides six skills:

| Skill | Purpose |
| --- | --- |
| start | Launch an ordinary finite command |
| status | Inspect active or recent jobs in a later requested turn |
| tail | Read bounded recent output |
| result | Retrieve a completed job's saved output |
| cancel | Stop a job when explicitly requested |
| rerun | Launch a finished command again when explicitly authorized |

For an explicit controller invocation from a source checkout:

```sh
node scripts/job.mjs start --name "Example job" -- node -e "setTimeout(() => console.log('done'), 1500)"
```

Release the launching turn immediately. Do not monitor that job in the same turn. In a later user-requested turn, use the returned job ID:

```sh
node scripts/job.mjs status JOB_ID --json
node scripts/job.mjs result JOB_ID --json
```

Use argv mode by default. Shell syntax requires an explicit shell option. Never put credentials in arguments or logs. Critical repair jobs require their own target checks and explicit authorization. CPJ tracks execution; it does not establish that a repair succeeded.

#### Completion delivery

The worker starts a separate notification relay. Local CLI completion uses `codex queue`. App, VS Code, and recognized Work owners with local rollouts wait for the owning task to become idle before queue delivery. Existing local fallback transports remain available when queue delivery fails cleanly.

Completion notices contain validated job IDs, terminal status, exit codes, and fixed instructions. They do not contain command arguments, job labels, or process output. Inspect-mode notices ask the result skill to retrieve bounded output separately. Report-mode notices report status without requesting output. Completion notices grant no additional authority.

A queued message being accepted does not prove that a visible completion turn appeared. Automatic delivery is best effort. Saved results remain available if delivery fails.

##### Changes without hooks

There is no automatic unread-result pickup on a later ordinary prompt. If no completion appears, ask for status or result in a later turn. Launch-turn and delegation rules remain skill instructions, but no hook enforces them. Skill discovery must route the initial request to CPJ.

Cloud Work tasks without local rollouts report automatic completion delivery unavailable. A local executor does not make a cloud-owned task a local task. Version 0.5.1 does not add a supported cloud callback.

#### Local state and privacy

CPJ stores job records and bounded logs under the Codex home. Saved commands and logs can contain confidential information. CPJ does not automatically redact them or expire them by age. A launched command inherits its environment. CPJ does not save a copy of that environment, but the command can print it.

CPJ does not send job records or telemetry to Filament Labs. Metadata and output returned to an agent may be processed by the host service. Read the [privacy policy](https://filamentlabs.io/CPJ/privacy) for local storage, recipients, retention, website services, and support-message handling.

#### Source installation and development

The source installer is intended for development and migration. Run `node scripts/install.mjs` for a read-only preview. Choose `global`, `project`, or `none` for its optional AGENTS.md policy before applying. The installer requires an explicit choice. It preserves validated prior cache generations and refuses replacement while tracked jobs are active.

Run `npm run check` and `npm run smoke` to validate a source change. The test tree retains legacy hook compatibility tests; hooks are excluded from both the runtime allowlist and published archives. Build the marketplace ZIP with `npm run package:openai-directory`.

The [upstream maintainer release checklist](https://github.com/joelfarthing/codex-process-jobs/blob/main/docs/releasing.md) defines the remaining release gates. Synthetic transport tests do not replace a live local completion canary.

#### Support

Use the [support page](https://filamentlabs.io/CPJ/support) or [GitHub Issues](https://github.com/joelfarthing/codex-process-jobs/issues) for reproducible problems. Include the plugin version, host surface, operating system, and sanitized error. Send suspected vulnerabilities privately to info@filamentlabs.io. Do not post private output or credentials.

#### Local adaptation: Windows routing (0.5.2)

The six skills now select the host-managed Windows workflow before calling the
unsupported POSIX controller. This is not a Windows port of CPJ process groups,
IPC or completion delivery. Original controller code, attribution and license
remain unchanged. No reboot/crash recovery is promised for host sessions.

WinRecoveryProject maintenance revision **0.5.3-wrp.2** fixes Windows log-helper rotation. See [modification notice](_plugin.md#file-wrp-modificationsmd) for provenance, tested scope and platform limits.

## File: `SECURITY.md`

### Security: hook-free candidate

This experimental marketplace package registers no hooks and includes no hook scripts. The source checkout retains historical hook tests; those files are excluded from the ZIP. No installer or hook approval is required by this package.

CPJ starts commands with argv arrays unless explicit shell mode is selected. It validates saved job state and process identity before cancellation. Logs are bounded. Process output, command arguments, and job labels are untrusted data. A completion notice contains only validated identifiers, terminal status, exit code, and fixed result-handling instructions. The result skill retrieves output separately and treats it as untrusted evidence.

The worker starts a separate notification relay. Local delivery uses the existing queue and fallback transports. Host authentication and permissions remain host-controlled. A missing local lifecycle for a cloud Work owner does not authorize a private cloud callback or a live queue probe.

Without hooks, an ordinary later prompt does not automatically recover a missed completion. Skill instructions retain the launch-turn and delegation boundaries without hook enforcement. A live local canary is required before treating this candidate as release-ready.

Report suspected vulnerabilities privately to info@filamentlabs.io. Do not include credentials or sensitive output.

## File: `WRP-MODIFICATIONS.md`

### WinRecoveryProject maintenance revision

This is a modified Apache-2.0 derivative of Codex Process Jobs 0.5.2 by Joel Farthing.
Original author, license, branding and package identity are retained. This revision
is maintained by WinRecoveryProject; it is not an upstream release.

Changes on 2026-11-17 in version 0.5.3-wrp.1:

- Windows log helpers use writable handles and explicit byte positions, permitting
  truncation during bounded rotation. EOF is refreshed before an append so sequential
  writer handles preserve each other's bytes. POSIX retains O_APPEND and its writes.
- Import receipt machine paths are replaced by portable references. The receipt
  retains the original import's hashes/date and is historical, not a new import claim.
- Added isolated log regression tests. No controller or existing job was launched.

The current worker owns one writer per separate stdout/stderr file. Shared concurrent
multi-process writers/rotation are not supported by this helper. The POSIX controller
remains unsupported on Windows; its existing host-session workflow is unchanged.
Windows helper behavior was tested. Linux runtime behavior is not newly verified.

Changes on 2026-11-18 in version 0.5.3-wrp.2:

- Replaced the missing runtime-local release checklist link with the verified
  upstream maintainer documentation URL. The native snapshot contains no source
  release tooling; no controller, user job, log state or connection is changed.
- This documentation-only maintenance revision is not an upstream release.

## File: `plugin.json`

```json
{
  "interface": {
    "displayName": "Codex Process Jobs",
    "shortDescription": "Detached process jobs",
    "composerIcon": "./assets/icon.png",
    "logo": "./assets/icon.png",
    "longDescription": "Launch long-running local commands as tracked detached process groups, inspect bounded output, wait for completion, retrieve results, and cancel safely on macOS or Linux. On Windows, use the bundled host-managed execution fallback; the CPJ controller remains macOS/Linux-only.",
    "developerName": "Joel Farthing",
    "category": "Developer Tools",
    "websiteURL": "https://filamentlabs.io/CPJ/",
    "privacyPolicyURL": "https://filamentlabs.io/CPJ/privacy",
    "termsOfServiceURL": "https://filamentlabs.io/CPJ/terms",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "defaultPrompt": [
      "Run this build as a tracked background job.",
      "Show my active and recent process jobs.",
      "Open the result of the latest finished job."
    ]
  },
  "name": "codex-process-jobs",
  "version": "0.5.3-wrp.2",
  "description": "Launch and manage durable, detached local process jobs from Codex.",
  "author": {
    "name": "Joel Farthing"
  },
  "keywords": [
    "background-jobs",
    "detached-processes",
    "builds",
    "benchmarks",
    "codex"
  ],
  "homepage": "https://github.com/joelfarthing/codex-process-jobs#readme",
  "repository": "https://github.com/joelfarthing/codex-process-jobs",
  "license": "Apache-2.0",
  "skills": "./skills"
}
```
