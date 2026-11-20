"""Pure workflow selection shared by DevSuite host packages."""
from __future__ import annotations

import re


LOCAL_WORKFLOWS = (
    "devsuite",
    "devsuite-planning",
    "devsuite-implement",
    "devsuite-debug",
    "devsuite-review",
    "devsuite-test",
    "devsuite-handoff",
)

# Specific review intents shared with Plugin-Skill-Studio studio-review; checked before broad phases.
REVIEW_MODES = (
    ("verify", r"about to claim|verification commands|success claims|bounded static-page capture|audits finished work|"
               r"completion claim|double-check that|unsupported claims"),
    ("receive", r"review feedback|pushes back|feedback is unclear|receiving code review"),
    ("request", r"dispatch(?:es)? a bounded reviewer|read-only review before merge|request(?:ing)? (?:a )?code review"),
    ("decide", r"review decision|require human attention|minimal, targeted or deep"),
    ("code", r"review changed code|reviewing a branch|code review|review this (?:diff|branch|pr|change)|authoring new code or diagnosing"),
)
QUALITY_GATE = r"\b(lint|linter|lintkontrol|kvalitetskontrol|megalinter|quality.gate|typecheck|format.check|lint/type/build)\b"

TASK_TARGET = r"(?:codex[\s-]+tasks?|remote(?:[\s-]+codex)?[\s-]+tasks?|codex[\s-]+opgaver?)"
JOB_TARGET = r"(?:process[\s-]+jobs?|background[\s-]+(?:jobs?|process(?:es)?)|baggrundsjob(?:s)?|baggrundsproces(?:ser)?|procesjob(?:s)?)"
DETERMINERS = r"(?:(?:a|an|the|one|my|new|existing|durable|en|et|den|det|min|mit|ny|nyt|eksisterende|varig)\s+){0,4}"
POLITE_PREFIX = r"(?:(?:please|kindly|venligst)\s+|(?:can|could|would|will)\s+you\s+|(?:kan|vil)\s+du\s+)?"
LAUNCH_VERB = r"(?:start|create|launch|run|queue|opret|kør|igangsæt)"
TARGET_END = r"(?=\s+(?:to|that|which|for|with|in|on|from|using|via|til|som|der|med|på|i|fra)\b|[.!?]|$)"


def execution_intent(text: str) -> tuple[str | None, str]:
    """Separate an explicit lifecycle request from work on the integration's code.

    Workload verbs after a launch request do not change its owner. Negated target
    clauses supply no lifecycle intent; a following review/test clause still can.
    This is a route suggestion only, never execution authority.
    """
    clauses = re.split(r"[;,.\n]+|\b(?:but|men|instead|i stedet)\b", text)
    active = []
    for clause in clauses:
        target = re.search(TASK_TARGET + "|" + JOB_TARGET, clause)
        if target and re.search(r"\b(?:do\s+not|don['’]t|never|must\s+not|ikke|aldrig|undlad)\b", clause[:target.start()]):
            continue
        active.append(clause.strip())
    for clause in active:
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:use|brug)\s+" + DETERMINERS + TASK_TARGET + r"\s+(?:to|til(?:\s+at)?)\b", clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + r"(?:delegate|delegér|deleger)\b.{1,500}\b(?:to|til)\s+" + DETERMINERS + TASK_TARGET + TARGET_END, clause):
            return "devsuite-tasks", "; ".join(active)
        if re.match(POLITE_PREFIX + LAUNCH_VERB + r"\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        run = POLITE_PREFIX + r"(?:run|launch|start|execute|kør|afvikl)\b.{1,500}"
        if re.match(run + r"\b(?:as|in|som|i)\s+" + DETERMINERS + JOB_TARGET + TARGET_END, clause):
            return "devsuite-jobs", "; ".join(active)
        if re.match(run + r"\b(?:in(?:\s+the)?\s+background|i\s+baggrunden)\b", clause):
            return "devsuite-jobs", "; ".join(active)
    return None, "; ".join(active)


def route(request: str) -> dict:
    text = request.casefold()
    # More specific intent wins; route suggestions never grant execution authority.
    explicit_owner, text = execution_intent(text)
    operation = bool(re.search(r"\b(fix|implement|build|debug|review|audit|test|tests|testing|refactor|ret|byg|gennemgå)\b", text))
    task_target = bool(re.search(TASK_TARGET + r"|registered (?:codex )?environment|registrerede? (?:codex.)?miljø", text))
    cloud_config_query = re.search(
        r"\b(?:list|show|vis|oplist|find)\s+(?:(?:my|mine|the|de|me|mig|all|alle|available|tilgængelige|saved|gemte)\s+){0,3}"
        r"(?:codex[\s-]+)?cloud(?:[- ]?(?:miljøer|konfigurationer)|[\s-]+(?:environments|configurations))\b", text
    )
    job_target = bool(re.search(JOB_TARGET, text))
    review_mode = next((name for name, pattern in REVIEW_MODES if re.search(pattern, text)), None)
    mode = None
    if explicit_owner:
        skill = explicit_owner
    elif review_mode:
        skill, mode = "devsuite-review", review_mode
    elif (task_target or cloud_config_query) and not operation:
        skill = "devsuite-tasks"
    elif job_target and not operation:
        skill = "devsuite-jobs"
    elif re.search(r"\b(convert|conversion|cloudconvert|transcode)\b", text):
        skill = "devsuite-convert"
    elif re.search(r"\b(resume|handoff|hand.?off|interrupted)\b", text):
        skill = "devsuite-handoff"
    elif re.search(r"security|vulnerab|threat|attack.path|finding|hardening|security\.md", text):
        skill = "devsuite-security-fix" if re.search(r"\b(fix|patch|remediat\w*|hardening|writeup|disclos\w*|track|policy)\b", text) else "devsuite-security-assess"
    elif re.search(r"\b(cloud|desktop|docker|vpn|network|environment|package install|preview)\b", text):
        skill = "devsuite-environment"
    elif re.search(QUALITY_GATE, text):
        skill, mode = "devsuite-review", "gate"
    elif re.search(r"\b(review|audit|gennemgå|kodegennemgang|release.readiness|pre.release|patch.risk|verify.delivery)\b", text):
        skill = "devsuite-review"
        mode = "release" if re.search(r"release.readiness|pre.release|patch.risk", text) else "code"
    elif re.search(r"\b(debug|diagnos\w*|reproduce|bug|defect)\b", text):
        skill = "devsuite-debug"
    elif re.search(r"\b(test|tests|testing|qa|verify|validation)\b", text) and not re.search(r"\b(implement|build|refactor)\b", text):
        skill = "devsuite-test"
    elif re.search(r"\b(plan|planning|coordinate|coordinator|architecture|new.project|agents\.md|board)\b", text) and not re.search(r"\b(implement|build)\b", text):
        skill = "devsuite-planning"
    elif re.search(r"\b(implement|build|fix|refactor|migrate|maintain|feature)\b", text):
        skill = "devsuite-implement"
    else:
        skill = "devsuite"
    return {"skill": skill, "entrypoint": f"skills/{skill}/SKILL.md", "mode": mode,
            "reason": "One focused phase; preserve the full user worklist across phases",
            "executionAuthorized": False, "externalActionAuthorized": False}
