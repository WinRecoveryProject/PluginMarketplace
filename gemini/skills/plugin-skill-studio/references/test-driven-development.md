# Skill: test-driven-development

- Plugin: `plugin-skill-studio` (0.8.0)
- Source: `plugins/plugin-skill-studio/skills/test-driven-development/SKILL.md`

> Runs a recorded red-green-refactor cycle. Use when implementing a feature, bug fix, or behavior change.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#file-referencesintegration-registryjson); never load companion plugins.

### Test-Driven Development

Write one behavioral test, observe the expected failure, write the minimum code
to pass, and refactor only while green.

#### Scope

Use TDD for features, bug fixes, and externally observable behavior changes.
For a pure behavior-preserving refactor, preserve existing green tests and add
coverage only for an uncovered contract the refactor could break. Ask before
skipping TDD for throwaway prototypes, generated code, or configuration-only
changes.

Production code written before its failing test is not a red-green cycle. Do
not keep it as a reference: revert that implementation, establish red, and
implement from the test.

#### Cycle

##### 1. Red

Write the smallest test that expresses one required behavior through the
highest practical public seam.

- Name the behavior precisely.
- Exercise real production code; mock only an external boundary that cannot be
  used safely or deterministically.
- Cover the requested example first, then one meaningful edge or error case.
- Run only the focused test while iterating.

Record the command, non-zero exit, and decisive assertion output. Confirm that
the test failed because the behavior is missing, not because of syntax, setup,
imports, or the wrong command. A passing test or a test that errors does not
establish red; correct it and rerun.

##### 2. Green

Implement only enough production behavior to satisfy the red test. Do not add
options, abstractions, validation, or adjacent cleanup that no current test or
requirement demands.

Rerun the identical focused command. Fix production code rather than weakening
the assertion. Record the zero exit and passing output. If existing focused
tests now fail, resolve the regression before continuing.

##### 3. Refactor

Only after green, remove duplication, improve names, or simplify structure
without adding behavior. Keep the focused tests green after every structural
change. If the next requirement needs new behavior, start another red cycle.

#### Test integrity

Before writing or changing a non-trivial test, read
[writing-good-tests.md](test-driven-development.md#file-writing-good-testsmd). In particular:

- Name the production defect that would make the test fail.
- Assert externally visible results, state, or calls at a real boundary rather
  than reimplementing the production algorithm in the test.
- Avoid tests that prove only a mock was configured.
- Keep test-only helpers out of production classes.
- Understand dependency side effects before replacing them.

Hard-to-test behavior is design feedback: simplify the public interface or
move dependencies behind an explicit seam. Huge setup should be reduced with a
small test helper before adding production abstraction.

#### Completion

Before reporting success, verify and report:

- Every changed behavior has a test that was observed failing first for the
  expected reason.
- The implementation is the smallest one supported by the requirements and
  tests.
- Main examples plus proportionate edge and failure cases pass.
- The relevant test command passes with no hidden errors or warnings.
- No assertion was deleted or weakened merely to obtain green.

If red was not observed, say so explicitly; do not relabel tests-after as TDD.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Test Driven Development"
  short_description: "Implement changes through red-green-refactor"
  default_prompt: "Implement this change test-first."

policy:
  allow_implicit_invocation: true
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `writing-good-tests.md`

#### Writing Good Tests

Load this reference when writing or changing non-trivial tests, mocks, fixtures,
or test-only helpers.

##### Name the break

Before the test body, state the realistic production defect that should make
the test fail. A test earns its cost by catching a wrong branch, result,
argument, side effect, boundary case, or public contract.

- Derive expected values independently with literals or hand-checked fixtures.
  Do not call the production builder or repeat its algorithm on both sides.
- Test behavior that depends on a constant or message, not the private value or
  exact wording itself.
- Run scripts and assert outputs, exit codes, or side effects. Do not grep their
  source. Pressure-test agent instructions through representative behavior.
- Test the boundary your code owns, not documented framework mechanics.
- Skip trivial getters, constructors, forwarding, and constants unless they
  validate, normalize, default, derive, enforce, or cause a side effect.

Gate before writing:

```text
Name the production defect this test catches.
Cannot name one              -> redesign around observable behavior
Only source text changes     -> execute the artifact and assert effects
Only intentional redesigns  -> test the behavior that depends on the decision
Expectation reuses code logic -> replace with a literal or hand-checked fixture
```

##### Exercise the real thing

Assert the real component's observable result. A mock assertion often proves
only that the mock exists.

- Run once against the real dependency to learn its side effects. Mock the
  slow, nondeterministic, privileged, or external operation below the behavior
  the test needs.
- Keep configuration writes, transformations, validation, and state changes
  real when they are part of the contract.
- Make doubles branch-specific and mirror the complete documented response
  shape. Assert arguments, ordering, or call count only when they are public
  behavior.
- Put cleanup used only by tests in test utilities, never production classes.
- Prefer an integration test with real components when mock setup is larger or
  harder to understand than the behavior under test.

Gate before adding a mock or helper:

```text
List the real dependency's side effects.
Keep contract-relevant effects real; mock only the unsafe/slow boundary.
Mirror the real response structure for success, error, and malformed cases.
If the assertion targets the mock itself, unmock it or test the real boundary.
If only tests call a helper, keep it in test code.
```

##### Mutation check

Before finishing, mentally apply realistic mutations. At least one test should
fail for each applicable mutation:

- wrong argument, constant, or branch;
- missing side effect or state change;
- empty/default return;
- missing zero, empty, nil, malformed, or authorization handling;
- dependency error swallowed or mapped incorrectly.

A mutation nothing catches marks behavior as unprotected or the test as
tautological.

##### Warning signs

- Setup and assertion share the same computed object.
- The test can fail only through a crash or missing selector.
- Expected values hide behind loops, builders, or production helpers.
- A removed symbol is asserted to remain absent.
- Partial mocks omit fields real consumers use.
- Test-only cleanup appears in production code.
- Mock setup dominates the test or no one can explain why the mock is needed.

Ship only tests that protect required behavior. A test written merely for
coverage or process adds maintenance without evidence.
