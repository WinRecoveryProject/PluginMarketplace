"""Owned process/task planning; never launches commands or remote tasks."""
from __future__ import annotations

from pathlib import PurePosixPath, PureWindowsPath
from runtime.evidence import ContractError


def _text(value, label):
    if not isinstance(value, str) or not value.strip() or len(value) > 20000:
        raise ContractError(f"Invalid {label}")
    if any(ord(c) < 32 for c in value):
        raise ContractError(f"Control character in {label}")
    return value


def process_plan(request):
    if not isinstance(request, dict):
        raise ContractError("Process request must be an object")
    platform = request.get('platform')
    if platform not in {'windows', 'linux', 'macos'}:
        raise ContractError("platform must be windows, linux or macos")
    argv = request.get('argv')
    if not isinstance(argv, list) or not argv:
        raise ContractError("argv must be a nonempty array; shell strings are not accepted")
    for arg in argv:
        if not isinstance(arg, str) or '\x00' in arg or len(arg) > 20000:
            raise ContractError("Invalid argv element")
    _text(argv[0], 'executable')
    cwd = _text(request.get('cwd'), 'cwd')
    path = PureWindowsPath(cwd) if platform == 'windows' else PurePosixPath(cwd)
    if not path.is_absolute():
        raise ContractError("cwd must be absolute for the selected machine")
    if request.get('interactive') is not False or request.get('finite') is not True:
        raise ContractError("Only explicitly finite, noninteractive workloads are supported")
    lifetime = request.get('lifetime', 'host-session')
    if lifetime not in {'host-session', 'detached'}:
        raise ContractError("Unknown process lifetime")
    windows = platform == 'windows'
    backend = 'host-exec-session' if lifetime == 'host-session' else 'windows-native-detached' if windows else 'existing-cpj-posix'
    return {'status': 'PLANNED', 'backend': backend, 'platform': platform,
            'argv': argv, 'cwd': cwd, 'executed': False, 'executionAuthorized': False,
            'requiresReviewedForegroundPayload': True,
            'resume': 'reuse exact returned host session' if lifetime == 'host-session' else 'verify existing process/job identity and result before any launch',
            'cancellation': 'exact owned handle/identity only; critical jobs require explicit cancellation authority',
            'survivesReboot': False, 'automaticCompletionDeliveryVerified': False,
            'durabilityVerified': False,
            'limitation': 'Windows CPJ POSIX controller is unsupported; native detached work needs a reviewed result/exit receipt' if windows else 'POSIX detached lifecycle requires the existing verified CPJ controller; a plan is not a job'}


def select_environment(inventory, requested_name=None):
    """Select only actual connected executors or runnable managed configurations.

    A paginated snapshot must be complete. Identifiers are returned as data, never
    synthesized. canRun is a provider capability, not permission or free quota.
    """
    if not isinstance(inventory, dict) or not isinstance(inventory.get('data'), list):
        raise ContractError("Environment inventory must contain a data array")
    if inventory.get('nextCursor') is not None and not isinstance(inventory['nextCursor'], str):
        raise ContractError("Environment cursor must be text or null")
    if inventory.get('nextCursor'):
        return {'status': 'INCOMPLETE', 'reason': 'Read remaining environment pages first', 'canExecute': False}
    if requested_name is not None:
        _text(requested_name, 'requested environment name')
    selected = []
    for entry in inventory['data']:
        if not isinstance(entry, dict):
            raise ContractError("Environment entry must be an object")
        if 'displayName' in entry and not isinstance(entry['displayName'], str):
            raise ContractError("Environment display name must be text")
        if requested_name is not None and entry.get('displayName', '').casefold() != requested_name.casefold():
            continue
        native = entry.get('status') == 'connected' and isinstance(entry.get('environmentId'), str) and bool(entry['environmentId'].strip())
        cloud = entry.get('canRun') is True and entry.get('status') == 'ready' and isinstance(entry.get('environmentConfigId'), str) and bool(entry['environmentConfigId'].strip())
        if native or cloud:
            key = 'environmentId' if native else 'environmentConfigId'
            selected.append({'kind': 'connected-executor' if native else 'managed-configuration',
                             key: entry[key], 'displayName': entry.get('displayName'),
                             'requiresRemoteAbsoluteCwd': native, 'costVerified': False})
    if not selected:
        return {'status': 'UNAVAILABLE', 'reason': 'No matching connected executor or ready runnable configuration', 'canExecute': False}
    if requested_name is not None and len(selected) != 1:
        raise ContractError("Environment name is ambiguous; use a verified exact target")
    return {'status': 'SELECTED', 'environment': selected[0], 'canExecute': False,
            'taskCreated': False, 'executionAuthorized': False,
            'requiresExplicitTaskRequest': True,
            'requiresIncludedZeroCostVerification': True}
