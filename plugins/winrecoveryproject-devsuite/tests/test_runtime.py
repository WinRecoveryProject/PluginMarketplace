import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.evidence import (ContractError, contained, conversion_plan, provider_check,
                              read_json, validate_assessment, write_assessment)


class RuntimeTests(unittest.TestCase):
    def test_conversion_budget_upload_and_plan_not_execution(self):
        request = {"sources": ["authorized/input.docx"], "targetFormat": "pdf",
                   "route": "cloudconvert", "estimatedCost": 0,
                   "freeQuotaConfirmed": True, "uploadAuthorized": True,
                   "destination": "new/output.pdf"}
        result = conversion_plan(request)
        self.assertEqual(result["status"], "PLANNED")
        self.assertFalse(result["executed"])
        self.assertFalse(result["quotaVerifiedByHelper"])
        self.assertEqual(result["budgetKr"], 0)
        for field, value in [("estimatedCost", None), ("estimatedCost", 1),
                             ("estimatedCost", False), ("freeQuotaConfirmed", False),
                             ("uploadAuthorized", False), ("overwrite", True),
                             ("targetFormat", "pdf; run-command")]:
            with self.subTest(field=field, value=value), self.assertRaises(ContractError):
                conversion_plan(dict(request, **{field: value}))

    def test_provider_missing_never_passes(self):
        catalog = read_json(ROOT / "references/provider-capabilities.json")
        result = provider_check({"tools": []}, "security-deep", catalog)
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertFalse(result["executionVerified"])
        actual = ["mcp__codex_security__start_codex_security_deep_scan",
                  "mcp__codex_security__complete_codex_security_scan"]
        observed = provider_check({"tools": actual}, "security-deep", catalog)
        self.assertEqual(observed["status"], "NOT_VERIFIED")
        self.assertTrue(observed["toolNamesPresent"])
        self.assertFalse(observed["canExecute"])
        self.assertFalse(observed["executionVerified"])
        self.assertFalse(observed["authenticationVerified"])
        unknown = provider_check({"tools": []}, "cloudconvert", catalog)
        self.assertEqual(unknown["status"], "UNAVAILABLE")
        supplied = {"tools": ["observed_converter"], "capabilityTools": {"cloudconvert": ["observed_converter"]}}
        self.assertEqual(provider_check(supplied, "cloudconvert", catalog)["status"], "NOT_VERIFIED")
        self.assertEqual(provider_check({"tools": ["unrelated"]}, "cloudconvert", catalog)["status"], "UNAVAILABLE")

    def test_insufficient_access_and_unknown_billing_never_ready(self):
        catalog = read_json(ROOT / "references/provider-capabilities.json")
        tools = ["mcp__codex_security__start_codex_security_deep_scan",
                 "mcp__codex_security__complete_codex_security_scan"]
        observation = {"tools": tools, "access": {"security-deep": {"status": "INSUFFICIENT", "stale": False}}}
        result = provider_check(observation, "security-deep", catalog)
        self.assertEqual(result["status"], "ACCESS_INSUFFICIENT")
        self.assertFalse(result["canExecute"])
        observation["access"]["security-deep"] = {"status": "GRANTED", "stale": False}
        granted = provider_check(observation, "security-deep", catalog)
        self.assertEqual(granted["status"], "NOT_VERIFIED")
        self.assertFalse(granted["authorizationVerified"])
        self.assertFalse(granted["costVerified"])
        observed = {"tools": ["observed_converter"], "capabilityTools": {"cloudconvert": ["observed_converter"]}}
        unknown_billing = provider_check(observed, "cloudconvert", catalog)
        self.assertEqual(unknown_billing["status"], "NOT_VERIFIED")
        self.assertFalse(unknown_billing["costVerified"])
        self.assertFalse(unknown_billing["canExecute"])

    def _assessment(self):
        return {"schema": "devsuite-assessment-v1", "mode": "standard", "target": "fixture",
                "revision": "fixture-revision", "summary": "Static fixture evidence only",
                "status": "FAIL", "coverage": {"reviewed": ["src.py"], "excluded": [], "deferred": []},
                "limitations": [], "findings": [{"id": "F1", "title": "<script>alert(1)</script> [click](https://example.com)",
                "rootCause": "Unchecked user path", "invariant": "Read only owned files",
                "attackerControl": "Request path", "attackPath": "Request to file read",
                "impact": "Cross-boundary read", "counterevidence": "No guard in reviewed fixture",
                "remediation": "Validate the shared boundary", "severity": "high", "confidence": "high",
                "validation": "static-evidence", "location": {"path": "src.py", "line": 1}}]}

    def test_assessment_evidence_coverage_and_safe_render(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root / "src.py").write_text("read(user_path)\n", encoding="utf-8")
            result = write_assessment(self._assessment(), root, root / "report")
            self.assertFalse(result["providerSealed"])
            self.assertEqual(set(result["sha256"]), {"assessment.json", "report.md"})
            rendered = (root / "report/report.md").read_text(encoding="utf-8")
            self.assertIn("not a sealed Codex Security", rendered)
            self.assertNotIn("<script>", rendered)
            self.assertNotIn("[click](https", rendered)
            self.assertIn("&lt;script&gt;", rendered)
            self.assertIn("static-evidence", rendered)
            with self.assertRaises(ContractError):
                write_assessment(self._assessment(), root, root / "report")

    def test_assessment_cannot_hide_limits_or_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root / "src.py").write_text("read(user_path)\n", encoding="utf-8")
            mutations = [lambda d: d.update(status="PASS"),
                         lambda d: d.update(mode="deep"),
                         lambda d: d["findings"][0]["location"].update(path="../outside.py"),
                         lambda d: d["findings"][0]["location"].update(line=2),
                         lambda d: d["findings"][0].pop("attackerControl")]
            for mutate in mutations:
                data = self._assessment(); mutate(data)
                with self.assertRaises(ContractError):
                    validate_assessment(data, root)
            data = self._assessment(); data.update(status="PASS", findings=[], limitations=["not exercised"])
            with self.assertRaises(ContractError):
                validate_assessment(data, root)
            data.update(limitations=[]); data["coverage"]["deferred"] = ["unreviewed boundary"]
            with self.assertRaises(ContractError):
                validate_assessment(data, root)
            for path in ["../escape", "/absolute", "C:/absolute", "folder//file", "folder/./file", "a\\b"]:
                with self.subTest(path=path), self.assertRaises(ContractError):
                    contained(root, path)

    def test_duplicate_json_and_nonfinite_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data.json"
            for value in ['{"x":1,"x":2}', '{"cost":NaN}', '{"cost":Infinity}']:
                path.write_text(value, encoding="utf-8")
                with self.assertRaises(ContractError):
                    read_json(path)

    def test_cli_unavailable_nonzero_and_literal_request(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "inventory.json"; path.write_text('{"tools":[]}', encoding="utf-8")
            result = subprocess.run([sys.executable, str(ROOT / "scripts/devsuite.py"), "provider-check", "cloudconvert", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)["status"], "UNAVAILABLE")
            route = subprocess.run([sys.executable, str(ROOT / "scripts/devsuite.py"), "route", "convert $(touch should-not-run)"], capture_output=True, text=True, cwd=directory)
            self.assertEqual(route.returncode, 0)
            self.assertFalse((Path(directory) / "should-not-run").exists())
            self.assertFalse(json.loads(route.stdout)["executionAuthorized"])
