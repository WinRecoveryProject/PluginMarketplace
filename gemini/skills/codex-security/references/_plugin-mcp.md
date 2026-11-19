# Plugin files: codex-security — `mcp/`

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `mcp/server.mjs`

```javascript
import { Buffer } from "node:buffer";
import { readFile, readdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const runtimeChunkNames = (await readdir(new URL("./", import.meta.url)))
  .filter((name) => name.startsWith("server.mjs.br.part-"))
  .sort();
if (!runtimeChunkNames.length) {
  throw new Error("Missing compressed Codex Security MCP server runtime chunks.");
}
const compressedRuntime = Buffer.concat(
  await Promise.all(runtimeChunkNames.map((name) => readFile(new URL(`./${name}`, import.meta.url))))
);
const runtimeSource = brotliDecompressSync(compressedRuntime).toString("utf8");
const require = createRequire(import.meta.url);
const Module = require("node:module");
const loaderPath = fileURLToPath(import.meta.url);
const runtimeModule = new Module(loaderPath);
runtimeModule.filename = loaderPath;
runtimeModule.paths = Module._nodeModulePaths(dirname(loaderPath));
runtimeModule._compile(runtimeSource, loaderPath);
```

## Not embedded

- `mcp/server.mjs.br.part-000` (binary asset, not embedded)

## Not embedded

- `mcp/server.mjs.br.part-001` (binary asset, not embedded)
