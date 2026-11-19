# Skill: offload-to-sandbox

- Plugin: `vercel` (0.56.0-wrp.1)
- Source: `plugins/vercel/skills/offload-to-sandbox/SKILL.md`

> Run CI, builds or test shards in an existing authorized Vercel Sandbox, or plan a sandbox run when the project, files and spending limit still need to be approved.

## Instructions

### Run builds and tests in a Vercel Sandbox

1. Confirm the exact project, sandbox, task, transfer paths and cost limit. Check the plan's remaining allocation before running a job. With zero spending allowed and no verified included capacity, use local execution.
2. Send only the scoped project files needed for the test and omit credentials, private environment files, unrelated worktrees and user data. Use the existing Sandbox connection and a dedicated task directory, leaving other files in place.
3. Run the requested command. Persist the build or test exit code and relevant log in the task directory. An older CLI can return success for transport even when the test failed. Verify the recorded command exit code and expected output.
4. Retrieve the relevant artifacts and compare failures against the baseline. Use separate task paths for parallel jobs. Follow the user's retention request for artifacts and any sandbox created for the job.

Provisioning new resources, activating paid capacity, or deleting a sandbox requires specific user authorization.

See the [Vercel Sandbox documentation](https://vercel.com/docs/sandbox).
