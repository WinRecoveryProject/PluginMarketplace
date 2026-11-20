# Skill: publish-findings

- Plugin: `codex-security` (0.1.33)
- Source: `plugins/codex-security/skills/publish-findings/SKILL.md`

> Import findings from scanners, CI reports, vendor CLIs, APIs, or connected tools into the local workbench. Publish a selection of stored vendor findings to Codex Security Cloud.

## Instructions

### Publish external findings

Use this workflow for third-party scanner evidence. For “publish these findings,” start with the local workbench. For “import,” acquire the requested records and store them locally. For “import and publish,” publish the selection returned by the import. Use the “Import external findings” section of `docs/sdk.md` in the installed `@openai/codex-security` package. For a global npm install, its directory is `$(npm root --global)/@openai/codex-security`. Run SDK snippets from that trusted directory with absolute paths to the checkout and reports.

#### Select the evidence

Identify whether the user wants a fresh scan, a previous scan or CI artifact, existing upstream issues, or records already in the workbench. Carry forward the selected repository, project, ref, products, filters, and exact finding IDs. A local scan can produce different findings from a hosted backlog or an earlier build.

For a fresh scan, look for the relevant executable in the environment where it will run. Inspect its help when needed. For an existing hosted selection, inspect the tools actually available in this session or use a signed-in vendor CLI or authorized read API. Verify access with a scoped read or a documented status command. Use the vendor’s credential store or supported environment variables and keep credentials out of command arguments and imported evidence. Reuse a complete previous result from the same scope. Follow pagination, retain native records, and explain missing IDs or incomplete coverage. Ask for a missing account or repository only when the selection cannot be resolved from the available evidence.

| Source | Acquisition guidance |
| --- | --- |
| Trivy | For a fresh filesystem vulnerability scan, run `trivy fs --scanners vuln --format json --output REPORT.json .` from the chosen directory. For an earlier scan, read its repository or filesystem schema-v2 JSON or gzip artifact. Supply the checkout-relative `--trivy-scan-root` for filesystem reports. |
| Semgrep CLI or CI | For a fresh Code scan, use the installed CLI with the selected rules, e.g. `semgrep scan --config RULES --json-output REPORT.json .`. For an existing CI job, use its Code JSON or self-contained SARIF artifact. |
| Semgrep Guardian MCP | Use the connected Guardian tool `get_semgrep_sast_findings` or `get_semgrep_supply_chain_findings` with the deployment, repository, full ref, and selected filters. Match exact string finding IDs. Preserve the original request and selected tool rows in the [Guardian capture](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/semgrep.md#import-selected-guardian-findings). |
| Semgrep hosted AppSec Platform MCP | Use `semgrep_account` and `ProjectsService_GetProject` to verify the project SCM URL. Use `IssuesService_ListIssues` scoped to that project, full ref, and `ISSUE_TYPE_SAST`, and retain the selected string issue IDs and original rows. Follow the [hosted MCP capture format](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/semgrep.md#import-selected-code-findings-from-the-hosted-mcp). Guardian and hosted Platform IDs use distinct namespaces. |
| Semgrep Platform Web API | For a whole project and ref use `codex-security import semgrep PROJECT --deployment DEPLOYMENT --ref REF --format json`. For selected SAST IDs use the original project response and selected findings pages. |
| GitHub | The signed-in GitHub CLI collector `codex-security import github OWNER/REPO` accepts repeated `--github-alert NUMBER` or a `--github-ref REF`. Use `import github-advisories` for advisories. For Dependabot, export full paginated repository REST alert objects through the available GitHub connection. Keep separate source keys for these three families. |
| Snyk | For a monitored Open Source project use `codex-security import snyk PROJECT_ID --org ORG_ID --source-repository-url URL --format json`. Add `--snyk-product code` for a monitored Code project. For a fresh dependency scan use native `snyk test` JSON or the signed-in Snyk plugin's SCA export from the requested root. Keep acquisition formats in distinct namespaces. |
| AWS Continuum | Use `codex-security import continuum ENVIRONMENT_ID --format json` to collect all environment issues, linked findings, and issue-level `EVIDENCE` and `VALIDATION_EVIDENCE` artifacts. The environment must have exactly one Git repository, which the report records. S3 sources may also be present. Override the AWS CLI defaults with `--aws-profile` and `--aws-region` as needed. Verify that the issues belong to the intended repository before importing with `publish findings --provider continuum`. Supply the verified `--source-repository-url` for saved reports without a repository URL. For attack-path scoring, give `$attack-path-analysis` the selected issue's stored `.evidence`, including its validation artifacts. [Continuum guide](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/continuum.md) |
| Checkmarx | Export a completed Checkmarx One scan as CLI JSON or self-managed CxSAST as XML. Follow the [collector instructions](publish-findings.md#file-referencescheckmarx-importmd) for the selected product, scan, and verified owning project. |
| Wiz | Use the connected Wiz tools or API to retrieve the selected repository findings by occurrence ID, or use a detailed report. JSON covers multiple finding families. Detailed CSV covers repository package vulnerabilities. [Wiz input profiles](publish-findings.md#file-referenceswiz-importmd) |
| AWS Continuum patches | Run `codex-security import continuum ENVIRONMENT_ID --finding-id FINDING_ID --source-root CHECKOUT --repository-name AWS_SOURCE_NAME --format json` for one finding. Use an absolute checkout path and the exact AWS source name. Omit `--repository-name` when the environment has exactly one Git repository and no S3 sources. The CLI verifies that with `GetEnvironment` before collecting the finding. Publish the JSON with `--provider continuum` and the verified `--source-repository-url`. [Continuum guide](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/continuum.md#collect-a-finding-with-patches) |
| CrowdStrike FCS | Use a saved FCS CLI 4.x `fcs scan iac` JSON report, such as a CI artifact from the [FCS GitHub Action](https://github.com/CrowdStrike/fcs-action). For a fresh scan, run the installed `fcs` CLI from the directory to import into: `fcs scan iac --path . --report-formats json --output-path DIR`, where `DIR` is an existing private directory outside it whose name has no dot. For a remote `git::` URL, add `?ref=COMMIT` and import into a checkout of that commit, or into its subdirectory for a `//subdir` suffix. A nonzero exit can mean that detections matched `--fail-on` or that the scan failed; import only the `*-scan-results.json` file named in `Results saved to file`. If `fcs` is not on `PATH`, do not install it or pass Falcon credentials in arguments; ask for a saved report. Import with `--to local` only. The directory does not need to be a Git checkout, but each detection's file must have the content that FCS scanned. Add `--source-repository-url` only for a verified URL. A `git::https://` report already names its repository, and a different URL stops the import. [CrowdStrike guide](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/crowdstrike.md) |
| Other built-in readers | OpenGrep accepts native scan JSON including scanner errors. Endor uses `endorctl` Finding JSON with complete records. Inspector uses Inspector2 ListFindings for one Code Security repository. Black Duck uses BOM-6 vulnerable components for one project version. Veracode uses paginated STATIC policy findings for one application. Tenable uses a selected Code Repository inventory capture and verified HTTPS clone URL. [Provider guides and identity rules](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/README.md#choose-your-scanner) |

##### SonarQube Cloud issues

Retrieve existing Sonar issues with the signed-in `sonar` CLI. The Sonar plugin can supply selected issue keys; collect full issue and flow evidence for that same project, branch or pull request. Preview with `codex-security import sonar --sonar-project PROJECT --sonar-branch BRANCH --sonar-issue KEY --dry-run --format json` (repeat `--sonar-issue` for more keys). Use the preview's saved capture for an approved import. For findings already stored in the workbench, select them directly. [Sonar workflow](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/sonar.md#import-and-verify)

#### Import locally

Use the matching native SDK reader or the existing CLI, for example `codex-security publish findings REPORT.json --to local --provider trivy --source-key PROJECT/BRANCH --repository CHECKOUT --trivy-scan-root . --dry-run --format json`. Use a source key stable across repeated imports of this selection. Review the repository, evidence, exclusions and scanner errors. For the requested write, drop `--dry-run` and use `--yes` when approved. Keep the import ID and finding versions from the result. A partial import exits with code 1. Check the saved findings and report the exclusions before retrying.

For an unfamiliar format, inspect actual rows and write a parser in the language appropriate to the source. Pass the findings, read count and exclusions to `prepareNormalizedLocalImport` with the checkout, provider and source key. Give each occurrence a stable source ID, preserve relevant native evidence and repository identity, and account for every selected row with either evidence or a numbered exclusion. Report skipped or missing items. A repeated import can include unchanged findings; the import ID identifies the entire stored selection.

#### Publish to Cloud

Use `listLocalExternalImports({ repository })` to find an import by its timestamp, including imports of unchanged findings. Call `prepareStoredFindingsPublication(selection, { repository: cloudRepository })` with that import ID or the selected finding IDs and versions. Show the account, destination, evidence and exclusions. After the user confirms the preview, call `group.publish(group.reviewId)` for each approved group.

For a private inbox, check the import job status and counts. For repository requests, check verification, unacknowledged records and failures. Keep each approved group’s selection, destination and review ID. On interruption, reprepare the interrupted and unstarted groups, using the saved review IDs. For an earlier client’s pending upload, finish with its original build or verify which findings reached Cloud before preparing another submission. Report completed groups from their receipts. A changed review ID requires a fresh preview. [Cloud receipts and retry behavior](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/schema-guide.md#retry-a-cloud-submission)

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Publish Findings"
  short_description: "Import and publish stored scanner findings"
  default_prompt: "Use $publish-findings to import the selected scanner findings or publish a selection from my local workbench."
policy:
  allow_implicit_invocation: true
```

### File: `references/checkmarx-import.md`

#### Collect and import Checkmarx SAST findings

Use a supplied One CLI JSON or CxSAST XML report directly. For collection, confirm the product, tenant or server, completed scan ID, project, repository URL and ref. Both collectors retrieve the full scan. If the operator wants a subset, ask for an export scoped to that selection.

##### Before launching a vendor tool

- Use a trusted session and a private working and temporary directory outside the source tree, for both local and Cloud imports. Set the working directory **before** starting a process. Use a noninteractive, non-login system shell such as `/bin/sh` with `login: false`.
- If an IDE or build supplies checkout-controlled startup settings, use a known-clean session or a saved export. A trusted host can exclude `LD_*`, `DYLD_*`, `BASH_ENV` and `ENV` before launching a shell or interpreter. Keep existing exclusions and account for restored shell snapshots. Never start a suspect shell to unset variables or source project files. [Codex shell environment policy](https://developers.openai.com/codex/config-advanced/)
- Resolve the installed [collector](publish-findings.md#file-scriptscollect_checkmarxpy) and vendor tools to trusted absolute paths outside the source tree. For `python_path`, use trusted system tools to inspect the executable and resolve symlinks without running it. Use the native Python 3.10+ interpreter with `-I -S`. Ask for native installation paths if given a shim or shell launcher.
- Pass the absolute checkout or unpacked source as `--source-root` before the product. Omit it only when there is no local source tree.

##### Checkmarx One

Use native `cx` 2.3.23+. An explicit `CX_CONFIG_FILE_PATH` selects that trusted profile. Without an explicit profile, the helper uses a complete environment login if present, or `~/.checkmarx/checkmarxcli.yaml`. For an environment login, confirm the destination and keep `CX_APIKEY` or `CX_CLIENT_ID`, `CX_CLIENT_SECRET`, `CX_BASE_URI` and `CX_TENANT` in the operator's environment. A separate OAuth server also uses `CX_BASE_AUTH_URI`. For an older client or a credential-store-only login with no profile file, ask for JSON exported with the operator’s usual setup.

`cx results show` retrieves every engine in a mixed scan and can generate and download an SCA package report. [Checkmarx One results](https://docs.checkmarx.com/en/34965-68640-results.html)

```sh
"$python_path" -I -S "$collector" --source-root "$source_root" one "$scan_id" --cx "$cx_path"
```

##### Self-managed CxSAST

**Verify ownership before fetching.** CxFlow requests XML by scan ID. Confirm the completed ID, exact project and full owning team path from the same **Projects & Scans → All Scans** row on the selected server. Use trusted read-only metadata or ask the operator to confirm those values from that view. For repeated names, check **View Project Scans** under the intended team. Without confirmation, ask for selected XML. Issue-tracker filters do not narrow the raw XML. [All Scans](https://docs.checkmarx.com/en/34965-46419-viewing-results-from-all-scans.html)

Use native Java, a released CxFlow JAR (1.6.37+), and a trusted SAST-only profile with `CxXml` enabled. Keep the profile and everything it loads outside the checkout. Take the server, authentication and any custom `checkmarx.client-id` from that profile. Only append `--use-env-credentials` when the operator confirms the session's `CHECKMARX_USERNAME`, `CHECKMARX_PASSWORD` or `CHECKMARX_CLIENT_SECRET` belong to that server. For custom JVM settings or project names the installed CxFlow cannot resolve, ask for an XML export. [CxFlow credentials](https://github.com/checkmarx-ltd/cx-flow/blob/v1.7.14/docs/Tutorials.md#L382-L390) · [CxXml writer](https://github.com/checkmarx-ltd/cx-flow/blob/v1.7.14/docs/Bug-Trackers-and-Feedback-Channels.md#cxxml)

```sh
"$python_path" -I -S "$collector" --source-root "$source_root" cxsast "$scan_id" \
  --java "$java_path" --jar "$jar_path" --config "$config_path" --team "$cx_team" --project "$cx_project"
```

##### Preview and import

Pass the successful helper's printed path as the quoted file argument to `codex-security publish findings` in the next tool call. Use `--provider checkmarx --to local --repository CHECKOUT`, the verified `--source-repository-url`, a stable product/tenant/project/ref `--source-key`, and `--dry-run --format json`. Review the scope, findings and exclusions. Verify native paths against the checkout before opening source files.

After confirmation, reuse that file and those options for the [local import](publish-findings.md#import-locally). Use its stored selection for [Cloud publication](publish-findings.md#publish-to-cloud) and retries. Remove the helper’s temporary directory after readback unless the operator wants it retained. Keep operator-supplied files. [User guide](https://github.com/openai/codex-security/blob/main/docs/scanner-imports/checkmarx.md)

### File: `references/wiz-import.md`

#### Wiz import reference

##### Finding formats

The importer reads JSON, normalized JSONL, and the repository package-vulnerability CSV profile below, with gzip supported for each format. Direct CSV support covers repository package vulnerabilities (SCA) only. It does not fetch from Wiz or accept other CSV profiles, scan events, workload secrets, cloud configuration, or external network exports. Complete the requested pages; for an explicit subset, preserve the selection and its named collection.

Keep raw source records unchanged in `source_data`. Use the vendor occurrence ID, not a rule, CVE, title, or location. Missing IDs, severity, revisions, and locations must not be invented.

For Cloud preview, approval, upload, and recovery, follow the [Cloud publication workflow](publish-findings.md#publish-to-cloud).

###### Package vulnerabilities

Supported inputs include a vulnerability finding, an array, `data.vulnerabilityFindings.nodes`, a downloaded vulnerability report, and JSONL package records. Keep `id`, `name`, `detailedName`, `vendorSeverity` (or `severity`), and `vulnerableAsset.id`, with available package and source metadata. Use the bare Wiz finding ID for a package occurrence.

For a UI export, use **Vulnerability Findings → Save as → Report**, retaining repository and finding filters. Select **Repository Branch**, **JSON** or comma-separated **CSV**, and **Detailed** columns. Pass supported CSV reports directly to the command. Download the completed report; gzip is supported regardless of the filename extension. **Raw Event** on Code & Build Scans contains scan metadata, not findings. Do not create scheduled reports, notifications, or external storage unless requested.

The CSV profile requires `ID`, `Name`, `DetailedName`, `AssetID`, `WizURL`, `CloudPlatform`, and `CloudProviderURL`. `CloudPlatform` must identify GitHub, and `CloudProviderURL` must be a repository-branch URL. Its repository must match the selected Cloud repository or, for local import, a Git remote when parseable remotes are available. The importer uses the reported `ID` as occurrence identity and retains every original cell, including unknown columns, in `source_data.row`. It does not derive a branch or revision from the tree URL. Review excluded rows in the preview before importing.

###### SAST, repository secrets, and IaC

Retain the named collection; bare arrays cannot identify these finding families.

| Family             | Collection                   | Occurrence ID |
| ------------------ | ---------------------------- | ------------- |
| SAST               | `data.sastFindings.nodes`    | `sast:<id>`   |
| Repository secrets | `data.secretInstances.nodes` | `secret:<id>` |
| IaC                | `data.iacFindings.nodes`     | `iac:<id>`    |

Supply a verified `repository.url` in the source repository metadata or matching `repository.id` and `repository.url` in `data.versionControlResources.nodes`. For secrets, the repository is `resource.typedProperties.repository` and the resource type must be `REPOSITORY_BRANCH`. Keep inventory `platform`: explicit `GITHUB` enables case-insensitive matching on custom GitHub Enterprise hosts.

Resolve conflicting platform or URL metadata for a repository ID before publishing. Names, inventory node IDs, `providerID`, and Wiz UUIDs are not Cloud repository IDs. The importer checks source URLs against the selected destination; fix missing or conflicting mappings before upload.

###### Normalized JSONL and CSV conversion

Normalized JSONL has one record per line with `source_finding_id` and `evidence` containing `title`, `severity`, and the original record in `source_data`. For SAST, secrets, and IaC, also set `evidence.details.kind` to `sast`, `secret`, or `iac` and set the verified `evidence.details.repository.url`. Use the same prefixed occurrence IDs as raw API imports.

SAST, repository-secret, and IaC CSV reports require a reviewed mapping of their actual headers into that profile. Preserve these family-specific details when present:

| Family             | Evidence to retain                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| SAST               | Rule/CWE, source range and snippet, scanner origin and verdict, remediation instructions                                           |
| Repository secrets | Source path and line, detector rule, type and confidence, vendor validation status, encryption/management flags, introduced commit |
| IaC                | Rule IDs/name, source range and matched content, platform, expected/actual content, file link, remediation instructions            |

Select source paths and line numbers explicitly for secret reports; the standard metadata query lacks them. Preserve empty IaC comparison strings. Vendor status, AI verdicts, and secret validation remain vendor evidence, not Codex assessments. An introduced commit is not a scanned revision, and a logical IaC resource does not prove runtime deployment.

### File: `scripts/collect_checkmarx.py`

```python
"""Collect a selected existing scan using the user's installed Checkmarx tools."""

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import zipfile
from contextlib import suppress
from email.parser import BytesHeaderParser
from pathlib import Path
from xml.parsers import expat

# Isolated Python does not put the installed script directory on sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from collector_paths import in_source, source_root  # noqa: E402

def installed_file(value: str, source: Path | None) -> Path:
    path = Path(value)
    if path.is_absolute() and in_source(path, source):
        raise ValueError("use an installed file outside the source checkout")
    if not path.is_absolute() or not path.is_file():
        raise ValueError("expected an absolute path to an existing file")
    # Invoke the selected name for native multicall binaries.
    return path.parent.resolve() / path.name

def installed_launcher(value: str, source: Path | None) -> Path:
    path = installed_file(value, source)
    if sys.platform == "win32" and (
        path.suffix.lower() not in {".exe", ".com"}
        or path.resolve().suffix.lower() in {".bat", ".cmd"}
    ):
        raise ValueError("use a native Windows executable (.exe or .com)")
    with path.open("rb") as image:
        magic = image.read(4)
        if sys.platform == "win32":
            # The DOS header points to the PE signature.
            image.seek(0x3C)
            pe_offset = int.from_bytes(image.read(4), "little")
            image.seek(pe_offset)
            native = magic.startswith(b"MZ") and image.read(4) == b"PE\0\0"
        elif sys.platform == "darwin":
            # 32/64-bit thin and universal Mach-O, in either byte order.
            native = any(
                int.from_bytes(magic, order) in {0xFEEDFACE, 0xFEEDFACF, 0xCAFEBABE, 0xCAFEBABF}
                for order in ("big", "little")
            )
        else:
            native = magic == b"\x7fELF"
    if not native:
        raise ValueError("use the installed native executable for cx or java")
    return path

def check_cxflow_version(jar: Path) -> None:
    # Earlier CxFlow versions accept --scanId but silently retrieve the latest scan.
    advice = "Use a released CxFlow 1.6.37 or later, or supply a scoped CxSAST XML export."
    try:
        with zipfile.ZipFile(jar) as archive:
            manifest = BytesHeaderParser().parsebytes(archive.read("META-INF/MANIFEST.MF"))
            metadata = archive.read("META-INF/build-info.properties").decode("utf-8")
    except (KeyError, UnicodeDecodeError, zipfile.BadZipFile) as error:
        raise ValueError(
            f"Could not read the CxFlow release metadata: {error}. {advice}"
        ) from error
    properties = dict(line.split("=", 1) for line in metadata.splitlines() if "=" in line)
    if (
        manifest.get("Start-Class") != "com.checkmarx.flow.CxFlowApplication"
        or properties.get("build.group") != "com.checkmarx"
    ):
        raise ValueError(f"The selected JAR does not identify itself as CxFlow. {advice}")
    version = properties.get("build.version", "")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version) or tuple(
        map(int, version.split("."))
    ) < (1, 6, 37):
        raise ValueError(f"Unsupported CxFlow version {version or '(unknown)'}. {advice}")

def private_environment(work: str, inherit: tuple[str, ...]) -> dict[str, str]:
    env = {name: os.environ[name] for name in inherit if name in os.environ}
    return env | dict.fromkeys(("TEMP", "TMP", "TMPDIR"), work)

def cxsast_environment(work: str, use_env_credentials: bool = False) -> dict[str, str]:
    # CxFlow uses the chosen profile for its server and Spring configuration.
    credentials = ("CHECKMARX_USERNAME", "CHECKMARX_PASSWORD", "CHECKMARX_CLIENT_SECRET")
    env = private_environment(work, credentials if use_env_credentials else ())
    if os.name == "nt":
        env["SystemRoot"] = os.environ["SystemRoot"]
    else:
        # The Java launcher decodes native arguments before applying file.encoding.
        env["LC_CTYPE"] = "UTF-8" if sys.platform == "darwin" else "C.UTF-8"
    return env

def one_environment(source: Path | None, work: str) -> dict[str, str]:
    # An inherited endpoint or proxy must never receive credentials from a saved profile.
    account = ("HOME", "USER", "LOGNAME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "SystemRoot")
    env = private_environment(work, (*account, "LANG", "LC_ALL", "LC_CTYPE"))
    configured = os.environ.get("CX_CONFIG_FILE_PATH")
    oauth = ("CX_CLIENT_ID", "CX_CLIENT_SECRET", "CX_BASE_URI", "CX_TENANT")
    api_key = os.environ.get("CX_APIKEY")
    if not configured and (api_key or all(os.environ.get(k) for k in oauth)):
        # A separate config path also separates the vendor's path-keyed credential store.
        profile = Path(work, "env-auth.yaml")
        profile.write_text("{}\n", encoding="utf-8")
        env["CX_CONFIG_FILE_PATH"] = str(profile)
        env["CX_KEYRING_MODE"] = "disabled"
        credentials = ("CX_APIKEY",) if api_key else (*oauth, "CX_BASE_AUTH_URI")
        env.update((name, os.environ[name]) for name in credentials if os.environ.get(name))
        return env

    profile = Path(configured) if configured else Path.home() / ".checkmarx" / "checkmarxcli.yaml"
    if not profile.is_absolute() or in_source(profile, source):
        raise ValueError(
            "Set CX_CONFIG_FILE_PATH to a trusted absolute path outside the source checkout. "
            "The collector runs Checkmarx One from a private directory."
        )
    env["CX_CONFIG_FILE_PATH"] = configured or str(profile)
    if "CX_KEYRING_MODE" in os.environ:
        env["CX_KEYRING_MODE"] = os.environ["CX_KEYRING_MODE"]
    return env

def verify_one(report: Path, scan_id: str) -> None:
    with report.open(encoding="utf-8-sig") as stream:
        data = json.load(stream)
    reported = data.get("scanID") if isinstance(data, dict) else None
    if (
        not isinstance(reported, str)
        or not reported.isascii()
        or reported.lower() != scan_id.lower()
    ):
        raise ValueError("The Checkmarx One report does not match the requested scan ID.")

def team_path(value: str) -> str:
    path = value.replace("\\", "/").strip("/")
    return "".join(char.lower() if char.isascii() else char for char in path)

def verify_cxsast(report: Path, scan_id: str, project: str, team: str) -> None:
    parser = expat.ParserCreate()

    def check_root(name, attributes):
        if name != "CxXMLResults" or not attributes.get("ProjectId"):
            raise ValueError("Expected a CxSAST XML scan report.")
        if attributes.get("ScanId") != scan_id or attributes.get("ProjectName") != project:
            raise ValueError("The CxSAST report does not match the requested scan and project.")
        actual_team = attributes.get("TeamFullPathOnReportDate")
        if not actual_team or team_path(actual_team) != team_path(team):
            raise ValueError("The CxSAST report does not match the requested team.")
        parser.StartElementHandler = None

    parser.StartElementHandler = check_root
    with report.open("rb") as stream:
        parser.ParseFile(stream)

def capture_directory(temp: Path) -> Path:
    if os.name != "nt":
        return Path(tempfile.mkdtemp(prefix="checkmarx-report-", dir=temp)).resolve()

    import ctypes.wintypes
    import secrets

    class SecurityAttributes(ctypes.Structure):
        _fields_ = [
            ("length", ctypes.wintypes.DWORD),
            ("descriptor", ctypes.wintypes.LPVOID),
            ("inherit", ctypes.wintypes.BOOL),
        ]

    # Older Windows Python releases ignore mkdir's 0700 mode. Apply CPython's
    # protected, inheritable SYSTEM/Administrators/owner DACL at creation.
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    temp = temp.resolve()
    volume = ctypes.create_unicode_buffer(32768)
    flags = ctypes.wintypes.DWORD()
    if not kernel.GetVolumePathNameW(str(temp), volume, len(volume)):
        raise ctypes.WinError(ctypes.get_last_error())
    if not kernel.GetVolumeInformationW(volume, None, 0, None, None, ctypes.byref(flags), None, 0):
        raise ctypes.WinError(ctypes.get_last_error())
    if not flags.value & 0x8:  # FILE_PERSISTENT_ACLS
        raise ValueError("Select a temporary directory on a Windows volume that supports ACLs.")

    security = ctypes.WinDLL("advapi32", use_last_error=True)
    descriptor = ctypes.wintypes.LPVOID()
    dacl = "D:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;OW)"
    if not security.ConvertStringSecurityDescriptorToSecurityDescriptorW(
        dacl, 1, ctypes.byref(descriptor), None
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        path = temp / f"checkmarx-report-{secrets.token_hex(16)}"
        attributes = SecurityAttributes(ctypes.sizeof(SecurityAttributes), descriptor, False)
        if not kernel.CreateDirectoryW(str(path), ctypes.byref(attributes)):
            raise ctypes.WinError(ctypes.get_last_error())
        return path
    finally:
        kernel.LocalFree(descriptor)

def create_capture(source: Path | None) -> Path:
    # gettempdir() probes candidates by writing a file. Check each candidate before
    # trying to create the actual capture directory in Python's platform order.
    cached = tempfile.tempdir
    candidates = [cached] if cached is not None else tempfile._candidate_tempdir_list()
    last_error = None
    for candidate in candidates:
        temp = Path(os.fsdecode(candidate)).absolute()
        if in_source(temp, source):
            raise ValueError(
                "Select a temporary directory outside the source checkout (TMPDIR or TEMP)."
            )
        try:
            return capture_directory(temp)
        except OSError as error:
            if cached is not None:
                raise
            last_error = error
    raise FileNotFoundError(
        f"No usable temporary directory outside the source checkout: {last_error}"
    )

def export_report(args: argparse.Namespace, source: Path | None, work: str, run_vendor) -> Path:
    def fetch(report, env, *command):
        # Only the validated report path goes to stdout; vendor diagnostics go to stderr.
        status = run_vendor(command, cwd=work, env=env, stdin=subprocess.DEVNULL, stdout=sys.stderr)
        if status:
            raise ValueError(f"The Checkmarx tool exited with status {status}.")
        if report.is_symlink() or not report.is_file():
            raise ValueError("The Checkmarx tool did not produce the requested report.")

    if args.product == "one":
        env = one_environment(source, work)
        report = Path(work, "cx_result.json")
        fetch(
            report,
            env,
            str(args.cx),
            "results",
            "show",
            # Older clients reject this flag instead of authenticating with another profile.
            "--config-file-path",
            env["CX_CONFIG_FILE_PATH"],
            "--scan-id",
            args.scan_id,
            "--report-format",
            "json",
            "--output-path",
            work,
            "--output-name",
            report.stem,
        )
        verify_one(report, args.scan_id)
        return report

    team = args.team.rstrip("/\\")
    report = Path(work, "checkmarx-results.xml")
    fetch(
        report,
        cxsast_environment(work, args.use_env_credentials),
        str(args.java),
        f"-Djava.io.tmpdir={work}",
        f"-DLOG_PATH={work}",
        "-Dfile.encoding=UTF-8",
        "-jar",
        str(args.jar),
        f"--spring.config.location={args.config.as_uri()}",
        "--logging.config=classpath:logback-spring.xml",
        f"--logging.file.path={work}",
        f"--logging.file.name={Path(work, 'cx-flow.log')}",
        f"--logging.logback.rollingpolicy.file-name-pattern={Path(work, 'cx-flow.%d{yyyy-MM-dd}.%i.gz')}",
        "--project",
        f"--scanId={args.scan_id}",
        f"--cx-team={team}",
        f"--cx-project={args.project}",
        f"--app={args.project}",
        "--bug-tracker=CxXml",
        "--cx-flow.bug-tracker-impl=CxXml",
        "--cx-flow.enabled-vulnerability-scanners=sast",
        "--cx-flow.preserve-project-name=true",
        "--cx-flow.mail.notification=false",
        "--cx-flow.filter-script=",
        "--disable-break-build",
        "--checkmarx.cx-branch=false",
        "--checkmarx.preserve-xml=true",
        f"--cx-xml.data-folder={work}",
        f"--cx-xml.file-name-format={report.name}",
    )
    verify_cxsast(report, str(args.scan_id), args.project, args.team)
    return report

def collect(args: argparse.Namespace, source: Path | None, run_vendor) -> None:
    output = create_capture(source)
    try:
        with tempfile.TemporaryDirectory(dir=output) as work:
            report = export_report(args, source, work, run_vendor)
            report.chmod(0o600)
            saved = report.replace(output / report.name)
        sys.stdout.buffer.write(f"{saved}\n".encode("utf-8"))
        sys.stdout.buffer.flush()
    except BaseException:
        shutil.rmtree(output)
        raise

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, help="absolute source directory to protect")
    products = parser.add_subparsers(dest="product", required=True)
    one = products.add_parser("one", help="export an existing Checkmarx One scan")
    one.add_argument("scan_id")
    one.add_argument("--cx", required=True)
    cxsast = products.add_parser("cxsast", help="retrieve an existing CxSAST scan with CxFlow")
    cxsast.add_argument("scan_id", type=int)
    cxsast.add_argument("--java", required=True)
    cxsast.add_argument("--jar", required=True)
    cxsast.add_argument("--config", required=True)
    cxsast.add_argument("--team", required=True)
    cxsast.add_argument("--project", required=True)
    cxsast.add_argument(
        "--use-env-credentials",
        action="store_true",
        help="use the Checkmarx credentials selected for this profile's server",
    )
    args = parser.parse_args()
    if args.product == "one":
        if not re.fullmatch(
            r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", args.scan_id, re.I | re.ASCII
        ):
            parser.error("Select a Checkmarx One scan UUID in hyphenated form.")
    else:
        if args.scan_id <= 0:
            parser.error("Select an existing positive CxSAST scan ID.")
        if not re.search(r"[^\s/\\]", args.team) or not args.project.strip():
            parser.error("Select a nonblank CxSAST team path and project.")

    pending_signal = None
    defer_termination = False

    def terminate(signum, _frame):
        nonlocal pending_signal
        if pending_signal is None:
            pending_signal = signum
            if not defer_termination:
                raise SystemExit(128 + signum)

    def run_vendor(command, **kwargs):
        nonlocal defer_termination
        child = None
        # Popen can have spawned the child before it returns the handle needed for cleanup.
        defer_termination = True
        try:
            child = subprocess.Popen(command, start_new_session=os.name == "posix", **kwargs)
            defer_termination = False
            if pending_signal is not None:
                raise SystemExit(128 + pending_signal)
            return child.wait()
        except BaseException:
            defer_termination = True
            if child is not None:
                if os.name == "posix":
                    # Kill any surviving credential helper if the process group still exists.
                    with suppress(ProcessLookupError):
                        os.killpg(child.pid, signal.SIGKILL)
                else:
                    child.kill()
                child.wait()
            raise
        finally:
            defer_termination = False

    signals = [signal.SIGTERM]
    if signal.getsignal(signal.SIGINT) != signal.SIG_IGN:
        signals.append(signal.SIGINT)
    if os.name == "posix" and signal.getsignal(signal.SIGHUP) != signal.SIG_IGN:
        signals.append(signal.SIGHUP)
    previous = {number: signal.signal(number, terminate) for number in signals}
    try:
        source = source_root(args.source_root)
        if args.product == "one":
            args.cx = installed_launcher(args.cx, source)
        else:
            args.java = installed_launcher(args.java, source)
            args.jar = installed_file(args.jar, source)
            args.config = installed_file(args.config, source)
            check_cxflow_version(args.jar)
        collect(args, source, run_vendor)
    except (ValueError, OSError, expat.ExpatError) as error:
        print(error, file=sys.stderr)
        return 1
    finally:
        for number, handler in previous.items():
            signal.signal(number, handler)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

### File: `scripts/collector_paths.py`

```python
"""Identify the selected source checkout and paths it controls."""

import os
import stat
from pathlib import Path

def is_link(info: os.stat_result) -> bool:
    return stat.S_ISLNK(info.st_mode) or (
        os.name == "nt" and info.st_reparse_tag == stat.IO_REPARSE_TAG_MOUNT_POINT
    )

def source_root(target: Path | None) -> Path | None:
    if target is not None and (not target.is_absolute() or not target.is_dir()):
        raise ValueError("Select an existing absolute source directory.")
    source = (target or Path.cwd()).resolve()
    # A nested checkout or submodule is still part of the enclosing source tree.
    for parent in (*reversed(source.parents), source):
        marker = parent / ".git"
        try:
            info = marker.lstat()
            if stat.S_ISDIR(info.st_mode) and not is_link(info):
                info = (marker / "HEAD").lstat()
        except (FileNotFoundError, NotADirectoryError):
            continue
        if stat.S_ISREG(info.st_mode) or is_link(info):
            return parent
    return source if target is not None else None

def in_source(path: Path, source: Path | None) -> bool:
    if source is None:
        return False
    if path.is_relative_to(source):
        return True
    identity = source.stat()
    current = Path()
    parts = list(reversed(path.absolute().parts))
    active_links = set()
    while parts:
        part = parts.pop()
        if isinstance(part, Path):
            # The link target's components have all been checked.
            active_links.remove(part)
            continue
        current = current.parent if part == ".." else current / part
        if current == source:
            return True
        try:
            info = current.lstat()
        except (FileNotFoundError, NotADirectoryError):
            continue
        if os.path.samestat(info, identity):
            return True
        if is_link(info):
            if current in active_links:
                raise OSError(f"Symbolic link loop at {current}")
            active_links.add(current)
            parts.append(current)
            parts.extend(reversed(current.readlink().parts))
            current = current.parent
    return False
```
