# Skill: codebase-design

- Plugin: `plugin-skill-studio` (0.8.0)
- Source: `plugins/plugin-skill-studio/skills/codebase-design/SKILL.md`

> Shared vocabulary and patterns for designing deep modules with narrow interfaces and clean seams. Use when designing module interfaces, finding deepening opportunities, deciding where seams go, or making code more testable and AI-navigable — even if the user says "improve this module". Do NOT use for whole-codebase architectural surveys.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Codebase Design

Design deep, high-leverage modules that encapsulate complex domain behavior behind minimal interfaces placed at clear architectural seams.

---

#### Core Invariants

1. **Depth Over Surface Area**: Maximize internal implementation leverage while minimizing interface surface area (few methods, simple primitive parameters).
2. **Interface as Test Surface**: External callers and unit tests cross the exact same seam; never pierce the interface to test internal private plumbing.
3. **The Deletion Test**: If deleting a module causes complexity to vanish, it was an unnecessary pass-through; if complexity scatters across $N$ callers, it was earning its keep.
4. **Real vs. Hypothetical Seams**: One adapter indicates a hypothetical seam; introduce an interface seam only when at least two concrete adapters vary across it.
5. **Exact Design Vocabulary**: Strictly use canonical terminology (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**); avoid vague synonyms (service, component, boundary).

---

#### Architecture & Map of Content (MOC)

```
┌───────────────────────────────────────┐
│       Narrow Public Interface         │  ◄── Small surface (few methods, simple inputs)
├───────────────────────────────────────┤
│                                       │
│          Deep Implementation          │  ◄── High leverage, hidden state, rich logic
│                                       │
└───────────────────────────────────────┘
```

| Component | Responsibility | Reference |
|---|---|---|
| **Module Deepening** | Refactor shallow pass-throughs into deep modules | `skills/codebase-design/DEEPENING.md` |
| **Design It Twice** | Explore multi-model interface variations | `skills/codebase-design/DESIGN-IT-TWICE.md` |
| **Testability Rules** | Accept dependencies, return pure values | Public seam tests |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Evaluate Current Interface Depth & Seams
- **Action**: Inspect the module's public methods, parameter signatures, and call sites.
- **Key Point**: Check the ratio of interface cognitive overhead to internal capabilities.
- **Why**: Shallow modules force callers to understand internal mechanics, destroying locality.

##### Step 2: Apply the Deletion Test & Simplify Signatures
- **Action**: Consolidate fine-grained procedural methods into unified, intent-revealing operations.
- **Key Point**: Hide internal state transformations and dependency instantiations behind the seam.
- **Inline Checklist**:
  - [ ] Methods reduced to minimal essential operations
  - [ ] Dependencies passed in rather than created internally
  - [ ] Functions return values rather than mutating global side effects

##### Step 3: Align Seam with Unit Test Harness
- **Action**: Structure test suites to exercise the module strictly through its public interface.
- **Key Point**: Eliminate internal mocking and testing of private helper functions.
- **Why**: Testing through the interface ensures tests survive internal refactors without breakage.

##### Step 4: Explore Alternatives (Design It Twice)
- **Action**: When designing complex or foundational modules, draft 2–3 radically different interface designs before coding.
- **Key Point**: Compare candidates on depth, locality, and caller ergonomics.
- **Why**: The first interface that comes to mind is rarely the deepest or most maintainable.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Expose private helper functions so we can write unit tests for them."* | **Forbidden. Test exclusively through the public interface.** | Testing private helpers couples tests to implementation details and prevents refactoring. |
| *"Create an interface and adapter for a single implementation."* | **Wait for 2 adapters before extracting a generic seam.** | Speculative generalization creates shallow, unnecessary abstraction layers. |
| *"Break this 100-line cohesive function into 5 single-use files."* | **Maintain locality inside deep modules.** | Excessive fragmentation increases cognitive load and scatters related logic. |

## Bundled files

### File: `DEEPENING.md`

#### Deepening

How to deepen a cluster of shallow modules safely, given its dependencies. Assumes the vocabulary in [SKILL.md](codebase-design.md): **module**, **interface**, **seam**, **adapter**.

##### Dependency categories

When assessing a candidate for deepening, classify its dependencies. The category determines how the deepened module is tested across its seam.

###### 1. In-process

Pure computation, in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter needed.

###### 2. Local-substitutable

Dependencies that have local test stand-ins (PGLite for Postgres, in-memory filesystem). Deepenable if the stand-in exists. The deepened module is tested with the stand-in running in the test suite. The seam is internal; no port at the module's external interface.

###### 3. Remote but owned (Ports & Adapters)

Your own services across a network boundary (microservices, internal APIs). Define a **port** (interface) at the seam. The deep module owns the logic; the transport is injected as an **adapter**. Tests use an in-memory adapter. Production uses an HTTP/gRPC/queue adapter.

Recommendation shape: *"Define a port at the seam, implement an HTTP adapter for production and an in-memory adapter for testing, so the logic sits in one deep module even though it's deployed across a network."*

###### 4. True external (Mock)

Third-party services (Stripe, Twilio, etc.) you don't control. The deepened module takes the external dependency as an injected port; tests provide a mock adapter.

##### Seam discipline

- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a port unless at least two adapters are justified (typically production + test). A single-adapter seam is just indirection.
- **Internal seams vs external seams.** A deep module can have internal seams (private to its implementation, used by its own tests) as well as the external seam at its interface. Don't expose internal seams through the interface just because tests use them.

##### Testing strategy: replace, don't layer

- Old unit tests on shallow modules become waste once tests at the deepened module's interface exist; delete them.
- Write new tests at the deepened module's interface. The **interface is the test surface**.
- Tests assert on observable outcomes through the interface, not internal state.
- Tests should survive internal refactors, since they describe behaviour, not implementation. If a test has to change when the implementation changes, it's testing past the interface.

### File: `DESIGN-IT-TWICE.md`

#### Design It Twice

When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel sub-agent pattern. Based on "Design It Twice" (Ousterhout): your first idea is unlikely to be the best.

Uses the vocabulary in [SKILL.md](codebase-design.md): **module**, **interface**, **seam**, **adapter**, **leverage**.

##### Process

###### 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface would need to satisfy
- The dependencies it would rely on, and which category they fall into (see [DEEPENING.md](codebase-design.md#file-deepeningmd))
- A rough illustrative code sketch to ground the constraints, not a proposal, just a way to make the constraints concrete

Show this to the user, then immediately proceed to Step 2. The user reads and thinks while the sub-agents work in parallel.

###### 2. Spawn sub-agents

Spawn 3+ sub-agents in parallel. Each must produce a **radically different** interface for the deepened module.

Prompt each sub-agent with a separate technical brief (file paths, coupling details, dependency category from [DEEPENING.md](codebase-design.md#file-deepeningmd), what sits behind the seam). The brief is independent of the user-facing problem-space explanation in Step 1. Give each agent a different design constraint:

- Agent 1: "Minimize the interface: aim for 1–3 entry points max. Maximise leverage per entry point."
- Agent 2: "Maximise flexibility: support many use cases and extension."
- Agent 3: "Optimise for the most common caller: make the default case trivial."
- Agent 4 (if applicable): "Design around ports & adapters for cross-seam dependencies."

Include both [SKILL.md](codebase-design.md) vocabulary and CONTEXT.md vocabulary in the brief so each sub-agent names things consistently with the architecture language and the project's domain language.

Each sub-agent outputs:

1. Interface (types, methods, params, plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [DEEPENING.md](codebase-design.md#file-deepeningmd))
5. Trade-offs: where leverage is high, where it's thin

###### 3. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated: the user wants a strong read, not a menu.

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Codebase Design"
  short_description: "Vocabulary for deep-module design"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
