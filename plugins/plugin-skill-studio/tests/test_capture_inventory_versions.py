import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


script = Path(__file__).resolve().parents[1] / "tools" / "capture-inventory-versions.py"
spec = importlib.util.spec_from_file_location("studio_capture_inventory_versions", script)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CaptureInventoryVersionsTest(unittest.TestCase):
    def test_optional_cli_failure_preserves_independent_evidence(self):
        owned = "one@winrecoveryproject-digital"
        native = "dev-business@workspace-directory"
        other = "dev-personal@created-by-me-remote"
        vendor = "one@openai-curated-remote"
        fingerprint = "a" * 64
        directory = {"marketplaces": [{"name": "workspace-directory", "plugins": [
            {"id": native, "installed": True, "localVersion": "1.2.1", "version": "1.2.1"}
        ]}], "marketplaceLoadErrors": []}
        publications = {"expected": [owned], "entries": [{"id": owned, "version": "1.2.1"}]}
        history = {"installed": [{"pluginId": row, "version": "1.2.0", "enabled": True, "installed": True}
                                 for row in (owned, native, other)]}
        available = {"installed": [], "available": [{"pluginId": vendor, "version": "1.2.2"}]}
        successful = {"installed": [{"pluginId": owned, "version": "1.2.1", "enabled": True, "installed": True}]}

        with tempfile.TemporaryDirectory() as directory_path:
            root = Path(directory_path)
            previous = root / "previous.json"
            previous.write_text(json.dumps(history), encoding="utf-8")
            mappings = root / "mappings.json"
            mappings.write_text(json.dumps([{"publishedId": owned, "catalogId": row}
                                            for row in (native, vendor)]), encoding="utf-8")
            args = SimpleNamespace(codex=root, marketplace=root, account="business",
                                   host="Acer", counterparts=mappings, previous=previous)
            for response, reason in (
                (subprocess.TimeoutExpired("codex", 30), "TIMEOUT"),
                (subprocess.CalledProcessError(1, "codex"), "FAILED"),
                (b'{"installed":{}}', "FAILED"),
                (b'{"installed":[{}]}', "FAILED"),
                (b'{"installed":[],"marketplaceLoadErrors":["incomplete"]}', "FAILED"),
                (json.dumps(successful).encode(), None),
            ):
                with self.subTest(reason=reason):
                    def command(*cmd):
                        if "--marketplace" in cmd:
                            return json.dumps(available).encode()
                        if isinstance(response, Exception):
                            raise response
                        return response

                    with patch.object(collector, "command", side_effect=command), \
                         patch.object(collector, "capture_native", return_value=(fingerprint, directory)), \
                         patch.object(collector, "capture_publications", return_value=publications):
                        capture = collector.capture(args)

                    self.assertEqual(capture["scope"]["workspaceFingerprint"], fingerprint)
                    self.assertEqual(capture["published"], publications)
                    self.assertEqual(capture["catalogs"][0]["data"], available)
                    inventory = capture["inventory"]
                    self.assertEqual(inventory["current"][-1]["data"], directory)
                    self.assertEqual(inventory["historical"][0]["data"], {"installed": history["installed"][:1]})
                    if reason:
                        self.assertEqual(inventory["cliFailure"], reason)
                        self.assertEqual([row["kind"] for row in inventory["current"]], ["catalog"])
                    else:
                        self.assertNotIn("cliFailure", inventory)
                        self.assertEqual(inventory["current"][0]["data"], successful)


if __name__ == "__main__":
    unittest.main()
