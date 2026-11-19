import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from native_component_inventory import capture_components


class ComponentInventoryTests(unittest.TestCase):
    cwd = str(Path.cwd())
    owner = "example@marketplace"

    def responses(self):
        return {
            "plugin/list": [{"marketplaces": [{"name": "openai-curated-remote"}],
                             "marketplaceLoadErrors": []}],
            "app/list": [
                {"data": [{"id": "app_one", "name": "Shared Name", "isEnabled": True,
                           "isAccessible": True, "logoUrl": "private-example"}], "nextCursor": "page-two"},
                {"data": [{"id": "app_two", "name": "Shared Name", "isEnabled": False,
                           "isAccessible": False}], "nextCursor": None},
            ],
            "skills/list": [{"data": [{"cwd": self.cwd, "errors": [], "skills": [
                {"name": "same-skill", "path": "one/SKILL.md", "scope": "repo",
                 "enabled": True, "pluginId": self.owner, "description": "private-example"},
                {"name": "same-skill", "path": "two/SKILL.md", "scope": "user",
                 "enabled": False, "pluginId": None},
            ]}]}],
            "mcpServerStatus/list": [{"data": [
                {"name": "local", "pluginId": self.owner, "authStatus": "unsupported",
                 "runtimeStatus": None, "tools": {"example": {"_meta": "private-example"}}, "toolsError": None},
                {"name": "remote", "pluginId": None, "authStatus": "notLoggedIn",
                 "runtimeStatus": "authenticationRequired", "tools": {}, "toolsError": "private-example"},
            ], "nextCursor": None}],
        }

    def run_capture(self, responses):
        calls = []

        def send(method, request_id, params, *, timeout):
            self.assertGreater(timeout, 0)
            self.assertLessEqual(timeout, 75 if params.get("forceRefetch") else 25)
            calls.append((method, request_id, dict(params)))
            response = responses[method].pop(0)
            if isinstance(response, Exception):
                raise response
            return response

        return capture_components(send, self.cwd), calls

    def test_observes_exact_identities_without_unneeded_raw_fields(self):
        result, calls = self.run_capture(self.responses())
        self.assertEqual((calls[0][0], calls[0][2]), ("plugin/list", {"cwds": [self.cwd]}))
        self.assertEqual((calls[1][0], calls[1][2]), ("skills/list", {"cwds": [self.cwd], "forceReload": True}))
        self.assertEqual([call[2].get("cursor") for call in calls[3:]], [None, "page-two"])
        self.assertEqual([call[2]["forceRefetch"] for call in calls[3:]], [True, False])
        self.assertEqual(calls[2][2], {"detail": "toolsAndAuthOnly", "limit": 100})
        self.assertEqual(len({call[1] for call in calls}), 5)
        self.assertTrue(all(group["status"] == "OBSERVED" and len(group["items"]) == 2
                            for group in result.values()))
        self.assertEqual([row["id"] for row in result["apps"]["items"]], ["app_one", "app_two"])
        self.assertIs(result["skills"]["items"][1]["enabled"], False)
        self.assertIsNone(result["mcpServers"]["items"][0]["runtimeStatus"])
        self.assertTrue(result["mcpServers"]["items"][1]["toolDiscoveryFailed"])
        self.assertNotIn("private-example", str(result))

    def test_keeps_positive_evidence_when_the_next_page_fails(self):
        responses = self.responses()
        responses["app/list"][1] = TimeoutError("private-example")
        result, _ = self.run_capture(responses)
        self.assertEqual(result["apps"]["status"], "INCOMPLETE")
        self.assertEqual(result["apps"]["issue"], "NATIVE_TIMEOUT")
        self.assertEqual([row["id"] for row in result["apps"]["items"]], ["app_one"])
        self.assertEqual(result["mcpServers"]["status"], "OBSERVED")
        self.assertNotIn("private-example", str(result))

    def test_incomplete_catalog_keeps_skill_evidence_and_other_components(self):
        cases = [
            ({"marketplaces": [], "marketplaceLoadErrors": []}, "CURATED_MARKETPLACE_MISSING"),
            ({"marketplaces": [{"name": "openai-curated-remote"}],
              "marketplaceLoadErrors": ["private-example"]}, "MARKETPLACE_LOAD_ERRORS"),
            ({"marketplaces": {}}, "NATIVE_REQUEST_OR_RESPONSE_FAILED"),
            (TimeoutError("private-example"), "NATIVE_TIMEOUT"),
        ]
        for catalog_response, issue in cases:
            with self.subTest(issue=issue):
                responses = self.responses()
                responses["plugin/list"] = [catalog_response]
                result, _ = self.run_capture(responses)
                skills = result["skills"]
                self.assertEqual(skills["status"], "INCOMPLETE")
                self.assertEqual(skills["issue"], "SKILL_CATALOG_INCOMPLETE")
                self.assertEqual(skills["catalog"]["status"], "INCOMPLETE")
                self.assertEqual(skills["catalog"]["issue"], issue)
                self.assertEqual(len(skills["items"]), 2)
                self.assertEqual(result["apps"]["status"], "OBSERVED")
                self.assertEqual(result["mcpServers"]["status"], "OBSERVED")
                self.assertNotIn("private-example", str(result))

    def test_wrong_skill_workspace_and_cursor_loop_are_incomplete(self):
        responses = self.responses()
        responses["app/list"][1]["nextCursor"] = "page-two"
        responses["skills/list"][0]["data"][0]["cwd"] = str(Path(self.cwd) / "different")
        result, _ = self.run_capture(responses)
        self.assertEqual(result["apps"]["issue"], "REPEATED_CURSOR")
        self.assertEqual(result["skills"]["status"], "INCOMPLETE")
        self.assertEqual(result["skills"]["items"], [])


if __name__ == "__main__":
    unittest.main()
