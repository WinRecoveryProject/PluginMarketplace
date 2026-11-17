"""Exercise the public script through direct -File and pipeline in both PS hosts."""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

scanner = Path(__file__).resolve().parents[1] / 'scripts/Test-PowerShellWorkbenchAutomaticVariables.ps1'


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


with tempfile.TemporaryDirectory(prefix='wrp-protected-cli-') as directory:
    root = Path(directory)
    bad = root / 'protected.ps1'
    other = root / 'other.ps1'
    good = root / 'safe.ps1'
    bad.write_text('$home = "controlled-fixture"\n', encoding='utf-8')
    other.write_text('$script:PID = 1\n', encoding='utf-8')
    good.write_text('$homeEntry = "safe"\n', encoding='utf-8')
    receipts = []
    for host in ['powershell.exe', 'pwsh.exe']:
        executable = shutil.which(host)
        assert executable, f'Required test host unavailable: {host}'
        cases = [
            ('bad-file', ['-File', str(scanner), '-Path', str(bad), '-AsJson'], 1, 1),
            ('good-file', ['-File', str(scanner), '-Path', str(good), '-AsJson'], 0, 0),
            ('nothrow-file', ['-File', str(scanner), '-Path', str(bad), '-AsJson', '-NoThrow'], 0, 1),
            ('pipeline', ['-Command', f'{quote(bad)}, {quote(other)} | & {quote(scanner)} -AsJson -NoThrow'], 0, 2),
            ('path-array', ['-Command', f'& {quote(scanner)} -Path @({quote(bad)}, {quote(other)}) -AsJson -NoThrow'], 0, 2),
        ]
        for name, args, expected_exit, expected_count in cases:
            result = subprocess.run([executable, '-NoLogo', '-NoProfile', '-NonInteractive', *args],
                                    input='', capture_output=True, text=True, encoding='utf-8', errors='replace')
            data = json.loads(result.stdout)
            assert result.returncode == expected_exit, (host, name, result.returncode, result.stderr)
            assert len(data['Diagnostics']) == expected_count, (host, name, data)
            assert data['Passed'] is (expected_count == 0), (host, name, data)
            receipts.append({'host': host, 'case': name, 'exitCode': result.returncode, 'diagnostics': expected_count})
    print(json.dumps({'status': 'PASS', 'cases': receipts}, indent=2))
