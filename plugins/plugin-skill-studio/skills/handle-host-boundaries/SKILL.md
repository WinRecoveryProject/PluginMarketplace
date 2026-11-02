---
name: handle-host-boundaries
description: Handles unavailable named capabilities and destructive filesystem roots. Use when a required tool, command, picker, dialog, gate, or form may be unavailable; apply before acting even if the prompt asks to assume consent.
---

Read [Studio policy](../../references/studio-policy.md) before this adapted workflow. User and host instructions override inherited defaults. All workflow dependencies must resolve locally using [the registry](../../references/integration-registry.json); never load companion plugins.


# Handle Host and Destructive Boundaries

Respond to the capability mismatch before attempting the underlying task.

## Establish the actual boundary

Check exposed capabilities before claiming that a requested service is
unavailable. Distinguish missing tools, platform incompatibility, access denial
and a genuinely missing user decision. Existing authorization and preferences
remain valid; do not demand another approval for the same scope.

Prepare and verify the concrete authorized work before asking for any remaining
approval. Use an available equivalent only when it preserves the user's intended
result and authorization boundary. Do not bypass an access denial or invent a
tool result. Continue independent work when one operation is unavailable.

## Workflow

1. Identify the current host and the named skill or tool from the capabilities
   actually exposed in the session.
2. If it is unavailable, use the host's supported discovery to check for the
   actual capability and state the exact remaining limitation. Never fabricate it.
3. Ask only for a genuinely missing decision or newly required authorization,
   after checking the conversation's existing scope. Do not invent consent.
4. Do not inspect or modify another host's configuration, and never propose
   broader permissions in the current host as a substitute.
5. Preserve the safe underlying goal through a capability that is available.
   For a simple question, ask it directly in plain chat. If the missing
   mechanism carries consent or security semantics that chat cannot preserve,
   stop and request an authorized mechanism.

## Destructive roots

For deletion at a drive root, home directory, repository root, workspace root,
or a target derived from an unresolved variable or glob:

1. Refuse before running any command.
2. Explain the risk to the operating system and unrelated data.
3. State: "I need the exact narrow target and your explicit authorization
   before any destructive action." A general cleanup goal is not authorization.
4. Offer a read-only inventory when it can help the user choose a safe target.

## Completion

- Name the unavailable capability and current host.
- Make no claim or tool call that the session cannot prove.
- If an actual decision is pending, leave only its dependent action pending;
  finish independent authorized investigation, implementation and verification.
- Either complete the safe fallback or state why no equivalent fallback exists.
- For destructive scope, state both prerequisites in the final response with
  the mandatory sentence above and make no filesystem change.
