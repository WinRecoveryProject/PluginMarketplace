# CloudStorage OneDrive

Private standalone plugin candidate for the dedicated OneDrive component of CloudStorage Portal.

It connects to the verified hosted MCP endpoint and exposes only bounded, read-only OneDrive operations. OAuth uses the separate host application and the delegated `access_as_user` API scope. No token, refresh grant, client secret or native connector credential is packaged.

The plugin-owned MCP server is named `cloudstorage_onedrive`. The distinct name is intentional: the installed CloudStorage Portal keeps its existing local broker server named `onedrive`, so both transports can coexist without replacing or shadowing one another.

The exact hosted callback remains pending until the plugin connection flow displays it. Authenticated MCP discovery and Graph reads remain pending until the API credential is stored in Vercel and the host credential is entered in the protected connection form.
