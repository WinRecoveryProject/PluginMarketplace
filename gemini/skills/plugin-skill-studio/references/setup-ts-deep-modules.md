# Skill: setup-ts-deep-modules

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/setup-ts-deep-modules/SKILL.md`

> Enforce TypeScript package boundaries, entry points, and cyclic dependency rules with dependency-cruiser. Use when structuring monorepo packages, establishing public API entry points, or preventing circular imports — even if the user says "fix TS package boundaries". Do NOT use for non-TypeScript repositories.

## Instructions

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](_plugin-references.md#not-embedded); never load companion plugins.

### Setup TS Deep Modules

Configure and verify strict deep-module boundaries across TypeScript packages using `dependency-cruiser`, ensuring public interfaces exist exclusively at package root files while private implementations remain sealed inside subdirectories.

---

#### Core Invariants

1. **Root Files as Exclusive Entry Points**: External callers and consumers may only import package root files (`index.ts`, `client.ts`, `server.ts`); all subdirectories (`lib/`, `internal/`, `tests/`) are private.
2. **Four Strict Dependency Rules**: Enforce (1) Entry-point boundary, (2) Intra-package internal freedom, (3) Tests import entry-points only, (4) Zero dependency cycles.
3. **Barrels Strongly Discouraged**: Expose focused, multiple root entry points instead of giant barrel files that re-export whole subtrees.
4. **Mandatory Biting Proof**: Before completing setup, deliberately introduce a forbidden deep import to verify that `lint:boundaries` fails fast.
5. **No Speculative Path Aliases**: Wire boundary checks directly through dependency-cruiser rather than altering `tsconfig.json` paths or building complex build-time layers.

---

#### Architecture & Map of Content (MOC)

```
src/packages/
  <package-name>/
    index.ts          ◄── Public Entry Point (exported to other packages)
    client.ts         ◄── Additional Public Entry Point
    lib/              ◄── Private Implementation (sealed from outsiders)
    tests/            ◄── Tests (import only root entry points)
```

| Rule | Enforcement | Target |
|---|---|---|
| **Entry Boundary** | `not-to-subfolder` | Outside code $\rightarrow$ root files only |
| **Test Boundary** | `tests-through-entrypoints` | `tests/` $\rightarrow$ root entry points only |
| **Cycle Prevention** | `no-circular` | Disallow all circular dependencies |
| **Verification Gate** | `lint:boundaries` script | Automated CI failure on breach |

---

#### Step-by-Step Procedure (TWI)

##### Step 1: Detect Environment & Package Manager
- **Action**: Detect the package manager (`bun.lockb` $\rightarrow$ bun, `pnpm-lock.yaml` $\rightarrow$ pnpm, `yarn.lock` $\rightarrow$ yarn, else npm) and locate the packages root (`src/packages` or `packages`).
- **Key Point**: Check for existing `.dependency-cruiser.*` configuration to merge rules rather than overwriting.
- **Why**: Preserving existing project package manager standards ensures zero friction with current CI scripts.

##### Step 2: Install and Configure Dependency Cruiser
- **Action**: Install `dependency-cruiser` as a devDependency and copy `dependency-cruiser.config.cjs` to `.dependency-cruiser.cjs` with updated `PACKAGES_ROOT`.
- **Key Point**: Use `.cjs` extension so CommonJS exports function seamlessly in ESM / `"type": "module"` projects.
- **Inline Checklist**:
  - [ ] Package manager identified correctly
  - [ ] `dependency-cruiser` added to `devDependencies`
  - [ ] `.dependency-cruiser.cjs` configured with 4 core rules

##### Step 3: Wire Scripts & Scaffold Clean Example
- **Action**: Add `"lint:boundaries": "depcruise <packages-root>"` to `package.json` and create an example deep package:
  - `<packages-root>/example/index.ts` (public entry point delegating to `lib/`)
  - `<packages-root>/example/lib/impl.ts` (hidden implementation)
  - `<packages-root>/example/tests/example.test.ts` (imports `../index`)
- **Why**: A reference package serves as living documentation and a starter template for developers.

##### Step 4: Prove the Rules Bite (Verification Gate)
- **Action**: Execute three validation passes:
  1. Run `lint:boundaries` $\rightarrow$ must **PASS** on clean repo.
  2. Add deep import `import { impl } from "../lib/impl"` in test $\rightarrow$ must **FAIL**.
  3. Revert deep import and run `lint:boundaries` $\rightarrow$ must **PASS**.
- **Key Point**: Never sign off on boundary rules without observing an intentional test failure.
- **Why**: Unproven linter configs frequently have syntax or glob errors that silently pass all code.

##### Step 5: Document Package Conventions & Agent Pointer
- **Action**: Create `<packages-root>/README.md` explaining layout and rules, and add a single-line context pointer in `AGENTS.md` / `CLAUDE.md`.
- **Key Point**: Explicitly explain why barrel files are discouraged.
- **Why**: Agent pointers ensure future autonomous sessions respect package boundaries from their first prompt.

---

#### Anti-Rationalization Guardrails

| Tempting Rationalization | Binding Rule | Engineering Rationale |
|---|---|---|
| *"Skip testing whether the rule fails on bad imports."* | **Mandatory 3-step proof (Pass $\rightarrow$ Fail $\rightarrow$ Pass).** | Linters with invalid glob configurations pass silently without enforcing anything. |
| *"Export all submodules through a giant root index.ts barrel."* | **Discourage large barrel files.** | Giant barrels destroy tree-shaking and create hidden cyclic import dependencies. |
| *"Import directly from lib/ in unit tests for convenience."* | **Enforce tests through public entry points only.** | Deep imports in tests tightly couple test suites to volatile internal refactors. |

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Setup TS Deep Modules"
  short_description: "Enforce deep TypeScript modules"
```

### File: `dependency-cruiser.config.cjs`

```javascript
// @ts-check
// Deep-module enforcement for dependency-cruiser.
//
// Each package under the packages root is a DEEP MODULE: a lot of behaviour
// behind a small interface. A package's PUBLIC SURFACE is its ENTRY POINTS:
// the files at the package root. Implementation lives in SUBFOLDERS and is
// private (by convention `lib/` for implementation and `tests/` for tests,
// though any subfolder is private). A package may expose several small entry
// points (index.ts, client.ts, server.ts, …); prefer that over one giant
// barrel index.
//
// The only thing you should ever need to edit here is PACKAGES_ROOT.

/** Where packages live. One immediate child dir per package (flat, no nesting). */
const PACKAGES_ROOT = "src/packages";

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
/**
 * A package's private internals: anything nested inside a package subfolder.
 * The package's root files are its entry points and are NOT matched here:
 * they stay importable from outside.
 */
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` }, // importer is NOT inside any package
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: "error",
      // importer is inside a package ($1), but is not a test file
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`, // same package → intra-package freedom
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "A package's tests exercise it through its entry points like everyone else: they may import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` }, // a test file, in package $1
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`, // own tests/ fixtures → allowed
      },
    },
    {
      name: "tests-folder-is-private",
      comment:
        "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` }, // importer is not itself a test
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles. Scope to `^${R}/` if you want to allow cycles outside packages.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // --- Layering (optional, off by default) ----------------------------------
    // Interface-hiding controls HOW you import (through the entry points).
    // Layering controls WHICH packages may depend on which. Add your own rules
    // here, e.g.:
    //
    // {
    //   name: "ui-may-not-depend-on-billing",
    //   severity: "error",
    //   from: { path: `^${R}/ui/` },
    //   to:   { path: `^${R}/billing/` },
    // },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
