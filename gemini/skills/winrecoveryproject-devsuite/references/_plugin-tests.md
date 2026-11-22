# Plugin files: winrecoveryproject-devsuite — `tests/`

Source: `plugins/winrecoveryproject-devsuite`. Files outside the `skills/*` folders, embedded as text.

## File: `tests/test_contracts.py`

```python
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
        self.assertEqual(manifest["version"], "0.4.0")
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
```

## File: `tests/test_coordinator.py`

```python
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.coordinator import project, state

THREADS = [f"00000000-0000-4000-8000-{i:012d}" for i in range(1, 14)]
MARKER = """schema_version: 2
coordination_enabled: true
project_id: fixture
canonical_paths:
  active: .codex/coordination/active
  archive: .codex/coordination/archive
access:
  cross_project_task_access: false
  cross_project_state_changes: false
"""

class CoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.board = self.root / ".codex/coordination"
        self.board.mkdir(parents=True)
        (self.board / "project.yaml").write_text(MARKER, encoding="utf-8")
        (self.root / ".git").mkdir()

    def claim(self, index=0, **changes):
        args = dict(thread_id=THREADS[index], title="Fixture task", goal="Bounded fixture goal",
                    paths=["src"], actions=[], blocked_by=[], status="active", expected_revision=0,
                    user_approved_over_limit=False)
        args.update(changes)
        return state.claim_boundary(self.root, **args)

    def test_board_claim_warning_conflict_revision_release(self):
        first = self.claim(actions=["release"], title="<script>|inert")
        self.assertEqual(first["record"]["revision"], 1)
        second = self.claim(1, paths=["src/shared.py"])
        self.assertTrue(second["warnings"])
        self.assertEqual(state.list_board(self.root)["activeCount"], 2)
        with self.assertRaises(state.ClaimConflict):
            self.claim(2, actions=["release"])
        with self.assertRaises(state.BoardError):
            self.claim(expected_revision=0)
        rendered = (self.board / "CURRENT.md").read_text(encoding="utf-8")
        self.assertNotIn("<script>", rendered)
        self.assertIn("&lt;script&gt;", rendered)
        state.release_boundary(self.root, thread_id=THREADS[0], expected_revision=1, final_status="completed")
        self.assertEqual(state.list_board(self.root)["activeCount"], 1)
        receipts = list((self.board / "archive").glob("*.json"))
        self.assertEqual(len(receipts), 1)
        receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
        self.assertEqual(receipt["finalStatus"], "completed")
        self.assertNotIn("paths", receipt)

    def test_default_limit_identity_and_path_validation(self):
        for index in range(3):
            self.claim(index)
        with self.assertRaises(state.BoardError):
            self.claim(3)
        self.claim(3, user_approved_over_limit=True)
        self.assertEqual(state.list_board(self.root)["activeCount"], 4)
        for path in ["../outside", "C:/absolute", "src/*"]:
            with self.assertRaises(state.BoardError):
                self.claim(4, paths=[path], user_approved_over_limit=True)
        with self.assertRaises(state.BoardError):
            self.claim(4, thread_id="not-a-native-uuid", user_approved_over_limit=True)

    def test_disabled_and_malformed_board_fail_closed(self):
        marker = self.board / "project.yaml"
        marker.write_text(MARKER.replace("enabled: true", "enabled: false"), encoding="utf-8")
        with self.assertRaises(state.BoardError):
            self.claim()
        self.assertFalse((self.board / "active").exists())
        marker.write_text(MARKER, encoding="utf-8"); (self.board / "active").mkdir()
        (self.board / "active" / (THREADS[0] + ".json")).write_text('{"schemaVersion":1,"schemaVersion":2}', encoding="utf-8")
        with self.assertRaises(state.BoardError):
            state.list_board(self.root)

    def test_hooks_are_bounded_and_manual(self):
        self.claim()
        before = {str(f): f.read_bytes() for f in self.board.rglob("*") if f.is_file()}
        def hook(name, payload):
            result = subprocess.run([sys.executable, "-I", str(ROOT / "runtime/coordinator" / name)],
                                    input=json.dumps(payload), capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            return json.loads(result.stdout) if result.stdout else None
        start = hook("session_start.py", {"cwd": str(self.root)})
        self.assertIn("devsuite-planning", start["hookSpecificOutput"]["additionalContext"])
        stop = {"cwd": str(self.root), "session_id": THREADS[0], "hook_event_name": "Stop"}
        self.assertEqual(hook("stop_guard.py", stop)["decision"], "block")
        self.assertIsNone(hook("stop_guard.py", dict(stop, stop_hook_active=True)))
        self.assertIsNone(hook("stop_guard.py", dict(stop, session_id=THREADS[1])))
        self.assertEqual(before, {str(f): f.read_bytes() for f in self.board.rglob("*") if f.is_file()})
        self.assertFalse((ROOT / "hooks/hooks.json").exists())

    @unittest.skipUnless(shutil.which("git"), "Git is needed for the project lifecycle boundary")
    def test_lifecycle_dry_run_optout_and_reactivate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
            (root / "AGENTS.md").write_text("# Existing project instructions\n", encoding="utf-8")
            def operation(action, apply=False):
                return project.project_operation(argparse.Namespace(action=action, apply=apply,
                    project_root=str(root), project_id="fixture", project_name="Fixture", task_prefix="FX",
                    confirm_project_id="fixture", confirm_legacy_runtime_stopped=False))
            planned = operation("init")
            self.assertEqual(planned["status"], "planned")
            self.assertFalse((root / ".codex").exists())
            operation("init", True)
            self.assertEqual(state.list_board(root)["activeCount"], 0)
            self.assertIn("devsuite-planning", (root / "AGENTS.md").read_text(encoding="utf-8"))
            operation("deactivate", True)
            with self.assertRaises(state.BoardError):
                state.list_board(root)
            self.assertIn("Existing project instructions", (root / "AGENTS.md").read_text(encoding="utf-8"))
            operation("reactivate", True)
            self.assertEqual(state.list_board(root)["activeCount"], 0)

    @unittest.skipUnless(shutil.which("git"), "Git is needed for the migration boundary")
    def test_legacy_migration_preserves_history_and_disables(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
            board = root / ".codex/coordination"; board.mkdir(parents=True)
            legacy = """schema_version: 1
coordination_enabled: false
project_id: fixture
canonical_paths:
  current: .codex/coordination/CURRENT.md
  tasks: .codex/coordination/tasks
access:
  cross_project_task_access: false
  cross_project_state_changes: false
"""
            (board / "project.yaml").write_text(legacy, encoding="utf-8")
            (board / "tasks").mkdir()
            history = board / "tasks/FX-1.md"; history.write_text("Legacy record\n**Task status:** COMPLETE\n", encoding="utf-8")
            original = history.read_bytes()
            args = argparse.Namespace(action="migrate", apply=False, project_root=str(root),
                project_id=None, project_name=None, task_prefix=None, confirm_project_id="fixture",
                confirm_legacy_runtime_stopped=False)
            blocked = project.project_operation(args)
            self.assertFalse(blocked["readyToApply"])
            self.assertEqual((board / "project.yaml").read_text(encoding="utf-8"), legacy)
            args.confirm_legacy_runtime_stopped = True
            self.assertTrue(project.project_operation(args)["readyToApply"])
            args.apply = True; result = project.project_operation(args)
            self.assertEqual(result["status"], "applied")
            self.assertFalse(result["targetEnabled"])
            self.assertEqual((board / "project.schema-1.yaml").read_text(encoding="utf-8"), legacy)
            self.assertEqual(history.read_bytes(), original)
            self.assertEqual(list((board / "active").iterdir()), [])
            with self.assertRaises(state.BoardError):
                state.list_board(root)

    @unittest.skipUnless(shutil.which("git"), "Git is needed for legacy discovery adoption")
    def test_old_schema2_discovery_is_removed_exactly(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "--quiet", str(root)], check=True, capture_output=True)
            board = root / ".codex/coordination"; board.mkdir(parents=True)
            (board / "project.yaml").write_text(MARKER, encoding="utf-8")
            old = project.DISCOVERY_BLOCK.replace("`devsuite-planning`", "`codex-coordinator`")
            (root / "AGENTS.md").write_text("# Preserve me\n\n" + old + "\n", encoding="utf-8")
            args = argparse.Namespace(action="deactivate", apply=True, project_root=str(root),
                project_id=None, project_name=None, task_prefix=None, confirm_project_id="fixture",
                confirm_legacy_runtime_stopped=False)
            project.project_operation(args)
            remaining = (root / "AGENTS.md").read_text(encoding="utf-8")
            self.assertIn("# Preserve me", remaining)
            self.assertNotIn("load the installed", remaining)
```

## File: `tests/test_execution.py`

```python
import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from runtime.execution import process_plan, select_environment
from runtime.evidence import ContractError

class ExecutionTests(unittest.TestCase):
    def test_windows_plan_keeps_argv_and_does_not_claim_cpj_or_durability(self):
        request={'platform':'windows','argv':['python','a path/test.py','$(not-code)'],
                 'cwd':'C:/project with spaces','finite':True,'interactive':False}
        result=process_plan(request)
        self.assertEqual(result['backend'],'host-exec-session')
        self.assertEqual(result['argv'],request['argv'])
        for field in ['executed','executionAuthorized','survivesReboot','durabilityVerified','automaticCompletionDeliveryVerified']:
            self.assertFalse(result[field])
        request['lifetime']='detached'
        self.assertEqual(process_plan(request)['backend'],'windows-native-detached')
        request.update(platform='linux',cwd='/repo')
        self.assertEqual(process_plan(request)['backend'],'existing-cpj-posix')

    def test_process_rejects_shell_string_relative_or_interactive_work(self):
        base={'platform':'windows','argv':['python','test.py'],'cwd':'C:/repo','finite':True,'interactive':False}
        for key,value in [('argv','python test.py'),('argv',[]),('argv',[4]),('cwd','relative'),('interactive',True),('finite',False),('platform','guess')]:
            data=copy.deepcopy(base);data[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ContractError):process_plan(data)

    def test_ready_managed_configuration_and_connected_executor(self):
        cloud={'displayName':'Default environment','status':'ready','canRun':True,'environmentConfigId':'actual-config'}
        native={'displayName':'Computer','status':'connected','environmentId':'actual-executor'}
        original={'data':[cloud,native],'nextCursor':None}
        before=copy.deepcopy(original)
        discovery=select_environment(original)
        self.assertEqual(discovery['status'],'AMBIGUOUS')
        self.assertEqual(len(discovery['environments']),2)
        result=select_environment(original,'Default environment')
        self.assertEqual(result['environment']['environmentConfigId'],'actual-config')
        self.assertFalse(result['canExecute']);self.assertFalse(result['taskCreated'])
        self.assertFalse(result['environment']['costVerified'])
        result=select_environment(original,'computer')
        self.assertEqual(result['environment']['environmentId'],'actual-executor')
        self.assertTrue(result['environment']['requiresRemoteAbsoluteCwd'])
        self.assertEqual(original,before)

    def test_listing_preserves_runnable_and_unavailable_cloud_configurations(self):
        rows = [{'displayName': f'Cloud {i}', 'environmentConfigId': f'config-{i}',
                 'status': 'ready', 'canRun': i < 3} for i in range(5)]
        data = {'data': rows, 'nextCursor': None}
        result = select_environment(data, list_only=True)
        self.assertEqual(result['status'], 'LISTED')
        self.assertEqual([row['providerRunnable'] for row in result['environments']], [True, True, True, False, False])
        self.assertFalse(result['executionAuthorized'])
        self.assertFalse(result['taskCreated'])
        self.assertEqual(select_environment(data)['status'], 'AMBIGUOUS')
        self.assertEqual(select_environment(data, 'Cloud 4')['status'], 'UNAVAILABLE')
        self.assertEqual(select_environment(dict(data, nextCursor='more'), list_only=True)['status'], 'INCOMPLETE')
        with self.assertRaises(ContractError):
            select_environment({'data': [rows[0], dict(rows[4], displayName='cloud 0')]}, 'Cloud 0')
        self.assertEqual(select_environment({'data': [rows[0], rows[0]]})['status'], 'SELECTED')
        with self.assertRaises(ContractError):
            select_environment({'data': [rows[0], dict(rows[0], canRun=False)]})

    def test_no_offline_unknown_canrun_or_missing_id_selection(self):
        for entry in [{'status':'offline','environmentId':'x'},{'status':'ready','canRun':False,'environmentConfigId':'x'},
                      {'status':'ready','canRun':'true','environmentConfigId':'x'},{'status':'ready','canRun':True},
                      {'status':'unknown','canRun':True,'environmentConfigId':'x'}]:
            self.assertEqual(select_environment({'data':[entry]})['status'],'UNAVAILABLE')

    def test_pagination_empty_pages_and_ambiguous_names(self):
        self.assertEqual(select_environment({'data':[],'nextCursor':'next'})['status'],'INCOMPLETE')
        entry={'displayName':'same','status':'connected','environmentId':'real'}
        with self.assertRaises(ContractError):select_environment({'data':[entry,dict(entry,environmentId='other')]},'same')
        with self.assertRaises(ContractError):select_environment({'data':[None]})
        with self.assertRaises(ContractError):select_environment([])
        with self.assertRaises(ContractError):select_environment({'data':[],'nextCursor':[]})
        with self.assertRaises(ContractError):select_environment({'data':[{'displayName':None}]},'name')

    def test_cli_routing_preserves_ordinary_development_intent(self):
        spec=importlib.util.spec_from_file_location('execution_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={'Vis Codex Tasks miljøer':'devsuite-tasks','start a remote Codex task':'devsuite-tasks',
               'list my cloud environments':'devsuite-tasks','vis mine cloudmiljøer':'devsuite-tasks',
               'Find mine cloudmiljøer':'devsuite-tasks',
               'Find mine gemte Codex cloud-miljøer':'devsuite-tasks',
               'Vis alle gemte Codex-cloudmiljøer':'devsuite-tasks',
               'List all saved Codex cloud environments':'devsuite-tasks',
               'List my saved Codex Cloud configurations':'devsuite-tasks',
               'Vis de cloud-miljøer jeg har gemt':'devsuite-tasks',
               'Kan ikke logge ind i Cloud Environment':'devsuite-environment',
               'open the Cloud Environment desktop':'devsuite-environment',
               'Log ind i det eksisterende Cloud Environment':'devsuite-environment',
               'vis log for baggrundsjob':'devsuite-jobs','resume process job result':'devsuite-jobs',
               'test the Codex Tasks integration code':'devsuite-test',
               'fix the background job parser':'devsuite-implement','review this job launcher patch':'devsuite-review',
               'plan task ownership':'devsuite-planning'}
        for request,owner in cases.items():
            with self.subTest(request=request):self.assertEqual(cli.route(request)['skill'],owner)

    def test_cli_bad_json_containers_are_structured(self):
        with tempfile.TemporaryDirectory() as directory:
            data=Path(directory)/'input.json';data.write_text('[]',encoding='utf-8')
            for command in ['process-plan','task-environment']:
                result=subprocess.run([sys.executable,str(ROOT/'scripts/devsuite.py'),command,str(data)],capture_output=True,text=True,encoding='utf-8')
                self.assertEqual(result.returncode,1)
                self.assertEqual(json.loads(result.stdout)['status'],'ERROR')
                self.assertNotIn('Traceback',result.stderr)

    def test_explicit_execution_keeps_its_task_or_job_workload(self):
        spec=importlib.util.spec_from_file_location('execution_intent_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={
            'Start a remote Codex task to implement the feature':'devsuite-tasks',
            'Create a Codex Task to fix the login bug':'devsuite-tasks',
            'Please use Codex Tasks to test this project':'devsuite-tasks',
            'Opret en Codex-opgave til at rette loginfejlen':'devsuite-tasks',
            'Start a remote Codex task in the existing environment to implement the feature':'devsuite-tasks',
            'Run the tests as a background job':'devsuite-jobs',
            'Launch a background job to build and test the project':'devsuite-jobs',
            'Kør testene som baggrundsjob':'devsuite-jobs',
            'Kør testene i baggrunden':'devsuite-jobs',
            'Launch a background job from the project directory to build and test':'devsuite-jobs',
            'Start et baggrundsjob på denne computer og test projektet':'devsuite-jobs',
            'Kør et baggrundsjob fra projektmappen med test og build':'devsuite-jobs',
            'Run the unit tests for the Codex Tasks integration code':'devsuite-test',
            'Run the background job launcher tests':'devsuite-test',
            'Run the Codex Tasks integration tests':'devsuite-test',
            'Implement background job support':'devsuite-implement',
        }
        for request,owner in cases.items():
            with self.subTest(request=request):
                result=cli.route(request)
                self.assertEqual(result['skill'],owner)
                self.assertFalse(result['executionAuthorized'])
                self.assertFalse(result['externalActionAuthorized'])

    def test_negated_execution_does_not_select_a_task_or_job(self):
        spec=importlib.util.spec_from_file_location('execution_negation_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={
            'Do not start a remote task; review this patch':'devsuite-review',
            "Don't create a Codex Task. Test the integration code locally.":'devsuite-test',
            'Start ikke en Codex-opgave; gennemgå koden':'devsuite-review',
            'Kør ikke et baggrundsjob; gennemgå ændringerne':'devsuite-review',
            'Do not start a remote task to implement this':'devsuite',
            'Start a remote Codex task to test the project; do not change files':'devsuite-tasks',
        }
        for request,owner in cases.items():
            with self.subTest(request=request):
                result=cli.route(request)
                self.assertEqual(result['skill'],owner)
                self.assertFalse(result['executionAuthorized'])
                self.assertFalse(result['externalActionAuthorized'])

if __name__=='__main__':unittest.main()
```

## File: `tests/test_plan_consolidation.py`

```python
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
```

## File: `tests/test_practical_regressions.py`

```python
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
            ("Kør lintkontrol af projektet", "devsuite-review"),
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
```

## File: `tests/test_review_consolidation.py`

```python
"""Union guarantee for the consolidated devsuite-review skill.

The rules mirror Plugin-Skill-Studio's consolidation-check so DevSuite stays self-contained:
every source capability is covered by an existing file/anchor, merged into a covered entry,
or dropped with explicit approval; every snapshot file is represented; shared modes stay
byte-identical with Studio's studio-review.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from runtime.routing import route  # noqa: E402

CONSOLIDATION = ROOT / "references" / "consolidation"
MODES = ROOT / "skills" / "devsuite-review" / "modes"

def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def slug(text: str) -> str:
    return re.sub(r" ", "-", re.sub(r"[^a-z0-9 _-]", "", text.strip().lower()))

def anchors(path: Path) -> set[str]:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    found = {slug(m.group(1)) for m in re.finditer(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, re.M)}
    found.update(m.group(1) for m in re.finditer(r'<a\s+id="([^"]+)"', text))
    return found

def inside(rel: str) -> Path | None:
    full = (ROOT / rel).resolve()
    return full if full == ROOT.resolve() or full.is_relative_to(ROOT.resolve()) else None

def check_matrix(matrix: dict) -> list[str]:
    errors: list[str] = []
    by_id: dict[str, dict] = {}
    for entry in matrix["entries"]:
        if entry["id"] in by_id:
            errors.append(f"duplicate id: {entry['id']}")
        by_id[entry["id"]] = entry
    cache: dict[Path, set[str]] = {}
    for entry in matrix["entries"]:
        status = str(entry.get("status", "unmapped"))
        if status == "covered":
            target = entry.get("target")
            if not target:
                errors.append(f"target missing: {entry['id']}")
                continue
            file, _, anchor = target.partition("#")
            full = inside(file)
            if full is None:
                errors.append(f"escapes repository: {entry['id']}")
            elif not full.exists():
                errors.append(f"target missing: {entry['id']} -> {target}")
            elif anchor:
                if not full.is_file():
                    errors.append(f"anchor missing: {entry['id']} -> {target}")
                    continue
                cache.setdefault(full, anchors(full))
                if anchor not in cache[full]:
                    errors.append(f"anchor missing: {entry['id']} -> {target}")
        elif status.startswith("merged-with:"):
            other = by_id.get(status.split(":", 1)[1])
            if not other or other.get("status") != "covered":
                errors.append(f"bad merge: {entry['id']}")
        elif status == "dropped":
            if entry.get("approved") is not True or not str(entry.get("reason", "")).strip():
                errors.append(f"unapproved drop: {entry['id']}")
        else:
            errors.append(f"unmapped: {entry['id']}")
    for source in matrix.get("sources", []):
        snapshot = inside(source["snapshot"])
        if snapshot is None or not snapshot.is_file():
            errors.append(f"source unreadable: {source['id']}")
            continue
        for rel in read_json(snapshot)["files"]:
            key = f"{source['id']}/{rel}"
            if not any(e["source"] == key or e["source"].startswith(key + ":") for e in matrix["entries"]):
                errors.append(f"unrepresented source file: {key}")
    return errors

class ReviewConsolidationTests(unittest.TestCase):
    def test_shared_modes_match_hashes(self):
        pinned = read_json(CONSOLIDATION / "shared-review-modes.json")["files"]
        self.assertEqual(sorted(pinned), ["code-reviewer.md", "code.md", "decide.md", "receive.md", "request.md", "verify.md"])
        for name, digest in pinned.items():
            data = (MODES / name).read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)

    def test_shared_modes_have_no_package_links(self):
        for name in read_json(CONSOLIDATION / "shared-review-modes.json")["files"]:
            text = (MODES / name).read_text(encoding="utf-8")
            self.assertNotRegex(text, r"\]\(\.\./\.\./|studio-policy|policy\.md", name)

    def test_review_matrix_union(self):
        matrix = read_json(CONSOLIDATION / "review-matrix.json")
        self.assertEqual(check_matrix(matrix), [])
        self.assertGreater(len(matrix["entries"]), 250)

    def test_quality_routes_to_review_gate(self):
        for request in ("run the lint gate", "Kør lintkontrol af projektet", "run MegaLinter"):
            result = route(request)
            self.assertEqual((result["skill"], result["mode"]), ("devsuite-review", "gate"), request)

    def test_removed_triggers_route(self):
        matrix = read_json(CONSOLIDATION / "review-matrix.json")
        misses = []
        for entry in matrix["entries"]:
            target = entry.get("target") or ""
            if entry["kind"] != "trigger" or "skills/devsuite-review/SKILL.md#mode-" not in target:
                continue
            want = target.split("#mode-", 1)[1]
            result = route(entry["text"])
            if (result["skill"], result["mode"]) != ("devsuite-review", want):
                misses.append(f"{entry['id']}: got {result['skill']}/{result['mode']}, want devsuite-review/{want}")
        self.assertEqual(misses, [])

    def test_removed_skill_not_named(self):
        hits = []
        for folder in ("skills", "references", "runtime", "editors"):
            for file in (ROOT / folder).rglob("*"):
                if not file.is_file() or file.suffix not in {".md", ".py", ".json", ".cjs", ".yaml"}:
                    continue
                # Tests may name the removed skill to assert that it is absent from built packages.
                if CONSOLIDATION in file.parents or "__pycache__" in file.parts or file.name.startswith("test_"):
                    continue
                # Tests may name the removed skill to assert that it is gone.
                if file.name.startswith("test_"):
                    continue
                text = re.sub(r'<a id="[^"]*"></a>', "", file.read_text(encoding="utf-8", errors="ignore"))
                if "devsuite-quality" in text:
                    hits.append(str(file.relative_to(ROOT)))
        self.assertEqual(hits, [])

if __name__ == "__main__":
    unittest.main()
```

## File: `tests/test_runtime.py`

```python
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

    def test_saved_environment_discovery_accepts_a_list_only_tool_surface(self):
        catalog = read_json(ROOT / "references/provider-capabilities.json")
        observed = {"tools": ["mcp__codex_apps__codex_tasks_list_environments"]}
        listing = provider_check(observed, "codex-environment-list", catalog)
        self.assertTrue(listing["toolNamesPresent"])
        self.assertFalse(listing["canExecute"])
        self.assertFalse(listing["authenticationVerified"])
        self.assertEqual(provider_check(observed, "codex-tasks", catalog)["status"], "UNAVAILABLE")

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
```
