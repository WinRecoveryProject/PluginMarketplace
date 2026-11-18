"""Capture positive evidence for exact counterparts from native vendor detail reads."""

from itertools import count
from queue import Empty
import re
import subprocess
import time


NAMESPACE = "openai-curated-remote"
IDENTITY = re.compile(r"[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*", re.ASCII | re.I)
BACKEND_ID = re.compile(r"plugin_[a-z0-9_-]{1,128}", re.ASCII | re.I)
VERSION = re.compile(r"[a-z0-9][a-z0-9.+_-]{0,127}", re.ASCII | re.I)


def _targets(pairs):
    seen = set()
    for pair in pairs:
        if not isinstance(pair, dict):
            continue
        catalog_id = pair.get("catalogId")
        published_id = pair.get("publishedId")
        if not isinstance(catalog_id, str) or not IDENTITY.fullmatch(catalog_id):
            continue
        if not catalog_id.endswith("@" + NAMESPACE) or catalog_id in seen:
            continue
        if not isinstance(published_id, str) or not IDENTITY.fullmatch(published_id):
            continue
        slug = published_id.split("@", 1)[0]
        term = pair.get("searchTerm", slug.replace("-", " "))
        if not isinstance(term, str):
            continue
        term = term.strip()
        if not term or len(term) > 120 or not term.isprintable():
            continue
        seen.add(catalog_id)
        yield catalog_id, term


def _read_detail(send, request_ids, catalog_id, term, deadline):
    result = send("plugin/search", next(request_ids), {
        "searchTerm": term,
        "scope": "global",
        "limit": 12,
    })
    rows = result["data"]
    if not isinstance(rows, list):
        return None
    matches = []
    for row in rows:
        if not isinstance(row, dict) or row.get("marketplaceName") != NAMESPACE:
            continue
        plugin = row.get("plugin")
        if isinstance(plugin, dict) and plugin.get("id") == catalog_id:
            matches.append(plugin)
    if len(matches) != 1 or time.monotonic() >= deadline:
        return None
    backend_id = matches[0].get("remotePluginId")
    if not isinstance(backend_id, str) or not BACKEND_ID.fullmatch(backend_id):
        return None
    result = send("plugin/read", next(request_ids), {
        "pluginName": backend_id,
        "remoteMarketplaceName": NAMESPACE,
    })
    detail = result["plugin"]
    if detail.get("marketplaceName") != NAMESPACE:
        return None
    summary = detail["summary"]
    if summary.get("id") != catalog_id or summary.get("remotePluginId") != backend_id:
        return None
    return summary


def capture_vendor_details(send, counterpart_pairs, *, timeout_seconds=75):
    """Collect matching positive versions. The caller attests scope around these requests.

    The deadline prevents new requests after the budget. The supplied sender bounds
    each active request. Missing results never serve as proof of absence.
    """
    deadline = time.monotonic() + timeout_seconds
    request_ids = count(21)
    installed = []
    available = []
    for catalog_id, term in _targets(counterpart_pairs):
        if time.monotonic() >= deadline:
            break
        try:
            summary = _read_detail(send, request_ids, catalog_id, term, deadline)
        except (AttributeError, Empty, KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
            continue
        if summary is None:
            continue
        local_version = summary.get("localVersion")
        if summary.get("installed") is True and isinstance(local_version, str) and VERSION.fullmatch(local_version):
            enabled = summary.get("enabled")
            installed.append({"pluginId": catalog_id, "version": local_version, "installed": True,
                              "enabled": enabled if isinstance(enabled, bool) else None})
        version = summary.get("version")
        if summary.get("availability") == "AVAILABLE" and isinstance(version, str) and VERSION.fullmatch(version):
            available.append({"pluginId": catalog_id, "version": version})
    return {"installed": installed, "available": available}
