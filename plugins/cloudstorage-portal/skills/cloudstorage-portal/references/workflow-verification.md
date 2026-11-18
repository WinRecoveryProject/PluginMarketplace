# Workflow verification boundaries

## Current App routing

CloudStorage Portal declares the existing Dropbox, Google Drive and OneDrive Apps in `.app.json`. The [OneDrive skill](../../onedrive/SKILL.md) uses the same hosted App as the OneDrive Marketplace package for Personal. Availability in Business depends on the tools and account binding exposed by that workspace. Discover the current provider tools and confirm the intended account before file access.

Run `node scripts/verify-provider-workflows.mjs . <provider-tool-catalog.json>` with the tool names observed on the current host. The catalog uses `dropbox.tools`, `googleDrive.tools` and `oneDrive.tools`. It checks the twelve imported Dropbox and Google workflows plus the hosted OneDrive requirements for identity, drive, folder listing, exact metadata, reading, uploading, updating and content readback. A missing OneDrive catalog or required tool fails the check. Catalog results establish tool availability. A live account, operation and readback each require their own evidence.

Google has exposed both schemas with multiple explicit `link_id` values and schemas without an account selector. Use the current schema and confirm the active account before writes. Local OneDrive sync-folder access provides filesystem metadata only.

## Live verification contract


For each intended operation, record the exact current tool, provider identity, supported account selector or verified default identity, target IDs, requested effect, completion state and independent readback. Keep existing files outside an explicitly authorized test area untouched. Ask separately for sharing/access changes, file requests and cleanup. Never create public links just to test content reads. Keep signed monitor/download URLs and tokens out of receipts, source and archives.

When errors occur, distinguish schema/argument binding, missing dispatch, provider authorization, resource lookup, async pending state and actual write completion. Refresh the relevant schema and reconcile before retrying an uncertain write. Report partial results per account. Missing or failed checks remain incomplete; they are not polish.

## Historical observations

The October 2026 local broker and SharePoint fallback predate the current hosted App routing. The [historical MCP record](../../../MCP-LIVE-PROOF.md) preserves those experiments, including the local broker restart failure. The observations below record the exact routes exercised at the time.

Authorized isolated test artifacts have demonstrated native provider folder creation/upload and content extraction on Dropbox, Google Drive and personal OneDrive. Google additionally demonstrated copy/move with parent readback, native Docs text conversion and revision-guarded insertion, native Sheets XLSX import and recalculation following an input edit, and native Slides PPTX import and revision-guarded text replacement. OneDrive demonstrated copy destination reconciliation and a same-drive move of the observed copy, followed by exact-item content readback.

These observations are dated integration evidence, not guaranteed current availability. Dropbox later returned Unknown tool for copy and read-only listing while the catalog still reported it installed. Google account-selector schemas changed during testing. Microsoft browser-link content resolution returned a serviceReadOnly error, whereas an authorized fetch of the same verified Graph drive/item succeeded. Record these distinct results; do not generalize one failed resolver to all account permissions or erase the resolver defect after another route works.

No sharing, file requests, destructive cleanup or Google comment lifecycle was tested under the isolated folder authorization. Advanced Docs/Sheets/Slides features and full render pipelines are not verified by text/cell smoke tests. Successful content extraction is not a byte-hash check. A copied item observed in the destination is not the same evidence as a polled terminal async monitor status.
