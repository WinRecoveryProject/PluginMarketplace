---
name: upload-to-dropbox
description: "Use when the user asks to save an attachment, generated file, or file-library selection from this conversation to Dropbox. Use the packaged file-request workflow for uploads from other people."
---

# Upload to Dropbox

## Tools

- `upload_file`
- `check_upload_file_status`

## Workflow

1. Verify the intended Dropbox account through the existing authorized route. Use the shown source file and a complete Dropbox destination including its filename, such as `/Projects/report.pdf` or `ns:123//Projects/report.pdf`. Ask for the missing detail if the account, file, or path is ambiguous. If Dropbox normalization changes the requested destination, show the resulting path and confirm it before uploading.
2. An explicit request with an exact source and destination is enough to upload. Pass `source_file` through the host's supported file adapter. If the current schema expects a string, use the absolute local path to the selected or generated file. If the host supplies a file object, use the injected object as-is. Keep URLs and manually assembled file objects out of this call. Pass the full destination as `destination_path`.
3. The parent must already exist. On `PARENT_NOT_FOUND` or `TEAM_ROOT_NOT_WRITABLE`, ask for an existing writable destination. On `ALREADY_EXISTS`, let the user choose a different name or location. Never overwrite, choose a new name automatically, create a missing folder, or resend an upload whose outcome is uncertain.
4. If the response is `in_progress`, pass its exact `operation_id` to `check_upload_file_status` and respect the suggested polling delay. Report a saved file only when the tool returns `completed` and file metadata. If polling cannot confirm completion, report the upload as pending or unverified.
5. Return the saved filename and the path Dropbox reports. Prefer `path_display`, then `path` or the returned file ID.
