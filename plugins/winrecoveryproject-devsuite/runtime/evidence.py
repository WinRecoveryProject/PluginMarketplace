"""Original DevSuite evidence utilities; no scanner, network or provider emulation."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


class ContractError(ValueError):
    """An input is unsafe, incomplete or makes an unsupported completion claim."""


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ContractError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path: Path):
    if path.stat().st_size > 4_000_000:
        raise ContractError("Input JSON exceeds 4 MB")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique,
                      parse_constant=lambda value: (_ for _ in ()).throw(
                          ContractError(f"Invalid JSON number: {value}")))


def contained(root: Path, relative: str, *, exists=False) -> Path:
    """Reject lexical escapes, absolute paths and all link/junction components."""
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise ContractError("Use a nonempty forward-slash relative path")
    if any(part in {"", ".", ".."} for part in relative.split("/")):
        raise ContractError("Path contains an empty or traversal component")
    if ":" in relative or relative.startswith("/"):
        raise ContractError("Absolute paths and drive/stream syntax are forbidden")
    root = root.resolve(strict=True)
    target = root
    for part in relative.split("/"):
        target = target / part
        if target.is_symlink() or (hasattr(target, "is_junction") and target.is_junction()):
            raise ContractError("Linked paths are forbidden")
    try:
        target.resolve(strict=exists).relative_to(root)
    except (ValueError, OSError) as error:
        raise ContractError("Path is missing or escapes its root") from error
    return target


def _text(value, label):
    if not isinstance(value, str) or not value.strip() or len(value) > 20_000:
        raise ContractError(f"Missing or oversized text: {label}")
    if any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise ContractError(f"Control text in {label}")
    return value


def provider_check(inventory: dict, capability: str, catalog: dict) -> dict:
    if not isinstance(inventory, dict):
        raise ContractError("Provider inventory must be an object")
    access_map = inventory.get("access", {})
    capability_tools = inventory.get("capabilityTools", {})
    if not isinstance(access_map, dict):
        raise ContractError("Inventory access must be an object")
    if not isinstance(capability_tools, dict):
        raise ContractError("Inventory capabilityTools must be an object")
    if capability not in catalog:
        raise ContractError(f"Unknown provider capability: {capability}")
    names = inventory.get("tools")
    if not isinstance(names, list) or any(not isinstance(n, str) for n in names):
        raise ContractError("Inventory tools must be an array of observed exact names")
    requirement = catalog[capability]
    access = access_map.get(capability, {})
    if not isinstance(access, dict):
        raise ContractError("Access observation must be an object")
    access_status = access.get("status", "UNKNOWN")
    if access.get("stale") is True:
        access_status = "UNKNOWN"
    if access_status not in {"UNKNOWN", "GRANTED", "DENIED", "INSUFFICIENT", "PENDING"}:
        raise ContractError("Unknown observed access status")
    def result(missing):
        # Names are a discovery fact, never backend readiness. Even observed TAC
        # access cannot establish user consent, quota or successful execution.
        status = "UNAVAILABLE" if missing else "ACCESS_INSUFFICIENT" if access_status in {"DENIED", "INSUFFICIENT", "PENDING"} else "NOT_VERIFIED"
        return {"capability": capability, "status": status, "toolNamesPresent": not missing,
                "missingToolGroups": missing, "executionVerified": False,
                "authenticationVerified": False, "costVerified": False,
                "authorizationVerified": False, "canExecute": False,
                "observedAccessStatus": access_status, "provider": requirement["provider"]}
    if requirement.get("discoveryRequired"):
        selected = capability_tools.get(capability, [])
        if not isinstance(selected, list) or any(not isinstance(n, str) for n in selected):
            raise ContractError("Discovered capability tool mapping must be a text array")
        missing = [] if selected and all(n in names for n in selected) else [["Discover actual provider tool schema for " + capability]]
        report = result(missing)
        report["schemaDiscoveryRequired"] = True
        return report
    groups = requirement["requiredToolGroups"]
    missing = [group for group in groups if not any(n in names for n in group)]
    return result(missing)


def conversion_plan(request: dict) -> dict:
    if not isinstance(request, dict):
        raise ContractError("Conversion request must be an object")
    sources = request.get("sources")
    if not isinstance(sources, list) or not sources or any(not isinstance(s, str) or not s.strip() for s in sources):
        raise ContractError("sources must contain authorized file references")
    target = request.get("targetFormat")
    if not isinstance(target, str) or not re.fullmatch(r"[a-z0-9]{1,16}", target):
        raise ContractError("targetFormat must be a lowercase format identifier")
    route = request.get("route")
    if route not in {"local", "cloudconvert"}:
        raise ContractError("route must be local or cloudconvert")
    if request.get("estimatedCost") != 0 or isinstance(request.get("estimatedCost"), bool):
        raise ContractError("0 kr budget requires an observed zero cost")
    if route == "cloudconvert":
        if request.get("freeQuotaConfirmed") is not True:
            raise ContractError("Verify included free quota before a remote conversion")
        if request.get("uploadAuthorized") is not True:
            raise ContractError("Remote transfer needs existing user authorization")
    if not request.get("destination") or not isinstance(request["destination"], str):
        raise ContractError("An explicit output destination is required")
    if request.get("overwrite", False) is not False:
        raise ContractError("This planning helper preserves existing outputs")
    return {"kind": "devsuite-conversion-plan", "executed": False,
            "status": "PLANNED", "route": route, "sources": sources,
            "targetFormat": target, "destination": request["destination"],
            "settings": request.get("settings", {}), "overwrite": False,
            "budgetKr": 0, "quotaVerifiedByHelper": False,
            "next": "Discover actual converter schema, execute only if authorized, inspect output"}


def validate_assessment(data: dict, source_root: Path) -> dict:
    """Validate an independently authored assessment without claiming source review."""
    if not isinstance(data, dict) or data.get("schema") != "devsuite-assessment-v1":
        raise ContractError("Expected separate devsuite-assessment-v1 schema")
    if data.get("mode") not in {"standard", "diff", "triage", "validation", "verify-fix"}:
        raise ContractError("Unknown mode; Deep requires the real provider")
    for field in ("target", "revision", "summary"):
        _text(data.get(field), field)
    if data.get("status") not in {"PASS", "PARTIAL", "FAIL", "INCONCLUSIVE"}:
        raise ContractError("Unknown assessment status")
    coverage = data.get("coverage")
    if not isinstance(coverage, dict):
        raise ContractError("Coverage must be explicit")
    for key in ("reviewed", "excluded", "deferred"):
        if not isinstance(coverage.get(key), list) or any(not isinstance(v, str) for v in coverage[key]):
            raise ContractError(f"Coverage {key} must be an explicit text array")
    for path in coverage["reviewed"]:
        if not contained(source_root, path, exists=True).is_file():
            raise ContractError(f"Reviewed path is not a file: {path}")
    if len(set(coverage["reviewed"])) != len(coverage["reviewed"]):
        raise ContractError("Reviewed paths must be deduplicated")
    limitations = data.get("limitations")
    if not isinstance(limitations, list) or any(not isinstance(v, str) for v in limitations):
        raise ContractError("Limitations must be an explicit text array")
    if data["status"] == "PASS" and (coverage["deferred"] or limitations):
        raise ContractError("PASS cannot hide deferred review or limitations")
    if data["status"] == "PASS" and not coverage["reviewed"]:
        raise ContractError("PASS requires nonempty reviewed coverage")
    findings = data.get("findings")
    if not isinstance(findings, list):
        raise ContractError("Findings must be an explicit array")
    ids = set()
    for finding in findings:
        if not isinstance(finding, dict):
            raise ContractError("Finding must be an object")
        for field in ("id", "title", "rootCause", "invariant", "attackerControl", "attackPath", "impact", "counterevidence", "remediation"):
            _text(finding.get(field), field)
        if finding["id"] in ids:
            raise ContractError("Finding IDs must be unique")
        ids.add(finding["id"])
        if finding.get("severity") not in {"critical", "high", "medium", "low", "informational"}:
            raise ContractError("Invalid severity")
        if finding.get("confidence") not in {"high", "medium", "low"}:
            raise ContractError("Invalid confidence")
        if finding.get("validation") not in {"demonstrated", "static-evidence", "inconclusive", "disproven", "already-safe"}:
            raise ContractError("Invalid validation state")
        location = finding.get("location", {})
        path = contained(source_root, location.get("path"), exists=True)
        line = location.get("line")
        if isinstance(line, bool) or not isinstance(line, int) or line < 1:
            raise ContractError("Finding line must be a positive integer")
        if line > len(path.read_text(encoding="utf-8").splitlines()):
            raise ContractError("Finding line is outside the actual source file")
        if location["path"] not in coverage["reviewed"]:
            raise ContractError("Finding location must be in reviewed coverage")
    if data["status"] == "PASS" and any(f["validation"] not in {"disproven", "already-safe"} for f in findings):
        raise ContractError("PASS cannot contain unresolved reportable findings")
    return data


def _md(value):
    # Make imported source values inert, including HTML and link/image markup.
    text = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for char in "\\`*_{}[]()!|#":
        text = text.replace(char, "\\" + char)
    return text.replace("\n", " ")


def write_assessment(data: dict, source_root: Path, output: Path) -> dict:
    validate_assessment(data, source_root)
    if output.exists():
        raise ContractError("Assessment output must be a new directory")
    # Refuse symlink/junction ancestors before creating a new output.
    for parent in (output, *output.parents):
        if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
            raise ContractError("Linked output ancestors are forbidden")
    lines = ["# DevSuite source assessment", "", "Independent local assessment; not a sealed Codex Security workbench scan.", "",
             f"Status: **{data['status']}**", f"Target: {_md(data['target'])}",
             f"Revision: {_md(data['revision'])}", "", _md(data["summary"]), ""]
    for finding in data["findings"]:
        lines.extend([f"## {_md(finding['id'])}: {_md(finding['title'])}", "",
                      f"Severity: {finding['severity']}; confidence: {finding['confidence']}; validation: {finding['validation']}",
                      f"Location: {_md(finding['location']['path'])}:{finding['location']['line']}", ""])
        for field in ("rootCause", "invariant", "attackerControl", "attackPath", "impact", "counterevidence", "remediation"):
            lines.append(f"{field}: {_md(finding[field])}")
        lines.append("")
    for label, values in list(data["coverage"].items()) + [("limitations", data["limitations"])]:
        lines.extend([f"## {_md(label)}", ""] + (["- " + _md(v) for v in values] or ["None recorded."]) + [""])
    if not data["findings"]:
        lines.append("No findings recorded within the stated scope; this is not proof of no vulnerabilities.")
    output.mkdir(parents=True, exist_ok=False)
    (output / "assessment.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    hashes = {name: hashlib.sha256((output / name).read_bytes()).hexdigest() for name in ("assessment.json", "report.md")}
    return {"status": "WRITTEN", "kind": "devsuite-local-evidence", "providerSealed": False,
            "output": str(output.resolve()), "sha256": hashes}
