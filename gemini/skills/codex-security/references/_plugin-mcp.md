# Plugin files: codex-security — `mcp/`

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `mcp/fzstd-LICENSE.txt`

```text
MIT License

Copyright (c) 2020 Arjun Barrett

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

## File: `mcp/helpers.mjs`

```javascript
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const compressedRuntime = await readFile(new URL("./helpers.mjs.br", import.meta.url));
const runtimeSource = brotliDecompressSync(compressedRuntime).toString("utf8");
const require = createRequire(import.meta.url);
const Module = require("node:module");
const loaderPath = fileURLToPath(import.meta.url);
const runtimeModule = new Module(loaderPath);
runtimeModule.filename = loaderPath;
runtimeModule.paths = Module._nodeModulePaths(dirname(loaderPath));
runtimeModule._compile(runtimeSource, loaderPath);
export default runtimeModule.exports;
```

## Not embedded

- `mcp/helpers.mjs.br` (binary asset, not embedded)

## Not embedded

- `mcp/native/COPYRIGHT-library.html` (273 KB, too large to embed — read it in the repository)

## Not embedded

- `mcp/native/THIRD_PARTY_NOTICES.txt` (280 KB, too large to embed — read it in the repository)

## Not embedded

- `mcp/native/darwin-arm64/unix.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/darwin-x64/unix.node` (binary asset, not embedded)

## File: `mcp/native/licenses/Apache-2.0.txt`

```text
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.

"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, "control" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity.

"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.

"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.

"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work (an example is provided in the Appendix below).

"Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship. For the purposes of this License, Derivative Works shall not include works that remain separable from, or merely link (or bind by name) to the interfaces of, the Work and Derivative Works thereof.

"Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner. For the purposes of this definition, "submitted" means any form of electronic, verbal, or written communication sent to the Licensor or its representatives, including but not limited to communication on electronic mailing lists, source code control systems, and issue tracking systems that are managed by, or on behalf of, the Licensor for the purpose of discussing and improving the Work, but excluding communication that is conspicuously marked or otherwise designated in writing by the copyright owner as "Not a Contribution."

"Contributor" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor and subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work or a Contribution incorporated within the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:

     (a) You must give any other recipients of the Work or Derivative Works a copy of this License; and

     (b) You must cause any modified files to carry prominent notices stating that You changed the files; and

     (c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and

     (d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, excluding those notices that do not pertain to any part of the Derivative Works, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear. The contents of the NOTICE file are for informational purposes only and do not modify the License. You may add Your own attribution notices within Derivative Works that You distribute, alongside or as an addendum to the NOTICE text from the Work, provided that such additional attribution notices cannot be construed as modifying the License.

     You may add Your own copyright statement to Your modifications and may provide additional or different license terms and conditions for use, reproduction, or distribution of Your modifications, or for any such Derivative Works as a whole, provided Your use, reproduction, and distribution of the Work otherwise complies with the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions. Notwithstanding the above, nothing herein shall supersede or modify the terms of any separate license agreement you may have executed with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses), even if such Contributor has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, You may act only on Your own behalf and on Your sole responsibility, not on behalf of any other Contributor, and only if You agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

APPENDIX: How to apply the Apache License to your work.

To apply the Apache License to your work, attach the following boilerplate notice, with the fields enclosed by brackets "[]" replaced with your own identifying information. (Don't include the brackets!)  The text should be enclosed in the appropriate comment syntax for the file format. We also recommend that a file or class name and description of purpose be included on the same "printed page" as the copyright notice for easier identification within third-party archives.

Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## File: `mcp/native/licenses/BSD-2-Clause.txt`

```text
Copyright (c) <year> <owner> 

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## File: `mcp/native/licenses/MIT.txt`

```text
MIT License

Copyright (c) <year> <copyright holders>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## File: `mcp/native/licenses/Unicode-3.0.txt`

```text
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2024 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
```

## Not embedded

- `mcp/native/linux-arm64-gnu/unix.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/linux-arm64-musl/unix.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/linux-x64-gnu/unix.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/linux-x64-musl/unix.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/win32-arm64/windows.node` (binary asset, not embedded)

## Not embedded

- `mcp/native/win32-x64/windows.node` (binary asset, not embedded)

## File: `mcp/package.json`

```json
{"private":true}
```

## File: `mcp/permission-profile-preflight.mjs`

```javascript
// src/record.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord(value) {
  return isRecord(value) ? value : void 0;
}

// src/deep-scan/permission-profile-preflight.ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { isDeepStrictEqual } from "node:util";

// package.json
var version = "0.1.161";

// src/deep-scan/errors.ts
var DeepScanNonRetryableError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "DeepScanNonRetryableError";
  }
};

// src/executable-path.ts
import { win32 } from "node:path";
function executablePathForSpawn(command) {
  if (process.platform !== "win32" || !win32.isAbsolute(command))
    return command;
  const root = win32.parse(command).root;
  return root === "\\" || root === "/" ? command : win32.toNamespacedPath(command);
}

// ../scripts/codex_profile.mjs
function isPermissionProfileFallbackWarning(message, profileId) {
  if (typeof message !== "string") return false;
  const prefix = `Configured value for \`permission_profile\` is disallowed by requirements; falling back from \`${profileId}\` to required value \``;
  const warning = message.trim();
  return warning.startsWith(prefix) && warning.endsWith("`.");
}

// src/deep-scan/permission-profile-preflight.ts
var DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID = "codex_security_deep_scan_worker";
async function readDeepScanRuntimeConfig(options, inspect) {
  return withPreflightClient(options, async (client) => {
    const response = await client.request("config/read", {
      cwd: options.configCwd ?? options.cwd,
      includeLayers: false
    });
    let config = asRecord(response.config);
    if (!config) throw malformedPreflightError(options.context);
    if (options.plugin) {
      const detail = await client.request("plugin/read", options.plugin).catch(() => void 0);
      options.signal.throwIfAborted();
      const plugin = asRecord(detail?.plugin);
      const summary = asRecord(plugin?.summary);
      const servers = plugin?.mcpServers;
      if (summary?.installed !== true || summary.enabled !== true || !Array.isArray(servers) || !servers.every((name) => typeof name === "string"))
        return void 0;
      config = {
        ...config,
        mcp_servers: {
          ...Object.fromEntries(servers.map((name) => [name, {}])),
          ...asRecord(config.mcp_servers)
        }
      };
    }
    if (!inspect) return config;
    return inspect(config, async (serverName) => {
      const result = await client.request("mcpServerStatus/list", {
        serverName,
        detail: "toolsAndAuthOnly"
      }).catch(() => void 0);
      options.signal.throwIfAborted();
      const match = Array.isArray(result?.data) ? result.data.map(asRecord).find((entry) => entry?.name === serverName) : void 0;
      const tools = asRecord(match?.tools);
      return match?.toolsError === null && tools !== void 0 && Object.keys(tools).length === 0;
    });
  });
}
async function readDeepScanRuntimeConfigWithOrigins(options) {
  return withPreflightClient(
    options,
    (client) => client.request("config/read", { cwd: options.cwd, includeLayers: true })
  );
}
async function readDeepScanParentCyberAccessProgram(options) {
  return withPreflightClient(options, async (client) => {
    let response;
    try {
      response = await client.request("thread/read", {
        threadId: options.parentTurn.threadId,
        includeTurns: false
      });
    } catch (error) {
      const nativeError = asRecord(
        error instanceof Error ? error.cause : void 0
      );
      if (nativeError?.code === -32600 && nativeError.message === `thread not loaded: ${options.parentTurn.threadId}`)
        return void 0;
      throw error;
    }
    const thread = asRecord(response.thread);
    if (thread?.id !== options.parentTurn.threadId || typeof thread.path !== "string")
      return void 0;
    const input = createReadStream(thread.path, { encoding: "utf8" });
    const lines = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        const entry = asRecord(JSON.parse(line));
        if (entry?.type !== "turn_context") continue;
        const context = asRecord(entry.payload);
        if (context?.turn_id !== options.parentTurn.turnId) continue;
        const program = context.cyber_access_program;
        return typeof program === "string" ? program : void 0;
      }
      return void 0;
    } finally {
      lines.close();
      input.destroy();
    }
  });
}
async function prepareCliDeepScanSession(options) {
  return withPreflightClient(options, async (client) => {
    const response = await client.request("thread/start", {
      cwd: options.cwd,
      threadSource: "security_scan",
      ephemeral: false
    });
    const thread = asRecord(response.thread);
    if (typeof thread?.id !== "string" || typeof thread.path !== "string" || typeof response.model !== "string") {
      throw new Error("Codex did not return the owning Deep Scan session.");
    }
    await client.request("thread/inject_items", {
      threadId: thread.id,
      items: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: options.prompt }]
        }
      ]
    });
    let permissionProfile;
    const input = createReadStream(thread.path, { encoding: "utf8" });
    const lines = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        const entry = asRecord(JSON.parse(line));
        if (entry?.type === "turn_context") {
          permissionProfile = asRecord(entry.payload)?.permission_profile;
        }
      }
    } finally {
      lines.close();
      input.destroy();
    }
    if (permissionProfile === void 0) {
      throw new Error(
        "Codex did not persist the Deep Scan session's effective permissions."
      );
    }
    return {
      threadId: thread.id,
      model: response.model,
      ...typeof response.reasoningEffort === "string" ? { reasoningEffort: response.reasoningEffort } : {},
      permissionProfile
    };
  });
}
async function preflightDeepScanWorkerPermissionProfile(options) {
  return withPreflightClient(options, async (client) => {
    const configResponse = await client.request("config/read", {
      cwd: options.cwd,
      includeLayers: false
    });
    const catalog = await client.readPermissionProfileCatalog(options.cwd);
    const matchingEntries = catalog.filter(
      (entry) => entry.id === DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID
    );
    if (matchingEntries.length !== 1)
      throw malformedPreflightError(options.context);
    const catalogEntry = matchingEntries[0];
    const requirementsResponse = catalogEntry.allowed === true ? void 0 : await client.readConfigRequirementsForClassification();
    verifyPreflightResult(
      options,
      configResponse,
      catalogEntry,
      requirementsResponse
    );
    const config = asRecord(configResponse.config);
    const mcpServerNames = Object.keys(asRecord(config?.mcp_servers) ?? {});
    if (!options.allowOpenAiApiKeyFallback || config?.forced_login_method === "chatgpt") {
      return { useOpenAiApiKey: false, mcpServerNames };
    }
    const account = await client.request("account/read", {
      refreshToken: false
    });
    return {
      mcpServerNames,
      useOpenAiApiKey: account.requiresOpenaiAuth === true && account.account === null
    };
  });
}
async function withPreflightClient(options, operation) {
  if (options.signal.aborted)
    throw abortError(options.signal.reason, options.context);
  const client = new AppServerPreflightClient(options);
  try {
    await client.initialize();
    return await operation(client);
  } catch (error) {
    await client.close();
    const stderr = client.stderrText;
    if (error instanceof Error && stderr)
      Object.defineProperty(error, "message", {
        value: error.message + "\n" + stderr,
        writable: true,
        configurable: true,
        enumerable: false
      });
    throw error;
  } finally {
    await client.close();
  }
}
var AppServerPreflightClient = class {
  constructor(options) {
    this.options = options;
    const args = [
      ...options.appServerArgs ?? options.commandArgs ?? []
    ];
    if (options.appServerArgs === void 0) {
      for (const override of options.configOverrides) {
        args.push("--config", override);
      }
      for (const override of options.providerConfigOverrides ?? []) {
        args.push("--config", override);
      }
      args.push("app-server", "--stdio");
      if (options.configCwd !== void 0) args.push("--cd", options.configCwd);
    }
    this.child = spawn(executablePathForSpawn(options.codexPath), args, {
      cwd: options.cwd,
      ...options.env === void 0 ? {} : { env: options.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    this.childClose = new Promise((resolve) => {
      this.child.once("close", () => {
        this.childClosed = true;
        resolve();
      });
    });
    this.child.stderr.on("data", (chunk) => this.stderr.push(chunk));
    this.stdoutLines = createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity
    });
    this.stdoutLines.on("line", (line) => this.consumeStdoutLine(line));
    this.stdoutLines.on("error", this.onStdioError);
    this.child.stdin.on("error", this.onStdioError);
    this.child.on("error", (error) => {
      this.fail(
        codexExecutableStartError(options.codexPath, error, options.context)
      );
    });
    this.child.on("close", (code, signal) => {
      if (!this.closed) {
        this.fail(
          codexExecutableExitError(
            options.codexPath,
            code,
            signal,
            options.context
          )
        );
      }
    });
    const onAbort = () => {
      this.fail(abortError(options.signal.reason, options.context));
      this.stopChild();
    };
    options.signal.addEventListener("abort", onAbort, { once: true });
    this.removeAbortListener = () => options.signal.removeEventListener("abort", onAbort);
  }
  options;
  child;
  childClose;
  stdoutLines;
  pending;
  nextId = 1;
  stderr = [];
  terminalError;
  closed = false;
  childClosed = false;
  removeAbortListener;
  onStdioError = (error) => {
    const failure = codexExecutableStdioError(
      this.options.codexPath,
      this.options.context
    );
    failure.message += "\n" + error.message;
    this.fail(failure);
  };
  get stderrText() {
    return Buffer.concat(this.stderr).toString("utf8");
  }
  async initialize() {
    await this.request("initialize", {
      clientInfo: {
        name: "codex_security_deep_scan",
        title: "Codex Security Deep Scan",
        version
      },
      capabilities: { experimentalApi: true }
    });
    if (this.terminalError) throw this.terminalError;
    this.write({ jsonrpc: "2.0", method: "initialized", params: {} });
  }
  async readPermissionProfileCatalog(cwd) {
    const entries = [];
    const seenCursors = /* @__PURE__ */ new Set();
    let cursor;
    while (true) {
      const result = await this.request("permissionProfile/list", {
        cwd,
        ...cursor === void 0 ? {} : { cursor }
      });
      const data = result.data;
      if (!Array.isArray(data))
        throw malformedPreflightError(this.options.context);
      for (const value of data) {
        const entry = asRecord(value);
        if (!entry || typeof entry.id !== "string") {
          throw malformedPreflightError(this.options.context);
        }
        if (typeof entry.allowed !== "boolean")
          throw malformedPreflightError(this.options.context);
        entries.push(entry);
      }
      const nextCursor = result.nextCursor;
      if (nextCursor === null) return entries;
      if (typeof nextCursor !== "string" || nextCursor.length === 0 || seenCursors.has(nextCursor)) {
        throw malformedPreflightError(this.options.context);
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }
  /**
   * Classification is best effort after the catalog already rejected the
   * profile. An older runtime may not expose this API; that is still a safe
   * generic managed-policy rejection, not a reason to guess at remediation.
   */
  async readConfigRequirementsForClassification() {
    try {
      return await this.request("configRequirements/read");
    } catch (error) {
      if (this.options.signal.aborted || isAbortError(error)) throw error;
      return void 0;
    }
  }
  request(method, params) {
    if (this.terminalError) return Promise.reject(this.terminalError);
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending = { id, method, resolve, reject };
      this.write({
        jsonrpc: "2.0",
        id,
        method,
        ...params === void 0 ? {} : { params }
      });
    });
  }
  async close() {
    this.closed = true;
    this.removeAbortListener();
    this.stopChild();
    if (this.childClosed) return;
    const forcedTermination = setTimeout(() => {
      if (this.child.exitCode === null && this.child.signalCode === null) {
        this.child.kill("SIGKILL");
      }
      this.child.stdin.destroy();
      this.child.stdout.destroy();
      this.child.stderr.destroy();
    }, 1e3);
    try {
      await this.childClose;
    } finally {
      clearTimeout(forcedTermination);
    }
  }
  write(message) {
    if (!this.child.stdin.writable) {
      this.fail(
        codexExecutableStdioError(this.options.codexPath, this.options.context)
      );
      return;
    }
    this.child.stdin.write(`${JSON.stringify(message)}
`, (error) => {
      if (error) this.onStdioError(error);
    });
  }
  consumeStdoutLine(line) {
    if (this.terminalError || line.trim().length === 0) return;
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      this.fail(malformedPreflightError(this.options.context));
      return;
    }
    const message = asRecord(value);
    if (!message) {
      this.fail(malformedPreflightError(this.options.context));
      return;
    }
    const id = message.id;
    if (typeof id !== "number") {
      return;
    }
    const pending = this.pending;
    if (!pending || pending.id !== id) {
      this.fail(malformedPreflightError(this.options.context));
      return;
    }
    this.pending = void 0;
    if (message.error !== void 0) {
      pending.reject(
        jsonRpcPreflightError(
          this.options.codexPath,
          pending.method,
          message.error,
          this.options.context
        )
      );
      return;
    }
    const result = asRecord(message.result);
    if (!result) {
      pending.reject(malformedPreflightError(this.options.context));
      return;
    }
    pending.resolve(result);
  }
  fail(error) {
    if (this.terminalError) return;
    this.terminalError = error;
    this.pending?.reject(error);
    this.pending = void 0;
  }
  stopChild() {
    this.stdoutLines.close();
    if (!this.child.stdin.destroyed) this.child.stdin.end();
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill("SIGTERM");
    }
  }
};
function verifyPreflightResult(options, configResponse, catalogEntry, requirementsResponse) {
  if (catalogEntry.allowed !== true) {
    throw existingAllowlistExcludesProfile(requirementsResponse) ? disallowedProfileAllowlistError(options.context) : managedPolicyRejectedError(options.context);
  }
  const config = asRecord(configResponse.config);
  const permissions = asRecord(config?.permissions);
  const actualProfile = permissions ? asRecord(permissions[DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID]) : void 0;
  if (!config || !permissions || !actualProfile || typeof config.default_permissions !== "string")
    throw malformedPreflightError(options.context);
  if (config.default_permissions !== DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID) {
    throw profileNotSelectedError(options.context);
  }
  const expectedProfile = comparableProfile(options.expectedProfile);
  const actualWithoutDescription = comparableProfile(actualProfile);
  if (!isDeepStrictEqual(actualWithoutDescription, expectedProfile)) {
    throw profileCollisionError(options.context);
  }
}
function existingAllowlistExcludesProfile(response) {
  if (!response || !Object.hasOwn(response, "requirements")) return false;
  if (response.requirements === null) return false;
  const requirements = asRecord(response.requirements);
  if (!requirements || !Object.hasOwn(requirements, "allowedPermissionProfiles"))
    return false;
  if (requirements.allowedPermissionProfiles === null) return false;
  const allowlist = asRecord(requirements.allowedPermissionProfiles);
  if (!allowlist) return false;
  if (Object.values(allowlist).some((value) => typeof value !== "boolean"))
    return false;
  return allowlist[DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID] !== true;
}
function comparableProfile(value) {
  const { description: _description, ...rest } = stripNullObjectFields(
    value
  );
  return rest;
}
function stripNullObjectFields(value) {
  if (Array.isArray(value))
    return value.map((entry) => stripNullObjectFields(entry));
  const object = asRecord(value);
  if (!object) return value;
  return Object.fromEntries(
    Object.entries(object).filter(([, entry]) => entry !== null).map(([key, entry]) => [key, stripNullObjectFields(entry)])
  );
}
function disallowedProfileAllowlistError(context) {
  return new DeepScanNonRetryableError(
    `${subject(context)} cannot safely start a read-only worker because organization policy does not allow the required \`${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}\` permission profile. Ask your Codex administrator to define this read-only stub in a normal config layer:

[permissions.${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}]
extends = ":read-only"

and add this entry to your existing allowlist in requirements.toml:

[allowed_permission_profiles]
${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID} = true

${subject(context)} did not run.`
  );
}
function managedPolicyRejectedError(context) {
  return new DeepScanNonRetryableError(
    `${subject(context)} cannot safely start a read-only worker because managed Codex policy rejected the required \`${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}\` permission profile. Ask your Codex administrator to review the managed permission, sandbox, and filesystem requirements. ${subject(context)} did not run.`
  );
}
function profileNotSelectedError(context) {
  return new DeepScanNonRetryableError(
    `${subject(context)} cannot safely start a read-only worker because Codex did not select the required \`${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}\` permission profile. Ask your Codex administrator to allow that profile for ${subject(context)}. ${subject(context)} did not run.`
  );
}
function profileCollisionError(context) {
  return new DeepScanNonRetryableError(
    `${subject(context)} cannot safely start a read-only worker because existing Codex configuration changes the reserved \`${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}\` permission profile. Ask your Codex administrator to keep the normal-config \`[permissions.${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}]\` stub limited to \`extends = ":read-only"\`; ${subject(context)} supplies its deny rules at runtime. ${subject(context)} did not run.`
  );
}
function failedOperation(context) {
  return context === "parent-config" ? "Could not read the Deep Scan parent configuration" : `${subject(context)} cannot safely verify its read-only worker permission profile`;
}
function malformedPreflightError(context) {
  return new Error(
    context === "parent-config" ? `${failedOperation(context)}. Codex returned an invalid app-server response.` : `${failedOperation(context)} with this Codex configuration. ${subject(context)} did not run.`
  );
}
function unsupportedCodexApiError(codexPath, api, context) {
  return new DeepScanNonRetryableError(
    failedOperation(context) + " because the selected Codex executable " + JSON.stringify(codexPath) + " does not support the required " + JSON.stringify(api) + " API. Update the Codex installation at that path (the desktop app if it is bundled, otherwise the selected CLI) and retry. " + subject(context) + " did not run."
  );
}
function jsonRpcPreflightError(codexPath, method, value, context) {
  const error = asRecord(value);
  const code = typeof error?.code === "number" && Number.isFinite(error.code) ? error.code : void 0;
  if (code === -32601) {
    const failure = unsupportedCodexApiError(codexPath, method, context);
    if (typeof error?.message === "string")
      failure.message += "\n" + error.message;
    return failure;
  }
  return new Error(
    failedOperation(context) + " because the selected Codex executable " + JSON.stringify(codexPath) + " returned an error for " + JSON.stringify(method) + (code === void 0 ? "" : " (JSON-RPC code " + code + ")") + ". Check the Codex configuration and retry. " + subject(context) + " did not run." + (typeof error?.message === "string" ? "\n" + error.message : ""),
    { cause: value }
  );
}
function codexExecutableStartError(codexPath, error, context) {
  const value = "code" in error ? error.code : void 0;
  const code = typeof value === "string" && /^[A-Z0-9_]+$/u.test(value) ? value : void 0;
  const codeDetail = code === void 0 ? "" : " (" + code + ")";
  return new Error(
    codexExecutableFailureMessage(
      codexPath,
      "could not start" + codeDetail,
      context
    ) + "\n" + error.message,
    { cause: error }
  );
}
function codexExecutableExitError(codexPath, code, signal, context) {
  const operation = context === "parent-config" ? "the configuration read" : "permission-profile verification";
  const detail = code !== null ? `exited before ${operation} completed with code ${code}` : signal !== null ? `was terminated before ${operation} completed by signal ${signal}` : `exited before ${operation} completed`;
  return new Error(codexExecutableFailureMessage(codexPath, detail, context));
}
function codexExecutableStdioError(codexPath, context) {
  return new Error(
    codexExecutableFailureMessage(
      codexPath,
      "could not exchange app-server JSON-RPC over stdio",
      context
    )
  );
}
function codexExecutableFailureMessage(codexPath, detail, context) {
  if (context === "parent-config")
    return `${failedOperation(context)}. Codex executable ${JSON.stringify(codexPath)} ${detail}.`;
  return subject(context) + " cannot safely verify its read-only worker permission profile because the selected Codex executable " + JSON.stringify(codexPath) + " " + detail + ". Check that the named executable runs with --version, and check CODEX_CLI_PATH/PATH, then retry. " + subject(context) + " did not run.";
}
function deepScanPermissionProfileFallbackError(message) {
  if (typeof message !== "string") return void 0;
  if (!isPermissionProfileFallbackWarning(
    message,
    DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID
  ))
    return void 0;
  return new DeepScanNonRetryableError(
    `Deep Scan stopped a worker because organization policy rejected the required \`${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}\` permission profile after the turn started. The worker was stopped and its results were discarded. Ask your Codex administrator to define this read-only stub in a normal config layer:

[permissions.${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID}]
extends = ":read-only"

and add this entry to your existing allowlist in requirements.toml:

[allowed_permission_profiles]
${DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID} = true
${message}`
  );
}
function subject(context) {
  return context === "helper" ? "Read-only Codex helper" : "Deep Scan";
}
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function abortError(reason, context) {
  if (reason instanceof Error) return reason;
  return new DOMException(
    context === "parent-config" ? "Deep Scan parent configuration read aborted." : "Deep Scan worker permission profile preflight aborted.",
    "AbortError"
  );
}
export {
  DEEP_SCAN_WORKER_PERMISSION_PROFILE_ID,
  deepScanPermissionProfileFallbackError,
  preflightDeepScanWorkerPermissionProfile,
  prepareCliDeepScanSession,
  readDeepScanParentCyberAccessProgram,
  readDeepScanRuntimeConfig,
  readDeepScanRuntimeConfigWithOrigins
};
```

## File: `mcp/server.mjs`

```javascript
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const compressedRuntime = await readFile(new URL("./server.mjs.br", import.meta.url));
const runtimeSource = brotliDecompressSync(compressedRuntime).toString("utf8");
const require = createRequire(import.meta.url);
const Module = require("node:module");
const loaderPath = fileURLToPath(import.meta.url);
const runtimeModule = new Module(loaderPath);
runtimeModule.filename = loaderPath;
runtimeModule.paths = Module._nodeModulePaths(dirname(loaderPath));
runtimeModule._compile(runtimeSource, loaderPath);
export default runtimeModule.exports;
```

## Not embedded

- `mcp/server.mjs.br` (binary asset, not embedded)

## File: `mcp/session-decompression.mjs`

```javascript
// src/session-decompression.ts
import { Transform } from "node:stream";

// node_modules/.pnpm/fzstd@0.1.1/node_modules/fzstd/esm/index.mjs
var ab = ArrayBuffer;
var u8 = Uint8Array;
var u16 = Uint16Array;
var i16 = Int16Array;
var i32 = Int32Array;
var slc = function(v, s, e) {
  if (u8.prototype.slice)
    return u8.prototype.slice.call(v, s, e);
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  var n = new u8(e - s);
  n.set(v.subarray(s, e));
  return n;
};
var fill = function(v, n, s, e) {
  if (u8.prototype.fill)
    return u8.prototype.fill.call(v, n, s, e);
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  for (; s < e; ++s)
    v[s] = n;
  return v;
};
var cpw = function(v, t, s, e) {
  if (u8.prototype.copyWithin)
    return u8.prototype.copyWithin.call(v, t, s, e);
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  while (s < e) {
    v[t++] = v[s++];
  }
};
var ec = [
  "invalid zstd data",
  "window size too large (>2046MB)",
  "invalid block type",
  "FSE accuracy too high",
  "match distance too far back",
  "unexpected EOF"
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var rb = function(d, b, n) {
  var i = 0, o = 0;
  for (; i < n; ++i)
    o |= d[b++] << (i << 3);
  return o;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var rzfh = function(dat, w) {
  var n3 = dat[0] | dat[1] << 8 | dat[2] << 16;
  if (n3 == 3126568 && dat[3] == 253) {
    var flg = dat[4];
    var ss = flg >> 5 & 1, cc = flg >> 2 & 1, df = flg & 3, fcf = flg >> 6;
    if (flg & 8)
      err(0);
    var bt = 6 - ss;
    var db = df == 3 ? 4 : df;
    var di = rb(dat, bt, db);
    bt += db;
    var fsb = fcf ? 1 << fcf : ss;
    var fss = rb(dat, bt, fsb) + (fcf == 1 && 256);
    var ws = fss;
    if (!ss) {
      var wb = 1 << 10 + (dat[5] >> 3);
      ws = wb + (wb >> 3) * (dat[5] & 7);
    }
    if (ws > 2145386496)
      err(1);
    var buf = new u8((w == 1 ? fss || ws : w ? 0 : ws) + 12);
    buf[0] = 1, buf[4] = 4, buf[8] = 8;
    return {
      b: bt + fsb,
      y: 0,
      l: 0,
      d: di,
      w: w && w != 1 ? w : buf.subarray(12),
      e: ws,
      o: new i32(buf.buffer, 0, 3),
      u: fss,
      c: cc,
      m: Math.min(131072, ws)
    };
  } else if ((n3 >> 4 | dat[3] << 20) == 25481893) {
    return b4(dat, 4) + 8;
  }
  err(0);
};
var msb = function(val) {
  var bits = 0;
  for (; 1 << bits <= val; ++bits)
    ;
  return bits - 1;
};
var rfse = function(dat, bt, mal) {
  var tpos = (bt << 3) + 4;
  var al = (dat[bt] & 15) + 5;
  if (al > mal)
    err(3);
  var sz = 1 << al;
  var probs = sz, sym = -1, re = -1, i = -1, ht = sz;
  var buf = new ab(512 + (sz << 2));
  var freq = new i16(buf, 0, 256);
  var dstate = new u16(buf, 0, 256);
  var nstate = new u16(buf, 512, sz);
  var bb1 = 512 + (sz << 1);
  var syms = new u8(buf, bb1, sz);
  var nbits = new u8(buf, bb1 + sz);
  while (sym < 255 && probs > 0) {
    var bits = msb(probs + 1);
    var cbt = tpos >> 3;
    var msk = (1 << bits + 1) - 1;
    var val = (dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (tpos & 7) & msk;
    var msk1fb = (1 << bits) - 1;
    var msv = msk - probs - 1;
    var sval = val & msk1fb;
    if (sval < msv)
      tpos += bits, val = sval;
    else {
      tpos += bits + 1;
      if (val > msk1fb)
        val -= msv;
    }
    freq[++sym] = --val;
    if (val == -1) {
      probs += val;
      syms[--ht] = sym;
    } else
      probs -= val;
    if (!val) {
      do {
        var rbt = tpos >> 3;
        re = (dat[rbt] | dat[rbt + 1] << 8) >> (tpos & 7) & 3;
        tpos += 2;
        sym += re;
      } while (re == 3);
    }
  }
  if (sym > 255 || probs)
    err(0);
  var sympos = 0;
  var sstep = (sz >> 1) + (sz >> 3) + 3;
  var smask = sz - 1;
  for (var s = 0; s <= sym; ++s) {
    var sf = freq[s];
    if (sf < 1) {
      dstate[s] = -sf;
      continue;
    }
    for (i = 0; i < sf; ++i) {
      syms[sympos] = s;
      do {
        sympos = sympos + sstep & smask;
      } while (sympos >= ht);
    }
  }
  if (sympos)
    err(0);
  for (i = 0; i < sz; ++i) {
    var ns = dstate[syms[i]]++;
    var nb = nbits[i] = al - msb(ns);
    nstate[i] = (ns << nb) - sz;
  }
  return [tpos + 7 >> 3, {
    b: al,
    s: syms,
    n: nbits,
    t: nstate
  }];
};
var rhu = function(dat, bt) {
  var i = 0, wc = -1;
  var buf = new u8(292), hb = dat[bt];
  var hw = buf.subarray(0, 256);
  var rc = buf.subarray(256, 268);
  var ri = new u16(buf.buffer, 268);
  if (hb < 128) {
    var _a = rfse(dat, bt + 1, 6), ebt = _a[0], fdt = _a[1];
    bt += hb;
    var epos = ebt << 3;
    var lb = dat[bt];
    if (!lb)
      err(0);
    var st1 = 0, st2 = 0, btr1 = fdt.b, btr2 = btr1;
    var fpos = (++bt << 3) - 8 + msb(lb);
    for (; ; ) {
      fpos -= btr1;
      if (fpos < epos)
        break;
      var cbt = fpos >> 3;
      st1 += (dat[cbt] | dat[cbt + 1] << 8) >> (fpos & 7) & (1 << btr1) - 1;
      hw[++wc] = fdt.s[st1];
      fpos -= btr2;
      if (fpos < epos)
        break;
      cbt = fpos >> 3;
      st2 += (dat[cbt] | dat[cbt + 1] << 8) >> (fpos & 7) & (1 << btr2) - 1;
      hw[++wc] = fdt.s[st2];
      btr1 = fdt.n[st1];
      st1 = fdt.t[st1];
      btr2 = fdt.n[st2];
      st2 = fdt.t[st2];
    }
    if (++wc > 255)
      err(0);
  } else {
    wc = hb - 127;
    for (; i < wc; i += 2) {
      var byte = dat[++bt];
      hw[i] = byte >> 4;
      hw[i + 1] = byte & 15;
    }
    ++bt;
  }
  var wes = 0;
  for (i = 0; i < wc; ++i) {
    var wt = hw[i];
    if (wt > 11)
      err(0);
    wes += wt && 1 << wt - 1;
  }
  var mb = msb(wes) + 1;
  var ts = 1 << mb;
  var rem = ts - wes;
  if (rem & rem - 1)
    err(0);
  hw[wc++] = msb(rem) + 1;
  for (i = 0; i < wc; ++i) {
    var wt = hw[i];
    ++rc[hw[i] = wt && mb + 1 - wt];
  }
  var hbuf = new u8(ts << 1);
  var syms = hbuf.subarray(0, ts), nb = hbuf.subarray(ts);
  ri[mb] = 0;
  for (i = mb; i > 0; --i) {
    var pv = ri[i];
    fill(nb, i, pv, ri[i - 1] = pv + rc[i] * (1 << mb - i));
  }
  if (ri[0] != ts)
    err(0);
  for (i = 0; i < wc; ++i) {
    var bits = hw[i];
    if (bits) {
      var code = ri[bits];
      fill(syms, i, code, ri[bits] = code + (1 << mb - bits));
    }
  }
  return [bt, {
    n: nb,
    b: mb,
    s: syms
  }];
};
var dllt = rfse(/* @__PURE__ */ new u8([
  81,
  16,
  99,
  140,
  49,
  198,
  24,
  99,
  12,
  33,
  196,
  24,
  99,
  102,
  102,
  134,
  70,
  146,
  4
]), 0, 6)[1];
var dmlt = rfse(/* @__PURE__ */ new u8([
  33,
  20,
  196,
  24,
  99,
  140,
  33,
  132,
  16,
  66,
  8,
  33,
  132,
  16,
  66,
  8,
  33,
  68,
  68,
  68,
  68,
  68,
  68,
  68,
  68,
  36,
  9
]), 0, 6)[1];
var doct = rfse(/* @__PURE__ */ new u8([
  32,
  132,
  16,
  66,
  102,
  70,
  68,
  68,
  68,
  68,
  36,
  73,
  2
]), 0, 5)[1];
var b2bl = function(b, s) {
  var len = b.length, bl = new i32(len);
  for (var i = 0; i < len; ++i) {
    bl[i] = s;
    s += 1 << b[i];
  }
  return bl;
};
var llb = /* @__PURE__ */ new u8((/* @__PURE__ */ new i32([
  0,
  0,
  0,
  0,
  16843009,
  50528770,
  134678020,
  202050057,
  269422093
])).buffer, 0, 36);
var llbl = /* @__PURE__ */ b2bl(llb, 0);
var mlb = /* @__PURE__ */ new u8((/* @__PURE__ */ new i32([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  16843009,
  50528770,
  117769220,
  185207048,
  252579084,
  16
])).buffer, 0, 53);
var mlbl = /* @__PURE__ */ b2bl(mlb, 3);
var dhu = function(dat, out, hu) {
  var len = dat.length, ss = out.length, lb = dat[len - 1], msk = (1 << hu.b) - 1, eb = -hu.b;
  if (!lb)
    err(0);
  var st = 0, btr = hu.b, pos = (len << 3) - 8 + msb(lb) - btr, i = -1;
  for (; pos > eb && i < ss; ) {
    var cbt = pos >> 3;
    var val = (dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (pos & 7);
    st = (st << btr | val) & msk;
    out[++i] = hu.s[st];
    pos -= btr = hu.n[st];
  }
  if (pos != eb || i + 1 != ss)
    err(0);
};
var dhu4 = function(dat, out, hu) {
  var bt = 6;
  var ss = out.length, sz1 = ss + 3 >> 2, sz2 = sz1 << 1, sz3 = sz1 + sz2;
  dhu(dat.subarray(bt, bt += dat[0] | dat[1] << 8), out.subarray(0, sz1), hu);
  dhu(dat.subarray(bt, bt += dat[2] | dat[3] << 8), out.subarray(sz1, sz2), hu);
  dhu(dat.subarray(bt, bt += dat[4] | dat[5] << 8), out.subarray(sz2, sz3), hu);
  dhu(dat.subarray(bt), out.subarray(sz3), hu);
};
var rzb = function(dat, st, out) {
  var _a;
  var bt = st.b;
  var b0 = dat[bt], btype = b0 >> 1 & 3;
  st.l = b0 & 1;
  var sz = b0 >> 3 | dat[bt + 1] << 5 | dat[bt + 2] << 13;
  var ebt = (bt += 3) + sz;
  if (btype == 1) {
    if (bt >= dat.length)
      return;
    st.b = bt + 1;
    if (out) {
      fill(out, dat[bt], st.y, st.y += sz);
      return out;
    }
    return fill(new u8(sz), dat[bt]);
  }
  if (ebt > dat.length)
    return;
  if (btype == 0) {
    st.b = ebt;
    if (out) {
      out.set(dat.subarray(bt, ebt), st.y);
      st.y += sz;
      return out;
    }
    return slc(dat, bt, ebt);
  }
  if (btype == 2) {
    var b3 = dat[bt], lbt = b3 & 3, sf = b3 >> 2 & 3;
    var lss = b3 >> 4, lcs = 0, s4 = 0;
    if (lbt < 2) {
      if (sf & 1)
        lss |= dat[++bt] << 4 | (sf & 2 && dat[++bt] << 12);
      else
        lss = b3 >> 3;
    } else {
      s4 = sf;
      if (sf < 2)
        lss |= (dat[++bt] & 63) << 4, lcs = dat[bt] >> 6 | dat[++bt] << 2;
      else if (sf == 2)
        lss |= dat[++bt] << 4 | (dat[++bt] & 3) << 12, lcs = dat[bt] >> 2 | dat[++bt] << 6;
      else
        lss |= dat[++bt] << 4 | (dat[++bt] & 63) << 12, lcs = dat[bt] >> 6 | dat[++bt] << 2 | dat[++bt] << 10;
    }
    ++bt;
    var buf = out ? out.subarray(st.y, st.y + st.m) : new u8(st.m);
    var spl = buf.length - lss;
    if (lbt == 0)
      buf.set(dat.subarray(bt, bt += lss), spl);
    else if (lbt == 1)
      fill(buf, dat[bt++], spl);
    else {
      var hu = st.h;
      if (lbt == 2) {
        var hud = rhu(dat, bt);
        lcs += bt - (bt = hud[0]);
        st.h = hu = hud[1];
      } else if (!hu)
        err(0);
      (s4 ? dhu4 : dhu)(dat.subarray(bt, bt += lcs), buf.subarray(spl), hu);
    }
    var ns = dat[bt++];
    if (ns) {
      if (ns == 255)
        ns = (dat[bt++] | dat[bt++] << 8) + 32512;
      else if (ns > 127)
        ns = ns - 128 << 8 | dat[bt++];
      var scm = dat[bt++];
      if (scm & 3)
        err(0);
      var dts = [dmlt, doct, dllt];
      for (var i = 2; i > -1; --i) {
        var md = scm >> (i << 1) + 2 & 3;
        if (md == 1) {
          var rbuf = new u8([0, 0, dat[bt++]]);
          dts[i] = {
            s: rbuf.subarray(2, 3),
            n: rbuf.subarray(0, 1),
            t: new u16(rbuf.buffer, 0, 1),
            b: 0
          };
        } else if (md == 2) {
          _a = rfse(dat, bt, 9 - (i & 1)), bt = _a[0], dts[i] = _a[1];
        } else if (md == 3) {
          if (!st.t)
            err(0);
          dts[i] = st.t[i];
        }
      }
      var _b = st.t = dts, mlt = _b[0], oct = _b[1], llt = _b[2];
      var lb = dat[ebt - 1];
      if (!lb)
        err(0);
      var spos = (ebt << 3) - 8 + msb(lb) - llt.b, cbt = spos >> 3, oubt = 0;
      var lst = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << llt.b) - 1;
      cbt = (spos -= oct.b) >> 3;
      var ost = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << oct.b) - 1;
      cbt = (spos -= mlt.b) >> 3;
      var mst = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << mlt.b) - 1;
      for (++ns; --ns; ) {
        var llc = llt.s[lst];
        var lbtr = llt.n[lst];
        var mlc = mlt.s[mst];
        var mbtr = mlt.n[mst];
        var ofc = oct.s[ost];
        var obtr = oct.n[ost];
        cbt = (spos -= ofc) >> 3;
        var ofp = 1 << ofc;
        var off = ofp + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16 | dat[cbt + 3] << 24) >>> (spos & 7) & ofp - 1);
        cbt = (spos -= mlb[mlc]) >> 3;
        var ml = mlbl[mlc] + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (spos & 7) & (1 << mlb[mlc]) - 1);
        cbt = (spos -= llb[llc]) >> 3;
        var ll = llbl[llc] + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (spos & 7) & (1 << llb[llc]) - 1);
        cbt = (spos -= lbtr) >> 3;
        lst = llt.t[lst] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << lbtr) - 1);
        cbt = (spos -= mbtr) >> 3;
        mst = mlt.t[mst] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << mbtr) - 1);
        cbt = (spos -= obtr) >> 3;
        ost = oct.t[ost] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << obtr) - 1);
        if (off > 3) {
          st.o[2] = st.o[1];
          st.o[1] = st.o[0];
          st.o[0] = off -= 3;
        } else {
          var idx = off - (ll != 0);
          if (idx) {
            off = idx == 3 ? st.o[0] - 1 : st.o[idx];
            if (idx > 1)
              st.o[2] = st.o[1];
            st.o[1] = st.o[0];
            st.o[0] = off;
          } else
            off = st.o[0];
        }
        for (var i = 0; i < ll; ++i) {
          buf[oubt + i] = buf[spl + i];
        }
        oubt += ll, spl += ll;
        var stin = oubt - off;
        if (stin < 0) {
          var len = -stin;
          var bs = st.e + stin;
          if (len > ml)
            len = ml;
          for (var i = 0; i < len; ++i) {
            buf[oubt + i] = st.w[bs + i];
          }
          oubt += len, ml -= len, stin = 0;
        }
        for (var i = 0; i < ml; ++i) {
          buf[oubt + i] = buf[stin + i];
        }
        oubt += ml;
      }
      if (oubt != spl) {
        while (spl < buf.length) {
          buf[oubt++] = buf[spl++];
        }
      } else
        oubt = buf.length;
      if (out)
        st.y += oubt;
      else
        buf = slc(buf, 0, oubt);
    } else if (out) {
      st.y += lss;
      if (spl) {
        for (var i = 0; i < lss; ++i) {
          buf[i] = buf[spl + i];
        }
      }
    } else if (spl)
      buf = slc(buf, spl);
    st.b = ebt;
    return buf;
  }
  err(2);
};
var cct = function(bufs, ol) {
  if (bufs.length == 1)
    return bufs[0];
  var buf = new u8(ol);
  for (var i = 0, b = 0; i < bufs.length; ++i) {
    var chk = bufs[i];
    buf.set(chk, b);
    b += chk.length;
  }
  return buf;
};
var Decompress = /* @__PURE__ */ (function() {
  function Decompress2(ondata) {
    this.ondata = ondata;
    this.c = [];
    this.l = 0;
    this.z = 0;
  }
  Decompress2.prototype.push = function(chunk, final) {
    if (typeof this.s == "number") {
      var sub = Math.min(chunk.length, this.s);
      chunk = chunk.subarray(sub);
      this.s -= sub;
    }
    var sl = chunk.length;
    var ncs = sl + this.l;
    if (!this.s) {
      if (final) {
        if (!ncs) {
          this.ondata(new u8(0), true);
          return;
        }
        if (ncs < 5)
          err(5);
      } else if (ncs < 18) {
        this.c.push(chunk);
        this.l = ncs;
        return;
      }
      if (this.l) {
        this.c.push(chunk);
        chunk = cct(this.c, ncs);
        this.c = [];
        this.l = 0;
      }
      if (typeof (this.s = rzfh(chunk)) == "number")
        return this.push(chunk, final);
    }
    if (typeof this.s != "number") {
      if (ncs < (this.z || 3)) {
        if (final)
          err(5);
        this.c.push(chunk);
        this.l = ncs;
        return;
      }
      if (this.l) {
        this.c.push(chunk);
        chunk = cct(this.c, ncs);
        this.c = [];
        this.l = 0;
      }
      if (!this.z && ncs < (this.z = chunk[this.s.b] & 2 ? 4 : 3 + (chunk[this.s.b] >> 3 | chunk[this.s.b + 1] << 5 | chunk[this.s.b + 2] << 13))) {
        if (final)
          err(5);
        this.c.push(chunk);
        this.l = ncs;
        return;
      } else
        this.z = 0;
      for (; ; ) {
        var blk = rzb(chunk, this.s);
        if (!blk) {
          if (final)
            err(5);
          var adc = chunk.subarray(this.s.b);
          this.s.b = 0;
          this.c.push(adc), this.l += adc.length;
          return;
        } else {
          this.ondata(blk, false);
          cpw(this.s.w, 0, blk.length);
          this.s.w.set(blk, this.s.w.length - blk.length);
        }
        if (this.s.l) {
          var rest = chunk.subarray(this.s.b);
          this.s = this.s.c * 4;
          this.push(rest, final);
          return;
        }
      }
    } else if (final)
      err(5);
  };
  return Decompress2;
})();

// src/session-decompression.ts
function createZstdDecompress() {
  let decoder;
  let backpressured = false;
  let pending;
  const stream = new Transform({
    transform(chunk, _encoding, callback) {
      try {
        backpressured = false;
        decoder.push(chunk);
        if (backpressured && !this.destroyed) pending = callback;
        else callback();
      } catch (error) {
        callback(error);
      }
    },
    read(size) {
      const callback = pending;
      pending = void 0;
      callback?.();
      Transform.prototype._read.call(this, size);
    },
    flush(callback) {
      try {
        decoder.push(new Uint8Array(), true);
        callback();
      } catch (error) {
        callback(error);
      }
    }
  });
  decoder = new Decompress((chunk) => {
    if (!stream.push(chunk)) backpressured = true;
  });
  return stream;
}
export {
  createZstdDecompress
};
```
