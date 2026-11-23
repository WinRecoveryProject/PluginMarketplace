#!/usr/bin/env python3
"""DevSuite local discovery and evidence CLI. Standard library; no network or installs."""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.execution import process_plan, select_environment
from runtime.evidence import (ContractError, contained, conversion_plan, provider_check,
                              read_json, write_assessment)
from runtime.routing import route


def doctor(root: Path = ROOT) -> dict:
    errors = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    try:
        manifest = read_json(root / ".codex-plugin/plugin.json")
        require(manifest["name"] == "winrecoveryproject-devsuite", "Wrong package name")
        require(manifest["version"] == "0.5.0", "Wrong package version")
        require(manifest["interface"]["developerName"] == "Zilvereyes", "Wrong developer")
        require(len(manifest["interface"]["shortDescription"]) <= 30, "Subtitle exceeds 30 characters")
        require(len(manifest["interface"].get("defaultPrompt", [])) <= 3, "Too many prompts")
        for field in ("logo", "composerIcon"):
            asset = contained(root, manifest["interface"][field].removeprefix("./"), exists=True)
            require(asset.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"), f"Invalid PNG {field}")
        require(not (root / "plugin.json").exists(), "Root manifest could shadow native Apps")
        require(not (root / ".mcp.json").exists(), "No duplicate MCP server is authorized")
        require(not (root / "hooks/hooks.json").exists(), "Hooks must be adopted explicitly, not duplicated")
        apps = read_json(root / ".app.json")["apps"]
        expected = {
            "github": "connector_76869538009648d5b282a4bb21c3d157",
            "linear": "asdk_app_69a089a326dc8191b32a3f2553f5be2c",
            "atlassian": "connector_692de805e3ec8191834719067174a384",
            "cloud-environment": "connector_openai_cloud_environment",
            "cloudconvert": "asdk_app_6a5767a72d2881919c2f45a7d6206298"}
        require(set(apps) == set(expected), "Unexpected App bindings")
        for name, app_id in expected.items():
            require(apps.get(name, {}).get("id") == app_id, f"Changed App ID {name}")
            require(apps.get(name, {}).get("required") is False, f"App must stay optional {name}")
        matrix = read_json(root / "references/capability-matrix.json")
        ids = set()
        for entry in matrix["capabilities"]:
            require(entry["id"] not in ids, f"Duplicate capability {entry['id']}")
            ids.add(entry["id"])
            for field in ("source", "originalSkill", "function", "owner", "implementation", "tests", "availability"):
                require(bool(entry.get(field)), f"Missing {field}: {entry['id']}")
            contained(root, f"skills/{entry['owner']}/SKILL.md", exists=True)
            for reference in entry.get("references", []):
                contained(root, reference, exists=True)
            for test in entry["tests"]:
                file, method = test.split("::")
                source = contained(root, file, exists=True).read_text(encoding="utf-8")
                require(f"def {method}(" in source, f"Missing test {test}")
        for file in root.rglob("*.py"):
            if "__pycache__" not in file.parts:
                ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
        for file in list(root.glob("skills/*/SKILL.md")) + list(root.glob("references/**/*.md")) + [root / "README.md"]:
            text = file.read_text(encoding="utf-8")
            for link in re.findall(r"\[[^\]]*\]\(([^)]+)\)", text):
                if "://" in link or link.startswith("#"):
                    continue
                resolved = (file.parent / link.split("#", 1)[0]).resolve()
                require(resolved.is_relative_to(root.resolve()) and resolved.is_file(), f"Uncontained/missing link in {file.name}: {link}")
        require(len(list(root.glob("skills/*/SKILL.md"))) == 13, "Expected 13 focused skills")
    except (OSError, ValueError, KeyError, TypeError, SyntaxError) as error:
        errors.append(str(error))
    return {"status": "FAIL" if errors else "PASS", "scope": "local package structure/contracts only",
            "errors": errors, "providersExecuted": False, "installed": False, "published": False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor")
    commands.add_parser("capabilities")
    process = commands.add_parser("process-plan"); process.add_argument("input", type=Path)
    environment = commands.add_parser("task-environment"); environment.add_argument("input", type=Path)
    target = environment.add_mutually_exclusive_group()
    target.add_argument("--name")
    target.add_argument("--list", action="store_true")
    routing = commands.add_parser("route"); routing.add_argument("request")
    provider = commands.add_parser("provider-check")
    provider.add_argument("capability"); provider.add_argument("inventory", type=Path)
    convert = commands.add_parser("conversion-plan"); convert.add_argument("request", type=Path)
    assessment = commands.add_parser("assessment-report")
    assessment.add_argument("input", type=Path); assessment.add_argument("--source-root", required=True, type=Path)
    assessment.add_argument("--out", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "doctor":
            report = doctor()
        elif args.command == "process-plan":
            report = process_plan(read_json(args.input))
        elif args.command == "task-environment":
            report = select_environment(read_json(args.input), args.name, list_only=args.list)
        elif args.command == "capabilities":
            report = read_json(ROOT / "references/capability-matrix.json")
        elif args.command == "route":
            report = route(args.request)
        elif args.command == "provider-check":
            report = provider_check(read_json(args.inventory), args.capability,
                                    read_json(ROOT / "references/provider-capabilities.json"))
        elif args.command == "conversion-plan":
            report = conversion_plan(read_json(args.request))
        else:
            report = write_assessment(read_json(args.input), args.source_root, args.out)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({"status": "ERROR", "error": str(error), "executed": False}))
        return 1
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report.get("status") in {"FAIL", "UNAVAILABLE", "ERROR", "NOT_VERIFIED", "ACCESS_INSUFFICIENT", "INCOMPLETE", "AMBIGUOUS"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
