# CloudStorage Portal Local

This package owns only the local CloudStorage Portal MCP broker and its runtime.

It does not own the OneDrive registration and it does not duplicate the CloudStorage Portal provider bindings or skills. Keeping the runtime in this separate package makes the three roles explicit:

- OneDrive owns the registered Microsoft App reference.
- CloudStorage Portal owns the Dropbox, Google Drive and OneDrive aggregation plus the unified skills.
- CloudStorage Portal Local owns the local MCP process.

No token, refresh grant or client secret is packaged.
