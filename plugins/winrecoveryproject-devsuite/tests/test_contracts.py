import importlib.util
import json
import re
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("devsuite_cli", ROOT / "scripts/devsuite.py")
cli = importlib.util.module_from_spec(spec); spec.loader.exec_module(cli)


class ContractTests(unittest.TestCase):
    def test_workflow_contracts(self):
        """Static preservation/routing contract; does not prove provider execution."""
        provenance = json.loads((ROOT / "references/source-provenance.json").read_text(encoding="utf-8"))
        matrix = json.loads((ROOT / "references/capability-matrix.json").read_text(encoding="utf-8"))
        available = {(s["id"], skill) for s in provenance["sources"] for skill in s["originalSkills"]}
        mapped = {(c["source"], c["originalSkill"]) for c in matrix["capabilities"]}
        self.assertTrue(available <= mapped, available - mapped)
        self.assertEqual(len(available), 39)
        self.assertGreaterEqual(len(matrix["capabilities"]), 200)
        for capability in matrix["capabilities"]:
            self.assertTrue((ROOT / "skills" / capability["owner"] / "SKILL.md").is_file())
            self.assertTrue(capability["function"])
            for reference in capability["references"]:
                self.assertTrue((ROOT / reference).is_file())
            if capability["externalProvider"]:
                self.assertIn("conditional", capability["availability"])
        policy = (ROOT / "references/policy.md").read_text(encoding="utf-8")
        self.assertIn("0 kr", policy)
        self.assertIn("Delegate only", policy)
        self.assertIn("Existing authorization persists", policy)
        self.assertIn("never passes", policy)
        for skill in ROOT.glob("skills/*/SKILL.md"):
            content = skill.read_text(encoding="utf-8")
            self.assertIn("../../references/policy.md", content)
            self.assertNotRegex(content, r"(?:load|install|invoke) (?:the )?(?:old|source) (?:plugin|skill)")
        self.assertIn("UNAVAILABLE", (ROOT / "skills/devsuite-review/modes/gate.md").read_text(encoding="utf-8"))

    def test_native_manifest_apps_and_no_duplicate_runtime(self):
        manifest = json.loads((ROOT / ".codex-plugin/plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["name"], "winrecoveryproject-devsuite")
        self.assertEqual(manifest["version"], "0.6.0")
        self.assertEqual(manifest["interface"]["developerName"], "Zilvereyes")
        self.assertLessEqual(len(manifest["interface"]["shortDescription"]), 30)
        self.assertLessEqual(len(manifest["interface"]["defaultPrompt"]), 3)
        apps = json.loads((ROOT / ".app.json").read_text(encoding="utf-8"))["apps"]
        self.assertEqual(apps["cloudconvert"]["id"], "asdk_app_6a5767a72d2881919c2f45a7d6206298")
        self.assertTrue(all(v["required"] is False for v in apps.values()))
        self.assertFalse((ROOT / "plugin.json").exists())
        self.assertFalse((ROOT / ".mcp.json").exists())
        self.assertFalse((ROOT / "hooks/hooks.json").exists())
        self.assertFalse((ROOT / "mcp").exists())

    def test_licenses_and_source_availability_are_honest(self):
        sources = json.loads((ROOT / "references/source-provenance.json").read_text(encoding="utf-8"))["sources"]
        by_id = {s["id"]: s for s in sources}
        self.assertEqual(by_id["codex-security"]["license"], "Proprietary")
        self.assertTrue(by_id["cloudconvert"]["sourceUnavailable"])
        self.assertIn("INTERNAL_ONLY", by_id["cloud-environment"]["license"])
        for source in sources:
            for digest in source.get("files", {}).values():
                self.assertRegex(digest, r"^[0-9a-f]{64}$")
        self.assertIn("Six Ideas", (ROOT / "licenses/coordinator.txt").read_text(encoding="utf-8"))
        self.assertIn("Codex Dev Workflows contributors", (ROOT / "licenses/workflows.txt").read_text(encoding="utf-8"))
        self.assertTrue((ROOT / "licenses/guardrails.txt").is_file())

    def test_submission_five_positive_three_negative(self):
        cases = json.loads((ROOT / "submission/examples.json").read_text(encoding="utf-8"))
        self.assertEqual(len(cases["positive"]), 5)
        self.assertEqual(len(cases["negative"]), 3)
        for case in cases["positive"] + cases["negative"]:
            with self.subTest(prompt=case["prompt"]):
                result = cli.route(case["prompt"])
                self.assertEqual(result["skill"], case["expectedOwner"])
                self.assertFalse(result["executionAuthorized"])
                self.assertFalse(result["externalActionAuthorized"])
                self.assertEqual(case["observedEvidence"], "deterministic routing/contract test only; no provider execution")

    def test_router_specific_intent_and_authority(self):
        cases = {"deep security scan": "devsuite-security-assess", "review this patch risk": "devsuite-review",
                 "fix a vulnerability": "devsuite-security-fix", "diagnose a bug": "devsuite-debug",
                 "plan architecture": "devsuite-planning", "implement the feature": "devsuite-implement",
                 "test user journeys": "devsuite-test", "run MegaLinter": "devsuite-review",
                 "inspect Docker networking": "devsuite-environment", "resume interrupted work": "devsuite-handoff"}
        for prompt, owner in cases.items():
            self.assertEqual(cli.route(prompt)["skill"], owner)
            self.assertFalse(cli.route(prompt)["externalActionAuthorized"])

    def test_doctor_complete_local_structure(self):
        result = cli.doctor()
        self.assertEqual(result["status"], "PASS", result["errors"])
        self.assertFalse(result["providersExecuted"])
        self.assertFalse(result["installed"])
        self.assertFalse(result["published"])

    def test_package_determinism_containment_and_no_overwrite(self):
        package_spec = importlib.util.spec_from_file_location("devsuite_package", ROOT / "scripts/package.py")
        module = importlib.util.module_from_spec(package_spec); package_spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.zip"; second = Path(directory) / "second.zip"
            one = module.package(first); two = module.package(second)
            self.assertEqual(one["sha256"], two["sha256"])
            self.assertFalse(one["installed"])
            self.assertFalse(one["published"])
            with self.assertRaises(ValueError):
                module.package(first)
            with zipfile.ZipFile(first) as archive:
                names = archive.namelist()
                self.assertIn(".codex-plugin/plugin.json", names)
                self.assertIn(".app.json", names)
                self.assertIn("runtime/coordinator/state.py", names)
                self.assertIn("tests/test_runtime.py", names)
                self.assertNotIn("plugin.json", names)
                self.assertIn("assets/favicon.ico", names)
                self.assertIn("assets/thumbnail.png", names)
                self.assertIn("assets/source/logo-preparation.json", names)
                self.assertFalse(any("__pycache__" in n or ".." in Path(n).parts for n in names))
                self.assertTrue(all(not n.startswith("/") for n in names))
