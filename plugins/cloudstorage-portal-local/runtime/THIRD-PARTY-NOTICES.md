# Third-party runtime components

CloudStorage Portal 0.5.0 imports these packages through their supported public APIs. Full dependency resolution and integrity values are in package-lock.json.

| Component | Version | License | Original license copy |
| --- | --- | --- | --- |
| @modelcontextprotocol/server | 2.3.1 | Apache-2.0 | licenses/mcp-server-LICENSE |
| @modelcontextprotocol/core | 2.3.1 | Apache-2.0 | licenses/mcp-core-LICENSE |
| zod | 4.6.7 | MIT | licenses/zod-LICENSE |

The dependency packages are installed without lifecycle scripts. No Firebase, Vercel, Better Auth or Filesystem-server implementation has been copied into this runtime. Those packages remain inspection material for subsequent work. Their presence in the source archive does not add their tools or authorization grants here.
