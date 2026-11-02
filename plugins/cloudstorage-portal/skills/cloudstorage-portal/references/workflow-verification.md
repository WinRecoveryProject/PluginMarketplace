# Workflow verification boundaries

This source is plugin candidate 0.7.0-dev.1, not a published release. Local runtime 0.8.0-dev.1 is installed separately and configured for Codex. Its ten tools, automated tests and independent process discovery do not prove host reload, provider authorization or full skill coverage. At the 2026-10-21 restart check, the current chat still reported an initialization failure and exposed no cloudstorage_local tools. A bounded same-port startup retry has been installed and tested, but its successful host reload remains unverified. Do not report the earlier runtime's successful live OneDrive calls as proof for this new process.

## Execution layers

- Native Dropbox/Google/Microsoft connector tools use their own current grants and account schemas. Discover them for each host/session. Google has been observed both with multiple explicit link_id values and with no selector. Never send a remembered selector absent from the actual schema, and verify the active identity before writes on a selector-free surface.
- Microsoft personal-drive tools may be present through a separately installed SharePoint plugin. App bindings in this package still declare Dropbox/Google only. Do not promise standalone Microsoft dependency installation from these skills. Use only current allowed account/drive/item references.
- The local broker owns separate PKCE grants. Native connector success neither configures the broker nor authorizes it. Its tokens currently live in memory only.
- Local OneDrive sync-folder access is filesystem metadata, not Graph identity, cloud content or sync-completion evidence.

## Observed narrow live tests

Authorized isolated test artifacts have demonstrated native provider folder creation/upload and content extraction on Dropbox, Google Drive and personal OneDrive. Google additionally demonstrated copy/move with parent readback, native Docs text conversion and revision-guarded insertion, native Sheets XLSX import and recalculation following an input edit, and native Slides PPTX import and revision-guarded text replacement. OneDrive demonstrated copy destination reconciliation and a same-drive move of the observed copy, followed by exact-item content readback.

These observations are dated integration evidence, not guaranteed current availability. Dropbox later returned Unknown tool for copy and read-only listing while the catalog still reported it installed. Google account-selector schemas changed during testing. Microsoft browser-link content resolution returned a serviceReadOnly error, whereas an authorized fetch of the same verified Graph drive/item succeeded. Record these distinct results; do not generalize one failed resolver to all account permissions or erase the resolver defect after another route works.

No sharing, file requests, destructive cleanup or Google comment lifecycle was tested under the isolated folder authorization. Advanced Docs/Sheets/Slides features and full render pipelines are not verified by text/cell smoke tests. Successful content extraction is not a byte-hash check. A copied item observed in the destination is not the same evidence as a polled terminal async monitor status.

## Live verification contract

For each intended operation, record the exact current tool, provider identity, supported account selector or verified default identity, target IDs, requested effect, completion state and independent readback. Keep existing files outside an explicitly authorized test area untouched. Ask separately for sharing/access changes, file requests and cleanup. Never create public links just to test content reads. Keep signed monitor/download URLs and tokens out of receipts, source and archives.

When errors occur, distinguish schema/argument binding, missing dispatch, provider authorization, resource lookup, async pending state and actual write completion. Refresh the relevant schema and reconcile before retrying an uncertain write. Report partial results per account. Missing or failed checks remain incomplete; they are not polish.
