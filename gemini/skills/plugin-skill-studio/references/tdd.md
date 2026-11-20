# Skill: tdd

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/tdd/SKILL.md`

> Implement features and bug fixes test-first using red-green-refactor cycles. Use when writing new functionality, adding regression tests, fixing bugs with test coverage, or designing behavior through test assertions — even if the user says "write tests for this". Do NOT use for throwaway exploratory prototypes.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#not-embedded); never load companion plugins.

### Test-Driven Development (TDD)

Implement robust, maintainable functionality through disciplined red → green → verify cycles. Verify behavior through public seams rather than private implementation details.

#### Core Principle

> **Write the failing test first, witness it fail for the right reason, and write only the minimal code needed to make it green.**

---

#### Core Invariants

1. **Strict Red-First Execution**: Never write production implementation code before seeing an automated test fail against a pre-agreed seam.
2. **Behavioral Testing Over Implementation Inspection**: Tests must assert observable input/output behavior and public contracts, never private variables or internal call chains.
3. **Independent Expected Values**: Assertions must compare against independent ground truth (fixtures, domain specs, known literals), never recomputed mirror logic.
4. **Vertical Tracer Slicing**: Deliver one vertical slice at a time (one test → minimal code → green) rather than batching horizontal test suites upfront.
5. **Deterministic & Isolated Fixtures**: Tests must execute in milliseconds without cross-test state leakage, unseeded random seeds, or unpinned clocks.

---

#### Architecture & Map of Content (MOC)

```
[ Agree Public Seam ] ──► [ Red: Write Failing Test ] ──► [ Green: Minimal Code ] ──► [ Refactor & Verify ]
```

| Component | Responsibility | Reference |
|---|---|---|
| **Public Seams** | Identify module boundaries and observable behaviors | `codebase-design` |
| **Test Examples** | Concrete patterns for unit and integration assertions | `tests.md` |
| **Mocking Guidelines** | Safe boundary isolation rules without over-mocking | `mocking.md` |
| **Review & Refactor** | Clean code review after reaching green | `code-review` |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Identify & Confirm the Public Seam
- **Action**: State the public interface and observable contract you intend to test, and confirm alignment with domain conventions.
- **Key Point**: Anchor assertions at public boundaries; do not reach into internal private state.
- **Why**: Testing through private internals creates brittle tests that break during harmless refactoring.

##### Step 2: Write the Failing Test (RED)
- **Action**: Author a single focused test specifying the expected behavior and run the test runner to observe failure.
- **Key Point**: Verify the test fails specifically because the new behavior is absent, not due to syntax or setup errors.
- **Inline Checklist**:
  - [ ] Test names the exact business capability (e.g. `returns_discounted_total_for_premium_member`)
  - [ ] Test fails with expected assertion error
  - [ ] Expected values derived from independent domain constants
- **Why**: A test that doesn't fail properly cannot be trusted to protect against regressions.

##### Step 3: Implement Minimal Code (GREEN)
- **Action**: Write the simplest, most direct code that makes the failing test pass.
- **Key Point**: Do not anticipate speculative requirements or write unexercised branches.
- **Why**: Minimal code keeps the change set tight and prevents unverified dead logic.

##### Step 4: Verify Suite & Cycle
- **Action**: Run the full test suite to guarantee zero regressions.
- **Key Point**: All tests must be green before proceeding to the next vertical tracer slice.
- **Why**: Catching regressions immediately keeps debugging costs near zero.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"I'll write the implementation first, then add tests."* | **Forbidden: test must be written and observed failing first.** | Tests written after code tend to mirror implementation bias and miss edge-case failures. |
| *"I can mock this internal helper to test the private method."* | **Test only through public seams.** | Mocks on private internals cement architectural rigidity and hide real integration bugs. |
| *"I will write all 15 test cases before writing any code."* | **Vertical tracer slicing: one test at a time.** | Bulk tests lock in premature interface assumptions before real implementation learnings. |
| *"The test passed on the first run without changes."* | **Investigate immediately: tautological or wrong test.** | A test that passes without implementation changes is asserting something already true. |

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "TDD"
  short_description: "Test-driven red-green-refactor"
```

### File: `mocking.md`

#### When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)

Don't mock:

- Your own classes/modules
- Internal collaborators
- Anything you control

##### Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of one generic function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint

### File: `tests.md`

#### Good and Bad Tests

##### Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

##### Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
