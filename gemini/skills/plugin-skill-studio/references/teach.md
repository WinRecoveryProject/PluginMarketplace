# Skill: teach

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/teach/SKILL.md`

> Teach a technical concept interactively using the workspace as an active learning lab with durable learning records. Use when the user asks to understand a codebase concept, learn a language feature, explore design patterns, or practice coding skills — even if they say "explain how this works to me". Do NOT use for silent autonomous code generation.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#not-embedded); never load companion plugins.

### Teach

Transform the current workspace into an interactive, stateful learning laboratory producing structured HTML lessons, reference materials, primary source bibliographies, and progressive learning records.

---

#### Core Invariants

1. **Mission-Grounded Curriculum**: Every lesson, quiz, and exercise must directly anchor to `MISSION.md` (the learner's explicit real-world objective).
2. **Desirable Difficulty & Retrieval**: Target long-term storage strength through effortful retrieval, spaced practice, and interleaved exercises over fleeting in-the-moment fluency.
3. **Beautiful HTML Artifacts**: Lessons are rendered as self-contained, publication-grade HTML documents in `./lessons/000X-<name>.html` styled via shared assets (`./assets/style.css`).
4. **Durable Learning Records**: Capture key insights, non-obvious breakthroughs, and mental model shifts in `./learning-records/000X-<name>.md` to maintain the Zone of Proximal Development (ZPD).
5. **Primary-Source Grounding**: Never rely purely on model memory; cite and link verified primary sources in `RESOURCES.md` and inline lesson annotations.

---

#### Architecture & Map of Content (MOC)

```
[ Learner Request / Mission ] ──► [ Assess ZPD via Learning Records ] ──► [ Build HTML Lesson & Quizzes ] ──► [ Record Progress in Learning Records ]
```

| Component | Responsibility | File Location / Template |
|---|---|---|
| **Mission Anchor** | Core motivation and real-world goal | `MISSION.md` ([MISSION-FORMAT.md](teach.md#file-mission-formatmd)) |
| **Lesson Artifacts** | Interactive HTML lesson modules | `./lessons/000X-<slug>.html` |
| **Reference Sheets** | Cheat sheets, syntax summaries, and glossaries | `./reference/*.html` |
| **Learning Records** | Milestone reflections and conceptual breakthroughs | `./learning-records/000X-<slug>.md` |
| **Shared Assets** | Typography, styles, and interactive quiz widgets | `./assets/*` |
| **Primary Sources** | Vetted documentation and book references | `RESOURCES.md` ([RESOURCES-FORMAT.md](teach.md#file-resources-formatmd)) |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Establish Mission and Assess Zone of Proximal Development
- **Action**: Check `MISSION.md` and existing `./learning-records/`. If uninitialized, grill the user to define their motivation and starting baseline.
- **Key Point**: Frame teaching around what the user needs to *do* rather than abstract theory.
- **Why**: Learning is significantly faster and more durable when grounded in immediate application.

##### Step 2: Source Primary References
- **Action**: Identify and record the top primary source documentation or authoritative articles in `RESOURCES.md`.
- **Key Point**: Ensure claims and code patterns conform to modern best practices.
- **Why**: Citing primary sources builds user trust and teaches research habits.

##### Step 3: Author Interactive HTML Lesson
- **Action**: Generate `./lessons/000X-<slug>.html` linking to `./assets/style.css`.
- **Key Point**: Include interactive self-check questions, code snippets, and direct links to reference sheets.
- **Inline Checklist**:
  - [ ] Standalone HTML opens cleanly in browser
  - [ ] Quiz answers formatted with balanced word/character counts
  - [ ] Follow-up discussion prompts included

##### Step 4: Record Breakthroughs in Learning Records
- **Action**: After the user interacts with the lesson, capture the key concepts mastered and areas for next practice in `./learning-records/000X-<slug>.md`.
- **Why**: Keeps learning state synchronized across different sessions.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Dump a 2000-word explanation directly into chat."* | **Package learning into modular HTML lessons and reference files.** | Chat text scrolls away; structured files provide a lasting personal library. |
| *"Give easy multiple-choice questions with obvious answers."* | **Enforce balanced, high-friction retrieval practice.** | Obvious answers create false fluency without building long-term memory. |
| *"Teach without checking `MISSION.md`."* | **Mandatory mission alignment for every lesson.** | Disconnected theory causes learner disengagement and rapid forgetting. |

## Bundled files

### File: `GLOSSARY-FORMAT.md`

#### GLOSSARY.md Format

`GLOSSARY.md` is the canonical language for this teaching workspace. All explainers, exercises, and learning records should adhere to its terminology. Building it is itself part of learning: compressing a concept into a tight definition is evidence the user understands it.

##### Structure

```md
#### {Topic} Glossary

{One or two sentence description of the topic this glossary covers.}

##### Terms

**Hypertrophy**:
Muscle growth driven by mechanical tension and metabolic stress over repeated training sessions.
_Avoid_: Bulking, getting big

**Progressive overload**:
Systematically increasing the demand on a muscle over time, via load, volume, or intensity.
_Avoid_: Pushing harder, levelling up

**RPE (Rate of Perceived Exertion)**:
A 1–10 self-rating of how hard a set felt, where 10 is failure and 8 means two reps left in the tank.
_Avoid_: Effort score, intensity rating
```

##### Rules

- **Add a term only when the user understands it.** The glossary is a record of compressed knowledge, not a dictionary the user reads to learn. If the user has just been introduced to a concept, wait until they can use it correctly before promoting it here.
- **Be opinionated.** When several words exist for the same concept, pick the best one and list the rest as aliases to avoid. This is how language compresses.
- **Keep definitions tight.** One or two sentences. Define what the term IS, not what it does or how to do it.
- **Use the glossary's own terms inside definitions.** Once a term is in the glossary, prefer it everywhere, including inside other definitions. This is what makes complex terms easier to grasp later.
- **Group under subheadings** when natural clusters emerge (e.g. `## Anatomy`, `## Programming`). A flat list is fine when terms cohere.
- **Flag ambiguities explicitly.** If a term is used loosely in the wider field, note the resolution: "In this workspace, 'set' always means a working set; warm-ups are tracked separately."
- **Revise as understanding deepens.** A definition the user wrote in week one may be wrong by week six. Update in place; do not leave stale entries.

### File: `LEARNING-RECORD-FORMAT.md`

#### Learning Record Format

Learning records live in `./learning-records/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc. Create the directory lazily: only when the first record is written.

They are the teaching equivalent of ADRs: they capture non-obvious lessons, key insights, and stated prior knowledge that will steer future sessions. They are used to calculate the zone of proximal development.

##### Template

```md
#### {Short title of what was learned or established}

{1-3 sentences: what was learned (or what prior knowledge was established), and why it matters for future sessions.}
```

That is the whole format. A learning record can be a single paragraph. The value is recording _that_ this is now known and _why_ it changes what to teach next, not in filling out sections.

##### Optional sections

Only include these when they add genuine value. Most records won't need them.

- **Status** frontmatter (`active | superseded by LR-NNNN`): useful when an earlier understanding turns out to be wrong and is replaced.
- **Evidence**: how the user demonstrated the understanding (a question answered, an exercise completed, prior experience cited). Useful when the claim might be revisited.
- **Implications**: what this unlocks or rules out for future sessions. Worth recording when non-obvious.

##### Numbering

Scan `./learning-records/` for the highest existing number and increment by one.

##### When to write a learning record

Write one when any of these is true:

1. **The user demonstrated genuine understanding of something non-trivial**: not just exposure, but evidence they can use the concept correctly. This sets a new floor for what to teach next.
2. **The user disclosed prior knowledge**: "I already know X." Record it so future sessions don't re-teach it. Also record the _depth_ claimed.
3. **A misconception was corrected**: the user previously believed something wrong and now sees why. These are high-value: they predict future stumbling blocks for related topics.
4. **The mission shifted in response to learning**: the user discovered they cared about something different than they thought. Cross-link to [[MISSION.md]] and update it.

###### What does _not_ qualify

- Material that was merely covered. Coverage is not learning. Wait for evidence.
- Anything already captured tersely in [[GLOSSARY.md]] as a term definition. Don't duplicate.
- Session-by-session activity logs. Learning records are not a journal: they are decision-grade insights.

##### Supersession

When a later record contradicts an earlier one (the user's understanding deepened or corrected), mark the old record `Status: superseded by LR-NNNN` rather than deleting it. The history of how understanding evolved is itself useful signal.

### File: `MISSION-FORMAT.md`

#### MISSION.md Format

`MISSION.md` lives at the workspace root. It captures the _reason_ the user is learning this topic. Every teaching decision (what to teach next, which resources to surface, which exercises to design) should trace back to this document.

##### Template

```md
#### Mission: {Topic}

##### Why
{1-3 sentences. The concrete real-world goal the user is chasing. What changes in their life or work when they have this skill? Avoid abstract framings like "to understand X"; push for the underlying outcome.}

##### Success looks like
- {A specific, observable thing the user will be able to do}
- {Another specific thing}
- {…}

##### Constraints
- {Time, budget, prior commitments, learning preferences, anything that bounds the approach}

##### Out of scope
- {Adjacent topics the user explicitly does not want to chase right now, protecting the zone of proximal development}
```

##### Rules

- **One mission per workspace.** If the user wants to learn two unrelated things, that is two workspaces.
- **Concrete over abstract.** "Run a half marathon by October" beats "get fitter." "Ship a Rust CLI to my team" beats "learn Rust."
- **Push back on vagueness.** If the user cannot articulate why, interview them before writing anything. A bad mission is worse than no mission.
- **Revise when reality shifts.** Missions change. When the user's goal moves, update this file: don't leave a stale mission steering future sessions.
- **Keep it short.** If `MISSION.md` runs past a screen, it has stopped being a compass and started being a plan.

### File: `RESOURCES-FORMAT.md`

#### RESOURCES.md Format

`RESOURCES.md` is the curated set of trusted sources for this topic. Knowledge for explainers should be drawn from here, not from parametric guesses. Wisdom comes from the communities listed here.

##### Structure

```md
#### {Topic} Resources

##### Knowledge

- [Book: _The Science and Practice of Strength Training_ by Zatsiorsky & Kraemer](https://example.com)
  Foundational text on programming and adaptation. Use for: anything to do with periodisation, recovery, intensity zones.
- [Article: "How Much Should I Train?" by Greg Nuckols (Stronger By Science)](https://example.com)
  Evidence-based review of volume landmarks. Use for: weekly set targets per muscle group.

##### Wisdom (Communities)

- [r/weightroom](https://reddit.com/r/weightroom)
  High-signal subreddit, moderated against bro-science. Use for: programme critique, plateau troubleshooting.
- Local: Tuesday strength class at {gym name}
  Use for: real-time coaching feedback on lifts.
```

##### Rules

- **High-trust only.** Prefer primary sources, recognised experts, peer-reviewed work, and communities with strong moderation. If a resource is marketing dressed as education, leave it out.
- **Annotate every entry.** A bare link is useless in three months. Add one line: what it covers and when to reach for it.
- **Group by Knowledge / Wisdom.** Mirrors the philosophy in [SKILL.md](teach.md). It is fine for a resource to appear in only one group.
- **Surface gaps explicitly.** If no good resource exists for an area the mission needs, write a `## Gaps` section listing what is missing. This drives future search.
- **Prune ruthlessly.** A resource that turned out to be wrong, shallow, or off-mission should be removed, not buried. Better five sharp sources than thirty mediocre ones.
- **Record community preferences.** If the user has opted out of joining communities, note it here so future sessions don't keep proposing them.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Teach"
  short_description: "Learn a concept in a guided workspace"
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
