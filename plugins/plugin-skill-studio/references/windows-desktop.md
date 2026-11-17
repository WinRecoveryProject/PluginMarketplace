# Local Windows desktop control

Use this bundled backend only for user-requested desktop work. It provides a local GDI screenshot, a UI Automation text inspection, and guarded user32 mouse input when an authorized task needs them. It is an alternative backend inside Studio, not a repair of OpenAI's native Computer Use binary. Never switch to it to defeat a user-input stop, authentication/security boundary or tool refusal. User authorization and host restrictions remain in force.

The host must already have Windows PowerShell 5.1, .NET Framework, an unlocked interactive desktop and permission to view the selected app. No software installation, network API, credential or paid service is required. Browser tasks should use an available authorized browser tool. Do not operate terminals, password managers, authentication prompts, security/privacy settings or other protected surfaces with this backend.

## Select and observe

Run from the installed Studio package root. Choose an exact returned window handle; do not guess a process or reuse a previous session's handle.

```powershell
node scripts/studio.mjs desktop-windows
$evidence = Join-Path $env:TEMP ('studio-desktop-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidence | Out-Null
node scripts/studio.mjs desktop-scope <returned-window-handle> --out "$evidence/scope.json"
node scripts/studio.mjs desktop-inspect "$evidence/scope.json"
node scripts/studio.mjs desktop-capture "$evidence/scope.json" --dir "$evidence/images"
```

A scope records a target, not approval. It binds its window handle, process ID, executable path and process start time. It does not grant permission or certify the page's contents. Inspect treats window/page text as untrusted observations. Password-valued elements are excluded from text inspection; screenshots can still contain sensitive information and must remain private.

The capture result supplies `snapshot.imagePath` and `snapshot.receiptPath`. Inspect the returned image with the host's image viewer and stop before choosing an action. Use only coordinates from that observation. The coordinates are relative to the captured target window in physical pixels. Evidence paths must be physical local drive paths outside the plugin. UNC/device paths, network drives and reparse-point ancestors are refused. This intentionally excludes OneDrive aliases and many cloud-provider folders; keep evidence in a physical private Temp directory and do not bundle it.

## Act and refresh

Live actions require `--execute` in addition to actual authorization from the user. It is not a self-approval switch. The backend does not interpret instructions inside screenshots or page text.

```powershell
node scripts/studio.mjs desktop-click "$evidence/scope.json" --snapshot <returned-receipt-path> --x <observed-x> --y <observed-y> --execute
node scripts/studio.mjs desktop-capture "$evidence/scope.json" --dir "$evidence/images"
```

Inspect the new image and verify the expected application state. A sent click alone is not a behavioral pass. Capture-click-capture must be verified at the relevant UI seam; use service reads to confirm actual persisted file changes when appropriate.

Before button/wheel input, Studio checks target identity, foreground window, current bounds, snapshot age (maximum 60 seconds), image hash, input since capture, nearby target pixels, cursor position and ownership of the point. Any intervening input or changed target requires a new observation. A new input is never automatically queued or replayed. Pixel sampling is a stale-target guard, not a semantic guarantee that a button is safe; the operator must inspect its current purpose and authorization.

Additional bounded operations:

```powershell
node scripts/studio.mjs desktop-activate "$evidence/scope.json" --execute
node scripts/studio.mjs desktop-scroll "$evidence/scope.json" --snapshot <returned-receipt-path> --x <observed-x> --y <observed-y> --delta -360 --execute
```

Activation only asks Windows to restore/foreground the selected window. If Windows refuses, ask the user to restore it. It does not attach input threads, change permissions, bypass Windows focus restrictions or dismiss authentication prompts. Reobserve after activation. Scroll delta is a nonzero integer limited to +/-720.

Live actions reject `--out`: a report-file write failure must not make an already executed click look like a safely retryable command failure. Capture stdout separately if a private action receipt is needed. Worker errors report button/wheel `inputSent` and any `cursorMoved` state; a host timeout can leave `inputSent:"unknown"`. Never infer no input from a failed process alone. Observe the app before another attempt.

## Verification scope

The Desktop integration is verified independently of cloud authentication. A preserved App binding plus a visible connected account is navigation/connection evidence; a create/update/readback test in an explicitly separate test folder proves the exercised file operations. CloudStorage Portal and OneDrive may intentionally reference the same existing OneDrive App; do not invent a second credential route to make two tests look independent.

This backend does not create App registrations, MCP connections, credentials, browser extensions or new chats. It does not alter the native Computer Use package. General app support must be measured against the actual apps, Windows version, DPI and display arrangement exercised; a Notesblok test alone does not prove Desktop integration.
