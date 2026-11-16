# Historical standalone MCP configuration

These are the unchanged 1.1.8 standalone MCP declarations. They are retained
only as historical configuration evidence. Version 1.2.0 reuses the existing
registered OneDrive App and its hosted MCP connection.

Do not copy these files to the package root. The native loader auto-discovers
top-level `.mcp.json` even when `mcpServers` is absent from the native manifest;
that would recreate a second OAuth client and a second sign-in route.
