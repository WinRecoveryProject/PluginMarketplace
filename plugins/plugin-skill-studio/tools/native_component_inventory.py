"""Read native component inventories without persisting raw host responses."""

from itertools import count
import os
from queue import Empty
import re
import subprocess
import time


PLUGIN_ID = re.compile(r"[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*", re.ASCII | re.I)
SKILL_SCOPES = {"user", "repo", "system", "admin"}
MCP_AUTH = {"unknown", "unsupported", "notLoggedIn", "bearerToken", "oAuth"}
MCP_RUNTIME = {"notStarted", "starting", "connected", "authenticationRequired", "failed", "cancelled", "disabled"}
REQUEST_FAILURES = (KeyError, OSError, TypeError, ValueError, subprocess.SubprocessError)
PAGE_SIZE = 100
MAX_PAGES = 12
MAX_APP_PAGES = 100
MAX_SKILLS = 10000


def text(value, limit=256):
    if not isinstance(value, str) or not 0 < len(value) <= limit or not value.isprintable():
        raise ValueError("Invalid native component text")
    return value


def flag(value):
    if not isinstance(value, bool):
        raise ValueError("Invalid native component flag")
    return value


def plugin_id(value):
    if value is not None and not PLUGIN_ID.fullmatch(text(value)):
        raise ValueError("Invalid owning plugin identity")
    return value


def choice(value, values):
    if value not in values:
        raise ValueError("Unknown native component state")
    return value


def app(row):
    return {"id": text(row["id"]), "name": text(row["name"]),
            "enabled": flag(row["isEnabled"]), "accessible": flag(row["isAccessible"])}


def skill(row):
    return {"name": text(row["name"]), "path": text(row["path"], 4096),
            "scope": choice(row["scope"], SKILL_SCOPES), "pluginId": plugin_id(row.get("pluginId")),
            "enabled": flag(row["enabled"])}


def mcp(row):
    tools = row["tools"]
    error = row.get("toolsError")
    runtime = row.get("runtimeStatus")
    if not isinstance(tools, dict) or (error is not None and not isinstance(error, str)):
        raise ValueError("Invalid native MCP discovery metadata")
    return {"name": text(row["name"]), "pluginId": plugin_id(row.get("pluginId")),
            "authStatus": choice(row["authStatus"], MCP_AUTH),
            "runtimeStatus": choice(runtime, MCP_RUNTIME) if runtime is not None else None,
            "toolCount": len(tools), "toolDiscoveryFailed": error is not None}


def observation(rows, issue=None):
    return {"status": "OBSERVED" if issue is None else "INCOMPLETE",
            "issue": issue, "items": list(rows.values())}


def keep_distinct(rows, key, row):
    if key in rows and rows[key] != row:
        raise ValueError("Conflicting native component identities")
    rows[key] = row


def paginated(query, method, normalizer, identity, extra, *, max_pages=MAX_PAGES):
    rows, cursors = {}, set()
    params = {"limit": PAGE_SIZE, **extra}
    for _ in range(max_pages):
        try:
            result = query(method, params)
            data, cursor = result["data"], result["nextCursor"]
            if not isinstance(data, list) or len(data) > PAGE_SIZE:
                raise ValueError("Invalid native component page")
            for value in data:
                row = normalizer(value)
                keep_distinct(rows, identity(row), row)
            if cursor is None:
                return observation(rows)
            cursor = text(cursor, 4096)
            if cursor in cursors:
                return observation(rows, "REPEATED_CURSOR")
            cursors.add(cursor)
            params["cursor"] = cursor
        except (Empty, TimeoutError):
            return observation(rows, "NATIVE_TIMEOUT")
        except REQUEST_FAILURES:
            return observation(rows, "NATIVE_REQUEST_OR_RESPONSE_FAILED")
    return observation(rows, "PAGE_LIMIT")


def skills(query, cwd):
    rows = {}
    try:
        result = query("skills/list", {"cwds": [cwd], "forceReload": True})["data"]
        if not isinstance(result, list) or len(result) != 1:
            raise ValueError("Unexpected skill workspace count")
        scoped = result[0]
        if os.path.normcase(os.path.normpath(text(scoped["cwd"], 4096))) != os.path.normcase(os.path.normpath(cwd)):
            raise ValueError("Unexpected skill workspace")
        members, errors = scoped["skills"], scoped["errors"]
        if not isinstance(members, list) or len(members) > MAX_SKILLS or not isinstance(errors, list):
            raise ValueError("Invalid native skill inventory")
        for value in members:
            row = skill(value)
            keep_distinct(rows, (row["pluginId"], os.path.normcase(os.path.normpath(row["path"]))), row)
        return observation(rows, "SKILL_DISCOVERY_ERRORS" if errors else None)
    except (Empty, TimeoutError):
        return observation(rows, "NATIVE_TIMEOUT")
    except REQUEST_FAILURES:
        return observation(rows, "NATIVE_REQUEST_OR_RESPONSE_FAILED")


def capture_components(send, cwd, timeout_seconds=145):
    deadline = time.monotonic() + timeout_seconds
    request_ids = count(15000)

    def query(method, params):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("Native component capture budget expired")
        initial_apps = method == "app/list" and "cursor" not in params
        if method == "app/list":
            params = {**params, "forceRefetch": initial_apps}
        timeout = 75 if initial_apps else 25
        return send(method, next(request_ids), params, timeout=min(timeout, remaining))

    return {
        "skills": skills(query, cwd),
        "mcpServers": paginated(query, "mcpServerStatus/list", mcp, lambda row: (row["pluginId"], row["name"]),
                                {"detail": "toolsAndAuthOnly"}),
        "apps": paginated(query, "app/list", app, lambda row: row["id"], {}, max_pages=MAX_APP_PAGES),
    }
