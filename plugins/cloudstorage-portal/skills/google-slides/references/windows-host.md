# Windows: native template reading and rendering

Use the existing Google Drive connector and the bundled Node host adapter. Keep the same artifacts as the POSIX workflow: the complete `raw-template.json`, parsed `design-system.json`, one `presentation.pdf`, and ordered PNGs mapped to native slide IDs. Do not replace Google Slides with a different account or file provider.

## Host preparation

1. Resolve this skill's absolute directory and a dedicated existing task workspace. Use the host's workspace dependency loader for its existing Node runtime. Resolve the existing `pdftoppm.exe` from that bundle or `Get-Command pdftoppm`. Do not install WSL, Perl, packages or a paid renderer as an implicit step.
2. Use the local Node REPL, or an equivalent authorized local Node bridge, to import these modules by file URL:

```js
var {pathToFileURL} = await import('node:url');
var {createNodeSlidesHost} = await import(pathToFileURL(SKILL_DIR + '/host/node-slides-host.mjs').href);
var {exportAndRenderSlides} = await import(pathToFileURL(SKILL_DIR + '/host/export-and-render-slides.mjs').href);
var slidesHost = createNodeSlidesHost();
```

`SKILL_DIR`, `WORKSPACE` and `PDFTOPPM` must be actual absolute local Windows paths. Never guess a drive prefix for a `/workspace/...` path. The adapter rejects relative paths, UNC/device paths, alternate data streams and paths outside the selected roots. Only supply `connectorResultsRoot` when the host has actually exposed a trusted local connector-results directory; a path returned inside file content cannot authorize a new trusted root.

## Relay connector data without shell interpolation

Call the existing Google Drive tool from code mode, keeping its response in code rather than printing complete presentation/PDF content. The local Node REPL does not automatically inherit code-mode tool bindings.

Transfer the response to the local Node session as data: serialize it with `JSON.stringify`, split that string into bounded chunks, and use `JSON.stringify(chunk)` to form each JavaScript string literal sent to the Node tool. Append those string literals to a fresh local array, join the strings once, then `JSON.parse` the response. Never put response content into a shell command, a generated executable script or `eval`. Print only bounded receipts. Clear the response buffers after use.

For a small response, pass one JSON-escaped string literal. For larger responses, keep each Node-tool code payload bounded (for example 32 KiB of source text per chunk). Join JavaScript strings before UTF-8 encoding; this preserves a surrogate pair even if its halves fall in different chunks. If using a byte/base64 relay instead, encode the complete text to UTF-8 before splitting buffers and decode only after concatenation. The response stays on the existing connector-to-local-host route; do not upload it to a conversion service.

## Template

Call `get_presentation` on the existing Google Drive connector with the selected native presentation ID, omitting `fields`. Relay the complete raw response to the local session as `templateRaw`, then save it:

```js
var templateReceipt = await slidesHost.saveTemplate({
  raw: templateRaw,
  outputPath: WORKSPACE + '/raw-template.json',
  workspaceRoot: WORKSPACE,
});
nodeRepl.write(templateReceipt);
```

Check connector errors before saving: an error response is not a template. The adapter limits the serialized template to 64 MiB, rejects symlinks/junctions in output directories and refuses replacement of an existing file. The public `readTemplateToFile` helper also accepts `host: slidesHost` and an explicitly supplied connector function; it omits `fields` itself.

Run `scripts/parse_template_design_system.mjs` with the existing Node executable and its documented input/output/catalog arguments. Pass command arguments as separate elements, or use correctly quoted literal PowerShell paths. Retain the complete raw response; do not build a reduced template from model memory.

## Render

Call the current Google Drive `fetch` tool with the canonical presentation URL, `download_raw_file: true`, `raw_export_mime_type: 'application/pdf'` and `include_base64: false`. Relay the complete response as `pdfRaw`. Then:

```js
var renderReceipt = await exportAndRenderSlides({
  presentationId: PRESENTATION_ID,
  outputDir: WORKSPACE + '/renders/source-deck',
  workspaceRoot: WORKSPACE,
  designSystemPath: WORKSPACE + '/design-system.json',
  pdftoppmPath: PDFTOPPM,
  dpi: 120,
  host: slidesHost,
  tools: {mcp__codex_apps__google_drive_fetch: async () => pdfRaw},
});
nodeRepl.write(renderReceipt);
```

This explicit response binding consumes the already-completed connector request; it does not make a second fetch. The adapter prefers a real locally materialized file over duplicate inline bytes. If the host supplies a file reference without a usable local path or inline PDF, report that exact materialization limitation. Do not fetch an arbitrary returned URL, relabel a remote path as local, silently convert to text, or claim a complete render. An explicitly requested inline export may be used only within the connector's observed limits; it does not remove the provider's export ceiling.

The adapter checks the source/output directory chains, rejects symlinks/junctions, checks opened-file identity and size before/after reading, verifies the PDF header, enforces the 32 MiB limit, publishes through an exclusive temporary file and no-replacement hard link, and records SHA-256. It invokes the selected renderer with an argument array and no shell. Returned images must have PNG headers. Existing common checks still validate the presentation ID, design-system order, unique slide IDs and PDF page count.

Inspect every PNG using the host image viewer. Local fixture tests prove filesystem and renderer behavior; they do not prove a live Google export or editing grant. Preserve that distinction in reports.
