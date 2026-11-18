"""Capture read-only evidence for Studio's inventory-versions command."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import tempfile
import threading
import time
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, build_opener

GITHUB = re.compile(r"https://github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?$", re.ASCII)
IDENTITY = re.compile(r"[\da-z][\da-z._-]*@[\da-z][\da-z._-]*$", re.ASCII | re.I)
VERSION = re.compile(r"[a-z0-9][a-z0-9.+_-]{0,127}", re.ASCII | re.I)
COMPONENT = re.compile(r"[\da-z_.-]+$", re.ASCII | re.I)
REVISION = re.compile(r"[\da-f]{40}$", re.ASCII)
MANIFESTS = (".codex-plugin/plugin.json", "plugin.json")
NATIVE_NAMESPACES = {"personal": "created-by-me-remote", "business": "workspace-directory"}
ENV = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}


class RejectRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, url):
        return None


PUBLIC_HTTP = build_opener(RejectRedirect)


def command(*args):
    return subprocess.check_output(
        [str(arg) for arg in args], env=ENV, stderr=subprocess.DEVNULL, timeout=30
    )


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
            sha = heads.get(url)
            repository = GITHUB.fullmatch(url)
            if source.get("ref") or source.get("source") != "git-subdir" or not sha or not repository:
                return None
            candidates = []
            for filename in MANIFESTS:
                name = f"{location}/{filename}" if here else filename
                try:
                    if url == origin:
                        raw = command("git", "-C", root, "show", f"{sha}:{name}")
                    else:
                        owner, repo = repository.groups()
                        with PUBLIC_HTTP.open(f"https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{name}", timeout=12) as page:
                            raw = page.read(256 * 1024 + 1)
                    if len(raw) > 256 * 1024:
                        return None
                    data = json.loads(raw)
                    candidates.append((name, data["name"], data["version"]))
                except HTTPError as failure:
                    if failure.code != 404:
                        return None
                except subprocess.CalledProcessError:
                    if url != origin:
                        return None
            if not candidates or len({data[1:] for data in candidates}) != 1 or candidates[0][1] != row["name"]:
                return None
            return {"id": identity, "version": candidates[0][2],
                    "source": {"url": url, "revision": sha, "path": candidates[0][0]}}
        except (KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
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


def capture_native(codex, root, account, wanted):
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
        result = send("plugin/list", 2, {"cwds": [str(root)], "marketplaceKinds": [required], "forceRefetch": True})
        after = send("account/read", 3, {"refreshToken": False})
        if after["workspaceRouting"]["chatgptAccountId"] != workspace:
            raise ValueError("Native workspace changed during capture")
        sections = [row for row in result["marketplaces"] if row.get("name") == required]
        if not sections:
            raise ValueError("Native workspace directory not observed")
        fingerprint = hashlib.sha256(("studio-inventory:" + workspace).encode("utf-8")).hexdigest()
        return fingerprint, {
            "marketplaces": [{"name": section["name"],
                 "plugins": [{key: row.get(key) for key in ("id", "version", "localVersion", "installed", "enabled")}
                             for row in section["plugins"] if row.get("installed") is True or row.get("id") in wanted]}
                             for section in sections],
            "marketplaceLoadErrors": ["Native catalog load error"] if result.get("marketplaceLoadErrors") else [],
        }
    except (queue.Empty, KeyError, TypeError, ValueError, OSError):
        return None, {"marketplaces": [], "marketplaceLoadErrors": ["Active native catalog unavailable"]}
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

    def provider(namespace):
        try:
            data = json.loads(command(codex, "plugin", "list", "--marketplace", namespace, "--available", "--json"))
            if data.get("marketplaceLoadErrors"):
                return {"namespace": namespace, "exitCode": 2}
            return {"namespace": namespace, "exitCode": 0, "data": {
                key: [{"pluginId": r["pluginId"], "version": r["version"]} for r in data[key] if r["pluginId"] in wanted]
                for key in ("installed", "available")
            }}
        except (KeyError, OSError, ValueError, subprocess.SubprocessError):
            return {"namespace": namespace, "exitCode": 2}

    current = []
    cli_failure = None
    try:
        data = json.loads(command(codex, "plugin", "list", "--json"))
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
    except subprocess.TimeoutExpired:
        cli_failure = "TIMEOUT"
    except (KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
        cli_failure = "FAILED"
    else:
        current.append({"label": "CLI", "kind": "cli", "data": installed})
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        native = pool.submit(capture_native, codex, root, args.account, wanted)
        published = pool.submit(capture_publications, root)
        catalogs = list(pool.map(provider, scopes))
    history = [] if not args.previous else [{"label": "previous", "kind": "historical",
        "data": observed_installations(json.loads(args.previous.read_text(encoding="utf-8-sig")))}]
    workspace_fingerprint, catalog = native.result()
    current.append({"label": "Native", "kind": "catalog", "data": catalog})
    inventory = {"current": current, "historical": history}
    if cli_failure:
        inventory["cliFailure"] = cli_failure
    report = {"scope": {"host": args.host, "account": args.account,
              "workspaceFingerprint": workspace_fingerprint,
              "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")},
              "inventory": inventory,
              "published": published.result(), "catalogs": catalogs, "counterparts": counterpart}
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
