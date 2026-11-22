"""Union guarantee for the consolidated devsuite-review skill.

The rules mirror Plugin-Skill-Studio's consolidation-check so DevSuite stays self-contained:
every source capability is covered by an existing file/anchor, merged into a covered entry,
or dropped with explicit approval; every snapshot file is represented; shared modes stay
byte-identical with Studio's studio-review.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.routing import route  # noqa: E402

CONSOLIDATION = ROOT / "references" / "consolidation"
MODES = ROOT / "skills" / "devsuite-review" / "modes"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def slug(text: str) -> str:
    return re.sub(r" ", "-", re.sub(r"[^a-z0-9 _-]", "", text.strip().lower()))


def anchors(path: Path) -> set[str]:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    found = {slug(m.group(1)) for m in re.finditer(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, re.M)}
    found.update(m.group(1) for m in re.finditer(r'<a\s+id="([^"]+)"', text))
    return found


def inside(rel: str) -> Path | None:
    full = (ROOT / rel).resolve()
    return full if full == ROOT.resolve() or full.is_relative_to(ROOT.resolve()) else None


def check_matrix(matrix: dict) -> list[str]:
    errors: list[str] = []
    by_id: dict[str, dict] = {}
    for entry in matrix["entries"]:
        if entry["id"] in by_id:
            errors.append(f"duplicate id: {entry['id']}")
        by_id[entry["id"]] = entry
    cache: dict[Path, set[str]] = {}
    for entry in matrix["entries"]:
        status = str(entry.get("status", "unmapped"))
        if status == "covered":
            target = entry.get("target")
            if not target:
                errors.append(f"target missing: {entry['id']}")
                continue
            file, _, anchor = target.partition("#")
            full = inside(file)
            if full is None:
                errors.append(f"escapes repository: {entry['id']}")
            elif not full.exists():
                errors.append(f"target missing: {entry['id']} -> {target}")
            elif anchor:
                if not full.is_file():
                    errors.append(f"anchor missing: {entry['id']} -> {target}")
                    continue
                cache.setdefault(full, anchors(full))
                if anchor not in cache[full]:
                    errors.append(f"anchor missing: {entry['id']} -> {target}")
        elif status.startswith("merged-with:"):
            other = by_id.get(status.split(":", 1)[1])
            if not other or other.get("status") != "covered":
                errors.append(f"bad merge: {entry['id']}")
        elif status == "dropped":
            if entry.get("approved") is not True or not str(entry.get("reason", "")).strip():
                errors.append(f"unapproved drop: {entry['id']}")
        else:
            errors.append(f"unmapped: {entry['id']}")
    for source in matrix.get("sources", []):
        snapshot = inside(source["snapshot"])
        if snapshot is None or not snapshot.is_file():
            errors.append(f"source unreadable: {source['id']}")
            continue
        for rel in read_json(snapshot)["files"]:
            key = f"{source['id']}/{rel}"
            if not any(e["source"] == key or e["source"].startswith(key + ":") for e in matrix["entries"]):
                errors.append(f"unrepresented source file: {key}")
    return errors


class ReviewConsolidationTests(unittest.TestCase):
    def test_shared_modes_match_hashes(self):
        pinned = read_json(CONSOLIDATION / "shared-review-modes.json")["files"]
        self.assertEqual(sorted(pinned), ["code-reviewer.md", "code.md", "decide.md", "receive.md", "request.md", "verify.md"])
        for name, digest in pinned.items():
            data = (MODES / name).read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)

    def test_shared_modes_have_no_package_links(self):
        for name in read_json(CONSOLIDATION / "shared-review-modes.json")["files"]:
            text = (MODES / name).read_text(encoding="utf-8")
            self.assertNotRegex(text, r"\]\(\.\./\.\./|studio-policy|policy\.md", name)

    def test_review_matrix_union(self):
        matrix = read_json(CONSOLIDATION / "review-matrix.json")
        self.assertEqual(check_matrix(matrix), [])
        self.assertGreater(len(matrix["entries"]), 250)

    def test_quality_routes_to_review_gate(self):
        for request in ("run the lint gate", "Kør lintkontrol af projektet", "run MegaLinter"):
            result = route(request)
            self.assertEqual((result["skill"], result["mode"]), ("devsuite-review", "gate"), request)

    def test_removed_triggers_route(self):
        matrix = read_json(CONSOLIDATION / "review-matrix.json")
        misses = []
        for entry in matrix["entries"]:
            target = entry.get("target") or ""
            if entry["kind"] != "trigger" or "skills/devsuite-review/SKILL.md#mode-" not in target:
                continue
            want = target.split("#mode-", 1)[1]
            result = route(entry["text"])
            if (result["skill"], result["mode"]) != ("devsuite-review", want):
                misses.append(f"{entry['id']}: got {result['skill']}/{result['mode']}, want devsuite-review/{want}")
        self.assertEqual(misses, [])

    def test_removed_skill_not_named(self):
        hits = []
        for folder in ("skills", "references", "runtime", "editors"):
            for file in (ROOT / folder).rglob("*"):
                if not file.is_file() or file.suffix not in {".md", ".py", ".json", ".cjs", ".yaml"}:
                    continue
                # Tests may name the removed skill to assert that it is absent from built packages.
                if CONSOLIDATION in file.parents or "__pycache__" in file.parts or file.name.startswith("test_"):
                    continue
                # Tests may name the removed skill to assert that it is gone.
                if file.name.startswith("test_"):
                    continue
                text = re.sub(r'<a id="[^"]*"></a>', "", file.read_text(encoding="utf-8", errors="ignore"))
                if "devsuite-quality" in text:
                    hits.append(str(file.relative_to(ROOT)))
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
