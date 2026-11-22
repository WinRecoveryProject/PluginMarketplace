---
name: skill-autoresearch
description: "Improve an existing code skill (Lua, PowerShell, etc.) by measuring it on locked test tasks with command checks, then keeping only changes that raise the pass count. Use when asked to auto-research, benchmark or measurably improve a Claude Code skill. Usage: /skill-autoresearch <skill-name | plugin:skill | path>"
argument-hint: <skill-name | plugin:skill | path>
---

# skill-autoresearch

Improve a code skill with real measurement: locked test tasks, each with a local command check (exit 0 = pass). Decisions to keep or discard a change come from pass counts, never from self-assessment.

Spec: `~/.claude/skill-autoresearch/docs/specs/2026-11-19-skill-autoresearch-design.md`.

## Rules

- Never edit the target skill. Work only in the run data folder `DATA = ~/.claude/skill-autoresearch/<skill-name>/`.
- Use the Bash tool for all commands below.
- Check commands must not use the network.
- Status: phases 1–3 are implemented. After phase 3, stop and report the baseline (phases 4–6 are not implemented yet).

## Phase 1 – Find and copy the skill

Resolve `$ARGUMENTS` in this order; stop at the first hit:

1. A path to `SKILL.md` or to a folder containing it.
2. `~/.claude/skills/<name>/SKILL.md`
3. `.claude/skills/<name>/SKILL.md` (current project)
4. `<plugin>:<skill>` – find installed plugins whose manifest has that name, then their `skills/<skill>/SKILL.md`:
   ```bash
   P='<plugin>'; S='<skill>'
   find ~/.claude/plugins ~/AppData/Roaming/Claude/rpm -maxdepth 6 -path '*/.claude-plugin/plugin.json' 2>/dev/null |
   while IFS= read -r m; do
     grep -q "\"name\": *\"$P\"" "$m" && ls "$(dirname "$(dirname "$m")")/skills/$S/SKILL.md" 2>/dev/null
   done | sort -u
   ```

If nothing matches, or more than one path matches, show the candidates and ask the user to pick. Do not guess.

Then set `<skill-name>` to the skill folder name and copy fresh:
```bash
SRC='<skill folder>'; DATA=~/.claude/skill-autoresearch/'<skill-name>'
mkdir -p "$DATA" && rm -rf "$DATA/original" "$DATA/work" && cp -r "$SRC" "$DATA/original" && cp -r "$SRC" "$DATA/work"
```
Note whether `SRC` is in a plugin cache (path contains `/.claude/plugins/` or `/AppData/Roaming/Claude/rpm/`); phase 6 needs it.

Show: target name, source path, plugin cache yes/no, `SKILL.md` line count.

## Phase 2 – Propose and lock test tasks

Format: see [references/tasks-format.md](references/tasks-format.md).

**Reuse:** If `DATA/tasks.json` and `DATA/tasks.lock` exist, verify the lock (below). If it matches, reuse the tasks and skip to the end of phase 2. If it does not match, stop and ask the user: make new tasks, or abort.

**Propose:**
1. Read `work/SKILL.md` and its references. Propose 5–8 tasks, each tied to one concrete instruction in the skill (`targets`). Write each fixture under `DATA/fixtures/<fixture>/`.
2. Run every check on an untouched copy of its fixture. Use one copy command and one check command per task; write the literal `DATA` path. Never put `rm` in the same command as `bash -c` (Claude Code's safety check blocks it):
   ```bash
   mkdir -p '<DATA>/tmp/<id>' && cp -r '<DATA>/fixtures/<fixture>/.' '<DATA>/tmp/<id>'
   (cd '<DATA>/tmp/<id>' && timeout <timeout_s> bash -c '<check>' 2>&1); echo "exit=$?"
   ```
   - `exit=0`: task is too easy. Discard it and say so.
   - `exit=127`, or output says `command not found`: the check tool is missing. Fix the check or tell the user; do not keep the task.
   - `exit=124`: the check timed out. Raise `timeout_s` or fix the check.
   - Any other non-zero exit: valid.

   When all checks are done, clear the copies in a separate command: `rm -rf '<DATA>/tmp'`.
3. If fewer than 5 valid tasks remain, ask the user whether to continue.
4. Show every task (id, prompt, check, targets) and wait for approval. Apply the user's edits; re-run step 2 for changed tasks.

**Lock (only after approval):** write `DATA/tasks.json`, then:
```bash
cd "$DATA" && { sha256sum tasks.json; find fixtures -type f -print0 | sort -z | xargs -0 -r sha256sum; } > tasks.lock
```

**Verify lock** (also before every later experiment):
```bash
cd "$DATA" && { sha256sum tasks.json; find fixtures -type f -print0 | sort -z | xargs -0 -r sha256sum; } | diff -q - tasks.lock >/dev/null && echo LOCK_OK || echo LOCK_MISMATCH
```
`LOCK_MISMATCH` means tasks or fixtures changed (edited, added or removed files): stop.

## Phase 3 – Estimate, approval and baseline

**Estimate.** With `N` tasks and `E` experiments, agent runs = `N×2` (baseline) + `N` (no skill) + `2` (research) + `E×N×2` (experiments). Default `E` = 5. Show the formula with numbers and ask the user to approve a maximum `E`. Ask separately whether research may use web search. Do nothing more until approved; never exceed the approved `E`.

**Run one task** (label `<run>` = `<version>-<id>-<n>`, e.g. `base-metadata-fallback-1`; version is `base`, `noskill` or `expN`):

1. Copy the fixture (literal paths):
   ```bash
   mkdir -p '<DATA>/tmp/<run>' && cp -r '<DATA>/fixtures/<fixture>/.' '<DATA>/tmp/<run>'
   ```
2. Start a `general-purpose` agent with this prompt (omit the `<skill>` block for `noskill`; for other versions include `work/SKILL.md` and every file under `work/references/`):
   ```
   You are completing a coding task. Follow the skill below as your instructions.
   <skill>
   ...skill files, each preceded by its relative path...
   </skill>
   Task: <prompt>
   Work only inside this folder: <absolute Windows path of DATA/tmp/<run>>
   Do not read or change files anywhere else. Do not use the network.
   When done, reply with one short paragraph saying what you changed.
   ```
   Run up to 4 agents at a time.
3. When the agent is done, run the check yourself. The agent's own claim of success does not count:
   ```bash
   (cd '<DATA>/tmp/<run>' && set -o pipefail && timeout <timeout_s> bash -c '<check>' 2>&1 | tail -n 20); echo "exit=$?"
   ```
   Keep `set -o pipefail`: without it the exit code is `tail`'s and is always 0.

**Outcome of one run:**
- `exit=0`: pass.
- Agent errored, stopped, or never finished: fail. Do not run the check.
- `exit=124` (check timeout) or any other non-zero exit: fail.
- `exit=127` or `command not found`: the check tool is missing. Stop the whole phase and report it. This is not a fail; a missing tool would make the score wrong.

**Integrity.** After each batch, verify the lock (phase 2) and that `work/` still matches `original/` for the baseline (`diff -rq '<DATA>/original' '<DATA>/work'`). On a mismatch, stop: an agent wrote outside its folder.

**Score** = passes ÷ (runs). Baseline: every task 2 times with `work/` → `base` score out of `N×2`. Control: every task 1 time without skill → `noskill` score out of `N`.

**Log.** Append to `DATA/log.md` (create it if missing) a section headed with today's date:
```
## <YYYY-MM-DD> – run
Baseline: <base>/<N×2>   No skill: <noskill>/<N>   SKILL.md lines: <count>
| run | result | check output (last lines) | agent summary |
```
One table row per run. Keep failed runs' check output and agent summary: phase 4 uses them.

When the batch is finished, clear the copies in a separate command: `rm -rf '<DATA>/tmp'`.
