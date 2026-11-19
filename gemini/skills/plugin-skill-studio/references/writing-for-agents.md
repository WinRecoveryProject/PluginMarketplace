# Skill: writing-for-agents

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/writing-for-agents/SKILL.md`

> Author and refine agent-facing instructions, skills, AGENTS.md files, and context pointers. Use when creating new agent skills, optimizing prompt guidelines, writing steerable docs, or organizing progressive disclosure — even if the user says "write a skill for this". Do NOT use for human-facing marketing copy.

## Instructions

Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.

### Writing for Agents

Author and refine documents an agent consumes: a Skill, an `AGENTS.md` / `CLAUDE.md`, or a document reached by a context pointer. The packaging differs; the writing principles do not.

---

#### Core Invariants

1. **The 10 Authoring Principles**: Adhere strictly to pre-flight checks, zero process in descriptions, MOC architecture (< 500 lines), TWI clarity, inline checklists, one term per concept, zero hardcoded secrets, and matching form to failure.
2. **Context Load vs. Cognitive Load**: Inline what every branch needs; push behind context pointers what only some branches reach.
3. **Front-Loaded Leading Words**: Recruit model priors with precise tokens (*tight*, *red*, *tracer bullets*) rather than lengthy re-explanations.
4. **Observable Completion Criteria**: Every step must conclude on a checkable, exhaustive completion bound to prevent premature victory declaration.
5. **Zero Process in Descriptions**: Descriptions define triggering boundaries (`Use when...`, `Do NOT use for...`), never workflow recipes.

---

#### Architecture & Map of Content (MOC)

```
[ Context Pointer / Description ] ──► [ SKILL.md: Map of Content ] ──► [ Disclosed References / Scripts ]
```

| Domain | Key Mechanism | Reference |
|---|---|---|
| **Context Pointers** | Trigger condition + branch definition | `references/pointers.md` |
| **Information Hierarchy** | In-file step → In-file reference → Disclosed reference | `SKILL-MECHANICS.md` |
| **Progressive Disclosure** | Keep `SKILL.md` < 500 lines; push heavy specs out | `skill-conductor` |
| **Skill Lifecycle** | Draft → Test → Review → Improve → Package | `skill-conductor` |

---

#### The Information Hierarchy

A document is built from **steps** (ordered actions) and **reference** (definitions and rules):

1. **In-file step**: The primary tier — what the agent does, in order.
2. **In-file reference**: Consulted on demand; short tables or checklists co-located with steps.
3. **Disclosed reference**: Pushed into a separate file reached by a pointer, loaded only when that branch fires.

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Design Context Pointers & Trigger Boundaries
- **Action**: Draft the pointer with front-loaded leading words, distinct trigger branches, and explicit negative exclusions.
- **Key Point**: Never put workflow steps inside the pointer or description.
- **Why**: When process steps appear in the description, models follow them and skip the detailed body.

##### Step 2: Structure the Body as a Map of Content
- **Action**: Organize the main markdown file as an executive map with concise headings, TWI steps, and inline checklists.
- **Key Point**: Keep the main file under 500 lines; disclose deep schemas into reference files.
- **Why**: Attention thins across overly long documents, causing instructions to be skipped.

##### Step 3: Define Checkable Completion Bounds
- **Action**: Conclude every procedure with an unambiguous completion criterion.
- **Inline Checklist**:
  - [ ] Frontmatter name is kebab-case and matches folder
  - [ ] Description has positive triggers and negative exclusions (`Do NOT use for...`)
  - [ ] Main document is under 500 lines
  - [ ] No hardcoded secrets, API tokens, or user home paths
- **Why**: Clear bounds prevent premature step termination and unverified assumptions.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll list the steps in the description so it triggers better."* | **Forbidden: descriptions define triggers, not steps.** | Models execute the summary description and skip the detailed body instructions. |
| *"More documentation is always better."* | **Prune aggressively: ruthlessly eliminate no-ops.** | Excess lines dilute attention and increase cognitive and context load. |
| *"I can use 'MUST' in all caps instead of explaining why."* | **Explain the reasoning (TWI: Action, Key Point, Why).** | Explaining why produces robust generalization; rigid prohibitions invite prompt injection. |
| *"Keep everything in one file for convenience."* | **Progressive disclosure: disclose heavy references.** | Single-file sprawl degrades context efficiency and task focus. |

## Bundled files

### File: `SKILL-MECHANICS.md`

#### Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill (frontmatter, the invocation choice, and router skills). Everything else about writing it is the universal reference in `SKILL.md`.

##### Invocation

Two choices, trading the two loads:

- A **model-invoked** skill keeps a `description`, so the agent can fire it autonomously, and other skills can reach it. You can still type its name: model-invocation always _includes_ user reach; a description only ever adds agent discovery, never removes the human's. The description is the skill's top-level context pointer, forced to stay loaded at all times: permanent context load in exchange for discoverability. A model-invoked skill whose content is all reference is also one home for shared reference: another skill can invoke it, so reference needed by several skills lives in one place. Mechanics: omit `disable-model-invocation`, and write a model-facing description carrying the trigger branches (the pointer-writing rules in `SKILL.md` apply in full).
- A **user-invoked** skill strips the description from the agent's reach: only the human typing its name can invoke it, and no other skill can. Zero context load, but it spends cognitive load: you are the index that must remember it exists. Mechanics: set `disable-model-invocation: true`; the `description` becomes human-facing: a one-line summary, trigger lists stripped.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. If it only ever fires by hand, make it user-invoked and pay no context load.

Shared reference that two user-invoked skills both need can live in neither: with no descriptions, neither can fire the other. Push it to a plain file outside the skill system: external reference any skill can point at.

##### Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own (a trigger word you actually use in your prompts), or another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

##### Router skills

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one user-invoked skill that names the others and when to reach for each, so the human has one skill to remember instead of many. It can only hint, never fire them: user-invoked skills have no description, so nothing but the human can reach them.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Writing for Agents"
  short_description: "Write documents agents consume"
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
