# Skill: access-protected-vercel-deployment

- Plugin: `vercel` (0.56.0-wrp.1)
- Source: `plugins/vercel/skills/access-protected-vercel-deployment/SKILL.md`

> Verify a Vercel deployment behind Deployment Protection when the user has authorized inspection and the existing account can access the exact project.

## Instructions

### Verify a protected Vercel deployment

Confirm the exact project, environment and URL using the existing Vercel connection. If the provider confirms access using the current account, use its authenticated deployment fetch. An existing authorized Vercel CLI session can use the documented `vercel curl` operation for the same deployment.

Keep Deployment Protection in effect. Keep credentials inside the provider connection. Any 401, 403, or environment mismatch leaves the read unverified. Let the user provide access through the existing authorized account before repeating the check.

Report the verified response status and URL. A share link or an access-setting change is a separate user-requested operation.

See the [Vercel CLI reference](https://vercel.com/docs/cli/curl).

## Bundled files

### File: `.vercel.approvers`

```text
@vercel/adlc:team
```
