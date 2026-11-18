import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import call, patch
from urllib.error import HTTPError, URLError


script = Path(__file__).resolve().parents[1] / "tools" / "capture-inventory-versions.py"
spec = importlib.util.spec_from_file_location("studio_capture_inventory_versions", script)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CaptureInventoryVersionsTest(unittest.TestCase):
    def test_public_manifest_retries_the_same_revision_after_a_transient_failure(self):
        url = "https://raw.githubusercontent.com/openai/plugins/" + "a" * 40 + "/plugins/github/plugin.json"
        expected = b'{"name":"github","version":"0.1.12"}'
        for failure in (TimeoutError(), ConnectionResetError(), URLError(TimeoutError()),
                        collector.IncompleteRead(b""), HTTPError(url, 503, "unavailable", {}, io.BytesIO())):
            with self.subTest(failure=failure), \
                 patch.object(collector.PUBLIC_HTTP, "open", side_effect=[failure, io.BytesIO(expected)]) as get, \
                 patch.object(collector.time, "sleep") as wait:
                self.assertEqual(collector.public_manifest_bytes(url), expected)
                self.assertEqual(get.call_args_list, [call(url, timeout=12), call(url, timeout=5)])
                wait.assert_called_once_with(0.5)

    def test_public_manifest_leaves_permanent_or_repeated_failures_unverified(self):
        url = "https://raw.githubusercontent.com/openai/plugins/" + "a" * 40 + "/plugins/sharepoint/plugin.json"
        for initial, expected_calls in ((HTTPError(url, 404, "missing", {}, None), 1),
                                        (HTTPError(url, 429, "rate limited", {}, None), 1),
                                        (URLError("TLS verification failed"), 1),
                                        (TimeoutError(), 2)):
            with self.subTest(initial=initial), \
                 patch.object(collector.PUBLIC_HTTP, "open", side_effect=initial) as get, \
                 patch.object(collector.time, "sleep"):
                with self.assertRaises(type(initial)):
                    collector.public_manifest_bytes(url)
                self.assertEqual(get.call_count, expected_calls)

    def test_public_contents_fallback_checks_the_same_blob_after_raw_retries(self):
        ref = "a" * 40
        path = "plugins/sharepoint/.codex-plugin/plugin.json"
        raw_url = f"https://raw.githubusercontent.com/openai/plugins/{ref}/{path}"
        api_url = f"https://api.github.com/repos/openai/plugins/contents/{path}?ref={ref}"
        raw = b'{"name":"sharepoint","version":"0.1.7"}'
        digest = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
        result = {"type": "file", "path": path, "encoding": "base64", "size": len(raw),
                  "content": base64.encodebytes(raw).decode(), "sha": digest}
        unavailable = HTTPError(raw_url, 503, "unavailable", {}, io.BytesIO())
        with patch.object(collector.PUBLIC_HTTP, "open", side_effect=[
                 TimeoutError(), unavailable, io.BytesIO(json.dumps(result).encode())]) as get, \
             patch.object(collector.time, "sleep"):
            self.assertEqual(collector.remote_manifest_bytes("openai", "plugins", ref, path), raw)
        self.assertEqual(get.call_args_list[:2], [call(raw_url, timeout=12), call(raw_url, timeout=5)])
        request = get.call_args.args[0]
        self.assertEqual(request.full_url, api_url)
        self.assertIsNone(request.get_header("Authorization"))

    def test_public_contents_fallback_does_not_accept_unverified_evidence(self):
        ref = "a" * 40
        path = "plugins/sharepoint/.codex-plugin/plugin.json"
        raw = b"{}"
        valid = {"type": "file", "path": path, "encoding": "base64", "size": len(raw),
                 "content": base64.encodebytes(raw).decode(),
                 "sha": hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()}
        for overrides in ({"path": "wrong.json"}, {"sha": "0" * 40}, {"size": 7},
                          {"type": "symlink"}, {"content": "!"}):
            with self.subTest(overrides=overrides), \
                 patch.object(collector, "public_manifest_bytes", side_effect=TimeoutError()), \
                 patch.object(collector.PUBLIC_HTTP, "open", return_value=io.BytesIO(
                     json.dumps({**valid, **overrides}).encode())):
                with self.assertRaises(ValueError):
                    collector.remote_manifest_bytes("openai", "plugins", ref, path)

    def test_public_contents_fallback_does_not_retry_permission_or_tls_errors(self):
        url = "https://raw.githubusercontent.com/openai/plugins/" + "a" * 40 + "/plugin.json"
        for failure in (HTTPError(url, 403, "forbidden", {}, None), HTTPError(url, 404, "missing", {}, None),
                        HTTPError(url, 429, "rate limited", {}, None), URLError("TLS verification failed")):
            with self.subTest(failure=failure), patch.object(collector.PUBLIC_HTTP, "open", side_effect=failure) as get:
                with self.assertRaises(type(failure)):
                    collector.remote_manifest_bytes("openai", "plugins", "a" * 40, "plugin.json")
                self.assertEqual(get.call_count, 1)

    def test_scoped_installation_rejects_out_of_scope_or_incomplete_results(self):
        declared={"expected":["one@winrecoveryproject-digital"]}
        for response in ({"installed":[{"pluginId":"one@other", "version":"1.0.0"}]},
                         {"installed":[], "marketplaceLoadErrors":["missing"]},
                         {"installed":[{"pluginId":"one@created-by-me-remote", "version":"1.0.0"}]}):
            with self.subTest(response=response), patch.object(collector, "command", return_value=json.dumps(response).encode()):
                self.assertIsNone(collector.capture_marketplace_installations("codex", declared, 30))

    def test_non_plugin_commands_keep_default_budget(self):
        result = subprocess.CompletedProcess(["git", "status"], 0, stdout=b"clean")
        with patch.object(collector.subprocess, "run", return_value=result) as run:
            self.assertEqual(collector.command("git", "status"), b"clean")
        self.assertEqual(run.call_args.kwargs["timeout"], 30)
        self.assertEqual(run.call_args.kwargs["stderr"], subprocess.DEVNULL)

    def test_invalid_vendor_catalog_preserves_current_and_published_evidence(self):
        vendor = "one@openai-curated-remote"
        fingerprint = "a" * 64
        native = {"marketplaces": [{"name": "workspace-directory", "plugins": []}], "marketplaceLoadErrors": []}
        publications = {"expected": ["one@winrecoveryproject-digital"], "entries": []}
        with tempfile.TemporaryDirectory() as directory_path:
            root = Path(directory_path)
            mappings = root / "mappings.json"
            mappings.write_text(json.dumps([{"publishedId": publications["expected"][0], "catalogId": vendor}]),
                                encoding="utf-8")
            args = SimpleNamespace(codex=root, marketplace=root, account="business",
                                   host="Acer", counterparts=mappings, previous=None)

            for payload in (None, [], {"installed": [], "available": None},
                            {"installed": [], "available": [None]},
                            {"installed": [], "available": [{"pluginId": vendor, "version": []}]}):
                with self.subTest(payload=payload):
                    def command(*cmd, **_kwargs):
                        reply = payload if "--marketplace" in cmd else {"installed": []}
                        return json.dumps(reply).encode()

                    with patch.object(collector, "command", side_effect=command), \
                         patch.object(collector, "capture_native", return_value=(fingerprint, native)), \
                         patch.object(collector, "capture_publications", return_value=publications):
                        capture = collector.capture(args)

                    self.assertEqual(capture["catalogs"], [{"namespace": "openai-curated-remote", "exitCode": 2}])
                    self.assertEqual(capture["inventory"]["current"][0]["data"], {"installed": []})
                    self.assertEqual(capture["inventory"]["current"][1]["data"], native)
                    self.assertEqual(capture["published"], publications)

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
            good = json.dumps(successful).encode()
            warning = b"Warning: failed to list remote marketplace plugins: provider details"
            for account, budget, response, full_warning, vendor_warning, reason in (
                ("business", 110, subprocess.TimeoutExpired("codex", 110), b"", b"", "TIMEOUT"),
                ("business", 110, subprocess.CalledProcessError(1, "codex"), b"", b"", "FAILED"),
                ("business", 110, b'{"installed":{}}', b"", b"", "FAILED"),
                ("business", 110, b'{"installed":[{}]}', b"", b"", "FAILED"),
                ("business", 110, b'{"installed":[],"marketplaceLoadErrors":["incomplete"]}', b"", b"", "FAILED"),
                ("business", 110, good, warning, b"", "FAILED"),
                ("business", 110, good, b"", warning, None),
                ("business", 110, good, b"Unrelated diagnostic", b"", None),
                ("personal", 30, good, b"", b"", None),
            ):
                args.account = account
                active_directory = directory if account == "business" else {
                    "marketplaces": [{"name": "created-by-me-remote", "plugins": []}], "marketplaceLoadErrors": [],
                }
                with self.subTest(account=account, reason=reason, warning=full_warning or vendor_warning):
                    def run(cmd, *, timeout, stderr, **_kwargs):
                        self.assertEqual(timeout, budget)
                        self.assertEqual(stderr, subprocess.PIPE)
                        if "--marketplace" in cmd:
                            if cmd[cmd.index("--marketplace") + 1] == "winrecoveryproject-digital":
                                self.assertNotIn("--available", cmd)
                                return subprocess.CompletedProcess(cmd, 0, good, b"")
                            return subprocess.CompletedProcess(cmd, 0, json.dumps(available).encode(), vendor_warning)
                        if isinstance(response, Exception):
                            raise response
                        return subprocess.CompletedProcess(cmd, 0, response, full_warning)

                    with patch.object(collector.subprocess, "run", side_effect=run) as run_mock, \
                         patch.object(collector, "capture_native", return_value=(fingerprint, active_directory)) as capture_native, \
                         patch.object(collector, "capture_publications", return_value=publications):
                        capture = collector.capture(args)

                    self.assertEqual(run_mock.call_count, 3 if reason else 2)
                    capture_native.assert_called_once_with(root, root, account, {native, vendor})
                    self.assertEqual(capture["scope"]["workspaceFingerprint"], fingerprint)
                    self.assertEqual(capture["published"], publications)
                    if vendor_warning:
                        self.assertEqual(capture["catalogs"], [{"namespace": "openai-curated-remote", "exitCode": 2}])
                    else:
                        self.assertEqual(capture["catalogs"][0]["data"], available)
                    inventory = capture["inventory"]
                    self.assertEqual(inventory["current"][-1]["data"], active_directory)
                    self.assertEqual(inventory["historical"][0]["data"], {"installed": history["installed"][:1]})
                    if reason:
                        self.assertEqual(inventory["cliFailure"], reason)
                        self.assertEqual([row["kind"] for row in inventory["current"]], ["scoped-cli", "catalog"])
                        self.assertEqual(inventory["current"][0]["namespace"], "winrecoveryproject-digital")
                        self.assertEqual(inventory["current"][0]["data"], successful)
                    else:
                        self.assertNotIn("cliFailure", inventory)
                        self.assertEqual(inventory["current"][0]["data"], successful)


if __name__ == "__main__":
    unittest.main()
