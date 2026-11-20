# Plugin files: plugin-eval — `fixtures/`

Source: `plugins/plugin-eval`. Files outside the `skills/*` folders, embedded as text.

## File: `fixtures/coverage-samples/coverage-final.json`

```json
{
  "/workspace/src/sample.ts": {
    "path": "/workspace/src/sample.ts",
    "statementMap": {
      "0": {
        "start": { "line": 1, "column": 0 },
        "end": { "line": 1, "column": 10 }
      },
      "1": {
        "start": { "line": 2, "column": 0 },
        "end": { "line": 2, "column": 10 }
      },
      "2": {
        "start": { "line": 3, "column": 0 },
        "end": { "line": 3, "column": 10 }
      },
      "3": {
        "start": { "line": 4, "column": 0 },
        "end": { "line": 4, "column": 10 }
      }
    },
    "s": {
      "0": 1,
      "1": 1,
      "2": 0,
      "3": 0
    }
  }
}
```

## File: `fixtures/coverage-samples/coverage.xml`

```xml
<?xml version="1.0" ?>
<coverage line-rate="0.82" lines-covered="82" lines-valid="100"></coverage>
```

## File: `fixtures/coverage-samples/lcov.info`

```text
TN:
SF:src/sample.ts
LF:8
LH:6
end_of_record
```

## File: `fixtures/metric-pack/emit-pack.js`

```javascript
const [, , targetPath, targetKind] = process.argv;

console.log(
  JSON.stringify({
    checks: [
      {
        id: "custom-target-kind",
        category: "custom",
        severity: "info",
        status: "info",
        message: `Metric pack saw ${targetKind}`,
        evidence: [targetPath],
        remediation: []
      }
    ],
    metrics: [
      {
        id: "custom-pack-score",
        category: "custom",
        value: 7,
        unit: "points",
        band: "good"
      }
    ],
    artifacts: [
      {
        id: "custom-pack-artifact",
        type: "custom",
        label: "Custom pack artifact",
        description: "Simple fixture artifact"
      }
    ]
  })
);
```

## File: `fixtures/metric-pack/manifest.json`

```json
{
  "name": "team-rubric",
  "version": "1.0.0",
  "supportedTargetKinds": ["skill", "plugin", "directory"],
  "command": ["node", "./emit-pack.js"]
}
```

## File: `fixtures/minimal-plugin/.codex-plugin/plugin.json`

```json
{
  "name": "minimal-plugin",
  "version": "0.1.0",
  "description": "Minimal plugin fixture for plugin-eval tests.",
  "author": {
    "name": "Plugin Eval",
    "email": "support@example.com",
    "url": "https://example.com/"
  },
  "homepage": "https://example.com/",
  "repository": "https://example.com/repo",
  "license": "MIT",
  "keywords": ["fixture", "plugin-eval"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Minimal Plugin",
    "shortDescription": "Small valid plugin fixture",
    "longDescription": "A minimal but valid plugin manifest and one bundled skill for plugin-eval testing.",
    "developerName": "Plugin Eval",
    "category": "Developer Tools",
    "capabilities": ["Interactive", "Write"],
    "websiteURL": "https://example.com/",
    "privacyPolicyURL": "https://example.com/privacy",
    "termsOfServiceURL": "https://example.com/terms",
    "defaultPrompt": [
      "Evaluate the minimal plugin fixture."
    ],
    "brandColor": "#0F766E",
    "composerIcon": "./assets/minimal.svg",
    "logo": "./assets/minimal.svg",
    "screenshots": []
  }
}
```

## Not embedded

- `fixtures/minimal-plugin/assets/minimal.svg` (binary asset, not embedded)

## File: `fixtures/minimal-plugin/skills/minimal-plugin-skill/SKILL.md`

---
name: minimal-plugin-skill
description: Minimal plugin skill fixture. Use when a test needs a valid plugin skill.
---

### Minimal Plugin Skill

Use this bundled skill to verify plugin-level skill discovery.

## File: `fixtures/minimal-skill/SKILL.md`

---
name: minimal-skill
description: Minimal example skill for plugin-eval tests. Use when the user wants a compact demonstration of a well-structured skill.
license: MIT
---

### Minimal Skill

Use this fixture to verify that skill evaluation works on a small but valid example.

#### Workflow

1. Read the target file.
2. Summarize the important structure.
3. Reference deeper details only when needed.

#### Reference

- `references/details.md`

## File: `fixtures/minimal-skill/references/details.md`

### Minimal Skill Details

This file exists so deferred supporting context can be counted without making `SKILL.md` bulky.

## File: `fixtures/multi-skill-plugin/.codex-plugin/plugin.json`

```json
{
  "name": "multi-skill-plugin",
  "version": "0.1.0",
  "description": "Multi-skill plugin fixture for plugin-eval tests.",
  "author": {
    "name": "Plugin Eval",
    "email": "support@example.com",
    "url": "https://example.com/"
  },
  "homepage": "https://example.com/",
  "repository": "https://example.com/repo",
  "license": "MIT",
  "keywords": ["fixture", "plugin-eval", "multi-skill"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Multi Skill Plugin",
    "shortDescription": "Plugin fixture with two skills",
    "longDescription": "A plugin fixture that exposes two skills so nested skill findings can be aggregated.",
    "developerName": "Plugin Eval",
    "category": "Developer Tools",
    "capabilities": ["Interactive", "Write"],
    "websiteURL": "https://example.com/",
    "privacyPolicyURL": "https://example.com/privacy",
    "termsOfServiceURL": "https://example.com/terms",
    "defaultPrompt": [
      "Evaluate the multi-skill plugin fixture.",
      "Compare both skills in this fixture."
    ],
    "brandColor": "#0F766E",
    "composerIcon": "./assets/multi.svg",
    "logo": "./assets/multi.svg",
    "screenshots": []
  }
}
```

## Not embedded

- `fixtures/multi-skill-plugin/assets/multi.svg` (binary asset, not embedded)

## File: `fixtures/multi-skill-plugin/skills/alpha/SKILL.md`

---
name: alpha
description: Alpha fixture skill. Use when plugin-eval tests need one of two bundled skills.
---

### Alpha

Use this fixture skill as the first bundled plugin skill.

## File: `fixtures/multi-skill-plugin/skills/beta/SKILL.md`

---
name: beta
description: Beta fixture skill. Use when plugin-eval tests need the second bundled skill.
---

### Beta

Use this fixture skill as the second bundled plugin skill.

## File: `fixtures/observed-usage/responses.jsonl`

```text
{"id":"resp_1","usage":{"input_tokens":180,"output_tokens":96,"total_tokens":276,"input_token_details":{"cached_tokens":48},"output_tokens_details":{"reasoning_tokens":22}},"metadata":{"scenario":"cold-start refactor task"}}
{"type":"response.done","response":{"id":"resp_2","usage":{"input_tokens":152,"output_tokens":74,"total_tokens":226,"input_token_details":{"cached_tokens":62},"output_tokens_details":{"reasoning_tokens":18}},"metadata":{"scenario":"warm-cache follow-up"}}}
{"response":{"id":"resp_3","usage":{"input_tokens":164,"output_tokens":88,"total_tokens":252,"input_token_details":{"cached_tokens":50}}},"metadata":{"scenario":"bugfix verification"}}
```

## File: `fixtures/ts-python-sample/src/sample.py`

```python
def choose_path(items, include_archived, prefer_fast):
    next_items = []
    for item in items:
        if not item:
            continue
        if include_archived or not item.startswith("archived:"):
            if prefer_fast and "fast" in item:
                next_items.append(item.upper())
            elif (not prefer_fast) and "slow" in item:
                next_items.append(item.lower())
            elif len(item) > 3:
                next_items.append(item)
    return next_items
```

## File: `fixtures/ts-python-sample/src/sample.ts`

```typescript
export function choosePath(items: string[], includeArchived: boolean, preferFast: boolean): string[] {
  const next: string[] = [];
  for (const item of items) {
    if (!item) {
      continue;
    }
    if (includeArchived || !item.startsWith("archived:")) {
      if (preferFast && item.includes("fast")) {
        next.push(item.toUpperCase());
      } else if (!preferFast && item.includes("slow")) {
        next.push(item.toLowerCase());
      } else if (item.length > 3) {
        next.push(item);
      }
    }
  }
  return next;
}
```

## File: `fixtures/ts-python-sample/tests/sample.test.ts`

```typescript
import test from "node:test";
import assert from "node:assert/strict";

import { choosePath } from "../src/sample.ts";

test("choosePath keeps fast items", () => {
  assert.deepEqual(choosePath(["fast:item", "archived:slow"], false, true), ["FAST:ITEM"]);
});
```

## File: `fixtures/ts-python-sample/tests/test_sample.py`

```python
from src.sample import choose_path

def test_choose_path():
    assert choose_path(["fast:item", "archived:slow"], False, True) == ["FAST:ITEM"]
```
