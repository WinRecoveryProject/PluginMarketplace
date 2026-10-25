---
name: zilvereyes-evaluate-plugin
description: Use when the user asks to audit, score, compare or improve a plugin or skill while retaining every source and reporting blocking findings separately from quality scores.
---

# Evaluate a plugin or skill

Read `../../references/evaluation-rubric.md` before interpreting a score.

1. Resolve whether the target is a plugin root or a skill directory.
2. For a plugin, run `node scripts/plugin-studio.mjs validate <plugin-root>` and `evaluate`.
3. For a skill, run `node scripts/skill-studio.mjs validate <skill-root>` and `evaluate`.
4. Report blocking errors first, then warnings and strengths.
5. Identify the strongest and weakest skill explicitly when more than one skill exists.
6. Treat missing live App, MCP, OAuth, host selection, benchmark or installation evidence as unknown, not failure and not success.
7. Compare candidates without replacing either directory; explain identity, version, budget and component differences.
8. Recommend a new derived package name when the source is upstream or same-name installation would collide.
9. Never uninstall, delete or rewrite the evaluated source as part of evaluation.
