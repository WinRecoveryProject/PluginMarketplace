"""Capture positive evidence for exact counterparts from native vendor lookups."""

from itertools import count
from queue import Empty
import re
import subprocess
import time


NAMESPACE = "openai-curated-remote"
IDENTITY = re.compile(r"[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*", re.ASCII | re.I)
BACKEND_ID = re.compile(r"[A-Za-z0-9_~-]{1,135}", re.ASCII)
VERSION = re.compile(r"[a-z0-9][a-z0-9.+_-]{0,127}", re.ASCII | re.I)
_REQUEST_ERRORS = (AttributeError, Empty, KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError)


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


def _search_match(send, request_ids, catalog_id, term):
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
            matches.append(row)
    if len(matches) != 1:
        return None
    match = matches[0]
    backend_id = match["plugin"].get("remotePluginId")
    if not isinstance(backend_id, str) or not BACKEND_ID.fullmatch(backend_id):
        return None
    return match


def _read_detail(send, request_ids, catalog_id, backend_id):
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
            match = _search_match(send, request_ids, catalog_id, term)
        except _REQUEST_ERRORS:
            continue
        if match is None:
            continue

        detail = None
        if time.monotonic() < deadline:
            try:
                detail = _read_detail(send, request_ids, catalog_id, match["plugin"]["remotePluginId"])
            except _REQUEST_ERRORS:
                pass
            else:
                # A conflicting detail reply is not a transport failure.
                if detail is None:
                    continue
        if detail is not None:
            local_version = detail.get("localVersion")
            if detail.get("installed") is True and isinstance(local_version, str) and VERSION.fullmatch(local_version):
                enabled = detail.get("enabled")
                installed.append({"pluginId": catalog_id, "version": local_version, "installed": True,
                                  "enabled": enabled if isinstance(enabled, bool) else None})

        # The host can overlay installation fields on search rows. The remote
        # advertised release is usable only with the explicit null catalog path.
        advertised = detail
        if advertised is None and "marketplacePath" in match and match["marketplacePath"] is None:
            advertised = match["plugin"]
        if advertised is None:
            continue
        version = advertised.get("version")
        if advertised.get("availability") == "AVAILABLE" and isinstance(version, str) and VERSION.fullmatch(version):
            available.append({"pluginId": catalog_id, "version": version})
    return {"installed": installed, "available": available}
