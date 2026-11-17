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


TASK_TARGET = r"(?:codex[\s-]+tasks?|remote(?:[\s-]+codex)?[\s-]+tasks?|codex[\s-]+opgaver?)"
JOB_TARGET = r"(?:process[\s-]+jobs?|background[\s-]+(?:jobs?|process(?:es)?)|baggrundsjob(?:s)?|baggrundsproces(?:ser)?|procesjob(?:s)?)"
DETERMINERS = r"(?:(?:a|an|the|one|my|new|existing|durable|en|et|den|det|min|mit|ny|nyt|eksisterende|varig)\s+){0,4}"
POLITE_PREFIX = r"(?:(?:please|kindly|venligst)\s+|(?:can|could|would|will)\s+you\s+|(?:kan|vil)\s+du\s+)?"
LAUNCH_VERB = r"(?:start|create|launch|run|queue|opret|kør|igangsæt)"
TARGET_END = r"(?=\s+(?:to|that|which|for|with|in|on|from|using|via|til|som|der|med|på|i|fra)\b|[.!?]|$)"


def execution_intent(text: str) -> tuple[str | None, str]:
    """Separate an explicit lifecycle request from work on the integration's code.

    Workload verbs after a launch request do not change its owner. Negated target
    clauses supply no lifecycle intent; a following review/test clause still can.
    This is a route suggestion only, never execution authority.
    """
    clauses = re.split(r"[;,.\n]+|\b(?:but|men|instead|i stedet)\b", text)
    active = []
    for clause in clauses:
        target = re.search(TASK_TARGET + "|" + JOB_TARGET, clause)
        if target and re.search(r"\b(?:do\s+not|don['’]t|never|must\s+not|ikke|aldrig|undlad)\b", clause[:target.start()]):
            continue
        active.append(clause.strip())
    for clause in active:
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:use|brug)\s+" + DETERMINERS + TASK_TARGET + r"\s+(?:to|til(?:\s+at)?)\b", clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:delegate|delegér|deleger)\b.{1,500}\b(?:to|til)\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        run = POLITE_PREFIX + r"(?:run|launch|start|execute|kør|afvikl)\b.{1,500}"
        if re.match(run + r"\b(?:as|in|som|i)\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        if re.match(run + r"\b(?:in(?:\s+the)?\s+background|i\s+baggrunden)\b", clause):
            return "devsuite-jobs", "; ".join(active)
    return None, "; ".join(active)


def route(request: str) -> dict:
    text = request.casefold()
    # More specific intent wins; route suggestions never grant execution authority.
    explicit_owner, text = execution_intent(text)
    operation = bool(re.search(r"\b(fix|implement|build|debug|review|audit|test|tests|testing|refactor|ret|byg|gennemgå)\b", text))
    task_target = bool(re.search(TASK_TARGET + r"|registered (?:codex )?environment|registrerede? (?:codex.)?miljø", text))
    job_target = bool(re.search(JOB_TARGET, text))
    if explicit_owner:
        skill = explicit_owner
    elif task_target and not operation:
        skill = "devsuite-tasks"
    elif job_target and not operation:
        skill = "devsuite-jobs"
    elif re.search(r"\b(convert|conversion|cloudconvert|transcode)\b", text):
        skill = "devsuite-convert"
    elif re.search(r"\b(resume|handoff|hand.?off|interrupted)\b", text):
        skill = "devsuite-handoff"
    elif re.search(r"security|vulnerab|threat|attack.path|finding|hardening|security\.md", text):
        skill = "devsuite-security-fix" if re.search(r"\b(fix|patch|remediat\w*|hardening|writeup|disclos\w*|track|policy)\b", text) else "devsuite-security-assess"
    elif re.search(r"\b(cloud|desktop|docker|vpn|network|environment|package install|preview)\b", text):
        skill = "devsuite-environment"
    elif re.search(r"\b(lint|linter|lintkontrol|kvalitetskontrol|megalinter|quality.gate|typecheck|format.check)\b", text):
        skill = "devsuite-quality"
    elif re.search(r"\b(review|audit|gennemgå|kodegennemgang|release.readiness|pre.release|patch.risk|verify.delivery)\b", text):
        skill = "devsuite-review"
    elif re.search(r"\b(debug|diagnos\w*|reproduce|bug|defect)\b", text):
        skill = "devsuite-debug"
    elif re.search(r"\b(test|tests|testing|qa|verify|validation)\b", text) and not re.search(r"\b(implement|build|refactor)\b", text):
        skill = "devsuite-test"
    elif re.search(r"\b(plan|planning|coordinate|coordinator|architecture|new.project|agents\.md|board)\b", text) and not re.search(r"\b(implement|build)\b", text):
        skill = "devsuite-planning"
    elif re.search(r"\b(implement|build|fix|refactor|migrate|maintain|feature)\b", text):
        skill = "devsuite-implement"
    else:
        skill = "devsuite"
    return {"skill": skill, "entrypoint": f"skills/{skill}/SKILL.md",
            "reason": "One focused phase; preserve the full user worklist across phases",
            "executionAuthorized": False, "externalActionAuthorized": False}


def doctor(root: Path = ROOT) -> dict:
    errors = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    try:
        manifest = read_json(root / ".codex-plugin/plugin.json")
        require(manifest["name"] == "winrecoveryproject-devsuite", "Wrong package name")
        require(manifest["version"] == "0.2.1", "Wrong package version")
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
        require(len(list(root.glob("skills/*/SKILL.md"))) == 14, "Expected 14 focused skills")
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
    environment.add_argument("--name")
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
            report = select_environment(read_json(args.input), args.name)
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
    return 1 if report.get("status") in {"FAIL", "UNAVAILABLE", "ERROR", "NOT_VERIFIED", "ACCESS_INSUFFICIENT", "INCOMPLETE"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
