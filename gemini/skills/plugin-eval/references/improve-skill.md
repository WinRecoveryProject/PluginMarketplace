# Skill: improve-skill

- Plugin: `plugin-eval` (0.1.3)
- Source: `plugins/plugin-eval/skills/improve-skill/SKILL.md`

> Turn plugin-eval findings into a concrete rewrite brief for a Codex skill. Use when the user already evaluated a skill and now wants Codex to improve it, especially after asking what to fix first.

## Instructions

### Improve Skill

Use this skill after `plugin-eval` has already produced findings for a local skill.

#### Workflow

1. Run `plugin-eval analyze <skill-path> --brief-out <brief.json>`.
2. Read the improvement brief and group work into required fixes versus recommended fixes.
3. Apply the `skill-creator` guidance from `/Users/benlesh/.codex/skills/skill-creator/SKILL.md`.
4. Re-run the evaluation and compare before and after outputs.

#### Chat Requests To Recognize

- `Improve this skill based on the evaluation.`
- `Rewrite this skill using the plugin-eval findings.`
- `What should I fix first in this skill?`

#### Focus Areas

- reduce trigger and invoke token costs
- keep `SKILL.md` compact
- move bulky details into references or scripts
- improve trigger descriptions
- fix broken links and manifest/frontmatter issues

#### Commands

```bash
plugin-eval analyze <skill-path> --brief-out ./skill-brief.json
plugin-eval compare before.json after.json
```

#### Reference

- `../../references/chat-first-workflows.md`

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Improve Skill"
  short_description: "Turn plugin-eval findings into a rewrite brief"
```
