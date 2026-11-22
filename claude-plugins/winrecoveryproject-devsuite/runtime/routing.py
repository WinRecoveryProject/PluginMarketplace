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
# Specific execution intents shared with Plugin-Skill-Studio studio-execute; checked before planning.
EXECUTE_MODES = (
    ("durable", r"durable state file|interruption-prone|risks compaction|resume after interruption"),
    ("spec-run", r"full specification across task tickets|unified pr|build the whole spec|single isolated bug fixes|exploratory coding without tickets"),
    ("parallel", r"one subagent per independent problem|proceed concurrently|without shared state"),
    ("subagent", r"one subagent per task|per-task review gates|executing plans with independent tasks"),
    ("execute", r"inline, task by task|stopping only on blockers|subagent dispatch is unavailable|separate session"),
    ("implement", r"build scoped code changes|ready to implement|build or code a planned feature|initial architecture exploration|explicitly say \"implement\""),
)

# Specific planning intents shared with Plugin-Skill-Studio studio-plan.
PLAN_MODES = (
    ("goal", r"/goal|goal prompt|unattended execution|overnight autonomous|autonomous goal contract|agentic mission"),
    ("map", r"decision tickets|multi-session|map out this massive|small, well-scoped features"),
    ("questions", r"questionnaire|stakeholder|what should i ask them|answer the questions themselves"),
    ("tickets", r"tracer-bullet|break this into tickets|tracker issues|initial requirements gathering"),
    ("spec", r"technical spec|write a spec|fuzzy and ungrilled"),
    ("interview", r"grill|interview the user|poke holes|domain modeling with doc generation|documentation trail is needed|immediate implementation"),
    ("discover", r"explores user intent|starting a new feature|whose requirements or design|trivial single-file changes"),
    ("plan", r"implementation plans?\b|needs planning"),
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
    # Planning boundaries ("Do NOT use for ...") still name planning intent, so match before negation stripping.
    execute_mode = next((name for name, pattern in EXECUTE_MODES if re.search(pattern, request.casefold())), None)
    plan_mode = next((name for name, pattern in PLAN_MODES if re.search(pattern, request.casefold())), None)
    mode = None
    if explicit_owner:
        skill = explicit_owner
    elif review_mode:
        skill, mode = "devsuite-review", review_mode
    elif execute_mode:
        skill, mode = "devsuite-implement", execute_mode
    elif plan_mode:
        skill, mode = "devsuite-planning", plan_mode
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
    elif re.search(r"\b(plan|planning|planlæg\w*|projektplan\w*|coordinate|coordinator|architecture|new.project|agents\.md|board)\b", text) and not re.search(r"\b(implement|build)\b", text):
        skill, mode = "devsuite-planning", "project"
    elif re.search(r"\b(implement|build|fix|refactor|migrate|maintain|feature)\b", text):
        skill, mode = "devsuite-implement", "build"
    else:
        skill = "devsuite"
    return {"skill": skill, "entrypoint": f"skills/{skill}/SKILL.md", "mode": mode,
            "reason": "One focused phase; preserve the full user worklist across phases",
            "executionAuthorized": False, "externalActionAuthorized": False}
