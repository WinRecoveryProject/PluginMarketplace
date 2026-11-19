"""Native vendor evidence keeps scopes exact and records positive observations only."""

from queue import Empty
import subprocess
import unittest
from unittest.mock import Mock, call, patch

from tools import native_vendor_evidence as evidence


VENUE = "openai-curated-remote"
DROPBOX = "app-69b31dc2110c8191b8b47dc98fe5a052@" + VENUE
DRIVE = "google-drive@" + VENUE
BACKEND = "plugin_69b31dc2110c8191b8b47dc98fe5a052"


def pair(slug, catalog_id, **options):
    return {"publishedId": slug + "@winrecoveryproject-digital", "catalogId": catalog_id, **options}


def search_row(catalog_id=DROPBOX, backend_id=BACKEND, venue=VENUE, marketplace_path=None, **summary):
    return {"marketplaceName": venue, "marketplacePath": marketplace_path,
            "plugin": {"id": catalog_id, "remotePluginId": backend_id, **summary}}


def search(*rows):
    return {"data": list(rows), "nextCursor": None}


def detail(catalog_id=DROPBOX, backend_id=BACKEND, venue=VENUE, **summary):
    return {"plugin": {"marketplaceName": venue,
                       "summary": {"id": catalog_id, "remotePluginId": backend_id, **summary}}}


class NativeVendorEvidenceTest(unittest.TestCase):
    def test_reads_exact_backend_detail_and_preserves_both_versions(self):
        sender = Mock(side_effect=[
            search(search_row(DRIVE), search_row(DROPBOX), search_row(venue="workspace-directory")),
            detail(installed=True, enabled=False, localVersion="6.0.0", availability="AVAILABLE", version="6.1.0"),
        ])
        result = evidence.capture_vendor_details(sender, [
            pair("dropbox", DROPBOX, searchTerm="Dropbox"), pair("dropbox-copy", DROPBOX),
            pair("local", "local@openai-bundled"),
        ])
        self.assertEqual(result, {
            "installed": [{"pluginId": DROPBOX, "version": "6.0.0", "installed": True, "enabled": False}],
            "available": [{"pluginId": DROPBOX, "version": "6.1.0"}],
        })
        self.assertEqual(sender.call_args_list, [
            call("plugin/search", 21, {"searchTerm": "Dropbox", "scope": "global", "limit": 12}),
            call("plugin/read", 22, {"pluginName": BACKEND, "remoteMarketplaceName": VENUE}),
        ])

    def test_rejects_missing_ambiguous_and_invalid_backend_matches(self):
        invalid_ids = ("https://example.test", "../other", "plugin/other", "plugin name", "nonasciiå", "a" * 136)
        invalid_rows = [search(search_row(backend_id=value)) for value in invalid_ids]
        for payload in (search(), search(search_row(), search_row()), *invalid_rows,
                        search(search_row(venue="workspace-directory")), {"data": {}}):
            with self.subTest(payload=payload):
                sender = Mock(return_value=payload)
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]),
                                 {"installed": [], "available": []})
                sender.assert_called_once()

    def test_verifies_detail_venue_and_both_identities_before_accepting_versions(self):
        record = {"installed": True, "enabled": True, "localVersion": "6.0.0",
                  "availability": "AVAILABLE", "version": "6.1.0"}
        for mismatch in ({"catalog_id": DRIVE}, {"backend_id": "plugin_other"},
                         {"venue": "workspace-directory"}):
            with self.subTest(mismatch=mismatch):
                sender = Mock(side_effect=[search(search_row(availability="AVAILABLE", version="6.1.0")),
                                           detail(**record, **mismatch)])
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]),
                                 {"installed": [], "available": []})

    def test_requires_installed_flag_local_version_and_positive_availability(self):
        for record, expected in (
            ({"installed": False, "localVersion": "6.0.0", "version": "6.1.0", "availability": "AVAILABLE"},
             {"installed": [], "available": [{"pluginId": DROPBOX, "version": "6.1.0"}]}),
            ({"installed": True, "localVersion": None, "version": "6.1.0", "availability": "UNAVAILABLE"},
             {"installed": [], "available": []}),
            ({"installed": True, "localVersion": "6.0.0", "enabled": 0, "version": "6.1.0"},
             {"installed": [{"pluginId": DROPBOX, "version": "6.0.0", "installed": True, "enabled": None}],
              "available": []}),
        ):
            with self.subTest(record=record):
                sender = Mock(side_effect=[search(search_row(availability="AVAILABLE", version="9.0.0")),
                                           detail(**record)])
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]), expected)

    def test_failed_detail_preserves_only_advertised_evidence_and_later_targets(self):
        sender = Mock(side_effect=[
            search(search_row(availability="AVAILABLE", version="6.1.0", installed=True,
                              enabled=True, localVersion="6.0.0")),
            subprocess.TimeoutExpired("test native read", 3),
            search(search_row(DRIVE)),
            detail(DRIVE, installed=True, enabled=True, localVersion="0.1.26",
                   version="0.1.27", availability="AVAILABLE"),
        ])
        result = evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX), pair("google-drive", DRIVE)])
        self.assertEqual(result, {"installed": [
            {"pluginId": DRIVE, "version": "0.1.26", "installed": True, "enabled": True}
        ], "available": [{"pluginId": DROPBOX, "version": "6.1.0"},
                         {"pluginId": DRIVE, "version": "0.1.27"}]})
        self.assertEqual(sender.call_args_list[2],
                         call("plugin/search", 23, {"searchTerm": "google drive", "scope": "global", "limit": 12}))

    def test_failed_detail_requires_explicit_remote_positive_search_evidence(self):
        missing_path = search_row(availability="AVAILABLE", version="6.1.0")
        missing_path.pop("marketplacePath")
        for row in (missing_path,
                    search_row(marketplace_path="C:/local/catalog", availability="AVAILABLE", version="6.1.0"),
                    search_row(availability="UNAVAILABLE", version="6.1.0"),
                    search_row(availability="AVAILABLE", version="/invalid"),
                    search_row(version="6.1.0")):
            with self.subTest(row=row):
                sender = Mock(side_effect=[search(row), KeyError("result")])
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]),
                                 {"installed": [], "available": []})

    def test_accepts_nonprefixed_server_ids_for_exact_remote_evidence(self):
        for backend_id in ("ab12" * 10, "Opaque_App-1~Beta"):
            with self.subTest(backend_id=backend_id):
                sender = Mock(side_effect=[
                    search(search_row(backend_id=backend_id, availability="AVAILABLE", version="6.1.0")),
                    Empty(),
                ])
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]),
                                 {"installed": [], "available": [{"pluginId": DROPBOX, "version": "6.1.0"}]})
                self.assertEqual(sender.call_args,
                                 call("plugin/read", 22, {"pluginName": backend_id, "remoteMarketplaceName": VENUE}))

    def test_native_read_failure_preserves_exact_remote_release(self):
        for failure in (Empty(), KeyError("result")):
            with self.subTest(failure=type(failure).__name__):
                sender = Mock(side_effect=[search(search_row(availability="AVAILABLE", version="6.1.0")), failure])
                self.assertEqual(evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX)]),
                                 {"installed": [], "available": [{"pluginId": DROPBOX, "version": "6.1.0"}]})

    def test_deadline_prevents_next_request_and_preserves_observed_remote_release(self):
        sender = Mock(return_value=search(search_row(availability="AVAILABLE", version="6.1.0")))
        with patch.object(evidence.time, "monotonic", side_effect=[0.0, 0.1, 2.0, 2.1]):
            result = evidence.capture_vendor_details(sender, [pair("dropbox", DROPBOX), pair("google-drive", DRIVE)],
                                                     timeout_seconds=1)
        self.assertEqual(result, {"installed": [], "available": [{"pluginId": DROPBOX, "version": "6.1.0"}]})
        sender.assert_called_once()
