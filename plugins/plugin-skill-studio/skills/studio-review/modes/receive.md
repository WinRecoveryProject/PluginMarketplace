# Receive mode

Follow the package policy linked from this skill's router before acting.

<a id="src-receiving-code-review-intro"></a>

<a id="src-receiving-code-review-code-review-reception"></a>
## Code Review Reception

<a id="src-receiving-code-review-overview"></a>
### Overview

Code review requires technical evaluation, not emotional performance. This skill is the receiving side of the reviews dispatched by request mode.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

<a id="src-receiving-code-review-the-response-pattern"></a>
### The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

<a id="src-receiving-code-review-acknowledging-feedback"></a>
### Acknowledging Feedback

**NEVER:**
- "You're absolutely right!" (banned phrase)
- "Great point!" / "Excellent feedback!" (performative)
- "Thanks for catching that!" / ANY gratitude expression
- "Let me implement that now" (before verification)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

When feedback IS correct:
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback. If you catch yourself about to write "Thanks": DELETE IT. State the fix instead.

<a id="src-receiving-code-review-handling-unclear-feedback"></a>
### Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
the user: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

<a id="src-receiving-code-review-source-specific-handling"></a>
### Source-Specific Handling

<a id="src-receiving-code-review-from-the-user"></a>
#### From the user
- **Trusted** - implement after understanding
- **Still ask** if scope unclear
- **No performative agreement**
- **Skip to action** or technical acknowledgment

<a id="src-receiving-code-review-from-external-reviewers"></a>
#### From External Reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with the user's prior decisions:
  Stop and discuss with the user first
```

**the user's rule:** "External feedback - be skeptical, but check carefully"

<a id="src-receiving-code-review-yagni-check-for-professional-features"></a>
### YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**the user's rule:** "You and reviewer both report to me. If we don't need this feature, don't add it."

<a id="src-receiving-code-review-implementation-order"></a>
### Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

<a id="src-receiving-code-review-when-to-push-back"></a>
### When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with the user's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve the user if architectural

**If you're uncomfortable pushing back out loud:** Name that tension, then tell the user about the issue you've seen. They'll appreciate your honesty.

<a id="src-receiving-code-review-gracefully-correcting-your-pushback"></a>
### Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

<a id="src-receiving-code-review-common-mistakes"></a>
### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

<a id="src-receiving-code-review-real-examples"></a>
### Real Examples

**Performative Agreement (Bad):**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical Verification (Good):**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI (Good):**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**Unclear Item (Good):**
```
the user: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.
✅ "Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

<a id="src-receiving-code-review-github-thread-replies"></a>
### GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.
