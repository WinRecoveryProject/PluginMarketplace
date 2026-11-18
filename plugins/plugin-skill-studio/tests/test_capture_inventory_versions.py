import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import call, patch
from urllib.error import HTTPError, URLError


script = Path(__file__).resolve().parents[1] / "tools" / "capture-inventory-versions.py"
spec = importlib.util.spec_from_file_location("studio_capture_inventory_versions", script)
collector = importlib.util.module_from_spec(spec)
with patch.object(sys, "path", [str(script.parent), *sys.path]):
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

    def test_publications_respect_pinned_git_revision(self):
        origin = "https://github.com/example/marketplace.git"
        vendor = "https://github.com/example/plugin.git"
        marketplace_revision, default, pin = "a" * 40, "b" * 40, "c" * 40
        default_source = {"source": "git-subdir", "url": vendor, "path": "plugins/example"}
        cases = [
            ({"sha": pin}, pin, "2.0.0"),
            ({"sha": "  " + pin.upper() + " ", "ref": "release/another"}, pin, "2.0.0"),
            ({"sha": "  ", "ref": "  "}, default, "1.0.0"),
            ({}, default, "1.0.0"),
            ({"sha": pin[:12]}, None, None),
            ({"sha": 7}, None, None),
            ({"ref": "release/another"}, None, None),
            ({"sha": pin, "ref": []}, None, None),
        ]
        for selectors, expected_revision, version in cases:
            with self.subTest(selectors=selectors):
                manifest = {"name": "market", "plugins": [
                    {"name": "example", "source": {**default_source, **selectors}},
                ]}

                def read_manifest(owner, repo, revision, path):
                    self.assertEqual((owner, repo), ("example", "plugin"))
                    self.assertEqual(revision, expected_revision)
                    return json.dumps({"name": "example", "version": version}).encode()

                with patch.object(collector, "command", side_effect=[origin.encode(), json.dumps(manifest).encode()]), \
                     patch.object(collector, "git_head", side_effect=lambda url: marketplace_revision if url == origin else default), \
                     patch.object(collector, "remote_manifest_bytes", side_effect=read_manifest) as read:
                    result = collector.capture_publications(Path("market"))
                self.assertEqual(result["expected"], ["example@market"])
                if expected_revision is None:
                    self.assertEqual(result["entries"], [])
                    read.assert_not_called()
                else:
                    self.assertEqual(result["entries"][0]["version"], version)
                    self.assertEqual(result["entries"][0]["source"]["revision"], expected_revision)

    def test_unreadable_pin_does_not_fall_back_to_default_head(self):
        origin = "https://github.com/example/marketplace.git"
        vendor = "https://github.com/example/plugin.git"
        pin = "c" * 40
        manifest = {"name": "market", "plugins": [{"name": "example", "source": {
            "source": "git-subdir", "url": vendor, "path": "plugins/example", "sha": pin,
        }}]}
        with patch.object(collector, "command", side_effect=[origin.encode(), json.dumps(manifest).encode()]), \
             patch.object(collector, "git_head", side_effect=lambda url: "a" * 40 if url == origin else "b" * 40), \
             patch.object(collector, "remote_manifest_bytes", side_effect=HTTPError("fixture", 404, "missing", {}, None)) as read:
            result = collector.capture_publications(Path("market"))
        self.assertEqual(result, {"expected": ["example@market"], "entries": []})
        self.assertTrue(read.call_args_list)
        self.assertTrue(all(item.args[2] == pin for item in read.call_args_list))

    def test_scoped_installation_rejects_out_of_scope_or_incomplete_results(self):
        namespace = "winrecoveryproject-digital"
        for response in ({"installed":[{"pluginId":"one@other", "version":"1.0.0"}]},
                         {"installed":[], "marketplaceLoadErrors":["missing"]},
                         {"installed":[{"pluginId":"one@created-by-me-remote", "version":"1.0.0"}]}):
            with self.subTest(response=response), patch.object(collector, "command", return_value=json.dumps(response).encode()):
                self.assertIsNone(collector.capture_marketplace_installations("codex", namespace, 30))

    def test_configured_fallback_keeps_each_verified_ordinary_scope(self):
        published = {"expected": ["studio@winrecoveryproject-digital"]}
        listed = {"marketplaces": [
            {"name": name} for name in ("openai-bundled", "openai-curated", "ordinary-fails",
                                         "winrecoveryproject-digital", "openai-curated-remote",
                                         "workspace-directory", "created-by-me-remote", "--unsafe")
        ]}

        def run(_exe, *args, timeout, check_marketplace):
            self.assertEqual(timeout, 30)
            self.assertTrue(check_marketplace)
            if args == ("plugin", "marketplace", "list", "--json"):
                return json.dumps(listed).encode()
            self.assertEqual(args[:3], ("plugin", "list", "--marketplace"))
            self.assertEqual(args[4:], ("--json",))
            name = args[3]
            if name == "ordinary-fails":
                raise subprocess.TimeoutExpired(args, 30)
            self.assertIn(name, {"openai-bundled", "openai-curated", "winrecoveryproject-digital"})
            rows = [] if name == "openai-curated" else [{"pluginId": "studio@" + name}]
            return json.dumps({"installed": rows}).encode()

        with patch.object(collector, "command", side_effect=run) as command:
            snapshots = collector.capture_configured_installations("codex", published, 30)
        self.assertEqual(command.call_count, 5)
        self.assertEqual([row["namespace"] for row in snapshots],
                         ["openai-bundled", "openai-curated", "winrecoveryproject-digital"])
        self.assertEqual(snapshots[1]["data"], {"installed": []})

    def test_registry_failure_keeps_published_scope_probe(self):
        published = {"expected": ["studio@winrecoveryproject-digital"]}
        with patch.object(collector, "command", side_effect=[subprocess.TimeoutExpired("codex", 30),
                                                            b'{"installed":[]}']) as command:
            snapshots = collector.capture_configured_installations("codex", published, 30)
        self.assertEqual(command.call_count, 2)
        self.assertEqual([row["namespace"] for row in snapshots], ["winrecoveryproject-digital"])

    def test_targeted_vendor_installations_require_stable_native_account(self):
        namespace = "openai-curated-remote"
        plugin = "github@" + namespace
        vendor = {"installed": [{"pluginId": plugin, "version": "1.2.3", "enabled": True, "installed": True}],
                  "available": [{"pluginId": plugin, "version": "1.2.3"}]}
        active = {"account": {"planType": "plus"}, "workspaceRouting": {"chatgptAccountId": "personal"}}
        for after, expected in ((active, vendor),
                                ({**active, "workspaceRouting": {"chatgptAccountId": "different"}}, None),
                                ({**active, "account": {"planType": "business"}}, None)):
            with self.subTest(after=after):
                responses = [{}, active, {"marketplaces": [{"name": "created-by-me-remote", "plugins": []}]}, after]
                process = SimpleNamespace(stdin=io.BytesIO(), stdout=[
                    json.dumps({"id": key, "result": data}).encode() + b"\n"
                    for key, data in enumerate(responses)
                ], poll=lambda: 0, wait=lambda **_kwargs: 0)
                with patch.object(collector.subprocess, "Popen", return_value=process):
                    fingerprint, native, result = collector.capture_native(
                        "codex", Path("workspace"), "personal", {plugin}, lambda _send: vendor)
                self.assertEqual(result, expected)
                if expected:
                    self.assertTrue(fingerprint)
                    self.assertEqual(native["marketplaces"][-1],
                        {"name": namespace, "targeted": True, "plugins": [{
                            "id": plugin, "localVersion": "1.2.3", "installed": True, "enabled": True,
                        }]})
                else:
                    self.assertIsNone(fingerprint)
                    self.assertEqual(native["marketplaces"], [])

    def test_provider_success_retains_installations_outside_declared_pairs_during_cli_failure(self):
        namespace = "openai-curated-remote"
        owned = "one@winrecoveryproject-digital"
        mapped, extra = ("one@" + namespace, "unknown@" + namespace)
        data = {"installed": [
            {"pluginId": mapped, "version": "2.0.0", "enabled": True},
            {"pluginId": extra, "version": None, "enabled": False},
        ], "available": [{"pluginId": mapped, "version": "2.1.0"}]}

        def command(_codex, *args, **_kwargs):
            if args == ("plugin", "list", "--marketplace", namespace, "--available", "--json"):
                return json.dumps(data).encode()
            raise subprocess.TimeoutExpired(args, 30)

        native = {"marketplaces": [{"name": "created-by-me-remote", "plugins": []}], "marketplaceLoadErrors": []}
        with tempfile.TemporaryDirectory() as path:
            root = Path(path)
            mappings = root / "counterparts.json"
            mappings.write_text(json.dumps([{"publishedId": owned, "catalogId": mapped}]), encoding="utf8")
            args = SimpleNamespace(codex=root, marketplace=root, account="personal", host="Acer",
                                   counterparts=mappings, previous=None)
            with patch.object(collector, "command", side_effect=command), \
                 patch.object(collector, "capture_native", return_value=("a" * 64, native, None)), \
                 patch.object(collector, "capture_publications", return_value={"expected":[owned],"entries":[]}):
                captured = collector.capture(args)
        self.assertEqual(captured["inventory"]["cliFailure"], "TIMEOUT")
        scoped, = [row for row in captured["inventory"]["current"] if row["kind"] == "scoped-cli"]
        self.assertEqual(scoped["namespace"], namespace)
        self.assertEqual([(row["pluginId"], row["version"], row["enabled"]) for row in scoped["data"]["installed"]],
                         [(mapped, "2.0.0", True), (extra, None, False)])
        self.assertEqual(captured["catalogs"][0]["data"]["installed"], [{"pluginId": mapped, "version": "2.0.0"}])

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
                         patch.object(collector, "capture_native", return_value=(fingerprint, native, None)), \
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
                        if cmd[1:] == ["plugin", "marketplace", "list", "--json"]:
                            return subprocess.CompletedProcess(cmd, 0, b'{"marketplaces":[]}', b"")
                        if "--marketplace" in cmd:
                            if cmd[cmd.index("--marketplace") + 1] == "winrecoveryproject-digital":
                                self.assertNotIn("--available", cmd)
                                return subprocess.CompletedProcess(cmd, 0, good, b"")
                            return subprocess.CompletedProcess(cmd, 0, json.dumps(available).encode(), vendor_warning)
                        if isinstance(response, Exception):
                            raise response
                        return subprocess.CompletedProcess(cmd, 0, response, full_warning)

                    with patch.object(collector.subprocess, "run", side_effect=run) as run_mock, \
                         patch.object(collector, "capture_native", return_value=(fingerprint, active_directory, None)) as capture_native, \
                         patch.object(collector, "capture_publications", return_value=publications):
                        capture = collector.capture(args)

                    self.assertEqual(run_mock.call_count, 4 if reason else 2)
                    self.assertEqual(capture_native.call_args.args[:4], (root, root, account, {native, vendor}))
                    self.assertTrue(callable(capture_native.call_args.args[4]))
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
                        self.assertEqual([row["kind"] for row in inventory["current"]], ["scoped-cli", "scoped-cli", "catalog"])
                        self.assertEqual(inventory["current"][0]["namespace"], "winrecoveryproject-digital")
                        self.assertEqual(inventory["current"][0]["data"], successful)
                    else:
                        self.assertNotIn("cliFailure", inventory)
                        self.assertEqual(inventory["current"][0]["data"], successful)


if __name__ == "__main__":
    unittest.main()
