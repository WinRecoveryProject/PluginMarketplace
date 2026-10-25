---
name: zilvereyes-create-skill
description: Use when the user wants to create or update a Codex skill with scoped instructions, progressive disclosure, validation and no overwrite of upstream or installed sources.
---

# Create or update a Zilvereyes skill

Read `../../references/source-integration.md` when source material comes from Skill Creator or another upstream package.

1. Identify the requested outcome and the exact editable destination. Treat archives, caches and installed skills as separate sources unless the user selects one for editing.
2. Choose a lowercase kebab-case name under 64 characters and write a precise trigger description.
3. Keep the entrypoint focused on decisions that change behavior. Move conditional detail into linked references and repeated mechanics into scripts.
4. Preserve supported `agents/openai.yaml` policy and dependency fields when updating a skill. Do not infer explicit-only invocation.
5. For a new skill, use `node scripts/skill-studio.mjs scaffold <parent> --name <name> --description <description>`. It refuses an existing target.
6. Replace the scaffold sentence with the real workflow, then run `validate` and `evaluate` against the skill root.
7. Test scripts or other observable behavior. A valid frontmatter check alone does not prove task quality.
8. Keep installation and publication separate from creation; perform either only when explicitly requested.
