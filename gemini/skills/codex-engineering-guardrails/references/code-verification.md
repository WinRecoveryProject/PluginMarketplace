# Skill: code-verification

- Plugin: `codex-engineering-guardrails` (1.1.1)
- Source: `plugins/codex-engineering-guardrails/skills/code-verification/SKILL.md`

> Independently review, test, diagnose, and verify software against explicit requirements, repository standards, and material risks using traceable fresh evidence. Use when Codex is asked to review code or a diff, inspect a pull request, diagnose a failing check without changing code, run or assess tests, validate a bug fix or feature, audit code quality, identify coverage gaps, judge release readiness, or report whether an implementation is correct. Default to read-only source inspection and existing checks; create or change tests only when explicitly requested, and do not modify production code unless the user separately authorizes a fix.

## Instructions

### Code Verification

Determine what the evidence actually establishes. Keep verification independent from implementation assumptions, distinguish requirements from general quality, and do not repair findings under a review-only request.

#### Preserve verification independence

- Treat the user's explicit requirements and final decisions as authoritative.
- Default to read-only source inspection. Running existing checks is allowed, including normal temporary build or cache output, but do not edit source, tests, configuration, lockfiles, or infrastructure without explicit authorization.
- Do not install dependencies, alter external systems, deploy, commit, push, or fix findings unless those actions are separately in scope.
- Inspect applicable repository instructions, the current status, and the exact diff or target before drawing conclusions. Preserve all user-owned changes.
- Evaluate the implementation against requirements and independent invariants, not against its own structure or comments.
- Report adjacent findings without expanding the audit target.

If the user asks to add tests, enter a bounded test-writing mode: change only authorized tests, fixtures, and indispensable test infrastructure. A failing test that exposes a production defect is a valid result. Do not alter production code merely to make the new test pass without a separate command.

#### Define the verification contract

Establish:

1. The target: files, diff, commit range, component, API, artifact, or running behavior.
2. The baseline to compare against.
3. Explicit requirements and acceptance criteria.
4. Repository standards and supported environments.
5. Material failure modes and risk boundaries.
6. Allowed actions and available resources.
7. The evidence necessary for a pass decision.

When the specification is incomplete, separate confirmed requirements from assumptions. Ask only when an ambiguity would change the verdict or make a check unsafe.

#### Build traceability before execution

Create a compact working matrix:

`requirement or risk -> observable behavior -> best evidence -> result`

Keep two independent review axes:

- **Specification:** Does the implementation do exactly what was requested, including edge and failure behavior?
- **Engineering quality:** Is it correct, understandable, maintainable, secure, efficient enough, and consistent with repository conventions?

Passing one axis must not conceal failure on the other. Read [references/verification-matrix.md](references/verification-matrix.md) when selecting checks, evaluating test quality, assigning severity, or coordinating parallel verification.

#### Review in evidence-producing passes

##### 1. Establish the changed surface

- Resolve the exact baseline and final state.
- Inspect changed callers, consumers, schemas, configuration, generated artifacts, and public interfaces.
- Identify behavior that may change indirectly, including error paths and state transitions.

##### 2. Inspect tests before trusting them

- Map tests to requirements and important risks.
- Prefer tests through public behavior or stable seams.
- Verify that expected values come from a specification, invariant, standard, known example, or independent calculation.
- Look for tautological assertions, excessive mocking, missing negative cases, ignored failures, and tests that only mirror the implementation.
- For regression tests, seek evidence that the test detects the prior defect when a safe baseline or deterministic reproduction exists.

##### 3. Review implementation quality

Check correctness first, then readability, maintainability, architecture, security, performance, operability, and repository consistency. Focus on observable consequences. Do not inflate personal style preferences into findings.

##### 4. Execute proportionate checks

Discover commands from repository documentation, manifests, CI configuration, and nearby conventions. Prefer this order:

1. Focused reproduction or affected test.
2. Affected unit, integration, and contract suites.
3. Type checking, linting, formatting, and build validation.
4. End-to-end or runtime checks at real boundaries.
5. Security, performance, migration, concurrency, and recovery checks when those risks are present.

Capture each command, environment, exit status, and material result. A green command proves only what it exercised.

Investigate failures enough to classify them as an implementation defect, test defect, environment limitation, flaky result, unrelated pre-existing failure, or unresolved. Do not silently retry until green or automatically fix the cause.

#### Use adaptive parallelism

Use parallel execution only when it preserves independence and evidence quality.

1. Detect available agents, processes, test workers, CPU, memory, and isolated environments. Keep a sequential fallback.
2. Start with two to four workers and adapt to measured contention and project guidance.
3. Parallelize orthogonal read-only review passes and checks that have independent state, such as linting, type analysis, isolated unit suites, or separate platform reviews.
4. Give each reviewer a distinct question and raw target context. Do not leak another reviewer's conclusion as the expected answer.
5. Serialize checks sharing a database, port, service, filesystem fixture, rate-limited API, device, account, or live environment unless the project provides proven isolation.
6. Do not run concurrent commands when their build outputs, caches, snapshots, or generated files can race.
7. Aggregate results centrally, deduplicate findings, resolve contradictions against primary evidence, and run any required integrated check on the final state.

Parallel agreement is not proof. One direct, reproducible result outweighs several unsupported summaries.

#### Grade evidence and findings

Use these result states:

- **Pass:** Fresh direct evidence covers every required criterion and no material unresolved finding remains.
- **Partial:** Relevant evidence passes, but an important criterion, environment, or test layer is missing.
- **Fail:** Direct evidence shows a material requirement or risk is not satisfied.
- **Inconclusive:** Conflicting or insufficient evidence prevents a defensible decision.

For each finding, provide:

- severity and confidence;
- precise location or affected behavior;
- violated requirement, invariant, or material risk;
- reproduction or supporting evidence;
- consequence and affected users or systems;
- the smallest direction for remediation, without implementing it.

Order findings by severity. Use severity from impact, likelihood, reach, detectability, and recoverability rather than code style. Label inference as inference and distinguish confirmed, likely, historical, and unverified information.

#### Report the verdict

Lead with material findings. If none exist, say so plainly while still naming residual gaps. Then report:

- specification verdict and engineering-quality verdict;
- requirement-to-evidence summary;
- commands executed with results;
- coverage gaps, environment limitations, and flaky or pre-existing failures;
- actions deliberately not performed because they were outside scope.

Do not issue a pass based on code reading alone when executable verification was available, an old test run, coverage percentage without behavioral mapping, or another worker's unsupported conclusion.

## Bundled files

### File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Comdir2

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Code Verification"
  short_description: "Independent, evidence-based code verification"
  default_prompt: "Use $code-verification to independently review and test this code against its requirements and report evidence without fixing it."
```

### File: `references/verification-matrix.md`

#### Verification decision matrix

Read only the sections needed for the current verification target.

##### Contents

- Requirement and risk mapping
- Review axes
- Test-quality checks
- Execution selection
- Parallel safety
- Failure classification
- Finding severity and confidence

##### Requirement and risk mapping

Build one row for every explicit requirement and material risk:

| Requirement or risk | Observable behavior | Evidence source | Result | Gap |
| --- | --- | --- | --- | --- |
| Exact user requirement | Public output or state transition | Focused test or reproduction | Pass/Partial/Fail/Inconclusive | Missing layer or environment |

Use independent evidence sources in this priority order when applicable:

1. Direct observation in the required environment.
2. Executed behavior at a public boundary.
3. Contract or integration evidence.
4. Unit or property evidence.
5. Static analysis and source inspection.
6. Documentation or assertions without execution.

Lower-ranked evidence can still be appropriate for risks that cannot safely be executed. State the limitation instead of overstating certainty.

##### Review axes

| Axis | Primary question | Typical evidence |
| --- | --- | --- |
| Specification | Does every required behavior match the request? | Acceptance examples and boundary tests |
| Correctness | Can valid or invalid inputs produce a wrong state? | Invariants, negative tests, error-path tracing |
| Readability | Can maintainers understand intent and failure behavior? | Focused source review |
| Architecture | Are responsibilities and dependencies coherent? | Caller-consumer and contract analysis |
| Security | Can trust boundaries, secrets, permissions, or inputs be abused? | Threat cases and negative tests |
| Performance | Does relevant workload stay within required limits? | Repeatable benchmarks and profiles |
| Operability | Can failures be detected, contained, and recovered? | Logging, retry, restart, migration, rollback checks |
| Test quality | Would the suite catch meaningful regressions? | Requirement coverage and failure sensitivity |

Do not average these axes into a pass. A material failure on one axis remains visible.

##### Test-quality checks

A strong test should have:

- a clear requirement or risk that justifies it;
- a public or stable seam;
- an oracle independent from the implementation;
- meaningful positive, boundary, and failure cases;
- controlled time, randomness, network, and concurrency;
- deterministic cleanup and isolation;
- a failure message that identifies the broken behavior.

Flag these patterns:

- repeating the production algorithm to compute the expected value;
- asserting private calls instead of observable behavior without necessity;
- mocking the exact interaction that needs verification;
- snapshots with no reviewed semantic intent;
- broad end-to-end tests where a smaller deterministic test proves the risk;
- high coverage with missing critical branches or invariants;
- retries that hide nondeterminism;
- tests that pass before the purported fix because they never expose the defect.

##### Execution selection

| Risk surface | Minimum useful evidence | Broader evidence when material |
| --- | --- | --- |
| Calculation | Unit or property test | Boundary and randomized cases |
| API or event contract | Contract test | Consumer integration |
| Database or migration | Real storage integration | Restart, partial failure, rollback |
| User workflow | End-to-end behavior | Browser, accessibility, or platform variants |
| Concurrency | Deterministic scheduling test | Repeated stress after deterministic coverage |
| Security boundary | Negative and authorization tests | Dependency or configuration analysis |
| Performance requirement | Controlled benchmark | Profile, variance, and resource ceiling |
| Recovery behavior | Fault injection or controlled failure | Restart and data-integrity checks |

Run only checks that are safe and proportionate to the approved scope. Do not invent stack-specific commands when the repository already defines them.

##### Parallel safety

Parallelize a check only if all answers are yes:

1. Does it have no ordering dependency on another check?
2. Does it avoid shared mutable state or use proven isolation?
3. Does it avoid racing on build outputs, caches, fixtures, snapshots, and generated files?
4. Can its result be attributed to one command and environment?
5. Is a coordinator responsible for aggregation and contradiction resolution?

Safe examples often include orthogonal static review and isolated read-only analysis. Unsafe examples often include migrations, live operations, shared integration environments, and multiple test processes targeting the same persistent state.

##### Failure classification

Classify a failing check before drawing a product conclusion:

- **Implementation defect:** The target violates the requirement or invariant.
- **Test defect:** The test has an invalid oracle, setup, isolation, or assertion.
- **Environment limitation:** Required dependency, permission, platform, or service is unavailable.
- **Flaky result:** Repeated identical runs disagree without an understood cause.
- **Pre-existing failure:** Reliable baseline evidence shows the failure predates the target change.
- **Unresolved:** Available evidence does not distinguish the causes.

Do not call a failure pre-existing without baseline evidence. Do not call it flaky merely because a retry passed.

##### Finding severity and confidence

Estimate severity from:

- impact if triggered;
- likelihood under supported use;
- number of users, systems, or data paths affected;
- difficulty of detection;
- difficulty of recovery.

Use practical levels:

- **Critical:** Immediate severe compromise, irreversible loss, or unsafe release condition.
- **High:** Major requirement failure, security exposure, corruption, or widespread outage risk.
- **Medium:** Material but bounded malfunction or maintainability risk with a realistic trigger.
- **Low:** Limited issue with low impact or an uncommon trigger.

State confidence separately:

- **High confidence:** Directly reproduced or proven by strong evidence.
- **Medium confidence:** Multiple indicators support the finding, but direct execution is incomplete.
- **Low confidence:** Plausible inference requiring further verification.

Do not report harmless preferences as findings. Put non-blocking observations after material findings.
