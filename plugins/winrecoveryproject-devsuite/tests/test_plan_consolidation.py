"""Union guarantee for the consolidated devsuite-planning skill (shared with Plugin-Skill-Studio studio-plan)."""
from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.routing import route  # noqa: E402
from tests.test_review_consolidation import check_matrix, read_json  # noqa: E402

CONSOLIDATION = ROOT / "references" / "consolidation"
MODES = ROOT / "skills" / "devsuite-planning" / "modes"
COMPANION_REASON = "Studio-only visual companion"


class PlanConsolidationTests(unittest.TestCase):
    def test_shared_plan_modes_match_hashes(self):
        pinned = read_json(CONSOLIDATION / "shared-plan-modes.json")["files"]
        self.assertEqual(sorted(pinned), ["discover.md", "goal.md", "interview.md", "map.md", "plan-full.md",
                                          "plan.md", "questions.md", "spec.md", "tickets.md"])
        for name, digest in pinned.items():
            data = (MODES / name).read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)

    def test_shared_plan_modes_have_no_package_links(self):
        for name in read_json(CONSOLIDATION / "shared-plan-modes.json")["files"]:
            text = (MODES / name).read_text(encoding="utf-8")
            self.assertNotRegex(text, r"\]\(\.\./|skills/|studio-policy|policy\.md|visual-companion\.md|scripts/", name)

    def test_plan_matrix_union(self):
        matrix = read_json(CONSOLIDATION / "plan-matrix.json")
        self.assertEqual(check_matrix(matrix), [])
        dropped = [e for e in matrix["entries"] if e.get("status") == "dropped"]
        self.assertTrue(dropped)
        for entry in dropped:
            self.assertTrue(entry["id"].startswith("studio.brainstorming.file:"), entry["id"])
            self.assertIn(COMPANION_REASON, entry["reason"])

    def test_removed_planning_triggers_route(self):
        matrix = read_json(CONSOLIDATION / "plan-matrix.json")
        misses = []
        for entry in matrix["entries"]:
            target = entry.get("target") or ""
            if entry["kind"] != "trigger" or "skills/devsuite-planning/SKILL.md#mode-" not in target:
                continue
            want = target.split("#mode-", 1)[1]
            result = route(entry["text"])
            if (result["skill"], result["mode"]) != ("devsuite-planning", want):
                misses.append(f"{entry['id']}: got {result['skill']}/{result['mode']}, want devsuite-planning/{want}")
        self.assertEqual(misses, [])

    def test_project_planning_routes_to_project_mode(self):
        for request in ("lav en projektplan", "plan the architecture for this service", "coordinate the project board"):
            result = route(request)
            self.assertEqual((result["skill"], result["mode"]), ("devsuite-planning", "project"), request)


if __name__ == "__main__":
    unittest.main()
