# Skill: domain-modeling

- Plugin: `plugin-skill-studio` (0.7.0)
- Source: `plugins/plugin-skill-studio/skills/domain-modeling/SKILL.md`

> Build and sharpen a project's domain model, ubiquitous language, and architectural decision records. Use when establishing codebase terminology, challenging fuzzy concepts, writing ADRs, or updating CONTEXT.md — even if the user says "define our terms". Do NOT use for general code refactoring without domain shifts.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Domain Modeling

Actively establish, sharpen, and enforce ubiquitous domain language (`CONTEXT.md`) and architectural decision records (`docs/adr/*.md`) to prevent semantic drift across agents and engineering teams.

---

#### Core Invariants

1. **Active Semantic Enforcement**: Proactively challenge overloaded, ambiguous, or colloquial terms and align them with canonical definitions in real time.
2. **Immediate Inline Glossary Updates**: Capture domain terms into `CONTEXT.md` the instant they crystallize; never batch glossary edits to the end of a session.
3. **Strict Implementation-Free Glossary**: `CONTEXT.md` must contain zero implementation details, frameworks, or database choices—it is a pure domain dictionary.
4. **Selective ADR Threshold**: Only author an ADR when a decision meets all 3 criteria: (1) Hard to reverse, (2) Surprising without context, (3) The result of a real trade-off.
5. **Codebase-Glossary Alignment**: Cross-reference terminology with live codebase entities and flag discrepancies immediately.

---

#### Architecture & Map of Content (MOC)

```
[ Domain Discussions / User Prompts ] ──► [ Semantic Challenge & Disambiguation ] ──► [ Inline CONTEXT.md Update ]
                                                                 │
                                ┌────────────────────────────────┴────────────────────────────────┐
                                ▼                                                                 ▼
                     [ Domain Dictionary ]                                              [ Architectural Records ]
                     - Single-context: `CONTEXT.md`                                     - `docs/adr/NNNN-<slug>.md`
                     - Multi-context: `CONTEXT-MAP.md`                                  - Context, Decision, Consequences
```

| Artifact | Responsibility | Format Reference |
|---|---|---|
| **Domain Glossary** | Canonical terms, entity boundaries, invariants | `skills/domain-modeling/CONTEXT-FORMAT.md` |
| **Architectural Record** | Irreversible architectural choices & trade-offs | `skills/domain-modeling/ADR-FORMAT.md` |
| **Context Map** | Bounded contexts across modular repositories | `CONTEXT-MAP.md` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Detect Context Architecture & Glossary Baseline
- **Action**: Check if a root `CONTEXT-MAP.md` exists (multi-context) or single `CONTEXT.md` / `docs/adr/`.
- **Key Point**: Create glossary files lazily on the first resolved term.
- **Why**: Multi-context systems require partitioning domain terms by bounded context to prevent collision.

##### Step 2: Challenge Fuzzy & Overloaded Language
- **Action**: Intercept vague nouns (e.g. "account", "item", "process") and propose distinct canonical domain entities.
- **Key Point**: Stress-test boundaries with concrete edge-case scenarios (e.g., "What happens during partial cancellation?").
- **Why**: Ambiguous nouns lead to bloated database entities and tangled business logic.

##### Step 3: Verify Alignment Against Existing Codebase
- **Action**: Search the codebase for entity names and check whether existing schemas agree with the user's description.
- **Key Point**: Highlight discrepancies immediately: "The code cancels entire Orders, but you described partial cancellation. Which is correct?"
- **Inline Checklist**:
  - [ ] Term verified against live database/code entities
  - [ ] Definition added to `CONTEXT.md` using standard format
  - [ ] Implementation details omitted from glossary

##### Step 4: Author Architectural Decision Records (ADRs)
- **Action**: For decisions meeting the 3-point threshold, create `docs/adr/NNNN-<slug>.md`.
- **Key Point**: Document Context, Decision, Status, and Consequences.
- **Why**: Transparent ADRs prevent repetitive debates and document technical debt trade-offs.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll add database table schemas into CONTEXT.md."* | **Forbidden. CONTEXT.md contains pure domain terms only.** | Coupling the domain glossary to DB schemas makes it obsolete upon migration. |
| *"Let's write an ADR for every small choice (e.g. library helper)."* | **Enforce the 3-point ADR threshold.** | Low-value ADRs clutter documentation and obscure truly critical architectural choices. |
| *"The user used 'User' and 'Customer' interchangeably; I'll ignore it."* | **Challenge and disambiguate overloaded terms immediately.** | Conflating distinct domain concepts creates severe authorization and modeling bugs. |

## Bundled files

### File: `ADR-FORMAT.md`

#### ADR Format

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create the `docs/adr/` directory lazily: only when the first ADR is needed.

##### Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why*, not in filling out sections.

##### Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`): useful when decisions are revisited
- **Considered Options**: only when the rejected alternatives are worth remembering
- **Consequences**: only when non-obvious downstream effects need to be called out

##### Numbering

Scan `docs/adr/` for the highest existing number and increment by one.

##### When to offer an ADR

All three of these must be true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If a decision is easy to reverse, skip it: you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

###### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library: just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it; otherwise someone will suggest GraphQL again in six months.

### File: `CONTEXT-FORMAT.md`

#### CONTEXT.md Format

##### Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

##### Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

##### Single vs multi-context repos

**Single context (most repos):** One `CONTEXT.md` at the repo root.

**Multiple contexts:** A `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate to each other:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md): manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find contexts
- If only a root `CONTEXT.md` exists, single context
- If neither exists, create a root `CONTEXT.md` lazily when the first term is resolved

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Domain Modeling"
  short_description: "Build and sharpen a domain model"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
