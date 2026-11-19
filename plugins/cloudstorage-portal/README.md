# CloudStorage-Portal
Cloud Storage Portal for Google Drive, Dropbox &amp; OneDrive

Version 0.9.14 requires Google Drive profile discovery in the provider tool catalog so the default-account workflow can verify the active identity.

Version 0.9.13 can resolve an exact OneDrive item in its known parent folder after a successful empty search. The workflow reports incomplete listings and refuses ambiguous matches.

Version 0.9.12 checks OneDrive search and folder creation in the provider tool catalog. The check reports the exact missing tool when either operation is unavailable. See the [workflow verification guide](skills/cloudstorage-portal/references/workflow-verification.md).
