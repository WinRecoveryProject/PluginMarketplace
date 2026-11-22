# Interview mode

Follow the package policy linked from this skill's router before acting.

<a id="src-grill-me-intro"></a>

<a id="src-grill-me-grill-me"></a>
## Grill Me

Conduct a focused, relentless Socratic interview to stress-test a plan, architectural decision, requirement, or nascent concept before writing code.

---

<a id="src-grill-me-core-invariants"></a>
### Core Invariants

1. **Relentless Frontier Exploration**: Model the design space as a decision tree and exhaust the frontier before declaring alignment.
2. **One Question Round per Turn**: Batch questions into structured frontier rounds with recommended defaults; never interrogate with one-off dribble.
3. **Autonomous Fact Extraction**: Retrieve codebase, system, and file facts autonomously; never ask the user what the environment can reveal.
4. **Active Assumption Invalidation**: Proactively challenge comfortable assumptions, scale bottlenecks, edge-case failure modes, and hidden dependencies.
5. **No Premature Implementation**: Refuse to write production code or tickets until the interview frontier is completely empty and mutually agreed.

---

<a id="src-grill-me-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ Nascent Idea / Unsettled Decision ] ──► [ Autonomous Codebase Recon ] ──► [ Frontier Question Round ] ──► [ Socratic Refinement ] ──► [ Settled Alignment ]
```

| Component | Responsibility | Reference / Target |
|---|---|---|
| **Autonomous Recon** | Read repo context, ADRs, schemas | Primary source files |
| **Frontier Tree** | Map open decision nodes & prerequisites | The Grilling section of this mode |
| **Question Round** | Formatted numbered prompts + defaults | User interaction loop |
| **Settled Alignment** | Clean, unambiguous problem/solution contract | Handoff to spec mode |

---

<a id="src-grill-me-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-grill-me-step-1-autonomous-reconnaissance--context-gathering"></a>
#### Step 1: Autonomous Reconnaissance & Context Gathering
- **Action**: Inspect relevant codebase files, configurations, documentation, and existing architectural decisions before drafting questions.
- **Key Point**: Form a grounded mental model of existing constraints without asking the user for baseline facts.
- **Why**: Asking users for facts available in the repository wastes their cognitive bandwidth and damages credibility.

<a id="src-grill-me-step-2-formulate-frontier-question-rounds"></a>
#### Step 2: Formulate Frontier Question Rounds
- **Action**: Identify all open decisions whose prerequisites are settled and present them in a single batch with explicit recommendations.
- **Key Point**: Format each question as `❓ **Q[N]** - **[Title]**:` with options and `➡️ [Recommended Default]`.
- **Why**: Presenting strong recommendations lowers decision fatigue while forcing the user to actively affirm or override specific choices.
- **Inline Checklist**:
  - [ ] Every question targets a genuine decision rather than an environmental fact
  - [ ] Questions are independent and can be answered in parallel
  - [ ] Concrete recommendation provided for every question
  - [ ] No implementation code started

<a id="src-grill-me-step-3-iterate-and-deepen-the-decision-tree"></a>
#### Step 3: Iterate and Deepen the Decision Tree
- **Action**: Ingest user answers, collapse resolved nodes, uncover new downstream branches, and issue the next frontier round.
- **Key Point**: Probe edge cases: failure modes, security boundaries, migration paths, and non-happy paths.
- **Why**: Most architectural failures occur at boundaries that initial proposals casually gloss over.

<a id="src-grill-me-step-4-verify-alignment-and-closure"></a>
#### Step 4: Verify Alignment and Closure
- **Action**: Summarize the unified decision contract and ask for explicit user confirmation.
- **Key Point**: Confirm that the frontier is empty and zero unexamined assumptions remain.
- **Why**: Clear alignment prevents costly rewrites during implementation.

---

<a id="src-grill-me-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"The user's initial prompt looks clear enough, let's start coding."* | **Mandatory grilling on all non-trivial plans.** | Initial prompts almost always conceal edge-case ambiguities and conflicting constraints. |
| *"I'll ask questions one by one across multiple back-and-forth turns."* | **Batch the entire frontier into numbered rounds.** | Single-question ping-pong creates conversational fatigue and fragments context. |
| *"Ask the user which database schema or library version is used."* | **Discover environment facts autonomously.** | Agents must look up facts directly in code and configs rather than burdening the user. |
| *"Agree with the user's preferred approach without challenging trade-offs."* | **Stress-test every critical design decision.** | Sycophancy allows architectural bugs and scaling bottlenecks to slip into production. |

<a id="src-grill-with-docs-intro"></a>

<a id="src-grill-with-docs-grill-with-docs"></a>
## Grill with Docs

Conduct a structured Socratic design interview that concurrently distills and commits domain terminology into `CONTEXT.md` and hard-to-reverse architectural decisions into Architectural Decision Records (`docs/adr/*.md`).

---

<a id="src-grill-with-docs-core-invariants"></a>
### Core Invariants

1. **Simultaneous Documentation Distillation**: Extract and record ubiquitous domain language into `CONTEXT.md` and architectural choices into ADRs in real time as decisions settle.
2. **Batch Frontier Questioning**: Present independent frontier questions in structured batches with explicit defaults rather than one-off queries.
3. **Autonomous Fact Reconnaissance**: Research existing codebase architecture, types, and schemas autonomously before posing design questions.
4. **Lightweight ADR Trigger**: When a design choice creates significant technical debt or is difficult to reverse (e.g. database choice, sync strategy), write a dedicated ADR immediately.
5. **Zero Speculative Prose**: Document only decisions that have actively settled during the interview; keep draft notes clearly demarcated.

---

<a id="src-grill-with-docs-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ User Feature Idea ] ──► [ Codebase Recon & ADR Review ] ──► [ Socratic Grilling Rounds ]
                                                                       │
                                      ┌────────────────────────────────┴────────────────────────────────┐
                                      ▼                                                                 ▼
                            [ Update CONTEXT.md ]                                              [ Author ADR Docs ]
                            - Ubiquitous language                                              - Context & Decision
                            - Entity definitions                                               - Consequences & Tradeoffs
```

| Artifact | Purpose | Reference Format |
|---|---|---|
| **Domain Dictionary** | Capture ubiquitous language and entity relationships | The package's domain-modeling context format, when available |
| **Architectural Record** | Record irreversible architectural choices | The package's domain-modeling ADR format, when available |
| **Grilling Protocol** | Drive structured frontier question rounds | The Grilling section of this mode |

---

<a id="src-grill-with-docs-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-grill-with-docs-step-1-discover-existing-documentation-baseline"></a>
#### Step 1: Discover Existing Documentation Baseline
- **Action**: Check for existing `CONTEXT.md`, `GLOSSARY.md`, and `docs/adr/` records in the repository.
- **Key Point**: Adopt existing project conventions for domain modeling and decision logging.
- **Why**: Maintaining architectural consistency prevents duplicate terminology and fragmented records.

<a id="src-grill-with-docs-step-2-conduct-socratic-grilling-rounds"></a>
#### Step 2: Conduct Socratic Grilling Rounds
- **Action**: Identify unsettled requirements and formulate numbered question rounds with recommended defaults.
- **Key Point**: Ask about boundaries, invariants, entity lifecycles, and failure recovery.
- **Inline Checklist**:
  - [ ] Terminology vetted against existing domain dictionary
  - [ ] Questions formatted with clear recommendations
  - [ ] Architecture tradeoffs highlighted

<a id="src-grill-with-docs-step-3-distill-and-update-domain-glossary"></a>
#### Step 3: Distill and Update Domain Glossary
- **Action**: As terms and entities are clarified, update or create `CONTEXT.md` using the standard format.
- **Key Point**: Ensure terms are strictly defined with unambiguous scope.
- **Why**: Shared ubiquitous language prevents misalignment between engineers and agents.

<a id="src-grill-with-docs-step-4-author-architectural-decision-records-adrs"></a>
#### Step 4: Author Architectural Decision Records (ADRs)
- **Action**: For significant architectural choices, author a new numbered ADR in `docs/adr/NNNN-<slug>.md`.
- **Key Point**: Include Context, Decision, Status, and Consequences (both positive and negative).
- **Why**: ADRs preserve institutional memory and prevent rehashing past debates.

---

<a id="src-grill-with-docs-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll write the documentation after the entire interview finishes."* | **Capture terms and ADRs as decisions settle.** | Post-hoc documentation often drops subtle nuances, tradeoffs, and rationale. |
| *"This architectural choice is minor, no ADR needed."* | **If it is hard to reverse, author an ADR.** | Seemingly minor choices often cascade into major technical debt. |
| *"I will ask the user to explain the existing domain model."* | **Read existing docs and schemas autonomously.** | Agents must build initial context from repo artifacts before engaging the user. |

<a id="src-grilling-intro"></a>

<a id="src-grilling-grilling"></a>
## Grilling

Relentlessly stress-test thinking, expose hidden assumptions, and map the design space as an expanding decision tree until mutual understanding is reached.

---

<a id="src-grilling-core-invariants"></a>
### Core Invariants

1. **Frontier-Based Batched Rounds**: Ask all currently unblocked questions together in a single numbered round; never drip questions one by one.
2. **Mandatory Concrete Recommendations**: Every question must include a definitive recommended answer (`➡️ [Recommendation]`) to streamline decision-making.
3. **Autonomous Fact Exploration**: Investigate the codebase, configs, and dependencies with background exploration before asking questions; never query the user for discoverable facts.
4. **Strict Topological Dependency Ordering**: Questions whose answers depend on open decisions must wait for future rounds; never mix dependent questions into the current frontier.
5. **Verified Exhaustion Gate**: The interview concludes only when the frontier is completely empty and the user explicitly validates the final consensus.

---

<a id="src-grilling-architecture--map-of-content-moc"></a>
### Architecture & Map of Content (MOC)

```
[ Problem Space / Initial Proposal ]
                │
                ▼
┌───────────────────────────────────────┐
│ 1. Compute Decision Frontier Tree     │
│    (Unblocked questions with defaults)│
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 2. Issue Formatted Round (Q1..Qn)     │
│    (Questions + Strong Recommendations)│
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 3. Ingest Answers & Advance Frontier  │
│    (Prune resolved, unlock downstream)│
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ 4. Verification & Consensus Handshake │
└───────────────────────────────────────┘
```

| Phase | Responsibility | Expected Output |
|---|---|---|
| **Frontier Extraction** | Identify independent decision nodes | Filtered list of unblocked questions |
| **Round Formatting** | Apply standardized Markdown question templates | User-facing numbered interview round |
| **Downstream Unblocking** | Re-evaluate tree based on user decisions | Updated frontier state |
| **Consensus Handshake** | Synthesize agreed architecture & requirements | Clean brief ready for specification |

---

<a id="src-grilling-step-by-step-procedure-twi"></a>
### Step-by-Step Procedure (TWI)

<a id="src-grilling-step-1-map-the-design-space--compute-frontier"></a>
#### Step 1: Map the Design Space & Compute Frontier
- **Action**: Analyze the user's intent, identify all decision nodes, and select only those whose prerequisites are fully settled.
- **Key Point**: Filter out any question that requires guessing the answer to an unresolved peer question.
- **Why**: Asking dependent questions simultaneously forces the user into speculative, conditional answers that clutter context.

<a id="src-grilling-step-2-format-and-dispatch-the-question-round"></a>
#### Step 2: Format and Dispatch the Question Round
- **Action**: Present the current frontier using the standardized Markdown question format:
  ```markdown
  ❓ **Q1** - **<Question Title>**: <Detailed question body and options>

  ➡️ **Recommendation**: <Specific proposed answer and technical rationale>

  ---

  ❓ **Q2** - **<Question Title>**: <Detailed question body and options>

  ➡️ **Recommendation**: <Specific proposed answer and technical rationale>
  ```
- **Key Point**: Keep recommendations opinionated, clear, and grounded in industry best practices.
- **Inline Checklist**:
  - [ ] Every question numbered and titled
  - [ ] Concrete recommendation provided for each question
  - [ ] No dependent questions included in the same round

<a id="src-grilling-step-3-ingest-answers--advance-the-frontier-tree"></a>
#### Step 3: Ingest Answers & Advance the Frontier Tree
- **Action**: Parse user responses, record settled decisions, unlock newly available downstream questions, and generate the next round.
- **Key Point**: If a user response reveals a new unknown in the codebase, dispatch background exploration immediately to resolve it.
- **Why**: Real-time background discovery prevents passing factual burdens onto the user.

<a id="src-grilling-step-4-verify-alignment-and-completion"></a>
#### Step 4: Verify Alignment and Completion
- **Action**: Once all branches of the decision tree have been explored and no frontier items remain, present a concise synthesis of all resolved decisions.
- **Key Point**: Require explicit user confirmation before proceeding to specification or execution.
- **Why**: Mutual alignment guarantees that the subsequent implementation phase proceeds without friction or false assumptions.

---

<a id="src-grilling-anti-rationalization-guardrails"></a>
### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll ask just one question now to see what they say."* | **Ask the entire frontier in one turn.** | Drip-feeding questions creates annoying latency and loses the macro structure of the design. |
| *"Let the user decide without biasing them with my recommendation."* | **Mandatory recommended answer for every question.** | Concrete recommendations speed up review and give users a clear baseline to react against. |
| *"Ask the user where configuration files or types are defined."* | **Discover environment facts autonomously.** | User interviews are exclusively for product and architectural decisions, not repo search. |
| *"The user gave a vague answer, but I can guess what they meant."* | **Clarify ambiguous answers immediately.** | Guessing user intent during grilling undermines the entire purpose of stress-testing. |
