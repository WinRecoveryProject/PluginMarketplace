"""Capture read-only evidence for Studio's inventory-versions command."""
import argparse
import base64
import concurrent.futures
import datetime
import hashlib
from http.client import IncompleteRead
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
BUSINESS_PLUGIN_TIMEOUT = 110
PUBLIC_MANIFEST_SIZE_LIMIT = 256 * 1024
PUBLIC_MANIFEST_RETRY_CODES = frozenset({408, 500, 502, 503, 504})
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


def git_head(remote):
    env = {key: value for key, value in ENV.items() if not key.upper().startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT="0")
    with tempfile.TemporaryDirectory(prefix="studio-public-git-") as directory:
        value = subprocess.check_output(
            ["git", "-c", "credential.helper=", "-c", "protocol.allow=never",
             "-c", "protocol.https.allow=always", "ls-remote", "--exit-code", remote, "HEAD"],
            cwd=directory, env=env, stderr=subprocess.DEVNULL, timeout=30,
        )
    revision = value.decode("ascii").split()[0]
    if not REVISION.fullmatch(revision):
        raise ValueError("Invalid resolved Git revision")
    return revision


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
    rows = json.loads(command("git", "-C", root, "show", f"{revision}:.agents/plugins/marketplace.json"))
    namespace = rows["name"]
    expected = [f'{entry["name"]}@{namespace}' for entry in rows["plugins"]]
    if not 0 < len(expected) <= 500 or len(expected) != len(set(expected)) or not all(map(IDENTITY.fullmatch, expected)):
        raise ValueError("Invalid Marketplace identities")

    def observed_head(url):
        if not GITHUB.fullmatch(url):
            return None
        try:
            return revision if url == origin else git_head(url)
        except (IndexError, ValueError, OSError, subprocess.SubprocessError):
            return None

    def manifest(entry):
        identity, row = entry
        try:
            source = row["source"]
            url = source["url"]
            location = source["path"].removeprefix("./")
            here = location not in ("", ".")
            if here and not all(COMPONENT.fullmatch(part) and part not in (".", "..") for part in location.split("/")):
                return None
            repository = GITHUB.fullmatch(url)
            if source.get("source") != "git-subdir" or not repository:
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
                name = f"{location}/{filename}" if here else filename
                try:
                    if read_local:
                        raw = command("git", "-C", root, "show", f"{sha}:{name}")
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


def capture_native(codex, root, account, wanted, vendor_probe=None):
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

    def send(method, request_id=None, params=None):
        data = {"method": method}
        if request_id is not None:
            data.update(id=request_id, params=params or {})
        process.stdin.write(json.dumps(data).encode("utf-8") + b"\n")
        process.stdin.flush()
        if request_id is None:
            return None
        deadline = time.monotonic() + 30
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
        return fingerprint, {"marketplaces": observed, "marketplaceLoadErrors": native_errors}, vendor
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
    counterpart = json.loads(args.counterparts.read_text(encoding="utf-8-sig")) if args.counterparts else []
    if not isinstance(counterpart, list) or len(counterpart) > 1000:
        raise ValueError("Expected explicit catalog counterpart list")
    counterpart = [{"publishedId": row["publishedId"], "catalogId": row["catalogId"]} for row in counterpart]
    wanted = {row["catalogId"] for row in counterpart}
    if not all(IDENTITY.fullmatch(row["publishedId"]) for row in counterpart):
        raise ValueError("Invalid published counterpart identity")
    if not all(IDENTITY.fullmatch(value) for value in wanted):
        raise ValueError("Invalid catalog counterpart identity")
    scopes = sorted({namespace for value in wanted
                     if not is_native_namespace(namespace := identity_namespace(value))})

    plugin_timeout = BUSINESS_PLUGIN_TIMEOUT if args.account == "business" else COMMAND_TIMEOUT

    def provider(namespace):
        try:
            data = json.loads(command(codex, "plugin", "list", "--marketplace", namespace, "--available", "--json",
                                      timeout=plugin_timeout, check_marketplace=True))
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
                          timeout=plugin_timeout, check_marketplace=True)
        published = pool.submit(capture_publications, root)
        curated = pool.submit(provider, CURATED_MARKETPLACE) if CURATED_MARKETPLACE in scopes else None

        def recover_vendor(send):
            if curated.result()[0]["exitCode"] == 0:
                return None
            return capture_vendor_details(send, counterpart)

        native = pool.submit(capture_native, codex, root, args.account, wanted, recover_vendor if curated else None)
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
        scoped = {row["namespace"]: row for row in capture_configured_installations(codex, publication, plugin_timeout)}
        for _, observed in provider_results:
            if observed is not None:
                scoped.setdefault(observed["namespace"], observed)
        current.extend(list(scoped.values())[:99])
    history = [] if not args.previous else [{"label": "previous", "kind": "historical",
        "data": observed_installations(json.loads(args.previous.read_text(encoding="utf-8-sig")))}]
    workspace_fingerprint, catalog, recovered_vendor = native.result()
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
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--marketplace", type=Path, required=True, help="Local copy of the published Marketplace")
    parser.add_argument("--codex", type=Path, required=True, help="Trusted host Codex CLI executable")
    parser.add_argument("--account", choices=["personal", "business"], required=True)
    parser.add_argument("--host", required=True, help="One device label, such as Acer")
    parser.add_argument("--counterparts", type=Path, help="Explicit list of publishedId/catalogId pairs")
    parser.add_argument("--previous", type=Path, help="Previous full installed CLI list for the same scope")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = capture(args)
    with args.out.open("x", encoding="utf-8") as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
        out.write("\n")


if __name__ == "__main__":
    main()
