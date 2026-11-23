"""Union guarantee for the consolidated devsuite-implement skill (shared with Plugin-Skill-Studio studio-execute)."""
from __future__ import annotations

import hashlib
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.routing import route  # noqa: E402
from tests.test_review_consolidation import check_matrix, read_json  # noqa: E402

CONSOLIDATION = ROOT / "references" / "consolidation"
MODES = ROOT / "skills" / "devsuite-implement" / "modes"
SHARED = ("execute.md", "subagent.md", "implement.md", "spec-run.md", "parallel.md", "durable.md",
          "subagent/scripts/review-package", "subagent/scripts/sdd-workspace", "subagent/scripts/task-brief")


class ExecuteConsolidationTests(unittest.TestCase):
    def test_shared_execute_modes_match_hashes(self):
        pinned = read_json(CONSOLIDATION / "shared-execute-modes.json")["files"]
        for name in SHARED:
            self.assertIn(name, pinned)
        for name, digest in pinned.items():
            data = (MODES / name).read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)

    def test_shared_execute_modes_have_no_package_links(self):
        for name in read_json(CONSOLIDATION / "shared-execute-modes.json")["files"]:
            if not name.endswith(".md"):
                continue
            text = re.sub(r'<a id="[^"]*"></a>', "", (MODES / name).read_text(encoding="utf-8"))
            self.assertNotRegex(text, r"\]\(\.\./\.\./|skills/|studio-|policy\.md", name)

    def test_execute_matrix_union(self):
        matrix = read_json(CONSOLIDATION / "execute-matrix.json")
        self.assertEqual(check_matrix(matrix), [])
        self.assertFalse([e["id"] for e in matrix["entries"] if e.get("status") == "dropped"])

    def test_removed_execution_triggers_route(self):
        matrix = read_json(CONSOLIDATION / "execute-matrix.json")
        misses = []
        for entry in matrix["entries"]:
            target = entry.get("target") or ""
            if entry["kind"] != "trigger" or "skills/devsuite-implement/SKILL.md#mode-" not in target:
                continue
            want = target.split("#mode-", 1)[1]
            result = route(entry["text"])
            if (result["skill"], result["mode"]) != ("devsuite-implement", want):
                misses.append(f"{entry['id']}: got {result['skill']}/{result['mode']}, want devsuite-implement/{want}")
        self.assertEqual(misses, [])

    def test_bounded_work_routes_to_build_mode(self):
        for request in ("refactor the parser module", "migrate the database schema"):
            result = route(request)
            self.assertEqual((result["skill"], result["mode"]), ("devsuite-implement", "build"), request)


if __name__ == "__main__":
    unittest.main()
