# Plugin files: plugin-skill-studio — `tools/`

Source: `plugins/plugin-skill-studio`. Files outside the `skills/*` folders, embedded as text.

## File: `tools/capture-inventory-versions.py`

```python
"""Capture read-only evidence for Studio's inventory-versions command."""
import argparse
import base64
import concurrent.futures
import datetime
import hashlib
from http.client import HTTPException, IncompleteRead
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from native_vendor_evidence import capture_vendor_details
from native_component_inventory import capture_components, observation

GITHUB = re.compile(r"https://github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?$", re.ASCII)
IDENTITY = re.compile(r"[\da-z][\da-z._-]*@[\da-z][\da-z._-]*$", re.ASCII | re.I)
VERSION = re.compile(r"[a-z0-9][a-z0-9.+_-]{0,127}", re.ASCII | re.I)
COMPONENT = re.compile(r"[\da-z_.-]+$", re.ASCII | re.I)
REVISION = re.compile(r"[\da-f]{40}$", re.ASCII)
MANIFESTS = (".codex-plugin/plugin.json", "plugin.json")
NATIVE_NAMESPACES = {"personal": "created-by-me-remote", "business": "workspace-directory"}
SCOPED_MARKETPLACE_NAME = re.compile(r"[a-z0-9][a-z0-9._-]{0,100}", re.I | re.ASCII)
CURATED_MARKETPLACE = "openai-curated-remote"
REMOTE_MARKETPLACE_NAMES = {*NATIVE_NAMESPACES.values(), CURATED_MARKETPLACE}
ENV = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
COMMAND_TIMEOUT = 30
PERSONAL_REMOTE_PLUGIN_TIMEOUT = 75
BUSINESS_PLUGIN_TIMEOUT = 110
PUBLIC_MANIFEST_SIZE_LIMIT = 256 * 1024
PUBLIC_MANIFEST_RETRY_CODES = frozenset({408, 500, 502, 503, 504})
GIT_TRANSPORT_FAILURE = re.compile(
    rb"(?:timed out|connection (?:reset|was reset)|remote end hung up unexpectedly|could not connect to server|"
    rb"requested URL returned error: (?:408|500|502|503|504)\b)", re.I
)
INCOMPLETE_MARKETPLACE_WARNING = b"Warning: failed to list remote marketplace plugins:"

class RejectRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, url):
        return None

PUBLIC_HTTP = build_opener(RejectRedirect)

def command(*args, timeout=COMMAND_TIMEOUT, check_marketplace=False):
    result = subprocess.run(
        [str(arg) for arg in args], env=ENV, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE if check_marketplace else subprocess.DEVNULL,
        timeout=timeout, check=True,
    )
    if check_marketplace and INCOMPLETE_MARKETPLACE_WARNING in result.stderr:
        raise ValueError("Incomplete marketplace CLI output")
    return result.stdout

def github_default_head(remote):
    match = GITHUB.fullmatch(remote)
    if not match or any(segment in (".", "..") for segment in match.groups()):
        raise ValueError("Expected an HTTPS GitHub repository")
    owner, repository = match.groups()
    request = Request(f"https://api.github.com/repos/{owner}/{repository}/commits/HEAD",
                      headers={"Accept": "application/vnd.github.sha", "User-Agent": "Plugin-Skill-Studio-Inventory"})
    with PUBLIC_HTTP.open(request, timeout=8) as page:
        payload = page.read(41)
    revision = payload.decode("ascii")
    if len(payload) != 40 or not REVISION.fullmatch(revision):
        raise ValueError("GitHub did not return a complete default commit")
    return revision

def git_head(remote):
    env = {key: value for key, value in ENV.items() if not key.upper().startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT="0")
    try:
        with tempfile.TemporaryDirectory(prefix="studio-public-git-") as directory:
            value = subprocess.check_output(
                ["git", "-c", "credential.helper=", "-c", "protocol.allow=never",
                 "-c", "protocol.https.allow=always", "ls-remote", "--exit-code", remote, "HEAD"],
                cwd=directory, env=env, stderr=subprocess.PIPE, timeout=COMMAND_TIMEOUT,
            )
    except subprocess.TimeoutExpired:
        return github_default_head(remote)
    except subprocess.CalledProcessError as error:
        if not GIT_TRANSPORT_FAILURE.search(error.stderr or b""):
            raise
        return github_default_head(remote)
    fields = value.decode("ascii").split()
    if len(fields) != 2 or fields[1] != "HEAD" or not REVISION.fullmatch(fields[0]):
        raise ValueError("Invalid resolved Git revision")
    return fields[0]

PUBLIC_MANIFEST_TRANSPORT_ERRORS = (TimeoutError, ConnectionError, IncompleteRead, URLError)

def retryable_manifest_failure(failure):
    if isinstance(failure, HTTPError):
        return failure.code in PUBLIC_MANIFEST_RETRY_CODES
    return not isinstance(failure, URLError) or isinstance(failure.reason, (TimeoutError, ConnectionError))

def public_manifest_bytes(url):
    def fetch(timeout):
        with PUBLIC_HTTP.open(url, timeout=timeout) as page:
            return page.read(PUBLIC_MANIFEST_SIZE_LIMIT + 1)

    try:
        return fetch(12)
    except PUBLIC_MANIFEST_TRANSPORT_ERRORS as failure:
        if not retryable_manifest_failure(failure):
            raise
        if isinstance(failure, HTTPError):
            failure.close()
    time.sleep(0.5)
    return fetch(5)

def remote_manifest_bytes(owner, repository, revision, path):
    url = f"https://raw.githubusercontent.com/{owner}/{repository}/{revision}/{path}"
    try:
        return public_manifest_bytes(url)
    except PUBLIC_MANIFEST_TRANSPORT_ERRORS as failure:
        if not retryable_manifest_failure(failure):
            raise
        if isinstance(failure, HTTPError):
            failure.close()

    # The Contents request uses the same pinned public file and never loads an auth token.
    request = Request(f"https://api.github.com/repos/{owner}/{repository}/contents/{path}?ref={revision}",
                      headers={"Accept": "application/vnd.github+json", "User-Agent": "Plugin-Skill-Studio-Inventory"})
    limit = 2 * PUBLIC_MANIFEST_SIZE_LIMIT
    with PUBLIC_HTTP.open(request, timeout=8) as page:
        response = page.read(limit + 1)
    if len(response) > limit:
        raise ValueError("GitHub Contents response exceeds limit")
    metadata = json.loads(response)
    if (not isinstance(metadata, dict) or metadata.get("type") != "file" or metadata.get("path") != path
            or metadata.get("encoding") != "base64" or not isinstance(metadata.get("content"), str)
            or type(metadata.get("size")) is not int or not 0 <= metadata["size"] <= PUBLIC_MANIFEST_SIZE_LIMIT):
        raise ValueError("Invalid GitHub Contents metadata")
    raw = base64.b64decode("".join(metadata["content"].split()), validate=True)
    blob = hashlib.sha1(f"blob {len(raw)}\0".encode("ascii") + raw, usedforsecurity=False).hexdigest()
    if len(raw) != metadata["size"] or blob != metadata.get("sha"):
        raise ValueError("GitHub Contents blob does not match its metadata")
    return raw

def capture_publications(root):
    origin = command("git", "-C", root, "remote", "get-url", "origin").decode("utf-8").strip()
    if not GITHUB.fullmatch(origin):
        raise ValueError("Expected an HTTPS GitHub origin")
    revision = git_head(origin)
    committed = ("git", "--no-replace-objects", "-C", root, "cat-file", "blob")
    rows = json.loads(command(*committed, f"{revision}:.agents/plugins/marketplace.json"))
    namespace = rows["name"]
    expected = [f'{entry["name"]}@{namespace}' for entry in rows["plugins"]]
    if not 0 < len(expected) <= 500 or len(expected) != len(set(expected)) or not all(map(IDENTITY.fullmatch, expected)):
        raise ValueError("Invalid Marketplace identities")

    def observed_head(url):
        if not GITHUB.fullmatch(url):
            return None
        try:
            return revision if url == origin else git_head(url)
        except (IndexError, ValueError, OSError, HTTPException, subprocess.SubprocessError):
            return None

    def manifest(entry):
        identity, row = entry
        try:
            source = row["source"]
            if isinstance(source, str):
                if source != source.strip() or not (source == "." or source.startswith("./")):
                    return None
                source = {"source": "url", "url": origin, "sha": revision,
                          "path": None if source in (".", "./") else source}
            url = source["url"]
            repository = GITHUB.fullmatch(url)
            source_type = source.get("source")
            if source_type not in ("url", "git-subdir") or not repository:
                return None
            path = source.get("path")
            if source_type == "url" and path is None:
                location = ""
            else:
                if not isinstance(path, str):
                    return None
                location = path.strip().removeprefix("./")
                if source_type == "git-subdir" and location in ("", "."):
                    # Keep publication evidence readable for legacy root entries.
                    location = ""
                elif not all(COMPONENT.fullmatch(part) and part not in (".", "..") for part in location.split("/")):
                    return None
            pin, ref = source.get("sha"), source.get("ref")
            if any(value is not None and not isinstance(value, str) for value in (pin, ref)):
                return None
            pin = (pin or "").strip().lower()
            if pin:
                if not REVISION.fullmatch(pin):
                    return None
                sha = pin
            elif ref and ref.strip():
                return None
            else:
                sha = heads.get(url)
                if not sha:
                    return None
            read_local = url == origin and sha == revision
            candidates = []
            for filename in MANIFESTS:
                name = f"{location}/{filename}" if location else filename
                try:
                    if read_local:
                        raw = command(*committed, f"{sha}:{name}")
                    else:
                        owner, repo = repository.groups()
                        raw = remote_manifest_bytes(owner, repo, sha, name)
                    if len(raw) > PUBLIC_MANIFEST_SIZE_LIMIT:
                        return None
                    data = json.loads(raw)
                    candidates.append((name, data["name"], data["version"]))
                except HTTPError as failure:
                    if failure.code != 404:
                        return None
                except subprocess.CalledProcessError:
                    if not read_local:
                        return None
            if not candidates or len({data[1:] for data in candidates}) != 1 or candidates[0][1] != row["name"]:
                return None
            return {"id": identity, "version": candidates[0][2],
                    "source": {"url": url, "revision": sha, "path": candidates[0][0]}}
        except (KeyError, TypeError, ValueError, OSError, IncompleteRead, subprocess.SubprocessError):
            return None

    urls = sorted({source["url"] for entry in rows["plugins"]
                   if isinstance((source := entry.get("source")), dict) and isinstance(source.get("url"), str)})
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        heads = dict(zip(urls, pool.map(observed_head, urls)))
        entries = [row for row in pool.map(manifest, zip(expected, rows["plugins"])) if row is not None]
    return {"expected": expected, "entries": entries}

def is_native_namespace(namespace):
    canonical = namespace.lower()
    if canonical not in NATIVE_NAMESPACES.values():
        return False
    if namespace != canonical:
        raise ValueError("Native catalog namespaces must use canonical lowercase")
    return True

def identity_namespace(identity):
    return identity.rpartition("@")[2] if isinstance(identity, str) else ""

def capture_native(codex, root, account, wanted, vendor_probe=None, component_cwd=None):
    process = subprocess.Popen([str(codex), "app-server", "--stdio"], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=ENV)
    messages = queue.Queue()

    def receive():
        for line in process.stdout:
            try:
                messages.put(json.loads(line))
            except ValueError:
                continue
        messages.put(None)

    threading.Thread(target=receive, daemon=True).start()

    def send(method, request_id=None, params=None, *, timeout=30):
        data = {"method": method}
        if request_id is not None:
            data.update(id=request_id, params=params or {})
        process.stdin.write(json.dumps(data).encode("utf-8") + b"\n")
        process.stdin.flush()
        if request_id is None:
            return None
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            response = messages.get(timeout=max(0.01, deadline - time.monotonic()))
            if response is None:
                raise ValueError("Native catalog closed")
            if response.get("id") == request_id:
                return response["result"]
        raise ValueError("Native catalog did not respond")

    try:
        send("initialize", 0, {"clientInfo": {"name": "studio-inventory-audit",
             "title": "Plugin-Skill-Studio inventory audit", "version": "1.0.0"},
             "capabilities": {"experimentalApi": True}})
        send("initialized")
        observed = send("account/read", 1, {"refreshToken": False})
        plan = observed["account"]["planType"]
        workspace = observed["workspaceRouting"]["chatgptAccountId"]
        if not isinstance(workspace, str) or not workspace:
            raise ValueError("Native scope has no workspace identity")
        business = {"team", "business", "enterprise", "edu"}
        personal = {"free", "go", "plus", "pro", "prolite"}
        if plan not in (business if account == "business" else personal):
            raise ValueError("Active scope is different or unknown")
        required = NATIVE_NAMESPACES[account]
        sections = []
        native_errors = []
        try:
            result = send("plugin/list", 2, {"cwds": [str(root)], "marketplaceKinds": [required], "forceRefetch": True})
            sections = [row for row in result["marketplaces"] if row.get("name") == required]
            if not sections or result.get("marketplaceLoadErrors"):
                native_errors.append("Native catalog load error")
        except (queue.Empty, KeyError, TypeError, ValueError, OSError):
            native_errors.append("Active native catalog unavailable")
        vendor = vendor_probe(send) if vendor_probe else None
        components = capture_components(send, str(component_cwd)) if component_cwd is not None else None
        after = send("account/read", 3, {"refreshToken": False})
        if after["workspaceRouting"]["chatgptAccountId"] != workspace or after["account"]["planType"] != plan:
            raise ValueError("Native account scope changed during capture")
        observed = [{"name": section["name"],
                     "plugins": [{key: row.get(key) for key in ("id", "version", "localVersion", "installed", "enabled")}
                                 for row in section["plugins"] if row.get("installed") is True or row.get("id") in wanted]}
                    for section in sections]
        if vendor and vendor["installed"]:
            observed.append({"name": CURATED_MARKETPLACE, "targeted": True,
                             "plugins": [{"id": row["pluginId"], "localVersion": row["version"],
                                          "installed": True, "enabled": row["enabled"]}
                                         for row in vendor["installed"]]})
        fingerprint = hashlib.sha256(("studio-inventory:" + workspace).encode("utf-8")).hexdigest()
        catalog = {"marketplaces": observed, "marketplaceLoadErrors": native_errors}
        if components is not None:
            catalog["components"] = components
        return fingerprint, catalog, vendor
    except (queue.Empty, KeyError, TypeError, ValueError, OSError):
        return None, {"marketplaces": [], "marketplaceLoadErrors": ["Active native catalog unavailable"]}, None
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)

def observed_installations(data):
    rows = data["installed"]
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError("Expected a list of installed plugin records")
    return {"installed": [{key: row.get(key) for key in ("pluginId", "version", "enabled", "installed")}
                          for row in rows if row.get("installed") is not False
                          and not is_native_namespace(identity_namespace(row.get("pluginId")))]}

def validated_cli_installations(data):
    installed = observed_installations(data)
    if data.get("marketplaceLoadErrors") or len(installed["installed"]) > 20000:
        raise ValueError("Incomplete installed CLI listing")
    for row in installed["installed"]:
        plugin_id, version = row["pluginId"], row["version"]
        if not isinstance(plugin_id, str) or not IDENTITY.fullmatch(plugin_id):
            raise ValueError("Invalid installed CLI identity")
        if version is not None and (not isinstance(version, str) or not VERSION.fullmatch(version)):
            raise ValueError("Invalid installed CLI version")
        if any(row[key] is not None and not isinstance(row[key], bool) for key in ("enabled", "installed")):
            raise ValueError("Invalid installed CLI state")
    return installed

def scoped_installations(namespace, data):
    installed = validated_cli_installations(data)
    # Check raw identities as normalization can omit inactive and native rows.
    if any(identity_namespace(row.get("pluginId")) != namespace for row in data["installed"]):
        raise ValueError("Unexpected row outside selected Marketplace")
    return {"label": "Marketplace CLI: " + namespace, "kind": "scoped-cli",
            "namespace": namespace, "data": installed}

def capture_marketplace_installations(codex, namespace, timeout):
    try:
        data = json.loads(command(codex, "plugin", "list", "--marketplace", namespace, "--json",
                                  timeout=timeout, check_marketplace=True))
        return scoped_installations(namespace, data)
    except (AttributeError, KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
        return None

def capture_configured_installations(codex, publication, timeout):
    published = {identity_namespace(value) for value in publication["expected"]}
    configured = set()
    try:
        registry = json.loads(command(codex, "plugin", "marketplace", "list", "--json",
                                      timeout=timeout, check_marketplace=True))
        rows = registry["marketplaces"]
        if isinstance(rows, list) and len(rows) <= 99:
            configured = {row["name"] for row in rows if isinstance(row, dict)
                          and isinstance(row.get("name"), str)}
    except (KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
        pass
    names = sorted(name for name in configured | published if SCOPED_MARKETPLACE_NAME.fullmatch(name)
                   and name.lower() not in REMOTE_MARKETPLACE_NAMES)
    # One slot in the reconciliation input is reserved for the native catalog.
    if len(names) > 99:
        names = sorted(published & set(names))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        snapshots = pool.map(lambda name: capture_marketplace_installations(codex, name, timeout), names)
        return [snapshot for snapshot in snapshots if snapshot is not None]

def capture(args):
    codex, root = args.codex.resolve(strict=True), args.marketplace.resolve(strict=True)
    component_cwd = getattr(args, "components", None)
    if component_cwd is not None:
        component_cwd = component_cwd.resolve(strict=True)
        if not component_cwd.is_dir():
            raise ValueError("Component inventory requires a workspace directory")
    mappings = json.loads(args.counterparts.read_text(encoding="utf-8-sig")) if args.counterparts else []
    if not isinstance(mappings, list) or len(mappings) > 1000:
        raise ValueError("Expected explicit catalog counterpart list")
    counterpart = [{"publishedId": row["publishedId"], "catalogId": row["catalogId"]} for row in mappings]
    wanted = {row["catalogId"] for row in counterpart}
    if not all(IDENTITY.fullmatch(row["publishedId"]) for row in counterpart):
        raise ValueError("Invalid published counterpart identity")
    if not all(IDENTITY.fullmatch(value) for value in wanted):
        raise ValueError("Invalid catalog counterpart identity")
    scopes = sorted({namespace for value in wanted
                     if not is_native_namespace(namespace := identity_namespace(value))})

    local_timeout = BUSINESS_PLUGIN_TIMEOUT if args.account == "business" else COMMAND_TIMEOUT
    remote_timeout = BUSINESS_PLUGIN_TIMEOUT if args.account == "business" else PERSONAL_REMOTE_PLUGIN_TIMEOUT

    def provider(namespace):
        try:
            timeout = remote_timeout if namespace == CURATED_MARKETPLACE else local_timeout
            data = json.loads(command(codex, "plugin", "list", "--marketplace", namespace, "--available", "--json",
                                      timeout=timeout, check_marketplace=True))
            if not isinstance(data, dict) or data.get("marketplaceLoadErrors"):
                raise ValueError("Incomplete vendor catalog")
            inventory = scoped_installations(namespace, data)
            installed = [{"pluginId": row["pluginId"], "version": row["version"]}
                         for row in inventory["data"]["installed"]
                         if row["pluginId"] in wanted and row["version"] is not None]
            rows = data["available"]
            if not isinstance(rows, list):
                raise ValueError("Expected a vendor plugin list")
            available = []
            for row in rows:
                plugin_id = row.get("pluginId") if isinstance(row, dict) else None
                if not isinstance(plugin_id, str):
                    raise ValueError("Invalid vendor plugin identity")
                if plugin_id not in wanted:
                    continue
                version = row.get("version")
                if not isinstance(version, str) or not VERSION.fullmatch(version):
                    raise ValueError("Invalid vendor plugin version")
                available.append({"pluginId": plugin_id, "version": version})
            if len(available) > 20000:
                raise ValueError("Vendor records exceed inventory limit")
            return {"namespace": namespace, "exitCode": 0,
                    "data": {"installed": installed, "available": available}}, inventory
        except (KeyError, TypeError, OSError, ValueError, subprocess.SubprocessError):
            return {"namespace": namespace, "exitCode": 2}, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        cli = pool.submit(command, codex, "plugin", "list", "--json",
                          timeout=remote_timeout, check_marketplace=True)
        published = pool.submit(capture_publications, root)
        curated = pool.submit(provider, CURATED_MARKETPLACE) if CURATED_MARKETPLACE in scopes else None

        def recover_vendor(send):
            if curated.result()[0]["exitCode"] == 0:
                return None
            return capture_vendor_details(send, mappings)

        component_options = {"component_cwd": component_cwd} if component_cwd is not None else {}
        native = pool.submit(capture_native, codex, root, args.account, wanted, recover_vendor if curated else None,
                             **component_options)
        providers = [curated if scope == CURATED_MARKETPLACE else pool.submit(provider, scope) for scope in scopes]
        provider_results = [query.result() for query in providers]
    catalogs = [catalog for catalog, _ in provider_results]
    current = []
    cli_failure = None
    try:
        data = json.loads(cli.result())
        installed = validated_cli_installations(data)
    except subprocess.TimeoutExpired:
        cli_failure = "TIMEOUT"
    except (KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
        cli_failure = "FAILED"
    else:
        current.append({"label": "CLI", "kind": "cli", "data": installed})
    publication = published.result()
    if cli_failure:
        scoped = {row["namespace"]: row for row in capture_configured_installations(codex, publication, local_timeout)}
        for _, observed in provider_results:
            if observed is not None:
                scoped.setdefault(observed["namespace"], observed)
        current.extend(list(scoped.values())[:99])
    history = [] if not args.previous else [{"label": "previous", "kind": "historical",
        "data": observed_installations(json.loads(args.previous.read_text(encoding="utf-8-sig")))}]
    workspace_fingerprint, catalog, recovered_vendor = native.result()
    components = catalog.pop("components", None)
    current.append({"label": "Native", "kind": "catalog", "data": catalog})
    if recovered_vendor and (recovered_vendor["installed"] or recovered_vendor["available"]):
        catalogs = [
            {"namespace": row["namespace"], "exitCode": 0, "scope": "targeted", "data": recovered_vendor}
            if row["namespace"] == CURATED_MARKETPLACE and row["exitCode"] != 0 else row
            for row in catalogs
        ]
    inventory = {"current": current, "historical": history}
    if cli_failure:
        inventory["cliFailure"] = cli_failure
    report = {"scope": {"host": args.host, "account": args.account,
              "workspaceFingerprint": workspace_fingerprint,
              "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")},
              "inventory": inventory,
              "published": publication, "catalogs": catalogs, "counterparts": counterpart}
    if component_cwd is not None:
        report["componentWorkspace"] = str(component_cwd)
        report["components"] = components if components is not None else {
            name: observation({}, "ACCOUNT_SCOPE_UNVERIFIED") for name in ("apps", "skills", "mcpServers")
        }
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--marketplace", type=Path, required=True, help="Local copy of the published Marketplace")
    parser.add_argument("--codex", type=Path, required=True, help="Trusted host Codex CLI executable")
    parser.add_argument("--account", choices=["personal", "business"], required=True)
    parser.add_argument("--host", required=True, help="One device label, such as Acer")
    parser.add_argument("--counterparts", type=Path, help="Explicit list of publishedId/catalogId pairs")
    parser.add_argument("--previous", type=Path, help="Previous full installed CLI list for the same scope")
    parser.add_argument("--components", type=Path, metavar="WORKSPACE", help="Include native App, skill and MCP discovery")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = capture(args)
    with args.out.open("x", encoding="utf-8") as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
        out.write("\n")

if __name__ == "__main__":
    main()
```

## File: `tools/matt/package_plugin.py`

```python
#!/usr/bin/env python3
from __future__ import annotations
import hashlib, os, stat, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else ROOT/'dist'/'matt-skills-curated.zip'
SKIP_TOP={'.git','node_modules','dist'}
SKIP_NAMES={'.DS_Store','__pycache__'}
files=[]
for p in ROOT.rglob('*'):
    rel=p.relative_to(ROOT)
    if not rel.parts or rel.parts[0] in SKIP_TOP: continue
    if any(part in SKIP_NAMES for part in rel.parts): continue
    if p.is_symlink(): raise SystemExit(f'symlink not allowed: {rel}')
    if p.is_file() and p.resolve()!=OUT: files.append((rel,p))
OUT.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for rel,p in sorted(files,key=lambda x:x[0].as_posix()):
        info=zipfile.ZipInfo(rel.as_posix(),date_time=(1980,1,1,0,0,0))
        info.create_system=3
        mode=0o755 if os.access(p,os.X_OK) else 0o644
        info.external_attr=(stat.S_IFREG|mode)<<16
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
data=OUT.read_bytes()
print(f'{OUT}\nsha256={hashlib.sha256(data).hexdigest()}\nbytes={len(data)}\nfiles={len(files)}')
```

## File: `tools/matt/route_skill.py`

```python
#!/usr/bin/env python3
"""
ChatGPT & Codex Deterministic Skill Router Engine.

Analyzes user queries, classifies engineering intent, and returns the narrowest,
highest-leverage specialist skill from the 42 curated skills in matt-skills-curated.
"""

from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"

# Deterministic Intent Matching Rules
ROUTING_RULES: Dict[str, Dict[str, Any]] = {
    # Discovery & Planning
    "grill-with-docs": {
        "patterns": [
            r"\b(grill with docs|interview.*adr|interview.*context\.md|capture.*domain docs)\b",
            r"\b(interview.*architecture decisions?|grill.*document)\b"
        ],
        "keywords": ["grill with docs", "adr interview", "document domain"],
        "category": "Discovery & Planning",
        "description": "Focused interview while capturing domain terms & ADRs concurrently."
    },
    "grill-me": {
        "patterns": [
            r"\b(grill me|stress test my thinking|expose assumptions|poke holes in my plan)\b",
            r"\b(interview me before coding|ask me hard questions)\b"
        ],
        "keywords": ["grill me", "poke holes", "stress test", "expose assumptions"],
        "category": "Discovery & Planning",
        "description": "Socratic interview to expose ambiguity and weak assumptions."
    },
    "grilling": {
        "patterns": [
            r"\b(grill|grilling|decision frontier|interview rounds?)\b"
        ],
        "keywords": ["grill", "grilling", "decision questions"],
        "category": "Discovery & Planning",
        "description": "Relentless multi-round questioning to sharpen fuzzy thinking."
    },
    "to-spec": {
        "patterns": [
            r"\b(to spec|write a spec|create spec|generate specification|technical spec)\b",
            r"\b(turn.*into a spec|formalize requirements)\b"
        ],
        "keywords": ["spec", "specification", "technical spec", "to-spec"],
        "category": "Discovery & Planning",
        "description": "Synthesize a buildable specification from conversational context."
    },
    "to-tickets": {
        "patterns": [
            r"\b(to tickets|break into tickets|create tickets|task graph|tracer bullets)\b",
            r"\b(split into issues|decomposition.*tickets)\b"
        ],
        "keywords": ["tickets", "tracer bullets", "task graph", "break down"],
        "category": "Discovery & Planning",
        "description": "Decompose spec into ordered tracer-bullet DAG tickets."
    },
    "to-questionnaire": {
        "patterns": [
            r"\b(to questionnaire|questionnaire for stakeholders?|async questions?)\b",
            r"\b(client questionnaire|requirements survey)\b"
        ],
        "keywords": ["questionnaire", "stakeholder questions", "async inquiry"],
        "category": "Discovery & Planning",
        "description": "Turn unknown requirements into a structured stakeholder questionnaire."
    },
    "prototype": {
        "patterns": [
            r"\b(prototype|throwaway code|spike|explore ui look|quick mockup)\b",
            r"\b(scratch branch|sanity check state model)\b"
        ],
        "keywords": ["prototype", "mockup", "throwaway", "ui spike"],
        "category": "Discovery & Planning",
        "description": "Build throwaway code or UI mockup to answer design uncertainties."
    },
    "workflow-designer": {
        "patterns": [
            r"\b(workflow designer|design.*workflow|operational routine|recurring process)\b",
            r"\b(sop|standard operating procedure|process specification)\b"
        ],
        "keywords": ["workflow", "operational routine", "recurring process", "sop"],
        "category": "Discovery & Planning",
        "description": "Design reliable recurring operational workflows with human checkpoints."
    },
    "research": {
        "patterns": [
            r"\b(research|investigate api|read documentation|gather docs|background research)\b",
            r"\b(primary source research|read third party docs)\b"
        ],
        "keywords": ["research", "investigate api", "read docs", "primary sources"],
        "category": "Discovery & Planning",
        "description": "Investigate external documentation and capture cited research notes."
    },

    # Architecture & Design
    "domain-modeling": {
        "patterns": [
            r"\b(domain model|ubiquitous language|context\.md|domain terms?|adr)\b",
            r"\b(architectural decision record|define entities|glossary)\b"
        ],
        "keywords": ["domain modeling", "ubiquitous language", "context.md", "adr"],
        "category": "Architecture & Design",
        "description": "Define ubiquitous language, domain entities, and ADRs."
    },
    "codebase-design": {
        "patterns": [
            r"\b(codebase design|deep modules?|ousterhout|module interface|design seams?)\b",
            r"\b(interface design|module boundary)\b"
        ],
        "keywords": ["deep modules", "codebase design", "interface design", "module seams"],
        "category": "Architecture & Design",
        "description": "Design deep modules with small interfaces hiding deep complexity."
    },
    "improve-codebase-architecture": {
        "patterns": [
            r"\b(improve architecture|codebase architecture|churn analysis|shallow modules)\b",
            r"\b(architectural audit|visual architecture report)\b"
        ],
        "keywords": ["improve architecture", "architectural review", "churn hotspot"],
        "category": "Architecture & Design",
        "description": "Audit codebase for shallow modules and git churn hotspots."
    },
    "setup-ts-deep-modules": {
        "patterns": [
            r"\b(setup ts deep modules|dependency-cruiser|ts boundaries|package entry points?)\b",
            r"\b(barrel files?|circular dependencies?|enforce ts modules)\b"
        ],
        "keywords": ["dependency-cruiser", "ts deep modules", "boundary rules"],
        "category": "Architecture & Design",
        "description": "Enforce strict TypeScript package boundaries with dependency-cruiser."
    },
    "migrate-to-shoehorn": {
        "patterns": [
            r"\b(shoehorn|frompartial|fromany|fromexact|migrate.*type assertions?)\b",
            r"\b(unsafe typecast in tests?|fix test fixtures? types?)\b"
        ],
        "keywords": ["shoehorn", "frompartial", "fromany", "test typecast"],
        "category": "Architecture & Design",
        "description": "Migrate unsafe test type assertions to @total-typescript/shoehorn."
    },

    # Execution, Code & Safety
    "implement": {
        "patterns": [
            r"\b(implement|build this feature|code the spec|write code for.*ticket)\b",
            r"\b(execute plan|start coding)\b"
        ],
        "keywords": ["implement", "build feature", "code spec", "write code"],
        "category": "Execution & Quality",
        "description": "Implement approved specs via vertical tracer slices and TDD."
    },
    "implement-spec": {
        "patterns": [
            r"\b(implement spec|parallel subagents?|subagent worktrees?|multi-agent pr)\b",
            r"\b(build whole spec with agents)\b"
        ],
        "keywords": ["implement-spec", "subagent worktree", "parallel implementers"],
        "category": "Execution & Quality",
        "description": "Orchestrate parallel subagents implementing a task graph into a single PR."
    },
    "tdd": {
        "patterns": [
            r"\b(tdd|test driven|test first|red green refactor|unit test for)\b",
            r"\b(write failing test first)\b"
        ],
        "keywords": ["tdd", "test driven", "red-green", "test-first"],
        "category": "Execution & Quality",
        "description": "Implement behavior test-first through red-green-refactor cycles."
    },
    "diagnosing-bugs": {
        "patterns": [
            r"\b(diagnose|debug|fix bug|broken behavior|exception|failing test|flaky)\b",
            r"\b(investigate failure|regression|slow query|crash)\b"
        ],
        "keywords": ["diagnose", "debug", "bug", "broken", "failing", "crash", "flake"],
        "category": "Execution & Quality",
        "description": "Diagnose hard bugs and performance regressions using a tight red loop."
    },
    "code-review": {
        "patterns": [
            r"\b(code review|review branch|review pr|review diff|audit diff)\b",
            r"\b(two axis review|check against coding standards)\b"
        ],
        "keywords": ["code review", "review pr", "review branch", "diff audit"],
        "category": "Execution & Quality",
        "description": "Two-axis code review against Standards and Spec compliance."
    },
    "resolving-merge-conflicts": {
        "patterns": [
            r"\b(merge conflict|rebase conflict|resolve conflict|git conflict markers?)\b",
            r"\b(fix merge|rebase failed)\b"
        ],
        "keywords": ["merge conflict", "rebase conflict", "conflict markers"],
        "category": "Execution & Quality",
        "description": "Resolve Git merge/rebase conflicts by intent traced to primary sources."
    },
    "git-safety-guardrails": {
        "patterns": [
            r"\b(git safety|git guardrails|block dangerous git|force push protection)\b",
            r"\b(prevent hard reset|intercept destructive git)\b"
        ],
        "keywords": ["git guardrails", "git safety", "block git push", "hard reset guard"],
        "category": "Execution & Quality",
        "description": "Intercept and block destructive or history-rewriting Git operations."
    },
    "setup-engineering-workflows": {
        "patterns": [
            r"\b(setup engineering workflows|setup workflows|configure issue tracker)\b",
            r"\b(setup triage labels|setup context\.md)\b"
        ],
        "keywords": ["setup engineering workflows", "configure tracker", "triage labels"],
        "category": "Execution & Quality",
        "description": "Configure repository issue tracker, triage labels, and domain doc rules."
    },
    "setup-pre-commit": {
        "patterns": [
            r"\b(setup pre commit|husky|lint-staged|pre-commit hooks?|prettier hook)\b",
            r"\b(install husky|staged linter)\b"
        ],
        "keywords": ["setup pre-commit", "husky", "lint-staged", "git hooks"],
        "category": "Execution & Quality",
        "description": "Configure Husky and lint-staged pre-commit checks with Prettier."
    },
    "triage": {
        "patterns": [
            r"\b(triage|triage issues?|process bug reports?|agent brief|out of scope kb)\b",
            r"\b(classify incoming issues?|reproduce bug report)\b"
        ],
        "keywords": ["triage", "triage issues", "agent brief", "out-of-scope"],
        "category": "Execution & Quality",
        "description": "Classify external issues, reproduce bugs, and author agent briefs."
    },
    "wayfinder": {
        "patterns": [
            r"\b(wayfinder|map out project|fog of war|decision tickets?|multi session effort)\b",
            r"\b(huge greenfield|massive migration map)\b"
        ],
        "keywords": ["wayfinder", "fog of war", "decision map", "multi-session"],
        "category": "Execution & Quality",
        "description": "Map and navigate large, uncertain multi-session efforts with decision tickets."
    },
    "wizard": {
        "patterns": [
            r"\b(wizard|bash wizard|interactive setup script|provision credentials)\b",
            r"\b(manual dashboard steps?|ci secrets wizard)\b"
        ],
        "keywords": ["wizard", "bash wizard", "dashboard setup", "credentials script"],
        "category": "Execution & Quality",
        "description": "Generate an interactive Bash wizard for human-only dashboard steps."
    },

    # AI, ML & Cognitive Super-Skills
    "ai-engineering": {
        "patterns": [
            r"\b(ai engineering|train model|fine tune|lora|qlora|peft|vllm|onnx)\b",
            r"\b(sub-100ms inference|model serving|disparate impact|fairness audit)\b"
        ],
        "keywords": ["ai engineering", "fine-tuning", "lora", "model serving", "latency budget"],
        "category": "AI, ML & Cognitive",
        "description": "Production ML & LLM engineering with sub-100ms latency and fairness audits."
    },
    "ai-data-remediation": {
        "patterns": [
            r"\b(data remediation|self healing data|ast validation|anomaly clustering)\b",
            r"\b(zero loss reconciliation|fix corrupt data pipeline|etl error healing)\b"
        ],
        "keywords": ["data remediation", "self-healing", "ast validation", "zero loss"],
        "category": "AI, ML & Cognitive",
        "description": "Self-healing data pipeline layer using AST-validated lambda fixes."
    },
    "ml-best-practices": {
        "patterns": [
            r"\b(ml best practices|bootstrap confidence intervals?|leakage free|eda)\b",
            r"\b(dual model baseline|missing value strategy|statistical ml)\b"
        ],
        "keywords": ["ml best practices", "bootstrap ci", "eda", "data leakage"],
        "category": "AI, ML & Cognitive",
        "description": "Statistical ML standards: leakage-free splits and 95% bootstrap CIs."
    },
    "j-space": {
        "patterns": [
            r"\b(j space|j-space|inner cognitive|inner reasoning|three registers)\b",
            r"\b(long horizon planning|seam audit|deep thinking mode)\b"
        ],
        "keywords": ["j-space", "cognitive workspace", "three registers", "seam audit"],
        "category": "AI, ML & Cognitive",
        "description": "Inner cognitive workspace for multi-step reasoning and register separation."
    },
    "goal": {
        "patterns": [
            r"\b(goal prompt|autonomous goal|overnight run|unattended execution)\b",
            r"\b(goal contract|autonomous mission)\b"
        ],
        "keywords": ["goal", "goal prompt", "autonomous mission", "unattended run"],
        "category": "AI, ML & Cognitive",
        "description": "Synthesize high-leverage /goal prompts for unattended autonomous runs."
    },
    "skill-conductor": {
        "patterns": [
            r"\b(skill conductor|author skill|create skill|improve skill|skill evals?)\b",
            r"\b(bineval|10 canonical principles|package skills?)\b"
        ],
        "keywords": ["skill-conductor", "author skill", "improve skill", "skill evals"],
        "category": "AI, ML & Cognitive",
        "description": "Full lifecycle management for agent skills: draft, test, review, package."
    },

    # Continuity, Teaching & Communication
    "handoff": {
        "patterns": [
            r"\b(handoff|save session|session continuation|transfer context|pause work)\b",
            r"\b(switch agents?|compact session to file)\b"
        ],
        "keywords": ["handoff", "session continuation", "transfer work", "pause session"],
        "category": "Continuity & Teaching",
        "description": "Compact conversation context and decisions into a portable handoff file."
    },
    "retro": {
        "patterns": [
            r"\b(retro|retrospective|audit agent mistakes?|improve agent environment)\b",
            r"\b(review session mistakes|rule hierarchy)\b"
        ],
        "keywords": ["retro", "retrospective", "audit mistakes", "agent environment"],
        "category": "Continuity & Teaching",
        "description": "Conduct session retrospective to optimize navigation pointers and rules."
    },
    "wait-what": {
        "patterns": [
            r"\b(wait what|i don't get it|re-pitch|simplify explanation|too complex)\b",
            r"\b(explain simpler|ste100|plain english)\b"
        ],
        "keywords": ["wait-what", "re-pitch", "simplify explanation", "plain english"],
        "category": "Continuity & Teaching",
        "description": "Re-pitch an explanation from a simpler angle using plain English."
    },
    "teach": {
        "patterns": [
            r"\b(teach me|explain concept|learning lab|lesson|how does this work)\b",
            r"\b(learning records?|study this codebase)\b"
        ],
        "keywords": ["teach", "lesson", "learning lab", "explain concept"],
        "category": "Continuity & Teaching",
        "description": "Teach technical concepts interactively via HTML labs and learning records."
    },
    "writing-for-agents": {
        "patterns": [
            r"\b(writing for agents|agent instructions?|prompt guidelines?|steerable docs)\b",
            r"\b(author agents\.md|author claude\.md|context pointers?)\b"
        ],
        "keywords": ["writing-for-agents", "agent instructions", "steerable docs"],
        "category": "Continuity & Teaching",
        "description": "Author steerable agent documents, AGENTS.md rules, and context pointers."
    },

    # Writing & Educational Scaffolding
    "writing-fragments": {
        "patterns": [
            r"\b(writing fragments|brainstorm notes|capture ideas|raw fragments)\b",
            r"\b(explore article ideas|leading word capture)\b"
        ],
        "keywords": ["writing-fragments", "brainstorm notes", "raw fragments"],
        "category": "Writing & Scaffolding",
        "description": "Capture unstructured writing fragments and metaphors with zero friction."
    },
    "writing-shape": {
        "patterns": [
            r"\b(writing shape|shape draft|turn notes into draft|block by block)\b",
            r"\b(assemble article|concept grounding)\b"
        ],
        "keywords": ["writing-shape", "shape draft", "turn notes into article"],
        "category": "Writing & Scaffolding",
        "description": "Shape raw note fragments into a structured article draft block-by-block."
    },
    "writing-beats": {
        "patterns": [
            r"\b(writing beats|narrative beats|beat by beat|choose your own adventure)\b",
            r"\b(interactive drafting|branching article)\b"
        ],
        "keywords": ["writing-beats", "narrative beats", "beat by beat drafting"],
        "category": "Writing & Scaffolding",
        "description": "Develop long-form writing through an interactive beat-by-beat journey."
    },
    "scaffold-exercises": {
        "patterns": [
            r"\b(scaffold exercises|create exercise|course exercises|workshop tutorial)\b",
            r"\b(problem explainer solution folders?|ai hero cli internal lint)\b"
        ],
        "keywords": ["scaffold-exercises", "exercise boilerplate", "workshop exercises"],
        "category": "Writing & Scaffolding",
        "description": "Scaffold numbered educational exercise folders and problem/solution variants."
    }
}

def classify_intent(query: str) -> Dict[str, Any]:
    cleaned = query.strip().lower()
    scores: List[Tuple[str, float, str]] = []

    for skill, rule in ROUTING_RULES.items():
        score = 0.0
        match_reason = "general match"

        for pat in rule.get("patterns", []):
            if re.search(pat, cleaned):
                score += 10.0
                match_reason = f"regex match on '{pat}'"
                break

        for kw in rule.get("keywords", []):
            if kw in cleaned:
                score += 4.0
                match_reason = f"keyword match on '{kw}'"

        if score > 0:
            scores.append((skill, score, match_reason))

    if not scores:
        return {
            "primary_skill": "engineering-workflow-guide",
            "category": "Workflow Routing",
            "confidence": 0.5,
            "reason": "Default router fallback for general or multi-phase query",
            "pipeline": ["engineering-workflow-guide"],
            "skill_path": str(SKILLS_DIR / "engineering-workflow-guide" / "SKILL.md")
        }

    scores.sort(key=lambda x: x[1], reverse=True)
    best_skill, best_score, best_reason = scores[0]
    rule_meta = ROUTING_RULES.get(best_skill, {})

    pipeline = [best_skill]
    if best_skill in {"grill-me", "grill-with-docs", "grilling"}:
        pipeline = [best_skill, "to-spec", "to-tickets", "implement", "code-review"]
    elif best_skill == "to-spec":
        pipeline = ["to-spec", "to-tickets", "implement", "code-review"]
    elif best_skill == "to-tickets":
        pipeline = ["to-tickets", "implement", "code-review"]
    elif best_skill == "implement":
        pipeline = ["implement", "code-review"]
    elif best_skill == "diagnosing-bugs":
        pipeline = ["diagnosing-bugs", "tdd", "code-review"]
    elif best_skill == "ai-engineering":
        pipeline = ["ai-engineering", "ml-best-practices", "code-review"]
    elif best_skill == "writing-fragments":
        pipeline = ["writing-fragments", "writing-shape"]

    return {
        "primary_skill": best_skill,
        "category": rule_meta.get("category", "General"),
        "confidence": min(1.0, best_score / 10.0),
        "reason": best_reason,
        "description": rule_meta.get("description", ""),
        "pipeline": pipeline,
        "skill_path": str(SKILLS_DIR / best_skill / "SKILL.md")
    }

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/route_skill.py \"<user request prompt>\" [--json]")
        sys.exit(1)

    json_mode = "--json" in sys.argv
    query_args = [a for a in sys.argv[1:] if a != "--json"]
    query = " ".join(query_args)

    result = classify_intent(query)

    if json_mode:
        print(json.dumps(result, indent=2))
    else:
        print("=" * 60)
        print("🎯 CHATGPT SKILL ROUTER VERDICT")
        print("=" * 60)
        print(f"Query:         {query}")
        print(f"Primary Skill: {result['primary_skill']}")
        print(f"Category:      {result['category']}")
        print(f"Confidence:    {result['confidence'] * 100:.1f}%")
        print(f"Reason:        {result['reason']}")
        print(f"Skill Path:    {result['skill_path']}")
        print(f"Lifecycle Plan: {' -> '.join(result['pipeline'])}")
        print("=" * 60)

if __name__ == "__main__":
    main()
```

## File: `tools/matt/test_git_safety_guardrails.py`

```python
#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
classifier = ROOT / "skills" / "git-safety-guardrails" / "scripts" / "classify_git_command.py"

def classify(*parts: str):
    result = subprocess.run([sys.executable, str(classifier), *parts], text=True, capture_output=True)
    data = json.loads(result.stdout)
    return result.returncode, data

for command in [
    ("git", "status"),
    ("git", "diff", "--stat"),
    ("git", "fetch", "origin"),
    ("git", "push", "origin", "feature-branch"),
]:
    code, data = classify(*command)
    assert code == 0, (command, code, data)
    assert data["classification"] == "allow", (command, data)

for command in [
    ("git", "reset", "--hard", "HEAD"),
    ("git", "clean", "-fd"),
    ("git", "branch", "-D", "feature"),
    ("git", "push", "--force", "origin", "main"),
    ("git", "rebase", "main"),
]:
    code, data = classify(*command)
    assert code == 2, (command, code, data)
    assert data["classification"] == "review", (command, data)
    assert data["reason"], (command, data)

print("git safety classifier: PASS")
```

## File: `tools/matt/test_wizard_template.py`

```python
#!/usr/bin/env python3
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
template = ROOT / "skills" / "wizard" / "template.sh"
lines = template.read_text().splitlines()
marker = next(i for i, line in enumerate(lines) if "STAGES — author this section" in line)
library = "\n".join(lines[: marker - 1]) + "\n"

# Normal writes, input validation, and browser fallback.
with tempfile.TemporaryDirectory() as td:
    env_file = Path(td) / ".env"
    harness = Path(td) / "harness.sh"
    harness.write_text(
        library
        + """
ENV_FILE="$1"
write_env GOOD "alpha=beta"
if write_env BAD $'one\\nINJECTED=1'; then exit 41; fi
if write_env BADCR $'one\\rtwo'; then exit 42; fi
if write_env 'BAD-NAME' "value"; then exit 43; fi
PATH=/definitely-not-a-real-bin open_url "https://example.invalid"
"""
    )
    result = subprocess.run(["bash", str(harness), str(env_file)], text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stdout + result.stderr)
    actual = env_file.read_text()
    assert actual == "GOOD=alpha=beta\n", actual
    combined = result.stdout + result.stderr
    assert "refusing multiline value for BAD" in combined
    assert "refusing multiline value for BADCR" in combined
    assert "invalid environment key: BAD-NAME" in combined
    assert "couldn't open a browser" in combined

# A real read error must never replace the original environment file.
with tempfile.TemporaryDirectory() as td:
    td_path = Path(td)
    env_file = td_path / ".env"
    env_file.write_text("KEEP=original\n")
    fakebin = td_path / "bin"
    fakebin.mkdir()
    fake_grep = fakebin / "grep"
    fake_grep.write_text("#!/usr/bin/env bash\nexit 2\n")
    fake_grep.chmod(0o755)
    harness = td_path / "grep-failure.sh"
    harness.write_text(
        library
        + f"""
ENV_FILE="$1"
PATH="{fakebin}:$PATH"
if write_env NEW "value"; then exit 44; fi
"""
    )
    result = subprocess.run(["bash", str(harness), str(env_file)], text=True, capture_output=True)
    assert result.returncode == 0, result.stdout + result.stderr
    assert env_file.read_text() == "KEEP=original\n"
    assert "leaving it unchanged" in (result.stdout + result.stderr)

print("wizard template safety: PASS")
```

## File: `tools/matt/validate_plugin.py`

```python
#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ROOT = {
    '.codex-plugin', '.github', '.gitignore', 'AGENTS.md', 'LICENSE', 'PRIVACY.md',
    'README.md', 'SUPPORT.md', 'TERMS.md', 'THIRD_PARTY_NOTICES.md', 'assets',
    'scripts', 'skills', 'source-provenance.json'
}
EXPECTED_SKILL_COUNT = 42
OLD_SLUGS = {'ask-matt', 'setup-matt-pocock-skills', 'git-guardrails-claude-code', 'loop-me', 'claude-handoff'}
FORBIDDEN_NAMES = {'.DS_Store', 'node_modules', '.claude-plugin', '.changeset', '.out-of-scope', 'CLAUDE.md'}
FORBIDDEN_TEXT = ('/Us'+'ers/', 'security-'+'penetration-'+'tester', 'telemetry_'+'init.py')
SEMVER = re.compile(r'^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$')
IDENT = re.compile(r'^[A-Za-z0-9_-]{1,64}$')

errors: list[str] = []

def fail(msg: str) -> None:
    errors.append(msg)

def frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        fail(f'{path}: missing YAML frontmatter')
        return {}
    try:
        block = text.split('\n---\n', 1)[0][4:]
    except Exception:
        fail(f'{path}: malformed YAML frontmatter')
        return {}
    data: dict[str, str] = {}
    lines = block.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^([A-Za-z0-9_-]+):\s*(.*)$', line)
        if not m:
            i += 1
            continue
        key, value = m.group(1), m.group(2).strip()
        if value in {'>', '>-', '|', '|-'}:
            parts = []
            i += 1
            while i < len(lines) and (lines[i].startswith('  ') or not lines[i].strip()):
                if lines[i].strip(): parts.append(lines[i].strip())
                i += 1
            data[key] = ' '.join(parts)
            continue
        data[key] = value.strip('"\'')
        i += 1
    return data

def yaml_value(text: str, key: str) -> str | None:
    m = re.search(rf'(?m)^\s*{re.escape(key)}:\s*["\']?([^\n"\']+)', text)
    return m.group(1).strip() if m else None

# Root shape
actual = {p.name for p in ROOT.iterdir() if p.name != '.git'}
for extra in sorted(actual - EXPECTED_ROOT): fail(f'unexpected root entry: {extra}')
for missing in sorted(EXPECTED_ROOT - actual): fail(f'missing root entry: {missing}')

# No symlinks or known noise anywhere.
for p in ROOT.rglob('*'):
    if '.git' in p.parts: continue
    if p.is_symlink(): fail(f'symlink is not allowed: {p.relative_to(ROOT)}')
    if p.name in FORBIDDEN_NAMES: fail(f'forbidden artifact: {p.relative_to(ROOT)}')
    if p.is_file() and p.suffix.lower() in {'.md','.json','.yaml','.yml','.py','.sh','.txt'}:
        try: text = p.read_text(encoding='utf-8')
        except UnicodeDecodeError: continue
        for token in FORBIDDEN_TEXT:
            if token in text: fail(f'forbidden text {token!r}: {p.relative_to(ROOT)}')

# Secret-shape scan. Patterns target credential values, not variable names or placeholders.
secret_patterns = {
    'private_key': re.compile(r'BEGIN ' + r'(?:RSA |EC |OPENSSH )?PRIVATE KEY'),
    'aws_access_key': re.compile(r'AKIA[0-9A-Z]{16}'),
    'github_token': re.compile(r'gh[pousr]_[A-Za-z0-9]{20,}'),
    'openai_key': re.compile(r'sk-' + r'(?:proj-)?[A-Za-z0-9_-]{20,}'),
    'slack_token': re.compile(r'xox[baprs]-[A-Za-z0-9-]{20,}'),
}
for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts:
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        continue
    for label, pattern in secret_patterns.items():
        if pattern.search(text):
            fail(f'secret-shaped value ({label}): {p.relative_to(ROOT)}')

# Plugin manifest
manifest_path = ROOT/'.codex-plugin'/'plugin.json'
try: manifest = json.loads(manifest_path.read_text())
except Exception as exc:
    fail(f'plugin manifest unreadable: {exc}')
    manifest = {}
if not IDENT.fullmatch(str(manifest.get('name',''))): fail('manifest name invalid')
if not SEMVER.fullmatch(str(manifest.get('version',''))): fail('manifest version must be strict semver')
if manifest.get('skills') != './skills/': fail('manifest skills must be ./skills/')
if not isinstance(manifest.get('author'), dict) or not manifest['author'].get('name'): fail('manifest author.name required')
interface = manifest.get('interface') if isinstance(manifest.get('interface'), dict) else {}
limits = {'displayName':30,'shortDescription':30,'longDescription':4000,'developerName':80}
for key, limit in limits.items():
    value = interface.get(key)
    if not isinstance(value, str) or not value.strip(): fail(f'interface.{key} required')
    elif len(value) > limit: fail(f'interface.{key} exceeds {limit} characters')
if interface.get('category') != 'Developer Tools': fail('interface.category must be Developer Tools')
cap = interface.get('capabilities')
if not isinstance(cap, list) or not 1 <= len(cap) <= 20: fail('interface.capabilities must contain 1..20 items')
else:
    for item in cap:
        if not isinstance(item, str) or not item.strip() or len(item) > 120 or '\n' in item: fail('invalid capability entry')
prompts = interface.get('defaultPrompt')
if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3: fail('interface.defaultPrompt must contain 1..3 prompts')
else:
    norm=set()
    for item in prompts:
        if not isinstance(item, str) or not item.strip() or len(item) > 128 or '\n' in item or '@' in item: fail('invalid defaultPrompt entry')
        n=' '.join(item.lower().split())
        if n in norm: fail('duplicate defaultPrompt entry')
        norm.add(n)
for key in ('websiteURL','privacyPolicyURL','termsOfServiceURL','supportURL'):
    v=interface.get(key)
    if not isinstance(v,str) or not v.startswith('https://'): fail(f'interface.{key} must be HTTPS')
for key in ('logo','composerIcon'):
    v=interface.get(key)
    if not isinstance(v,str) or not v.startswith('./'): fail(f'interface.{key} must be a relative path')
    elif not (ROOT/v[2:]).is_file(): fail(f'interface.{key} file missing: {v}')

# Provenance
try: provenance=json.loads((ROOT/'source-provenance.json').read_text())
except Exception as exc:
    fail(f'provenance unreadable: {exc}')
    provenance={}
curation=provenance.get('curation',{}) if isinstance(provenance,dict) else {}
if curation.get('plugin_version') != manifest.get('version'): fail('provenance plugin_version differs from manifest')
if provenance.get('upstream',{}).get('commit') != '6654f6b60cd9d5be8b54c6fafe44346dabeb3b76': fail('unexpected upstream commit')
if provenance.get('upstream',{}).get('license') != 'MIT': fail('upstream license must be MIT')

# Skills
skills_root=ROOT/'skills'
skill_dirs=sorted([p for p in skills_root.iterdir() if p.is_dir()]) if skills_root.is_dir() else []
if len(skill_dirs) != EXPECTED_SKILL_COUNT: fail(f'expected {EXPECTED_SKILL_COUNT} skills, found {len(skill_dirs)}')
slugs=[]
for d in skill_dirs:
    skill=d/'SKILL.md'; agent=d/'agents'/'openai.yaml'
    if not skill.is_file(): fail(f'{d.name}: missing SKILL.md'); continue
    if not agent.is_file(): fail(f'{d.name}: missing agents/openai.yaml')
    meta=frontmatter(skill)
    name=meta.get('name',''); desc=meta.get('description','')
    if name != d.name: fail(f'{d.name}: frontmatter name is {name!r}')
    if not desc or len(desc) > 1024: fail(f'{d.name}: description missing or too long')
    if not skill.read_text().split('\n---\n',1)[-1].strip(): fail(f'{d.name}: empty skill body')
    slugs.append(name)
    if agent.is_file():
        at=agent.read_text()
        if not yaml_value(at,'display_name'): fail(f'{d.name}: display_name missing')
        if not yaml_value(at,'short_description'): fail(f'{d.name}: short_description missing')
        user_only = meta.get('disable-model-invocation','').lower() == 'true'
        policy_false = bool(re.search(r'(?m)^\s*allow_implicit_invocation:\s*false\s*$', at))
        if user_only or policy_false: fail(f'{d.name}: curated Skills must allow model invocation')
if len(set(slugs)) != len(slugs): fail('duplicate skill names')
for old in OLD_SLUGS:
    if old in slugs: fail(f'old branded slug remains: {old}')
if set(curation.get('skills',[])) != set(slugs): fail('provenance skill list differs from packaged skills')
if curation.get('skill_count') != len(slugs): fail('provenance skill_count differs from packaged skills')

# Router coverage
router=skills_root/'engineering-workflow-guide'
if not router.is_dir(): fail('engineering-workflow-guide missing')
else:
    rmeta=frontmatter(router/'SKILL.md')
    if rmeta.get('disable-model-invocation','').lower() == 'true': fail('router must allow model invocation')
    catalog=(router/'references'/'catalog.md')
    if not catalog.is_file(): fail('router catalog missing')
    else:
        text=catalog.read_text()
        for slug in sorted(set(slugs)-{'engineering-workflow-guide'}):
            count=text.count(f'`{slug}`')
            if count != 1: fail(f'router catalog must mention {slug} exactly once, found {count}')

if errors:
    print(json.dumps({'ok':False,'errors':errors},indent=2))
    sys.exit(1)
print(json.dumps({'ok':True,'plugin':manifest.get('name'),'version':manifest.get('version'),'skills':len(slugs),'files':sum(1 for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.parts)},indent=2))
```

## File: `tools/native_component_inventory.py`

```python
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

def skill_catalog(query, cwd):
    marketplaces = []
    try:
        # An unscoped lookup loads curated skills into this app-server session.
        # Force-refetch would refresh plugin caches instead of reading the catalog.
        result = query("plugin/list", {"cwds": [cwd]})
        sources = result["marketplaces"]
        errors = result["marketplaceLoadErrors"]
        if not isinstance(sources, list) or not isinstance(errors, list):
            raise ValueError("Invalid native marketplace inventory")
        marketplaces = sorted({text(source["name"]) for source in sources})
        issue = None
        if errors:
            issue = "MARKETPLACE_LOAD_ERRORS"
        elif "openai-curated-remote" not in marketplaces:
            issue = "CURATED_MARKETPLACE_MISSING"
    except (Empty, TimeoutError):
        issue = "NATIVE_TIMEOUT"
    except REQUEST_FAILURES:
        issue = "NATIVE_REQUEST_OR_RESPONSE_FAILED"
    return {"status": "OBSERVED" if issue is None else "INCOMPLETE",
            "issue": issue, "marketplaces": marketplaces}

def skills(query, cwd):
    catalog = skill_catalog(query, cwd)
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
        issue = "SKILL_DISCOVERY_ERRORS" if errors else None
        if issue is None and catalog["status"] == "INCOMPLETE":
            issue = "SKILL_CATALOG_INCOMPLETE"
    except (Empty, TimeoutError):
        issue = "NATIVE_TIMEOUT"
    except REQUEST_FAILURES:
        issue = "NATIVE_REQUEST_OR_RESPONSE_FAILED"
    return {**observation(rows, issue), "catalog": catalog}

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
```

## File: `tools/native_vendor_evidence.py`

```python
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
```

## File: `tools/package.py`

```python
"""Stage and prove deterministic local runtime archives. No installs or publication."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parents[1]
ENGINE=ROOT/'skills/plugin-autopilot/scripts'
ENV={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
MEMBERS=['plugin.json','.codex-plugin','package.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md',
         'PRIVACY.md','TERMS.md','SUPPORT.md','AGENTS.md','assets','references','skills','scripts','src','schemas','tools']

def run(*args):
    p=subprocess.run(list(map(str,args)),capture_output=True,text=True,encoding='utf-8',env=ENV)
    if p.returncode:
        raise RuntimeError(p.stdout+p.stderr)
    return json.loads(p.stdout)

def build(out):
    out=out.resolve()
    if out==ROOT or ROOT in out.parents:
        raise ValueError('Output must be outside the candidate root')
    if out.exists():
        raise FileExistsError('Refusing existing output directory')
    out.mkdir(parents=True)
    manifest=json.loads((ROOT/'plugin.json').read_text(encoding='utf-8'))
    with tempfile.TemporaryDirectory(prefix='plugin-skill-studio-package-') as tmp:
        stage=Path(tmp)/'stage';stage.mkdir()
        for rel in MEMBERS:
            source=ROOT/rel;target=stage/rel
            if source.is_dir():
                shutil.copytree(source,target,ignore=shutil.ignore_patterns('__pycache__','*.pyc','*.pyo','.git'))
            elif source.exists():shutil.copy2(source,target)
        validation=run(sys.executable,'-B',ENGINE/'validate_plugin.py',stage,'--json')
        if not validation['ok']:raise ValueError(validation)
        check=run('node',stage/'scripts/studio.mjs','self-check')
        archive=out/f'{manifest["name"]}-{manifest["version"]}.zip'
        first=run(sys.executable,'-B',ENGINE/'package_plugin.py',stage,archive,'--json')
        second=Path(tmp)/'second.zip'
        run(sys.executable,'-B',ENGINE/'package_plugin.py',stage,second,'--json')
        if archive.read_bytes()!=second.read_bytes():raise ValueError('Archive is nondeterministic')
        extraction=Path(tmp)/'extracted'
        with zipfile.ZipFile(archive) as z:
            names=z.namelist()
            assert not any(n.startswith(('tests/','fixtures/','.git/','.github/','.agents/','artifacts/')) for n in names)
            assert not any(n.endswith(('auth.json','.pyc')) for n in names)
            z.extractall(extraction)
        fresh=run(sys.executable,'-B',ENGINE/'validate_plugin.py',extraction,'--json')
        isolated=run('node',extraction/'scripts/studio.mjs','self-check')
        # Static evaluation of a real bundled skill, using only extracted runtime modules.
        sample=run('node',extraction/'scripts/studio.mjs','skill-eval',extraction/'skills/skill-eval')
        for report in (validation,fresh):report.pop('pluginRoot',None)
        report={'package':manifest['name'],'version':manifest['version'],'archive':archive.name,
                'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,
                'deterministic':True,'genericValidation':validation,'freshExtractionValidation':fresh,
                'sourceCheck':check,'extractedCheck':isolated,'extractedSkillEval':{'valid':sample['valid'],'readiness':sample['readiness'],'observedUsage':sample['observedUsage']},
                'sourceDependencyRequired':False,'installed':False,'published':False,
                'publicationBlockers':['Public access to the configured repository/document URLs is not verified'],
                'configuredMetadataURLs':{key:manifest['extensions']['com.openai']['interface'].get(key) for key in ['websiteURL','privacyPolicyURL','termsOfServiceURL']}}
        (out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'SHA256SUMS').write_text(f'{report["sha256"]}  {archive.name}\n',encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True)
    build(parser.parse_args().out)
```
