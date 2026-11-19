"""Claude Code entry point for local DevSuite workflows only."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.routing import LOCAL_WORKFLOWS, route


PROVIDERS = r"(?:github|linear|atlassian|jira|confluence)"
PROVIDER_REQUEST = re.compile(
    rf"\b(?:use|brug|connect to|forbind til|in|on|via|through|på|i|gennem)\s+"
    rf"(?:(?:my|existing|the|min|mit|den|det|eksisterende)\s+){{0,3}}{PROVIDERS}\b(?![-_]|[./]\w)"
    r"|\bhttps://github\.com/[^/\s]+/[^/\s]+/(?:pull|issues)/\d+\b",
    re.IGNORECASE,
)
NEGATED = re.compile(r"\b(?:do not|don't|never|ikke|aldrig|undlad)\b", re.IGNORECASE)
MANIFEST_FIELDS = {"name", "version", "description", "author", "homepage", "repository", "license"}
NONLOCAL_COMPONENTS = (
    ".app.json", ".codex-plugin", ".mcp.json", "mcp.json", "hooks", "agents", "commands",
    "settings.json", ".lsp.json",
)


def local_route(request):
    suggestion = route(request)
    workflow = suggestion["skill"]
    clauses = re.split(r"[,;\n]|\b(?:but|men|instead|i stedet)\b", request, flags=re.IGNORECASE)
    external = any(not NEGATED.search(clause[:match.start()])
                   for clause in clauses if (match := PROVIDER_REQUEST.search(clause)))
    if workflow not in LOCAL_WORKFLOWS or external:
        return {
            "status": "UNAVAILABLE",
            "reason": "The requested workflow requires a capability outside this local Claude package.",
            "requestedSkill": workflow,
            "executionAuthorized": False,
            "externalActionAuthorized": False,
            "providersExecuted": False,
        }
    return {
        "status": "READY",
        **suggestion,
        "scope": "local workflow selection only",
        "providersExecuted": False,
    }


def doctor(root=ROOT):
    root = root.resolve()
    errors = []
    skills = {}
    try:
        manifest = json.loads((root / ".claude-plugin/plugin.json").read_bytes())
        if (set(manifest) != MANIFEST_FIELDS or manifest["name"] != "winrecoveryproject-devsuite"
                or not manifest["version"] or manifest["author"].get("name") != "Zilvereyes"):
            errors.append("Unexpected Claude manifest metadata")
        for component in NONLOCAL_COMPONENTS:
            if (root / component).exists():
                errors.append(f"Unexpected integration component: {component}")
        skills = {p.parent.name: p for p in root.glob("skills/*/SKILL.md")}
        if set(skills) != set(LOCAL_WORKFLOWS):
            errors.append("Local workflow list differs from the packaged routes")
        for name, file in skills.items():
            if not file.resolve().is_relative_to(root):
                errors.append(f"Skill escapes the package: {name}")
                continue
            lines = file.read_text(encoding="utf-8").splitlines()
            if len(lines) < 5 or lines[0] != "---" or lines[1] != f"name: {name}":
                errors.append(f"Invalid skill front matter: {name}")
        documentation = [*skills.values(), *root.glob("references/**/*.md"), root / "README.md"]
        for file in documentation:
            if not file.resolve().is_relative_to(root):
                errors.append(f"Documentation escapes the package: {file.relative_to(root)}")
                continue
            text = file.read_text(encoding="utf-8")
            for link in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
                parsed = urlsplit(link)
                if parsed.scheme == "https" and parsed.netloc:
                    continue
                target = (file.parent / parsed.path).resolve()
                if (parsed.scheme or parsed.netloc or not target.is_relative_to(root)
                        or (parsed.path and not target.is_file())):
                    errors.append(f"Uncontained or missing link in {file.relative_to(root)}: {link}")
    except (AttributeError, KeyError, OSError, TypeError, ValueError) as error:
        errors.append(str(error))
    return {
        "status": "FAIL" if errors else "PASS",
        "scope": "local Claude package only",
        "workflows": sorted(skills),
        "errors": errors,
        "providersExecuted": False,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor")
    routing = commands.add_parser("route")
    routing.add_argument("request")
    args = parser.parse_args(argv)
    report = doctor() if args.command == "doctor" else local_route(args.request)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] in ("PASS", "READY") else 1


if __name__ == "__main__":
    raise SystemExit(main())
