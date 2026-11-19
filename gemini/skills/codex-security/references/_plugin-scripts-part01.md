# Plugin files: codex-security — `scripts/` (part 1 of 2)

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/config_preflight.py`

```python
#!/usr/bin/env python3
"""Evaluate Codex Security capability profiles against the current Codex setup."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python 3.10 only
    import tomli as tomllib

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = PLUGIN_ROOT / "preflight" / "capability-profiles.toml"
DEFAULT_CODEX_HOME = Path(os.environ.get("CODEX_HOME", "~/.codex")).expanduser()

def default_system_config() -> Path:
    if os.name == "nt":
        program_data = os.environ.get("ProgramData", r"C:\ProgramData")
        return Path(program_data) / "OpenAI" / "Codex" / "config.toml"
    return Path("/etc/codex/config.toml")

SYSTEM_CONFIG = default_system_config()
DEFAULT_CONFIG = DEFAULT_CODEX_HOME / "config.toml"
VALID_SEVERITIES = {"block", "warn", "suggest"}
VALID_MULTI_AGENT_OWNERS = {"native", "codex-bridge"}
VALID_MULTI_AGENT_VERSIONS = {"v1", "v2"}
VALID_MULTI_AGENT_PROVENANCE = {
    "app-server",
    "thread-context",
    "tool-surface",
    "verified-bridge",
}
NATIVE_V2_DEFAULT_SESSION_CAP = 4
CONFIG_PROFILE_NAME = re.compile(r"^[A-Za-z0-9_-]+$")
# Of the config roots evaluated here, only features is valid in legacy ConfigProfile.
LEGACY_CONFIG_PROFILE_CAPABILITY_FIELDS = {"features"}

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    selector = parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--profile", help="Capability profile id to evaluate.")
    selector.add_argument(
        "--skill", help="Top-level skill id to resolve through the registry routes."
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=DEFAULT_REGISTRY,
        help="Capability registry path. Defaults to the bundled registry.",
    )
    config_input = parser.add_mutually_exclusive_group()
    config_input.add_argument(
        "--config",
        type=Path,
        action="append",
        help=(
            "Codex config.toml layer, from lower to higher precedence. "
            "Repeat to override automatic cwd-based discovery."
        ),
    )
    parser.add_argument(
        "--cwd",
        type=Path,
        default=Path.cwd(),
        help="Working directory used to discover trusted project config layers.",
    )
    parser.add_argument(
        "--codex-config-profile",
        help="Selected Codex config profile name, when the session uses one.",
    )
    parser.add_argument(
        "--multi-agent-runtime-owner",
        choices=sorted(VALID_MULTI_AGENT_OWNERS),
        help=(
            "Verified owner of the active multi-agent runtime. Do not infer bridge "
            "ownership from a backend_config value alone."
        ),
    )
    parser.add_argument(
        "--multi-agent-runtime-version",
        choices=sorted(VALID_MULTI_AGENT_VERSIONS),
        help="Version exposed by the active multi-agent tool surface.",
    )
    parser.add_argument(
        "--multi-agent-session-cap",
        type=positive_int,
        help="Resolved V2 session cap from the active runtime; includes the root thread.",
    )
    parser.add_argument(
        "--multi-agent-runtime-provenance",
        choices=sorted(VALID_MULTI_AGENT_PROVENANCE),
        help="Evidence source for explicitly supplied multi-agent runtime facts.",
    )
    parser.add_argument(
        "--runtime-check",
        action="append",
        default=[],
        metavar="NAME=BOOL",
        help="Known runtime capability, such as delegation_available=true.",
    )
    parser.add_argument(
        "--available-plugin-skill",
        action="append",
        metavar="SKILL_NAME",
        help=(
            "Plugin-local skill name exposed by the current runtime, such as "
            "security-scan. Repeat only for skills from the capability's plugin."
        ),
    )
    parser.add_argument(
        "--effective-config",
        action="append",
        default=[],
        metavar="PATH=JSON",
        help="Known effective config value, such as agents.max_threads=8.",
    )
    return parser.parse_args()

def read_toml(path: Path, *, required: bool) -> dict[str, Any]:
    try:
        with path.open("rb") as file:
            return tomllib.load(file)
    except FileNotFoundError:
        if required:
            raise
        return {}

def parse_bool(value: str) -> bool:
    normalized = value.lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise ValueError(f"expected true or false, got {value!r}")

def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("expected a positive integer")
    return parsed

def parse_assignment(raw: str) -> tuple[str, str]:
    key, separator, value = raw.partition("=")
    if not separator or not key or not value:
        raise ValueError(f"expected NAME=VALUE, got {raw!r}")
    return key, value

def parse_runtime_checks(values: list[str]) -> dict[str, bool]:
    checks: dict[str, bool] = {}
    for raw in values:
        key, value = parse_assignment(raw)
        checks[key] = parse_bool(value)
    return checks

def parse_available_plugin_skills(values: list[str] | None) -> set[str] | None:
    if values is None:
        return None
    for value in values:
        if ":" in value:
            raise ValueError(
                f"expected plugin-local skill name, got {value!r}; omit the plugin prefix"
            )
    return set(values)

def parse_effective_config(values: list[str]) -> dict[str, Any]:
    config: dict[str, Any] = {}
    for raw in values:
        key, value = parse_assignment(raw)
        try:
            config[key] = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError(f"expected JSON value for {key!r}, got {value!r}") from error
    return config

def lookup_dotted(config: dict[str, Any], path: str) -> tuple[bool, Any]:
    current: Any = config
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return False, None
        current = current[part]
    return True, current

def lookup_layered_value(
    path: str, config_layers: list[tuple[Path, dict[str, Any]]]
) -> tuple[bool, Any]:
    for _config_path, config in reversed(config_layers):
        found, actual = lookup_dotted(config, path)
        if found:
            return True, actual
    return False, None

def iter_config_views(
    config_layers: list[tuple[Path, dict[str, Any]]], config_profile: str | None
) -> Iterator[tuple[str, dict[str, Any]]]:
    for config_path, config in reversed(config_layers):
        if config_profile is not None:
            profiles = config.get("profiles")
            if isinstance(profiles, dict):
                profile_config = profiles.get(config_profile)
                if isinstance(profile_config, dict):
                    supported_profile_config = {
                        key: value
                        for key, value in profile_config.items()
                        if key in LEGACY_CONFIG_PROFILE_CAPABILITY_FIELDS
                    }
                    if supported_profile_config:
                        yield (
                            f"{config_path} [profiles.{config_profile}]",
                            supported_profile_config,
                        )
        yield str(config_path), config

def resolve_project_root(cwd: Path, config_layers: list[tuple[Path, dict[str, Any]]]) -> Path:
    found, configured_markers = lookup_layered_value("project_root_markers", config_layers)
    markers = configured_markers if found else [".git"]
    if not isinstance(markers, list) or not all(isinstance(marker, str) for marker in markers):
        raise ValueError("project_root_markers must be an array of strings")
    if not markers:
        return cwd
    for candidate in (cwd, *cwd.parents):
        if any((candidate / marker).exists() for marker in markers):
            return candidate
    return cwd

def project_trust_level(
    config_layers: list[tuple[Path, dict[str, Any]]], project_root: Path
) -> str | None:
    for _path, config in reversed(config_layers):
        projects = config.get("projects")
        if not isinstance(projects, dict):
            continue
        project = projects.get(str(project_root))
        if not isinstance(project, dict) and os.name == "nt":
            project_key = os.path.normcase(os.path.realpath(project_root))
            project = next(
                (
                    value
                    for path, value in projects.items()
                    if os.path.normcase(os.path.realpath(path)) == project_key
                ),
                None,
            )
        if not isinstance(project, dict):
            continue
        trust_level = project.get("trust_level")
        if isinstance(trust_level, str):
            return trust_level
    return None

def project_config_paths(project_root: Path, cwd: Path) -> list[Path]:
    relative = cwd.relative_to(project_root)
    directories = [project_root]
    current = project_root
    for part in relative.parts:
        current /= part
        directories.append(current)
    return [directory / ".codex" / "config.toml" for directory in directories]

def discover_config_paths(
    *, cwd: Path, profile_layer_path: Path | None
) -> tuple[list[Path], dict[str, Any]]:
    resolved_cwd = cwd.expanduser().resolve()
    if not resolved_cwd.is_dir():
        raise ValueError(f"cwd must be a directory, got {str(resolved_cwd)!r}")

    base_paths = [SYSTEM_CONFIG, DEFAULT_CONFIG]
    if profile_layer_path is not None:
        base_paths.append(profile_layer_path)
    base_layers = [(path, read_toml(path, required=False)) for path in base_paths]
    project_root = resolve_project_root(resolved_cwd, base_layers)
    trust_level = project_trust_level(base_layers, project_root)
    paths = [*base_paths]
    if trust_level == "trusted":
        paths.extend(project_config_paths(project_root, resolved_cwd))
    return paths, {
        "cwd": str(resolved_cwd),
        "project_root": str(project_root),
        "project_trust_level": trust_level,
        "project_layers_loaded": trust_level == "trusted",
    }

def compare(actual: Any, op: str, expected: Any) -> bool:
    if op == "==":
        return actual == expected
    if op == ">=":
        return isinstance(actual, int) and not isinstance(actual, bool) and actual >= expected
    raise ValueError(f"unsupported comparison operator: {op!r}")

def lookup_config_value(
    path: str,
    *,
    config_layers: list[tuple[Path, dict[str, Any]]],
    effective_config: dict[str, Any],
    config_profile: str | None,
    default: Any = None,
    has_default: bool = False,
) -> tuple[bool, Any, str | None]:
    if path in effective_config:
        return True, effective_config[path], "effective-config"
    for source, config in iter_config_views(config_layers, config_profile):
        found, actual = lookup_dotted(config, path)
        if found:
            return True, actual, source
    if has_default:
        return True, default, "documented-default"
    return False, None, None

def resolve_active_config_profile(
    *,
    config_layers: list[tuple[Path, dict[str, Any]]],
    override: str | None,
    cli_profile_selected: bool,
) -> tuple[str | None, str | None]:
    if cli_profile_selected:
        if override is None:
            raise ValueError("CLI profile selection requires an explicit config profile name")
        return override, None

    if override is None:
        found, configured = lookup_layered_value("profile", config_layers)
        if not found:
            return None, None
        if not isinstance(configured, str):
            raise ValueError("profile must be a string")
        profile = configured
    else:
        profile = override

    profile_values = [
        config.get("profiles", {}).get(profile)
        for _path, config in config_layers
        if isinstance(config.get("profiles"), dict) and profile in config["profiles"]
    ]
    if not profile_values:
        raise ValueError(f"config profile {profile!r} not found")
    if any(not isinstance(value, dict) for value in profile_values):
        raise ValueError(f"config profile {profile!r} must be a table")
    return profile, profile

def config_profile_layer_path(profile: str | None) -> Path | None:
    if profile is None:
        return None
    if not CONFIG_PROFILE_NAME.fullmatch(profile):
        raise ValueError(
            f"invalid config profile name {profile!r}; pass a plain name such as 'work'"
        )
    path = DEFAULT_CODEX_HOME / f"{profile}.config.toml"
    return path if path.is_file() else None

def parse_multi_agent_v2_enabled(feature_config: Any) -> bool | None:
    if isinstance(feature_config, bool):
        return feature_config
    if not isinstance(feature_config, dict):
        raise ValueError("features.multi_agent_v2 must be a boolean or table")
    if "enabled" not in feature_config:
        return None
    enabled = feature_config["enabled"]
    if not isinstance(enabled, bool):
        raise ValueError("features.multi_agent_v2.enabled must be a boolean")
    return enabled

def merge_toml_value(base: Any, overlay: Any) -> Any:
    if isinstance(base, dict) and isinstance(overlay, dict):
        merged = dict(base)
        for key, value in overlay.items():
            merged[key] = merge_toml_value(merged[key], value) if key in merged else value
        return merged
    return overlay

def lookup_multi_agent_v2_enabled(
    *,
    config_layers: list[tuple[Path, dict[str, Any]]],
    effective_config: dict[str, Any],
    config_profile: str | None,
) -> tuple[bool, bool | None, str | None]:
    if "features.multi_agent_v2.enabled" in effective_config:
        enabled = effective_config["features.multi_agent_v2.enabled"]
        if not isinstance(enabled, bool):
            raise ValueError("features.multi_agent_v2.enabled must be a boolean")
        return True, enabled, "effective-config"

    v2_configs = []
    config_views = list(iter_config_views(config_layers, config_profile))
    for source, config in reversed(config_views):
        found, feature_config = lookup_dotted(config, "features.multi_agent_v2")
        if found:
            v2_configs.append((source, feature_config))

    if "features.multi_agent_v2" in effective_config:
        v2_configs.append(("effective-config", effective_config["features.multi_agent_v2"]))

    if not v2_configs:
        return False, None, None

    merged_v2_config: Any = None
    enabled_source: str | None = None
    for index, (source, feature_config) in enumerate(v2_configs):
        tables_merge = isinstance(merged_v2_config, dict) and isinstance(feature_config, dict)
        if index and not tables_merge:
            enabled_source = None
        merged_v2_config = (
            merge_toml_value(merged_v2_config, feature_config) if index else feature_config
        )
        if isinstance(feature_config, bool) or (
            isinstance(feature_config, dict) and "enabled" in feature_config
        ):
            enabled_source = source

    enabled = parse_multi_agent_v2_enabled(merged_v2_config)
    return (
        (True, enabled, enabled_source)
        if enabled is not None
        else (True, False, "documented-default")
    )

def resolve_multi_agent_context(
    *,
    config_layers: list[tuple[Path, dict[str, Any]]],
    effective_config: dict[str, Any],
    config_profile: str | None,
    runtime_owner: str | None,
    runtime_version: str | None,
    runtime_session_cap: int | None,
    runtime_provenance: str | None,
) -> dict[str, Any]:
    runtime_facts_supplied = any(
        value is not None for value in (runtime_owner, runtime_version, runtime_session_cap)
    )
    if runtime_facts_supplied and runtime_provenance is None:
        raise ValueError(
            "explicit multi-agent runtime facts require --multi-agent-runtime-provenance"
        )
    if runtime_provenance is not None and not runtime_facts_supplied:
        raise ValueError(
            "--multi-agent-runtime-provenance requires an explicit runtime owner, version, or cap"
        )
    if runtime_owner == "codex-bridge" and runtime_provenance != "verified-bridge":
        raise ValueError(
            "codex-bridge ownership requires --multi-agent-runtime-provenance verified-bridge"
        )
    if runtime_owner == "native" and runtime_provenance == "verified-bridge":
        raise ValueError("native ownership cannot use verified-bridge provenance")

    feature_found, enabled, feature_source = lookup_multi_agent_v2_enabled(
        config_layers=config_layers,
        effective_config=effective_config,
        config_profile=config_profile,
    )

    if runtime_version is not None:
        version = runtime_version
        version_source = "runtime-fact"
    elif feature_found:
        version = "v2" if enabled else "v1"
        version_source = feature_source
    elif runtime_owner == "codex-bridge":
        version = "v2"
        version_source = "runtime-owner"
    else:
        version = "unknown"
        version_source = None

    if runtime_owner is not None:
        owner = runtime_owner
        owner_source = "runtime-fact"
    elif feature_found:
        owner = "native"
        owner_source = feature_source
    else:
        owner = "unknown"
        owner_source = None

    if owner == "codex-bridge" and version != "v2":
        raise ValueError("codex-bridge ownership requires multi-agent runtime version v2")
    if runtime_session_cap is not None and version != "v2":
        raise ValueError("--multi-agent-session-cap is valid only for a V2 runtime")

    bridge_cap_found, bridge_cap, bridge_cap_source = lookup_config_value(
        "multiagent_config.max_concurrency",
        config_layers=config_layers,
        effective_config=effective_config,
        config_profile=config_profile,
    )
    if bridge_cap_found and owner != "codex-bridge":
        raise ValueError(
            "multiagent_config.max_concurrency does not prove bridge ownership; "
            "pass --multi-agent-runtime-owner codex-bridge only when the active runtime "
            "is verified as bridge-managed"
        )
    if bridge_cap_found and runtime_session_cap is not None and bridge_cap != runtime_session_cap:
        raise ValueError(
            "conflicting bridge concurrency facts: multiagent_config.max_concurrency "
            f"from {bridge_cap_source} is {bridge_cap!r}, but --multi-agent-session-cap is "
            f"{runtime_session_cap!r}"
        )

    agent_threads_found, agent_threads, agent_threads_source = lookup_config_value(
        "agents.max_threads",
        config_layers=config_layers,
        effective_config=effective_config,
        config_profile=config_profile,
    )
    if owner != "codex-bridge" and feature_found and enabled and agent_threads_found:
        raise ValueError("agents.max_threads cannot be set when multi_agent_v2 is enabled")

    if version == "v1":
        mode = "v1"
    elif version == "v2" and owner == "codex-bridge":
        mode = "bridge-v2"
    elif version == "v2" and owner == "native":
        mode = "v2"
    else:
        mode = "unknown"
    return {
        "mode": mode,
        "owner": owner,
        "owner_source": owner_source,
        "version": version,
        "version_source": version_source,
        "runtime_provenance": runtime_provenance,
        "config_v2_enabled": feature_found and bool(enabled),
        "agent_max_threads_configured": agent_threads_found,
        "agent_max_threads": agent_threads if agent_threads_found else None,
        "agent_max_threads_source": agent_threads_source if agent_threads_found else None,
    }

def evaluate_multi_agent_capacity(
    result: dict[str, Any],
    capability: dict[str, Any],
    *,
    config_layers: list[tuple[Path, dict[str, Any]]],
    effective_config: dict[str, Any],
    config_profile: str | None,
    multi_agent_context: dict[str, Any],
    runtime_session_cap: int | None,
) -> dict[str, Any]:
    multi_agent_mode = str(multi_agent_context["mode"])
    if multi_agent_mode == "unknown":
        return {**result, "status": "unknown", "check": "active_multi_agent_mode"}

    if multi_agent_mode == "v1":
        path = "agents.max_threads"
        found, actual, source = lookup_config_value(
            path,
            config_layers=config_layers,
            effective_config=effective_config,
            config_profile=config_profile,
            default=capability.get("v1_default"),
            has_default="v1_default" in capability,
        )
        worker_slots = actual
    else:
        if runtime_session_cap is not None:
            path = "runtime.multi_agent.session_cap"
            found, actual, source = True, runtime_session_cap, "runtime-fact"
        elif multi_agent_context["owner"] == "codex-bridge":
            path = "multiagent_config.max_concurrency"
            found, actual, source = lookup_config_value(
                path,
                config_layers=config_layers,
                effective_config=effective_config,
                config_profile=config_profile,
            )
        elif multi_agent_context["owner"] == "native" and multi_agent_context["config_v2_enabled"]:
            path = "features.multi_agent_v2.max_concurrent_threads_per_session"
            found, actual, source = lookup_config_value(
                path,
                config_layers=config_layers,
                effective_config=effective_config,
                config_profile=config_profile,
                default=NATIVE_V2_DEFAULT_SESSION_CAP,
                has_default=True,
            )
        else:
            path = "runtime.multi_agent.session_cap"
            found, actual, source = False, None, None
        worker_slots = (
            actual - 1 if isinstance(actual, int) and not isinstance(actual, bool) else actual
        )

    if not found:
        return {**result, "status": "unknown", "path": path, "multi_agent_mode": multi_agent_mode}
    return {
        **result,
        "status": "pass"
        if compare(worker_slots, capability["op"], capability["value"])
        else "fail",
        "path": path,
        "actual": worker_slots,
        "configured_value": actual,
        "expected": {"op": capability["op"], "value": capability["value"]},
        "source": source,
        "multi_agent_mode": multi_agent_mode,
    }

def resolve_profile(registry: dict[str, Any], *, profile: str | None, skill: str | None) -> str:
    if profile:
        return profile
    routes = {route["skill"]: route["profile"] for route in registry["routes"]}
    try:
        return routes[str(skill)]
    except KeyError as error:
        raise ValueError(f"no capability profile route for skill {skill!r}") from error

def evaluate_requirement(
    requirement: dict[str, Any],
    *,
    capabilities: dict[str, dict[str, Any]],
    config_layers: list[tuple[Path, dict[str, Any]]],
    effective_config: dict[str, Any],
    config_profile: str | None,
    runtime_checks: dict[str, bool],
    available_plugin_skills: set[str] | None,
    multi_agent_context: dict[str, Any],
    runtime_session_cap: int | None,
) -> dict[str, Any]:
    capability_id = requirement["capability"]
    capability = capabilities[capability_id]
    result = {
        "capability": capability_id,
        "severity": requirement["severity"],
        "reason": requirement["reason"],
    }

    if capability["kind"] == "runtime":
        check = capability["check"]
        if check not in runtime_checks:
            return {**result, "status": "unknown", "check": check}
        actual = runtime_checks[check]
        return {**result, "status": "pass" if actual else "fail", "actual": actual, "check": check}

    if capability["kind"] == "multi_agent_mode":
        actual = {
            "owner": multi_agent_context["owner"],
            "version": multi_agent_context["version"],
        }
        expected = {
            "owner": capability["owner"],
            "version": capability["version"],
        }
        if "unknown" in actual.values():
            return {
                **result,
                "status": "unknown",
                "check": "active_multi_agent_mode",
                "actual": actual,
                "expected": expected,
            }
        return {
            **result,
            "status": "pass" if actual == expected else "fail",
            "actual": actual,
            "expected": expected,
        }

    if capability["kind"] == "plugin_skills":
        required = capability["required"]
        required_skill_ids = [f"{capability['plugin']}:{skill}" for skill in required]
        if available_plugin_skills is None:
            return {
                **result,
                "status": "unknown",
                "check": "available_plugin_skills",
                "required": required_skill_ids,
            }
        unavailable = [
            f"{capability['plugin']}:{skill}"
            for skill in required
            if skill not in available_plugin_skills
        ]
        return {
            **result,
            "status": "fail" if unavailable else "pass",
            "unavailable": unavailable,
            "required": required_skill_ids,
        }

    if capability["kind"] == "multi_agent_capacity":
        return evaluate_multi_agent_capacity(
            result,
            capability,
            config_layers=config_layers,
            effective_config=effective_config,
            config_profile=config_profile,
            multi_agent_context=multi_agent_context,
            runtime_session_cap=runtime_session_cap,
        )

    if capability["kind"] == "config_absent":
        path = capability["path"]
        found, actual, source = lookup_config_value(
            path,
            config_layers=config_layers,
            effective_config=effective_config,
            config_profile=config_profile,
        )
        if not found:
            return {**result, "status": "pass", "path": path, "expected": "unset"}
        return {
            **result,
            "status": "fail",
            "path": path,
            "actual": actual,
            "expected": "unset",
            "source": source,
        }

    path = capability["path"]
    found, actual, source = lookup_config_value(
        path,
        config_layers=config_layers,
        effective_config=effective_config,
        config_profile=config_profile,
        default=capability.get("default"),
        has_default="default" in capability,
    )
    if not found:
        return {**result, "status": "unknown", "path": path}
    return {
        **result,
        "status": "pass" if compare(actual, capability["op"], capability["value"]) else "fail",
        "path": path,
        "actual": actual,
        "expected": {"op": capability["op"], "value": capability["value"]},
        "source": source,
    }

def validate_registry(registry: dict[str, Any]) -> None:
    capabilities = registry["capabilities"]
    profiles = registry["profiles"]
    for profile_id, profile in profiles.items():
        for requirement in profile["requirements"]:
            if requirement["capability"] not in capabilities:
                raise ValueError(
                    f"profile {profile_id!r} references unknown capability {requirement['capability']!r}"
                )
            if requirement["severity"] not in VALID_SEVERITIES:
                raise ValueError(
                    f"profile {profile_id!r} has unsupported severity {requirement['severity']!r}"
                )

def resolve_remediation(
    profile: dict[str, Any], *, multi_agent_context: dict[str, Any]
) -> dict[str, Any]:
    multi_agent_mode = str(multi_agent_context["mode"])
    remediation = dict(profile.get("remediation", {}))
    variants = remediation.pop("variants", [])
    remediation["multi_agent_mode"] = multi_agent_mode
    for variant in variants:
        if variant["mode"] == multi_agent_mode:
            if multi_agent_mode == "v2" and multi_agent_context["owner"] != "native":
                break
            variant_patches = variant.get("patches", [])
            if multi_agent_mode == "v2" and not multi_agent_context["agent_max_threads_configured"]:
                variant_patches = [
                    patch
                    for patch in variant_patches
                    if not (
                        patch.get("kind") == "remove" and patch.get("path") == "agents.max_threads"
                    )
                ]
            remediation["patches"] = remediation.get("patches", []) + variant_patches
            return remediation
    if variants:
        remediation["note"] = (
            "Do not apply a concurrency patch until the active runtime version and config "
            "ownership are known."
        )
    return remediation

def evaluate(args: argparse.Namespace) -> dict[str, Any]:
    registry = read_toml(args.registry, required=True)
    validate_registry(registry)
    profile_id = resolve_profile(registry, profile=args.profile, skill=args.skill)
    try:
        profile = registry["profiles"][profile_id]
    except KeyError as error:
        raise ValueError(f"unknown capability profile: {profile_id!r}") from error

    cli_profile_selected = args.codex_config_profile is not None
    if args.config:
        config_paths = args.config
        config_discovery = None
        config_resolution = "manual-layers"
        project_config_paths_set: set[Path] = set()
        profile_layer_path = None
    else:
        profile_layer_path = config_profile_layer_path(args.codex_config_profile)
        config_paths, config_discovery = discover_config_paths(
            cwd=args.cwd,
            profile_layer_path=profile_layer_path,
        )
        config_resolution = "cwd-discovery"
        project_config_paths_set = set(config_paths[3 if profile_layer_path else 2 :])
    config_layers = []
    for path in config_paths:
        config = read_toml(path, required=False)
        if path in project_config_paths_set:
            # Codex strips project-local profile selection and definitions before
            # resolving the merged config. Mirror that denylist here.
            config = dict(config)
            config.pop("profile", None)
            config.pop("profiles", None)
        config_layers.append((path, config))
    config_profile, embedded_config_profile = resolve_active_config_profile(
        config_layers=config_layers,
        override=args.codex_config_profile,
        cli_profile_selected=cli_profile_selected,
    )
    runtime_checks = parse_runtime_checks(args.runtime_check)
    available_plugin_skills = parse_available_plugin_skills(args.available_plugin_skill)
    effective_config = parse_effective_config(args.effective_config)
    multi_agent_context = resolve_multi_agent_context(
        config_layers=config_layers,
        effective_config=effective_config,
        config_profile=embedded_config_profile,
        runtime_owner=args.multi_agent_runtime_owner,
        runtime_version=args.multi_agent_runtime_version,
        runtime_session_cap=args.multi_agent_session_cap,
        runtime_provenance=args.multi_agent_runtime_provenance,
    )
    results = [
        evaluate_requirement(
            requirement,
            capabilities=registry["capabilities"],
            config_layers=config_layers,
            effective_config=effective_config,
            runtime_checks=runtime_checks,
            available_plugin_skills=available_plugin_skills,
            config_profile=embedded_config_profile,
            multi_agent_context=multi_agent_context,
            runtime_session_cap=args.multi_agent_session_cap,
        )
        for requirement in profile["requirements"]
        if not requirement.get("modes") or multi_agent_context["mode"] in requirement["modes"]
    ]
    failed = [result for result in results if result["status"] == "fail"]
    unknown = [result for result in results if result["status"] == "unknown"]
    if any(result["severity"] == "block" for result in failed):
        status = "blocked"
    elif unknown:
        status = "incomplete"
    else:
        status = "ready"
    return {
        "version": registry["version"],
        "profile": profile_id,
        "description": profile["description"],
        "config_resolution": config_resolution,
        "user_config_path": None if args.config else str(profile_layer_path or DEFAULT_CONFIG),
        "config_paths": [str(path) for path in config_paths],
        "config_discovery": config_discovery,
        "config_profile": config_profile,
        "config_profile_path": str(profile_layer_path) if profile_layer_path else None,
        "multi_agent_mode": multi_agent_context["mode"],
        "multi_agent_context": multi_agent_context,
        "status": status,
        "results": results,
        "failed": failed,
        "unknown": unknown,
        "remediation": resolve_remediation(
            profile,
            multi_agent_context=multi_agent_context,
        ),
    }

def main() -> int:
    try:
        payload = evaluate(parse_args())
    except (KeyError, OSError, TypeError, ValueError, tomllib.TOMLDecodeError) as error:
        print(json.dumps({"status": "error", "error": str(error)}, indent=2, sort_keys=True))
        return 2
    print(json.dumps(payload, indent=2, sort_keys=True))
    if payload["status"] == "blocked":
        return 1
    return 2 if payload["status"] == "incomplete" else 0

if __name__ == "__main__":
    sys.exit(main())
```

## File: `scripts/deep_scan_config.py`

```python
"""Resolve per-user Codex Security Deep Scan orchestration settings."""

from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
from typing import Any

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python 3.10 only
    import tomli as tomllib

DEFAULT_WORKERS = 4
DEFAULT_SUBAGENTS = 3
DEFAULT_STOP_AFTER_NO_NEW = 4
DEFAULT_STOP_AFTER_CONSECUTIVE_ERRORS = 3
DEFAULT_MAX_DISCOVERY_RUNS = 40
DEFAULT_MAX_TIME_HOURS = 96
MAX_TIME_HOURS = 96
CONFIG_KEYS = {
    "workers",
    "subagents",
    "stop_after_no_new",
    "stop_after_consecutive_errors",
    "max_discovery_runs",
    "max_time_hours",
}

def codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", "~/.codex")).expanduser()

def config_path() -> Path:
    configured = os.environ.get("CODEX_SECURITY_DEEP_SCAN_CONFIG_PATH", "").strip()
    if configured:
        return Path(configured).expanduser()
    return codex_home() / "codex-security" / "config.toml"

def resolve_deep_scan_config(available_parallelism: int) -> dict[str, int | float]:
    if isinstance(available_parallelism, bool) or available_parallelism < 1:
        raise SystemExit("Available parallelism must be a positive integer.")
    path = config_path()
    configured: dict[str, Any] = {}
    if path.exists():
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

    workers: object = configured.get("workers", DEFAULT_WORKERS)
    if workers == "auto":
        resolved_workers = DEFAULT_WORKERS
    else:
        resolved_workers = require_integer(workers, "deep_scan.workers", minimum=1)
    stop_after_no_new = require_integer(
        configured.get("stop_after_no_new", DEFAULT_STOP_AFTER_NO_NEW),
        "deep_scan.stop_after_no_new",
        minimum=1,
    )
    return {
        "workers": resolved_workers,
        "subagents": require_integer(
            configured.get("subagents", DEFAULT_SUBAGENTS),
            "deep_scan.subagents",
            minimum=0,
        ),
        "stopAfterNoNew": stop_after_no_new,
        "stopAfterConsecutiveErrors": require_integer(
            configured.get("stop_after_consecutive_errors", DEFAULT_STOP_AFTER_CONSECUTIVE_ERRORS),
            "deep_scan.stop_after_consecutive_errors",
            minimum=1,
        ),
        "maxDiscoveryRuns": require_integer(
            configured.get("max_discovery_runs", DEFAULT_MAX_DISCOVERY_RUNS),
            "deep_scan.max_discovery_runs",
            minimum=1,
        ),
        "maxTimeHours": require_positive_number(
            configured.get("max_time_hours", DEFAULT_MAX_TIME_HOURS),
            "deep_scan.max_time_hours",
        ),
    }

def require_integer(value: object, label: str, *, minimum: int) -> int:
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
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SystemExit(f"{label} must be a positive finite number no greater than 96.")
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    if not finite or value <= 0 or value > MAX_TIME_HOURS:
        raise SystemExit(f"{label} must be a positive finite number no greater than 96.")
    return value

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--available-parallelism", type=int, required=True)
    args = parser.parse_args()
    import json

    print(json.dumps(resolve_deep_scan_config(args.available_parallelism), sort_keys=True))

if __name__ == "__main__":
    main()
```

## Not embedded

- `scripts/deep_scan_workbench.py` (85 KB, too large to embed — read it in the repository)

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
    return stored == serialize_filesystem_identity(current)

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## Not embedded

- `scripts/finalize_scan_contract.py` (113 KB, too large to embed — read it in the repository)

## File: `scripts/finding_preview.py`

```python
"""Bound structured finding details for workbench list responses."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from report_projection import merged_root_cause
from workbench_constants import (
    FINDING_ATTACK_PATH_PREVIEW_BYTES,
    FINDING_CODE_EVIDENCE_LIMIT,
    FINDING_CODE_EVIDENCE_SNIPPET_BYTES,
    FINDING_DETAILS_PREVIEW_BYTES,
    FINDING_EVIDENCE_EXCERPT_BYTES,
    FINDING_ROOT_CAUSE_PREVIEW_BYTES,
    FINDING_VALIDATION_PREVIEW_BYTES,
)

def bounded_finding_details(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    prepared: dict[str, Any] = {}
    for aliases, maximum_bytes, priority_keys, reserved_fields in (
        (
            ("rootCause", "root_cause"),
            FINDING_ROOT_CAUSE_PREVIEW_BYTES,
            (
                "summary",
                "description",
                "detail",
                "cause",
                "rationale",
                "why",
                "explanation",
                "evidenceRefs",
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
                "summary",
                "conclusion",
                "method",
                "status",
                "disposition",
                "result",
                "rationale",
                "evidenceRef",
                "evidence_ref",
                "evidenceRefs",
                "evidence_refs",
                "assertions",
                "evidence",
                "counterEvidence",
                "limitations",
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
                "narrative",
                "summary",
                "description",
                "dataFlow",
                "data_flow",
                "dataflow",
                "path",
                "reachability",
                "steps",
                "authScope",
                "auth_scope",
                "vector",
                "preconditions",
                "assumptions",
                "impact",
                "likelihood",
                "evidenceRefs",
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

    evidence_key, evidence = merged_code_evidence(value)
    if evidence_key is not None:
        prepared[evidence_key] = bounded_code_evidence(evidence)

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
        "confidence",
        "detectedAt",
        "identity",
        "provenance",
        "ruleId",
        "severity",
        "status",
        "taxonomy",
        "evidence",
        "evidenceExcerpt",
    )
    core = {key: prepared[key] for key in core_keys if key in prepared}
    extras = {
        key: item for key, item in prepared.items() if key not in core and key not in guidance
    }
    complete_guidance = {key: items[:1] for key, items in guidance.items()}
    minimum_guidance = {
        key: [items[0][:1]] if items and isinstance(items[0], str) else []
        for key, items in guidance.items()
    }
    projected_core = {}
    for selected_guidance in (complete_guidance, minimum_guidance):
        reserved = (
            len(json.dumps(selected_guidance, separators=(",", ":")).encode("utf-8")) - 1
            if selected_guidance
            else 0
        )
        if reserved >= FINDING_DETAILS_PREVIEW_BYTES:
            continue
        projected_core = bounded_json_value(
            core,
            [FINDING_DETAILS_PREVIEW_BYTES - reserved],
        )
        if all(key in projected_core for key in core):
            break
    ordered_guidance = dict(sorted(guidance.items(), key=lambda entry: bool(entry[1])))
    bounded = bounded_json_value(
        {**projected_core, **ordered_guidance, **extras},
        [FINDING_DETAILS_PREVIEW_BYTES],
    )
    return bounded if isinstance(bounded, dict) else {}

def bounded_finding_section(
    value: Any,
    maximum_bytes: int,
    priority_keys: tuple[str, ...],
    reserved_fields: tuple[tuple[tuple[str, ...], int], ...],
) -> Any:
    if not isinstance(value, dict):
        return bounded_json_value(value, [maximum_bytes])
    ordered: dict[str, Any] = {}
    for aliases, field_bytes in reserved_fields:
        key = next((alias for alias in aliases if alias in value), None)
        if key is not None:
            ordered[key] = bounded_json_value(value[key], [field_bytes])
    for key in (*priority_keys, *value):
        if key in value and key not in ordered:
            ordered[key] = value[key]
    evidence_key, evidence = merged_code_evidence(ordered)
    if evidence_key is not None:
        ordered[evidence_key] = bounded_code_evidence(evidence)
        ordered.pop("code_evidence" if evidence_key == "codeEvidence" else "codeEvidence", None)
    return bounded_json_value(ordered, [maximum_bytes])

def merged_code_evidence(value: dict[str, Any]) -> tuple[str | None, Any]:
    evidence_keys = [key for key in ("codeEvidence", "code_evidence") if key in value]
    if not evidence_keys:
        return None, None
    catalogs = [value[key] for key in evidence_keys if isinstance(value[key], list)]
    if catalogs:
        merged = []
        seen_ids: set[str] = set()
        for catalog in catalogs:
            for item in catalog:
                if not _is_valid_code_evidence(item):
                    continue
                evidence_id = item["id"]
                if evidence_id in seen_ids:
                    continue
                seen_ids.add(evidence_id)
                merged.append(item)
        return evidence_keys[0], merged
    return evidence_keys[0], value[evidence_keys[0]]

def _is_valid_code_evidence(item: Any) -> bool:
    return (
        isinstance(item, dict)
        and isinstance(item.get("id"), str)
        and bool(item["id"].strip())
        and isinstance(item.get("code"), str)
        and bool(item["code"].strip())
    )

def bounded_code_evidence(value: Any) -> Any:
    if not isinstance(value, list):
        return value
    bounded = []
    for item in value:
        if not _is_valid_code_evidence(item):
            continue
        if len(bounded) >= FINDING_CODE_EVIDENCE_LIMIT:
            break
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
        code = evidence.get("code")
        if isinstance(code, str):
            evidence["code"] = bounded_json_text(
                code,
                FINDING_CODE_EVIDENCE_SNIPPET_BYTES,
            )[0]
        bounded.append(evidence)
    return bounded

def bounded_json_value(value: Any, budget: list[int], *, depth: int = 0) -> Any:
    if budget[0] <= 0:
        return None
    if depth >= 4:
        consume_json_budget(budget, 4)
        return None
    if isinstance(value, str):
        bounded, size = bounded_json_text(value, budget[0])
        consume_json_budget(budget, size)
        return bounded
    if value is None or isinstance(value, (bool, int, float)):
        consume_json_budget(budget, len(json.dumps(value, separators=(",", ":")).encode("utf-8")))
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
            bounded_item = bounded_json_value(item, budget, depth=depth + 1)
            size = len(json.dumps(bounded_item, separators=(",", ":")).encode("utf-8"))
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
        for key, item in list(value.items())[:20]:
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
                    minimum_tests = len(
                        json.dumps([item[0][0]], separators=(",", ":")).encode("utf-8")
                    )
                    for control in (controls[0], controls[0][0]):
                        reserved = (
                            len(
                                json.dumps(
                                    {"preventiveControls": [control]},
                                    separators=(",", ":"),
                                ).encode("utf-8")
                            )
                            - 1
                        )
                        if budget[0] >= minimum_tests + reserved:
                            item_budget = [budget[0] - reserved]
                            break
            bounded_item = bounded_json_value(item, item_budget, depth=depth + 1)
            size = (
                separator
                + key_size
                + 1
                + len(json.dumps(bounded_item, separators=(",", ":")).encode("utf-8"))
            )
            if size > remaining or (isinstance(item, str) and item and bounded_item == ""):
                budget[0] = remaining
                break
            budget[0] = remaining - size
            result[bounded_key] = bounded_item
        return result
    consume_json_budget(budget, 4)
    return None

def consume_json_budget(budget: list[int], size: int) -> bool:
    if budget[0] < size:
        budget[0] = 0
        return False
    budget[0] -= size
    return True

def bounded_json_text(value: str, maximum_bytes: int) -> tuple[str, int]:
    low = 0
    high = len(value)
    selected = ""
    selected_size = 2
    while low <= high:
        midpoint = (low + high) // 2
        candidate = value[:midpoint]
        size = len(json.dumps(candidate, separators=(",", ":")).encode("utf-8"))
        if size <= maximum_bytes:
            selected = candidate
            selected_size = size
            low = midpoint + 1
        else:
            high = midpoint - 1
    return selected, selected_size

if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
```

## File: `scripts/generate_in_scope_files.py`

```python
#!/usr/bin/env python3
"""Generate the shared, deterministically ordered security-scan file inventory."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

class InventoryError(ValueError):
    """Raised when the repository, scope, or inventory cannot be used safely."""

def windows_stream_component(path: Path) -> str | None:
    """Return the first NTFS alternate-data-stream component."""

    if os.name != "nt":
        return None
    return next(
        (component for component in path.parts if component != path.anchor and ":" in component),
        None,
    )

def resolve_repository(value: str) -> Path:
    """Resolve the repository once so every scope is bound to its real root."""
    try:
        repository = Path(value).expanduser().resolve(strict=True)
    except (OSError, ValueError) as error:
        raise InventoryError(f"--repo: cannot resolve repository: {value}") from error
    if not repository.is_dir():
        raise InventoryError(f"--repo: expected a directory: {repository}")
    return repository

def resolve_scope(repository: Path, value: str) -> str:
    """Preserve ripgrep's relative path spelling while rejecting escaped scopes."""
    if not value or "\0" in value:
        raise InventoryError("--scope: expected a non-empty file or directory")

    requested = Path(value).expanduser()
    stream = windows_stream_component(requested)
    if stream is not None:
        raise InventoryError(f"--scope: NTFS alternate data streams are not supported: {stream}")
    scope = requested if requested.is_absolute() else repository / requested
    try:
        resolved = scope.resolve(strict=True)
    except (OSError, ValueError) as error:
        raise InventoryError(f"--scope: path does not exist: {value}") from error

    try:
        relative = resolved.relative_to(repository)
    except ValueError as error:
        raise InventoryError(f"--scope: path must remain inside --repo: {value}") from error

    if not resolved.is_dir() and not resolved.is_file():
        raise InventoryError(f"--scope: expected a file or directory: {value}")

    if requested.is_absolute():
        return relative.as_posix() if relative.parts else "."
    return value

def resolve_output(value: str) -> Path:
    """Reject direct symlink outputs without constraining the artifact root."""
    if not value or "\0" in value:
        raise InventoryError("--out: expected an inventory file path")
    requested = Path(value).expanduser()
    if requested.is_symlink():
        raise InventoryError("--out: refusing to replace a symbolic link")
    try:
        output = requested.resolve(strict=False)
    except (OSError, ValueError) as error:
        raise InventoryError(f"--out: cannot resolve inventory path: {value}") from error
    if output.exists() and not output.is_file():
        raise InventoryError(f"--out: expected a regular file path: {output}")
    return output

def generate_in_scope_files(repository: Path, scope: str, output: Path) -> int:
    """Atomically write the exact ripgrep inventory sorted as ``LC_ALL=C``."""
    command = ["rg", "--files", "--hidden", "--glob", "!.git/**", "--path-separator=/", "--", scope]
    with tempfile.TemporaryFile(mode="w+b") as inventory:
        try:
            result = subprocess.run(
                command,
                cwd=repository,
                stdout=inventory,
                stderr=subprocess.PIPE,
                check=False,
            )
        except OSError as error:
            raise InventoryError(f"could not run ripgrep: {error}") from error

        if result.returncode not in (0, 1):
            detail = result.stderr.decode("utf-8", errors="replace").strip()
            message = f"ripgrep exited with status {result.returncode}"
            if detail:
                message = f"{message}: {detail}"
            raise InventoryError(message)

        inventory.seek(0)
        rows = sorted(inventory)

    return write_inventory(output, rows)

def generate_diff_in_scope_files(
    repository: Path,
    base: str,
    head: str,
    mode: str,
    output: Path,
) -> int:
    """Reuse the existing diff selection without generating previews or duplicate worklists."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from generate_rank_input import git_changed_paths, path_is_excluded, run_git_changed_paths
    from rank_preview import (
        DEFAULT_PREVIEW_BYTES,
        TEXT_CODE_EXTENSIONS,
        is_binary_sample,
        preview_for,
    )

    rows: list[bytes] = []
    try:
        if mode == "local-patch":
            changed = run_git_changed_paths(repository, [base])
            untracked = subprocess.run(
                ["git", "-C", str(repository), "ls-files", "--others", "--exclude-standard", "-z"],
                capture_output=True,
                text=True,
                check=True,
            )
            changed.extend(
                (repository / relative, "A")
                for relative in untracked.stdout.split("\0")
                if relative
            )
        else:
            changed = git_changed_paths(repository, base, head, mode)

        for path, status in changed:
            relative = path.relative_to(repository)
            if path_is_excluded(relative) or path.suffix.lower() not in TEXT_CODE_EXTENSIONS:
                continue
            if status != "D":
                if mode == "revisions":
                    contents = subprocess.run(
                        [
                            "git",
                            "-C",
                            str(repository),
                            "cat-file",
                            "blob",
                            f"{head}:{relative.as_posix()}",
                        ],
                        capture_output=True,
                        check=True,
                    ).stdout
                    if is_binary_sample(contents):
                        continue
                elif (
                    path.is_symlink()
                    or not path.is_file()
                    or preview_for(path, DEFAULT_PREVIEW_BYTES)[1]
                ):
                    continue
            relative_path = relative.as_posix()
            if "\n" in relative_path or "\r" in relative_path:
                raise InventoryError(
                    "Git changes contain a path that cannot fit in the file inventory"
                )
            rows.append(f"{relative_path}\n".encode())
    except (OSError, subprocess.CalledProcessError) as error:
        detail = getattr(error, "stderr", None)
        if isinstance(detail, bytes):
            detail = detail.decode("utf-8", errors="replace")
        message = detail.strip() if isinstance(detail, str) and detail.strip() else str(error)
        raise InventoryError(f"could not resolve the selected Git changes: {message}") from error

    return write_inventory(output, sorted(set(rows)))

def write_inventory(output: Path, rows: list[bytes]) -> int:
    """Replace a complete inventory atomically, keeping failures from corrupting the old one."""
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=output.parent,
            prefix=f".{output.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temporary = Path(handle.name)
            handle.writelines(rows)
        temporary.replace(output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)

    return len(rows)

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="Repository root.")
    parser.add_argument("--scope", required=True, help="File or directory within the repository.")
    parser.add_argument("--out", required=True, help="Destination for the file inventory.")
    parser.add_argument("--diff-base", help="Authoritative Git base for a changed-file inventory.")
    parser.add_argument("--diff-head", default="HEAD", help="Authoritative Git head revision.")
    parser.add_argument(
        "--diff-mode",
        choices=("revisions", "local-patch"),
        default="revisions",
        help="Use committed revisions or the current staged and unstaged patch.",
    )
    args = parser.parse_args()

    try:
        repository = resolve_repository(args.repo)
        scope = resolve_scope(repository, args.scope)
        output = resolve_output(args.out)
        if args.diff_base is None:
            count = generate_in_scope_files(repository, scope, output)
        elif scope not in (".", "./"):
            raise InventoryError("--scope: diff scans must use the repository root")
        else:
            count = generate_diff_in_scope_files(
                repository,
                args.diff_base,
                args.diff_head,
                args.diff_mode,
                output,
            )
    except (OSError, ValueError) as error:
        print(f"generate_in_scope_files: {error}", file=sys.stderr)
        raise SystemExit(2) from error

    print(f"Recorded {count} in-scope files.")

if __name__ == "__main__":
    main()
```

## File: `scripts/generate_rank_input.py`

```python
#!/usr/bin/env python3
"""Generate and post-process Codex Security scan worklists.

This script stays deliberately model-free:

- `make-repo-rank-input` creates the deterministic repository or scoped-path
  JSONL candidate worklist that ranking subagents consume.
- `make-diff-rank-input` creates the deterministic diff-scoped JSONL candidate
  worklist from Git changed paths. It supports committed revision diffs and
  local working-tree patches.
- `make-rank-shards` partitions the ranking input into deterministic shards.
- `make-rank-pool-plan` assigns those shards to a deterministic bounded worker
  pool.
- `validate-rank-worker` validates one worker slot and emits a content-bound
  completion receipt.
- `validate-rank-shard` validates one completed worker output before the
  coordinator accepts it.
- `validate-rank-pool` validates the pool plan and every assigned shard output.
- `merge-rank-outputs` validates and combines worker-local shard outputs.
- `copy-deep-review-input` copies every candidate into the deep-review worklist
  for exhaustive mode.
- `select-deep-review-input` selects the ranked rows for deep review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from collections.abc import Callable
from pathlib import Path

# Some plugin hosts launch Python with safe-path isolation enabled.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rank_preview import DEFAULT_PREVIEW_BYTES, TEXT_CODE_EXTENSIONS, preview_for
from workbench_target import git_directory_snapshot_paths

EXCLUDED_DIRS = {
    ".cache",
    ".circleci",
    ".devcontainer",
    ".git",
    ".github",
    ".idea",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    ".vscode",
    "__pycache__",
    "bench",
    "benchmark",
    "bintest",
    "build",
    "build_config",
    "build_configs",
    "build-tools",
    "build_tools",
    "ci",
    "coverage",
    "deps",
    "dev",
    "dist",
    "doc",
    "docs",
    "example",
    "examples",
    "external",
    "extern",
    "fixture",
    "fixtures",
    "generated",
    "node_modules",
    "sample",
    "samples",
    "target",
    "test",
    "tests",
    "testing",
    "third-party",
    "third_party",
    "tmp",
    "vendor",
}

EXCLUDED_FILENAMES = {
    ".DS_Store",
    "CHANGELOG",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "Dockerfile",
    "Gemfile",
    "Gemfile.lock",
    "LICENSE",
    "LICENSE.md",
    "Makefile",
    "NEWS",
    "NEWS.md",
    "NOTICE",
    "README",
    "README.md",
    "README.rst",
    "Rakefile",
    "SECURITY.md",
    "TODO",
    "TODO.md",
    "docker-compose.yml",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
}

SHARD_INPUT_GLOB = "rank-shard-*.input.jsonl"
SHARD_OUTPUT_GLOB = "rank-shard-*.output.jsonl"
SHARD_INPUT_PATTERN = re.compile(r"^rank-shard-([0-9]{4,})\.input\.jsonl$")
DIRECT_SCOPE_PREVIEW_READ_BYTES = 64 * 1024
RANK_POOL_PLAN_SCHEMA_VERSION = 1
RANK_POOL_STRATEGY = "round_robin"
RANK_POOL_WORKER_CAP = 6
JsonRow = dict[str, object]
RowValidator = Callable[[JsonRow, Path, int], None]
RankWorkerAssignment = tuple[int, list[str], list[str]]

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Codex Security scan worklist helper.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    make = subparsers.add_parser(
        "make-repo-rank-input",
        help="Create rank_input.jsonl for subagent-based file ranking.",
    )
    make.add_argument("--repo", required=True, help="Repository root.")
    make.add_argument(
        "--scope",
        default=".",
        help="Path within the repository to scan. Defaults to the repository root.",
    )
    make.add_argument(
        "--scopes-file",
        help="JSON array of repository-relative files and directories to scan together.",
    )
    make.add_argument("--out", required=True, help="Output rank_input.jsonl path.")
    make.add_argument("--area", default="", help="Area label. Defaults to scope.")
    make.add_argument(
        "--preview-bytes",
        type=int,
        default=DEFAULT_PREVIEW_BYTES,
        help=f"Maximum UTF-8 bytes in each preview. Defaults to {DEFAULT_PREVIEW_BYTES}.",
    )

    scoped = subparsers.add_parser(
        "make-repo-scope-input",
        help="List every explicitly scoped file without ranking or reading its contents.",
    )
    scoped.add_argument("--repo", required=True, help="Repository root.")
    scoped.add_argument(
        "--scopes-file",
        required=True,
        help="JSON array of repository-relative files and directories to scan together.",
    )
    scoped.add_argument("--out", required=True, help="Output scoped-source-input.jsonl path.")

    bind = subparsers.add_parser(
        "bind-repo-scopes",
        help="Copy SDK scoped-path targets into the unsealed manifest and coverage documents.",
    )
    bind.add_argument("--scopes-file", required=True, help="JSON array of requested scopes.")
    bind.add_argument("--manifest", required=True, help="Unsealed scan-manifest.json path.")
    bind.add_argument("--coverage", required=True, help="Unsealed coverage.json path.")

    diff = subparsers.add_parser(
        "make-diff-rank-input",
        help="Create rank_input.jsonl from Git changed source-like files.",
    )
    diff.add_argument("--repo", required=True, help="Repository root.")
    diff.add_argument("--base", required=True, help="Git diff base revision.")
    diff.add_argument(
        "--mode",
        choices=("revisions", "local-patch"),
        default="revisions",
        help="Git diff mode: committed revisions or staged plus unstaged local patch.",
    )
    diff.add_argument("--head", default="HEAD", help="Git diff head revision.")
    diff.add_argument("--out", required=True, help="Output rank_input.jsonl path.")
    diff.add_argument("--area", default="diff", help="Area label for ranking rows.")
    diff.add_argument(
        "--preview-bytes",
        type=int,
        default=DEFAULT_PREVIEW_BYTES,
        help=f"Maximum UTF-8 bytes in each preview. Defaults to {DEFAULT_PREVIEW_BYTES}.",
    )

    shards = subparsers.add_parser(
        "make-rank-shards",
        help="Partition rank_input.jsonl into deterministic worker input shards.",
    )
    shards.add_argument("--rank-input", required=True, help="Deterministic rank input JSONL.")
    shards.add_argument("--out-dir", required=True, help="Directory for worker input shards.")
    shards.add_argument(
        "--max-rows",
        type=int,
        default=150,
        help="Maximum rows per shard. Defaults to 150.",
    )

    pool_plan = subparsers.add_parser(
        "make-rank-pool-plan",
        help="Assign rank shards to a deterministic bounded worker pool.",
    )
    pool_plan.add_argument("--shard-dir", required=True, help="Directory of rank shards.")
    pool_plan.add_argument(
        "--usable-worker-slots",
        required=True,
        type=int,
        help="Usable ranking-worker slots reported by capability preflight; capped at 6.",
    )
    pool_plan.add_argument("--out", required=True, help="Output rank_worker_assignments.json path.")

    validate_shard = subparsers.add_parser(
        "validate-rank-shard",
        help="Validate one worker output against its rank input shard.",
    )
    validate_shard.add_argument("--input", required=True, help="Worker rank input shard.")
    validate_shard.add_argument("--output", required=True, help="Worker rank output shard.")

    validate_worker = subparsers.add_parser(
        "validate-rank-worker",
        help="Validate one assigned ranking-worker slot and emit its completion receipt.",
    )
    validate_worker.add_argument("--plan", required=True, help="Rank pool plan JSON path.")
    validate_worker.add_argument("--shard-dir", required=True, help="Directory of rank shards.")
    validate_worker.add_argument(
        "--slot",
        required=True,
        type=int,
        help="One-based ranking-worker slot from the rank pool plan.",
    )

    validate_pool = subparsers.add_parser(
        "validate-rank-pool",
        help="Validate a rank pool plan and every assigned shard output.",
    )
    validate_pool.add_argument("--plan", required=True, help="Rank pool plan JSON path.")
    validate_pool.add_argument("--shard-dir", required=True, help="Directory of rank shards.")

    merge = subparsers.add_parser(
        "merge-rank-outputs",
        help="Validate worker shard outputs and create rank_output.jsonl.",
    )
    merge.add_argument("--rank-input", required=True, help="Authoritative rank input JSONL.")
    merge.add_argument("--shard-dir", required=True, help="Directory of input and output shards.")
    merge.add_argument("--out", required=True, help="Output rank_output.jsonl path.")

    copy = subparsers.add_parser(
        "copy-deep-review-input",
        help="Create deep_review_input.jsonl directly from rank_input.jsonl.",
    )
    copy.add_argument("--rank-input", required=True, help="Deterministic rank input JSONL.")
    copy.add_argument("--out", required=True, help="Output deep_review_input.jsonl path.")

    select = subparsers.add_parser(
        "select-deep-review-input",
        help="Create deep_review_input.jsonl from worker-produced rank_output.jsonl.",
    )
    select.add_argument("--rank-output", required=True, help="Worker ranking output JSONL.")
    select.add_argument("--out", required=True, help="Output deep_review_input.jsonl path.")
    select.add_argument(
        "--top-percent",
        type=int,
        default=100,
        help="Percent of included files to keep for deep review.",
    )
    return parser.parse_args()

def path_is_excluded(path: Path) -> bool:
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return True
    if path.name in EXCLUDED_FILENAMES:
        return True
    return path.name.endswith((".min.js", ".map"))

def windows_stream_component(path: Path) -> str | None:
    """Return the first NTFS alternate-data-stream component."""

    if os.name != "nt":
        return None
    return next(
        (component for component in path.parts if component != path.anchor and ":" in component),
        None,
    )

def resolve_scope(
    repo: Path,
    scope: str,
    *,
    expand_user: bool = True,
    reject_symlinks: bool = False,
) -> Path:
    scope_path = Path(scope).expanduser() if expand_user else Path(scope)
    stream = windows_stream_component(scope_path)
    if stream is not None:
        raise SystemExit(f"Scope must not use an NTFS alternate data stream: {stream}")
    if not scope_path.is_absolute():
        scope_path = repo / scope_path
    if reject_symlinks:
        repository = repo.resolve()
        try:
            relative = scope_path.relative_to(repository)
        except ValueError as exc:
            raise SystemExit(f"Scope must be inside repo: {scope_path}") from exc
        ancestor = repository
        for part in relative.parts:
            if part == "..":
                if ancestor == repository:
                    raise SystemExit(f"Scope must be inside repo: {scope_path}")
                ancestor = ancestor.parent
                continue
            ancestor /= part
            try:
                metadata = ancestor.stat(follow_symlinks=False)
            except OSError as exc:
                raise SystemExit(f"Scope path not found: {ancestor}") from exc
            if ancestor.is_symlink() or getattr(metadata, "st_reparse_tag", 0) & 0x20000000:
                raise SystemExit(f"Requested scope must not contain symbolic links: {ancestor}")
    scope_path = scope_path.resolve()
    repo_resolved = repo.resolve()
    try:
        scope_path.relative_to(repo_resolved)
    except ValueError as exc:
        raise SystemExit(f"Scope must be inside repo: {scope_path}") from exc
    if not scope_path.is_dir() and not scope_path.is_file():
        raise SystemExit(f"Scope path not found: {scope_path}")
    return scope_path

def write_jsonl(output: Path, rows: list[JsonRow]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True, separators=(",", ":")))
            handle.write("\n")

def write_json(output: Path, payload: dict[str, object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

def load_scopes_file(scopes_file: Path) -> list[str]:
    try:
        loaded: object = json.loads(scopes_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Unable to read scopes file: {scopes_file}") from exc
    if (
        not isinstance(loaded, list)
        or not loaded
        or any(not isinstance(scope, str) or not scope for scope in loaded)
    ):
        raise SystemExit(f"Scopes file must contain a non-empty JSON string array: {scopes_file}")
    return loaded

def load_jsonl(path: Path, label: str, validator: RowValidator) -> list[JsonRow]:
    if not path.exists():
        raise SystemExit(f"{label} missing: {path}")

    rows: list[JsonRow] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            if not raw_line.strip():
                raise SystemExit(f"{path}:{line_number}: blank JSONL rows are not allowed")
            try:
                parsed: object = json.loads(raw_line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_number}: invalid JSON: {exc.msg}") from exc
            if not isinstance(parsed, dict):
                raise SystemExit(f"{path}:{line_number}: expected a JSON object")
            row = {str(key): value for key, value in parsed.items()}
            validator(row, path, line_number)
            rows.append(row)
    return rows

def require_exact_fields(row: JsonRow, expected: set[str], path: Path, line_number: int) -> None:
    actual = set(row)
    if actual != expected:
        missing = sorted(expected - actual)
        unexpected = sorted(actual - expected)
        details: list[str] = []
        if missing:
            details.append(f"missing fields {missing}")
        if unexpected:
            details.append(f"unexpected fields {unexpected}")
        raise SystemExit(f"{path}:{line_number}: {'; '.join(details)}")

def require_string(
    row: JsonRow, field: str, path: Path, line_number: int, *, allow_empty: bool
) -> None:
    value = row[field]
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        requirement = "a string" if allow_empty else "a non-empty string"
        raise SystemExit(f"{path}:{line_number}: {field} must be {requirement}")

def validate_rank_input_row(row: JsonRow, path: Path, line_number: int) -> None:
    require_exact_fields(row, {"path", "area", "preview"}, path, line_number)
    require_string(row, "path", path, line_number, allow_empty=False)
    require_string(row, "area", path, line_number, allow_empty=True)
    require_string(row, "preview", path, line_number, allow_empty=True)

def validate_rank_output_row(row: JsonRow, path: Path, line_number: int) -> None:
    require_exact_fields(row, {"path", "area", "score", "include", "reason"}, path, line_number)
    require_string(row, "path", path, line_number, allow_empty=False)
    require_string(row, "area", path, line_number, allow_empty=True)
    score = row["score"]
    if isinstance(score, bool) or not isinstance(score, int):
        raise SystemExit(f"{path}:{line_number}: score must be an integer from 1 through 10")
    if not 1 <= score <= 10:
        raise SystemExit(f"{path}:{line_number}: score must be from 1 through 10")
    if not isinstance(row["include"], bool):
        raise SystemExit(f"{path}:{line_number}: include must be a boolean")
    require_string(row, "reason", path, line_number, allow_empty=False)

def require_unique_paths(rows: list[JsonRow], label: str) -> None:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for row in rows:
        path = str(row["path"])
        if path in seen:
            duplicates.add(path)
        seen.add(path)
    if duplicates:
        raise SystemExit(f"{label} contains duplicate paths: {sorted(duplicates)}")

def make_repo_rank_input(args: argparse.Namespace) -> None:
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        raise SystemExit(f"Repo path not found: {repo}")
    scopes = [args.scope]
    explicit_scopes = args.scopes_file is not None
    if explicit_scopes:
        scopes = load_scopes_file(Path(args.scopes_file).expanduser())

    resolved_scopes = [
        resolve_scope(repo, scope, expand_user=not explicit_scopes) for scope in scopes
    ]
    directly_requested_files = {
        scope_abs for scope_abs in resolved_scopes if explicit_scopes and scope_abs.is_file()
    }
    rows_by_path: dict[str, JsonRow] = {}
    for scope_abs in resolved_scopes:
        scope_rel = scope_abs.relative_to(repo)
        area = args.area or scope_rel.as_posix()
        candidates = (scope_abs,) if scope_abs.is_file() else scope_abs.rglob("*")
        for path in candidates:
            try:
                if path.is_symlink() or not path.is_file():
                    continue
                path.resolve(strict=True).relative_to(repo)
            except (OSError, ValueError):
                continue
            rel = path.relative_to(repo)
            directly_requested = path in directly_requested_files
            excluded_path = (
                path.relative_to(scope_abs if scope_abs.is_dir() else scope_abs.parent)
                if explicit_scopes
                else rel
            )
            if not directly_requested and (
                path_is_excluded(excluded_path) or path.suffix.lower() not in TEXT_CODE_EXTENSIONS
            ):
                continue

            if (
                directly_requested
                and path.suffix.lower() not in TEXT_CODE_EXTENSIONS
                and path.name not in EXCLUDED_FILENAMES
            ):
                preview = ""
            else:
                preview, is_binary = preview_for(
                    path,
                    args.preview_bytes,
                    max_read_bytes=DIRECT_SCOPE_PREVIEW_READ_BYTES if directly_requested else None,
                )
                if is_binary and not directly_requested:
                    continue
            rows_by_path.setdefault(
                rel.as_posix(),
                {"path": rel.as_posix(), "area": area, "preview": preview},
            )

    rows = sorted(rows_by_path.values(), key=lambda row: str(row["path"]))
    output = Path(args.out).expanduser()
    write_jsonl(output, rows)
    print(f"Wrote {len(rows)} rows to {output}")

def make_repo_scope_input(args: argparse.Namespace) -> None:
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        raise SystemExit(f"Repo path not found: {repo}")

    scopes = load_scopes_file(Path(args.scopes_file).expanduser())
    rows_by_path: dict[str, JsonRow] = {}
    for scope in scopes:
        scope_path = resolve_scope(repo, scope, expand_user=False, reject_symlinks=True)
        if scope_path.is_file():
            candidates = (scope_path,)
        else:
            git_candidates = git_directory_snapshot_paths(scope_path)
            if git_candidates is not None:
                candidates = git_candidates
            else:
                command = [
                    "rg",
                    "--files",
                    "--hidden",
                    "--no-require-git",
                    "--null",
                    "--glob",
                    "!.git/**",
                    "--",
                    str(scope_path.relative_to(repo)),
                ]
                try:
                    result = subprocess.run(command, cwd=repo, capture_output=True, check=False)
                except OSError as exc:
                    ignore_names = (".gitignore", ".ignore", ".rgignore")
                    ancestors = (scope_path, *scope_path.parents)
                    has_ignore_rules = (
                        any((ancestor / ".git").exists() for ancestor in (repo, *repo.parents))
                        or any(
                            (ancestor / name).is_file()
                            for ancestor in ancestors
                            if ancestor == repo or repo in ancestor.parents
                            for name in ignore_names
                        )
                        or any(
                            path.name in ignore_names
                            for path in scope_path.rglob("*")
                            if path.is_file()
                        )
                    )
                    if has_ignore_rules:
                        raise SystemExit(
                            "Could not safely enumerate ignored scoped files without Git or ripgrep."
                        ) from exc
                    candidates = scope_path.rglob("*")
                else:
                    if result.returncode not in (0, 1):
                        detail = result.stderr.decode("utf-8", errors="replace").strip()
                        raise SystemExit(f"Could not enumerate scoped repository files: {detail}")
                    candidates = (
                        repo / os.fsdecode(path) for path in result.stdout.split(b"\0") if path
                    )
        for path in candidates:
            try:
                if path.is_symlink() or not path.is_file():
                    continue
                relative = path.resolve(strict=True).relative_to(repo)
            except (OSError, ValueError):
                continue
            if ".git" in relative.parts:
                continue
            rows_by_path.setdefault(relative.as_posix(), {"path": relative.as_posix()})

    rows = sorted(rows_by_path.values(), key=lambda row: str(row["path"]))
    output = Path(args.out).expanduser()
    write_jsonl(output, rows)
    print(f"Wrote {len(rows)} scoped paths to {output}")

def bind_repo_scopes(args: argparse.Namespace) -> None:
    scopes = load_scopes_file(Path(args.scopes_file).expanduser())
    manifest_path = Path(args.manifest).expanduser()
    coverage_path = Path(args.coverage).expanduser()
    try:
        manifest: object = json.loads(manifest_path.read_text(encoding="utf-8"))
        coverage: object = json.loads(coverage_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict) or not isinstance(coverage, dict):
            raise ValueError("expected JSON objects")
        scan = manifest.get("scan")
        if not isinstance(scan, dict):
            raise ValueError("manifest.scan must be an object")
        scope = scan.get("scope")
        if not isinstance(scope, dict):
            raise ValueError("manifest.scan.scope must be an object")
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit("Unable to bind requested scopes into the scan contract") from exc
    scope["includePaths"] = scopes
    coverage["includePaths"] = scopes
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )
    coverage_path.write_text(
        json.dumps(coverage, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Bound {len(scopes)} requested scopes into the scan contract")

def run_git_changed_paths(repo: Path, diff_args: list[str]) -> list[tuple[Path, str]]:
    result = subprocess.run(
        [
            "git",
            "-C",
            str(repo),
            "diff",
            "--name-status",
            "-z",
            "--diff-filter=ACMRD",
            *diff_args,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    fields = result.stdout.split("\0")
    if fields and not fields[-1]:
        fields.pop()

    changed: list[tuple[Path, str]] = []
    index = 0
    while index < len(fields):
        status = fields[index][0]
        index += 1
        if status in {"C", "R"}:
            index += 1
        path = repo / fields[index]
        index += 1
        changed.append((path, status))
    return changed

def git_changed_paths(repo: Path, base: str, head: str, mode: str) -> list[tuple[Path, str]]:
    if mode == "revisions":
        return run_git_changed_paths(repo, [f"{base}..{head}"])
    if mode == "local-patch":
        unstaged = run_git_changed_paths(repo, [base])
        staged = run_git_changed_paths(repo, ["--cached", base])
        combined = dict(staged)
        combined.update(unstaged)
        return sorted(combined.items())
    raise SystemExit(f"Unknown diff mode: {mode}")

def make_diff_rank_input(args: argparse.Namespace) -> None:
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        raise SystemExit(f"Repo path not found: {repo}")

    rows: list[JsonRow] = []
    for path, status in git_changed_paths(repo, args.base, args.head, args.mode):
        rel = path.relative_to(repo)
        if path_is_excluded(rel) or path.suffix.lower() not in TEXT_CODE_EXTENSIONS:
            continue

        if status == "D":
            preview = ""
        elif path.is_file():
            preview, is_binary = preview_for(path, args.preview_bytes)
            if is_binary:
                continue
        else:
            preview = ""
        rows.append({"path": rel.as_posix(), "area": args.area, "preview": preview})

    rows.sort(key=lambda row: str(row["path"]))
    output = Path(args.out).expanduser()
    write_jsonl(output, rows)
    print(f"Wrote {len(rows)} rows to {output}")

def make_rank_shards(args: argparse.Namespace) -> None:
    if args.max_rows < 1:
        raise SystemExit("--max-rows must be at least 1")

    rank_input = Path(args.rank_input).expanduser()
    rows = load_jsonl(rank_input, "Rank input", validate_rank_input_row)
    require_unique_paths(rows, "Rank input")

    output_dir = Path(args.out_dir).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted((*output_dir.glob(SHARD_INPUT_GLOB), *output_dir.glob(SHARD_OUTPUT_GLOB)))
    if existing:
        raise SystemExit(f"Rank shard directory already contains shard files: {output_dir}")

    shard_count = 0
    for start in range(0, len(rows), args.max_rows):
        shard_count += 1
        shard_path = output_dir / f"rank-shard-{shard_count:04d}.input.jsonl"
        write_jsonl(shard_path, rows[start : start + args.max_rows])

    print(f"Wrote {shard_count} rank shards to {output_dir}")

def discover_input_shards(shard_dir: Path) -> list[Path]:
    if not shard_dir.is_dir():
        raise SystemExit(f"Rank shard directory missing: {shard_dir}")

    numbered_shards: list[tuple[int, Path]] = []
    for path in shard_dir.glob(SHARD_INPUT_GLOB):
        match = SHARD_INPUT_PATTERN.fullmatch(path.name)
        if match is None:
            raise SystemExit(f"Rank input shard has invalid name: {path.name}")
        numbered_shards.append((int(match.group(1)), path))
    numbered_shards.sort(key=lambda item: (item[0], item[1].name))
    input_shards = [path for _, path in numbered_shards]
    expected_names = [
        f"rank-shard-{index:04d}.input.jsonl" for index in range(1, len(input_shards) + 1)
    ]
    actual_names = [path.name for path in input_shards]
    if actual_names != expected_names:
        raise SystemExit(
            "Rank input shards must use contiguous canonical names; "
            f"expected={expected_names}; actual={actual_names}"
        )
    return input_shards

def output_name_for(input_name: str) -> str:
    return input_name.replace(".input.jsonl", ".output.jsonl")

def require_plan_shard_dir(plan_path: Path, shard_dir: Path) -> None:
    expected = plan_path.parent / "rank_shards"
    if shard_dir.resolve() != expected.resolve():
        raise SystemExit(
            "Rank shard directory must be the assignment plan's sibling rank_shards "
            f"directory; expected={expected}; actual={shard_dir}"
        )

def require_no_misplaced_rank_shards(plan_path: Path) -> None:
    misplaced = sorted(
        (
            *plan_path.parent.glob(SHARD_INPUT_GLOB),
            *plan_path.parent.glob(SHARD_OUTPUT_GLOB),
        ),
        key=lambda path: path.name,
    )
    if misplaced:
        raise SystemExit(
            "Rank shard artifacts must be stored in the assignment plan's sibling "
            f"rank_shards directory; misplaced={[path.name for path in misplaced]}"
        )

def make_rank_pool_plan(args: argparse.Namespace) -> None:
    if args.usable_worker_slots < 1:
        raise SystemExit("--usable-worker-slots must be at least 1")

    shard_dir = Path(args.shard_dir).expanduser()
    output = Path(args.out).expanduser()
    require_plan_shard_dir(output, shard_dir)
    input_shards = discover_input_shards(shard_dir)
    worker_count = min(len(input_shards), args.usable_worker_slots, RANK_POOL_WORKER_CAP)
    workers: list[dict[str, object]] = []
    for worker_index in range(worker_count):
        assigned_inputs = [path.name for path in input_shards[worker_index::worker_count]]
        workers.append(
            {
                "slot": worker_index + 1,
                "input_shards": assigned_inputs,
                "output_shards": [output_name_for(name) for name in assigned_inputs],
            }
        )

    plan: dict[str, object] = {
        "schema_version": RANK_POOL_PLAN_SCHEMA_VERSION,
        "strategy": RANK_POOL_STRATEGY,
        "shard_count": len(input_shards),
        "ranking_worker_count": worker_count,
        "workers": workers,
    }
    write_json(output, plan)
    print(f"Assigned {len(input_shards)} rank shards to {worker_count} ranking workers in {output}")

def load_rank_pool_plan(plan_path: Path) -> tuple[dict[str, object], bytes]:
    if not plan_path.exists():
        raise SystemExit(f"Rank pool plan missing: {plan_path}")
    plan_bytes = plan_path.read_bytes()
    try:
        payload: object = json.loads(plan_bytes)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{plan_path}: invalid JSON: {exc.msg}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{plan_path}: expected a JSON object")
    return {str(key): value for key, value in payload.items()}, plan_bytes

def require_integer(value: object, label: str, *, minimum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise SystemExit(f"{label} must be an integer of at least {minimum}")
    return value

def require_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise SystemExit(f"{label} must be a non-empty list")
    if any(not isinstance(item, str) or not item for item in value):
        raise SystemExit(f"{label} entries must be non-empty strings")
    return [item for item in value if isinstance(item, str)]

def assignment_differences(
    assigned_names: list[str], expected_names: list[str]
) -> tuple[list[str], list[str], list[str]]:
    counts = Counter(assigned_names)
    duplicates = sorted(name for name, count in counts.items() if count > 1)
    assigned = set(assigned_names)
    expected = set(expected_names)
    return sorted(expected - assigned), duplicates, sorted(assigned - expected)

def validate_rank_pool_plan(
    plan_path: Path, shard_dir: Path
) -> tuple[list[Path], list[str], list[RankWorkerAssignment], bytes]:
    require_plan_shard_dir(plan_path, shard_dir)
    require_no_misplaced_rank_shards(plan_path)
    input_shards = discover_input_shards(shard_dir)
    input_names = [path.name for path in input_shards]
    output_names = [output_name_for(name) for name in input_names]
    plan, plan_bytes = load_rank_pool_plan(plan_path)
    expected_fields = {
        "schema_version",
        "strategy",
        "shard_count",
        "ranking_worker_count",
        "workers",
    }
    actual_fields = set(plan)
    if actual_fields != expected_fields:
        raise SystemExit(
            f"{plan_path}: rank pool plan fields do not match schema; "
            f"missing={sorted(expected_fields - actual_fields)}; "
            f"unexpected={sorted(actual_fields - expected_fields)}"
        )
    schema_version = require_integer(
        plan["schema_version"], f"{plan_path}: schema_version", minimum=1
    )
    if schema_version != RANK_POOL_PLAN_SCHEMA_VERSION:
        raise SystemExit(f"{plan_path}: schema_version must be {RANK_POOL_PLAN_SCHEMA_VERSION}")
    if plan["strategy"] != RANK_POOL_STRATEGY:
        raise SystemExit(f"{plan_path}: strategy must be {RANK_POOL_STRATEGY}")

    shard_count = require_integer(plan["shard_count"], f"{plan_path}: shard_count", minimum=0)
    if shard_count != len(input_shards):
        raise SystemExit(
            f"{plan_path}: shard_count does not match input shards; "
            f"plan={shard_count}; actual={len(input_shards)}"
        )
    worker_count = require_integer(
        plan["ranking_worker_count"], f"{plan_path}: ranking_worker_count", minimum=0
    )
    if shard_count > 0 and worker_count == 0:
        raise SystemExit(
            f"{plan_path}: ranking_worker_count must be at least 1 when input shards exist"
        )
    if worker_count > shard_count:
        raise SystemExit(f"{plan_path}: ranking_worker_count cannot exceed shard_count")
    if worker_count > RANK_POOL_WORKER_CAP:
        raise SystemExit(f"{plan_path}: ranking_worker_count cannot exceed {RANK_POOL_WORKER_CAP}")

    workers = plan["workers"]
    if not isinstance(workers, list) or len(workers) != worker_count:
        raise SystemExit(
            f"{plan_path}: workers must contain exactly {worker_count} worker assignments"
        )

    assigned_inputs: list[str] = []
    assigned_outputs: list[str] = []
    parsed_workers: list[RankWorkerAssignment] = []
    worker_fields = {"slot", "input_shards", "output_shards"}
    for worker_index, raw_worker in enumerate(workers):
        label = f"{plan_path}: workers[{worker_index}]"
        if not isinstance(raw_worker, dict):
            raise SystemExit(f"{label} must be a JSON object")
        worker = {str(key): value for key, value in raw_worker.items()}
        if set(worker) != worker_fields:
            raise SystemExit(
                f"{label} fields do not match schema; "
                f"missing={sorted(worker_fields - set(worker))}; "
                f"unexpected={sorted(set(worker) - worker_fields)}"
            )
        slot = require_integer(worker["slot"], f"{label}.slot", minimum=1)
        if slot != worker_index + 1:
            raise SystemExit(f"{label}.slot must be {worker_index + 1}")
        worker_inputs = require_string_list(worker["input_shards"], f"{label}.input_shards")
        worker_outputs = require_string_list(worker["output_shards"], f"{label}.output_shards")
        if len(worker_inputs) != len(worker_outputs):
            raise SystemExit(f"{label} input_shards and output_shards lengths must match")
        expected_worker_outputs = [output_name_for(name) for name in worker_inputs]
        if worker_outputs != expected_worker_outputs:
            raise SystemExit(f"{label}.output_shards do not match its input_shards")
        assigned_inputs.extend(worker_inputs)
        assigned_outputs.extend(worker_outputs)
        parsed_workers.append((slot, worker_inputs, worker_outputs))

    missing, duplicates, unexpected = assignment_differences(assigned_inputs, input_names)
    if missing or duplicates or unexpected:
        raise SystemExit(
            f"{plan_path}: pool plan must assign each input shard exactly once; "
            f"missing={missing}; duplicates={duplicates}; unexpected={unexpected}"
        )
    missing, duplicates, unexpected = assignment_differences(assigned_outputs, output_names)
    if missing or duplicates or unexpected:
        raise SystemExit(
            f"{plan_path}: pool plan must assign each output shard exactly once; "
            f"missing={missing}; duplicates={duplicates}; unexpected={unexpected}"
        )

    for worker_index, (_, worker_inputs, worker_outputs) in enumerate(parsed_workers):
        expected_inputs = input_names[worker_index::worker_count]
        expected_outputs = output_names[worker_index::worker_count]
        if worker_inputs != expected_inputs or worker_outputs != expected_outputs:
            raise SystemExit(
                f"{plan_path}: worker slot {worker_index + 1} does not match the deterministic "
                f"{RANK_POOL_STRATEGY} assignment"
            )
    return input_shards, output_names, parsed_workers, plan_bytes

def validate_rank_worker_command(args: argparse.Namespace) -> None:
    plan_path = Path(args.plan).expanduser()
    shard_dir = Path(args.shard_dir).expanduser()
    _, _, workers, plan_bytes = validate_rank_pool_plan(plan_path, shard_dir)

    slot = require_integer(args.slot, "--slot", minimum=1)
    worker_count = len(workers)
    if slot > worker_count:
        raise SystemExit(f"--slot must be at most {worker_count}")

    assigned_slot, input_names, output_names = workers[slot - 1]
    if assigned_slot != slot:
        raise SystemExit(f"{plan_path}: worker assignment for slot {slot} is inconsistent")

    row_count = 0
    outputs_digest = hashlib.sha256()
    for input_name, output_name in zip(input_names, output_names, strict=True):
        input_shard = shard_dir / input_name
        output_shard = shard_dir / output_name
        _, output_rows = validate_rank_shard(input_shard, output_shard)
        output_bytes = output_shard.read_bytes()
        row_count += len(output_rows)
        outputs_digest.update(output_name.encode("utf-8"))
        outputs_digest.update(b"\0")
        outputs_digest.update(output_bytes)
        outputs_digest.update(b"\0")

    receipt: dict[str, object] = {
        "schema_version": 1,
        "plan_sha256": hashlib.sha256(plan_bytes).hexdigest(),
        "slot": slot,
        "ranking_worker_count": worker_count,
        "output_shards": len(output_names),
        "rows": row_count,
        "outputs_sha256": outputs_digest.hexdigest(),
        "status": "complete",
    }
    print("RANK_WORKER_RECEIPT " + json.dumps(receipt, sort_keys=True, separators=(",", ":")))

def validate_rank_pool_command(args: argparse.Namespace) -> None:
    plan_path = Path(args.plan).expanduser()
    shard_dir = Path(args.shard_dir).expanduser()
    input_shards, expected_output_names, workers, _ = validate_rank_pool_plan(plan_path, shard_dir)

    actual_output_names = {path.name for path in shard_dir.glob(SHARD_OUTPUT_GLOB)}
    expected_outputs = set(expected_output_names)
    if actual_output_names != expected_outputs:
        missing = sorted(expected_outputs - actual_output_names)
        unexpected = sorted(actual_output_names - expected_outputs)
        raise SystemExit(
            "Rank pool outputs are incomplete; "
            f"missing output shards={missing}; unexpected output shards={unexpected}"
        )

    row_count = 0
    for input_shard in input_shards:
        output_shard = input_shard.with_name(output_name_for(input_shard.name))
        _, shard_outputs = validate_rank_shard(input_shard, output_shard)
        row_count += len(shard_outputs)
    print(
        f"Validated {len(workers)} ranking workers, "
        f"{len(input_shards)} shards, and {row_count} ranking rows"
    )

def validate_rank_shard(
    input_shard: Path, output_shard: Path
) -> tuple[list[JsonRow], list[JsonRow]]:
    shard_inputs = load_jsonl(input_shard, "Rank input shard", validate_rank_input_row)
    require_unique_paths(shard_inputs, f"Rank input shard {input_shard.name}")
    shard_outputs = load_jsonl(output_shard, "Rank output shard", validate_rank_output_row)
    require_unique_paths(shard_outputs, f"Rank output shard {output_shard.name}")

    expected_paths = {str(row["path"]) for row in shard_inputs}
    actual_paths = {str(row["path"]) for row in shard_outputs}
    if expected_paths != actual_paths:
        missing = sorted(expected_paths - actual_paths)
        unknown = sorted(actual_paths - expected_paths)
        raise SystemExit(
            f"{output_shard}: paths do not match its input shard; "
            f"missing={missing}; unknown={unknown}"
        )

    area_by_path = {str(row["path"]): row["area"] for row in shard_inputs}
    for row in shard_outputs:
        row_path = str(row["path"])
        if row["area"] != area_by_path[row_path]:
            raise SystemExit(f"{output_shard}: area does not match rank input for {row_path}")
    return shard_inputs, shard_outputs

def validate_rank_shard_command(args: argparse.Namespace) -> None:
    input_shard = Path(args.input).expanduser()
    output_shard = Path(args.output).expanduser()
    _, output_rows = validate_rank_shard(input_shard, output_shard)
    print(f"Validated {len(output_rows)} ranking rows in {output_shard}")

def merge_rank_outputs(args: argparse.Namespace) -> None:
    rank_input = Path(args.rank_input).expanduser()
    authoritative_rows = load_jsonl(rank_input, "Rank input", validate_rank_input_row)
    require_unique_paths(authoritative_rows, "Rank input")

    shard_dir = Path(args.shard_dir).expanduser()
    input_shards = discover_input_shards(shard_dir)
    output_shards = sorted(shard_dir.glob(SHARD_OUTPUT_GLOB))
    expected_output_names = {
        path.name.replace(".input.jsonl", ".output.jsonl") for path in input_shards
    }
    actual_output_names = {path.name for path in output_shards}
    if expected_output_names != actual_output_names:
        missing = sorted(expected_output_names - actual_output_names)
        unexpected = sorted(actual_output_names - expected_output_names)
        details: list[str] = []
        if missing:
            details.append(f"missing output shards {missing}")
        if unexpected:
            details.append(f"unexpected output shards {unexpected}")
        raise SystemExit(f"Rank shard outputs are incomplete: {'; '.join(details)}")

    sharded_inputs: list[JsonRow] = []
    output_by_path: dict[str, JsonRow] = {}
    for input_shard in input_shards:
        output_shard = input_shard.with_name(
            input_shard.name.replace(".input.jsonl", ".output.jsonl")
        )
        shard_inputs, shard_outputs = validate_rank_shard(input_shard, output_shard)
        sharded_inputs.extend(shard_inputs)
        for row in shard_outputs:
            row_path = str(row["path"])
            if row_path in output_by_path:
                raise SystemExit(f"Rank outputs contain duplicate path: {row_path}")
            output_by_path[row_path] = row

    if sharded_inputs != authoritative_rows:
        raise SystemExit("Rank input shards do not exactly partition the authoritative rank input")

    merged = [output_by_path[str(row["path"])] for row in authoritative_rows]
    output = Path(args.out).expanduser()
    write_jsonl(output, merged)
    print(f"Merged {len(merged)} ranking rows into {output}")

def copy_deep_review_input(args: argparse.Namespace) -> None:
    rank_input = Path(args.rank_input).expanduser()
    rows = load_jsonl(rank_input, "Rank input", validate_rank_input_row)
    require_unique_paths(rows, "Rank input")
    selected = [{"path": row["path"], "area": row["area"]} for row in rows]

    output = Path(args.out).expanduser()
    write_jsonl(output, selected)
    print(f"Copied {len(selected)} rows into {output}")

def select_deep_review_input(args: argparse.Namespace) -> None:
    rank_output = Path(args.rank_output).expanduser()
    rows = load_jsonl(rank_output, "Rank output", validate_rank_output_row)
    require_unique_paths(rows, "Rank output")

    included = [row for row in rows if row["include"]]
    base_rows = included if included else rows
    base_rows.sort(key=lambda row: (-int(row["score"]), str(row["path"])))
    keep = max(1, int(len(base_rows) * (args.top_percent / 100.0))) if base_rows else 0
    selected = [{"path": row["path"], "area": row["area"]} for row in base_rows[:keep]]

    output = Path(args.out).expanduser()
    write_jsonl(output, selected)
    print(f"Selected {len(selected)} of {len(base_rows)} rows into {output}")

def main() -> None:
    args = parse_args()
    if args.command == "make-repo-rank-input":
        make_repo_rank_input(args)
    elif args.command == "make-repo-scope-input":
        make_repo_scope_input(args)
    elif args.command == "bind-repo-scopes":
        bind_repo_scopes(args)
    elif args.command == "make-diff-rank-input":
        make_diff_rank_input(args)
    elif args.command == "make-rank-shards":
        make_rank_shards(args)
    elif args.command == "make-rank-pool-plan":
        make_rank_pool_plan(args)
    elif args.command == "validate-rank-shard":
        validate_rank_shard_command(args)
    elif args.command == "validate-rank-worker":
        validate_rank_worker_command(args)
    elif args.command == "validate-rank-pool":
        validate_rank_pool_command(args)
    elif args.command == "merge-rank-outputs":
        merge_rank_outputs(args)
    elif args.command == "copy-deep-review-input":
        copy_deep_review_input(args)
    elif args.command == "select-deep-review-input":
        select_deep_review_input(args)
    else:
        raise SystemExit(f"Unknown command: {args.command}")

if __name__ == "__main__":
    main()
```

## File: `scripts/launch_codex_security_mcp`

```text
#!/bin/sh
set -eu

PATH="${PATH:-/usr/bin:/bin}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PATH

launcher_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
server_path=$launcher_dir/../mcp/server.mjs
cache_root=${XDG_CACHE_HOME:-${HOME:-}/.cache}
codex_resources=
case "${CODEX_CLI_PATH:-}" in
  */*) codex_resources=${CODEX_CLI_PATH%/*} ;;
esac

for candidate in \
  "${CODEX_MCP_NODE_PATH:-}" \
  "${CODEX_BROWSER_USE_NODE_PATH:-}" \
  "${CODEX_ELECTRON_RESOURCES_PATH:-}/cua_node/bin/node" \
  "$codex_resources/cua_node/bin/node" \
  "$cache_root/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    exec "$candidate" "$server_path" "$@"
  fi
done

if command -v node >/dev/null 2>&1; then
  exec node "$server_path" "$@"
fi

printf '%s\n' 'Codex Security could not find a Node runtime. Reinstall or update Codex, or set CODEX_MCP_NODE_PATH to an executable Node runtime.' >&2
exit 127
```

## File: `scripts/launch_codex_security_mcp.cmd`

```bat
@echo off
setlocal DisableDelayedExpansion

set "CODEX_SECURITY_MCP_SCRIPT=%~dp0..\mcp\server.mjs"

rem This process waits for Node and must not keep the installed plugin directory locked.
if "%~d0"=="" (cd /d "%SystemRoot%") else (cd /d "%~d0\")
if errorlevel 1 (
  echo Codex Security could not start: no safe Windows working directory. 1>&2
  exit /b 1
)

rem WindowsApps can expose a Node path that exists but cannot be executed.
rem Prefer relocated user-writable runtimes before probing packaged paths.
if defined LOCALAPPDATA for /d %%D in ("%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\*") do if exist "%%~fD\bin\node.exe" ("%%~fD\bin\node.exe" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined XDG_CACHE_HOME if exist "%XDG_CACHE_HOME%\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ("%XDG_CACHE_HOME%\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined USERPROFILE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ("%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined CODEX_MCP_NODE_PATH if exist "%CODEX_MCP_NODE_PATH%" ("%CODEX_MCP_NODE_PATH%" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined CODEX_BROWSER_USE_NODE_PATH if exist "%CODEX_BROWSER_USE_NODE_PATH%" ("%CODEX_BROWSER_USE_NODE_PATH%" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined CODEX_ELECTRON_RESOURCES_PATH if exist "%CODEX_ELECTRON_RESOURCES_PATH%\cua_node\bin\node.exe" ("%CODEX_ELECTRON_RESOURCES_PATH%\cua_node\bin\node.exe" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)
if defined CODEX_CLI_PATH for %%I in ("%CODEX_CLI_PATH%") do if exist "%%~dpIcua_node\bin\node.exe" ("%%~dpIcua_node\bin\node.exe" "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)

where node >nul 2>&1
if not errorlevel 1 (node "%CODEX_SECURITY_MCP_SCRIPT%" %* & exit)

echo Codex Security could not find a Node runtime. Reinstall or update Codex, or set CODEX_MCP_NODE_PATH to an executable Node runtime. 1>&2
exit /b 127
```

## File: `scripts/normalize_candidates.py`

```python
#!/usr/bin/env python3
"""Validate and combine security-scan candidates into deterministic JSONL."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any

CWE = re.compile(r"(?i)CWE-(\d+)")
ROLES = {
    "entrypoint": 0,
    "entrypoint/wrapper": 1,
    "source": 2,
    "root_control": 3,
    "sink": 4,
    "concrete_implementation": 5,
    "evidence": 6,
}
FIELDS = {
    "candidate_id",
    "cwe_ids",
    "locations",
    "summary",
    "evidence",
    "context",
    "instance",
}

def text_field(row: dict[str, Any], field: str, *, required: bool = True) -> str | None:
    value = row.get(field)
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field}: expected a non-empty string")
    return value.strip()

def cwe_ids(row: dict[str, Any]) -> list[str]:
    value = row.get("cwe_ids")
    if not isinstance(value, list):
        raise ValueError("cwe_ids: expected an array")
    found: set[int] = set()
    for item in value:
        if not isinstance(item, str):
            raise ValueError("cwe_ids: expected CWE strings")
        match = CWE.fullmatch(item.strip())
        if match is None or int(match[1]) < 1:
            raise ValueError(f"cwe_ids: unsupported value {item!r}")
        found.add(int(match[1]))
    return [f"CWE-{number}" for number in sorted(found)]

def relative_file(value: Any, repo_root: Path) -> tuple[str, Path]:
    if not isinstance(value, str) or not value or "\0" in value:
        raise ValueError("path: expected a non-empty repository-relative path")
    raw = value
    if sys.platform == "win32":
        raw = raw.replace("\\", "/")
    path = PurePosixPath(raw)
    if (
        path.is_absolute()
        or ".." in path.parts
        or (sys.platform == "win32" and re.match(r"^[A-Za-z]:", raw))
    ):
        raise ValueError("path: expected a repository-relative path without traversal")
    resolved = (repo_root / raw).resolve(strict=True)
    try:
        relative = resolved.relative_to(repo_root).as_posix()
    except ValueError as error:
        raise ValueError("path: must resolve inside --repo-root") from error
    if not resolved.is_file():
        raise ValueError("path: expected a regular file")
    return relative, resolved

def positive_line(value: Any, field: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 1:
        raise ValueError(f"{field}: expected a positive integer")
    return value

def normalize_locations(
    row: dict[str, Any], repo_root: Path, line_counts: dict[Path, int]
) -> list[dict[str, Any]]:
    value = row.get("locations")
    if not isinstance(value, list) or not value:
        raise ValueError("locations: expected a non-empty array")
    normalized: dict[tuple[str, int, int, str], dict[str, Any]] = {}
    for item in value:
        if not isinstance(item, dict):
            raise ValueError("locations: expected location objects")
        unknown = set(item) - {"path", "start_line", "end_line", "role"}
        if unknown:
            raise ValueError(f"locations: unsupported fields {', '.join(sorted(unknown))}")
        relative, source = relative_file(item.get("path"), repo_root)
        if (
            not relative.strip()
            or "\\" in relative
            or any(":" in part for part in PurePosixPath(relative).parts)
        ):
            raise ValueError("path: expected a safe repository-relative POSIX path")
        start = positive_line(item.get("start_line"), "start_line")
        end = positive_line(item.get("end_line", start), "end_line")
        if end < start:
            raise ValueError("end_line: must be greater than or equal to start_line")
        if source not in line_counts:
            line_counts[source] = len(source.read_bytes().splitlines())
        if end > line_counts[source]:
            raise ValueError(f"line range {start}-{end} exceeds {relative}:{line_counts[source]}")
        role = item.get("role")
        if not isinstance(role, str) or role not in ROLES:
            raise ValueError(f"role: unsupported value {role!r}")
        key = (relative, start, end, role)
        normalized[key] = {
            "path": relative,
            "start_line": start,
            "end_line": end,
            "role": role,
        }
    return sorted(
        normalized.values(),
        key=lambda item: (
            ROLES[item["role"]],
            item["path"],
            item["start_line"],
            item["end_line"],
        ),
    )

def read_scope(path: Path, repo_root: Path, *, allow_missing: bool = False) -> set[str]:
    contents = path.read_bytes().decode("utf-8")
    lines = contents.split("\n")
    listed_rows = set(lines)

    def is_scope_file(value: str) -> bool:
        try:
            relative_file(value, repo_root)
        except (OSError, ValueError):
            return False
        return True

    carriage_rows = {
        line: (is_scope_file(line), is_scope_file(line.removesuffix("\r")))
        for line in lines
        if line.endswith("\r") and line != "\r" and sys.platform != "win32"
    }
    crlf_evidence = any(line == "\r" for line in lines) or any(
        stripped and not literal for literal, stripped in carriage_rows.values()
    )
    literal_evidence = any(literal and not stripped for literal, stripped in carriage_rows.values())

    scope: set[str] = set()
    for number, line in enumerate(lines, 1):
        if sys.platform == "win32" or line == "\r":
            line = line.removesuffix("\r")
        elif line.endswith("\r"):
            literal, stripped = carriage_rows[line]
            if stripped and not literal:
                line = line.removesuffix("\r")
            elif stripped and literal:
                if number == len(lines) and not contents.endswith("\n"):
                    pass
                elif line.removesuffix("\r") in listed_rows:
                    pass
                elif crlf_evidence and not literal_evidence:
                    line = line.removesuffix("\r")
                elif literal_evidence and not crlf_evidence:
                    pass
                else:
                    raise ValueError(f"in-scope file row {number}: ambiguous carriage-return paths")
            elif not literal and crlf_evidence:
                line = line.removesuffix("\r")
        if not line:
            continue
        try:
            relative, _ = relative_file(line, repo_root)
        except (OSError, ValueError) as error:
            if allow_missing and isinstance(error, FileNotFoundError):
                candidate = PurePosixPath(line)
                if candidate.is_absolute() or ".." in candidate.parts or "\0" in line:
                    raise ValueError(f"in-scope file row {number}: unsafe deleted path") from error
                resolved = (repo_root / line).resolve(strict=False)
                try:
                    relative = resolved.relative_to(repo_root).as_posix()
                except ValueError as escaped:
                    raise ValueError(
                        f"in-scope file row {number}: path escapes repository"
                    ) from escaped
                scope.add(relative)
                continue
            raise ValueError(f"in-scope file row {number}: {error}") from error
        scope.add(relative)
    return scope

def normalize_candidate(
    row: dict[str, Any], repo_root: Path, scope: set[str], line_counts: dict[Path, int]
) -> dict[str, Any]:
    unknown = set(row) - FIELDS
    if unknown:
        raise ValueError(f"unsupported fields {', '.join(sorted(unknown))}")
    if "candidate_id" in row:
        text_field(row, "candidate_id")
    candidate_locations = normalize_locations(row, repo_root, line_counts)
    if not any(item["path"] in scope for item in candidate_locations):
        raise ValueError("locations: expected at least one in-scope file")
    result: dict[str, Any] = {
        "cwe_ids": cwe_ids(row),
        "locations": candidate_locations,
        "summary": text_field(row, "summary"),
        "evidence": text_field(row, "evidence"),
    }
    context = text_field(row, "context", required=False)
    if context is not None:
        result["context"] = context
    instance = text_field(row, "instance", required=False)
    if instance is not None:
        result["instance"] = instance
    return result

def identity(row: dict[str, Any]) -> str:
    return json.dumps(
        {
            "cwe_ids": row["cwe_ids"],
            "locations": row["locations"],
            "instance": row.get("instance"),
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )

def merged_text(group: list[dict[str, Any]], field: str) -> str:
    return "\n".join(sorted({item[field] for item in group if field in item}))

def combine(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        groups.setdefault(identity(row), []).append(row)
    combined: list[dict[str, Any]] = []
    for key, group in sorted(groups.items()):
        candidate_id = hashlib.sha256(key.encode()).hexdigest()[:16]

        result = {
            "candidate_id": f"candidate-{candidate_id}",
            "cwe_ids": group[0]["cwe_ids"],
            "locations": group[0]["locations"],
            "summary": merged_text(group, "summary"),
            "evidence": merged_text(group, "evidence"),
        }
        context = merged_text(group, "context")
        if context:
            result["context"] = context
        if "instance" in group[0]:
            result["instance"] = group[0]["instance"]
        combined.append(result)
    return combined

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", nargs="+", required=True, help="Candidate JSONL inputs.")
    parser.add_argument("--out", required=True, help="Combined candidate JSONL output.")
    parser.add_argument("--repo-root", required=True, help="Repository root for candidate paths.")
    parser.add_argument("--in-scope-files", required=True, help="Repository-relative file list.")
    parser.add_argument(
        "--allow-missing-in-scope",
        action="store_true",
        help="Keep deleted Git paths in a diff inventory while validating existing candidate files.",
    )
    args = parser.parse_args()
    try:
        repo_root = Path(args.repo_root).expanduser().resolve(strict=True)
        if not repo_root.is_dir():
            raise ValueError("--repo-root: expected a directory")
        output = Path(args.out).expanduser().resolve(strict=False)
        scope_path = Path(args.in_scope_files).expanduser().resolve(strict=True)
        inputs = sorted({Path(value).expanduser().resolve(strict=True) for value in args.input})
        if output in inputs:
            raise ValueError("--out: must not also be an input")
        if output == scope_path:
            raise ValueError("--out: must not replace --in-scope-files")
        scope = read_scope(scope_path, repo_root, allow_missing=args.allow_missing_in_scope)
        line_counts: dict[Path, int] = {}
        rows: list[dict[str, Any]] = []
        for source in inputs:
            with source.open(encoding="utf-8") as handle:
                for number, line in enumerate(handle, 1):
                    if not line.strip():
                        continue
                    try:
                        row = json.loads(line)
                        if not isinstance(row, dict):
                            raise ValueError("expected a JSON object")
                        rows.append(normalize_candidate(row, repo_root, scope, line_counts))
                    except (ValueError, TypeError, OSError) as error:
                        raise ValueError(f"{source} row {number}: {error}") from error
        combined = combine(rows)
        output.parent.mkdir(parents=True, exist_ok=True)
        payload = "".join(
            json.dumps(row, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n"
            for row in combined
        )
        temporary: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=output.parent,
                prefix=f".{output.name}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temporary = Path(handle.name)
                handle.write(payload)
            temporary.replace(output)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        print(f"Combined {len(rows)} candidate rows into {len(combined)} rows in {output}")
    except (OSError, ValueError) as error:
        print(f"normalize_candidates: {error}", file=sys.stderr)
        raise SystemExit(2) from error

if __name__ == "__main__":
    main()
```

## File: `scripts/rank_preview.py`

```python
"""Build deterministic structural or sampled source previews for rank inputs."""

from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path

DEFAULT_PREVIEW_BYTES = 1024
PREVIEW_HEAD_LINES = 12
PREVIEW_SAMPLE_LINES = 10

TEXT_CODE_EXTENSIONS = {
    ".c",
    ".cc",
    ".cfg",
    ".clj",
    ".cpp",
    ".cs",
    ".css",
    ".cue",
    ".cxx",
    ".dart",
    ".ex",
    ".exs",
    ".go",
    ".graphql",
    ".h",
    ".hpp",
    ".hs",
    ".html",
    ".java",
    ".js",
    ".json",
    ".jsx",
    ".kt",
    ".kts",
    ".lua",
    ".mjs",
    ".mm",
    ".php",
    ".proto",
    ".py",
    ".rb",
    ".rs",
    ".scala",
    ".sh",
    ".sql",
    ".swift",
    ".toml",
    ".ts",
    ".tsx",
    ".vue",
    ".xml",
    ".yaml",
    ".yml",
}

JAVASCRIPT_EXTENSIONS = {".js", ".jsx", ".mjs", ".ts", ".tsx", ".vue"}
JAVA_LIKE_EXTENSIONS = {".c", ".cc", ".cpp", ".cs", ".cxx", ".h", ".hpp", ".java", ".mm"}
BRACE_LANGUAGE_EXTENSIONS = {
    *JAVASCRIPT_EXTENSIONS,
    *JAVA_LIKE_EXTENSIONS,
    ".dart",
    ".go",
    ".kt",
    ".kts",
    ".php",
    ".rs",
    ".scala",
    ".swift",
}
NESTED_BLOCK_COMMENT_EXTENSIONS = {".kt", ".kts", ".rs", ".scala", ".swift"}
RUST_RAW_STRING_RE = re.compile(r'(?:br|r)(#{0,16})"')
RUST_LIFETIME_RE = re.compile(r"'[A-Za-z_][A-Za-z0-9_]*")
PHP_HEREDOC_RE = re.compile(r"<<<\s*['\"]?([A-Za-z_]\w*)['\"]?")

def is_binary_sample(data: bytes) -> bool:
    return b"\0" in data

def compact_preview_line(line: str) -> str:
    return " ".join(line.split())

def truncate_utf8(text: str, max_bytes: int) -> str:
    if max_bytes <= 0:
        return ""
    encoded = text.encode("utf-8")
    if len(encoded) <= max_bytes:
        return text
    return encoded[:max_bytes].decode("utf-8", errors="ignore")

def select_preview_lines(lines: list[str]) -> list[str]:
    compact = [value for line in lines if (value := compact_preview_line(line))]
    head = compact[:PREVIEW_HEAD_LINES]
    remainder = compact[PREVIEW_HEAD_LINES:]
    if len(remainder) <= PREVIEW_SAMPLE_LINES:
        return [*head, *remainder]

    last_index = len(remainder) - 1
    sampled = [
        remainder[index * last_index // (PREVIEW_SAMPLE_LINES - 1)]
        for index in range(PREVIEW_SAMPLE_LINES)
    ]
    return [*head, "...", *sampled]

def fit_preview_lines(lines: list[str], max_bytes: int) -> str:
    if not lines or max_bytes <= 0:
        return ""

    full_preview = "\n".join(lines)
    if len(full_preview.encode("utf-8")) <= max_bytes:
        return full_preview

    def render(line_bytes: int) -> str:
        return "\n".join(
            line if line == "..." else truncate_utf8(line, line_bytes).rstrip() for line in lines
        )

    content_lines = [line for line in lines if line != "..."]
    if not content_lines:
        return truncate_utf8(full_preview, max_bytes)
    low = 0
    high = max(len(line.encode("utf-8")) for line in content_lines)
    best = ""
    while low <= high:
        middle = (low + high) // 2
        candidate = render(middle)
        if len(candidate.encode("utf-8")) <= max_bytes:
            best = candidate
            low = middle + 1
        else:
            high = middle - 1
    if best:
        return best
    return truncate_utf8(full_preview, max_bytes)

def python_decorators(node: ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef) -> str:
    values: list[str] = []
    for decorator in node.decorator_list:
        try:
            rendered = compact_preview_line(ast.unparse(decorator))
        except (AttributeError, RecursionError, ValueError):
            continue
        if rendered:
            values.append(f"@{rendered}")
    return " ".join(values)

def python_arguments(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    arguments = [argument.arg for argument in (*node.args.posonlyargs, *node.args.args)]
    if node.args.vararg is not None:
        arguments.append(f"*{node.args.vararg.arg}")
    arguments.extend(argument.arg for argument in node.args.kwonlyargs)
    if node.args.kwarg is not None:
        arguments.append(f"**{node.args.kwarg.arg}")
    return ", ".join(arguments)

def python_outline(text: str) -> list[str]:
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError, TypeError, MemoryError):
        return []

    outline: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            prefix = python_decorators(node)
            kind = "async function" if isinstance(node, ast.AsyncFunctionDef) else "function"
            declaration = f"{kind} {node.name}({python_arguments(node)})"
            outline.append(f"{prefix} {declaration}".strip())
        elif isinstance(node, ast.ClassDef):
            prefix = python_decorators(node)
            bases: list[str] = []
            for base in node.bases:
                try:
                    bases.append(compact_preview_line(ast.unparse(base)))
                except (AttributeError, RecursionError, ValueError):
                    continue
            suffix = f"({', '.join(bases)})" if bases else ""
            outline.append(f"{prefix} class {node.name}{suffix}".strip())
            for member in node.body:
                if not isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                member_prefix = python_decorators(member)
                kind = "async method" if isinstance(member, ast.AsyncFunctionDef) else "method"
                declaration = f"{kind} {node.name}.{member.name}"
                outline.append(f"{member_prefix} {declaration}".strip())
    return outline

def javascript_regex_end(text: str, start: int) -> int | None:
    if start + 1 >= len(text) or text[start + 1] in {"/", "*"}:
        return None
    previous = start - 1
    while previous >= 0 and text[previous] in " \t\r":
        previous -= 1
    if previous >= 0 and text[previous] not in "=(:,[!&|?{};\n":
        prefix = text[max(0, previous - 8) : previous + 1]
        if not re.search(r"\b(?:case|return|throw)$", prefix):
            return None

    index = start + 1
    in_character_class = False
    while index < len(text):
        char = text[index]
        if char == "\n":
            return None
        if char == "\\" and index + 1 < len(text):
            index += 2
            continue
        if char == "[":
            in_character_class = True
        elif char == "]":
            in_character_class = False
        elif char == "/" and not in_character_class:
            index += 1
            while index < len(text) and text[index].isalpha():
                index += 1
            return index
        index += 1
    return None

def mask_c_style_source(text: str, suffix: str) -> str:
    masked: list[str] = []
    index = 0
    block_comment_depth = 0
    in_line_comment = False
    quote = ""
    raw_terminator = ""
    heredoc_terminator = ""
    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ""
        if char == "\n":
            masked.append(char)
            in_line_comment = False
            if quote and quote not in {"`", '"""', "'''", '@"'}:
                quote = ""
            index += 1
            continue
        if in_line_comment:
            masked.append(" ")
            index += 1
            continue
        if block_comment_depth:
            if char == "/" and next_char == "*" and suffix in NESTED_BLOCK_COMMENT_EXTENSIONS:
                masked.extend((" ", " "))
                block_comment_depth += 1
                index += 2
            elif char == "*" and next_char == "/":
                masked.extend((" ", " "))
                block_comment_depth -= 1
                index += 2
            else:
                masked.append(" ")
                index += 1
            continue
        if heredoc_terminator:
            if index == 0 or text[index - 1] == "\n":
                line_end = text.find("\n", index)
                if line_end < 0:
                    line_end = len(text)
                candidate = text[index:line_end].strip().removesuffix(";")
                if candidate == heredoc_terminator:
                    masked.extend(" " * (line_end - index))
                    index = line_end
                    heredoc_terminator = ""
                    continue
            masked.append(" ")
            index += 1
            continue
        if raw_terminator:
            if text.startswith(raw_terminator, index):
                masked.extend(" " * len(raw_terminator))
                index += len(raw_terminator)
                raw_terminator = ""
            else:
                masked.append(" ")
                index += 1
            continue
        if quote in {'"""', "'''"}:
            if text.startswith(quote, index):
                masked.extend(" " * len(quote))
                index += len(quote)
                quote = ""
            else:
                masked.append(" ")
                index += 1
            continue
        if quote == '@"':
            masked.append(" ")
            if char == '"' and next_char == '"':
                masked.append(" ")
                index += 2
            else:
                if char == '"':
                    quote = ""
                index += 1
            continue
        if quote:
            if char == "\\" and next_char:
                masked.append(" ")
                if next_char == "\n":
                    index += 1
                else:
                    masked.append(" ")
                    index += 2
            else:
                masked.append(" ")
                if char == quote:
                    quote = ""
                index += 1
            continue
        if suffix == ".rs":
            raw_match = RUST_RAW_STRING_RE.match(text, index)
            if raw_match:
                token = raw_match.group(0)
                masked.extend(" " * len(token))
                raw_terminator = f'"{raw_match.group(1)}'
                index += len(token)
                continue
            if char == "'":
                lifetime_match = RUST_LIFETIME_RE.match(text, index)
                if lifetime_match:
                    token = lifetime_match.group(0)
                    following = text[index + len(token) : index + len(token) + 1]
                    if following != "'":
                        masked.extend(token)
                        index += len(token)
                        continue
        if suffix == ".cs" and char == "@" and next_char == '"':
            masked.extend((" ", " "))
            quote = '@"'
            index += 2
            continue
        triple_quote = text[index : index + 3]
        if triple_quote in {'"""', "'''"}:
            masked.extend((" ", " ", " "))
            quote = triple_quote
            index += 3
            continue
        if suffix == ".php" and text.startswith("<<<", index):
            heredoc_match = PHP_HEREDOC_RE.match(text, index)
            if heredoc_match:
                token = heredoc_match.group(0)
                masked.extend(" " * len(token))
                heredoc_terminator = heredoc_match.group(1)
                index += len(token)
                continue
        if suffix in JAVASCRIPT_EXTENSIONS and char == "/":
            regex_end = javascript_regex_end(text, index)
            if regex_end is not None:
                masked.extend(" " * (regex_end - index))
                index = regex_end
                continue
        if char == "/" and next_char == "/":
            masked.extend((" ", " "))
            in_line_comment = True
            index += 2
            continue
        if char == "/" and next_char == "*":
            masked.extend((" ", " "))
            block_comment_depth = 1
            index += 2
            continue
        if char == "#" and suffix == ".php" and next_char != "[":
            masked.append(" ")
            in_line_comment = True
            index += 1
            continue
        if char in {'"', "'", "`"}:
            quote = char
            masked.append(" ")
            index += 1
            continue
        masked.append(char)
        index += 1
    return "".join(masked)

def match_type_declaration(line: str, suffix: str) -> tuple[str, str] | None:
    match: re.Match[str] | None = None
    if suffix in JAVASCRIPT_EXTENSIONS:
        match = re.match(
            r"^(?:(?:export|default|declare|abstract)\s+)*(class|interface|enum|namespace)\s+"
            r"([A-Za-z_$][\w$]*)",
            line,
        )
    elif suffix == ".java":
        match = re.search(r"\b(class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)", line)
    elif suffix == ".cs":
        match = re.search(
            r"\b(class|interface|struct|enum|record(?:\s+(?:class|struct))?)\s+"
            r"(@?[A-Za-z_]\w*)",
            line,
        )
    elif suffix == ".php":
        match = re.match(
            r"^(?:(?:abstract|final|readonly)\s+)*(class|interface|trait|enum)\s+"
            r"([A-Za-z_]\w*)",
            line,
        )
    elif suffix == ".go":
        match = re.match(r"^type\s+([A-Za-z_]\w*)\s+(struct|interface)\b", line)
        if match:
            return match.group(2), match.group(1)
    elif suffix in {".kt", ".kts"}:
        companion_match = re.search(r"\bcompanion\s+object(?:\s+([A-Za-z_]\w*))?", line)
        if companion_match:
            return "object", companion_match.group(1) or "Companion"
        match = re.search(
            r"\b((?:(?:data|enum|sealed|annotation|value)\s+)?(?:class|interface|object))\s+"
            r"([A-Za-z_]\w*)",
            line,
        )
    elif suffix == ".scala":
        match = re.match(
            r"^(?:(?:case|sealed|abstract)\s+)*(class|trait|object|enum)\s+([A-Za-z_]\w*)", line
        )
    elif suffix == ".rs":
        match = re.search(r"\b(struct|enum|trait|union)\s+([A-Za-z_]\w*)", line)
        if not match:
            impl_match = re.search(
                r"\bimpl(?:\s*<[^>{}]*>)?\s+(?:[\w:<>]+\s+for\s+)?([A-Za-z_]\w*)",
                line,
            )
            if impl_match:
                return "impl", impl_match.group(1)
    elif suffix == ".swift":
        match = re.search(r"\b(class|struct|enum|protocol|actor|extension)\s+([A-Za-z_]\w*)", line)
    elif suffix == ".dart":
        match = re.search(r"\b(class|mixin|enum|extension)\s+([A-Za-z_]\w*)", line)
    elif suffix in {".c", ".cc", ".cpp", ".cxx", ".h", ".hpp", ".mm"}:
        match = re.search(
            r"\b(class|struct|union|enum(?:\s+class)?)\s+([A-Za-z_]\w*)",
            line,
        )
    if not match:
        return None
    return match.group(1), match.group(2)

CONTROL_NAMES = {
    "assert",
    "catch",
    "for",
    "foreach",
    "if",
    "lock",
    "new",
    "return",
    "sizeof",
    "static_assert",
    "switch",
    "synchronized",
    "throw",
    "typeof",
    "while",
}

def match_java_like_function(
    line: str, suffix: str, type_name: str | None
) -> tuple[str, str] | None:
    paren = line.find("(")
    if paren < 0:
        return None
    before = line[:paren].rstrip()
    if not before or "=" in before or before.startswith("#"):
        return None
    before = re.sub(r"<[^<>]*>$", "", before).rstrip()
    name_match = re.search(
        r"(~?[A-Za-z_$@][\w$@]*(?:(?:::|\.)~?[A-Za-z_$@][\w$@]*)?)$",
        before,
    )
    if not name_match:
        return None
    qualified_name = name_match.group(1)
    name = re.split(r"::|\.", qualified_name)[-1].lstrip("~")
    if name in CONTROL_NAMES:
        return None
    prefix = before[: name_match.start()].strip()
    if not prefix and name != (type_name or ""):
        return None
    if suffix in {".c", ".cc", ".cpp", ".cxx", ".h", ".hpp", ".mm"} and prefix.startswith(
        ("typedef", "using")
    ):
        return None
    if (
        suffix in {".c", ".cc", ".cpp", ".cxx", ".h", ".hpp", ".mm"}
        and type_name is None
        and line.endswith(";")
        and not re.search(
            r"(?:\b(?:auto|bool|char|consteval|constexpr|double|extern|float|inline|int|long|"
            r"short|signed|static|unsigned|void)\b|[*&:]|<)",
            prefix,
        )
    ):
        return None
    return ("method" if type_name else "function"), qualified_name

def match_function_declaration(
    line: str, suffix: str, type_name: str | None
) -> tuple[str, str] | None:
    if suffix in JAVASCRIPT_EXTENSIONS:
        function_match = re.match(
            r"^(?:(?:export|default|declare)\s+)*(async\s+)?function\s*\*?\s*"
            r"([A-Za-z_$][\w$]*)\s*(?:<[^>{}]*>)?\s*\(",
            line,
        )
        if function_match:
            kind = "async function" if function_match.group(1) else "function"
            return kind, function_match.group(2)
        arrow_match = re.match(
            r"^(?:(?:export|declare)\s+)*(?:const|let|var)\s+([A-Za-z_$][\w$]*)"
            r"\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|"
            r"[A-Za-z_$][\w$]*\s*=>)",
            line,
        )
        if arrow_match:
            return "function", arrow_match.group(1)
        if type_name:
            field_arrow_match = re.match(
                r"^(?:(?:public|private|protected|static|abstract|override|readonly|declare|"
                r"accessor)\s+)*(#?[A-Za-z_$][\w$]*)(?:[?!])?\s*(?::[^=]+)?=\s*"
                r"(?:async\s+)?(?:\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>)",
                line,
            )
            if field_arrow_match:
                return "method", field_arrow_match.group(1)
            method_match = re.match(
                r"^(?:(?:public|private|protected|static|abstract|async|override|readonly|"
                r"declare|get|set)\s+)*(#?[A-Za-z_$][\w$]*|constructor)\s*"
                r"(?:<[^>{}]*>)?\s*\(",
                line,
            )
            if method_match and method_match.group(1) not in CONTROL_NAMES:
                return "method", method_match.group(1)
        return None
    if suffix == ".php":
        match = re.match(
            r"^(?:(?:public|protected|private|static|final|abstract|readonly)\s+)*"
            r"function\s*&?\s*([A-Za-z_]\w*)\s*\(",
            line,
        )
        if match:
            return ("method" if type_name else "function"), match.group(1)
        return None
    if suffix == ".go":
        match = re.match(
            r"^func\s+(?:\(([^)]*)\)\s*)?([A-Za-z_]\w*)\s*(?:\[[^]]+\]\s*)?\(",
            line,
        )
        if match:
            receiver = match.group(1)
            name = match.group(2)
            if receiver:
                receiver_match = re.search(r"\*?([A-Za-z_]\w*)(?:\[[^]]*])?\s*$", receiver)
                if receiver_match:
                    return "method", f"{receiver_match.group(1)}.{name}"
                return "method", name
            return ("method" if type_name else "function"), name
        return None
    if suffix in {".kt", ".kts"}:
        match = re.search(r"\bfun\s+(?:<[^>{}]*>\s*)?(?:[\w.<>?]+\.)?([A-Za-z_]\w*)\s*\(", line)
        if match:
            return ("method" if type_name else "function"), match.group(1)
        return None
    if suffix == ".scala":
        match = re.search(r"\bdef\s+([A-Za-z_]\w*)\b", line)
        if match:
            return ("method" if type_name else "function"), match.group(1)
        return None
    if suffix == ".rs":
        match = re.search(
            r"\b(?:async\s+)?(?:unsafe\s+)?(?:extern\s+\"[^\"]+\"\s+)?(?:const\s+)?"
            r"fn\s+([A-Za-z_]\w*)",
            line,
        )
        if match:
            return ("method" if type_name else "function"), match.group(1)
        return None
    if suffix == ".swift":
        match = re.search(r"\bfunc\s+([A-Za-z_]\w*)\s*(?:<[^>{}]*>)?\s*\(", line)
        if match:
            return ("method" if type_name else "function"), match.group(1)
        if type_name and re.search(r"\binit\s*\(", line):
            return "method", "init"
        return None
    if suffix == ".dart":
        return match_java_like_function(line, suffix, type_name)
    if suffix in JAVA_LIKE_EXTENSIONS:
        return match_java_like_function(line, suffix, type_name)
    return None

def is_annotation_line(line: str) -> bool:
    return bool(
        re.match(r"^@[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(.*\))?$", line)
        or re.match(r"^\[[A-Za-z_][^]]*]$", line)
        or re.match(r"^#\[[A-Za-z_][^]]*]$", line)
    )

LEADING_ANNOTATION_RE = re.compile(
    r"^(?:@[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\([^)]*\))?|"
    r"\[[A-Za-z_][^]]*]|#\[[A-Za-z_][^]]*])\s*"
)

def strip_leading_annotations(original: str, masked: str) -> tuple[str, str, list[str]]:
    annotations: list[str] = []
    if masked.startswith("@interface "):
        return original, masked, annotations
    while masked_match := LEADING_ANNOTATION_RE.match(masked):
        original_match = LEADING_ANNOTATION_RE.match(original)
        if original_match:
            annotations.append(compact_preview_line(original_match.group(0)))
            original = original[original_match.end() :].lstrip()
        masked = masked[masked_match.end() :].lstrip()
    return original, masked, annotations

def brace_language_outline(text: str, suffix: str) -> list[str]:
    original_lines = text.splitlines()
    masked_lines = mask_c_style_source(text, suffix).splitlines()
    outline: list[str] = []
    seen: set[str] = set()
    type_stack: list[tuple[str, int]] = []
    function_depths: list[int] = []
    blocked_depths: list[int] = []
    pending_type: str | None = None
    pending_function = False
    pending_annotations: list[str] = []
    depth = 0

    def add(value: str) -> None:
        decorated = f"{' '.join(pending_annotations[-2:])} {value}".strip()
        if decorated not in seen:
            seen.add(decorated)
            outline.append(decorated)

    def next_lines_open_body(line_index: int) -> bool:
        inspected = 0
        for future_index in range(line_index + 1, len(masked_lines)):
            future = masked_lines[future_index]
            future_line = compact_preview_line(future)
            if not future_line:
                continue
            inspected += 1
            if "{" in future_line:
                return True
            if "}" in future_line or future_line.endswith(";") or inspected >= 6:
                return False
        return False

    for line_index, (original, masked) in enumerate(
        zip(original_lines, masked_lines, strict=False)
    ):
        while function_depths and depth < function_depths[-1]:
            function_depths.pop()
        while type_stack and depth < type_stack[-1][1]:
            type_stack.pop()
        while blocked_depths and depth < blocked_depths[-1]:
            blocked_depths.pop()

        masked_line = compact_preview_line(masked)
        original_line = compact_preview_line(original)
        opens = masked.count("{")
        closes = masked.count("}")

        opened_pending_scope = False
        if pending_type and "{" in masked:
            type_stack.append((pending_type, depth + 1))
            pending_type = None
            opened_pending_scope = True
        if pending_function and "{" in masked:
            function_depths.append(depth + 1)
            pending_function = False
            opened_pending_scope = True

        if (
            masked_line
            and original_line
            and is_annotation_line(original_line)
            and not function_depths
            and not blocked_depths
        ):
            pending_annotations.append(original_line)
        elif masked_line and not function_depths and not blocked_depths:
            _, masked_line, inline_annotations = strip_leading_annotations(
                original_line, masked_line
            )
            pending_annotations.extend(inline_annotations)
            current_type = type_stack[-1][0] if type_stack else None
            direct_type_body = not type_stack or depth == type_stack[-1][1]
            type_match = match_type_declaration(masked_line, suffix) if direct_type_body else None
            if type_match:
                kind, name = type_match
                if (
                    current_type
                    and suffix in {".kt", ".kts"}
                    and kind == "object"
                    and name == "Companion"
                ):
                    name = f"{current_type}.{name}"
                add(f"{kind} {name}")
                pending_annotations.clear()
                if "{" in masked:
                    type_stack.append((name, depth + 1))
                elif not masked_line.endswith(";") and next_lines_open_body(line_index):
                    pending_type = name
            elif direct_type_body:
                function_match = match_function_declaration(masked_line, suffix, current_type)
                if function_match:
                    kind, name = function_match
                    qualified_name = (
                        f"{current_type}.{name}"
                        if current_type and "." not in name and "::" not in name
                        else name
                    )
                    add(f"{kind} {qualified_name}")
                    pending_annotations.clear()
                    if "{" in masked:
                        function_depths.append(depth + 1)
                    elif (
                        not masked_line.endswith(";")
                        and "=>" not in masked_line
                        and "=" not in masked_line
                        and next_lines_open_body(line_index)
                    ):
                        pending_function = True
                else:
                    pending_annotations.clear()
                    is_transparent_container = bool(
                        re.match(
                            r"^(?:(?:export|inline)\s+)?namespace\b|"
                            r"^(?:pub\s+)?mod\b|^(?:declare\s+)?module\b|"
                            r"^(?:unsafe\s+)?extern\b",
                            masked_line,
                        )
                    )
                    if opens and not opened_pending_scope and not is_transparent_container:
                        blocked_depths.append(depth + 1)

        depth = max(0, depth + opens - closes)
        while function_depths and depth < function_depths[-1]:
            function_depths.pop()
        while type_stack and depth < type_stack[-1][1]:
            type_stack.pop()
        while blocked_depths and depth < blocked_depths[-1]:
            blocked_depths.pop()
    return outline

def ruby_outline(text: str) -> list[str]:
    outline: list[str] = []
    seen: set[str] = set()
    type_stack: list[tuple[int, str]] = []
    function_indents: list[int] = []

    def add(value: str) -> None:
        if value not in seen:
            seen.add(value)
            outline.append(value)

    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw_line.expandtabs(4)) - len(raw_line.lstrip().expandtabs(4))
        while function_indents and indent <= function_indents[-1]:
            function_indents.pop()
        while type_stack and indent <= type_stack[-1][0]:
            type_stack.pop()

        type_match = re.match(r"^(class|module)\s+([A-Z]\w*(?:::[A-Z]\w*)*)", stripped)
        if type_match and not function_indents:
            kind, name = type_match.groups()
            add(f"{kind} {name}")
            type_stack.append((indent, name))
            continue

        function_match = re.match(r"^def\s+(?:self\.)?([^\s(]+)", stripped)
        if function_match and not function_indents:
            name = function_match.group(1)
            if type_stack:
                add(f"method {type_stack[-1][1]}.{name}")
            else:
                add(f"function {name}")
            function_indents.append(indent)
    return outline

def simple_language_outline(text: str, suffix: str) -> list[str]:
    outline: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        if value not in seen:
            seen.add(value)
            outline.append(value)

    for raw_line in text.splitlines():
        line = compact_preview_line(raw_line)
        if not line:
            continue
        match: re.Match[str] | None = None
        if suffix == ".py":
            match = re.match(r"^(async\s+)?def\s+([A-Za-z_]\w*)\s*\(", line)
            if match:
                add(f"{'async function' if match.group(1) else 'function'} {match.group(2)}")
                continue
            match = re.match(r"^class\s+([A-Za-z_]\w*)", line)
            if match:
                add(f"class {match.group(1)}")
        elif suffix == ".rb":
            match = re.match(r"^(class|module)\s+([A-Z]\w*(?:::[A-Z]\w*)*)", line)
            if match:
                add(f"{match.group(1)} {match.group(2)}")
                continue
            match = re.match(r"^def\s+(?:self\.)?([^\s(]+)", line)
            if match:
                add(f"function {match.group(1)}")
        elif suffix in {".ex", ".exs"}:
            match = re.match(r"^defmodule\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)", line)
            if match:
                add(f"module {match.group(1)}")
                continue
            match = re.match(r"^(?:def|defp|defmacro)\s+([A-Za-z_]\w*[!?]?)", line)
            if match:
                add(f"function {match.group(1)}")
        elif suffix == ".clj":
            match = re.match(
                r"^\((defn|defmacro|defprotocol|defrecord|deftype|defmulti|defmethod)\s+([^\s)]+)",
                line,
            )
            if match:
                add(f"{match.group(1)} {match.group(2)}")
        elif suffix == ".lua":
            match = re.match(r"^(?:local\s+)?function\s+([A-Za-z_]\w*(?:[.:][A-Za-z_]\w*)*)", line)
            if match:
                add(f"function {match.group(1)}")
        elif suffix == ".sh":
            match = re.match(r"^(?:function\s+)?([A-Za-z_]\w*)\s*\(\s*\)\s*\{?", line)
            if match:
                add(f"function {match.group(1)}")
        elif suffix == ".hs":
            match = re.match(r"^(data|newtype|type|class)\s+([A-Z]\w*)", line)
            if match:
                add(f"{match.group(1)} {match.group(2)}")
                continue
            match = re.match(r"^([a-z_]\w*)\s*::", line)
            if match:
                add(f"function {match.group(1)}")
        elif suffix == ".proto":
            match = re.match(r"^(message|service|enum)\s+([A-Za-z_]\w*)", line)
            if match:
                add(f"{match.group(1)} {match.group(2)}")
                continue
            match = re.match(r"^rpc\s+([A-Za-z_]\w*)\s*\(", line)
            if match:
                add(f"rpc {match.group(1)}")
        elif suffix == ".graphql":
            match = re.match(
                r"^(type|interface|input|enum|union|scalar|directive)\s+([A-Za-z_]\w*)",
                line,
            )
            if match:
                add(f"{match.group(1)} {match.group(2)}")
                continue
            match = re.match(r"^(query|mutation|subscription)\s+([A-Za-z_]\w*)", line)
            if match:
                add(f"{match.group(1)} {match.group(2)}")
        elif suffix == ".sql":
            match = re.match(
                r"^CREATE\s+(?:OR\s+REPLACE\s+)?(FUNCTION|PROCEDURE|TABLE|VIEW|TRIGGER)\s+"
                r"([^\s(;]+)",
                line,
                flags=re.IGNORECASE,
            )
            if match:
                add(f"{match.group(1).lower()} {match.group(2)}")
        elif suffix in {".yaml", ".yml"}:
            match = re.match(r"^([A-Za-z0-9_.-]+):(?:\s|$)", raw_line)
            if match:
                add(f"key {match.group(1)}")
        elif suffix in {".toml", ".cfg"}:
            match = re.match(r"^\[([^]]+)]$", line)
            if match:
                add(f"section {match.group(1)}")
    return outline

def json_outline(text: str) -> list[str]:
    try:
        parsed = json.loads(text)
    except (json.JSONDecodeError, RecursionError, MemoryError):
        return []
    if not isinstance(parsed, dict):
        return []
    outline: list[str] = []
    for key, value in parsed.items():
        if isinstance(value, dict) and value:
            children = ", ".join(str(child) for child in value)
            outline.append(f"key {key} [{children}]")
        else:
            outline.append(f"key {key}")
    return outline

def structural_outline(path: Path, text: str) -> list[str]:
    suffix = path.suffix.lower()
    if suffix == ".py":
        return python_outline(text) or simple_language_outline(text, suffix)
    if suffix == ".rb":
        return ruby_outline(text)
    if suffix in BRACE_LANGUAGE_EXTENSIONS:
        return brace_language_outline(text, suffix)
    if suffix == ".json":
        return json_outline(text)
    return simple_language_outline(text, suffix)

def preview_for(
    path: Path, preview_bytes: int, *, max_read_bytes: int | None = None
) -> tuple[str, bool]:
    try:
        with path.open("rb") as source:
            sample = source.read(4096)
            if is_binary_sample(sample):
                return "", True
            remaining = (
                source.read()
                if max_read_bytes is None
                else source.read(max(0, max_read_bytes - len(sample)))
            )
            data = sample + remaining
    except OSError:
        return "", True
    if is_binary_sample(data):
        return "", True
    text = data.decode("utf-8", errors="ignore")
    outline = structural_outline(path, text)
    preview_lines = select_preview_lines(outline or text.splitlines())
    return fit_preview_lines(preview_lines, preview_bytes), False

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build structural or sampled previews for Codex Security rank inputs."
    )
    parser.parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/report_projection.py`

````python
#!/usr/bin/env python3
"""Project canonical Codex Security scan JSON into the standard reports."""

from __future__ import annotations

import argparse
import re
from collections import Counter
from typing import Any

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}
CONFIDENCE_ORDER = {"high": 0, "medium": 1, "low": 2}
REPORTABLE_SEVERITIES = {"critical", "high", "medium", "low"}
DISPOSITION_LABELS = {
    "reported": "Reported",
    "no_issue_found": "No issue found",
    "rejected": "Rejected",
    "not_applicable": "Not applicable",
    "needs_follow_up": "Needs follow-up",
}
WRITEUP_REPORT_PATH_RE = re.compile(r"^findings/([a-z0-9][a-z0-9._-]*)/\1\.md$")

class ReportProjectionError(ValueError):
    """Raised when a canonical scan cannot be projected into a valid report."""

def _text(value: Any, fallback: str) -> str:
    candidate = value if isinstance(value, str) and value.strip() else fallback
    normalized = " ".join(candidate.split())
    if not normalized:
        return ""
    if re.match(r"^(?:#{1,6}\s|[-*+]\s|>\s|```|\d+\.\s|\|)", normalized):
        normalized = f"Text: {normalized}"
    rendered: list[str] = []
    cursor = 0
    for match in re.finditer(r"(?<!`)`([^`\n]+)`(?!`)", normalized):
        rendered.append(_escape_markdown_text(normalized[cursor : match.start()]))
        rendered.append(f"`{match.group(1)}`")
        cursor = match.end()
    rendered.append(_escape_markdown_text(normalized[cursor:]))
    return "".join(rendered)

def _escape_markdown_text(value: str) -> str:
    return re.sub(r"([\\`*\[\]<>])", r"\\\1", value)

def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    for item in value:
        text = _text(item, "")
        if text:
            normalized.append(text)
    return normalized

def _cell(value: Any) -> str:
    return _text(value, "none").replace("|", "\\|").replace("\n", "<br>")

def _link_label(value: Any, fallback: str) -> str:
    return _cell(value) or _cell(fallback)

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

def _uses_deep_presentation(coverage: dict[str, Any], findings: list[dict[str, Any]]) -> bool:
    if coverage.get("mode") == "deep_repository":
        return True
    if coverage.get("mode") != "scoped_path":
        return False
    # Scoped deep scans can arrive as scoped_path artifacts. The child ids are
    # the stable deep-scan signal; ordinary scoped scans do not emit them.
    return any(_has_deep_child_metadata(finding) for finding in findings)

def _deep_title_parts(finding: dict[str, Any]) -> tuple[str, str | None]:
    title = finding.get("title")
    if not isinstance(title, str):
        return "Untitled finding", None
    normalized = " ".join(title.split())
    match = re.fullmatch(r"(.+?)\s+\[([^\[\]\n]+)\]", normalized)
    if match is None:
        return normalized, None
    annotation = match.group(2)
    extensions = finding.get("extensions")
    recognized_ids = [_deep_report_id(finding)]
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

def _deep_finding_title(finding: dict[str, Any]) -> str:
    return _deep_title_parts(finding)[0]

def _deep_finding_groups(
    findings: list[dict[str, Any]], writeup_paths: list[str | None]
) -> list[list[tuple[int, dict[str, Any], str | None]]]:
    groups: dict[str, list[tuple[int, dict[str, Any], str | None]]] = {}
    for number, (finding, report_path) in enumerate(zip(findings, writeup_paths, strict=True), 1):
        groups.setdefault(_deep_candidate_id(finding), []).append((number, finding, report_path))
    return list(groups.values())

def _deep_group_titles(group: list[tuple[int, dict[str, Any], str | None]]) -> str:
    titles: list[str] = []
    for _, finding, _ in group:
        title = _cell(_deep_finding_title(finding))
        if title not in titles:
            titles.append(title)
    return "<br>".join(titles)

def _deep_group_levels(
    group: list[tuple[int, dict[str, Any], str | None]],
    field: str,
    order: dict[str, int],
) -> str:
    levels = {finding[field]["level"] for _, finding, _ in group}
    return "<br>".join(sorted(levels, key=lambda level: order.get(level, len(order))))

def _deep_group_report_labels(
    group: list[tuple[int, dict[str, Any], str | None]],
) -> list[str]:
    report_ids = [_deep_report_id(finding) for _, finding, _ in group]
    report_id_counts = Counter(report_ids)
    labels = [
        (_deep_title_parts(finding)[1] if report_id_counts[report_id] > 1 else report_id)
        or report_id
        for report_id, (_, finding, _) in zip(report_ids, group, strict=True)
    ]
    label_counts = Counter(labels)
    return [
        (
            finding.get("identity", {}).get("instance")
            if label_counts[label] > 1 and isinstance(finding.get("identity"), dict)
            else label
        )
        or _deep_report_id(finding)
        for label, (_, finding, _) in zip(labels, group, strict=True)
    ]

def _deep_group_report_links(group: list[tuple[int, dict[str, Any], str | None]]) -> str:
    labels = _deep_group_report_labels(group)
    return "<br>".join(
        f"[{_link_label(label, 'Unidentified report')}](#finding-{number})"
        for label, (number, _, _) in zip(labels, group, strict=True)
    )

def _deep_group_writeup_links(group: list[tuple[int, dict[str, Any], str | None]]) -> str:
    labels = _deep_group_report_labels(group)
    links: list[str] = []
    for label, (_, _, report_path) in zip(labels, group, strict=True):
        report_id = _link_label(label, "Unidentified report")
        links.append(
            f"[Open {report_id}]({report_path})" if report_path else f"{report_id}: inline below"
        )
    return "<br>".join(links)

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

def _bullets(items: list[str], fallback: str) -> list[str]:
    return [f"- {item}" for item in (items or [fallback])]

def _code_evidence_catalog(finding: dict[str, Any]) -> dict[str, dict[str, Any]]:
    catalog: dict[str, dict[str, Any]] = {}
    for key in ("codeEvidence", "code_evidence"):
        raw = finding.get(key, [])
        if not isinstance(raw, list):
            continue
        for item in raw:
            if (
                isinstance(item, dict)
                and isinstance(item.get("id"), str)
                and isinstance(item.get("code"), str)
                and item["code"].strip()
            ):
                catalog.setdefault(item["id"], item)
    return catalog

def _section_code_evidence(
    finding: dict[str, Any], *sections: dict[str, Any]
) -> list[dict[str, Any]]:
    catalog = _code_evidence_catalog(finding)
    resolved: list[dict[str, Any]] = []
    for section in sections:
        for key in ("evidenceRefs", "evidence_refs"):
            refs = section.get(key, [])
            if isinstance(refs, str):
                refs = [refs]
            if isinstance(refs, list):
                resolved.extend(
                    catalog[ref] for ref in refs if isinstance(ref, str) and ref in catalog
                )
        for key in ("codeEvidence", "code_evidence"):
            embedded = section.get(key, [])
            if isinstance(embedded, list):
                resolved.extend(
                    item
                    for item in embedded
                    if isinstance(item, dict)
                    and isinstance(item.get("code"), str)
                    and item["code"].strip()
                )
    unique: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in resolved:
        key = (str(item.get("id", "")), item["code"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique

def merged_root_cause(value: dict[str, Any]) -> tuple[str | None, Any]:
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
        elif detail is not None:
            continue
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
            dict.fromkeys(
                item
                for evidence in evidence_values
                for item in (evidence if isinstance(evidence, list) else [evidence])
                if isinstance(item, str)
            )
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
    finding: dict[str, Any], root_cause: dict[str, Any]
) -> list[dict[str, Any]]:
    evidence = _section_code_evidence(finding, root_cause)
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
        return location
    if isinstance(location, dict):
        item = location
    path = item.get("path")
    start = item.get("startLine")
    end = item.get("endLine", start)
    if not isinstance(path, str) or not path:
        return ""
    if not isinstance(start, int):
        return path
    return f"{path}:{start}" if end == start else f"{path}:{start}-{end}"

def _code_fence(code: str) -> str:
    longest_run = max((len(match.group(0)) for match in re.finditer(r"`+", code)), default=0)
    return "`" * max(3, longest_run + 1)

def _code_evidence_lines(evidence: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for index, item in enumerate(evidence):
        label = _text(item.get("label"), f"Code evidence {index + 1}")
        location = _text(_code_evidence_location(item), "")
        explanation = _text(item.get("explanation"), "")
        language = item.get("language") if isinstance(item.get("language"), str) else ""
        language = language if re.fullmatch(r"[A-Za-z0-9_+.-]*", language) else ""
        code = item["code"]
        fence = _code_fence(code)
        heading = f"**{label}**"
        if location:
            heading += f" — `{location}`"
        lines.extend(["", heading])
        if explanation:
            lines.extend(["", explanation])
        lines.extend(["", f"{fence}{language}", code, fence])
    return lines

def _severity_mix(findings: list[dict[str, Any]]) -> str:
    counts = Counter(finding["severity"]["level"] for finding in findings)
    return (
        ", ".join(f"{level}: {counts[level]}" for level in SEVERITY_ORDER if counts[level])
        or "none"
    )

def _confidence_mix(findings: list[dict[str, Any]]) -> str:
    counts = Counter(finding["confidence"]["level"] for finding in findings)
    return (
        ", ".join(
            f"{level}: {counts[level]}" for level in ("high", "medium", "low") if counts[level]
        )
        or "none"
    )

def _locations(finding: dict[str, Any]) -> str:
    rendered = []
    for location in finding["locations"]:
        start = location["startLine"]
        end = location.get("endLine", start)
        suffix = f":{start}" if end == start else f":{start}-{end}"
        rendered.append(f"{location['path']}{suffix}")
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
    for key in ("summary", "source", "sink", "outcome"):
        value = next(
            (
                section[key]
                for section in dataflow_sections
                if key in section and isinstance(section[key], str) and section[key].strip()
            ),
            None,
        )
        if value is not None:
            dataflow[key] = value
    transformations = list(
        dict.fromkeys(
            transformation
            for section in dataflow_sections
            for transformation in (
                [section.get("transformations")]
                if isinstance(section.get("transformations"), str)
                else section.get("transformations")
                if isinstance(section.get("transformations"), list)
                else []
            )
            if isinstance(transformation, str) and transformation.strip()
        )
    )
    if transformations:
        dataflow["transformations"] = transformations
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
    validation_evidence = _strings(validation.get("evidence"))
    validation_assertions = _strings(validation.get("assertions"))
    validation_counterevidence = _strings(validation.get("counterEvidence"))
    validation_limitations = _strings(validation.get("limitations"))
    root_cause_summary = _text(
        raw_root_cause if isinstance(raw_root_cause, str) else root_cause.get("summary"),
        "",
    )
    root_cause_code_evidence = _root_cause_code_evidence(finding, root_cause)
    validation_code_evidence = _section_code_evidence(finding, validation)
    dataflow_code_evidence = _section_code_evidence(finding, attack_path, *dataflow_sections)
    reachability_code_evidence = _section_code_evidence(finding, reachability)
    dataflow_summary = _text(
        dataflow.get("summary"),
        f"The canonical finding records the affected path at {_locations(finding)}, but no expanded source-to-sink narrative was recorded.",
    )
    reachability_summary = _text(
        reachability.get("summary"),
        _text(
            attack_path.get("summary"),
            "Reachability was not recorded beyond the canonical finding summary and affected locations.",
        ),
    )
    severity_rationale = _text(
        severity.get("rationale"),
        f"The scan assigned {severity['level']} severity; no separate canonical severity rationale was recorded.",
    )
    severity_change = _text(
        severity.get("changeConditions"),
        "Additional runtime or deployment evidence could raise or lower this severity.",
    )
    remediation_tests = _strings(finding.get("remediationTests"))
    preventive_controls = _strings(finding.get("preventiveControls"))
    attack_steps = _strings(attack_path.get("steps"))
    cwes = ", ".join(finding["taxonomy"]["cwe"]) or "none"
    title = _text(finding["title"], "Untitled finding")
    lines = [
        f'<a id="finding-{number}"></a>',
        "",
        f"### [{number}] {title}",
        "",
        "| Field | Value |",
        "| --- | --- |",
        f"| Severity | {_cell(severity['level'])} |",
        f"| Confidence | {_cell(finding['confidence']['level'])} |",
        f"| Confidence rationale | {_cell(finding['confidence']['rationale'])} |",
        f"| Category | {_cell(finding['taxonomy']['category'])} |",
        f"| CWE | {_cell(cwes)} |",
        f"| Affected lines | {_cell(_locations(finding))} |",
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
    if validation_assertions:
        lines.extend(["", "Assertions:", *_bullets(validation_assertions, "None recorded.")])
    if validation_evidence:
        lines.extend(["", "Evidence:", *_bullets(validation_evidence, "No evidence recorded.")])
    if validation_counterevidence:
        lines.extend(
            [
                "",
                "Counterevidence and remaining uncertainty:",
                *_bullets(validation_counterevidence, "None recorded."),
            ]
        )
    if validation_limitations:
        lines.extend(["", "Limitations:", *_bullets(validation_limitations, "None recorded.")])
    lines.extend(["", "#### Dataflow", "", dataflow_summary])
    if attack_steps:
        lines.extend(["", "Attack steps:", *_bullets(attack_steps, "None recorded.")])
    for label, key in (("Source", "source"), ("Sink", "sink"), ("Outcome", "outcome")):
        if dataflow.get(key):
            lines.extend(["", f"- **{label}:** {_text(dataflow[key], 'not recorded')}"])
    transformations = _strings(dataflow.get("transformations"))
    if transformations:
        lines.extend(["", "Transformations:", *_bullets(transformations, "None recorded.")])
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
            [
                *_strings(attack_path.get("preconditions")),
                *_strings(reachability.get("preconditions")),
            ]
        )
    )
    if preconditions:
        lines.extend(["", "Preconditions:", *_bullets(preconditions, "None recorded.")])
    for label, key in (
        ("Assumptions", "assumptions"),
        ("Existing controls", "controls"),
        ("Blind spots", "blindspots"),
        ("Limitations", "limitations"),
    ):
        values = _strings(attack_path.get(key))
        if values:
            lines.extend(["", f"{label}:", *_bullets(values, "None recorded.")])
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
    lines.extend(
        [
            "",
            "#### Remediation",
            "",
            _text(finding["remediation"], "No canonical remediation was recorded."),
        ]
    )
    if remediation_tests:
        lines.extend(["", "Tests:", *_bullets(remediation_tests, "No tests recorded.")])
    if preventive_controls:
        lines.extend(["", "Preventive controls:", *_bullets(preventive_controls, "None recorded.")])
    return lines

def _linked_finding_section(number: int, finding: dict[str, Any], report_path: str) -> list[str]:
    cwes = ", ".join(finding["taxonomy"]["cwe"]) or "none"
    title = _text(finding["title"], "Untitled finding")
    link = f"[detailed technical write-up]({report_path})"
    lines = [
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
        f"| Affected lines | {_cell(_locations(finding))} |",
    ]
    for heading in ("Summary", "Validation", "Dataflow", "Reachability", "Severity", "Remediation"):
        lines.extend(["", f"#### {heading}", "", f"See the {link}."])
    return lines

def build_report_markdown(
    manifest: dict[str, Any], findings_document: dict[str, Any], coverage: dict[str, Any]
) -> str:
    scan = manifest["scan"]
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
    writeup_paths = [_writeup_report_path(finding) for finding in findings]
    duplicate_writeup_paths = sorted(
        path
        for path, count in Counter(path for path in writeup_paths if path is not None).items()
        if count > 1
    )
    if duplicate_writeup_paths:
        raise ReportProjectionError(
            "reportable findings have duplicate writeup reportPath values: "
            + ", ".join(duplicate_writeup_paths)
        )
    deep_presentation = _uses_deep_presentation(coverage, findings)
    deep_finding_groups = _deep_finding_groups(findings, writeup_paths) if deep_presentation else []
    hardening_portfolio_path = _hardening_portfolio_path(scan)
    include_paths = _strings(coverage.get("includePaths", scope.get("includePaths", [])))
    exclude_paths = _strings(coverage.get("excludePaths", scope.get("excludePaths", [])))
    limitations = _strings(scope.get("limitations"))
    explicit_exclusions = coverage.get("explicitExclusions", [])
    lines = [
        f"# Security Review: {_text(target['displayName'], 'Unknown target')}",
        "",
        "## Scope",
        "",
        _text(
            scope.get("summary"),
            "The scan reviewed the canonical include paths and exclusions listed below.",
        ),
        "",
        f"- Scan mode: {coverage['mode']}",
        *_target_scope_lines(target),
        f"- Inventory strategy: {coverage['inventoryStrategy']}",
        f"- Included paths: {', '.join(include_paths) or 'none'}",
        f"- Excluded paths: {', '.join(exclude_paths) or 'none'}",
        f"- Runtime or test status: {_text(scope.get('runtimeStatus'), 'not recorded')}",
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
    if limitations:
        lines.extend(["", "Limitations and exclusions:", *_bullets(limitations, "None recorded.")])
    summary_count_lines = (
        [
            f"| Reportable DSS findings | {len(deep_finding_groups)} |",
            f"| Report instances | {len(findings)} |",
            f"| Report severity mix | {_severity_mix(findings)} |",
            f"| Report confidence mix | {_confidence_mix(findings)} |",
        ]
        if deep_presentation
        else [
            f"| Reportable findings | {len(findings)} |",
            f"| Severity mix | {_severity_mix(findings)} |",
            f"| Confidence mix | {_confidence_mix(findings)} |",
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
            f"| Coverage | {coverage['completeness']} |",
            f"| Validation mode | {_cell(scope.get('validationMode', 'not recorded'))} |",
            "",
            "Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.",
            "",
            "## Threat Model",
            "",
            _text(
                threat_model.get("summary"),
                "No explicit canonical threat-model summary was recorded.",
            ),
        ]
    )
    for heading, key, fallback in (
        ("Assets", "assets", "No assets were recorded."),
        ("Trust Boundaries", "trustBoundaries", "No trust boundaries were recorded."),
        (
            "Attacker Capabilities",
            "attackerCapabilities",
            "No attacker capabilities were recorded.",
        ),
        ("Security Objectives", "securityObjectives", "No security objectives were recorded."),
        ("Assumptions", "assumptions", "No assumptions were recorded."),
    ):
        values = _strings(threat_model.get(key))
        if values:
            lines.extend(["", f"### {heading}", "", *_bullets(values, fallback)])
    lines.extend(["", "## Findings", ""])
    if findings:
        if deep_presentation:
            lines.extend(
                [
                    "| Findings | Reports | Severity | Confidence | Detailed write-up |",
                    "| --- | --- | --- | --- | --- |",
                ]
            )
            for group in deep_finding_groups:
                lines.append(
                    f"| {_deep_group_titles(group)} | {_deep_group_report_links(group)} "
                    f"| {_deep_group_levels(group, 'severity', SEVERITY_ORDER)} "
                    f"| {_deep_group_levels(group, 'confidence', CONFIDENCE_ORDER)} "
                    f"| {_deep_group_writeup_links(group)} |"
                )
        else:
            lines.extend(
                [
                    "| Finding | Severity | Confidence | Detailed write-up |",
                    "| --- | --- | --- | --- |",
                ]
            )
            for number, (finding, report_path) in enumerate(
                zip(findings, writeup_paths, strict=True), 1
            ):
                title = _link_label(finding["title"], "Untitled finding")
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
        for number, (finding, report_path) in enumerate(
            zip(findings, writeup_paths, strict=True), 1
        ):
            if report_path is not None:
                lines.extend(["", *_linked_finding_section(number, finding, report_path)])
            else:
                lines.extend(["", *_finding_section(number, finding)])
    else:
        deferred = coverage.get("deferred", [])
        no_source_review = (
            coverage.get("completeness") == "partial"
            and isinstance(deferred, list)
            and any(
                isinstance(item, dict)
                and item.get("reason")
                == "The configured discovery time limit elapsed before any source review completed."
                for item in deferred
            )
        )
        budget_exhausted = (
            coverage.get("completeness") == "partial"
            and isinstance(deferred, list)
            and any(
                isinstance(item, dict)
                and isinstance(item.get("reason"), str)
                and (
                    item["reason"]
                    == "Validation was deferred because the scan reached its cost limit."
                    or item["reason"].startswith(
                        "Validation was deferred because the scan reached its cost limit: "
                    )
                )
                for item in deferred
            )
        )
        stopped = manifest.get("scan", {}).get("status") in {
            "failed",
            "canceled",
            "interrupted",
        }
        lines.extend(
            [
                "### No findings",
                "",
                (
                    "No findings were retained before the scan stopped. "
                    "The scan did not complete. No vulnerability conclusion can be drawn."
                    if stopped
                    else (
                        "No source review completed before the configured time limit. "
                        "No vulnerability conclusion can be drawn."
                        if no_source_review
                        else (
                            "No findings were validated before the scan reached its cost limit. "
                            "Review the deferred candidates in Open Questions And Follow Up."
                            if budget_exhausted
                            else "No reportable findings survived the canonical discovery, validation, "
                            "and reportability gates."
                        )
                    )
                ),
            ]
        )
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
    questions = list(open_questions) if isinstance(open_questions, list) else []
    deferred = coverage.get("deferred", [])
    if isinstance(deferred, list):
        questions.extend(
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
        )
    if questions:
        lines.extend(["", "## Open Questions And Follow Up", ""])
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
    return build_report_markdown(manifest, findings, coverage).encode("utf-8")

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
````

## File: `scripts/resolve_security_md.py`

```python
#!/usr/bin/env python3
"""Concatenate the SECURITY.md files that apply to a scan path."""

from __future__ import annotations

import argparse
import json
import os
import stat
import sys
from pathlib import Path

MAX_SECURITY_MD_BYTES = 1024 * 1024

class ResolutionError(ValueError):
    """Raised when a SECURITY.md chain cannot be resolved."""

def _inside(path: Path, root: Path, label: str) -> Path:
    try:
        return path.relative_to(root)
    except ValueError as exc:
        raise ResolutionError(f"{label} is outside the scan root: {path}") from exc

def _resolve_root(repo: Path) -> Path:
    try:
        root = repo.expanduser().resolve(strict=True)
    except OSError as exc:
        raise ResolutionError(f"scan root does not exist: {repo}") from exc
    if not root.is_dir():
        raise ResolutionError(f"scan root is not a directory: {root}")
    return root

def list_security_md(repo: Path) -> list[str]:
    """Return a stable, safely framed inventory without traversing Git metadata."""
    root = _resolve_root(repo)

    def raise_walk_error(error: OSError) -> None:
        raise error

    policies: list[str] = []
    for directory, subdirectories, filenames in os.walk(
        root, onerror=raise_walk_error, followlinks=False
    ):
        safe_subdirectories: list[str] = []
        for name in sorted(subdirectories):
            if name == ".git":
                continue
            directory_stat = (Path(directory) / name).stat(follow_symlinks=False)
            if not stat.S_ISDIR(directory_stat.st_mode):
                continue
            reparse_point = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
            if getattr(directory_stat, "st_file_attributes", 0) & reparse_point:
                continue
            safe_subdirectories.append(name)
        subdirectories[:] = safe_subdirectories
        if "SECURITY.md" not in filenames:
            continue
        policy = Path(directory) / "SECURITY.md"
        if policy.is_file() or policy.is_symlink():
            policies.append(policy.relative_to(root).as_posix())
    return sorted(policies)

def resolve_security_md(repo: Path, scope: Path) -> str:
    """Return applicable SECURITY.md files, concatenated root to leaf."""
    root = _resolve_root(repo)

    requested_scope = scope.expanduser()
    if not requested_scope.is_absolute():
        requested_scope = root / requested_scope
    try:
        resolved_scope = requested_scope.resolve(strict=True)
    except OSError as exc:
        raise ResolutionError(f"scan scope does not exist: {requested_scope}") from exc
    _inside(resolved_scope, root, "scan scope")

    target_directory = resolved_scope if resolved_scope.is_dir() else resolved_scope.parent
    relative_directory = _inside(target_directory, root, "scan scope")
    directories = [root]
    current = root
    for part in relative_directory.parts:
        current /= part
        directories.append(current)

    sections: list[str] = []
    for directory in directories:
        policy = directory / "SECURITY.md"
        if not policy.is_file():
            continue
        resolved_policy = policy.resolve(strict=True)
        _inside(resolved_policy, root, "SECURITY.md")
        try:
            with resolved_policy.open("rb") as policy_file:
                policy_bytes = policy_file.read(MAX_SECURITY_MD_BYTES + 1)
            if len(policy_bytes) > MAX_SECURITY_MD_BYTES:
                raise ResolutionError(f"SECURITY.md exceeds 1 MiB: {policy}")
            content = policy_bytes.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ResolutionError(f"SECURITY.md is not valid UTF-8: {policy}") from exc
        if not content.strip():
            continue

        source = policy.relative_to(root).as_posix()
        section = f"## SECURITY.md source: {json.dumps(source)}\n\n{content}"
        if not section.endswith("\n"):
            section += "\n"
        sections.append(section)

    return "\n".join(sections)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="scan root directory")
    parser.add_argument(
        "--list",
        action="store_true",
        help="write a JSON inventory of repository policy paths",
    )
    parser.add_argument(
        "--scope",
        type=Path,
        help="existing file or directory within the scan root",
    )
    parser.add_argument("--out", default=Path("-"), type=Path, help="output path, or - for stdout")
    args = parser.parse_args()
    if args.list and args.scope is not None:
        parser.error("--list cannot be combined with --scope")
    if not args.list and args.scope is None:
        parser.error("--scope is required unless --list is specified")
    return args

def main() -> int:
    args = parse_args()
    try:
        guidance = (
            json.dumps(list_security_md(args.repo), ensure_ascii=True) + "\n"
            if args.list
            else resolve_security_md(args.repo, args.scope)
        )
        if args.out == Path("-"):
            sys.stdout.buffer.write(guidance.encode("utf-8"))
        else:
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(guidance, encoding="utf-8")
    except (OSError, ResolutionError) as exc:
        print(f"resolve_security_md.py: error: {exc}", file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

## File: `scripts/snapshot_sqlite.py`

```python
#!/usr/bin/env python3
"""Create a transactionally consistent SQLite database snapshot."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    source = args.source.expanduser().resolve(strict=True)
    destination = args.destination.expanduser().absolute()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True) as source_connection:
        with sqlite3.connect(destination) as destination_connection:
            source_connection.backup(destination_connection)
    destination.chmod(0o600)

if __name__ == "__main__":
    main()
```

## File: `scripts/validate_scan_contract.py`

```python
#!/usr/bin/env python3
"""Validate a sealed Codex Security scan contract without mutating it."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

def _load_finalizer() -> ModuleType:
    script = Path(__file__).resolve().with_name("finalize_scan_contract.py")
    spec = importlib.util.spec_from_file_location("codex_security_scan_contract", script)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load scan contract validator: {script}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

FINALIZER = _load_finalizer()

def validate_contract(scan_dir: Path) -> dict[str, Any]:
    """Return validated canonical documents for one sealed scan."""

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
    findings_ref = scan["findingsRef"]
    coverage_ref = scan["coverageRef"]
    findings, findings_bytes = FINALIZER._read_scan_local_json_bytes(
        scan_dir,
        findings_ref,
        findings_ref,
    )
    coverage, coverage_bytes = FINALIZER._read_scan_local_json_bytes(
        scan_dir,
        coverage_ref,
        coverage_ref,
    )
    FINALIZER._validate_existing_seal(
        scan_dir,
        scan,
        artifact_contents={
            findings_ref: findings_bytes,
            coverage_ref: coverage_bytes,
        },
    )
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
        "coverage": coverage,
    }

def receipt(validated: dict[str, Any]) -> dict[str, Any]:
    scan_dir = Path(validated["scanDir"])
    scan = validated["manifest"]["scan"]
    return {
        "status": "valid",
        "scanDir": str(scan_dir),
        "manifestPath": str(scan_dir / "scan-manifest.json"),
        "findingsPath": str(scan_dir / scan["findingsRef"]),
        "coveragePath": str(scan_dir / scan["coverageRef"]),
        "reportPath": str(scan_dir / "report.md"),
    }

def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scan-dir", required=True, type=Path)
    return parser.parse_args(argv)

def main(argv: list[str] | None = None) -> int:
    args = _parse_args(sys.argv[1:] if argv is None else argv)
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

## File: `scripts/validate_tracking_source.py`

```python
#!/usr/bin/env python3
"""Validate a sealed scan and list or select findings for tracking."""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

def _load_scan_contract_validator() -> ModuleType:
    script = Path(__file__).resolve().with_name("validate_scan_contract.py")
    spec = importlib.util.spec_from_file_location("codex_security_scan_validator", script)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load scan contract validator: {script}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

SCAN_CONTRACT = _load_scan_contract_validator()
FINALIZER = SCAN_CONTRACT.FINALIZER
validate_contract = SCAN_CONTRACT.validate_contract

def _select_findings(
    findings: list[dict[str, Any]],
    finding_id: str | None,
    fingerprint: str | None,
) -> list[dict[str, Any]]:
    if finding_id is not None:
        matches = [finding for finding in findings if finding["findingId"] == finding_id]
    elif fingerprint is not None:
        matches = [
            finding for finding in findings if finding["fingerprints"]["primary"] == fingerprint
        ]
    else:
        return findings

    if len(matches) != 1:
        raise ValueError("the selector did not resolve exactly one finding")
    return matches

def validate_source(
    scan_dir: Path,
    *,
    finding_id: str | None = None,
    fingerprint: str | None = None,
) -> list[dict[str, Any]]:
    if finding_id is not None and fingerprint is not None:
        raise ValueError("use only one of --finding-id or --fingerprint")

    validated = validate_contract(scan_dir)
    findings_document = validated["findings"]
    return _select_findings(
        findings_document["findings"],
        finding_id,
        fingerprint,
    )

def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scan_dir", type=Path)
    selector = parser.add_mutually_exclusive_group()
    selector.add_argument("--finding-id")
    selector.add_argument("--fingerprint")
    return parser.parse_args(argv)

def main(argv: list[str] | None = None) -> int:
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    try:
        findings = validate_source(
            args.scan_dir,
            finding_id=args.finding_id,
            fingerprint=args.fingerprint,
        )
    except (OSError, ValueError, RecursionError) as exc:
        print(f"tracking source preflight failed: {exc}", file=sys.stderr)
        return 2
    for finding in findings:
        print(finding["findingId"])
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

The implementation opens every directory with ``FILE_FLAG_OPEN_REPARSE_POINT``
and rejects all reparse points, including junctions.  Directory handles remain
open without ``FILE_SHARE_DELETE`` for the full operation, which prevents an
already-validated ancestor from being renamed or replaced during a read,
write, or delete.  Writes rename the exact temporary-file handle into place so
an attacker cannot substitute another file at the temporary name.

Importing this module is safe on non-Windows hosts.  Its public operations
raise ``WindowsScanLocalFileError`` when called anywhere other than Windows.
"""

from __future__ import annotations

import argparse
import contextlib
import ctypes
import errno
import importlib
import ntpath
import os
import secrets
from collections.abc import Iterator
from ctypes import wintypes
from pathlib import Path, PurePosixPath

_msvcrt = importlib.import_module("msvcrt") if os.name == "nt" else None

class WindowsScanLocalFileError(OSError):
    """Raised when a scan-local operation cannot be completed securely."""

# CreateFile access and sharing flags.
_DELETE = 0x00010000
_FILE_READ_ATTRIBUTES = 0x00000080
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
_FILE_FLAG_BACKUP_SEMANTICS = 0x02000000
_FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000

# GetFileInformationByHandleEx / SetFileInformationByHandle classes.
_FILE_RENAME_INFO_CLASS = 3
_FILE_DISPOSITION_INFO_CLASS = 4
_FILE_ATTRIBUTE_TAG_INFO_CLASS = 9

_FILE_TYPE_DISK = 0x0001
_FILE_NAME_OPENED = 0x00000008
_ERROR_FILE_NOT_FOUND = 2
_ERROR_PATH_NOT_FOUND = 3
_ERROR_FILE_EXISTS = 80
_ERROR_ALREADY_EXISTS = 183
_MISSING_ERRORS = {_ERROR_FILE_NOT_FOUND, _ERROR_PATH_NOT_FOUND}
_COLLISION_ERRORS = {_ERROR_FILE_EXISTS, _ERROR_ALREADY_EXISTS}
_INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
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

class _FileAttributeTagInfo(ctypes.Structure):
    _fields_ = [
        ("FileAttributes", wintypes.DWORD),
        ("ReparseTag", wintypes.DWORD),
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

def _invalid_path(path: Path | str, reason: str) -> WindowsScanLocalFileError:
    return WindowsScanLocalFileError(errno.EINVAL, reason, str(path))

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

def _verify_directory(handle: int, expected_path: Path) -> None:
    info = _attributes(handle)
    if info.FileAttributes & _FILE_ATTRIBUTE_REPARSE_POINT:
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
        raise _invalid_path(scan_dir, "expected an existing scan directory") from exc
    if _normalized_windows_path(absolute) != _normalized_windows_path(canonical):
        raise _invalid_path(scan_dir, "scan directory must be canonical and non-reparse")
    return canonical, (expected.st_dev, expected.st_ino)

def _open_directory(path: Path, *, missing_ok: bool = False) -> _OwnedHandle | None:
    handle = _create_file(
        path,
        access=_FILE_READ_ATTRIBUTES,
        share=_FILE_SHARE_READ | _FILE_SHARE_WRITE,
        disposition=_OPEN_EXISTING,
        flags=_FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT,
        missing_ok=missing_ok,
    )
    if handle is not None:
        try:
            assert handle.value is not None
            _verify_directory(handle.value, path)
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

@contextlib.contextmanager
def _locked_parent(
    scan_dir: Path,
    relative_path: str,
    *,
    create: bool,
) -> Iterator[tuple[Path, str]]:
    """Hold non-deletable handles for every directory in the absolute target path."""

    _require_windows()
    parts = _validated_parts(relative_path)
    root_path, expected_root_identity = _canonical_scan_directory(scan_dir)
    handles: list[_OwnedHandle] = []
    try:
        # Absolute-path Win32 calls remain safe only while every ancestor is
        # fixed in place. Otherwise an attacker could rename an ancestor of the
        # scan root and substitute a different tree at the stored path.
        for directory_path in (*reversed(root_path.parents), root_path):
            directory_handle = _open_directory(directory_path)
            assert directory_handle is not None
            handles.append(directory_handle)
        current_root = root_path.lstat()
        if (current_root.st_dev, current_root.st_ino) != expected_root_identity:
            raise _invalid_path(scan_dir, "scan directory changed while it was being opened")
        current_path = root_path
        for component in parts[:-1]:
            current_path /= component
            child_handle = _open_directory(current_path, missing_ok=create)
            if child_handle is None:
                _create_directory(current_path)
                child_handle = _open_directory(current_path)
                assert child_handle is not None
            handles.append(child_handle)
        yield current_path, parts[-1]
    finally:
        for handle in reversed(handles):
            handle.close()

def open_read_fd(scan_dir: Path, relative_path: str, context: str) -> int:
    """Open a verified regular file and return an owned binary read descriptor."""

    try:
        with _locked_parent(scan_dir, relative_path, create=False) as (parent_path, leaf_name):
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
            try:
                _verify_regular_file(handle.value, path)
                raw_handle = handle.detach()
                try:
                    assert _msvcrt is not None
                    return _msvcrt.open_osfhandle(raw_handle, os.O_RDONLY | os.O_BINARY)
                except BaseException:
                    _close_handle(raw_handle)
                    raise
            finally:
                handle.close()
    except WindowsScanLocalFileError as exc:
        raise WindowsScanLocalFileError(
            exc.errno,
            f"{context}: {exc.strerror}",
            exc.filename,
        ) from exc

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

def _rename_handle(handle: int, destination_path: Path) -> None:
    encoded_name = _extended_path(destination_path).encode("utf-16-le")
    file_name_offset = _FileRenameInfo.FileName.offset
    buffer_size = max(
        ctypes.sizeof(_FileRenameInfo),
        file_name_offset + len(encoded_name) + ctypes.sizeof(wintypes.WCHAR),
    )
    buffer = ctypes.create_string_buffer(buffer_size)
    info = ctypes.cast(buffer, ctypes.POINTER(_FileRenameInfo)).contents
    info.FlagsOrReplaceIfExists = 1
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

def _validate_existing_output(path: Path) -> None:
    handle = _create_file(
        path,
        access=_FILE_READ_ATTRIBUTES,
        share=_FILE_SHARE_READ | _FILE_SHARE_WRITE | _FILE_SHARE_DELETE,
        disposition=_OPEN_EXISTING,
        flags=_FILE_FLAG_OPEN_REPARSE_POINT | _FILE_FLAG_BACKUP_SEMANTICS,
        missing_ok=True,
    )
    if handle is None:
        return
    with handle:
        assert handle.value is not None
        _verify_regular_file(handle.value, path)

def atomic_write(scan_dir: Path, relative_path: str, payload: bytes) -> None:
    """Atomically replace a scan-local regular file with ``payload``."""

    with _locked_parent(scan_dir, relative_path, create=True) as (parent_path, leaf_name):
        destination_path = parent_path / leaf_name
        _validate_existing_output(destination_path)

        temp_handle: _OwnedHandle | None = None
        temp_path: Path | None = None
        for _ in range(16):
            temp_path = parent_path / f".{leaf_name}.{secrets.token_hex(8)}.tmp"
            try:
                temp_handle = _create_file(
                    temp_path,
                    access=_GENERIC_WRITE | _DELETE | _FILE_READ_ATTRIBUTES,
                    share=0,
                    disposition=_CREATE_NEW,
                    flags=_FILE_ATTRIBUTE_NORMAL,
                )
            except WindowsScanLocalFileError as exc:
                if exc.errno in _COLLISION_ERRORS:
                    continue
                raise
            break
        if temp_handle is None or temp_path is None:
            raise WindowsScanLocalFileError(errno.EEXIST, "could not allocate a unique temp file")

        with temp_handle:
            assert temp_handle.value is not None
            try:
                _verify_regular_file(temp_handle.value, temp_path)
                _write_all(temp_handle.value, payload)
                _rename_handle(temp_handle.value, destination_path)
                _verify_regular_file(temp_handle.value, destination_path)
            except BaseException:
                # Deleting by handle removes the exact temp/output file and cannot
                # be redirected through a swapped path or reparse point.
                try:
                    _mark_handle_for_deletion(temp_handle.value)
                except OSError:
                    pass
                raise

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

def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

if __name__ == "__main__":
    main()
```

## File: `scripts/workbench/__init__.py`

```python
"""Focused Codex Security workbench operation modules."""
```

## File: `scripts/workbench/handoff.py`

```python
"""Scan handoff state transitions for the Codex Security workbench."""

from __future__ import annotations

import argparse
import sqlite3
from collections.abc import Callable
from typing import Any

from workbench_validation import optional_text, require_uuid

RECOVERY_HANDOFF_TOKEN_PREFIX = "recovery_"

def require_handoff_claim_token(value: str) -> str:
    recovery_token = value.startswith(RECOVERY_HANDOFF_TOKEN_PREFIX)
    token = value.removeprefix(RECOVERY_HANDOFF_TOKEN_PREFIX) if recovery_token else value
    normalized = require_uuid(token, "claim-token")
    return f"{RECOVERY_HANDOFF_TOKEN_PREFIX}{normalized}" if recovery_token else normalized

def require_current_continuation(
    scan: sqlite3.Row,
    claim_token: str | None,
    *,
    error_message: str,
) -> None:
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
    if owning_thread_id != requesting_thread_id and not claim_token.startswith(
        RECOVERY_HANDOFF_TOKEN_PREFIX
    ):
        raise SystemExit(
            "A scan handoff can only be marked delivered from its owning Codex thread."
        )

def claim_handoff_delivery(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    stale_claim_before: Callable[[], str],
    workspace_state: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    timestamp = now()
    with connection:
        scan = require_scan(connection, scan_id)
        if scan["handoff_status"] != "pending" or scan["handoff_claim_token"] == claim_token:
            return workspace_state(connection, scan["workspace_id"])
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
                stale_claim_before(),
            ),
        )
        if updated.rowcount != 1:
            return workspace_state(connection, scan["workspace_id"])
    return workspace_state(connection, scan["workspace_id"])

def release_handoff_delivery(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    workspace_state: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    timestamp = now()
    with connection:
        scan = require_scan(connection, scan_id)
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
    return workspace_state(connection, scan["workspace_id"])

def attach_scan_continuation_thread(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    workspace_state: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    thread_id = optional_text(args.thread_id, maximum=512)
    if thread_id is None:
        raise SystemExit("Codex Security continuation thread ID is required.")
    connection.execute("BEGIN IMMEDIATE")
    try:
        timestamp = now()
        scan = require_scan(connection, scan_id)
        if scan["handoff_claim_token"] != claim_token:
            raise SystemExit("Codex Security continuation thread claim token does not match.")
        if scan["continuation_thread_id"] is not None:
            if scan["continuation_thread_id"] != thread_id:
                raise SystemExit(
                    "Codex Security scan continuation is owned by another continuation."
                )
            connection.commit()
            return workspace_state(connection, scan["workspace_id"])
        updated = connection.execute(
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
        if updated.rowcount != 1:
            raise SystemExit("Codex Security continuation thread could not be attached.")
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    return workspace_state(connection, scan["workspace_id"])

def mark_handoff_delivered(
    connection: sqlite3.Connection,
    args: argparse.Namespace,
    *,
    now: Callable[[], str],
    require_scan: Callable[[sqlite3.Connection, str], sqlite3.Row],
    require_workspace: Callable[[sqlite3.Connection, str], sqlite3.Row],
    workspace_state: Callable[[sqlite3.Connection, str], dict[str, Any]],
) -> dict[str, Any]:
    scan_id = require_uuid(args.scan_id, "scan-id")
    claim_token = require_handoff_claim_token(args.claim_token)
    thread_id = optional_text(args.thread_id, maximum=512)
    connection.execute("BEGIN IMMEDIATE")
    try:
        timestamp = now()
        scan = require_scan(connection, scan_id)
        if thread_id is not None:
            workspace = require_workspace(connection, scan["workspace_id"])
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
            connection.commit()
            return workspace_state(connection, scan["workspace_id"])
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
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    return workspace_state(connection, scan["workspace_id"])
```
