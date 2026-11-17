"""Regressions reproduced through the installed CLI during practical validation."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "scripts/devsuite.py"


class PracticalRegressionTests(unittest.TestCase):
    def test_danish_routes(self):
        for request, expected in [
            ("Kør lintkontrol af projektet", "devsuite-quality"),
            ("Gennemgå ændringerne for fejl", "devsuite-review"),
            ("Test læsning og skrivning", "devsuite-test"),
        ]:
            with self.subTest(request=request):
                result = subprocess.run([sys.executable, str(CLI), "route", request],
                                        capture_output=True, text=True, encoding="utf-8")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(result.stdout)["skill"], expected)

    def test_malformed_provider_objects_return_structured_errors(self):
        valid = {"tools": [], "access": {}, "capabilityTools": {}}
        cases = [[], None]
        for key in ("access", "capabilityTools"):
            for bad in ([], None, "invalid"):
                value = copy.deepcopy(valid)
                value[key] = bad
                cases.append(value)
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "inventory.json"
            for value in cases:
                with self.subTest(value=value):
                    file.write_text(json.dumps(value), encoding="utf-8")
                    result = subprocess.run([sys.executable, str(CLI), "provider-check", "linter", str(file)],
                                            capture_output=True, text=True, encoding="utf-8")
                    self.assertEqual(result.returncode, 1)
                    output = json.loads(result.stdout)
                    self.assertEqual(output["status"], "ERROR")
                    self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
