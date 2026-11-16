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
