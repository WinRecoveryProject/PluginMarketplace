"""Union guarantee for devsuite-debug and its modes shared with Plugin-Skill-Studio studio-debug."""
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
SKILL = ROOT / "skills" / "devsuite-debug"
MODES = SKILL / "modes"
SHARED = ("diagnose.md", "loop.md", "triage.md",
          "diagnose/root-cause-tracing.md", "diagnose/defense-in-depth.md", "diagnose/condition-based-waiting.md",
          "diagnose/scripts/find-polluter.sh", "loop/scripts/hitl-loop.template.sh",
          "triage/AGENT-BRIEF.md", "triage/OUT-OF-SCOPE.md")


class DebugConsolidationTests(unittest.TestCase):
    def test_shared_debug_modes_match_hashes(self):
        pinned = read_json(CONSOLIDATION / "shared-debug-modes.json")["files"]
        for name in SHARED:
            self.assertIn(name, pinned)
        for name, digest in pinned.items():
            data = (MODES / name).read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)

    def test_shared_debug_modes_have_no_package_links(self):
        for name in read_json(CONSOLIDATION / "shared-debug-modes.json")["files"]:
            if not name.endswith(".md"):
                continue
            text = re.sub(r'<a id="[^"]*"></a>', "", (MODES / name).read_text(encoding="utf-8"))
            self.assertNotRegex(text, r"\]\(\.\./\.\./|skills/|studio-|policy\.md|diagnose-systematically|diagnosing-bugs", name)

    def test_debug_matrix_union(self):
        matrix = read_json(CONSOLIDATION / "debug-matrix.json")
        self.assertEqual(check_matrix(matrix), [])
        self.assertFalse([e["id"] for e in matrix["entries"] if e.get("status") == "dropped"])
        sources = {s["id"] for s in matrix["sources"]}
        self.assertTrue({"studio.diagnose-systematically", "studio.diagnosing-bugs", "studio.triage",
                         "devsuite.devsuite-debug", "codex-dev-workflows.bug-investigation"} <= sources)

    def test_debug_triggers_route_to_their_mode(self):
        matrix = read_json(CONSOLIDATION / "debug-matrix.json")
        misses = []
        for entry in matrix["entries"]:
            target = entry.get("target") or ""
            if entry["kind"] != "trigger" or "skills/devsuite-debug/SKILL.md#mode-" not in target:
                continue
            want = target.split("#mode-", 1)[1]
            result = route(entry["text"])
            if (result["skill"], result["mode"]) != ("devsuite-debug", want):
                misses.append(f"{entry['id']}: got {result['skill']}/{result['mode']}, want devsuite-debug/{want}")
        self.assertEqual(misses, [])

    def test_debug_requests_route_to_devsuite_debug(self):
        for request, mode in (("diagnose a bug", "investigate"), ("debug this failing test", "loop"),
                              ("triage these incoming issues", "triage"),
                              ("find the root cause of this regression", "diagnose")):
            result = route(request)
            self.assertEqual((result["skill"], result["mode"]), ("devsuite-debug", mode), request)

    def test_security_triage_stays_with_security(self):
        self.assertTrue(route("triage this security finding")["skill"].startswith("devsuite-security"))

    def test_guide_keeps_its_own_contract(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        for phrase in ("Diagnosis alone does not authorize source edits.", "Scope boundary:",
                       "A warning, correlation or stack location alone is not root cause.",
                       "Security-boundary candidates route to assessment/remediation"):
            self.assertIn(phrase, text)
        for mode in ("investigate", "diagnose", "loop", "triage"):
            self.assertIn(f'<a id="mode-{mode}"></a>', text)


if __name__ == "__main__":
    unittest.main()
