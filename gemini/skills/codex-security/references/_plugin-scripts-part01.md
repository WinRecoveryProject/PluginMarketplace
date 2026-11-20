# Plugin files: codex-security — `scripts/` (part 1 of 3)

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/check_deep_scan_target.py`

```python
"""Reject registered Deep Scan targets containing only empty directories."""

from __future__ import annotations

import errno
import json
import os
import stat
import sys
from pathlib import Path

def check_selected_targets(root: Path, selections: list[str], file_paths: list[str]) -> None:
    files = set(file_paths)

    def check_path(selection: str) -> tuple[Path, bool]:
        relative = Path(selection)
        if (
            not selection
            or relative.anchor
            or ".." in relative.parts
            or (os.name == "nt" and ":" in selection)
        ):
            raise ValueError(f"Scope must be inside repo: {selection}")
        mode = root.lstat().st_mode
        if not stat.S_ISDIR(mode):
            raise ValueError(f"Deep Scan repository is no longer a directory: {root}")
        target = root
        for part in relative.parts:
            target /= part
            info = target.lstat()
            mode = info.st_mode
            if stat.S_ISLNK(mode) or getattr(info, "st_reparse_tag", 0) & 0x20000000:
                raise ValueError(f"Requested scope must not contain symbolic links: {target}")
        if not target.resolve(strict=True).is_relative_to(root):
            raise ValueError(f"Scope must be inside repo: {target}")
        regular = stat.S_ISREG(mode)
        if selection in files and not regular:
            raise ValueError(f"Selected file is no longer a regular file: {selection}")
        if not regular and not stat.S_ISDIR(mode):
            raise OSError(errno.ENOTDIR, "Expected a regular file or directory", str(target))
        return target, regular

    # Every selection must be valid, even when another file or directory is usable.
    for selection in selections:
        check_path(selection)

    def has_content(selection: str) -> bool:
        pending = [selection]
        failure = None
        while pending:
            current = pending.pop()
            try:
                target, regular = check_path(current)
                if regular:
                    return True
                with os.scandir(target) as entries:
                    for entry in entries:
                        if not entry.is_dir(follow_symlinks=False):
                            return True
                        # Preserve link entries as content without traversing their targets.
                        if (
                            getattr(entry.stat(follow_symlinks=False), "st_reparse_tag", 0)
                            & 0x20000000
                        ):
                            return True
                        pending.append(str(Path(entry.path).relative_to(root)))
            except OSError as exc:
                if failure is None:
                    failure = exc
        if failure is not None:
            raise failure
        return False

    failure = None
    for selection in selections:
        try:
            if has_content(selection):
                return
        except OSError as exc:
            if selection in files:
                raise
            if failure is None:
                failure = exc
    if failure is not None:
        raise failure
    raise ValueError("Deep Scan target is empty; no security audit was performed.")

if __name__ == "__main__":
    request = json.load(sys.stdin)
    try:
        check_selected_targets(
            Path(request["targetPath"]), request["includePaths"], request["filePaths"]
        )
    except (OSError, ValueError) as exc:
        sys.exit(str(exc))
```

## File: `scripts/codex_profile.mjs`

```javascript
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

// Native startup needs provider identity and auth selection, while exec reads
// the full provider configuration from its private profile file.
export function preflightProviderDefinitions(providers) {
  return Object.fromEntries(
    Object.entries(providers)
      .filter(([, provider]) => provider != null)
      .map(([id, provider]) => [
        id,
        Object.fromEntries(
          ["name", "wire_api", "requires_openai_auth"]
            .filter((key) => Object.hasOwn(provider, key))
            .map((key) => [key, provider[key]]),
        ),
      ]),
  );
}

export function isPermissionProfileFallbackWarning(message, profileId) {
  if (typeof message !== "string") return false;
  const prefix =
    "Configured value for `permission_profile` is disallowed by requirements; " +
    `falling back from \`${profileId}\` to required value \``;
  const warning = message.trim();
  return warning.startsWith(prefix) && warning.endsWith("`.");
}

export function profileConfigOverrides(config) {
  return Object.entries(config)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${toml(value)}`);
}

// Native profile files keep provider configuration off process arguments while
// retaining the existing CODEX_HOME credential store.
export function createCodexProfileClient(options) {
  return {
    startThread: (threadOptions = {}) =>
      new ProfileThread(options, threadOptions),
    resumeThread: (id, threadOptions = {}) =>
      new ProfileThread(options, threadOptions, id),
  };
}

class ProfileThread {
  constructor(options, threadOptions, id = null) {
    this.options = options;
    this.threadOptions = threadOptions;
    this.id = id;
  }

  async runStreamed(input, turnOptions = {}) {
    return { events: this.events(input, turnOptions) };
  }

  async run(input, turnOptions = {}) {
    const items = [];
    let finalResponse = "";
    let usage = null;
    for await (const event of this.events(input, turnOptions)) {
      if (event.type === "item.completed") {
        items.push(event.item);
        if (event.item.type === "agent_message")
          finalResponse = event.item.text;
      } else if (event.type === "turn.completed") {
        usage = event.usage;
      } else if (event.type === "turn.failed") {
        throw new Error(event.error.message);
      }
    }
    return { items, finalResponse, usage };
  }

  async *events(input, turnOptions) {
    let schemaDirectory;
    try {
      let schemaPath;
      if (turnOptions.outputSchema !== undefined) {
        const schema = turnOptions.outputSchema;
        if (
          schema === null ||
          typeof schema !== "object" ||
          Array.isArray(schema)
        ) {
          throw new Error("outputSchema must be a plain JSON object");
        }
        schemaDirectory = await mkdtemp(join(tmpdir(), "codex-output-schema-"));
        schemaPath = join(schemaDirectory, "schema.json");
        await writeFile(schemaPath, JSON.stringify(schema), "utf8");
      }
      const args = nativeArguments(
        this.options,
        this.threadOptions,
        this.id,
        turnOptions,
        schemaPath,
      );
      for await (const line of execute(
        this.options,
        args,
        input,
        turnOptions.signal,
      )) {
        let event;
        try {
          event = JSON.parse(line);
        } catch (cause) {
          throw new Error(`Failed to parse item: ${line}`, { cause });
        }
        const item = event.type === "item.completed" ? event.item : event;
        if (
          this.options.requestedPermissionProfile !== undefined &&
          item.type === "error" &&
          isPermissionProfileFallbackWarning(
            item.message,
            this.options.requestedPermissionProfile,
          )
        ) {
          throw new Error(
            "Read-only Codex helper stopped because organization policy changed its permission profile. Its results were discarded.\n" +
              item.message,
          );
        }
        if (event.type === "thread.started") this.id = event.thread_id;
        if (event.type === "turn.completed" && event.usage != null) {
          if (
            event.usage.cache_write_input_tokens == null &&
            event.usage.cache_write_tokens == null
          )
            event.usage.cache_write_input_tokens_reported = false;
          event.usage.cache_write_input_tokens ??= 0;
        }
        yield event;
      }
    } finally {
      if (schemaDirectory) {
        await rm(schemaDirectory, { recursive: true, force: true }).catch(
          () => {},
        );
      }
    }
  }
}

function nativeArguments(options, thread, id, turn, schemaPath) {
  const args = [
    "exec",
    "--experimental-json",
    "--profile",
    options.profileName,
  ];
  const config = (key, value) => args.push("--config", `${key}=${toml(value)}`);
  for (const override of profileConfigOverrides(options.config ?? {}))
    args.push("--config", override);
  for (const override of options.configOverrides ?? [])
    args.push("--config", override);
  if (options.baseUrl) config("openai_base_url", options.baseUrl);
  if (thread.model) args.push("--model", thread.model);
  if (thread.threadSource !== undefined && !id)
    args.push("--thread-source", thread.threadSource);
  if (thread.sandboxMode) args.push("--sandbox", thread.sandboxMode);
  if (thread.workingDirectory) args.push("--cd", thread.workingDirectory);
  for (const directory of thread.additionalDirectories ?? [])
    args.push("--add-dir", directory);
  if (thread.skipGitRepoCheck) args.push("--skip-git-repo-check");
  if (schemaPath) args.push("--output-schema", schemaPath);
  if (turn.cyberAccessProgram !== undefined)
    args.push("--cyber-access-program", turn.cyberAccessProgram);
  if (thread.modelReasoningEffort)
    config("model_reasoning_effort", thread.modelReasoningEffort);
  if (thread.networkAccessEnabled !== undefined)
    config(
      "sandbox_workspace_write.network_access",
      thread.networkAccessEnabled,
    );
  if (thread.webSearchMode) config("web_search", thread.webSearchMode);
  else if (thread.webSearchEnabled !== undefined)
    config("web_search", thread.webSearchEnabled ? "live" : "disabled");
  if (thread.approvalPolicy) config("approval_policy", thread.approvalPolicy);
  if (id) args.push("resume", id);
  return args;
}

function toml(value) {
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value).replace(/\u007f/g, "\\u007f");
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(toml).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, child]) => child != null)
      .map(
        ([key, child]) =>
          `${/^[A-Za-z0-9_-]+$/.test(key) ? key : toml(key)} = ${toml(child)}`,
      )
      .join(", ")}}`;
  }
  throw new Error("Codex config overrides must contain finite TOML values");
}

async function* execute(options, args, input, signal) {
  const env = { ...(options.env ?? process.env) };
  env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE ||= "codex_sdk_ts";
  if (options.apiKey) env.CODEX_API_KEY = options.apiKey;
  const child = spawn(options.codexPathOverride, args, {
    env,
    signal,
    windowsHide: true,
  });
  let processError;
  let inputError;
  child.on("error", (error) => {
    processError = error;
  });
  child.stdin.on("error", (error) => {
    inputError = error;
  });
  const closed = new Promise((resolve) => {
    child.once("close", (code, exitSignal) => resolve({ code, exitSignal }));
  });
  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  child.stdin.end(input);
  try {
    for await (const line of lines) yield line;
    const { code, exitSignal } = await closed;
    if (processError) throw processError;
    if (code !== 0 || exitSignal) {
      const detail = exitSignal ? `signal ${exitSignal}` : `code ${code ?? 1}`;
      throw new Error(
        `Codex Exec exited with ${detail}: ${Buffer.concat(stderr).toString("utf8")}`,
      );
    }
    if (inputError) throw inputError;
  } finally {
    lines.close();
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}
```

## File: `scripts/codex_session.mjs`

```javascript
/** Reduce a single stream; callers retain error, retry and acceptance policy. */
export async function readCodexSessionTurn(options) {
  let threadId = options.thread.id;
  let status = "in_progress";
  let finalResponse = "";
  let usage = null;
  let lastStreamError = null;
  for await (const event of eventsWithOptionalUsage(options.events)) {
    await options.onEvent(event);
    if (
      event.type === "thread.started" &&
      typeof event["thread_id"] === "string"
    ) {
      threadId = event["thread_id"];
    } else if (
      event.type === "item.completed" &&
      isRecord(event["item"]) &&
      event["item"]["type"] === "agent_message" &&
      typeof event["item"]["text"] === "string"
    ) {
      finalResponse = event["item"]["text"];
    } else if (event.type === "turn.completed") {
      status = "completed";
      usage = event["usage"] ?? null;
      if (options.stopOnCompletion) break;
    } else if (event.type === "error" && typeof event["message"] === "string") {
      lastStreamError = event["message"];
    }
  }
  return { threadId, status, finalResponse, usage, lastStreamError };
}

async function* eventsWithOptionalUsage(events) {
  try {
    yield* events;
  } catch (error) {
    // The pinned SDK accesses this field before yielding a completion with
    // absent usage. Preserve completion without inventing a zero-token receipt.
    if (
      error instanceof TypeError &&
      /\b(?:null|undefined)\b/u.test(error.message) &&
      /\bcache_write_input_tokens\b/u.test(error.message)
    ) {
      yield { type: "turn.completed", usage: null };
      return;
    }
    throw error;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}
```

## File: `scripts/deep_scan_config.py`

```python
"""Resolve per-user Codex Security Deep Scan orchestration settings."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from workbench.runtime_toml import tomllib

DEFAULTS = json.loads(
    Path(__file__).with_name("deep_scan_defaults.json").read_text(encoding="utf-8")
)
DEFAULT_WORKERS = DEFAULTS["workers"]
DEFAULT_SUBAGENTS = DEFAULTS["subagents"]
DEFAULT_STOP_AFTER_NO_NEW = DEFAULTS["stopAfterNoNew"]
DEFAULT_STOP_AFTER_CONSECUTIVE_ERRORS = DEFAULTS["stopAfterConsecutiveErrors"]
DEFAULT_MAX_DISCOVERY_RUNS = DEFAULTS["maxDiscoveryRuns"]
DEFAULT_MAX_TIME_HOURS = DEFAULTS["maxTimeHours"]
MAX_TIME_HOURS = 96
CONFIG_FIELDS = {
    "workers": "workers",
    "subagents": "subagents",
    "stopAfterNoNew": "stop_after_no_new",
    "stopAfterConsecutiveErrors": "stop_after_consecutive_errors",
    "maxDiscoveryRuns": "max_discovery_runs",
    "maxTimeHours": "max_time_hours",
}
CONFIG_KEYS = set(CONFIG_FIELDS.values())

def codex_home() -> Path:
    """Expand CODEX_HOME, falling back to ~/.codex when the setting is empty or whitespace."""
    return Path(
        os.environ["CODEX_HOME"] if os.environ.get("CODEX_HOME", "").strip() else "~/.codex"
    ).expanduser()

def config_path() -> Path:
    """Return the configured TOML path or the per-user config.toml under the Codex home."""
    configured = os.environ.get("CODEX_SECURITY_DEEP_SCAN_CONFIG_PATH", "").strip()
    if configured:
        return Path(configured).expanduser()
    return codex_home() / "codex-security" / "config.toml"

def resolve_deep_scan_config(available_parallelism: int) -> dict[str, int | float]:
    """Return the numeric deep scan settings for a launch with no project overrides."""
    return resolve_deep_scan_setup(available_parallelism)["settings"]

def resolve_deep_scan_setup(
    available_parallelism: int = 1, project_json: str | None = None
) -> dict[str, Any]:
    """Resolve project overrides, per-user TOML settings, and bundled defaults in that order.

    Args:
        available_parallelism (int): Legacy caller argument. Any positive value selects the same settings.
        project_json (str | None): Serialized project configuration with path and settings keys.

    Returns:
        dict: Numeric settings and a source label for each, plus the paths of the
            supplied project configuration and any existing per-user configuration.

    Raises:
        SystemExit: A selected setting is invalid or a required TOML file cannot be read.
        json.JSONDecodeError: The supplied project JSON cannot be parsed.
    """
    project = json.loads(project_json) if project_json is not None else None
    overrides = project["settings"] if project is not None else {}
    unknown = sorted(set(overrides) - set(CONFIG_FIELDS))
    if unknown:
        raise SystemExit(f"Unknown Deep Scan project settings: {', '.join(unknown)}.")
    if isinstance(available_parallelism, bool) or available_parallelism < 1:
        raise SystemExit("Available parallelism must be a positive integer.")
    path = config_path()
    configured: dict[str, Any] = {}
    exists = path.exists()
    if exists and not all(name in overrides for name in CONFIG_FIELDS):
        try:
            with path.open("rb") as source:
                document: object = tomllib.load(source)
        except (OSError, tomllib.TOMLDecodeError) as exc:
            raise SystemExit(f"Cannot read Codex Security configuration at {path}: {exc}") from exc
        if not isinstance(document, dict):
            raise SystemExit(f"Codex Security configuration at {path} must be a TOML table.")
        deep_scan: object = document.get("deep_scan", {})
        if not isinstance(deep_scan, dict):
            raise SystemExit(
                f"Codex Security configuration [deep_scan] at {path} must be a TOML table."
            )
        unknown = sorted(set(deep_scan) - CONFIG_KEYS)
        if unknown:
            raise SystemExit(
                f"Unknown Codex Security Deep Scan configuration {', '.join(unknown)} in {path}."
            )
        configured = deep_scan

    settings: dict[str, int | float] = {}
    sources: dict[str, str] = {}
    for name, key in CONFIG_FIELDS.items():
        value = overrides.get(name, configured.get(key, DEFAULTS[name]))
        sources[name] = (
            "project" if name in overrides else "legacy" if key in configured else "default"
        )
        if name == "workers" and value == "auto":
            value = DEFAULT_WORKERS
        settings[name] = (
            require_positive_number(value, "deep_scan.max_time_hours")
            if name == "maxTimeHours"
            else require_integer(value, f"deep_scan.{key}", minimum=0 if name == "subagents" else 1)
        )
    return {
        "settings": settings,
        "sources": sources,
        **({"legacyConfigPath": str(path)} if exists else {}),
        **({"projectConfigPath": project["path"]} if project is not None else {}),
    }

def require_integer(value: object, label: str, *, minimum: int) -> int:
    """Return an integer at least minimum, accepting integral floats and raising SystemExit for invalid counts."""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        qualifier = (
            "a non-negative integer"
            if minimum == 0
            else "a positive integer"
            if minimum == 1
            else f"an integer of at least {minimum}"
        )
        raise SystemExit(f"{label} must be {qualifier}.")
    return value

def require_positive_number(value: object, label: str) -> int | float:
    """Return a duration in hours, raising SystemExit unless it falls in (0, 96]."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SystemExit(f"{label} must be a positive finite number no greater than 96.")
    if not 0 < value <= MAX_TIME_HOURS:
        raise SystemExit(f"{label} must be a positive finite number no greater than 96.")
    return value

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--available-parallelism", type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(resolve_deep_scan_config(args.available_parallelism), sort_keys=True))

if __name__ == "__main__":
    main()
```

## File: `scripts/deep_scan_defaults.json`

```json
{
  "workers": 4,
  "subagents": 3,
  "stopAfterNoNew": 4,
  "stopAfterConsecutiveErrors": 3,
  "maxDiscoveryRuns": 40,
  "maxTimeHours": 96
}
```

## File: `scripts/deep_scan_workbench.py`

_76 KB, too large to embed. Read it in the repository._

## File: `scripts/dispatch_inventory_tool`

```text
#!/bin/sh
# The trailing slash preserves directory names ending in newlines through substitution.
set -- "$(CDPATH= cd -P "${0%/*}/../origin" && printf '%s/' "${PWD%/}")${0##*/}" "$@"
case "$1" in
  /*) exec "$@" ;;
  *) exit 126 ;;
esac
```

## File: `scripts/filesystem_identity.py`

```python
"""SQLite-safe serialization for platform filesystem identity values."""

from __future__ import annotations

import argparse

def serialize_filesystem_identity(value: int) -> int | str:
    """Preserve filesystem IDs that can exceed SQLite's signed 64-bit range.

    Python 3.12 can expose 64-bit device IDs and 128-bit inode IDs on Windows.
    Values that already fit remain integers for compatibility with older plugin
    versions. The prefix prevents SQLite from coercing larger hexadecimal values
    through the INTEGER affinity of the existing columns.
    """
    if -(1 << 63) <= value < (1 << 63):
        return value
    return f"stat:{value:x}"

def stored_filesystem_identity_matches(stored: object, current: int) -> bool:
    """Compare a stored SQLite value with the platform file ID in its database representation."""
    return stored == serialize_filesystem_identity(current)

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/finalize_scan_contract.py`

_144 KB, too large to embed. Read it in the repository._

## File: `scripts/finding_preview.py`

```python
"""Bound structured finding details for workbench list responses."""

from __future__ import annotations

import argparse
import json
import re
import sys
from bisect import bisect_right
from itertools import islice
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from report_projection import code_evidence_rows, merged_root_cause
from workbench_constants import (
    FINDING_ATTACK_PATH_PREVIEW_BYTES,
    FINDING_CODE_EVIDENCE_LIMIT,
    FINDING_CODE_EVIDENCE_SNIPPET_BYTES,
    FINDING_DETAILS_PREVIEW_BYTES,
    FINDING_EVIDENCE_EXCERPT_BYTES,
    FINDING_LEVEL_BYTES,
    FINDING_ROOT_CAUSE_PREVIEW_BYTES,
    FINDING_SUMMARY_BYTES,
    FINDING_VALIDATION_PREVIEW_BYTES,
)

def bounded_finding_details(value: Any) -> dict[str, Any]:
    """Build the workbench preview of a stored finding, returning an empty dict for non-object input.

    Budget for writeup text, diagnostics, and guidance alongside code evidence so a
    large snippet cannot consume the whole preview.
    """
    if not isinstance(value, dict):
        return {}
    prepared: dict[str, Any] = {}
    for aliases, maximum_bytes, priority_keys, reserved_fields in (
        (
            ("rootCause", "root_cause"),
            FINDING_ROOT_CAUSE_PREVIEW_BYTES,
            (
                "description",
                "detail",
                "cause",
                "rationale",
                "why",
                "explanation",
                "evidence_refs",
            ),
            (
                (("summary", "description", "detail", "cause", "rationale", "why"), 1_000),
                (("evidenceRefs", "evidence_refs"), 400),
            ),
        ),
        (
            ("validation",),
            FINDING_VALIDATION_PREVIEW_BYTES,
            (
                "conclusion",
                "disposition",
                "result",
                "rationale",
                "evidenceRef",
                "evidence_ref",
                "evidence_refs",
            ),
            (
                (("summary", "conclusion", "rationale", "detail", "disposition"), 800),
                (("method",), 256),
                (("status",), 128),
                (("evidenceRefs", "evidence_refs"), 400),
                (("assertions",), 400),
                (("evidence",), 400),
                (("counterEvidence",), 400),
                (("limitations",), 400),
            ),
        ),
        (
            ("attackPath",),
            FINDING_ATTACK_PATH_PREVIEW_BYTES,
            (
                "summary",
                "description",
                "data_flow",
                "dataflow",
                "path",
                "auth_scope",
                "impact",
                "likelihood",
                "evidence_refs",
            ),
            (
                (("narrative", "summary", "description"), 600),
                (("dataFlow", "data_flow", "dataflow", "path"), 600),
                (("reachability",), 500),
                (("steps",), 500),
                (("authScope", "auth_scope"), 200),
                (("vector",), 200),
                (("preconditions",), 500),
                (("assumptions",), 300),
                (("evidenceRefs", "evidence_refs"), 300),
            ),
        ),
    ):
        if aliases == ("rootCause", "root_cause"):
            key, section = merged_root_cause(value)
        else:
            key = next((alias for alias in aliases if alias in value), None)
            section = value[key] if key is not None else None
        if key is not None:
            if key == "attackPath" and isinstance(section, dict):
                section = dict(section)
                for assessment in ("impact", "likelihood"):
                    if isinstance(section.get(assessment), str):
                        assessment_value = section[assessment]
                        assessment_key = (
                            "level"
                            if re.fullmatch(
                                r"critical|high|medium|low|informational|ignore|unknown",
                                assessment_value,
                                flags=re.IGNORECASE,
                            )
                            else "rationale"
                        )
                        section[assessment] = {assessment_key: assessment_value}
            prepared[key] = bounded_finding_section(
                section,
                maximum_bytes,
                priority_keys,
                reserved_fields,
            )

    writeup = value.get("writeup")
    if isinstance(writeup, dict) and isinstance(writeup.get("reportPath"), str):
        prepared["writeup"] = {"reportPath": bounded_json_text(writeup["reportPath"], 512)[0]}

    evidence_key, evidence = merged_bounded_code_evidence(value)
    if evidence_key is not None:
        prepared[evidence_key] = evidence

    for key in (
        "confidence",
        "detectedAt",
        "evidence",
        "evidenceExcerpt",
        "identity",
        "provenance",
        "ruleId",
        "severity",
        "status",
        "taxonomy",
        "preventiveControls",
        "remediationTests",
    ):
        if key in value:
            prepared[key] = (
                bounded_json_text(value[key], FINDING_EVIDENCE_EXCERPT_BYTES)[0]
                if key == "evidenceExcerpt" and isinstance(value[key], str)
                else value[key]
            )

    guidance = {
        key: prepared[key]
        for key in ("remediationTests", "preventiveControls")
        if key in prepared and isinstance(prepared[key], list)
    }
    for key in ("severity", "confidence"):
        if key in prepared:
            prepared[key] = bounded_finding_section(
                prepared[key],
                FINDING_SUMMARY_BYTES,
                ("level",),
                ((("level",), FINDING_LEVEL_BYTES),),
            )
    if "taxonomy" in prepared:
        prepared["taxonomy"] = bounded_finding_section(
            prepared["taxonomy"], FINDING_SUMMARY_BYTES, ("cwe",), ()
        )
    metadata_keys = (
        "ruleId",
        "status",
        "detectedAt",
        "identity",
        "taxonomy",
        "severity",
        "confidence",
    )
    metadata = {
        key: bounded_json_value(prepared[key], [FINDING_SUMMARY_BYTES])
        for key in metadata_keys
        if key in prepared
    }
    metadata = dict(sorted(metadata.items(), key=lambda item: json_size(item[1])))
    metadata_budget = FINDING_SUMMARY_BYTES - 2 - sum(json_size(key) + 2 for key in metadata)
    for index, (key, item) in enumerate(metadata.items()):
        metadata[key] = bounded_json_value(item, [metadata_budget // (len(metadata) - index)])
        metadata_budget -= json_size(metadata[key])
    diagnostics = (
        "rootCause",
        "root_cause",
        "validation",
        "attackPath",
        "codeEvidence",
        "code_evidence",
    )
    core_keys = (
        "writeup",
        *diagnostics,
        "provenance",
        "evidence",
        "evidenceExcerpt",
    )
    core = {key: prepared[key] for key in core_keys if key in prepared}
    extras = {
        key: item
        for key, item in prepared.items()
        if key not in core and key not in guidance and key not in metadata_keys
    }
    complete_guidance = {key: items[:1] for key, items in guidance.items()}
    minimum_guidance = {
        key: [items[0][:1]] if items and isinstance(items[0], str) else []
        for key, items in guidance.items()
    }
    projected_core = {}
    for selected_guidance in (complete_guidance, minimum_guidance):
        # Keep raw guidance inline to preserve its JSON-encoding recursion boundary.
        reserved = (
            len(json.dumps(selected_guidance, separators=(",", ":"))) - 1
            if selected_guidance
            else 0
        )
        if metadata:
            reserved += json_size(metadata) - 1
        if reserved >= FINDING_DETAILS_PREVIEW_BYTES:
            continue
        projected_core = bounded_json_value(
            core,
            [FINDING_DETAILS_PREVIEW_BYTES - reserved],
            max_depth=5,
        )
        if all(key in projected_core for key in core):
            break
    ordered_guidance = dict(sorted(guidance.items(), key=lambda entry: bool(entry[1])))
    bounded = bounded_json_value(
        {**metadata, **projected_core, **ordered_guidance, **extras},
        [FINDING_DETAILS_PREVIEW_BYTES],
        max_depth=5,
    )
    return bounded if isinstance(bounded, dict) else {}

def bounded_finding_section(
    value: Any,
    maximum_bytes: int,
    priority_keys: tuple[str, ...],
    reserved_fields: tuple[tuple[tuple[str, ...], int], ...],
) -> Any:
    """Apply each field group’s size cap before selecting fields in priority order under the section cap."""
    if not isinstance(value, dict):
        return bounded_json_value(value, [maximum_bytes])
    ordered: dict[str, Any] = {}
    for aliases, field_bytes in reserved_fields:
        key = next((alias for alias in aliases if alias in value), None)
        if key is not None:
            ordered[key] = bounded_json_value(value[key], [field_bytes])
    # Reserved fields already come first. Order the remaining aliases and fields next.
    for key in (*priority_keys, *value):
        if key in value and key not in ordered:
            ordered[key] = value[key]
    evidence_key, evidence = merged_bounded_code_evidence(ordered)
    if evidence_key is not None:
        ordered[evidence_key] = evidence
        ordered.pop("code_evidence" if evidence_key == "codeEvidence" else "codeEvidence", None)
    return bounded_json_value(ordered, [maximum_bytes])

def merged_bounded_code_evidence(value: dict[str, Any]) -> tuple[str | None, Any]:
    """Return the preferred evidence key and the preview data to store under it.

    Merge camelCase and snake_case catalogs by evidence ID, keeping the first
    eligible snippet per ID. Return (None, None) if both keys are absent.
    If neither value is a list, preserve the first supplied value.
    """
    evidence_keys = [key for key in ("codeEvidence", "code_evidence") if key in value]
    if not evidence_keys:
        return None, None
    catalogs = [value[key] for key in evidence_keys if isinstance(value[key], list)]
    if not catalogs:
        return evidence_keys[0], value[evidence_keys[0]]
    bounded = {}
    for item in code_evidence_rows(*catalogs):
        if not isinstance(item.get("id"), str) or not item["id"].strip():
            continue
        if item["id"] in bounded:
            continue
        if len(bounded) >= FINDING_CODE_EVIDENCE_LIMIT:
            return evidence_keys[0], list(bounded.values())
        evidence = dict(item)
        for field in ("explanation", "label", "language", "path"):
            if field in evidence and not isinstance(evidence[field], str):
                evidence.pop(field)
        if (
            "role" in evidence
            and evidence["role"] is not None
            and not isinstance(evidence["role"], str)
        ):
            evidence.pop("role")
        start_line = evidence.get("startLine")
        if "startLine" in evidence and (
            not isinstance(start_line, int) or isinstance(start_line, bool) or start_line < 1
        ):
            evidence.pop("startLine")
        end_line = evidence.get("endLine")
        if (
            "endLine" in evidence
            and end_line is not None
            and (not isinstance(end_line, int) or isinstance(end_line, bool) or end_line < 1)
        ):
            evidence.pop("endLine")
        evidence["code"] = bounded_json_text(
            evidence["code"],
            FINDING_CODE_EVIDENCE_SNIPPET_BYTES,
        )[0]
        bounded[item["id"]] = evidence
    return evidence_keys[0], list(bounded.values())

def json_size(value: Any) -> int:
    """Return the byte count of the compact, ASCII-escaped JSON representation."""
    # ASCII output gives byte length; strings can use the cached default encoder.
    return len(json.dumps(value, separators=None if isinstance(value, str) else (",", ":")))

def bounded_json_value(
    value: Any,
    budget: list[int],
    *,
    depth: int = 0,
    max_depth: int = 4,
) -> Any:
    """Build a depth-limited preview while charging its JSON representation to the shared byte budget."""
    if budget[0] <= 0:
        return None
    if depth >= max_depth:
        consume_json_budget(budget, 4)
        return None
    if isinstance(value, str):
        bounded, size = bounded_json_text(value, budget[0])
        consume_json_budget(budget, size)
        return bounded
    if value is None or isinstance(value, (bool, int, float)):
        consume_json_budget(budget, json_size(value))
        return value
    if isinstance(value, list):
        if not consume_json_budget(budget, 2):
            return []
        result = []
        for item in value:
            remaining = budget[0]
            separator = 0 if not result else 1
            if not consume_json_budget(budget, separator):
                break
            bounded_item = bounded_json_value(
                item,
                budget,
                depth=depth + 1,
                max_depth=max_depth,
            )
            size = json_size(bounded_item)
            if separator + size > remaining or (
                isinstance(item, str) and item and bounded_item == ""
            ):
                budget[0] = remaining
                break
            budget[0] = remaining - separator - size
            result.append(bounded_item)
        return result
    if isinstance(value, dict):
        if not consume_json_budget(budget, 2):
            return {}
        result = {}
        for key, item in islice(value.items(), 20):
            if budget[0] <= 0 or not isinstance(key, str):
                break
            remaining = budget[0]
            separator = 0 if not result else 1
            if not consume_json_budget(budget, separator):
                budget[0] = remaining
                break
            bounded_key, key_size = bounded_json_text(key, min(budget[0], 512))
            if not consume_json_budget(budget, key_size + 1):
                budget[0] = remaining
                break
            item_budget = budget
            if depth == 0 and key == "remediationTests":
                controls = value.get("preventiveControls")
                if (
                    isinstance(item, list)
                    and item
                    and isinstance(item[0], str)
                    and item[0]
                    and isinstance(controls, list)
                    and controls
                    and isinstance(controls[0], str)
                    and controls[0]
                ):
                    minimum_tests = json_size([item[0][0]])
                    for control in (controls[0], controls[0][0]):
                        reserved = json_size({"preventiveControls": [control]}) - 1
                        if budget[0] >= minimum_tests + reserved:
                            item_budget = [budget[0] - reserved]
                            break
            bounded_item = bounded_json_value(
                item,
                item_budget,
                depth=depth + 1,
                max_depth=max_depth,
            )
            size = separator + key_size + 1 + json_size(bounded_item)
            if size > remaining or (isinstance(item, str) and item and bounded_item == ""):
                budget[0] = remaining
                break
            budget[0] = remaining - size
            result[bounded_key] = bounded_item
        return result
    consume_json_budget(budget, 4)
    return None

def consume_json_budget(budget: list[int], size: int) -> bool:
    """Deduct the requested size and return whether it fit, exhausting the budget on failure."""
    if budget[0] < size:
        budget[0] = 0
        return False
    budget[0] -= size
    return True

def bounded_json_text(value: str, maximum_bytes: int) -> tuple[str, int]:
    """Return a string prefix and its ASCII-escaped JSON size in bytes.

    Count the surrounding quotes and escape sequences toward maximum_bytes.
    If even the empty string exceeds the budget, return the empty string and 2.
    """
    length = bisect_right(
        range(min(len(value), maximum_bytes) + 1), maximum_bytes, key=lambda n: json_size(value[:n])
    )
    selected = value[: max(0, length - 1)]
    return selected, json_size(selected)

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/launch_codex_security_mcp`

```text
#!/bin/sh
# Use LF line endings so POSIX can execute this script directly from Windows-built packages.
set -eu

# The SDK may have removed directories containing repository-owned executables.
if [ -z "${_CODEX_SECURITY_SDK_NODE_SEARCH_PATH+x}" ]; then
  PATH="${PATH:-/usr/bin:/bin}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
  export PATH
fi

launcher_dir=$(CDPATH= cd "$(command -p dirname "$0")" && pwd)
server_path=$launcher_dir/../mcp/server.mjs
if [ "${1:-}" = "--helper" ]; then
  server_path=$launcher_dir/../mcp/helpers.mjs
fi
launch_node() {
  node_command=$1
  shift
  if [ "${1:-}" = "--helper" ]; then
    shift
    # Preserve POSIX argv and HOME bytes without temporary files or consuming stdin.
    helper_stdin_open=false
    if (exec 4<&0) 2>&-; then
      exec 4<&0
      helper_stdin_open=true
    fi
    wait_helper() {
      if wait "$!" 2>&-; then exit 0; else exit $?; fi
    }
    forward_signal() {
      if [ -n "${!:-}" ]; then
        kill -s "$1" "$!" 2>&- || :
        wait_helper
      fi
      exit "$2"
    }
    trap 'forward_signal HUP 129' HUP
    trap 'forward_signal INT 130' INT
    trap 'forward_signal TERM 143' TERM
    printf '%s\000' "${HOME+x}" "${HOME-}" "$@" | command -p od -An -v -tx1 | command -p tr -d ' \n' | {
      # BusyBox ash requires a literal close redirection for a closed stdin.
      if [ "$helper_stdin_open" = true ]; then
        exec 0<&4
      else
        exec 0<&-
      fi
      exec "$node_command" "$server_path" --helper 4<&-
    } 3<&0 &
    exec 4<&-
    wait_helper
  fi
  exec "$node_command" "$server_path" "$@"
}

cache_root=${XDG_CACHE_HOME:-${HOME:-}/.cache}
codex_resources=
case "${CODEX_CLI_PATH:-}" in
  */*) codex_resources=${CODEX_CLI_PATH%/*} ;;
esac

# An explicitly selected runtime remains authoritative.
if [ -n "${CODEX_MCP_NODE_PATH:-}" ] && [ -x "$CODEX_MCP_NODE_PATH" ]; then
  launch_node "$CODEX_MCP_NODE_PATH" "$@"
fi

first_node=
can_load_native() {
  selected_node=$1
  if [ -z "$first_node" ]; then
    first_node=$1
  fi
  # Database helpers need SQLite. On macOS, library validation can also
  # prevent a managed runtime from loading the plugin's addon.
  # Capture output without opening a writable file for read-only callers.
  if _native_probe_output=$("$1" -e '
    if (process.platform === "linux") {
      try { require("node:sqlite"); } catch { process.exitCode = 78; }
    } else if (process.platform === "darwin") {
      require("node:sqlite");
      require(require("node:path").join(process.argv[1], "native",
        `${process.platform}-${process.arch}`, "unix.node"));
    }
  ' "$launcher_dir/../mcp" </dev/null 2>&1); then
    return 0
  elif [ "$?" -ne 78 ]; then
    return 1
  fi

  # This Linux runtime can still run helpers without SQLite. Prefer a system
  # installation if available, without expanding discovery into the caller's PATH.
  for system_candidate in /usr/local/bin/node /usr/bin/node /bin/node; do
    if [ -n "${_CODEX_SECURITY_SDK_NODE_SEARCH_PATH+x}" ]; then
      case ":$_CODEX_SECURITY_SDK_NODE_SEARCH_PATH:" in
        *":${system_candidate%/*}:"*) ;;
        *) continue ;;
      esac
    fi
    if [ -x "$system_candidate" ] &&
      _native_probe_output=$("$system_candidate" -e 'require("node:sqlite")' </dev/null 2>&1); then
      selected_node=$system_candidate
      break
    fi
  done
  return 0
}

for candidate in \
  "${CODEX_BROWSER_USE_NODE_PATH:-}" \
  "${CODEX_ELECTRON_RESOURCES_PATH:-}/cua_node/bin/node" \
  "$codex_resources/cua_node/bin/node" \
  "$cache_root/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ] && can_load_native "$candidate"; then
    launch_node "$selected_node" "$@"
  fi
done

remaining_path=${PATH-}
if [ -n "${CODEX_SECURITY_PLUGIN_ROOT:-}" ] && [ -n "${_CODEX_SECURITY_SDK_NODE_SEARCH_PATH:-}" ]; then
  # Only Node lookup uses the SDK-inspected fallback directories.
  remaining_path=${remaining_path:+$remaining_path:}$_CODEX_SECURITY_SDK_NODE_SEARCH_PATH
fi
while [ -n "$remaining_path" ]; do
  path_entry=${remaining_path%%:*}
  node_path=${path_entry:-.}/node
  if [ -x "$node_path" ] && can_load_native "$node_path"; then
    launch_node "$selected_node" "$@"
  fi
  case "$remaining_path" in
    *:*) remaining_path=${remaining_path#*:} ;;
    *) break ;;
  esac
done

if [ -n "$first_node" ]; then
  # Helpers that do not use the addon can still run with the original default.
  launch_node "$first_node" "$@"
fi

printf '%s\n' 'Codex Security could not find a Node runtime. Reinstall or update Codex, or set CODEX_MCP_NODE_PATH to an executable Node runtime.' >&2
exit 127
```

## File: `scripts/launch_codex_security_mcp.cmd`

```bat
@echo off
setlocal DisableDelayedExpansion

set "CODEX_SECURITY_MCP_SCRIPT=%~dp0..\mcp\server.mjs"
if "%~1"=="--helper" (
  rem An inherited ERRORLEVEL would shadow the helper exit code.
  set "ERRORLEVEL="
  set "CODEX_SECURITY_MCP_SCRIPT=%~dp0..\mcp\helpers.mjs"
  goto launch
)

rem This process waits for Node and must not keep the installed plugin directory locked.
if "%~d0"=="" (cd /d "%SystemRoot%") else (cd /d "%~d0\")
if errorlevel 1 (
  echo Codex Security could not start: no safe Windows working directory. 1>&2
  exit /b 1
)

:launch
if defined CODEX_MCP_NODE_PATH if exist "%CODEX_MCP_NODE_PATH%" (
  set "CODEX_SECURITY_MCP_NODE=%CODEX_MCP_NODE_PATH%"
  goto run
)
rem WindowsApps can expose a Node path that exists but cannot be executed.
rem Without an explicit override, prefer relocated user-writable runtimes.
if defined LOCALAPPDATA for /d %%D in ("%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\*") do if exist "%%~fD\bin\node.exe" (
  set "CODEX_SECURITY_MCP_NODE=%%~fD\bin\node.exe"
  goto run
)
if defined XDG_CACHE_HOME if exist "%XDG_CACHE_HOME%\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "CODEX_SECURITY_MCP_NODE=%XDG_CACHE_HOME%\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  goto run
)
if defined USERPROFILE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "CODEX_SECURITY_MCP_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  goto run
)
if defined CODEX_BROWSER_USE_NODE_PATH if exist "%CODEX_BROWSER_USE_NODE_PATH%" (
  set "CODEX_SECURITY_MCP_NODE=%CODEX_BROWSER_USE_NODE_PATH%"
  goto run
)
if defined CODEX_ELECTRON_RESOURCES_PATH if exist "%CODEX_ELECTRON_RESOURCES_PATH%\cua_node\bin\node.exe" (
  set "CODEX_SECURITY_MCP_NODE=%CODEX_ELECTRON_RESOURCES_PATH%\cua_node\bin\node.exe"
  goto run
)
if defined CODEX_CLI_PATH for %%I in ("%CODEX_CLI_PATH%") do if exist "%%~dpIcua_node\bin\node.exe" (
  set "CODEX_SECURITY_MCP_NODE=%%~dpIcua_node\bin\node.exe"
  goto run
)

rem Resolve Node from PATH once and launch that exact executable.
set "CODEX_SECURITY_MCP_SEARCH_PATH=%PATH:"=%"
for %%I in (node.exe) do set "CODEX_SECURITY_MCP_NODE=%%~$CODEX_SECURITY_MCP_SEARCH_PATH:I"
if defined CODEX_SECURITY_MCP_NODE goto run

echo Codex Security could not find a Node runtime. Reinstall or update Codex, or set CODEX_MCP_NODE_PATH to an executable Node runtime. 1>&2
exit /b 127

:run
rem Direct invocation also chains batch shims without CALL reparsing paths.
"%CODEX_SECURITY_MCP_NODE%" "%CODEX_SECURITY_MCP_SCRIPT%" %*
if "%~1"=="--helper" exit /b %errorlevel%
exit
```

## File: `scripts/legacy_findings.py`

```python
"""Normalize legacy finding details for scan contract validation."""

from __future__ import annotations

import copy
from typing import Any

import report_projection

def _filter_unknown_legacy_evidence_refs(section: dict[str, Any], evidence_ids: set[str]) -> None:
    for refs_field in ("evidenceRefs", "evidence_refs"):
        refs = section.get(refs_field)
        if isinstance(refs, list):
            section[refs_field] = [
                ref for ref in refs if isinstance(ref, str) and ref.strip() and ref in evidence_ids
            ]

def _normalize_legacy_string_list_fields(section: dict[str, Any], fields: tuple[str, ...]) -> None:
    for field in fields:
        if field not in section:
            continue
        value = section[field]
        if isinstance(value, str):
            normalized = [value] if value.strip() else []
        elif isinstance(value, list):
            normalized = [item for item in value if isinstance(item, str) and item.strip()]
        else:
            normalized = []
        if normalized:
            section[field] = normalized
        else:
            section.pop(field)

def _remove_unsupported_legacy_scalar_fields(
    section: dict[str, Any], fields: tuple[str, ...]
) -> None:
    for field in fields:
        if field in section and (not isinstance(section[field], str) or section[field] == ""):
            section.pop(field)

def _legacy_sealed_findings_for_validation(findings: dict[str, Any]) -> dict[str, Any]:
    compatible = copy.deepcopy(findings)
    finding_items = compatible.get("findings")
    if not isinstance(finding_items, list):
        return compatible
    for finding in finding_items:
        if not isinstance(finding, dict):
            continue
        canonical_evidence = finding.get("codeEvidence")
        canonical_evidence = canonical_evidence if isinstance(canonical_evidence, list) else []
        evidence_ids = {
            evidence["id"]
            for evidence in canonical_evidence
            if isinstance(evidence, dict) and isinstance(evidence.get("id"), str) and evidence["id"]
        }
        legacy_evidence = finding.get("code_evidence")
        if isinstance(legacy_evidence, list):
            compatible_legacy_evidence = []
            for evidence in report_projection.code_evidence_rows(legacy_evidence):
                evidence_id = evidence.get("id")
                if not isinstance(evidence_id, str) or not evidence_id.strip():
                    continue
                if evidence_id in evidence_ids:
                    continue
                evidence_ids.add(evidence_id)
                compatible_legacy_evidence.append(evidence)
            finding["code_evidence"] = compatible_legacy_evidence
        elif "code_evidence" in finding:
            finding.pop("code_evidence")
        for section_name, list_fields in (
            ("rootCause", ("evidenceRefs", "evidence_refs")),
            ("root_cause", ("evidenceRefs", "evidence_refs")),
            (
                "validation",
                (
                    "assertions",
                    "counterEvidence",
                    "evidence",
                    "evidenceRefs",
                    "evidence_refs",
                    "limitations",
                ),
            ),
            (
                "attackPath",
                (
                    "assumptions",
                    "blindspots",
                    "controls",
                    "evidenceRefs",
                    "evidence_refs",
                    "limitations",
                    "preconditions",
                    "steps",
                ),
            ),
        ):
            section = finding.get(section_name)
            if not isinstance(section, dict):
                continue
            _normalize_legacy_string_list_fields(section, list_fields)
            _filter_unknown_legacy_evidence_refs(section, evidence_ids)
        legacy_root_cause = finding.get("root_cause")
        if isinstance(legacy_root_cause, dict):
            _remove_unsupported_legacy_scalar_fields(
                legacy_root_cause, ("summary", "code", "language")
            )
        elif (
            "root_cause" in finding
            and legacy_root_cause is not None
            and (not isinstance(legacy_root_cause, str) or legacy_root_cause == "")
        ):
            finding.pop("root_cause")
        validation = finding.get("validation")
        if isinstance(validation, dict):
            _remove_unsupported_legacy_scalar_fields(
                validation, ("method", "status", "summary", "disposition", "result")
            )
        attack_path = finding.get("attackPath")
        if not isinstance(attack_path, dict):
            continue
        _remove_unsupported_legacy_scalar_fields(attack_path, ("summary",))
        for field in ("dataFlow", "data_flow", "dataflow", "reachability"):
            detail = attack_path.get(field)
            if isinstance(detail, dict):
                detail_scalar_fields = ("summary", "source", "sink", "outcome")
                if field == "reachability":
                    detail_scalar_fields += ("attacker", "entrypoint")
                _remove_unsupported_legacy_scalar_fields(detail, detail_scalar_fields)
                _normalize_legacy_string_list_fields(
                    detail, ("evidenceRefs", "evidence_refs", "transformations")
                )
                _filter_unknown_legacy_evidence_refs(detail, evidence_ids)
                if field == "reachability":
                    _normalize_legacy_string_list_fields(detail, ("preconditions",))
            elif not isinstance(detail, str) or detail == "":
                attack_path.pop(field, None)
        for field in ("impact", "likelihood"):
            detail = attack_path.get(field)
            if isinstance(detail, dict):
                _remove_unsupported_legacy_scalar_fields(detail, ("level", "rationale", "why"))
            elif detail is not None and (not isinstance(detail, str) or detail == ""):
                attack_path.pop(field)
    return compatible
```

## File: `scripts/posix_scan_local_files.py`

```python
"""Stage and publish POSIX scan-local files through verified directory descriptors."""

from __future__ import annotations

import argparse
import errno
import os
import secrets
import stat
import sys
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path, PurePosixPath

def descriptor_relative_writes_available() -> bool:
    """Return whether the platform supports the descriptor-relative operations used for writes."""
    # os.replace accepts src_dir_fd/dst_dir_fd wherever descriptor-relative
    # os.rename is supported, but Python lists only os.rename in supports_dir_fd.
    required_operations = (os.mkdir, os.open, os.rename, os.stat, os.unlink)
    return hasattr(os, "O_NOFOLLOW") and all(
        operation in os.supports_dir_fd for operation in required_operations
    )

@contextmanager
def managed_fd(descriptor: int) -> Iterator[int]:
    """Yield the descriptor and close it when the context exits, including on error."""
    try:
        yield descriptor
    finally:
        os.close(descriptor)

@contextmanager
def stage_file(
    parent_fd: int, filename: str, payload: bytes, owner_read_write: bool
) -> Iterator[int]:
    """Yield a synced file descriptor for a new staging entry, removing the entry on exit if it still matches."""
    descriptor = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600, dir_fd=parent_fd)
    try:
        with os.fdopen(descriptor, "wb", closefd=False) as handle:
            if owner_read_write:
                os.fchmod(descriptor, 0o600)
            handle.write(payload)
            handle.flush()
            os.fsync(descriptor)
        yield descriptor
    finally:
        try:
            entry = os.stat(filename, dir_fd=parent_fd, follow_symlinks=False)
            if os.path.samestat(os.fstat(descriptor), entry):
                os.unlink(filename, dir_fd=parent_fd)
        except FileNotFoundError:
            # Successful publication has already removed the temporary name.
            pass
        finally:
            os.close(descriptor)

def _rename_exclusive(parent_fd: int, source: str, destination: str) -> None:
    """Rename a directory entry atomically while requiring the destination to be absent."""
    import ctypes

    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform == "linux":
        rename = getattr(libc, "renameat2", None)
        flag = 1  # RENAME_NOREPLACE
    elif sys.platform == "darwin":
        rename = getattr(libc, "renameatx_np", None)
        flag = 4  # RENAME_EXCL
    else:
        rename = None
    code = errno.ENOSYS
    if rename is not None:
        rename.argtypes = [
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_uint,
        ]
        rename.restype = ctypes.c_int
        if rename(parent_fd, os.fsencode(source), parent_fd, os.fsencode(destination), flag) == 0:
            return
        code = ctypes.get_errno()
    elif sys.platform == "linux":
        import sysconfig

        # musl omits the renameat2 wrapper. Select the syscall for the Python
        # process's ABI, which can differ from the host kernel's architecture.
        arch = (sysconfig.get_config_var("MULTIARCH") or "").partition("-")[0]
        number = {"x86_64": 316, "aarch64": 276}.get(arch)
        syscall = getattr(libc, "syscall", None)
        if number is not None and ctypes.sizeof(ctypes.c_void_p) == 8 and syscall is not None:
            syscall.argtypes = [ctypes.c_long]
            syscall.restype = ctypes.c_long
            result = syscall(
                number,
                ctypes.c_long(parent_fd),
                ctypes.c_char_p(os.fsencode(source)),
                ctypes.c_long(parent_fd),
                ctypes.c_char_p(os.fsencode(destination)),
                ctypes.c_long(flag),
            )
            if result == 0:
                return
            code = ctypes.get_errno()
    detail = os.strerror(code)
    if code in {errno.ENOSYS, errno.ENOTSUP, errno.EOPNOTSUPP, errno.EINVAL}:
        detail = f"cannot publish a new file atomically without hard links or exclusive rename ({detail})"
    raise OSError(code, detail, destination)

def publish_new_file(parent_fd: int, source: str, destination: str) -> None:
    """Publish the staged name without overwriting the destination, using an exclusive rename if linking is unavailable."""
    try:
        os.link(
            source, destination, src_dir_fd=parent_fd, dst_dir_fd=parent_fd, follow_symlinks=False
        )
    except OSError as exc:
        if exc.errno not in {
            errno.EPERM,
            errno.ENOTSUP,
            errno.EOPNOTSUPP,
            errno.ENOSYS,
            errno.EXDEV,
            errno.EMLINK,
        }:
            raise
        _rename_exclusive(parent_fd, source, destination)
    else:
        os.unlink(source, dir_fd=parent_fd)

@contextmanager
def stage_write(
    parent_fd: int,
    relative_path: str,
    payload: bytes,
    *,
    owner_read_write: bool,
    replace_existing: bool,
    compare_existing: bool,
    check_parent: Callable[[Path], None],
    contract_error: type[ValueError],
) -> Iterator[Callable[..., tuple[os.stat_result, int]]]:
    """Stage payload under the open parent directory and yield a callable that publishes it.

    Call the publisher inside the context. It returns file metadata and the
    change time in nanoseconds. With compare_existing, matching bytes can
    reuse an existing file when replacements are allowed.
    """
    name = PurePosixPath(relative_path).name
    # Stage through the held parent so a replacement path cannot redirect the write.
    try:
        metadata = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        pass
    else:
        if not replace_existing:
            raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), relative_path)
        if not stat.S_ISREG(metadata.st_mode):
            raise contract_error(f"{relative_path}: expected a regular non-symlink file")
        try:
            existing_fd = os.open(
                name,
                os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0),
                dir_fd=parent_fd,
            )
        except OSError as exc:
            if exc.errno not in {errno.ENOENT, errno.EACCES, errno.EPERM}:
                raise
        else:
            with managed_fd(existing_fd):
                opened = os.fstat(existing_fd)
                if not stat.S_ISREG(opened.st_mode):
                    raise contract_error(f"{relative_path}: expected a regular non-symlink file")
                if not os.path.samestat(opened, metadata):
                    raise contract_error(f"{relative_path}: changed while it was being opened")
                if compare_existing and opened.st_size == len(payload):
                    from windows_scan_local_files import stream_matches_payload

                    try:
                        with os.fdopen(existing_fd, "rb", closefd=False) as handle:
                            matches = stream_matches_payload(handle, payload)
                    except OSError:
                        # A failed content comparison still allows an atomic replacement.
                        matches = False
                    if matches:
                        yield lambda _directory=None: (opened, opened.st_ctime_ns)
                        return
    # A valid destination may already occupy the filesystem's entire name limit.
    candidate = f".{secrets.token_hex(8)}.tmp"
    if name.casefold() == candidate:
        candidate = "." + candidate

    with stage_file(parent_fd, candidate, payload, owner_read_write) as staged_fd:
        staged = os.fstat(staged_fd)

        def publish(directory: Path | None = None) -> tuple[os.stat_result, int]:
            if directory is not None:
                check_parent(directory)
            if replace_existing:
                os.replace(candidate, name, src_dir_fd=parent_fd, dst_dir_fd=parent_fd)
                return staged, staged.st_ctime_ns
            named = os.stat(candidate, dir_fd=parent_fd, follow_symlinks=False)
            if not os.path.samestat(staged, named) or staged.st_ctime_ns != named.st_ctime_ns:
                raise contract_error(f"{relative_path}: staged file changed before publication")
            publish_new_file(parent_fd, candidate, name)
            published = os.fstat(staged_fd)
            if (staged.st_size, staged.st_mtime_ns) != (
                published.st_size,
                published.st_mtime_ns,
            ):
                raise contract_error(f"{relative_path}: staged contents changed during publication")
            return published, published.st_ctime_ns

        yield publish

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/read_codex_session.mjs`

```javascript
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";

// The Python usage collector uses the plugin's required Node runtime to read
// cold rollouts without requiring a separate Python compression dependency.
try {
  const path = process.argv[2];
  if (!path) throw new Error("A Codex rollout path is required.");
  // Native Node decoding can stop after the first frame. Rollouts may contain
  // concatenated frames, and an incomplete later frame must remain an error.
  const { createZstdDecompress } =
    await import("../mcp/session-decompression.mjs");
  await pipeline(
    createReadStream(path),
    createZstdDecompress(),
    process.stdout,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
```

## File: `scripts/report_projection.py`

````python
#!/usr/bin/env python3
"""Project canonical Codex Security scan JSON into the standard reports."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from collections.abc import Iterator
from itertools import chain
from typing import Any

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}
CONFIDENCE_ORDER = {"high": 0, "medium": 1, "low": 2}
REPORTABLE_SEVERITIES = {"critical", "high", "medium", "low"}
THREAT_MODEL_SECTIONS = (
    ("Assets", "assets"),
    ("Trust Boundaries", "trustBoundaries"),
    ("Attacker Capabilities", "attackerCapabilities"),
    ("Security Objectives", "securityObjectives"),
    ("Assumptions", "assumptions"),
)
DISPOSITION_LABELS = {
    "reported": "Reported",
    "no_issue_found": "No issue found",
    "rejected": "Rejected",
    "not_applicable": "Not applicable",
    "needs_follow_up": "Needs follow-up",
}
WRITEUP_REPORT_PATH_RE = re.compile(r"^findings/([a-z0-9][a-z0-9._-]*)/\1\.md$")
INLINE_CODE_RE = r"(?<!`)`[^`\n]+`(?!`)"
ENTITY_AMP_RE = r"&(?=(?:#[0-9]+|#[xX][0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);)"
WWW_LINK_RE = r"(?<![^\s*_~(])(?i:www)\.[^\s<>]+"

class ReportProjectionError(ValueError):
    """Raised when a canonical scan cannot be projected into a valid report."""

def markdown_threat_model_content(model: dict[str, Any]) -> str | None:
    """Return nonblank authored content for a Markdown model, otherwise None."""
    content = model.get("content")
    if model.get("format") == "markdown" and isinstance(content, str) and content.strip():
        return content
    return None

def _escape_markdown(value: str) -> str:
    # Locate whole URLs before matching code spans: a URL can contain backticks.
    urls = [match.span() for match in re.finditer(WWW_LINK_RE, value)]
    # Preserve protocol-relative and fuzzy links without a domain/TLD table.
    for match in re.finditer(r"[^\s<>]+", value):
        token = match[0]
        dot = token.split("/", 1)[0].find(".")
        if "//" in token or (dot >= 0 and re.search(r"[/?#]", token[dot + 1 :])):
            urls.append(match.span())
    punctuation = r"[\\`*_\[\]<>]|" + ENTITY_AMP_RE
    pattern = f"(?P<code>{INLINE_CODE_RE})|{punctuation}"

    def escape(match: re.Match[str]) -> str:
        if match.lastgroup == "code":
            return match[0]
        # GFM autolinks retain backslashes literally, including in query strings.
        if match[0] == "&" and any(start <= match.start() < end for start, end in urls):
            return "&"
        return "\\" + match[0]

    return re.sub(pattern, escape, value)

def _text(value: Any, fallback: str) -> str:
    candidate = value if isinstance(value, str) and value.strip() else fallback
    normalized = " ".join(candidate.split())
    if re.match(r"^(?:#{1,6}\s|[-*+]\s|>\s|```|~~~|\d+[.)]\s|\|)", normalized):
        normalized = f"Text: {normalized}"
    return _escape_markdown(normalized)

def _string_values(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        yield from (item for item in value if isinstance(item, str))

def _strings(value: Any) -> list[str]:
    return [text for item in _string_values(value) if (text := _text(item, ""))]

def _path_label(value: str, *, ensure_ascii: bool = False) -> str:
    if "," in value or value != " ".join(value.split()) or any(ord(c) < 32 for c in value):
        quoted = json.dumps(value, ensure_ascii=ensure_ascii)
        return "".join(c if c.isprintable() else json.dumps(c)[1:-1] for c in quoted)
    return value

def _path_text(value: str, *, ensure_ascii: bool = False) -> str:
    label = _path_label(value, ensure_ascii=ensure_ascii)
    if label != value or re.search(ENTITY_AMP_RE, value):
        marker = _code_fence(label, minimum=1)
        padding = " " if label.startswith("`") or label.endswith("`") else ""
        return f"{marker}{padding}{label}{padding}{marker}"
    return re.sub(r"([\\`*_\[\]<>])", r"\\\1", value)

def _cell(value: Any) -> str:
    return _text(value, "none").replace("|", "\\|").replace("\n", "<br>")

def _deep_report_id(finding: dict[str, Any]) -> str:
    extensions = finding.get("extensions")
    if isinstance(extensions, dict):
        report_id = extensions.get("reportId")
        if isinstance(report_id, str) and report_id.strip():
            return report_id
        ledger_row_id = extensions.get("ledgerRowId")
        if isinstance(ledger_row_id, str) and ledger_row_id.strip():
            return ledger_row_id
    identity = finding.get("identity")
    if isinstance(identity, dict):
        instance = identity.get("instance")
        if isinstance(instance, str) and instance.strip():
            return instance
    occurrence_id = finding.get("occurrenceId")
    return (
        occurrence_id
        if isinstance(occurrence_id, str) and occurrence_id.strip()
        else "Unidentified report"
    )

def _deep_candidate_id(finding: dict[str, Any]) -> str:
    extensions = finding.get("extensions")
    if isinstance(extensions, dict):
        candidate_id = extensions.get("candidateId")
        if isinstance(candidate_id, str) and candidate_id.strip():
            return candidate_id
    return _deep_report_id(finding)

def _has_deep_child_metadata(finding: dict[str, Any]) -> bool:
    extensions = finding.get("extensions")
    if not isinstance(extensions, dict):
        return False
    return any(
        isinstance(extensions.get(field), str) and extensions[field].strip()
        for field in ("candidateId", "reportId")
    )

def uses_deep_presentation(coverage: dict[str, Any], findings: list[dict[str, Any]]) -> bool:
    """Select deep-report formatting for repository scans in deep mode and scoped scans with deep-child metadata."""
    if coverage.get("mode") == "deep_repository":
        return True
    if coverage.get("mode") != "scoped_path":
        return False
    # Scoped deep scans can arrive as scoped_path artifacts. The child ids are
    # the stable deep-scan signal; ordinary scoped scans do not emit them.
    return any(_has_deep_child_metadata(finding) for finding in findings)

def _deep_title_parts(finding: dict[str, Any], report_id: str) -> tuple[str, str | None]:
    title = finding.get("title")
    if not isinstance(title, str):
        return "Untitled finding", None
    normalized = " ".join(title.split())
    match = re.fullmatch(r"(.+?)\s+\[([^\[\]\n]+)\]", normalized)
    if match is None:
        return normalized, None
    annotation = match.group(2)
    extensions = finding.get("extensions")
    recognized_ids = [report_id]
    if isinstance(extensions, dict):
        ledger_row_id = extensions.get("ledgerRowId")
        if isinstance(ledger_row_id, str) and ledger_row_id.strip():
            recognized_ids.append(ledger_row_id)
    if any(
        annotation == report_id or annotation.startswith(f"{report_id};")
        for report_id in recognized_ids
    ):
        return match.group(1), annotation
    return normalized, None

def _deep_group_levels(
    group: list[tuple[int, dict[str, Any], str | None]],
    field: str,
    order: dict[str, int],
) -> str:
    levels = {finding[field]["level"] for _, finding, _ in group}
    return "<br>".join(sorted(levels, key=lambda level: order.get(level, len(order))))

def _deep_group_row(group: list[tuple[int, dict[str, Any], str | None]]) -> str:
    report_ids = [_deep_report_id(finding) for _, finding, _ in group]
    report_counts = Counter(report_ids)
    titles = []
    labels = []
    for report_id, (_, finding, _) in zip(report_ids, group, strict=True):
        title, annotation = _deep_title_parts(finding, report_id)
        titles.append(_cell(title))
        labels.append(annotation if report_counts[report_id] > 1 and annotation else report_id)

    label_counts = Counter(labels)
    report_links = []
    writeup_links = []
    for report_id, label, (number, finding, path) in zip(report_ids, labels, group, strict=True):
        identity = finding.get("identity")
        if label_counts[label] > 1 and isinstance(identity, dict):
            label = identity.get("instance") or report_id
        label = _cell(label)
        report_links.append(f"[{label}](#finding-{number})")
        writeup_links.append(f"[Open {label}]({path})" if path else f"{label}: inline below")
    return (
        f"| {'<br>'.join(dict.fromkeys(titles))} | {'<br>'.join(report_links)} "
        f"| {_deep_group_levels(group, 'severity', SEVERITY_ORDER)} "
        f"| {_deep_group_levels(group, 'confidence', CONFIDENCE_ORDER)} "
        f"| {'<br>'.join(writeup_links)} |"
    )

def _writeup_report_path(finding: dict[str, Any]) -> str | None:
    writeup = finding.get("writeup")
    if writeup is None:
        return None
    if not isinstance(writeup, dict):
        raise ReportProjectionError("finding writeup must be an object")
    report_path = writeup.get("reportPath")
    if not isinstance(report_path, str) or not WRITEUP_REPORT_PATH_RE.fullmatch(report_path):
        raise ReportProjectionError("finding writeup has an invalid reportPath")
    return report_path

def _hardening_portfolio_path(scan: dict[str, Any]) -> str | None:
    hardening = scan.get("hardening")
    if hardening is None:
        return None
    if not isinstance(hardening, dict):
        raise ReportProjectionError("scan hardening must be an object")
    portfolio_path = hardening.get("portfolioPath")
    if portfolio_path != "hardening/hardening.md":
        raise ReportProjectionError("scan hardening has an invalid portfolioPath")
    return portfolio_path

def _bullet_section(heading: str, items: list[str]) -> list[str]:
    return ["", heading, *(f"- {item}" for item in items)] if items else []

def code_evidence_rows(*catalogs: Any) -> Iterator[dict[str, Any]]:
    """Yield evidence objects with nonblank code in their original order."""
    for items in catalogs:
        if isinstance(items, list):
            yield from (
                item
                for item in items
                if isinstance(item, dict)
                and isinstance(item.get("code"), str)
                and item["code"].strip()
            )

def embedded_code_evidence(section: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Collect code evidence from both supported field spellings."""
    return code_evidence_rows(section.get("codeEvidence"), section.get("code_evidence"))

def _code_evidence_catalog(finding: dict[str, Any]) -> dict[str, dict[str, Any]]:
    catalog = {}
    for item in embedded_code_evidence(finding):
        if isinstance(item.get("id"), str):
            catalog.setdefault(item["id"], item)
    return catalog

def _section_code_evidence(
    catalog: dict[str, dict[str, Any]], *sections: dict[str, Any]
) -> list[dict[str, Any]]:
    unique: dict[tuple[str, str], dict[str, Any]] = {}
    for section in sections:
        referenced = (
            catalog[ref]
            for key in ("evidenceRefs", "evidence_refs")
            for ref in _string_values(section.get(key))
            if ref in catalog
        )
        for item in chain(referenced, embedded_code_evidence(section)):
            unique.setdefault((str(item.get("id", "")), item["code"]), item)
    return list(unique.values())

def merged_root_cause(value: dict[str, Any]) -> tuple[str | None, Any]:
    """Return the first recorded root-cause field name and its merged detail, or (None, None) if absent."""
    keys = [key for key in ("rootCause", "root_cause") if key in value]
    if not keys:
        return None, None
    if len(keys) == 1:
        detail = value[keys[0]]
        return keys[0], detail if isinstance(detail, (str, dict)) else None
    details: list[dict[str, Any]] = []
    for key in keys:
        detail = value[key]
        if isinstance(detail, str):
            details.append({"summary": detail})
        elif isinstance(detail, dict):
            details.append(detail)
    if not details:
        return keys[0], None

    merged: dict[str, Any] = {}
    text_fields = {
        "cause",
        "code",
        "description",
        "detail",
        "explanation",
        "rationale",
        "summary",
        "why",
    }
    for detail in details:
        for field, item in detail.items():
            if field in (
                "evidenceRefs",
                "evidence_refs",
                "codeEvidence",
                "code_evidence",
                "language",
            ):
                continue
            if field in text_fields and (not isinstance(item, str) or not item.strip()):
                continue
            current = merged.get(field)
            if (
                field not in merged
                or current in (None, "", [], {})
                or (isinstance(current, str) and not current.strip())
            ):
                merged[field] = item

    evidence_values = [
        detail[field]
        for detail in details
        for field in ("evidenceRefs", "evidence_refs")
        if field in detail
    ]
    if evidence_values:
        merged["evidenceRefs"] = list(
            dict.fromkeys(item for evidence in evidence_values for item in _string_values(evidence))
        )

    embedded_evidence = [
        item
        for detail in details
        for field in ("codeEvidence", "code_evidence")
        for item in (detail.get(field, []) if isinstance(detail.get(field), list) else [])
    ]
    if embedded_evidence:
        merged["codeEvidence"] = embedded_evidence

    code = merged.get("code")
    matching_details = (
        details
        if not isinstance(code, str) or not code.strip()
        else [detail for detail in details if detail.get("code") == code]
    )
    language = next(
        (
            detail["language"]
            for detail in matching_details
            if isinstance(detail.get("language"), str) and detail["language"].strip()
        ),
        None,
    )
    if language is not None:
        merged["language"] = language
    return keys[0], merged

def _root_cause_code_evidence(
    finding: dict[str, Any], root_cause: dict[str, Any], catalog: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    evidence = _section_code_evidence(catalog, root_cause)
    legacy_code = root_cause.get("code")
    if not isinstance(legacy_code, str) or not legacy_code.strip():
        return evidence
    if any(item["code"] == legacy_code for item in evidence):
        return evidence
    root_location = next(
        (
            location
            for location in finding.get("locations", [])
            if isinstance(location, dict) and location.get("role") == "root_control"
        ),
        {},
    )
    return [
        *evidence,
        {
            "code": legacy_code,
            "label": "Broken control",
            "language": root_cause.get("language", ""),
            "location": root_location,
        },
    ]

def _code_evidence_location(item: dict[str, Any]) -> str:
    location = item.get("location")
    if isinstance(location, str):
        return " ".join(location.split())
    if isinstance(location, dict):
        item = location
    path = item.get("path")
    start = item.get("startLine")
    end = item.get("endLine")
    if not isinstance(path, str) or not path:
        return ""
    path = _path_label(path)
    if not isinstance(start, int) or isinstance(start, bool) or start < 1:
        return path
    if not isinstance(end, int) or isinstance(end, bool) or end <= start:
        return f"{path}:{start}"
    return f"{path}:{start}-{end}"

def _code_fence(code: str, minimum: int = 3) -> str:
    longest_run = max((len(match.group(0)) for match in re.finditer(r"`+", code)), default=0)
    return "`" * max(minimum, longest_run + 1)

def _code_evidence_lines(evidence: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for index, item in enumerate(evidence):
        label = _text(item.get("label"), f"Code evidence {index + 1}")
        location = _code_evidence_location(item)
        explanation = _text(item.get("explanation"), "")
        language = item.get("language") if isinstance(item.get("language"), str) else ""
        language = language if re.fullmatch(r"[A-Za-z0-9_+.-]*", language) else ""
        code = item["code"]
        fence = _code_fence(code)
        heading = f"**{label}**"
        if location:
            marker = _code_fence(location, minimum=1)
            padding = " " if location.startswith("`") or location.endswith("`") else ""
            heading += f" — {marker}{padding}{location}{padding}{marker}"
        lines.extend(["", heading])
        if explanation:
            lines.extend(["", explanation])
        lines.extend(["", f"{fence}{language}", code, fence])
    return lines

def _level_mix(findings: list[dict[str, Any]], field: str, order: dict[str, int]) -> str:
    counts = Counter(finding[field]["level"] for finding in findings)
    return ", ".join(f"{level}: {counts[level]}" for level in order if counts[level]) or "none"

def _locations(finding: dict[str, Any]) -> str:
    rendered = []
    for location in finding["locations"]:
        start = location["startLine"]
        end = location.get("endLine", start)
        suffix = f":{start}" if end == start else f":{start}-{end}"
        rendered.append(f"{_path_text(location['path'])}{suffix}")
    return ", ".join(rendered)

def _finding_sort_key(finding: dict[str, Any]) -> tuple[int, str, str]:
    return (
        SEVERITY_ORDER.get(finding["severity"]["level"], len(SEVERITY_ORDER)),
        finding.get("occurrenceId", ""),
        finding["title"],
    )

def _target_scope_lines(target: dict[str, Any]) -> list[str]:
    lines = [
        f"- Target kind: {_text(target.get('kind'), 'not recorded')}",
        f"- Target ID: {_text(target.get('targetId'), 'not recorded')}",
    ]
    base_revision = _text(target.get("baseRevision"), "")
    head_revision = _text(target.get("headRevision"), "")
    if base_revision or head_revision:
        lines.append(
            f"- Revision range: {base_revision or 'unknown'}...{head_revision or 'unknown'}"
        )
    revision = _text(target.get("revision"), "")
    if revision:
        lines.append(f"- Revision: {revision}")
    snapshot_digest = _text(target.get("snapshotDigest"), "")
    if snapshot_digest:
        lines.append(f"- Snapshot digest: {snapshot_digest}")
    return lines

def _surface_notes(surface: dict[str, Any]) -> str:
    notes = surface.get("notes", "No additional canonical notes were recorded.")
    receipt_refs = surface.get("receiptRefs", [])
    if not isinstance(receipt_refs, list) or not receipt_refs:
        return _cell(notes)
    evidence = ", ".join(item for item in receipt_refs if isinstance(item, str))
    if not evidence:
        return _cell(notes)
    return _cell(f"{notes} Evidence: {evidence}")

def _remediation_section(finding: dict[str, Any]) -> list[str]:
    remediation = _text(finding.get("remediation"), "No canonical remediation was recorded.")
    lines = ["", "#### Remediation", "", remediation]
    seen = {remediation}
    originals: list[tuple[str, dict[str, Any]]] = []
    pending = [("finding", finding)]
    seen_findings: set[int] = set()
    while pending:
        source_id, original = pending.pop()
        if id(original) in seen_findings:
            continue
        seen_findings.add(id(original))
        originals.append((source_id, original))
        provenance = original.get("provenance")
        if not isinstance(provenance, dict):
            continue
        previous = provenance.get("previousFindings")
        if isinstance(previous, list):
            pending.extend(
                (source_id, item) for item in reversed(previous) if isinstance(item, dict)
            )
        sources = provenance.get("sourceFindings")
        if isinstance(sources, list):
            pending.extend(
                (_text(source.get("id"), "finding"), source["finding"])
                for source in reversed(sources)
                if isinstance(source, dict) and isinstance(source.get("finding"), dict)
            )
    for source_id, original in originals[1:]:
        text = _text(original.get("remediation"), "")
        if text and text not in seen:
            seen.add(text)
            lines.extend(["", f"Source {source_id}: {text}"])
    for field, label in (
        ("remediationTests", "Tests"),
        ("preventiveControls", "Preventive controls"),
    ):
        values = list(
            dict.fromkeys(
                value for _, original in originals for value in _strings(original.get(field))
            )
        )
        lines.extend(_bullet_section(f"{label}:", values))
    return lines

def _finding_header(number: int, finding: dict[str, Any]) -> list[str]:
    cwes = ", ".join(finding["taxonomy"]["cwe"]) or "none"
    title = _text(finding["title"], "Untitled finding")
    return [
        f'<a id="finding-{number}"></a>',
        "",
        f"### [{number}] {title}",
        "",
        "| Field | Value |",
        "| --- | --- |",
        f"| Severity | {_cell(finding['severity']['level'])} |",
        f"| Confidence | {_cell(finding['confidence']['level'])} |",
        f"| Confidence rationale | {_cell(finding['confidence']['rationale'])} |",
        f"| Category | {_cell(finding['taxonomy']['category'])} |",
        f"| CWE | {_cell(cwes)} |",
        "| Affected lines | " + _locations(finding).replace("|", "\\|") + " |",
    ]

def _finding_section(number: int, finding: dict[str, Any]) -> list[str]:
    validation = finding.get("validation") if isinstance(finding.get("validation"), dict) else {}
    _, raw_root_cause = merged_root_cause(finding)
    root_cause = raw_root_cause if isinstance(raw_root_cause, dict) else {}
    attack_path = finding.get("attackPath") if isinstance(finding.get("attackPath"), dict) else {}
    dataflow_sections = [
        {"summary": value} if isinstance(value, str) else value
        for key in ("dataFlow", "dataflow", "data_flow")
        if isinstance((value := attack_path.get(key)), (str, dict))
    ]
    dataflow: dict[str, Any] = {}
    for section in dataflow_sections:
        for key in ("summary", "source", "sink", "outcome"):
            value = section.get(key)
            if isinstance(value, str) and value.strip():
                dataflow.setdefault(key, value)
    transformations = dict.fromkeys(
        value
        for section in dataflow_sections
        for value in _string_values(section.get("transformations"))
        if value.strip()
    )
    raw_reachability = attack_path.get("reachability")
    reachability = (
        {"summary": raw_reachability}
        if isinstance(raw_reachability, str)
        else raw_reachability
        if isinstance(raw_reachability, dict)
        else {}
    )
    severity = finding["severity"]
    validation_outcomes = [
        (label, text)
        for label, key in (
            ("Status", "status"),
            ("Disposition", "disposition"),
            ("Result", "result"),
        )
        if (text := _text(validation.get(key), ""))
    ]
    validation_summary = _text(
        validation.get("summary"),
        "Validation outcomes are recorded below."
        if validation_outcomes
        else f"{finding['confidence']['rationale']} Validation details were not recorded separately.",
    )
    root_cause_summary = _text(
        raw_root_cause if isinstance(raw_root_cause, str) else root_cause.get("summary"),
        "",
    )
    catalog = _code_evidence_catalog(finding)
    root_cause_code_evidence = _root_cause_code_evidence(finding, root_cause, catalog)
    validation_code_evidence = _section_code_evidence(catalog, validation)
    dataflow_code_evidence = _section_code_evidence(catalog, attack_path, *dataflow_sections)
    reachability_code_evidence = _section_code_evidence(catalog, reachability)
    dataflow_summary = _text(dataflow.get("summary"), "") or (
        f"The canonical finding records the affected path at {_locations(finding)}, "
        "but no expanded source-to-sink narrative was recorded."
    )
    reachability_summary = _text(reachability.get("summary"), "") or _text(
        attack_path.get("summary"),
        "Reachability was not recorded beyond the canonical finding summary and affected locations.",
    )
    severity_rationale = _text(
        severity.get("rationale"),
        f"The scan assigned {severity['level']} severity; no separate canonical severity rationale was recorded.",
    )
    severity_change = _text(
        severity.get("changeConditions"),
        "Additional runtime or deployment evidence could raise or lower this severity.",
    )
    lines = [
        *_finding_header(number, finding),
        "",
        "#### Summary",
        "",
        _text(finding["summary"], "No canonical finding summary was recorded."),
    ]
    if root_cause_summary or root_cause_code_evidence:
        lines.extend(["", "#### Root Cause", ""])
        if root_cause_summary:
            lines.append(root_cause_summary)
        lines.extend(_code_evidence_lines(root_cause_code_evidence))
    lines.extend(["", "#### Validation", "", validation_summary])
    if validation.get("method"):
        lines.extend(["", f"Validation method: {_text(validation['method'], 'not recorded')}"])
    if validation_outcomes:
        lines.extend(["", *(f"- **{label}:** {value}" for label, value in validation_outcomes)])
    lines.extend(_code_evidence_lines(validation_code_evidence))
    for label, key in (
        ("Assertions", "assertions"),
        ("Evidence", "evidence"),
        ("Counterevidence and remaining uncertainty", "counterEvidence"),
        ("Limitations", "limitations"),
    ):
        lines.extend(_bullet_section(f"{label}:", _strings(validation.get(key))))
    lines.extend(["", "#### Dataflow", "", dataflow_summary])
    lines.extend(_bullet_section("Attack steps:", _strings(attack_path.get("steps"))))
    for label, key in (("Source", "source"), ("Sink", "sink"), ("Outcome", "outcome")):
        if dataflow.get(key):
            lines.extend(["", f"- **{label}:** {_text(dataflow[key], 'not recorded')}"])
    lines.extend(
        _bullet_section("Transformations:", [_text(value, "") for value in transformations])
    )
    lines.extend(_code_evidence_lines(dataflow_code_evidence))
    lines.extend(["", "#### Reachability", "", reachability_summary])
    for label, key in (
        ("Attacker", "attacker"),
        ("Entry point", "entrypoint"),
        ("Source", "source"),
        ("Sink", "sink"),
        ("Outcome", "outcome"),
    ):
        if reachability.get(key):
            lines.extend(["", f"- **{label}:** {_text(reachability[key], 'not recorded')}"])
    preconditions = list(
        dict.fromkeys(
            _strings(attack_path.get("preconditions")) + _strings(reachability.get("preconditions"))
        )
    )
    lines.extend(_bullet_section("Preconditions:", preconditions))
    for label, key in (
        ("Assumptions", "assumptions"),
        ("Existing controls", "controls"),
        ("Blind spots", "blindspots"),
        ("Limitations", "limitations"),
    ):
        lines.extend(_bullet_section(f"{label}:", _strings(attack_path.get(key))))
    lines.extend(_code_evidence_lines(reachability_code_evidence))
    lines.extend(
        [
            "",
            "#### Severity",
            "",
            f"**{severity['level'].capitalize()}** — {severity_rationale}",
            "",
            severity_change,
        ]
    )
    for label, key in (("Impact", "impact"), ("Likelihood", "likelihood")):
        assessment = attack_path.get(key)
        if isinstance(assessment, str):
            rendered = _text(assessment, "")
            if rendered:
                lines.extend(["", f"**{label} assessment:** {rendered}"])
            continue
        if not isinstance(assessment, dict):
            continue
        details = [
            (detail_label, text)
            for detail_label, detail_key in (
                ("Level", "level"),
                ("Rationale", "rationale"),
                ("Why", "why"),
            )
            if (text := _text(assessment.get(detail_key), ""))
        ]
        if details:
            lines.extend(
                ["", f"{label} assessment:", *(f"- **{name}:** {value}" for name, value in details)]
            )
    lines.extend(_remediation_section(finding))
    return lines

def _linked_finding_section(number: int, finding: dict[str, Any], report_path: str) -> list[str]:
    link = f"[detailed technical write-up]({report_path})"
    lines = _finding_header(number, finding)
    for heading in ("Summary", "Validation", "Dataflow", "Reachability", "Severity"):
        lines.extend(["", f"#### {heading}", "", f"See the {link}."])
    if any(
        finding.get("provenance", {}).get(field) for field in ("sourceFindings", "previousFindings")
    ):
        lines.extend(_remediation_section(finding))
    else:
        lines.extend(["", "#### Remediation", "", f"See the {link}."])
    return lines

def build_report_markdown(
    manifest: dict[str, Any], findings_document: dict[str, Any], coverage: dict[str, Any]
) -> str:
    """Render findings and review coverage as a Markdown report ending in a newline.

    Args:
        manifest: Scan metadata, target, and scope.
        findings_document: Canonical findings for the scan.
        coverage: Review coverage for older manifests. Newer scans supply review state inline.

    Raises:
        ReportProjectionError: Reportable findings share a writeup path.
    """
    scan = manifest["scan"]
    if "review" in scan and "coverageRef" not in scan:
        from review_state import review_state

        coverage = review_state(scan)
    target = scan["target"]
    scope = scan["scope"]
    threat_model = scan.get("threatModel") if isinstance(scan.get("threatModel"), dict) else {}
    findings = sorted(
        (
            finding
            for finding in findings_document["findings"]
            if finding["severity"]["level"] in REPORTABLE_SEVERITIES
        ),
        key=_finding_sort_key,
    )
    numbered_findings = [
        (number, finding, _writeup_report_path(finding))
        for number, finding in enumerate(findings, 1)
    ]
    writeup_counts = Counter(path for _, _, path in numbered_findings if path is not None)
    duplicate_writeup_paths = sorted(path for path, count in writeup_counts.items() if count > 1)
    if duplicate_writeup_paths:
        raise ReportProjectionError(
            "reportable findings have duplicate writeup reportPath values: "
            + ", ".join(duplicate_writeup_paths)
        )
    deep_presentation = uses_deep_presentation(coverage, findings)
    deep_finding_groups: dict[str, list[tuple[int, dict[str, Any], str | None]]] = {}
    if deep_presentation:
        for entry in numbered_findings:
            _, finding, _ = entry
            deep_finding_groups.setdefault(_deep_candidate_id(finding), []).append(entry)
    hardening_portfolio_path = _hardening_portfolio_path(scan)
    include_paths = [
        _path_text(path) for path in coverage.get("includePaths", scope.get("includePaths", []))
    ]
    exclude_paths = [
        _path_text(path) for path in coverage.get("excludePaths", scope.get("excludePaths", []))
    ]
    limitations = _strings(scope.get("limitations"))
    explicit_exclusions = coverage.get("explicitExclusions", [])
    lines = [
        f"# Security Review: {_text(target['displayName'], 'Unknown target')}",
        "",
        "## Scope",
        "",
        _text(
            scope.get("summary"),
            "The scan was configured for the include paths and exclusions listed below.",
        ),
        "",
        f"- Scan mode: {coverage['mode']}",
        *_target_scope_lines(target),
        f"- Included paths: {', '.join(include_paths) or 'none'}",
        f"- Excluded paths: {', '.join(exclude_paths) or 'none'}",
    ]
    artifacts_reviewed = _strings(scope.get("artifactsReviewed"))
    if artifacts_reviewed:
        lines.extend(["- Artifacts reviewed: " + ", ".join(artifacts_reviewed)])
    context = _text(scope.get("context"), "")
    if context:
        lines.extend([f"- Scan context: {context}"])
    for exclusion in explicit_exclusions:
        if isinstance(exclusion, dict):
            limitations.append(
                f"Excluded {_text(exclusion.get('pattern'), 'unspecified')}: "
                f"{_text(exclusion.get('reason'), 'reason not recorded')}"
            )
    lines.extend(_bullet_section("Limitations and exclusions:", limitations))
    summary_count_lines = (
        [
            f"| Reportable DSS findings | {len(deep_finding_groups)} |",
            f"| Report instances | {len(findings)} |",
            f"| Report severity mix | {_level_mix(findings, 'severity', SEVERITY_ORDER)} |",
            f"| Report confidence mix | {_level_mix(findings, 'confidence', CONFIDENCE_ORDER)} |",
        ]
        if deep_presentation
        else [
            f"| Reportable findings | {len(findings)} |",
            f"| Severity mix | {_level_mix(findings, 'severity', SEVERITY_ORDER)} |",
            f"| Confidence mix | {_level_mix(findings, 'confidence', CONFIDENCE_ORDER)} |",
        ]
    )
    lines.extend(
        [
            "",
            "### Scan Summary",
            "",
            "| Field | Value |",
            "| --- | --- |",
            f"| Scan outcome | {scan.get('status', 'completed')} |",
            *summary_count_lines,
            f"| Validation mode | {_cell(scope.get('validationMode', 'not recorded'))} |",
            "",
            "Canonical artifacts: `scan-manifest.json` and `findings.json`. This report is a deterministic projection of those files.",
            "",
            "## Threat Model",
            "",
        ]
    )
    content = markdown_threat_model_content(threat_model)
    if content is not None:
        lines.append(content)
    else:
        lines.append(
            _text(
                threat_model.get("summary"),
                "No explicit canonical threat-model summary was recorded.",
            )
        )
        for heading, key in THREAT_MODEL_SECTIONS:
            values = _strings(threat_model.get(key))
            if values:
                lines.extend(["", f"### {heading}", "", *(f"- {value}" for value in values)])
    reviews = scan.get("reviewState", {}).get("reviews")
    if isinstance(reviews, list) and any(
        isinstance(review, dict) and isinstance(review.get("threatModel"), dict)
        for review in reviews
    ):
        lines.extend(
            [
                "",
                (
                    "Other reviews recorded different threat models. See the `threatModel` fields "
                    "in `scan.reviewState.reviews` in the [scan manifest](scan-manifest.json)."
                ),
            ]
        )
    lines.extend(["", "## Findings", ""])
    informational_count = sum(
        finding["severity"]["level"] == "informational" for finding in findings_document["findings"]
    )
    informational_note = ""
    if informational_count:
        noun = "finding" if informational_count == 1 else "findings"
        informational_note = (
            f"This report omits details for {informational_count} informational {noun}. "
            "See `findings.json` or export the findings as SARIF or CSV."
        )
    if findings:
        if informational_note:
            lines.extend([informational_note, ""])
        if deep_presentation:
            lines.extend(
                [
                    "| Findings | Reports | Severity | Confidence | Detailed write-up |",
                    "| --- | --- | --- | --- | --- |",
                ]
            )
            lines.extend(_deep_group_row(group) for group in deep_finding_groups.values())
        else:
            lines.extend(
                [
                    "| Finding | Severity | Confidence | Detailed write-up |",
                    "| --- | --- | --- | --- |",
                ]
            )
            for number, finding, report_path in numbered_findings:
                title = _cell(finding["title"])
                finding_link = f"[{title}](#finding-{number})"
                writeup_link = f"[Open report]({report_path})" if report_path else "inline below"
                lines.append(
                    f"| {finding_link} | {finding['severity']['level']} "
                    f"| {finding['confidence']['level']} | {writeup_link} |"
                )
        lines.extend(
            [
                "",
                "### Confidence Scale",
                "",
                "| Label | Meaning |",
                "| --- | --- |",
                "| high | Direct evidence supports the finding with no material unresolved blocker. |",
                "| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |",
                "| low | Evidence is incomplete and the item is retained only for explicit follow-up. |",
            ]
        )
        for number, finding, report_path in numbered_findings:
            if report_path is not None:
                lines.extend(["", *_linked_finding_section(number, finding, report_path)])
            else:
                lines.extend(["", *_finding_section(number, finding)])
    else:
        stopped = manifest.get("scan", {}).get("status") in {
            "failed",
            "canceled",
            "interrupted",
        }
        heading = "### No reportable findings" if informational_note else "### No findings"
        message = informational_note or (
            "No findings were retained before the scan stopped."
            if stopped
            else "No findings were reported."
        )
        if stopped:
            message += " The scan did not complete. No vulnerability conclusion can be drawn."
        lines.extend([heading, "", message])
    if hardening_portfolio_path is not None:
        lines.extend(
            [
                "",
                "## Structural Hardening",
                "",
                "The scan also produced derived, unsealed design guidance based on the complete finding collection. These proposals describe options and tradeoffs; they do not indicate that any finding has been remediated.",
                "",
                f"[Open the structural hardening portfolio]({hardening_portfolio_path})",
            ]
        )
    surfaces = coverage.get("surfaces", [])
    if surfaces:
        lines.extend(
            [
                "",
                "## Reviewed Surfaces",
                "",
                "| Surface | Risk Area | Outcome | Notes |",
                "| --- | --- | --- | --- |",
            ]
        )
        for surface in surfaces:
            if not isinstance(surface, dict):
                continue
            lines.append(
                "| "
                + " | ".join(
                    (
                        _cell(surface.get("label", surface.get("id"))),
                        _cell(surface.get("riskArea", "not recorded")),
                        _cell(
                            DISPOSITION_LABELS.get(
                                surface.get("disposition"), surface.get("disposition")
                            )
                        ),
                        _surface_notes(surface),
                    )
                )
                + " |"
            )
    open_questions = coverage.get("openQuestions", [])
    deferred_questions = []
    deferred = coverage.get("deferred", [])
    if isinstance(deferred, list):
        deferred_questions = [
            {
                "question": item.get("reason", "Deferred review requires follow-up."),
                "followUpPrompt": " ".join(
                    (
                        f"Review deferred unit {item.get('id', 'unknown')} and close its stated proof gap.",
                        f"Paths: {', '.join(item.get('paths', []))}." if item.get("paths") else "",
                        (
                            f"Surfaces: {', '.join(item.get('surfaceIds', []))}."
                            if item.get("surfaceIds")
                            else ""
                        ),
                    )
                ).strip(),
            }
            for item in deferred
            if isinstance(item, dict)
        ]
    for heading, questions in (
        ("Deferred Requested Work", deferred_questions),
        ("Open Questions And Follow Up", open_questions),
    ):
        if not isinstance(questions, list) or not questions:
            continue
        lines.extend(["", f"## {heading}", ""])
        for question in questions:
            if not isinstance(question, dict):
                continue
            lines.append(f"- {_text(question.get('question'), 'Unspecified open question.')}")
            prompt = _text(question.get("followUpPrompt"), "")
            if prompt:
                lines.append(f"  - Follow-up prompt: {prompt}")
    return "\n".join(lines).rstrip() + "\n"

def generate_report_markdown(
    manifest: dict[str, Any],
    findings: dict[str, Any],
    coverage: dict[str, Any],
) -> bytes:
    """Return the Markdown report for the scan as UTF-8 bytes ready to write."""
    return build_report_markdown(manifest, findings, coverage).encode("utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    raise SystemExit(0)
````

## File: `scripts/reserved_artifact_paths.json`

```json
[
  "artifacts/01_context/false_positive_feedback.json",
  "artifacts/02_discovery/candidate_ledger.jsonl",
  "artifacts/02_discovery/in_scope_files.txt",
  "artifacts/deep_discovery"
]
```

## File: `scripts/review_state.py`

```python
"""Keep review bookkeeping separate from published scan results."""

from __future__ import annotations

import argparse
import copy
from typing import Any

def uses_legacy_review(scan: dict[str, Any]) -> bool:
    """Return whether the manifest points to separate coverage or predates inline review metadata."""
    return "coverageRef" in scan or ("reviewState" not in scan and "review" not in scan)

def review_summary(state: dict[str, Any]) -> dict[str, Any]:
    """Return the excluded path patterns in the compact form stored on the scan manifest."""
    return {
        "excludedPaths": [item["pattern"] for item in state.get("explicitExclusions", [])],
    }

def review_state(scan: dict[str, Any]) -> dict[str, Any]:
    """Build the recovery coverage record from inline manifest metadata.

    Copy the saved review state, deriving exclusions from the summary when needed,
    and attach the inventory strategy and scope for this scan.
    """
    summary = scan.get("review", {})
    state = copy.deepcopy(scan.get("reviewState", {}))
    mode = scan.get("mode", "repository")
    state.setdefault("surfaces", [])
    state.setdefault("deferred", [])
    state.setdefault(
        "explicitExclusions",
        [
            {"pattern": path, "reason": "Excluded from review"}
            for path in summary.get("excludedPaths", [])
        ],
    )
    state.update(
        documentType="codex-security.coverage",
        schemaVersion="1.0",
        scanId=scan.get("id"),
        mode=mode,
        inventoryStrategy="scoped_path"
        if mode == "scoped_path"
        else "diff"
        if mode in {"diff", "commit", "branch_diff", "working_tree"}
        else "repository",
        includePaths=copy.deepcopy(scan.get("scope", {}).get("includePaths", [])),
        excludePaths=copy.deepcopy(scan.get("scope", {}).get("excludePaths", [])),
    )
    return state

def checkpoint_review_state(state: dict[str, Any]) -> dict[str, Any]:
    """Copy the review data needed for recovery, omitting per-surface risk areas and report metadata."""
    return {
        "surfaces": [
            {key: copy.deepcopy(value) for key, value in item.items() if key != "riskArea"}
            for item in state.get("surfaces", [])
        ],
        "explicitExclusions": copy.deepcopy(state.get("explicitExclusions", [])),
        "deferred": copy.deepcopy(state.get("deferred", [])),
        **{
            key: copy.deepcopy(state[key])
            for key in ("resolvedDeferred", "openQuestions", "reviews")
            if key in state
        },
    }

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/servicenow_avit.py`

```python
"""ServiceNow Manual AVIT Ingestion CSV template and finding fields."""

from __future__ import annotations

import csv
import io
import re
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

AVIT_APP_FIELDS = {
    "Application": 255,
    "Requested by": 151,
    "Purpose of application": 4000,
    "Types of sensitive data": 40,
    "List of compliance programs": 4000,
    "Technology stack details": 4000,
    "Application team": 100,
    "URLs to test": 4000,
    "Assigned to": 151,
    "Assignment group": 151,
}
AVIT_FINDING_FIELDS = (
    "Risk rating",
    "CWE category",
    "Vulnerability ID",
    "Steps to reproduce",
    "Technical details",
)

def read_template(path: Path) -> tuple[list[str], dict[str, str]]:
    """Read the application defaults for a ServiceNow AVIT export from a UTF-8 CSV.

    Returns:
        tuple: The original column headings and a mapping of stripped, case-folded
            headings to values from the single application row.

    Raises:
        ValueError: The file is unreadable, required columns are missing or
            duplicated, or application values are empty or too long.
    """
    try:
        with path.open(encoding="utf-8-sig", newline="") as source:
            rows = (row for row in csv.reader(source, strict=True) if row)
            headers = next(rows, [])
            values = next(rows, [])
            if len(headers) != len(values) or next(rows, None) is not None:
                raise ValueError("AVIT template must have a header and one application row")
    except (OSError, UnicodeError, csv.Error) as exc:
        raise ValueError(f"Could not read AVIT template {path}: {exc}") from exc

    row = {header.strip().casefold(): value for header, value in zip(headers, values, strict=True)}
    if len(row) != len(headers):
        raise ValueError("AVIT template has duplicate column names")
    for field in (*AVIT_APP_FIELDS, *AVIT_FINDING_FIELDS):
        if field.casefold() not in row:
            raise ValueError(f"AVIT template is missing column {field!r}")
    for field, limit in AVIT_APP_FIELDS.items():
        value = row[field.casefold()]
        if not value.strip() or len(value) > limit:
            raise ValueError(
                f"AVIT template {field!r} requires a value of at most {limit} characters"
            )
    return headers, row

def _narrative(text: str) -> str:
    return text if len(text) <= 1000 else text[:997] + "..."

def finding_fields(finding: dict[str, Any], location: dict[str, Any], steps: str) -> dict[str, str]:
    """Return AVIT columns for a finding at the selected location with the recorded steps.

    Use the first recognized CWE as the category, or the finding ID as the
    vulnerability ID when no CWE qualifies. Both narrative fields fit in 1,000 characters.
    """
    details = (
        f"{finding['findingId']} | {location['path']}:{location['startLine']}\n"
        f"{finding['title']}\n{finding['summary']}\n{finding['remediation']}"
    )
    cwe = next(
        (
            value.upper()
            for value in finding["taxonomy"]["cwe"]
            if len(value) <= 255 and re.fullmatch(r"CWE-[0-9]+", value, re.I)
        ),
        "",
    )
    level = finding["severity"]["level"]
    return {
        "Risk rating": "None" if level == "informational" else level.title(),
        "CWE category": cwe,
        "Vulnerability ID": "" if cwe else finding["findingId"],
        "Steps to reproduce": _narrative(steps),
        "Technical details": _narrative(details),
    }

def render(template: Path, rows: Iterable[dict[str, str]]) -> bytes:
    """Return UTF-8 CSV bytes with the template's header and one row per finding.

    The template supplies application fields and column order. For nonempty input,
    write the count of findings missing reproduction steps to stderr.
    """
    headers, row = read_template(template)
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(headers)
    missing_steps = 0
    has_findings = False
    for fields in rows:
        has_findings = True
        if not fields["Steps to reproduce"]:
            missing_steps += 1
        for field, value in fields.items():
            row[field.casefold()] = value
        writer.writerow(row.values())
    if has_findings:
        print(
            "Review Steps to reproduce before uploading. Populated steps describe the recorded "
            f"attack path. Rows with no recorded steps: {missing_steps}.",
            file=sys.stderr,
        )
    return output.getvalue().encode("utf-8")
```

## File: `scripts/snapshot_sqlite.py`

```python
#!/usr/bin/env python3
"""Create a transactionally consistent SQLite database snapshot."""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path
from urllib.parse import quote

def readonly_sqlite_uri(path: Path) -> str:
    """Escape the native filename, including separators, without introducing a URI authority."""
    filename = os.fsencode(path) if os.name == "posix" else str(path)
    return f"file:{quote(filename, safe='')}?mode=ro"

def main() -> None:
    """Back up the read-only source database into a separate destination using SQLite’s backup API."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    source = args.source.expanduser().resolve(strict=True)
    destination = args.destination.expanduser().absolute()
    # SQLite backup cannot make progress when both connections use the same file.
    if destination.exists() and destination.samefile(source):
        parser.error(f"Destination must not be the same file as source: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(readonly_sqlite_uri(source), uri=True) as source_connection:
        creation_destination = destination.resolve()
        try:
            creation_destination.touch(mode=0o600, exist_ok=False)
        except FileExistsError:
            pass
        else:
            creation_destination.chmod(0o600)
        with sqlite3.connect(destination) as destination_connection:
            source_connection.backup(destination_connection)
    destination.chmod(0o600)

if __name__ == "__main__":
    main()
```

## File: `scripts/threat_model_projection.py`

```python
#!/usr/bin/env python3
"""Render saved structured or Markdown threat models without running analysis."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Keep sibling helpers importable when Python starts in isolated mode.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import report_projection as report

def _is_structured_model(model: dict[str, Any]) -> bool:
    summary = model.get("summary")
    return (
        isinstance(summary, str)
        and bool(summary)
        and all(
            isinstance(values := model.get(key, []), list)
            and all(isinstance(value, str) and value for value in values)
            for _, key in report.THREAT_MODEL_SECTIONS
        )
    )

def threat_model_body(model: dict[str, Any]) -> str:
    """Return the authored Markdown body verbatim or render a legacy summary and its sections.

    Raises:
        ValueError: Required content is absent or the saved model has invalid metadata or sections.
    """
    content = report.markdown_threat_model_content(model)
    if content is not None:
        # The structured schema permits legacy metadata as extension fields.
        if _is_structured_model(model):
            return content
        if "origin" in model and model["origin"] not in (
            "generated",
            "provided",
            "reconciled",
            "recovered",
        ):
            raise ValueError("threatModel.origin: unsupported value")
        if "scope" in model:
            scope = model["scope"]
            if not isinstance(scope, dict) or "includePaths" not in scope:
                raise ValueError("threatModel.scope: expected an object with includePaths")
            for key in ("includePaths", "excludePaths"):
                if key in scope and (
                    not isinstance(scope[key], list)
                    or not all(isinstance(path, str) and path for path in scope[key])
                ):
                    raise ValueError(
                        f"threatModel.scope.{key}: expected an array of non-empty strings"
                    )
            if "summary" in scope and (
                not isinstance(scope["summary"], str) or not scope["summary"]
            ):
                raise ValueError("threatModel.scope.summary: expected a non-empty string")
        return content
    summary = model.get("summary")
    if not isinstance(summary, str) or not summary:
        if model.get("format") == "markdown":
            raise ValueError("threatModel.content: expected non-empty Markdown")
        raise ValueError("threatModel.summary: expected a non-empty string")
    sections = [
        summary if summary.strip() else "No explicit canonical threat-model summary was recorded."
    ]
    for heading, key in report.THREAT_MODEL_SECTIONS:
        values = model.get(key, [])
        if not isinstance(values, list):
            raise ValueError(f"threatModel.{key}: expected an array")
        if not values:
            continue
        for index, value in enumerate(values):
            if not isinstance(value, str) or not value:
                raise ValueError(f"threatModel.{key}[{index}]: expected a non-empty string")
        sections.append(f"## {heading}")
        sections.append("\n".join("- " + value.replace("\n", "\n  ") for value in values))
    return "\n\n".join(sections)

def _scope_lines(scope: Any, label: str) -> list[str]:
    # Older structured models may use these extension names for unrelated data.
    included = scope.get("includePaths") if isinstance(scope, dict) else None
    if not isinstance(included, list) or not all(isinstance(path, str) for path in included):
        return [f"- {label}: not recorded"]
    included_text = ", ".join(report._path_text(path, ensure_ascii=True) for path in included)
    lines = [f"- {label}: {included_text or 'none'}"]
    excluded = scope.get("excludePaths")
    if isinstance(excluded, list) and excluded and all(isinstance(path, str) for path in excluded):
        excluded_text = ", ".join(report._path_text(path, ensure_ascii=True) for path in excluded)
        lines.append(f"- {label} exclusions: {excluded_text or 'none'}")
    summary = scope.get("summary")
    if isinstance(summary, str) and summary:
        lines.append(f"- {label} description: {report._text(summary, 'not recorded')}")
    return lines

def render_threat_model(model: dict[str, Any], provenance: dict[str, Any] | None = None) -> bytes:
    """Return the saved threat model as UTF-8 Markdown, including its provenance footer.

    Args:
        model (dict): Authored Markdown or a legacy structured model from a scan.
        provenance (dict | None): Optional saved scan identifiers, scope, and provisional status.
    """
    body = threat_model_body(model)
    if report.markdown_threat_model_content(model) is None:
        body = "# Threat Model\n\n" + body
    text = report._text
    provenance = provenance or {}
    footer = ["---", "", "## Saved Model Context", ""]
    for key, label in (
        ("source", "Source"),
        ("scanId", "Scan"),
        ("target", "Target"),
        ("revision", "Revision"),
        ("snapshotDigest", "Snapshot"),
        ("status", "Result status"),
    ):
        if provenance.get(key):
            footer.append(f"- {label}: {text(str(provenance[key]), 'not recorded')}")
    footer.append(f"- Model origin: {text(model.get('origin'), 'not recorded')}")
    footer.extend(_scope_lines(model.get("scope"), "Model scope"))
    scan_scope = provenance.get("scanScope")
    if isinstance(scan_scope, dict):
        footer.extend(_scope_lines(scan_scope, "Scan scope"))
    if provenance.get("provisional"):
        footer.extend(["", "This is a provisional model saved before successful completion."])
    return (body + ("\n" if body.endswith("\n") else "\n\n") + "\n".join(footer) + "\n").encode(
        "utf-8"
    )

def main() -> int:
    """Render a JSON payload from stdin to UTF-8 Markdown on stdout and return zero on success."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-json-stdin", action="store_true", required=True)
    parser.parse_args()
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload["threatModel"], dict):
            raise ValueError("threatModel must be an object")
        sys.stdout.buffer.write(
            render_threat_model(payload["threatModel"], payload.get("provenance"))
        )
    except (KeyError, TypeError, ValueError) as exc:
        parser.error(str(exc))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

## File: `scripts/validate_scan_contract.py`

```python
#!/usr/bin/env python3
"""Validate a sealed Codex Security scan contract without mutating it."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Keep sibling helpers importable when Python starts in isolated mode.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import finalize_scan_contract as FINALIZER

def validate_contract(scan_dir: Path) -> dict[str, Any]:
    """Validate the sealed artifacts and return the manifest, original findings, and review summary.

    Legacy finding records are adapted for validation only. ContractError propagates
    when a required artifact, digest, schema, or evidence check fails.
    """

    scan_dir = FINALIZER._require_scan_directory(scan_dir.expanduser().resolve(strict=True))
    schema_dir = Path(__file__).resolve().parents[1] / "schemas"
    manifest, _ = FINALIZER._read_scan_local_json_bytes(
        scan_dir,
        "scan-manifest.json",
        "scan-manifest.json",
    )
    FINALIZER._validate_manifest(manifest)
    FINALIZER.validate_against_schema(manifest, schema_dir / "scan-manifest.schema.json")

    scan = FINALIZER._require_dict(manifest, "scan", "manifest")
    findings, coverage, _ = FINALIZER._read_sealed_artifacts(scan_dir, scan)
    findings_for_validation = FINALIZER._legacy_sealed_findings_for_validation(findings)
    FINALIZER._validate_findings(manifest, findings_for_validation)
    FINALIZER._validate_derived_finding_identities(manifest, findings)
    FINALIZER._validate_coverage(manifest, coverage, scan_dir)
    FINALIZER._validate_sealed_coverage_receipts(scan, coverage)
    FINALIZER.validate_against_schema(findings_for_validation, schema_dir / "findings.schema.json")
    FINALIZER.validate_against_schema(coverage, schema_dir / "coverage.schema.json")
    FINALIZER._require_scan_local_file(scan_dir, "report.md", "report.md")
    return {
        "scanDir": str(scan_dir),
        "manifest": manifest,
        "findings": findings,
        "review": FINALIZER.review_summary(coverage),
    }

def receipt(validated: dict[str, Any]) -> dict[str, Any]:
    """Return the CLI success payload with paths to the validated manifest, findings, and report."""
    scan_dir = Path(validated["scanDir"])
    scan = validated["manifest"]["scan"]
    return {
        "status": "valid",
        "scanDir": str(scan_dir),
        "manifestPath": str(scan_dir / "scan-manifest.json"),
        "findingsPath": str(scan_dir / scan["findingsRef"]),
        "reportPath": str(scan_dir / "report.md"),
    }

def main(argv: list[str] | None = None) -> int:
    """Print the validation receipt on success or report a validation error to stderr and return 2."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scan-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        validated = validate_contract(args.scan_dir)
    except (OSError, ValueError, RecursionError) as exc:
        print(f"scan contract validation failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(receipt(validated), sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

## File: `scripts/windows_scan_local_files.py`

```python
"""Secure scan-local file operations for Windows.

Windows does not implement Python's descriptor-relative ``dir_fd`` APIs or
``O_NOFOLLOW``.  This module provides the three operations needed by the scan
finalizer without falling back to check-then-use path validation.

Scan-local reads, writes, and deletes open every directory with
``FILE_FLAG_OPEN_REPARSE_POINT`` and reject all reparse points, including junctions.
Directory handles remain open without ``FILE_SHARE_DELETE`` for the full
operation, which prevents an
already-validated ancestor from being renamed or replaced during a read,
write, or delete.  Writes rename the exact temporary-file handle into place so
an attacker cannot substitute another file at the temporary name.

The snapshot helper copies junction metadata without opening the link target.

Importing this module and comparing streams work on every platform. Filesystem
operations raise ``WindowsScanLocalFileError`` outside Windows.
"""

from __future__ import annotations

import argparse
import contextlib
import ctypes
import ctypes.wintypes as wintypes
import errno
import functools
import importlib
import ntpath
import os
import secrets
import struct
from collections.abc import Callable, Iterator
from pathlib import Path, PurePosixPath
from typing import BinaryIO

_msvcrt = importlib.import_module("msvcrt") if os.name == "nt" else None

class WindowsScanLocalFileError(OSError):
    """Raised when a scan-local operation cannot be completed securely."""

class WindowsScanLocalPathError(WindowsScanLocalFileError):
    """Raised when a scan-local path fails an integrity check."""

# CreateFile access and sharing flags.
_DRIVE_FIXED = 3
_DELETE = 0x00010000
_FILE_ADD_SUBDIRECTORY = 0x00000004
_FILE_DELETE_CHILD = 0x00000040
_CHANGE_ACL = 0x000C0000  # WRITE_DAC | WRITE_OWNER
_SET_REPARSE_POINT = 0x00000102  # FILE_WRITE_ATTRIBUTES | FILE_WRITE_DATA
_OUTPUT_RIGHTS = (
    _DELETE | _FILE_ADD_SUBDIRECTORY | _FILE_DELETE_CHILD | _CHANGE_ACL | _SET_REPARSE_POINT
)
_FILE_TRAVERSE = 0x00000020
_FILE_READ_ATTRIBUTES = 0x00000080
_READ_CONTROL = 0x00020000
_GENERIC_READ = 0x80000000
_GENERIC_WRITE = 0x40000000
_FILE_SHARE_READ = 0x00000001
_FILE_SHARE_WRITE = 0x00000002
_FILE_SHARE_DELETE = 0x00000004

# CreateFile dispositions, attributes, and flags.
_CREATE_NEW = 1
_OPEN_EXISTING = 3
_FILE_ATTRIBUTE_DIRECTORY = 0x00000010
_FILE_ATTRIBUTE_NORMAL = 0x00000080
_FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400
_REPARSE_TAG_NAME_SURROGATE = 0x20000000
_FILE_FLAG_BACKUP_SEMANTICS = 0x02000000
_FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000

# GetFileInformationByHandleEx / SetFileInformationByHandle classes.
_FILE_RENAME_INFO_CLASS = 3
_FILE_DISPOSITION_INFO_CLASS = 4
_FILE_ATTRIBUTE_TAG_INFO_CLASS = 9
_FILE_ID_INFO_CLASS = 18

_FILE_TYPE_DISK = 0x0001
_FILE_NAME_OPENED = 0x00000008
_ERROR_FILE_NOT_FOUND = 2
_ERROR_PATH_NOT_FOUND = 3
_ERROR_ACCESS_DENIED = 5
_ERROR_SHARING_VIOLATION = 32
_ERROR_LOCK_VIOLATION = 33
_ERROR_FILE_EXISTS = 80
_ERROR_INSUFFICIENT_BUFFER = 122
_ERROR_ALREADY_EXISTS = 183
_ERROR_DIRECTORY = 267
_OWNER_SECURITY_INFORMATION = 0x00000001
_DACL_SECURITY_INFORMATION = 0x00000004
_MISSING_ERRORS = {_ERROR_FILE_NOT_FOUND, _ERROR_PATH_NOT_FOUND}
_COLLISION_ERRORS = {_ERROR_FILE_EXISTS, _ERROR_ALREADY_EXISTS}
_INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
_MAX_COMPARE_CHUNK = 64 * 1024
_MAX_WRITE_CHUNK = 1024 * 1024

_INVALID_COMPONENT_CHARACTERS = frozenset('<>:"|?*')
_RESERVED_DEVICE_NAMES = {
    "AUX",
    "CON",
    "CONIN$",
    "CONOUT$",
    "NUL",
    "PRN",
    *(f"COM{number}" for number in range(1, 10)),
    *(f"LPT{number}" for number in range(1, 10)),
    *(f"COM{number}" for number in "¹²³"),
    *(f"LPT{number}" for number in "¹²³"),
}

class _FileBasicInfo(ctypes.Structure):
    _fields_ = [
        ("CreationTime", ctypes.c_int64),
        ("LastAccessTime", ctypes.c_int64),
        ("LastWriteTime", ctypes.c_int64),
        ("ChangeTime", ctypes.c_int64),
        ("FileAttributes", wintypes.DWORD),
    ]

class _FileAttributeTagInfo(ctypes.Structure):
    _fields_ = [
        ("FileAttributes", wintypes.DWORD),
        ("ReparseTag", wintypes.DWORD),
    ]

class _FileIdInfo(ctypes.Structure):
    _fields_ = [("VolumeSerialNumber", ctypes.c_uint64), ("FileId", ctypes.c_ubyte * 16)]

class _ByHandleFileInformation(ctypes.Structure):
    _fields_ = [
        ("dwFileAttributes", wintypes.DWORD),
        ("ftCreationTime", wintypes.FILETIME),
        ("ftLastAccessTime", wintypes.FILETIME),
        ("ftLastWriteTime", wintypes.FILETIME),
        ("dwVolumeSerialNumber", wintypes.DWORD),
        ("nFileSizeHigh", wintypes.DWORD),
        ("nFileSizeLow", wintypes.DWORD),
        ("nNumberOfLinks", wintypes.DWORD),
        ("nFileIndexHigh", wintypes.DWORD),
        ("nFileIndexLow", wintypes.DWORD),
    ]

class _SecurityAttributes(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.DWORD),
        ("descriptor", wintypes.LPVOID),
        ("inherit", wintypes.BOOL),
    ]

class _FileDispositionInfo(ctypes.Structure):
    _fields_ = [("DeleteFile", wintypes.BOOLEAN)]

class _FileRenameInfo(ctypes.Structure):
    # The first field is a union.  FileRenameInfo interprets its low byte as
    # ReplaceIfExists; representing the union as DWORD also provides the
    # correct alignment for RootDirectory on 32-bit and 64-bit Windows.
    _fields_ = [
        ("FlagsOrReplaceIfExists", wintypes.DWORD),
        ("RootDirectory", wintypes.HANDLE),
        ("FileNameLength", wintypes.DWORD),
        ("FileName", wintypes.WCHAR * 1),
    ]

class _OwnedHandle:
    """Own a Win32 HANDLE and close it exactly once."""

    def __init__(self, value: int) -> None:
        self.value: int | None = value

    def close(self) -> None:
        if self.value is not None:
            _close_handle(self.value)
            self.value = None

    def detach(self) -> int:
        if self.value is None:
            raise RuntimeError("handle is already closed")
        value = self.value
        self.value = None
        return value

    def __enter__(self) -> _OwnedHandle:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

if os.name == "nt":
    _kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    _advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
    _ntdll = ctypes.WinDLL("ntdll")

    _GetFileSecurityW = _advapi32.GetFileSecurityW
    _GetFileSecurityW.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
    ]
    _GetFileSecurityW.restype = wintypes.BOOL

    _GetDriveTypeW = _kernel32.GetDriveTypeW
    _GetDriveTypeW.argtypes = [wintypes.LPCWSTR]
    _GetDriveTypeW.restype = wintypes.UINT

    _CreateFileW = _kernel32.CreateFileW
    _CreateFileW.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.HANDLE,
    ]
    _CreateFileW.restype = wintypes.HANDLE

    _ReOpenFile = _kernel32.ReOpenFile
    _ReOpenFile.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD]
    _ReOpenFile.restype = wintypes.HANDLE

    _CreateDirectoryW = _kernel32.CreateDirectoryW
    _CreateDirectoryW.argtypes = [wintypes.LPCWSTR, wintypes.LPVOID]
    _CreateDirectoryW.restype = wintypes.BOOL

    _CloseHandle = _kernel32.CloseHandle
    _CloseHandle.argtypes = [wintypes.HANDLE]
    _CloseHandle.restype = wintypes.BOOL

    _GetFileInformationByHandleEx = _kernel32.GetFileInformationByHandleEx
    _GetFileInformationByHandleEx.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        wintypes.LPVOID,
        wintypes.DWORD,
    ]
    _GetFileInformationByHandleEx.restype = wintypes.BOOL
    _GetFileInformationByHandle = _kernel32.GetFileInformationByHandle
    _GetFileInformationByHandle.argtypes = [
        wintypes.HANDLE,
        ctypes.POINTER(_ByHandleFileInformation),
    ]
    _GetFileInformationByHandle.restype = wintypes.BOOL

    _GetFileType = _kernel32.GetFileType
    _GetFileType.argtypes = [wintypes.HANDLE]
    _GetFileType.restype = wintypes.DWORD

    _GetFinalPathNameByHandleW = _kernel32.GetFinalPathNameByHandleW
    _GetFinalPathNameByHandleW.argtypes = [
        wintypes.HANDLE,
        wintypes.LPWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
    ]
    _GetFinalPathNameByHandleW.restype = wintypes.DWORD

    _SetFileInformationByHandle = _kernel32.SetFileInformationByHandle
    _SetFileInformationByHandle.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        wintypes.LPVOID,
        wintypes.DWORD,
    ]
    _SetFileInformationByHandle.restype = wintypes.BOOL

    _WriteFile = _kernel32.WriteFile
    _WriteFile.argtypes = [
        wintypes.HANDLE,
        wintypes.LPCVOID,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
        wintypes.LPVOID,
    ]
    _WriteFile.restype = wintypes.BOOL

    _DeviceIoControl = _kernel32.DeviceIoControl
    _DeviceIoControl.argtypes = [
        wintypes.HANDLE,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
        wintypes.LPVOID,
    ]
    _DeviceIoControl.restype = wintypes.BOOL

    _FlushFileBuffers = _kernel32.FlushFileBuffers
    _FlushFileBuffers.argtypes = [wintypes.HANDLE]
    _FlushFileBuffers.restype = wintypes.BOOL
else:
    _kernel32 = None

def _require_windows() -> None:
    if _kernel32 is None:
        raise WindowsScanLocalFileError(
            errno.ENOSYS,
            "secure Windows scan-local file operations require Windows",
        )

def _raise_last_error(operation: str, path: Path | None = None) -> None:
    error = ctypes.get_last_error()
    detail = ctypes.FormatError(error).strip()
    target = f" for {path}" if path is not None else ""
    raise WindowsScanLocalFileError(error, f"{operation}{target}: {detail}", str(path or ""))

def _invalid_path(path: Path | str, reason: str) -> WindowsScanLocalPathError:
    return WindowsScanLocalPathError(errno.EINVAL, reason, str(path))

def _validated_parts(relative_path: str) -> tuple[str, ...]:
    """Validate a POSIX contract path against Windows filesystem aliases."""

    path = PurePosixPath(relative_path)
    normalized = path.as_posix()
    if (
        not relative_path
        or normalized == "."
        or path.is_absolute()
        or ".." in path.parts
        or "\\" in relative_path
        or "\0" in relative_path
    ):
        raise _invalid_path(relative_path, "expected a safe scan-relative POSIX path")

    for component in path.parts:
        if (
            any(character in _INVALID_COMPONENT_CHARACTERS for character in component)
            or any(ord(character) < 32 for character in component)
            or component.endswith((" ", "."))
        ):
            raise _invalid_path(relative_path, "path contains a Windows-unsafe component")
        device_name = component.split(".", 1)[0].upper()
        if device_name in _RESERVED_DEVICE_NAMES:
            raise _invalid_path(relative_path, "path contains a reserved Windows device name")
    return path.parts

def _extended_path(path: Path) -> str:
    """Return a Win32 extended-length path so long scan paths remain usable."""

    value = str(path)
    if value.startswith("\\\\?\\"):
        return value
    if value.startswith("\\\\"):
        return "\\\\?\\UNC\\" + value[2:]
    return "\\\\?\\" + value

def _normalized_windows_path(path: Path | str) -> str:
    value = str(path)
    if value.startswith("\\\\?\\UNC\\"):
        value = "\\\\" + value[8:]
    elif value.startswith("\\\\?\\"):
        value = value[4:]
    return ntpath.normcase(ntpath.normpath(value))

def _close_handle(handle: int) -> None:
    _require_windows()
    if not _CloseHandle(handle):
        _raise_last_error("CloseHandle")

def _create_file(
    path: Path,
    *,
    access: int,
    share: int,
    disposition: int,
    flags: int,
    missing_ok: bool = False,
) -> _OwnedHandle | None:
    _require_windows()
    handle = _CreateFileW(
        _extended_path(path),
        access,
        share,
        None,
        disposition,
        flags,
        None,
    )
    if handle == _INVALID_HANDLE_VALUE:
        error = ctypes.get_last_error()
        if missing_ok and error in _MISSING_ERRORS:
            return None
        _raise_last_error("CreateFileW", path)
    return _OwnedHandle(int(handle))

def copy_directory_junction(source: Path, destination: Path) -> None:
    """Copy raw junction data to an empty directory without opening the link target."""
    # MAXIMUM_REPARSE_DATA_BUFFER_SIZE, including the reparse data header.
    data = ctypes.create_string_buffer(16 * 1024)
    size = wintypes.DWORD()
    for path, write in ((source, False), (destination, True)):
        handle = _create_file(
            path,
            access=_GENERIC_WRITE if write else _FILE_READ_ATTRIBUTES,
            share=_FILE_SHARE_READ | _FILE_SHARE_WRITE,
            disposition=_OPEN_EXISTING,
            flags=_FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT,
        )
        assert handle is not None
        with handle:
            if not _DeviceIoControl(
                handle.value,
                0x000900A4 if write else 0x000900A8,  # FSCTL_SET/GET_REPARSE_POINT.
                data if write else None,
                size.value if write else 0,
                None if write else data,
                0 if write else len(data),
                ctypes.byref(size),
                None,
            ):
                _raise_last_error("Copy directory junction", path)

def _attributes(handle: int) -> _FileAttributeTagInfo:
    info = _FileAttributeTagInfo()
    if not _GetFileInformationByHandleEx(
        handle,
        _FILE_ATTRIBUTE_TAG_INFO_CLASS,
        ctypes.byref(info),
        ctypes.sizeof(info),
    ):
        _raise_last_error("GetFileInformationByHandleEx")
    return info

def _final_path(handle: int, *, opened_name: bool = False) -> str:
    flags = _FILE_NAME_OPENED if opened_name else 0
    size = _GetFinalPathNameByHandleW(handle, None, 0, flags)
    if size == 0:
        _raise_last_error("GetFinalPathNameByHandleW")
    buffer = ctypes.create_unicode_buffer(size + 1)
    written = _GetFinalPathNameByHandleW(handle, buffer, len(buffer), flags)
    if written == 0 or written >= len(buffer):
        _raise_last_error("GetFinalPathNameByHandleW")
    return buffer.value

def _verify_handle_path(handle: int, expected_path: Path, *, opened_name: bool = False) -> None:
    actual = _normalized_windows_path(_final_path(handle, opened_name=opened_name))
    expected = _normalized_windows_path(expected_path)
    if actual != expected:
        raise _invalid_path(expected_path, "opened file resolved outside its verified scan path")

def _verify_directory(handle: int, expected_path: Path, checkout: bool = False) -> None:
    info = _attributes(handle)
    if info.FileAttributes & _FILE_ATTRIBUTE_REPARSE_POINT and (
        not checkout or not info.ReparseTag or info.ReparseTag & _REPARSE_TAG_NAME_SURROGATE
    ):
        raise _invalid_path(expected_path, "scan-local directories must not be reparse points")
    if not info.FileAttributes & _FILE_ATTRIBUTE_DIRECTORY:
        raise _invalid_path(expected_path, "expected a scan-local directory")
    _verify_handle_path(handle, expected_path)

def _verify_regular_file(handle: int, expected_path: Path) -> None:
    info = _attributes(handle)
    if info.FileAttributes & _FILE_ATTRIBUTE_REPARSE_POINT:
        raise _invalid_path(expected_path, "scan-local files must not be reparse points")
    if info.FileAttributes & _FILE_ATTRIBUTE_DIRECTORY or _GetFileType(handle) != _FILE_TYPE_DISK:
        raise _invalid_path(expected_path, "expected a regular scan-local file")
    _verify_handle_path(handle, expected_path)

def _canonical_scan_directory(scan_dir: Path) -> tuple[Path, tuple[int, int]]:
    absolute = Path(scan_dir).absolute()
    try:
        expected = absolute.lstat()
        canonical = absolute.resolve(strict=True)
    except OSError as exc:
        if exc.errno not in {errno.ENOENT, errno.ENOTDIR, errno.ELOOP}:
            raise
        raise _invalid_path(scan_dir, "expected an existing scan directory") from exc
    if _normalized_windows_path(absolute) != _normalized_windows_path(canonical):
        raise _invalid_path(scan_dir, "scan directory must be canonical and non-reparse")
    return canonical, (expected.st_dev, expected.st_ino)

def _open_directory(
    path: Path,
    *,
    missing_ok: bool = False,
    missing_is_path_error: bool = True,
    movable: bool = False,
    checkout: bool = False,
) -> _OwnedHandle | None:
    try:
        handle = _create_file(
            path,
            # Attribute-only handles do not participate in Win32 sharing checks.
            access=_FILE_READ_ATTRIBUTES | (0 if movable else _FILE_TRAVERSE),
            share=_FILE_SHARE_READ | _FILE_SHARE_WRITE | (_FILE_SHARE_DELETE if movable else 0),
            disposition=_OPEN_EXISTING,
            flags=_FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT,
            missing_ok=missing_ok,
        )
    except WindowsScanLocalFileError as exc:
        if exc.errno != _ERROR_DIRECTORY and not (
            missing_is_path_error and exc.errno in _MISSING_ERRORS
        ):
            raise
        raise _invalid_path(path, f"could not open scan-local directory: {exc}") from exc
    if handle is not None:
        try:
            assert handle.value is not None
            _verify_directory(handle.value, path, checkout)
        except BaseException:
            handle.close()
            raise
    return handle

def _create_directory(path: Path) -> None:
    if _CreateDirectoryW(_extended_path(path), None):
        return
    error = ctypes.get_last_error()
    if error not in _COLLISION_ERRORS:
        _raise_last_error("CreateDirectoryW", path)

def _directory_security_descriptor(source: Path, information: int) -> ctypes.Array:
    source_path = _extended_path(source)
    size = wintypes.DWORD()
    _GetFileSecurityW(source_path, information, None, 0, ctypes.byref(size))
    if ctypes.get_last_error() != _ERROR_INSUFFICIENT_BUFFER:
        _raise_last_error("GetFileSecurityW", source)
    descriptor = ctypes.create_string_buffer(size.value)
    if not _GetFileSecurityW(source_path, information, descriptor, size.value, ctypes.byref(size)):
        _raise_last_error("GetFileSecurityW", source)
    return descriptor

def _sid_text(sid: wintypes.LPVOID) -> str:
    value = wintypes.LPWSTR()
    if not _advapi32.ConvertSidToStringSidW(sid, ctypes.byref(value)):
        _raise_last_error("ConvertSidToStringSidW")
    try:
        return value.value
    finally:
        _kernel32.LocalFree(value)

@functools.cache
def _current_user_sid() -> str:
    token = wintypes.HANDLE(-4)  # GetCurrentProcessToken pseudo-handle.
    size = wintypes.DWORD()
    _advapi32.GetTokenInformation(token, 1, None, 0, ctypes.byref(size))
    if ctypes.get_last_error() != _ERROR_INSUFFICIENT_BUFFER:
        _raise_last_error("GetTokenInformation")
    user = ctypes.create_string_buffer(size.value)
    if not _advapi32.GetTokenInformation(token, 1, user, size, ctypes.byref(size)):
        _raise_last_error("GetTokenInformation")
    return _sid_text(wintypes.LPVOID.from_buffer(user))

def _output_directory_grants(handle: int, path: Path, *, expected_descriptor=None) -> int:
    """Inspect the descriptor of the opened directory, even if its pathname changes."""
    owner, acl, descriptor = wintypes.LPVOID(), wintypes.LPVOID(), wintypes.LPVOID()
    status = _advapi32.GetSecurityInfo(
        wintypes.HANDLE(handle),
        1,
        _OWNER_SECURITY_INFORMATION | _DACL_SECURITY_INFORMATION,
        ctypes.byref(owner),
        None,
        ctypes.byref(acl),
        None,
        ctypes.byref(descriptor),
    )
    if status:
        raise ctypes.WinError(status)
    try:
        if expected_descriptor is not None and _generated_directory_policy(
            descriptor
        ) != _generated_directory_policy(expected_descriptor):
            raise _invalid_path(path, "new scan directory lacks its private owner or DACL")
        trusted = {
            _current_user_sid(),
            "S-1-5-18",
            "S-1-5-32-544",  # Current user, SYSTEM, Administrators.
            "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464",  # TrustedInstaller.
        }
        if _sid_text(owner) not in trusted:
            raise _invalid_path(path, "Scan output directory must have a trusted owner.")
        return _output_dacl_grants(acl, trusted, path)
    finally:
        _kernel32.LocalFree(descriptor)

def _authenticated_account(sid: wintypes.LPVOID, trustee: str) -> bool:
    # The Guest account can have its own SID without Authenticated Users membership.
    if not trustee.startswith("S-1-5-21-") or trustee.endswith("-501"):
        return False
    name_size, domain_size, sid_type = (ctypes.pointer(wintypes.DWORD()) for _ in range(3))
    lookup = _advapi32.LookupAccountSidW
    lookup(None, sid, None, name_size, None, domain_size, sid_type)
    if ctypes.get_last_error() != _ERROR_INSUFFICIENT_BUFFER:
        return False
    name = ctypes.create_unicode_buffer(name_size.contents.value)
    domain = ctypes.create_unicode_buffer(domain_size.contents.value)
    found = lookup(None, sid, name, name_size, domain, domain_size, sid_type)
    return bool(found) and sid_type.contents.value == 1  # SidTypeUser

def _output_dacl_grants(acl: wintypes.LPVOID, trusted: set[str], path: Path) -> int:
    if not acl.value:  # A NULL DACL grants full access.
        return _OUTPUT_RIGHTS
    # Read ACEs in DACL order. A deny masks future grants for its trustee.
    denied: dict[str, int] = {}
    granted = 0
    for index in range(wintypes.WORD.from_address(acl.value + 4).value):  # ACL.AceCount
        ace = wintypes.LPVOID()
        if not _advapi32.GetAce(acl, index, ctypes.byref(ace)):
            _raise_last_error("GetAce", path)
        kind, flags, size = struct.unpack("<BBH", ctypes.string_at(ace, 4))
        if flags & 8 or kind in {10, 12}:  # INHERIT_ONLY or conditional deny.
            continue
        entry = ctypes.string_at(ace, size)
        mask = struct.unpack_from("<I", entry, 4)[0]
        if mask & 0x10000000:  # GENERIC_ALL
            mask |= _OUTPUT_RIGHTS
        if mask & _GENERIC_WRITE:
            mask |= _FILE_ADD_SUBDIRECTORY | _SET_REPARSE_POINT
        mask &= _OUTPUT_RIGHTS
        if not mask:
            continue
        offset = 8  # ACE_HEADER and ACCESS_MASK precede the trustee SID.
        if kind in {5, 6, 11}:
            object_flags = struct.unpack_from("<I", entry, offset)[0]
            offset += 4 + 16 * (object_flags & 3).bit_count()
            if kind == 6 and object_flags & 1:
                continue  # This deny is scoped to a particular object type.
        elif kind not in {0, 1, 9}:
            raise _invalid_path(path, "Unable to evaluate scan output directory permissions.")
        if len(entry) < offset + 8 or len(entry) < offset + 8 + 4 * entry[offset + 1]:
            raise _invalid_path(path, "Invalid scan output directory trustee.")
        sid = wintypes.LPVOID(ace.value + offset)
        trustee = _sid_text(sid)
        if trustee in trusted or trustee == "S-1-3-4":  # OWNER RIGHTS applies to the checked owner.
            continue
        if kind in {1, 6}:
            denied[trustee] = denied.get(trustee, 0) | mask
        else:
            blocked = denied.get(trustee, 0) | denied.get("S-1-1-0", 0)
            authenticated = denied.get("S-1-5-11", 0)
            if mask & authenticated and _authenticated_account(sid, trustee):
                blocked |= authenticated
            granted |= mask & ~blocked
    if granted & _CHANGE_ACL:
        granted |= _OUTPUT_RIGHTS
    return granted

def _require_stable_output(path: Path, parent_grants: int, child_grants: int = 0) -> None:
    can_remove = parent_grants & _FILE_DELETE_CHILD or child_grants & _DELETE
    can_replace = parent_grants & (_FILE_ADD_SUBDIRECTORY | _SET_REPARSE_POINT)
    if can_remove and can_replace:
        raise _invalid_path(path, "Scan output directory can be replaced by another user.")

@contextlib.contextmanager
def _checked_output_directory(path: Path) -> Iterator[tuple[int | None, int, int]]:
    """Hold the checked chain and expose its parent, final directory handle and grants."""
    parent_grants = 0
    parent = None
    with contextlib.ExitStack() as pins:
        for directory in (*reversed(path.parents), path):
            if parent is None:
                handle = _create_file(
                    directory,
                    access=_FILE_TRAVERSE | _FILE_READ_ATTRIBUTES | _READ_CONTROL,
                    share=_FILE_SHARE_READ | _FILE_SHARE_WRITE,
                    disposition=_OPEN_EXISTING,
                    flags=_FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT,
                )
                assert handle is not None
            else:
                error, child = _relative_output_directory(parent, directory.name)
                if error:
                    raise WindowsScanLocalPathError(
                        error, ctypes.FormatError(error), str(directory)
                    )
                handle = _OwnedHandle(child)
            pins.enter_context(handle)
            assert handle.value is not None
            _verify_directory(handle.value, directory)
            grants = _output_directory_grants(handle.value, directory)
            _require_stable_output(directory, parent_grants, grants)
            containing, parent, parent_grants = parent, handle.value, grants
        yield containing, parent, parent_grants

def require_windows_output_path(path: Path, *, writable_output: bool = False) -> None:
    with _checked_output_directory(path) as (_, _, grants):
        if writable_output and grants & _SET_REPARSE_POINT:
            raise _invalid_path(
                path, "Another user can turn the output directory into a reparse point when empty."
            )

DEEP_RESUME_DIRECTORY = ".codex-security-resume"

def deep_resume_output_identity(scan_dir: Path) -> list[int]:
    """Bind the output and its protected child while every directory is pinned."""
    retained = scan_dir / DEEP_RESUME_DIRECTORY
    with _checked_output_directory(retained) as (parent, child, grants):
        assert parent is not None
        return _pinned_resume_identity(parent, child, retained, grants)

def _full_directory_id(handle: int, path: Path) -> tuple[int, int] | None:
    info = _FileIdInfo()
    if not _GetFileInformationByHandleEx(
        handle, _FILE_ID_INFO_CLASS, ctypes.byref(info), ctypes.sizeof(info)
    ):
        if ctypes.get_last_error() in {50, 87}:  # ERROR_NOT_SUPPORTED or ERROR_INVALID_PARAMETER.
            return None
        _raise_last_error("GetFileInformationByHandleEx(FileIdInfo)", path)
    file_id = int.from_bytes(info.FileId, "little")
    if not file_id:
        raise _invalid_path(path, "The resume directory has no stable file identity.")
    return info.VolumeSerialNumber, file_id

def _resume_directory_id(handle: int, path: Path) -> tuple[int, int]:
    if (identity := _full_directory_id(handle, path)) is not None:
        return identity
    # Some filesystems expose only the legacy 64-bit file index.
    legacy = _ByHandleFileInformation()
    if not _GetFileInformationByHandle(handle, ctypes.byref(legacy)):
        _raise_last_error("GetFileInformationByHandle", path)
    file_id = (legacy.nFileIndexHigh << 32) | legacy.nFileIndexLow
    if not file_id:
        raise _invalid_path(path, "The resume directory has no stable file identity.")
    return legacy.dwVolumeSerialNumber, file_id

@contextlib.contextmanager
def pinned_resume_checkout(target: Path) -> Iterator[tuple[int, int] | None]:
    """Keep the canonical checkout fixed while reading its full native identity and snapshot."""
    with contextlib.ExitStack() as pins:
        for directory in (*reversed(target.parents), target):
            # A source provider directory may carry a reparse tag without redirecting its name.
            handle = _open_directory(directory, checkout=True)
            assert handle is not None
            pins.enter_context(handle)
        assert handle.value is not None
        yield _full_directory_id(handle.value, target)

def _pinned_resume_identity(parent: int, child: int, retained: Path, grants: int) -> list[int]:
    # A nonreplaceable, protected child keeps the scan root nonempty after
    # the sandbox receives Modify there. The caller holds both directories.
    if grants:
        raise _invalid_path(retained, "The retained resume directory must be protected.")
    return [*_resume_directory_id(parent, retained.parent), *_resume_directory_id(child, retained)]

class _UnicodeString(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.USHORT),
        ("capacity", wintypes.USHORT),
        ("text", wintypes.LPWSTR),
    ]

class _ObjectAttributes(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.ULONG),
        ("root", wintypes.HANDLE),
        ("name", ctypes.POINTER(_UnicodeString)),
        ("attributes", wintypes.ULONG),
        ("security", wintypes.LPVOID),
        ("qos", wintypes.LPVOID),
    ]

def _relative_output_directory(
    parent: int, basename: str, descriptor=None, *, rollback_handle: bool = False
) -> tuple[int, int | None]:
    """Open or create one component relative to its checked parent without reparsing it."""
    size = len(basename.encode("utf-16-le", errors="surrogatepass"))
    if size >= 1 << 16:  # UNICODE_STRING.Length is a byte count in a USHORT.
        return 206, None
    name = _UnicodeString(size, size, basename)
    attributes = _ObjectAttributes(
        ctypes.sizeof(_ObjectAttributes),
        parent,
        ctypes.pointer(name),
        0x40 | 0x1000,  # OBJ_CASE_INSENSITIVE | OBJ_DONT_REPARSE
        descriptor,
        None,
    )
    handle = wintypes.HANDLE()
    io_status = (ctypes.c_void_p * 2)()  # IO_STATUS_BLOCK
    status = _ntdll.NtCreateFile(
        ctypes.byref(handle),
        _FILE_TRAVERSE
        | _FILE_READ_ATTRIBUTES
        | _READ_CONTROL
        | 0x100000
        | (_DELETE if rollback_handle else 0),
        ctypes.byref(attributes),
        ctypes.byref(io_status),
        None,
        _FILE_ATTRIBUTE_NORMAL,
        0 if rollback_handle else _FILE_SHARE_READ | _FILE_SHARE_WRITE,
        1 if descriptor is None else 2,  # FILE_OPEN or FILE_CREATE
        0x200021,  # FILE_OPEN_REPARSE_POINT | FILE_SYNCHRONOUS_IO_NONALERT | FILE_DIRECTORY_FILE
        None,
        0,
    )
    return (_ntdll.RtlNtStatusToDosError(status), None) if status < 0 else (0, handle.value)

def create_windows_output_directory(path: Path, descriptor: wintypes.LPVOID) -> int:
    with _checked_output_directory(path.parent) as (_, parent, grants):
        _require_stable_output(path, grants)
        error, handle = _relative_output_directory(parent, path.name, descriptor)
        if not error:
            _close_handle(handle)
        return error

@contextlib.contextmanager
def _private_directory_descriptor(path: Path, *, explicit_owner: bool) -> Iterator[wintypes.LPVOID]:
    _require_windows()
    # Older supported Python releases ignore mkdir's 0700 mode on Windows.
    # Apply the same owner/SYSTEM/Administrators policy at creation so a
    # writable parent never becomes an inheritance window.
    volume = ctypes.create_unicode_buffer(32768)
    flags = wintypes.DWORD()
    if not _kernel32.GetVolumePathNameW(str(path.parent.resolve()), volume, len(volume)):
        raise ctypes.WinError(ctypes.get_last_error())
    if not _kernel32.GetVolumeInformationW(
        volume, None, 0, None, None, ctypes.byref(flags), None, 0
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    if not flags.value & 0x8:  # FILE_PERSISTENT_ACLS
        raise ValueError("Select a directory on a Windows volume that supports ACLs.")

    sid = _current_user_sid()
    owner = f"O:{sid}" if explicit_owner else ""
    dacl = f"{owner}D:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;FA;;;{sid})"

    descriptor = wintypes.LPVOID()
    if not _advapi32.ConvertStringSecurityDescriptorToSecurityDescriptorW(
        dacl, 1, ctypes.byref(descriptor), None
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        yield descriptor
    finally:
        _kernel32.LocalFree(descriptor)

def create_private_directory(path: Path, *, exist_ok: bool, scan_output: bool) -> Path:
    """Create one Windows directory with a protected inheritable DACL."""
    with _private_directory_descriptor(path, explicit_owner=not exist_ok) as descriptor:
        if scan_output:
            error = create_windows_output_directory(path, descriptor)
        else:
            attributes = _SecurityAttributes(ctypes.sizeof(_SecurityAttributes), descriptor, False)
            error = (
                0
                if _CreateDirectoryW(str(path), ctypes.byref(attributes))
                else ctypes.get_last_error()
            )
        if not error:
            return path if exist_ok else verify_private_scan_root(path, descriptor)
        if exist_ok and error == 183 and path.is_dir():  # ERROR_ALREADY_EXISTS
            if scan_output:
                require_windows_output_path(path)
            return path
        raise ctypes.WinError(error)

@contextlib.contextmanager
def create_deep_resume_output(scan_dir: Path, committed: Callable[[], bool]) -> Iterator[list[int]]:
    """Retain the exact creation handle through verification and database commit."""
    retained = scan_dir / DEEP_RESUME_DIRECTORY
    with (
        _private_directory_descriptor(retained, explicit_owner=True) as descriptor,
        _checked_output_directory(scan_dir) as (_, parent, grants),
    ):
        _require_stable_output(retained, grants)
        error, child = _relative_output_directory(
            parent, retained.name, descriptor, rollback_handle=True
        )
        if error:
            raise ctypes.WinError(error)
        assert child is not None
        with _OwnedHandle(child):
            try:
                _verify_directory(child, retained)
                child_grants = _output_directory_grants(
                    child, retained, expected_descriptor=descriptor
                )
                yield _pinned_resume_identity(parent, child, retained, child_grants)
            except BaseException:
                if not committed():
                    _mark_handle_for_deletion(child)
                raise

def create_directory_with_same_dacl(path: Path, source: Path) -> None:
    """Create an archive replacement with the original directory's DACL."""
    _require_windows()
    descriptor = _directory_security_descriptor(source, _DACL_SECURITY_INFORMATION)
    error = create_windows_output_directory(path, ctypes.cast(descriptor, wintypes.LPVOID))
    if error:
        raise WindowsScanLocalFileError(error, ctypes.FormatError(error), str(path))

@contextlib.contextmanager
def _locked_parent(
    scan_dir: Path,
    relative_path: str,
    *,
    create: bool,
    missing_is_path_error: bool = True,
    expected_root_identity: tuple[int, int] | None = None,
) -> Iterator[tuple[Path, str]]:
    """Hold non-deletable handles for every directory in the absolute target path."""

    _require_windows()
    parts = _validated_parts(relative_path)
    root_path, observed_root_identity = _canonical_scan_directory(scan_dir)
    if expected_root_identity is not None and observed_root_identity != expected_root_identity:
        raise _invalid_path(scan_dir, "scan directory changed after artifact restoration setup")
    handles: list[_OwnedHandle] = []
    try:
        # Absolute-path Win32 calls remain safe only while every ancestor is
        # fixed in place. Otherwise an attacker could rename an ancestor of the
        # scan root and substitute a different tree at the stored path.
        for directory_path in (*reversed(root_path.parents), root_path):
            directory_handle = _open_directory(directory_path)
            assert directory_handle is not None
            handles.append(directory_handle)
        try:
            current_root = root_path.lstat()
        except OSError as exc:
            if exc.errno not in {errno.ENOENT, errno.ENOTDIR, errno.ELOOP}:
                raise
            raise _invalid_path(
                scan_dir, f"scan directory changed while it was being opened: {exc}"
            ) from exc
        current_root_identity = (current_root.st_dev, current_root.st_ino)
        if current_root_identity != observed_root_identity or (
            expected_root_identity is not None and current_root_identity != expected_root_identity
        ):
            raise _invalid_path(scan_dir, "scan directory changed while it was being opened")
        current_path = root_path
        for component in parts[:-1]:
            current_path /= component
            child_handle = _open_directory(
                current_path, missing_ok=create, missing_is_path_error=missing_is_path_error
            )
            if child_handle is None:
                _create_directory(current_path)
                child_handle = _open_directory(current_path)
                assert child_handle is not None
            handles.append(child_handle)
        yield current_path, parts[-1]
    finally:
        for handle in reversed(handles):
            handle.close()

def _generated_directory_policy(descriptor: object) -> tuple[str, bool, frozenset[str]]:
    # Let Windows normalize SID aliases, access masks and inheritance flags in
    # both descriptors. ACE order is immaterial for our three allow grants.
    sddl = wintypes.LPWSTR()
    if not _advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW(
        descriptor,
        1,
        _OWNER_SECURITY_INFORMATION | _DACL_SECURITY_INFORMATION,
        ctypes.byref(sddl),
        None,
    ):
        _raise_last_error("ConvertSecurityDescriptorToStringSecurityDescriptorW")
    try:
        owner, _, dacl = sddl.value.partition("D:")
        flags, _, entries = dacl.partition("(")
        return owner, "P" in flags, frozenset(entries.removesuffix(")").split(")("))
    finally:
        _kernel32.LocalFree(sddl)

def verify_private_scan_root(scan_dir: Path, expected_descriptor: object) -> Path:
    """Verify the new directory's owner and protected grants while the path is pinned."""
    with _locked_parent(scan_dir, ".security", create=False) as (root_path, _):
        actual = _directory_security_descriptor(
            root_path, _OWNER_SECURITY_INFORMATION | _DACL_SECURITY_INFORMATION
        )
        if _generated_directory_policy(actual) != _generated_directory_policy(expected_descriptor):
            raise _invalid_path(scan_dir, "new scan directory lacks its private owner or DACL")
        return root_path

def scan_root_identity(scan_dir: Path) -> tuple[Path, tuple[int, int]]:
    """Return a canonical scan root and its identity while holding it fixed."""

    with _locked_parent(scan_dir, ".identity", create=False) as (root_path, _):
        metadata = root_path.lstat()
        return root_path, (metadata.st_dev, metadata.st_ino)

@contextlib.contextmanager
def pinned_root_git_marker(
    cwd: Path, metadata: Path, *, work_tree: Path | None = None
) -> Iterator[Path | None]:
    """Return a short explicit worktree marker while its cwd and Git metadata are pinned."""
    if work_tree is None:
        work_tree = cwd
    if (
        not cwd.is_absolute()
        or not metadata.is_absolute()
        or len(cwd.drive) != 2
        or len(metadata.drive) != 2
        or len(work_tree.parts) < 2
        or cwd.parts[: len(work_tree.parts)] != work_tree.parts
        or len(metadata.parts) < 2
        or _GetDriveTypeW(cwd.anchor) != _DRIVE_FIXED
        or _GetDriveTypeW(metadata.anchor) != _DRIVE_FIXED
    ):
        yield None
        return
    marker = None
    with contextlib.ExitStack() as pins:
        try:
            for path in (cwd, metadata):
                _validated_parts(PurePosixPath(*path.parts[1:]).as_posix())
                # Pin each literal ancestor before opening the next component. Never resolve
                # a repository-controlled reparse point to find the directory to be pinned.
                for directory in (*reversed(path.parents), path):
                    handle = _open_directory(directory)
                    assert handle is not None
                    pins.enter_context(handle)
                assert handle.value is not None
                if _final_path(handle.value) != _extended_path(path):
                    raise ValueError("the selected Git directory spelling is not canonical")
            root_marker = work_tree / ".git"
            reference = Path(os.path.relpath(root_marker, cwd))
            if str(root_marker) != str(metadata):
                # The literal canonical root is already pinned before opening its regular file.
                fd, leaf = open_read_fd_with_path(work_tree, ".git", "Git metadata pointer")
                pointer = pins.enter_context(os.fdopen(fd, "rb"))
                if leaf != ".git":
                    raise ValueError("the root marker name does not match .git")
                expected = f"gitdir: {metadata}".encode("utf-8")
                value = pointer.read(len(expected) + 3).removesuffix(b"\n").removesuffix(b"\r")
                if value.replace(b"/", b"\\") != expected:
                    raise ValueError("the root marker does not name the selected Git directory")
                # A deep scope can make the relative spelling longer than the gitfile itself.
                if len(os.fsencode(root_marker)) < len(os.fsencode(reference)):
                    reference = root_marker
            marker = reference
        except (OSError, ValueError):
            pins.close()
        yield marker

def pin_replay_metadata(
    pins: contextlib.ExitStack, metadata: Path | None, scratch: Path
) -> Path | None:
    """Bind the selected metadata and fresh private Windows scratch before copying into it."""
    if os.name != "nt" or metadata is None:
        return None
    try:
        with contextlib.ExitStack() as checked:
            checked.enter_context(_locked_parent(metadata, "HEAD", create=False))
            checked.enter_context(_locked_parent(scratch.parent, scratch.name, create=False))
            directory = _create_file(
                scratch,
                access=_FILE_TRAVERSE | _FILE_READ_ATTRIBUTES | _READ_CONTROL,
                share=_FILE_SHARE_READ | _FILE_SHARE_WRITE,
                disposition=_OPEN_EXISTING,
                flags=_FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT,
            )
            assert directory is not None and directory.value is not None
            checked.enter_context(directory)
            _verify_directory(directory.value, scratch)
            if _output_directory_grants(directory.value, scratch):
                return None
            pins.enter_context(checked.pop_all())
    except (OSError, ValueError):
        return None
    return metadata

@contextlib.contextmanager
def pinned_replay_gitfile(checkout: Path, metadata: Path) -> Iterator[Path]:
    """Keep Git's short metadata pointer outside the replay and immutable while Git uses it."""
    with _locked_parent(checkout, ".git", create=False):
        # Git reads this path relative to its unchanged worktree cwd. Both volumes'
        # literal ancestors are pinned, including the temporary directory above checkout.
        marker = checkout.parent / "reviewed.git"
        handle = _create_file(
            marker,
            access=_GENERIC_WRITE | _FILE_READ_ATTRIBUTES,
            share=_FILE_SHARE_READ,
            disposition=_CREATE_NEW,
            flags=_FILE_ATTRIBUTE_NORMAL | _FILE_FLAG_OPEN_REPARSE_POINT,
        )
        assert handle is not None and handle.value is not None
        with handle:
            _verify_regular_file(handle.value, marker)
            _write_all(handle.value, f"gitdir: {metadata.as_posix()}\n".encode("utf-8"))
            yield Path("..") / marker.name

def open_read_fd(scan_dir: Path, relative_path: str, context: str) -> int:
    """Open a verified regular file and return an owned binary read descriptor."""

    return open_read_fd_with_path(scan_dir, relative_path, context)[0]

def open_read_fd_with_path(scan_dir: Path, relative_path: str, context: str) -> tuple[int, str]:
    """Return an owned read descriptor and the scan-relative path with the file's actual leaf name.

    Verify the regular file while holding its parent directories. The caller must
    close the returned descriptor.
    """

    try:
        with _locked_parent(scan_dir, relative_path, create=False, missing_is_path_error=False) as (
            parent_path,
            leaf_name,
        ):
            path = parent_path / leaf_name
            handle = _create_file(
                path,
                access=_GENERIC_READ | _FILE_READ_ATTRIBUTES,
                # Denying write/delete sharing keeps the opened contents stable.
                share=_FILE_SHARE_READ,
                disposition=_OPEN_EXISTING,
                flags=_FILE_FLAG_OPEN_REPARSE_POINT,
            )
            assert handle is not None and handle.value is not None
            with handle:
                _verify_regular_file(handle.value, path)
                filename = Path(_final_path(handle.value)).name
                resolved_path = PurePosixPath(relative_path).with_name(filename).as_posix()
                raw_handle = handle.detach()
                try:
                    assert _msvcrt is not None
                    descriptor = _msvcrt.open_osfhandle(raw_handle, os.O_RDONLY | os.O_BINARY)
                    return descriptor, resolved_path
                except BaseException:
                    _close_handle(raw_handle)
                    raise
    except WindowsScanLocalFileError as exc:
        raise WindowsScanLocalFileError(
            exc.errno,
            f"{context}: {exc.strerror}",
            exc.filename,
        ) from exc

def file_change_time(descriptor: int) -> int:
    """Return the filesystem change time. Python's Windows st_ctime is creation time."""
    assert _msvcrt is not None
    info = _FileBasicInfo()
    if not _GetFileInformationByHandleEx(
        _msvcrt.get_osfhandle(descriptor), 0, ctypes.byref(info), ctypes.sizeof(info)
    ):
        _raise_last_error("GetFileInformationByHandleEx(FileBasicInfo)")
    return info.ChangeTime

def stream_matches_payload(stream: BinaryIO, payload: bytes) -> bool:
    """Compare bytes from the current stream position to payload, requiring EOF after the final byte."""
    offset = 0
    while offset < len(payload):
        chunk = stream.read(min(_MAX_COMPARE_CHUNK, len(payload) - offset))
        if not chunk or chunk != payload[offset : offset + len(chunk)]:
            return False
        offset += len(chunk)
    return stream.read(1) == b""

def _write_all(handle: int, payload: bytes) -> None:
    view = memoryview(payload)
    offset = 0
    while offset < len(view):
        chunk = bytes(view[offset : offset + _MAX_WRITE_CHUNK])
        buffer = ctypes.create_string_buffer(chunk, len(chunk))
        written = wintypes.DWORD()
        if not _WriteFile(handle, buffer, len(chunk), ctypes.byref(written), None):
            _raise_last_error("WriteFile")
        if written.value == 0:
            raise WindowsScanLocalFileError(errno.EIO, "WriteFile made no progress")
        offset += written.value
    if not _FlushFileBuffers(handle):
        _raise_last_error("FlushFileBuffers")

def _rename_handle(handle: int, destination_path: Path, replace_existing: bool) -> None:
    encoded_name = _extended_path(destination_path).encode("utf-16-le")
    file_name_offset = _FileRenameInfo.FileName.offset
    buffer_size = max(
        ctypes.sizeof(_FileRenameInfo),
        file_name_offset + len(encoded_name) + ctypes.sizeof(wintypes.WCHAR),
    )
    buffer = ctypes.create_string_buffer(buffer_size)
    info = ctypes.cast(buffer, ctypes.POINTER(_FileRenameInfo)).contents
    info.FlagsOrReplaceIfExists = int(replace_existing)
    # The fully qualified destination uses a null RootDirectory. Verified
    # directory handles remain open to prevent ancestor replacement.
    info.RootDirectory = None
    info.FileNameLength = len(encoded_name)
    ctypes.memmove(ctypes.addressof(buffer) + file_name_offset, encoded_name, len(encoded_name))
    if not _SetFileInformationByHandle(
        handle,
        _FILE_RENAME_INFO_CLASS,
        buffer,
        buffer_size,
    ):
        if not replace_existing and ctypes.get_last_error() in _COLLISION_ERRORS:
            raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), str(destination_path))
        _raise_last_error("SetFileInformationByHandle(FileRenameInfo)")

def _mark_handle_for_deletion(handle: int) -> None:
    info = _FileDispositionInfo(True)
    if not _SetFileInformationByHandle(
        handle,
        _FILE_DISPOSITION_INFO_CLASS,
        ctypes.byref(info),
        ctypes.sizeof(info),
    ):
        _raise_last_error("SetFileInformationByHandle(FileDispositionInfo)")

def _validate_existing_output(path: Path) -> bool:
    handle = _create_file(
        path,
        access=_FILE_READ_ATTRIBUTES,
        share=_FILE_SHARE_READ | _FILE_SHARE_WRITE | _FILE_SHARE_DELETE,
        disposition=_OPEN_EXISTING,
        flags=_FILE_FLAG_OPEN_REPARSE_POINT | _FILE_FLAG_BACKUP_SEMANTICS,
        missing_ok=True,
    )
    if handle is None:
        return False
    with handle:
        assert handle.value is not None
        _verify_regular_file(handle.value, path)
    return True

def _existing_output_matches(path: Path, payload: bytes) -> bool:
    try:
        handle = _create_file(
            path,
            access=_GENERIC_READ | _FILE_READ_ATTRIBUTES,
            # Deny write and delete sharing while comparing the opened contents.
            share=_FILE_SHARE_READ,
            disposition=_OPEN_EXISTING,
            flags=_FILE_FLAG_OPEN_REPARSE_POINT | _FILE_FLAG_BACKUP_SEMANTICS,
            missing_ok=True,
        )
    except WindowsScanLocalFileError as exc:
        if exc.errno in {
            _ERROR_ACCESS_DENIED,
            _ERROR_SHARING_VIOLATION,
            _ERROR_LOCK_VIOLATION,
        }:
            return False
        raise
    if handle is None:
        return False
    with handle:
        assert handle.value is not None
        _verify_regular_file(handle.value, path)
        raw_handle = handle.detach()
        try:
            assert _msvcrt is not None
            descriptor = _msvcrt.open_osfhandle(raw_handle, os.O_RDONLY | os.O_BINARY)
        except BaseException:
            _close_handle(raw_handle)
            raise
        try:
            with os.fdopen(descriptor, "rb") as stream:
                if os.fstat(stream.fileno()).st_size != len(payload):
                    return False
                return stream_matches_payload(stream, payload)
        except OSError:
            return False

@contextlib.contextmanager
def _written_temp(destination: Path, payload: bytes) -> Iterator[tuple[Path, _OwnedHandle]]:
    for _ in range(16):
        path = destination.with_name(f".{destination.name}.{secrets.token_hex(8)}.tmp")
        try:
            handle = _create_file(
                path,
                access=_GENERIC_WRITE | _DELETE | _FILE_READ_ATTRIBUTES,
                share=0,
                disposition=_CREATE_NEW,
                flags=_FILE_ATTRIBUTE_NORMAL,
            )
        except WindowsScanLocalFileError as exc:
            if exc.errno in _COLLISION_ERRORS:
                continue
            raise
        assert handle is not None and handle.value is not None
        with handle:
            try:
                _verify_regular_file(handle.value, path)
                _write_all(handle.value, payload)
                yield path, handle
            except BaseException:
                if handle.value is not None:
                    with contextlib.suppress(OSError):
                        _mark_handle_for_deletion(handle.value)
                raise
        return
    raise WindowsScanLocalFileError(errno.EEXIST, "could not allocate a unique temp file")

def _stage_metadata(
    handle: _OwnedHandle, *, close_writer: bool = False
) -> tuple[os.stat_result, int]:
    # Windows can update LastWriteTime on last writer close. Observe the same
    # file across that close, independently of whatever is now at the name.
    assert handle.value is not None and _msvcrt is not None
    raw = _ReOpenFile(
        handle.value,
        _FILE_READ_ATTRIBUTES,
        _FILE_SHARE_READ | _FILE_SHARE_WRITE | _FILE_SHARE_DELETE,
        0,
    )
    if raw is None or raw == _INVALID_HANDLE_VALUE:
        _raise_last_error("ReOpenFile")
    with _OwnedHandle(raw) as observer:
        descriptor = _msvcrt.open_osfhandle(raw, os.O_RDONLY | os.O_BINARY)
        observer.detach()
        try:
            if close_writer:
                handle.close()
            try:
                return os.fstat(descriptor), file_change_time(descriptor)
            except BaseException:
                if close_writer:
                    # The observer still identifies the staged file after the writer closed.
                    cleanup = _ReOpenFile(
                        raw, _DELETE, _FILE_SHARE_READ | _FILE_SHARE_WRITE | _FILE_SHARE_DELETE, 0
                    )
                    if cleanup and cleanup != _INVALID_HANDLE_VALUE:
                        with _OwnedHandle(cleanup), contextlib.suppress(OSError):
                            _mark_handle_for_deletion(cleanup)
                raise
        finally:
            os.close(descriptor)

@contextlib.contextmanager
def stage_write(
    scan_dir: Path,
    relative_path: str,
    payload: bytes,
    *,
    expected_root_identity: tuple[int, int] | None = None,
    replace_existing: bool = False,
) -> Iterator[Callable[..., tuple[os.stat_result, int]]]:
    """Flush a patch and keep only a movable handle to its root across admission."""
    if expected_root_identity is None:
        root = scan_dir.lstat()
        expected_root_identity = (root.st_dev, root.st_ino)
    with _locked_parent(
        scan_dir, relative_path, create=True, expected_root_identity=expected_root_identity
    ) as (parent, leaf):
        destination = parent / leaf
        if _validate_existing_output(destination) and not replace_existing:
            raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), str(destination))
        root_handle = _open_directory(scan_dir, movable=True)
        assert root_handle is not None
        try:
            with _written_temp(destination, payload) as (temp, writer):
                staged, change_time = _stage_metadata(writer, close_writer=True)
        except BaseException:
            root_handle.close()
            raise

    location = scan_dir
    published = False

    @contextlib.contextmanager
    def open_stage() -> Iterator[tuple[_OwnedHandle, Path]]:
        with _locked_parent(
            location, relative_path, create=False, expected_root_identity=expected_root_identity
        ) as (parent, leaf):
            path = parent / temp.name
            handle = _create_file(
                path,
                access=_DELETE | _FILE_READ_ATTRIBUTES,
                share=0,
                disposition=_OPEN_EXISTING,
                flags=_FILE_FLAG_OPEN_REPARSE_POINT | _FILE_FLAG_BACKUP_SEMANTICS,
            )
            assert handle is not None and handle.value is not None
            with handle:
                _verify_regular_file(handle.value, path)
                current, changed = _stage_metadata(handle)
                if not (
                    os.path.samestat(staged, current)
                    and staged.st_size == current.st_size
                    and staged.st_mtime_ns == current.st_mtime_ns
                    and change_time == changed
                ):
                    raise _invalid_path(path, "staged patch changed before publication")
                yield handle, parent / leaf

    def publish(directory: Path | None = None) -> tuple[os.stat_result, int]:
        nonlocal location, published
        if directory is not None:
            location = directory
        with open_stage() as (handle, destination):
            assert handle.value is not None
            _rename_handle(handle.value, destination, replace_existing)
            published = True
            _verify_regular_file(handle.value, destination)
            return _stage_metadata(handle)

    with root_handle:
        try:
            yield publish
        finally:
            if not published:
                # A different workbench database may own the archive move.
                assert root_handle.value is not None
                with contextlib.suppress(OSError):
                    location = Path(_final_path(root_handle.value))
                    while True:
                        try:
                            with open_stage() as (handle, _):
                                assert handle.value is not None
                                _mark_handle_for_deletion(handle.value)
                            break
                        except OSError:
                            # A move can land between locating the root and fixing its parents.
                            moved_to = Path(_final_path(root_handle.value))
                            if moved_to == location:
                                break
                            location = moved_to

def atomic_write(
    scan_dir: Path,
    relative_path: str,
    payload: bytes,
    *,
    expected_root_identity: tuple[int, int] | None = None,
    replace_existing: bool = True,
) -> None:
    """Atomically publish ``payload`` to a scan-local regular file."""
    with _locked_parent(
        scan_dir, relative_path, create=True, expected_root_identity=expected_root_identity
    ) as (parent, leaf):
        destination = parent / leaf
        if _validate_existing_output(destination) and not replace_existing:
            raise FileExistsError(errno.EEXIST, os.strerror(errno.EEXIST), str(destination))
        if (
            replace_existing
            and expected_root_identity is not None
            and _existing_output_matches(destination, payload)
        ):
            return
        with _written_temp(destination, payload) as (_, handle):
            assert handle.value is not None
            _rename_handle(handle.value, destination, replace_existing)
            _verify_regular_file(handle.value, destination)

def unlink_if_exists(scan_dir: Path, relative_path: str) -> None:
    """Delete a scan-local regular file or reparse-point leaf without following it."""

    with _locked_parent(scan_dir, relative_path, create=False) as (parent_path, leaf_name):
        path = parent_path / leaf_name
        handle = _create_file(
            path,
            access=_DELETE | _FILE_READ_ATTRIBUTES,
            # Deny delete sharing so an existing delete-capable handle makes
            # cleanup fail instead of moving the verified object before delete.
            share=_FILE_SHARE_READ | _FILE_SHARE_WRITE,
            disposition=_OPEN_EXISTING,
            flags=_FILE_FLAG_OPEN_REPARSE_POINT | _FILE_FLAG_BACKUP_SEMANTICS,
            missing_ok=True,
        )
        if handle is None:
            return
        with handle:
            assert handle.value is not None
            info = _attributes(handle.value)
            is_reparse_point = bool(info.FileAttributes & _FILE_ATTRIBUTE_REPARSE_POINT)
            is_directory = bool(info.FileAttributes & _FILE_ATTRIBUTE_DIRECTORY)
            if is_directory and not is_reparse_point:
                raise _invalid_path(path, "scan-local cleanup target must not be a directory")
            _verify_handle_path(handle.value, path, opened_name=is_reparse_point)
            _mark_handle_for_deletion(handle.value)

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/workbench/__init__.py`

```python
"""Persist workbench state, transfer scan ownership, and recover results from saved artifacts."""
```

## File: `scripts/workbench/handoff.py`

```python
"""Scan handoff state transitions for the Codex Security workbench."""

from __future__ import annotations

import argparse
import sqlite3
from typing import Any

from workbench_validation import optional_text, require_uuid

RECOVERY_HANDOFF_TOKEN_PREFIX = "recovery_"

def require_handoff_claim_token(value: str) -> str:
    """Normalize the claim UUID, retaining the prefix that marks a recovery handoff."""
    recovery_token = value.startswith(RECOVERY_HANDOFF_TOKEN_PREFIX)
    token = value.removeprefix(RECOVERY_HANDOFF_TOKEN_PREFIX) if recovery_token else value
    normalized = require_uuid(token, "claim-token")
    return f"{RECOVERY_HANDOFF_TOKEN_PREFIX}{normalized}" if recovery_token else normalized

def require_tokenless_scan_owner(
    connection: sqlite3.Connection,
    scan: sqlite3.Row,
    model_thread_id: str | None,
) -> None:
    """Check model callers against a recorded owner. Trusted local callers omit model_thread_id."""
    if model_thread_id is None or scan["handoff_claim_token"] is not None:
        return
    if scan["handoff_status"] == "pending":
        raise SystemExit(
            "This Codex Security scan handoff has not been delivered. "
            "Claim the pending Codex Security scan handoff before continuing."
        )
    owner = scan["continuation_thread_id"] or scan["deep_scan_owner_thread_id"]
    if owner is None:
        owner = connection.execute(
            "SELECT thread_id FROM workspaces WHERE id = ?", (scan["workspace_id"],)
        ).fetchone()[0]
    if owner is None:
        completed_import = scan["launch_kind"] == "import" and scan["status"] == "complete"
        if not completed_import:
            raise SystemExit("This scan is awaiting its owning Codex thread.")
    elif owner != model_thread_id:
        raise SystemExit("This scan requires its owning Codex thread.")

def require_current_continuation(
    scan: sqlite3.Row,
    claim_token: str | None,
    *,
    error_message: str,
) -> None:
    """Require the current claim token, allowing a tokenless continuation for legacy delivered scans."""
    if (
        scan["handoff_status"] == "delivered"
        and scan["handoff_claim_token"] is None
        and claim_token is None
    ):
        return
    if claim_token is None:
        raise SystemExit(error_message)
    if scan["handoff_claim_token"] != require_handoff_claim_token(claim_token):
        raise SystemExit(error_message)

def validate_handoff_delivery_thread(
    owning_thread_id: str | None,
    requesting_thread_id: str,
    claim_token: str,
) -> None:
    """Require the owning thread for delivery unless the caller presents a recovery claim token."""
    if owning_thread_id != requesting_thread_id and not claim_token.startswith(
        RECOVERY_HANDOFF_TOKEN_PREFIX
    ):
        raise SystemExit(
            "A scan handoff can only be marked delivered from its owning Codex thread."
        )

def claim_handoff_delivery(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Claim a pending handoff and return the current workspace state.

    The first claim wins. When take_over_stale is requested, replacing an expired
    claim also clears the continuation and deep scan owner. Retrying the same claim
    or losing a competing claim returns the workspace state without changing ownership.
    """
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    timestamp = wb.now()
    with connection:
        scan = wb.require_scan(connection, scan_id)
        if scan["handoff_status"] != "pending" or scan["handoff_claim_token"] == claim_token:
            return wb.workspace_state(connection, scan["workspace_id"])
        updated = connection.execute(
            """
            UPDATE scans
            SET handoff_claimed_at = ?, handoff_claim_token = ?,
                continuation_thread_id = CASE
                    WHEN handoff_claim_token IS NULL THEN continuation_thread_id
                    ELSE NULL
                END,
                deep_scan_owner_thread_id = CASE
                    WHEN handoff_claim_token IS NULL THEN deep_scan_owner_thread_id
                    ELSE NULL
                END,
                updated_at = ?
            WHERE id = ? AND handoff_status = 'pending'
                AND (
                    handoff_claim_token IS NULL
                    OR (
                        ? = 1
                        AND (handoff_claimed_at IS NULL OR handoff_claimed_at <= ?)
                    )
                )
            """,
            (
                timestamp,
                claim_token,
                timestamp,
                scan["id"],
                int(args.take_over_stale),
                wb.stale_claim_before(),
            ),
        )
        if updated.rowcount != 1:
            return wb.workspace_state(connection, scan["workspace_id"])
    return wb.workspace_state(connection, scan["workspace_id"])

def release_handoff_delivery(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Release a matching pending claim, detach its continuation, and return the workspace state."""
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    timestamp = wb.now()
    with connection:
        scan = wb.require_scan(connection, scan_id)
        connection.execute(
            """
            UPDATE scans
            SET handoff_claimed_at = NULL, handoff_claim_token = NULL,
                continuation_thread_id = NULL, deep_scan_owner_thread_id = NULL,
                updated_at = ?
            WHERE id = ? AND handoff_status = 'pending'
                AND handoff_claim_token = ?
            """,
            (timestamp, scan["id"], claim_token),
        )
    return wb.workspace_state(connection, scan["workspace_id"])

def attach_scan_continuation_thread(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Bind the claimed scan to a continuation and return its workspace state.

    An immediate transaction serializes ownership changes. Reattaching the same
    thread is idempotent. A different thread or mismatched claim token raises SystemExit.
    """
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    thread_id = optional_text(args.thread_id, maximum=512)
    if thread_id is None:
        raise SystemExit("Codex Security continuation thread ID is required.")
    connection.execute("BEGIN IMMEDIATE")
    with connection:
        timestamp = wb.now()
        scan = wb.require_scan(connection, scan_id)
        if scan["handoff_claim_token"] != claim_token:
            raise SystemExit("Codex Security continuation thread claim token does not match.")
        if scan["continuation_thread_id"] is not None:
            if scan["continuation_thread_id"] != thread_id:
                raise SystemExit(
                    "Codex Security scan continuation is owned by another continuation."
                )
            connection.commit()
            return wb.workspace_state(connection, scan["workspace_id"])
        connection.execute(
            """
            UPDATE scans
            SET continuation_thread_id = ?,
                deep_scan_owner_thread_id = CASE
                    WHEN mode = 'deep' THEN ? ELSE deep_scan_owner_thread_id
                END,
                updated_at = ?
            WHERE id = ? AND continuation_thread_id IS NULL
                AND handoff_claim_token = ?
            """,
            (thread_id, thread_id, timestamp, scan["id"], claim_token),
        )
    return wb.workspace_state(connection, scan["workspace_id"])

def mark_handoff_delivered(
    wb: Any,
    connection: sqlite3.Connection,
    args: argparse.Namespace,
) -> dict[str, Any]:
    """Record delivery for the pending claim and return the workspace state.

    For standard scans this resets preflight progress. The same claim can confirm
    delivery again. A conflicting claim or invalid requesting thread raises SystemExit.
    """
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    thread_id = optional_text(args.thread_id, maximum=512)
    connection.execute("BEGIN IMMEDIATE")
    with connection:
        timestamp = wb.now()
        scan = wb.require_scan(connection, scan_id)
        if thread_id is not None:
            workspace = wb.require_workspace(connection, scan["workspace_id"])
            validate_handoff_delivery_thread(
                scan["continuation_thread_id"] or workspace["thread_id"],
                thread_id,
                claim_token,
            )
        if scan["handoff_status"] == "delivered":
            if scan["handoff_claim_token"] != claim_token:
                raise SystemExit(
                    "Codex Security handoff delivery is owned by another continuation."
                )
        else:
            updated = connection.execute(
                """
                UPDATE scans
                SET handoff_status = 'delivered', handoff_claimed_at = NULL,
                    updated_at = ?
                WHERE id = ? AND handoff_status = 'pending'
                    AND handoff_claim_token = ?
                """,
                (timestamp, scan["id"], claim_token),
            )
            if updated.rowcount != 1:
                raise SystemExit("Codex Security handoff delivery could not be recorded.")
            if scan["mode"] != "deep":
                connection.execute(
                    """
                    UPDATE scan_progress
                    SET phase_items_total = 0, phase_items_completed = 0,
                        phase_progress_unit = 'checks',
                        preflight_checks_total = 0, preflight_checks_completed = 0,
                        updated_at = ?
                    WHERE scan_id = ?
                    """,
                    (timestamp, scan["id"]),
                )
        began_review = (
            args.return_context
            and thread_id is not None
            and args.occurrence_id is None
            and scan["mode"] == "standard"
            and scan["status"] == "running"
            and scan["canceled_at"] is None
            and scan["phase"] == "preflight"
        )
        if began_review:
            connection.execute(
                "UPDATE scans SET phase = 'threat_model', updated_at = ? WHERE id = ?",
                (timestamp, scan_id),
            )
            connection.execute(
                """UPDATE scan_progress SET phase_items_total = 0, phase_items_completed = 0,
                   phase_progress_unit = NULL, updated_at = ? WHERE scan_id = ?""",
                (timestamp, scan_id),
            )
    if not args.return_context:
        return wb.workspace_state(connection, scan["workspace_id"])
    context = wb.get_scan(
        connection,
        argparse.Namespace(
            scan_id=scan_id,
            occurrence_id=args.occurrence_id,
            model_thread_id=thread_id or "",
            context_claim_token=claim_token,
        ),
    )
    if began_review:
        context["beganStandardReview"] = True
    return context
```

## File: `scripts/workbench/retained_coverage.py`

_145 KB, too large to embed. Read it in the repository._

## File: `scripts/workbench/retained_records.py`

```python
"""Identify and recover records retained from saved scan evidence."""

from __future__ import annotations

import copy
import re
import unicodedata
from collections import Counter
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from finalize_scan_contract import (
    ContractError,
    _has_identity_text,
    _read_json,
    _recover_unsealed_coverage,
    _recover_unsealed_findings,
    _require_safe_json_value,
    _validate_schema_node,
    finding_candidate_id,
)
from finalize_scan_contract import _schema_values_equal as same_raw_value
from workbench.saved_coverage import _coverage_rows, _saved_coverage_id
from workbench.saved_sources import _digest, _encoded
from workbench_coverage_receipts import resolve_coverage_receipts

_FINDING_IDENTITY_SCHEMA = _read_json(
    Path(__file__).resolve().parents[2] / "schemas" / "findings.schema.json"
)["properties"]["findings"]["items"]["properties"]["identity"]

def _finding_identity(finding: dict[str, Any]) -> Any:
    provenance = finding.get("provenance")
    if isinstance(provenance, dict) and "preservedIdentity" in provenance:
        try:
            _validate_schema_node(
                provenance["preservedIdentity"], _FINDING_IDENTITY_SCHEMA, "finding.identity"
            )
        except ContractError:
            pass
        else:
            return provenance["preservedIdentity"]
    return finding.get("identity")

def _finding_key(finding: dict[str, Any], owner: str | None = None) -> str:
    # Wording and evidence may improve between checkpoints; distinct source locations
    # must not collide merely because two workers chose the same semantic identity.
    provenance = finding.get("provenance")
    identity = _finding_identity(finding)
    if not isinstance(identity, dict):
        normalized = dict(finding)
        normalized.pop("identity", None)
        _ensure_finding_identity(normalized)
        identity = normalized["identity"]
    owner = provenance.get("workerId", owner) if isinstance(provenance, dict) else owner
    parts = [finding.get("ruleId"), identity, _finding_locations(finding)]
    if owner is not None and finding_candidate_id(finding):
        parts.append(owner)
    return _digest(parts)

def _finding_locations(finding: dict[str, Any]) -> list[tuple[Any, Any, Any]]:
    locations = finding.get("locations", [])
    return sorted(
        (
            (
                location.get("path"),
                location.get("startLine"),
                location.get("endLine", location.get("startLine")),
            )
            for location in (locations if isinstance(locations, list) else [])
            if isinstance(location, dict)
        ),
        key=_encoded,
    )

def _worker_candidate_key(
    worker_id: str, candidate_id: str, finding: dict[str, Any]
) -> tuple[str, str, Any, Any, Any]:
    """Identify one worker-local candidate without merging unrelated locations."""
    identity = _finding_identity(finding)
    if not isinstance(identity, dict):
        normalized = dict(finding)
        _ensure_finding_identity(normalized)
        identity = normalized.get("identity")
    anchor = identity.get("anchor") if isinstance(identity, dict) else None
    instance = identity.get("instance") if isinstance(identity, dict) else None
    return worker_id, candidate_id, finding.get("ruleId"), anchor, instance

def _finding_content(finding: dict[str, Any]) -> dict[str, Any]:
    """Return substantive finding content without generated identity or provenance."""
    return {
        key: value
        for key, value in finding.items()
        if key not in {"findingId", "occurrenceId", "fingerprints", "identity", "provenance"}
    }

def _identity_candidate(finding: dict[str, Any]) -> str | None:
    return next(
        (
            value
            for section in (finding.get("extensions"), finding.get("provenance"))
            if isinstance(section, dict) and _has_identity_text(value := section.get("candidateId"))
        ),
        None,
    )

def _ensure_finding_identity(finding: Any) -> None:
    _ensure_finding_identities([finding])

def _semantic_identifier(value: str, fallback: str) -> str:
    normalized = re.sub(r"[\u0300-\u036f]", "", unicodedata.normalize("NFKD", value))
    identifier = re.sub(r"[^a-z0-9._/-]+", "-", normalized.lower())
    return re.sub(r"^[^a-z0-9]+|-+$", "", identifier) or fallback

def _semantic_identity_key(finding: dict[str, Any], identity: Any = None) -> bytes:
    identity = finding.get("identity") if identity is None else identity
    if isinstance(identity, dict):
        identity = {key: identity.get(key) for key in ("anchor", "instance")}
    return _encoded([finding.get("ruleId"), identity])

def _ensure_finding_identities(findings: list[Any], *, deep: bool = False) -> None:
    """Use the same candidate, anchor and sibling rules as draft publication."""
    anchors: dict[int, Any] = {}
    for index, finding in enumerate(findings):
        if not isinstance(finding, dict):
            continue
        identity = finding.get("identity")
        if "identity" in finding:
            anchors[index] = identity.get("anchor") if isinstance(identity, dict) else None
            continue
        candidate = _identity_candidate(finding)
        anchors[index] = _semantic_identifier(
            candidate or str(finding.get("title") or "finding"), f"finding-{index + 1}"
        )
    counts = Counter(
        _digest([findings[index].get("ruleId"), anchor]) for index, anchor in anchors.items()
    )

    authored = {
        _semantic_identity_key(finding)
        for finding in findings
        if isinstance(finding, dict) and "identity" in finding
    }
    generated = []
    for index, anchor in anchors.items():
        finding = findings[index]
        if "identity" in finding:
            continue
        identity = {"anchor": anchor}
        extensions = finding.get("extensions")
        sibling = next(
            (
                value
                for field in ("reportId", "ledgerRowId")
                if isinstance(extensions, dict)
                and _has_identity_text(value := extensions.get(field))
            ),
            None,
        )
        if sibling or counts[_digest([finding.get("ruleId"), anchor])] > 1:
            identity["instance"] = _semantic_identifier(
                sibling or str(finding.get("title") or "finding"), f"finding-{index + 1}"
            )
        finding["identity"] = identity
        generated.append(finding)

    reserved = {
        _semantic_identity_key(finding) for finding in findings if isinstance(finding, dict)
    }
    used = set() if deep else authored.copy()
    generated_ids = {id(finding) for finding in generated}
    for finding in findings if deep else generated:
        key = _semantic_identity_key(finding)
        if key in used or (id(finding) in generated_ids and key in authored):
            identity = finding["identity"]
            if id(finding) not in generated_ids:
                finding.setdefault("provenance", {}).setdefault(
                    "preservedIdentity", copy.deepcopy(identity)
                )
            base_instance = identity.get("instance", "saved")
            suffix = 2
            while True:
                identity["instance"] = f"{base_instance}-{suffix}"
                key = _semantic_identity_key(finding)
                if key not in reserved:
                    reserved.add(key)
                    break
                suffix += 1
        used.add(key)

def _retained_findings(finding: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Yield canonical and historical findings without trusting candidate IDs."""
    pending = [finding]
    seen: set[int] = set()
    while pending:
        current = pending.pop()
        marker = id(current)
        if marker in seen:
            continue
        seen.add(marker)
        yield current
        provenance = current.get("provenance")
        if not isinstance(provenance, dict):
            continue
        previous = provenance.get("previousFindings")
        if isinstance(previous, list):
            pending.extend(item for item in reversed(previous) if isinstance(item, dict))
        sources = provenance.get("sourceFindings")
        if isinstance(sources, list):
            pending.extend(
                source["finding"]
                for source in reversed(sources)
                if isinstance(source, dict) and isinstance(source.get("finding"), dict)
            )

def _append_previous_finding(
    item: dict[str, Any], finding: dict[str, Any], *, clone: bool = False
) -> None:
    if not isinstance(item.get("previousFindings"), list):
        item["previousFindings"] = []
    history = item["previousFindings"]
    if not any(
        isinstance(previous, dict)
        and _finding_key(previous) == _finding_key(finding)
        and _finding_content(previous) == _finding_content(finding)
        for previous in history
    ):
        history.append(copy.deepcopy(finding) if clone else finding)

def _recover_preserved_worker_source(
    scan_dir, relative, scan_id, binding, worker_id, worker, draft, warnings
):
    """Normalize findings and receipt references in the draft and return diagnostics for discarded findings."""
    discarded_findings = []
    # Recover imported records without relaxing canonical parent validation.
    if "complete" in draft and not isinstance(draft["complete"], bool):
        draft["complete"] = False
        warnings.append(f"{relative}: Invalid complete marker; retained as a progress checkpoint.")
    schema_dir = Path(__file__).resolve().parents[2] / "schemas"
    if "threatModel" in draft:
        try:
            model = draft["threatModel"]
            if isinstance(model, dict):
                model = {**model, "origin": "recovered"}
            schema = _read_json(schema_dir / "scan-manifest.schema.json")
            _validate_schema_node(
                model,
                schema["properties"]["scan"]["properties"]["threatModel"],
                "threatModel",
                schema,
            )
            _require_safe_json_value(model, "threatModel")
        except ContractError as exc:
            draft.pop("threatModel")
            warnings.append(f"{relative}: Skipped malformed threat model: {exc}.")
    directory = Path(relative).parent
    if directory.name == "checkpoints":
        directory = directory.parent
    recovered_findings = []
    for index, finding in enumerate(draft["findings"]):
        needs_identity = isinstance(finding, dict) and "identity" not in finding
        _ensure_finding_identity(finding)
        recovered = {"scanId": scan_id, "findings": [finding]}
        source_warnings: list[str] = []
        discarded = _recover_unsealed_findings(
            {"scan": {"id": scan_id, "target": binding["target"]}},
            recovered,
            schema_dir,
            scan_dir / directory,
            source_warnings,
            current_contract=True,
        )
        if discarded:
            discarded_findings.extend(discarded)
        for recovered_finding in recovered["findings"]:
            if needs_identity:
                # Reconcile anonymous revisions before assigning sibling identities.
                recovered_finding.pop("identity", None)
            writeup = recovered_finding.pop("writeup", None)
            if writeup is not None:
                source_warnings.append(
                    "Retained worker writeup at "
                    f"{directory.as_posix()}/{writeup['reportPath']}; "
                    "the parent report renders this finding inline."
                )
        recovered_findings.extend(recovered["findings"])
        warnings.extend(f"{relative} finding {index + 1}: {warning}" for warning in source_warnings)
    draft["findings"] = recovered_findings
    for field in ("surfaces", "explicitExclusions", "deferred", "openQuestions"):
        rows = draft["reviewState"].get(field)
        if not isinstance(rows, list):
            continue
        for index, row in enumerate(rows):
            if field == "openQuestions" and isinstance(row, str):
                row = rows[index] = {"question": row}
            if not isinstance(row, dict):
                continue
            row["workerId"] = worker_id
            if field == "surfaces":
                row["receiptRefs"] = resolve_coverage_receipts(
                    scan_dir,
                    row,
                    worker,
                    relative,
                )
    return discarded_findings

def _recover_preserved_worker_coverage(
    scan_dir, relative, worker_id, draft, discarded_findings, warnings
):
    """Repair coverage in the draft, append source warnings, and return whether coverage was discarded."""
    discarded_coverage = False
    for field in ("surfaces", "explicitExclusions", "deferred"):
        for row in _coverage_rows(draft["reviewState"], field):
            if isinstance(row, dict):
                row.setdefault("id", _saved_coverage_id(row))
                if field == "surfaces":
                    row.setdefault("receiptRefs", [])
    source_warnings = []
    discarded_fields = _recover_unsealed_coverage(
        draft["reviewState"],
        Path(__file__).resolve().parents[2] / "schemas",
        scan_dir,
        source_warnings,
        discarded_findings,
        # Reconcile local IDs and valid outcomes against worker history below.
        worker_draft=True,
    )
    if discarded_fields & {
        "surfaces",
        "explicitExclusions",
        "deferred",
        "resolvedDeferred",
    }:
        discarded_coverage = True
    for row in draft["reviewState"]["deferred"]:
        row["workerId"] = worker_id
    warnings.extend(f"{relative}: {warning}" for warning in source_warnings)
    return discarded_coverage

def identifiers(value: dict[str, Any]) -> tuple[Any, Any]:
    """Return the report ID and ledger row ID from extensions, using None for missing or blank IDs."""
    extensions = value.get("extensions")
    return tuple(
        identifier if _has_identity_text(identifier) else None
        for identifier in (
            extensions.get(field) if isinstance(extensions, dict) else None
            for field in ("reportId", "ledgerRowId")
        )
    )

def distinct_reports(left: dict[str, Any] | None, right: dict[str, Any] | None) -> bool:
    """Check the latest observations for conflicting report IDs or ledger row IDs."""
    return (
        left is not None
        and right is not None
        and any(
            a is not None and b is not None and a != b
            for a, b in zip(identifiers(left["latest"]), identifiers(right["latest"]), strict=True)
        )
    )

def raw_owner(value: dict[str, Any], source_owner: str | None) -> str | None:
    """Return the source owner, falling back to the worker ID recorded in finding provenance."""
    if source_owner is not None:
        return source_owner
    provenance = value.get("provenance", {})
    owner = provenance.get("workerId")
    return owner if isinstance(owner, str) else source_owner

def raw_scope(value: dict[str, Any]) -> tuple[Any, ...]:
    """Return the rule, path, and line range of the first location used to match anonymous reports."""
    # Match scanFindingIdentity's primary location for anonymous reports.
    location = value["locations"][0]
    return (
        value.get("ruleId"),
        location["path"],
        location["startLine"],
        location.get("endLine"),
    )

def same_raw_finding(left: dict[str, Any], right: dict[str, Any]) -> bool:
    """Check whether semantic identities match or, in their absence, whether candidate and report IDs are compatible."""
    if isinstance(left.get("identity"), dict) and isinstance(right.get("identity"), dict):
        return _semantic_identity_key(left, _finding_identity(left)) == _semantic_identity_key(
            right, _finding_identity(right)
        )
    candidates = (_identity_candidate(left), _identity_candidate(right))
    if all(candidates) and candidates[0] != candidates[1]:
        return False
    pairs = list(zip(identifiers(left), identifiers(right), strict=True))
    if any(a is not None for a, _ in pairs) and any(b is not None for _, b in pairs):
        if not any(a is not None and b is not None for a, b in pairs) or any(
            a is not None and b is not None and a != b for a, b in pairs
        ):
            return False
    return True

def same_raw_content(left: dict[str, Any], right: dict[str, Any]) -> bool:
    """Compare substantive finding fields while ignoring identity, provenance, and report-tracking IDs."""

    def content(value: dict[str, Any]) -> dict[str, Any]:
        result = _finding_content(value)
        if isinstance(result.get("extensions"), dict):
            result["extensions"] = {
                key: value
                for key, value in result["extensions"].items()
                if key not in {"candidateId", "reportId", "ledgerRowId"}
            }
            if not result["extensions"]:
                result.pop("extensions")
        return result

    return same_raw_value(content(left), content(right))

def contains_raw_value(current: Any, previous: Any) -> bool:
    """Check whether the current JSON value retains every part of the previous value.

    Match dictionary values by key and list elements by content, regardless of order.
    """
    if isinstance(previous, dict):
        return isinstance(current, dict) and all(
            key in current and contains_raw_value(current[key], value)
            for key, value in previous.items()
        )
    if isinstance(previous, list):
        return isinstance(current, list) and all(
            any(contains_raw_value(item, value) for item in current) for value in previous
        )
    return isinstance(current, bool) == isinstance(previous, bool) and current == previous

def _saved_outcome_receipts(scan_dir, relative, worker, field, item, coverage_schema):
    normalized = dict(item)
    if field == "surfaces":
        normalized.setdefault("id", _saved_coverage_id(item))
        normalized.setdefault("receiptRefs", [])
        if worker is not None:
            normalized["receiptRefs"] = resolve_coverage_receipts(
                scan_dir, normalized, worker, relative
            )
        verified = {
            "completeness": "partial",
            "surfaces": [normalized],
            "explicitExclusions": [],
            "deferred": [],
        }
        _recover_unsealed_coverage(
            verified, Path(__file__).resolve().parents[2] / "schemas", scan_dir, [], []
        )
        if (
            not verified["surfaces"]
            or verified["surfaces"][0]["disposition"] != item["disposition"]
        ):
            return None
        normalized = verified["surfaces"][0]
    try:
        _validate_schema_node(normalized, coverage_schema[field]["items"], f"coverage.{field}")
    except ContractError:
        return None
    return tuple(normalized.get("receiptRefs", [])) if field == "surfaces" else ()

def _conflicting_outcome_receipts(coverage, scan_dir, receipts):
    # Only a recovered surface can reserve the spelling that invalidates a second row.
    surfaces = _coverage_rows(coverage, "surfaces")
    projected = {
        "surfaces": [dict(row) if isinstance(row, dict) else row for row in surfaces],
        "deferred": [],
        "explicitExclusions": [],
    }
    _recover_unsealed_coverage(
        projected, Path(__file__).resolve().parents[2] / "schemas", scan_dir, [], []
    )
    kept = {ref.lower(): ref for row in projected["surfaces"] for ref in row["receiptRefs"]}
    for row in surfaces:
        if not (
            isinstance(row, dict)
            and isinstance(row.get("candidateId"), str)
            and row.get("disposition") in ("rejected", "not_applicable")
            and isinstance(row.get("receiptRefs"), list)
        ):
            continue
        normalized = {Path(ref).as_posix() for ref in row["receiptRefs"] if isinstance(ref, str)}
        if losing := {ref for ref in normalized & receipts if kept.get(ref.lower(), ref) != ref}:
            return losing
    return set()

def _saved_candidate_outcomes(
    scan_dir,
    current_drafts,
    valid_finding,
    coverage_candidate,
    candidate_order,
    workers_by_id,
    coverage_schema,
):
    """Return saved candidate outcomes with their evidence and the ordering of pending candidates by owner."""
    pending_candidate_orders: dict[tuple[str | None, str], tuple[int, int]] = {}
    outcomes = []
    for relative, draft, owner in current_drafts:
        reported_candidates = {
            finding_candidate_id(finding)
            for finding in draft["findings"]
            if isinstance(finding, dict) and valid_finding(finding)
        }
        pending_candidates = set()
        for field in ("deferred", "surfaces"):
            for item in _coverage_rows(draft["reviewState"], field):
                if isinstance(item, dict) and (
                    field == "deferred" or item.get("disposition") == "needs_follow_up"
                ):
                    if (pending := coverage_candidate(owner, item)) is not None:
                        if (
                            owner is not None
                            and pending[0] == owner
                            and pending[1] in reported_candidates
                        ):
                            continue
                        pending_candidates.add(pending)
                        order = candidate_order(relative, pending[0], item)
                        pending_candidate_orders[pending] = max(
                            pending_candidate_orders.get(pending, order), order
                        )
        for finding in draft["findings"]:
            if (
                isinstance(finding, dict)
                and valid_finding(finding)
                and (candidate_id := finding_candidate_id(finding))
            ):
                outcomes.append(
                    (
                        relative,
                        owner,
                        candidate_id,
                        "reported",
                        candidate_order(relative, owner),
                        (),
                    )
                )
        for field in ("surfaces", "explicitExclusions"):
            for item in _coverage_rows(draft["reviewState"], field):
                if (
                    isinstance(item, dict)
                    and isinstance(item.get("candidateId"), str)
                    and item.get("disposition") in ("reported", "rejected", "not_applicable")
                    and (candidate := coverage_candidate(owner, item)) is not None
                    and (item["disposition"] != "reported" or candidate[1] in reported_candidates)
                    and (candidate not in pending_candidates or item["disposition"] == "reported")
                ):
                    receipts = ()
                    if item["disposition"] != "reported":
                        receipts = _saved_outcome_receipts(
                            scan_dir,
                            relative,
                            workers_by_id.get(owner),
                            field,
                            item,
                            coverage_schema,
                        )
                        if receipts is None:
                            continue
                    outcomes.append(
                        (
                            relative,
                            candidate[0],
                            candidate[1],
                            item["disposition"],
                            candidate_order(relative, candidate[0], item),
                            receipts,
                        )
                    )
    return outcomes, pending_candidate_orders

def _competing_rejection_receipts(outcomes, all_sources, source_surface_receipts):
    receipt_spellings: dict[str, set[str]] = {}
    for _, _, _, _, _, receipts in outcomes:
        for ref in receipts:
            receipt_spellings.setdefault(ref.lower(), set()).add(ref)
    if receipt_spellings and any(
        isinstance(ref, str)
        and (spellings := receipt_spellings.get(Path(ref).as_posix().lower())) is not None
        and spellings != {Path(ref).as_posix()}
        for relative, draft, owner in all_sources
        for row in _coverage_rows(draft["reviewState"], "surfaces")
        if isinstance(row, dict)
        for refs in (source_surface_receipts(relative, row),)
        if isinstance(refs, list)
        for ref in refs
    ):
        return {ref for spellings in receipt_spellings.values() for ref in spellings}
    return set()
```

## File: `scripts/workbench/runtime_toml.py`

```python
"""Expose tomllib to workbench callers, using tomli on Python 3.10.

Import exits with setup guidance when the runtime is too old or the backport is missing.
"""

import sys

__all__ = ["tomllib"]

if sys.version_info < (3, 10):
    raise SystemExit(
        "Codex Security requires Python 3.10 or later. Update the Codex managed runtime "
        "or set PYTHON to a supported interpreter, then restart Codex."
    )

try:
    import tomllib as tomllib
except ModuleNotFoundError:  # Python 3.10
    try:
        import tomli as tomllib
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Codex Security requires tomli with Python 3.10. Install tomli for the selected "
            "interpreter or set PYTHON to Python 3.11 or later, then restart Codex."
        ) from exc
```

## File: `scripts/workbench/saved_coverage.py`

```python
"""Project saved worker coverage and reconcile its published parent copies."""

from __future__ import annotations

import copy
import hashlib
import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from finalize_scan_contract import (
    ContractError,
    _normalize_unsealed_open_questions,
    _read_json,
    _require_portable_relative_path,
    _validate_resolved_deferred,
    _validate_schema_node,
)

def _has_candidate_metadata(row: dict[str, Any]) -> bool:
    return any(key in row for key in ("candidateId", "candidate", "finding"))

def _coverage_rows(coverage: dict[str, Any], field: str) -> list[Any]:
    rows = coverage.get(field, [])
    return rows if isinstance(rows, list) else []

def _inherit_coverage_sources(
    row: Any,
    originals: list[Any],
    sources: dict[int, tuple[dict[str, Any], list[str]]],
) -> None:
    if not isinstance(row, dict):
        return
    for original in originals:
        saved = sources.get(id(original))
        if saved is None:
            continue
        # Retain the object as well as its ID while copies are reconciled.
        paths = sources.setdefault(id(row), (row, []))[1]
        for relative in saved[1]:
            if relative not in paths:
                paths.append(relative)

def _saved_coverage_id(item: dict[str, Any]) -> str:
    if candidate_id := item.get("candidateId"):
        return candidate_id
    payload = json.dumps(
        item, ensure_ascii=True, allow_nan=False, sort_keys=True, separators=(",", ":")
    ).encode()
    return f"saved-{hashlib.sha256(payload).hexdigest()[:16]}"

def _project_worker_coverage_row(item: Any, worker_id: str | None, field: str) -> Any:
    row = copy.deepcopy(item)
    if worker_id is None or not isinstance(row, dict):
        return row
    row["workerId"] = worker_id
    if field == "openQuestions":
        return row
    # Reconcile raw checkpoint identities first. Anonymous output rows use the
    # existing content identity, never their position in an earlier snapshot.
    row.setdefault("id", _saved_coverage_id(row))
    if isinstance(row.get("id"), str):
        row["id"] = f"{worker_id}/{row['id']}"
    if field == "deferred" and isinstance(row.get("surfaceIds"), list):
        row["surfaceIds"] = [
            f"{worker_id}/{identity}" if isinstance(identity, str) else identity
            for identity in row["surfaceIds"]
        ]
    return row

def _coverage_comparison_row(row: Any, field: str) -> Any:
    if field == "surfaces" and isinstance(row, dict):
        row = {"receiptRefs": [], **row}
        if isinstance(row["receiptRefs"], list):
            refs = []
            for ref in row["receiptRefs"]:
                if isinstance(ref, str):
                    try:
                        ref = _require_portable_relative_path(ref, "Saved coverage receipt")
                    except ContractError:
                        pass  # Leave malformed refs to the existing per-record recovery.
                refs.append(ref)
            row["receiptRefs"] = refs
        return row
    if field == "openQuestions":
        coverage = {"openQuestions": [copy.deepcopy(row)]}
        _normalize_unsealed_open_questions(coverage)
        return next(iter(coverage["openQuestions"]), row)
    return row

def _worker_coverage_sources(
    rows: list[Any], worker_id: str, field: str
) -> Iterator[tuple[Any, Any]]:
    """Match accepted aggregate IDs without changing raw recovery identities."""
    reserved = {
        row["id"] for row in rows if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    emitted: set[str] = set()
    for index, original in enumerate(rows):
        row = original
        if isinstance(row, dict) and field != "openQuestions":
            row = row.copy()
            generated = not isinstance(row.get("id"), str)
            identity = str(index) if generated else row["id"]
            base = identity
            if generated or identity in emitted:
                suffix = 2
                while identity in reserved:
                    identity = f"{base}-{suffix}"
                    suffix += 1
            reserved.add(identity)
            emitted.add(identity)
            row["id"] = identity
        qualified = _project_worker_coverage_row(row, worker_id, field)
        yield _coverage_comparison_row(qualified, field), original

_Row = dict[str, Any]
_LegacySurfaceLink = tuple[_Row, str, _Row, _Row, _Row | None]

def prepare_saved_coverage_projection(
    sources: list[tuple[str, dict[str, Any], str | None]],
    parent: dict[str, Any] | None,
    source_order: dict[str, tuple[int, int]],
    *,
    project_worker_coverage: bool,
    receipt_resolver,
    preserve_canonical_parent=False,
) -> tuple[bool, list[_LegacySurfaceLink]]:
    """Put bound worker evidence in parent coordinates without changing source files."""
    if preserve_canonical_parent:
        return False, []
    # Older parent publications use worker/id identities. Reconcile those copies
    # against their bound sources before projecting accepted attempt provenance.
    workers = {owner for _, _, owner in sources if owner is not None}
    parents = [
        draft
        for _, draft, owner in sorted(
            sources, key=lambda source: source_order[source[0]], reverse=True
        )
        if owner is None
    ]
    if parent is not None:
        # Prefer the selected parent over historical copies of a task's surface.
        parents.insert(0, parent)
    fields = ("surfaces", "explicitExclusions", "deferred", "openQuestions")
    if not project_worker_coverage:
        project_worker_coverage = any(
            isinstance(row, dict)
            and isinstance(row.get("workerId"), str)
            and row["workerId"] in workers
            and (
                field == "openQuestions"
                or (isinstance(row.get("id"), str) and row["id"].startswith(f"{row['workerId']}/"))
            )
            for draft in parents
            for field in fields
            for row in _coverage_rows(draft["reviewState"], field)
        )
    if not project_worker_coverage:
        return False, []
    missing = object()
    original_owners = {}
    projected: dict[str, list[tuple[Any, Any]]] = {field: [] for field in fields}
    surface_links: list[_LegacySurfaceLink] = []
    for relative, draft, owner in sources:
        if owner is None:
            continue
        for field in fields:
            rows = _coverage_rows(draft["reviewState"], field)
            for index, row in enumerate(rows):
                if field == "openQuestions" and isinstance(row, str):
                    row = {"question": row}
                    rows[index] = row
                if not isinstance(row, dict):
                    continue
                original_owners.setdefault(id(row), row.get("workerId", missing))
                row["workerId"] = owner
                if field == "surfaces":
                    row["receiptRefs"] = receipt_resolver(relative, row, owner)
            projected[field].extend(_worker_coverage_sources(rows, owner, field))

    def originals(field: str, row: Any):
        comparison = _coverage_comparison_row(row, field)
        return (
            original
            for aggregate, original in projected[field]
            if aggregate is comparison or aggregate == comparison
        )

    # A canonical aggregate contains copies of the same worker evidence. Let
    # the existing per-worker chronology reconcile those originals exactly once.
    # Keep parent-only evidence when its bound worker source is unavailable.
    for draft in parents:
        review = draft["reviewState"]
        if not review:
            continue
        for field in fields:
            rows = review.get(field, [])
            if not isinstance(rows, list):
                continue
            remaining = []
            for row in rows:
                matches = originals(field, row)
                first = next(matches, missing)
                if first is missing:
                    remaining.append(row)
                    continue
                if (
                    field != "surfaces"
                    or not isinstance(row, dict)
                    or not isinstance(row.get("id"), str)
                ):
                    continue
                surface_sources = [first, *matches]
                for task in _coverage_rows(review, "deferred"):
                    if (
                        isinstance(task, dict)
                        and isinstance(task.get("surfaceIds"), list)
                        and row["id"] in task["surfaceIds"]
                    ):
                        source_task = next(originals("deferred", task), None)
                        surface_links.extend(
                            (task, row["id"], source, row, source_task)
                            for source in surface_sources
                        )
            review[field] = remaining
    # A selected parent may also be the result registered for a worker.
    # Restore the retained input rows after comparing the published worker IDs.
    for _, draft, owner in sources:
        if owner is not None:
            for field in fields:
                for row in _coverage_rows(draft["reviewState"], field):
                    if isinstance(row, dict):
                        previous = original_owners[id(row)]
                        if previous is missing:
                            row.pop("workerId", None)
                        else:
                            row["workerId"] = previous
    return True, surface_links

class SavedCoverageProjection:
    """Track which worker supplied a coverage row so reconstructed links can resolve to the retained surface."""

    def __init__(self, project_worker_coverage, legacy_surface_links, projection_origins):
        self.project_worker_coverage = project_worker_coverage
        self.legacy_surface_links = legacy_surface_links
        self.legacy_source_outputs: dict[int, dict[str, Any]] = {}
        self.worker_row_owners: dict[int, str] = {}
        self.worker_surface_outputs: dict[tuple[str, str], dict[int, dict[str, Any]]] = {}
        self.projection_origins = projection_origins

    def source_owner(self, row, fallback=None):
        origin = self.projection_origins.get(id(row))
        return origin[0] if origin is not None else fallback

    def record_coverage_owner(self, retained, original, owner, field):
        if self.project_worker_coverage and owner is not None and isinstance(retained, dict):
            self.worker_row_owners[id(retained)] = owner
            if field == "surfaces" and isinstance(original.get("id"), str):
                self.worker_surface_outputs.setdefault((owner, original["id"]), {})[
                    id(retained)
                ] = retained

    def retain_coverage_row(self, output, item, owner, field, original=None, qualified=False):
        retained = (
            copy.deepcopy(item)
            if qualified or not self.project_worker_coverage
            else _project_worker_coverage_row(item, owner, field)
        )
        if retained not in output:
            output.append(retained)
        retained = output[output.index(retained)]
        if isinstance(retained, dict) and original is not None:
            self.legacy_source_outputs[id(original)] = retained
        self.record_coverage_owner(
            retained, original if original is not None else item, owner, field
        )
        return retained

    def retained_record(self, coverage, field, item, canonical_record):
        item = canonical_record(field, item)
        if field == "surfaces":
            # Canonical IDs can change while source content and ownership stay the same.
            item = {key: value for key, value in item.items() if key != "id"}
        for record in _coverage_rows(coverage, field):
            if not isinstance(record, dict):
                continue
            original = dict(canonical_record(field, record))
            if "id" not in item:
                original.pop("id", None)  # Canonical publication can assign an ID.
            if field == "openQuestions":
                # Compare the same canonical form that publication writes.
                previous_question = {"openQuestions": [original]}
                source_question = {"openQuestions": [item]}
                _normalize_unsealed_open_questions(previous_question)
                _normalize_unsealed_open_questions(source_question)
                if previous_question == source_question:
                    return record
            elif original == item:
                return record
        return None

    def linked_surface(self, surface, outputs, named_outputs):
        owner = self.source_owner(surface, surface.get("workerId"))
        retained = outputs.get(id(surface))
        if retained is None and isinstance(owner, str) and isinstance(surface.get("id"), str):
            matches = named_outputs.get((owner, surface["id"]), {})
            if len(matches) == 1:
                retained = next(iter(matches.values()))
        return retained

    def is_reviewed_worker(self, canonical, worker):
        if (
            worker is None
            or not {"status", "merge_state", "attempt"}.issubset(worker.keys())
            or worker["status"] != "succeeded"
            or worker["merge_state"] != "merged"
        ):
            return False
        return any(
            isinstance(review, dict)
            and review.get("workerId") == worker["id"]
            and review.get("attempt") == worker["attempt"]
            for review in _coverage_rows(canonical, "reviews")
        )

    def repair_reviewed_surface(self, coverage, canonical, worker, source, surface):
        if not self.is_reviewed_worker(canonical, worker):
            return None
        published = next(
            (
                row
                for row in canonical.get("surfaces", [])
                if isinstance(row, dict)
                and isinstance(provenance := row.get("provenance"), dict)
                and provenance.get("workerId") == worker["id"]
                and provenance.get("attempt") == worker["attempt"]
                and provenance.get("sourceId") == surface.get("id")
                and row.get("disposition") == surface.get("disposition")
            ),
            None,
        )
        if published is None:
            return None
        retained = next(
            (
                row
                for row in coverage["surfaces"]
                if row.get("id") == published.get("id")
                and row.get("provenance") == published.get("provenance")
            ),
            None,
        )
        if retained is None:
            retained = copy.deepcopy(published)
        # Receipt repair can recover earlier evidence without replacing the
        # accepted surface's identity, disposition, or host-owned provenance.
        retained["receiptRefs"] = surface["receiptRefs"]
        return self.retain_coverage_row(
            coverage["surfaces"], retained, worker["id"], "surfaces", source, True
        )

    def task_surface_links(self, candidates):
        for task, published_id, surface, parent_surface, task_source in self.legacy_surface_links:
            expected = None
            if task_source is not None:
                task_owner = self.source_owner(task_source)
                expected = self.legacy_source_outputs.get(id(task_source))
                if expected is None:
                    expected = _project_worker_coverage_row(task_source, task_owner, "deferred")
            for owner, retained in candidates:
                if retained == task or (
                    expected is not None
                    and (
                        retained is expected
                        or (
                            owner == task_owner
                            and isinstance(retained, dict)
                            and retained.get("id") == expected.get("id")
                            and isinstance(retained.get("surfaceIds"), list)
                            and published_id in retained["surfaceIds"]
                        )
                    )
                ):
                    yield retained, published_id, surface, parent_surface

    def finalize(
        self,
        coverage,
        canonical_rows,
        digest,
        *,
        preserve_canonical_parent,
        all_sources,
        source_order,
        coverage_sources,
        surface_ids_by_source,
        retained_surface_rows,
        resolved,
    ):

        source_owners = {relative: owner for relative, _, owner in all_sources}
        recovered_worker_ids = {
            worker_id for _, _, worker_id in all_sources if worker_id is not None
        }
        surface_positions: dict[str, int] = {}
        resolved_surface_targets: dict[tuple[str | None, str], list[str]] = {}

        def remember_surface_id(item: dict[str, Any], local_id: str) -> None:
            final_id = item["id"]
            surface_positions.setdefault(final_id, len(surface_positions))
            shadowed_alias = (
                self.project_worker_coverage
                and id(item) not in named_surface_outputs
                and (named := worker_surfaces.get((self.worker_row_owners.get(id(item)), local_id)))
                is not None
                and id(named) in named_surface_outputs
            )
            for relative in coverage_sources.get(id(item), (item, []))[1]:
                # A candidate-derived ID cannot claim a link explicitly naming another surface.
                if not shadowed_alias:
                    targets = surface_ids_by_source.setdefault((relative, local_id), [])
                    if final_id not in targets:
                        targets.append(final_id)
                candidate_id = item.get("candidateId")
                if isinstance(candidate_id, str):
                    key = (source_owners[relative], candidate_id)
                    if key in resolved and resolved[key] == item.get("disposition"):
                        targets = resolved_surface_targets.setdefault(key, [])
                        if final_id not in targets:
                            targets.append(final_id)

        retained_legacy_surface_links: dict[
            int, tuple[dict[str, Any], dict[str, dict[str, Any]]]
        ] = {}
        output_tasks = _coverage_rows(coverage, "deferred")
        task_candidates = [(self.worker_row_owners.get(id(row)), row) for row in output_tasks]
        for task, published_id, surface, _ in self.task_surface_links(task_candidates):
            retained_surface = self.linked_surface(
                surface,
                self.legacy_source_outputs,
                self.worker_surface_outputs,
            )
            if retained_surface is not None and isinstance(retained_surface.get("id"), str):
                _, links = retained_legacy_surface_links.setdefault(id(task), (task, {}))
                links.setdefault(published_id, retained_surface)
        # A newer worker checkpoint may omit a surface still needed by a retained
        # task. Restore its parent copy only when no worker replacement survived.
        for task, published_id, surface, parent_surface in self.task_surface_links(task_candidates):
            _, links = retained_legacy_surface_links.setdefault(id(task), (task, {}))
            if published_id not in links and isinstance(coverage.get("surfaces"), list):
                retained_surface = self.retain_coverage_row(
                    coverage["surfaces"], parent_surface, None, "surfaces"
                )
                self.record_coverage_owner(
                    retained_surface,
                    surface,
                    self.source_owner(surface, surface.get("workerId")),
                    "surfaces",
                )
                _inherit_coverage_sources(retained_surface, [parent_surface], coverage_sources)
                links[published_id] = retained_surface
        if self.project_worker_coverage:
            worker_surfaces: dict[tuple[str, str], dict[str, Any]] = {}
            named_surface_outputs = {
                identity for outputs in self.worker_surface_outputs.values() for identity in outputs
            }
            for surface in _coverage_rows(coverage, "surfaces"):
                if not isinstance(surface, dict):
                    continue
                owner, identity = self.worker_row_owners.get(id(surface)), surface.get("id")
                if isinstance(owner, str) and isinstance(identity, str):
                    key = (owner, identity)
                    existing = worker_surfaces.get(key)
                    # An anonymous candidate ID can collide with an explicit surface ID.
                    # Bind a named worker link to the explicitly named source.
                    if existing is None or (
                        id(surface) in named_surface_outputs
                        and id(existing) not in named_surface_outputs
                    ):
                        worker_surfaces[key] = surface
            for task in output_tasks:
                if (
                    not isinstance(task, dict)
                    or (owner := self.worker_row_owners.get(id(task))) is None
                    or not isinstance(task.get("surfaceIds"), list)
                ):
                    continue
                for identity in task["surfaceIds"]:
                    if (
                        isinstance(identity, str)
                        and (surface := worker_surfaces.get((owner, identity))) is not None
                    ):
                        _, links = retained_legacy_surface_links.setdefault(id(task), (task, {}))
                        links.setdefault(identity, surface)
        for field in ("surfaces", "explicitExclusions", "deferred"):
            used: set[str] = set()
            items = coverage.setdefault(field, [])
            reserved = {
                row["id"]
                for row in (items if isinstance(items, list) else [])
                if isinstance(row, dict) and isinstance(row.get("id"), str)
            }
            normalized_items = []
            for item in items if isinstance(items, list) else []:
                normalized_items.append(item)
                if not isinstance(item, dict):
                    continue
                if id(item) in canonical_rows:
                    if isinstance(item.get("id"), str):
                        used.add(item["id"])
                        if field == "surfaces":
                            remember_surface_id(item, item["id"])
                    continue
                item.setdefault("id", _saved_coverage_id(item))
                if not isinstance(item["id"], str):
                    # Preserve malformed rows for per-record recovery, including frozen replay.
                    continue
                local_id = item["id"]
                scoped = (
                    preserve_canonical_parent
                    and isinstance(worker_id := item.get("workerId"), str)
                    and worker_id in recovered_worker_ids
                )
                if scoped:
                    # Resolve worker-local candidate/deferred history before scoping IDs.
                    item["id"] = f"{worker_id}/{item['id']}"
                if isinstance(item.get("surfaceIds"), list):
                    links: list[Any] = []
                    for surface_id in item["surfaceIds"]:
                        targets: list[str] = []
                        declared = False
                        if field == "deferred" and isinstance(surface_id, str):
                            for relative in coverage_sources.get(id(item), (item, []))[1]:
                                source_key = (relative, surface_id)
                                history_keys = [source_key]
                                if source_key not in surface_ids_by_source:
                                    # A deferred-only checkpoint can refer to an earlier
                                    # observation from this logical worker, including retries.
                                    # Reused IDs can denote several retained observations.
                                    history_keys = [
                                        (historical, surface_id)
                                        for historical, _, owner in all_sources
                                        if owner == source_owners[relative]
                                        and source_order[historical] <= source_order[relative]
                                    ]
                                for key in history_keys:
                                    declared |= key in surface_ids_by_source
                                    for target in surface_ids_by_source.get(key, []):
                                        if target not in targets:
                                            targets.append(target)
                        if targets:
                            targets.sort(key=surface_positions.__getitem__)
                            for target in targets:
                                if target not in links:
                                    links.append(target)
                        elif not declared:
                            links.append(
                                f"{worker_id}/{surface_id}"
                                if scoped and isinstance(surface_id, str)
                                else surface_id
                            )
                    item["surfaceIds"] = links
                if scoped:
                    if preserve_canonical_parent and item in normalized_items[:-1]:
                        # A previous finish may have published files before its DB commit.
                        if field == "surfaces":
                            remember_surface_id(item, local_id)
                        normalized_items.pop()
                        continue
                if item["id"] in used:
                    if self.project_worker_coverage:
                        base = item["id"]
                        suffix = 2
                        while item["id"] in used or item["id"] in reserved:
                            item["id"] = f"{base}-{suffix}"
                            suffix += 1
                    else:
                        item["id"] = f"{item['id']}-{digest(item)[:16]}"
                if preserve_canonical_parent and item in normalized_items[:-1]:
                    if field == "surfaces":
                        remember_surface_id(item, local_id)
                    normalized_items.pop()
                    continue
                used.add(item["id"])
                if field == "surfaces":
                    item.setdefault("receiptRefs", [])
                    remember_surface_id(item, local_id)
            if preserve_canonical_parent and isinstance(items, list):
                coverage[field] = normalized_items
            if field == "surfaces":
                # Candidate resolution replaces pending surfaces independently of generic
                # tasks. Preserve their original links, even when the outcome changes ID
                # or a distinct retained surface shares the old source-local ID.
                for relative, draft, owner in all_sources:
                    for original in _coverage_rows(draft["reviewState"], "surfaces"):
                        if (
                            not isinstance(original, dict)
                            or id(original) in retained_surface_rows
                            or original.get("disposition") != "needs_follow_up"
                            or not isinstance(local_id := original.get("id"), str)
                            or not isinstance(candidate_id := original.get("candidateId"), str)
                        ):
                            continue
                        targets = surface_ids_by_source.setdefault((relative, local_id), [])
                        for target in resolved_surface_targets.get((owner, candidate_id), []):
                            if target not in targets:
                                targets.append(target)
        for task, links in retained_legacy_surface_links.values():
            task["surfaceIds"] = [
                links[identity]["id"]
                if isinstance(identity, str) and identity in links
                else identity
                for identity in task["surfaceIds"]
            ]

    def fallback_surfaces(
        self,
        coverage,
        all_sources,
        prospective_tasks,
        *,
        surface_is_retained,
        ambiguous_surface_ids,
    ):
        fallback_surfaces = []
        if self.legacy_surface_links and isinstance(coverage.get("surfaces"), list):
            # Plan the surviving associations before historical receipts can claim
            # a spelling needed by a surface that must be restored for its task.
            prospective_tasks = [
                (owner, _project_worker_coverage_row(row, owner, "deferred"))
                for owner, row in prospective_tasks
            ]
            prospective_surfaces = {}
            prospective_named = {}
            for relative, draft, owner in all_sources:
                for row in _coverage_rows(draft["reviewState"], "surfaces"):
                    if owner is None or not isinstance(row, dict):
                        continue
                    emitted = surface_is_retained(relative, owner, row)
                    ambiguous = (
                        isinstance(row.get("id"), str)
                        and (owner, row["id"]) in ambiguous_surface_ids
                        and row.get("disposition") == "needs_follow_up"
                        and not any(key in row for key in ("candidateId", "candidate", "finding"))
                    )
                    if not emitted and not ambiguous:
                        continue
                    projected = _project_worker_coverage_row(row, owner, "surfaces")
                    if isinstance(row.get("id"), str):
                        named = prospective_named.setdefault((owner, row["id"]), {})
                        projected = next(
                            (existing for existing in named.values() if existing == projected),
                            projected,
                        )
                        named[id(projected)] = projected
                    if emitted:
                        prospective_surfaces[id(row)] = projected
            bound = {
                (id(retained), published_id)
                for retained, published_id, surface, _ in self.task_surface_links(prospective_tasks)
                if self.linked_surface(surface, prospective_surfaces, prospective_named) is not None
            }
            for retained, published_id, _, parent_surface in self.task_surface_links(
                prospective_tasks
            ):
                key = (id(retained), published_id)
                if key not in bound:
                    fallback_surfaces.append(parent_surface)
                    bound.add(key)
        return fallback_surfaces

def _resolved_deferred_rows(draft: dict[str, Any], schema: dict[str, Any]) -> list[dict[str, Any]]:
    if draft.get("complete") is False:
        return []
    coverage = draft["reviewState"]
    rows = coverage.get("resolvedDeferred", [])
    try:
        # Invalid closure metadata cannot discard the evidence it names.
        _validate_schema_node(rows, schema, "coverage.resolvedDeferred")
        _validate_resolved_deferred({**coverage, "deferred": _coverage_rows(coverage, "deferred")})
    except ContractError:
        return []
    return rows

def _project_worker_closure(
    relative: str,
    owner: str,
    closure: dict[str, Any],
    worker_attempts: dict[str, tuple[str, int]],
    source_order: dict[str, tuple[int, int]],
) -> dict[str, Any]:
    directory = Path(relative).parent
    if directory.name == "checkpoints":
        directory = directory.parent
    _, attempt = worker_attempts.get(directory.as_posix(), (owner, source_order[relative][0]))
    return {
        "id": f"{owner}-attempt-{attempt}-resolved-{closure['id']}",
        "reason": closure["reason"],
    }

def _projected_worker_closure_sources(
    sources: list[tuple[str, dict[str, Any], str | None]],
    source_order: dict[str, tuple[int, int]],
    worker_attempts: dict[str, tuple[str, int]],
    schema: dict[str, Any],
) -> dict[tuple[str, str], tuple[str, dict[str, Any], str]]:
    projected: dict[tuple[str, str], tuple[str, dict[str, Any], str]] = {}
    for relative, draft, owner in sources:
        if owner is None:
            continue
        for closure in _resolved_deferred_rows(draft, schema):
            row = _project_worker_closure(relative, owner, closure, worker_attempts, source_order)
            # Both fields identify the full strict closeout row, including its reason.
            key = (row["id"], row["reason"])
            previous = projected.get(key)
            if previous is None or source_order[relative] > source_order[previous[2]]:
                projected[key] = (owner, closure, relative)
    return projected

def _parent_observation_content(parent: dict[str, Any]) -> dict[str, Any]:
    # Frozen recovery ancestry does not change the observed scan result.
    return {
        key: value
        for key, value in parent.items()
        if key not in {"previousParentCheckpoints", "canonicalParent"}
    }

def _merge_tied_parent_observations(
    current: dict[str, Any], previous: dict[str, Any]
) -> dict[str, Any]:
    merged = copy.deepcopy(current)
    for finding in previous["findings"]:
        if finding not in merged["findings"]:
            merged["findings"].append(copy.deepcopy(finding))
    coverage = merged["reviewState"]
    for field in ("surfaces", "explicitExclusions", "deferred", "openQuestions"):
        rows = previous["reviewState"].get(field, [])
        output = coverage.setdefault(field, [])
        if isinstance(rows, list) and isinstance(output, list):
            for row in rows:
                if row not in output:
                    output.append(copy.deepcopy(row))
    pending_ids = {
        identity
        for row in _coverage_rows(coverage, "deferred")
        if isinstance(row, dict)
        for identity in (row.get("id"), row.get("candidateId"))
        if isinstance(identity, str)
    }
    closure_schema = _read_json(
        Path(__file__).resolve().parents[2] / "schemas" / "coverage.schema.json"
    )["properties"]["resolvedDeferred"]
    closures = {}
    for observed in (current, previous):
        for row in _resolved_deferred_rows(observed, closure_schema):
            if row["id"] not in pending_ids:
                closures.setdefault(row["id"], copy.deepcopy(row))
    coverage.pop("resolvedDeferred", None)
    if closures:
        coverage["resolvedDeferred"] = list(closures.values())
    if current.get("complete") is False or previous.get("complete") is False:
        merged["complete"] = False
    coverage.pop("completeness", None)
    return merged
```

## File: `scripts/workbench/saved_outputs.py`

```python
"""Snapshot and restore scan outputs around publication transactions."""

from __future__ import annotations

import os
from pathlib import Path

from finalize_scan_contract import (
    ContractError,
    _remove_scan_local_file_if_exists,
    open_scan_local_file_descriptor,
    write_scan_local_bytes,
)

_PUBLISHED_OUTPUTS = (
    "findings.json",
    "coverage.json",
    "scan-manifest.json",
    "report.md",
    "threatmodel.md",
    "report.html",
    "exports/results.sarif",
)

def _snapshot_published_outputs(
    scan_dir: Path, relative_paths: tuple[str, ...] = _PUBLISHED_OUTPUTS
) -> dict[str, tuple[bytes, os.stat_result] | None]:
    """Capture each artifact's bytes and stat metadata before publication.

    A None entry records an absent artifact. An unsafe optional threatmodel.md is
    omitted so rollback leaves it alone. Other unreadable existing outputs raise ContractError.
    """
    snapshots: dict[str, tuple[bytes, os.stat_result] | None] = {}
    for relative in relative_paths:
        descriptor = -1
        try:
            descriptor = open_scan_local_file_descriptor(
                scan_dir, relative, "Published scan output"
            )
            with os.fdopen(descriptor, "rb") as handle:
                descriptor = -1
                metadata = os.fstat(handle.fileno())
                snapshots[relative] = (handle.read(), metadata)
        except ContractError:
            path = scan_dir / relative
            if path.exists() or path.is_symlink():
                if relative == "threatmodel.md":
                    # This optional projection will not replace an unsafe destination.
                    continue
                raise
            snapshots[relative] = None
        finally:
            if descriptor >= 0:
                os.close(descriptor)
    return snapshots

def _restore_published_outputs(
    scan_dir: Path,
    snapshots: dict[str, tuple[bytes, os.stat_result] | None],
    created_paths: set[str] | None = None,
) -> None:
    """Restore the captured bytes and timestamps after a publication failure.

    Remove outputs that were originally absent and paths journaled as newly created by the caller.
    """
    for relative, snapshot in snapshots.items():
        if snapshot is None:
            path = scan_dir / relative
            if path.exists() or path.is_symlink():
                _remove_scan_local_file_if_exists(scan_dir, relative)
        else:
            contents, metadata = snapshot
            write_scan_local_bytes(scan_dir, relative, contents)
            os.utime(scan_dir / relative, ns=(metadata.st_atime_ns, metadata.st_mtime_ns))
    for relative in sorted(created_paths or ()):
        # A journaled write can fail before creating its parent directory.
        path = scan_dir / relative
        if path.exists() or path.is_symlink():
            _remove_scan_local_file_if_exists(scan_dir, relative)
```
