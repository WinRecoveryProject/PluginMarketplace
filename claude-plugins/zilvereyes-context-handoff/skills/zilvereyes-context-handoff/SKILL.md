---
name: zilvereyes-context-handoff
description: Use when the user wants to checkpoint an in-progress task or carry its goal, decisions, evidence and remaining work into a new Claude conversation.
---

# Zilvereyes Context Handoff

Use the current task and authorized workspace as sources. Wait for any in-progress edit, test, build, or upload to reach a safe stopping point. Collect the exact workspace and repository revision when available, the user-approved goal and acceptance criteria, the evidence already collected, unresolved checks and the next action. Preserve the user's reply language and explicit decisions. Omit credentials, tokens, personal information unrelated to the task, and full logs.

Create a new Markdown packet at an authorized destination using the included helper. Use the host's existing Python 3 command, commonly `python` on Windows and `python3` elsewhere. Pass the absolute path to `scripts/context_handoff.py` from this skill directory.

```text
python3 "<skill-directory>/scripts/context_handoff.py" template --output "<packet-path>"
python3 "<skill-directory>/scripts/context_handoff.py" validate "<packet-path>"
```

Between these commands, change the template title to `Claude Context Handoff` and fill out each section. Name the evidence behind each verified claim, identify remaining unknowns, and choose one focused check that detects a wrong workspace or stale artifact. Use `unknown` for unavailable task state. The validator checks the packet structure. Verify technical claims against the source material or actual test results.

Return the packet for the user to use in a destination conversation. Keep the source conversation and work intact. This workflow uses only the helper's `template` and `validate` commands.
