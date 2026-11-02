# Finite process execution on Windows

Codex Process Jobs 0.5.1 explicitly rejects win32. Its POSIX process groups and
IPC notification transports must not be treated as working Windows features.
Do not weaken its platform guard or silently launch it through another shell.

## Host-managed work

For an ordinary finite command, prefer the host's execution tool with an explicit
working directory and bounded initial yield. Record the returned session handle.
Resume that exact handle using the host's stdin/status tool. An observation timeout
does not mean failure and never justifies starting a duplicate process. Use actual
exit status and output as evidence. This is host-session tracking, not a promise
that the workload survives host exit, reboot or a machine crash.

## Deliberately detached native work

Only when the task needs it and already authorizes the workload, use a reviewed
foreground script through PowerShell Start-Process with WindowStyle Hidden. Pass
arguments as arguments, never concatenate untrusted strings into shell code.
Use exact output/error paths in the task's private scratch directory. The payload
must write its final result and exit status; a PID by itself cannot prove success.
Never put credentials in command lines or logs.

Persist PID, Win32_Process CreationDate, executable identity and the exact intended
script path. Check that same live process identity before monitoring or cancelling.
Do not signal a reused PID, guess a process tree or stop unrelated descendants.
If the host has no supported way to stop the exact workload safely, record that
limitation instead of broad taskkill commands. Resume from an existing result or
verified live process; do not restart merely because a desktop session ended.

Detached native processes can survive a client exit; they do not survive a reboot
or power loss. Do not claim automatic Codex notifications or a CPJ job ID for this
route. An explicitly active Goal can inspect the exact handle on continuation;
otherwise return its private result path and the actual lifecycle limitation.

## Permissions and scope

Existing authorization remains valid. A platform mismatch is not a reason to ask
for the same consent again, create another chat, install a plugin, change global
configuration or expand permissions. If a required new action genuinely needs
approval, prepare the concrete result first and ask only for that action. Continue
independent authorized work. Never execute a reviewed plugin merely to assess it.
