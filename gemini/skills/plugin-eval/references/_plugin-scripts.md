# Plugin files: plugin-eval — `scripts/`

Source: `plugins/plugin-eval`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/plugin-eval.js`

```javascript
#!/usr/bin/env node

import { runCli } from "../src/cli.js";

runCli(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
```
