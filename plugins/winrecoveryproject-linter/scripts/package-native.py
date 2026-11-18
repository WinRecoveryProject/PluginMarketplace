"""Build and inspect the native plugin ZIP using only Python's standard library."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import zipfile

PROFILE = "config/native-package.json"
REQUIRED = {PROFILE, ".codex-plugin/plugin.json", "package.json", "package-lock.json",
            "npm-shrinkwrap.json", "bin/wrp-lint.mjs", "README.md", "LICENSE",
            "PRIVACY.md", "TERMS.md", "THIRD-PARTY-NOTICES.md",
            "src/catalog.mjs", "src/engine.mjs", "src/process.mjs", "src/setup.mjs",
            "src/powershell-batch.mjs", "src/runtime-cache.mjs", "src/sql-process.mjs", "src/sql-worker.mjs",
            "test/practical-regressions.test.mjs", "test/powershell-batching.test.mjs",
            "test/python-adapter.test.mjs", "test/runtime-cache.test.mjs", "test/toc-regressions.test.mjs", "test/sql.test.mjs", "test/setup-failure-isolation.test.mjs",
            "licenses/libpg-query-upstream-BSD.txt", "licenses/libpg-query-wrapper-MIT.txt", "licenses/postgresql-COPYRIGHT.txt",
            "adapters/powershell.ps1", "adapters/python-syntax.py", "adapters/extract-shellcheck.ps1",
            "config/npmrc", "config/global-npmrc", "config/blinter-requirements.txt",
            "assets/logo.png", "assets/composer-icon.png",
            "skills/lint-project/SKILL.md", "skills/setup-linters/SKILL.md"}
FORBIDDEN = {".git", "node_modules", ".tools", ".venv", "venv", "outputs", "coverage"}
PRIVATE_PATH = re.compile(r"(?:[A-Za-z]:[/\\]+Users[/\\]+|/[U]sers/|/h[o]me/[^/\s]+/)", re.I)
MAX_FILE = 5 * 1024 * 1024
MAX_TOTAL = 16 * 1024 * 1024
STAMP = (1980, 1, 1, 0, 0, 0)


def fail(message):
    raise ValueError(message)


def valid_name(name):
    if not isinstance(name, str) or not name or "\\" in name or ":" in name or "\x00" in name:
        fail("Invalid whitelist/archive path")
    parts = PurePosixPath(name).parts
    if name.startswith("/") or any(part in (".", "..") for part in name.split("/")):
        fail("Path traversal or absolute path rejected")
    if any(part.casefold() in FORBIDDEN or part.casefold().startswith(".env") for part in parts):
        fail("Dependency, output or private path rejected")
    if PurePosixPath(name).suffix.casefold() in {".pem", ".key", ".pfx", ".p12", ".tgz", ".zip"}:
        fail("Private/archive file rejected")
    return name


def profile_entries(data):
    profile = json.loads(data)
    if not isinstance(profile, dict) or profile.get("schemaVersion") != 1 or profile.get("id") != "winrecoveryproject-linter":
        fail("Invalid native package profile")
    entries = profile.get("entries")
    if not isinstance(entries, list) or not entries or len(entries) > 200:
        fail("Profile must have an explicit bounded file whitelist")
    for name in entries:
        valid_name(name)
    if len({name.casefold() for name in entries}) != len(entries):
        fail("Duplicate/case-colliding whitelist entries")
    if not REQUIRED.issubset(entries):
        fail("Whitelist omits required runtime, lock, skill or branding files")
    return sorted(entries)


def check_text(name, data):
    # Binary artwork is the sole binary payload family. Everything else must be
    # public UTF-8 text, which also makes path-leak scanning deterministic.
    if name.startswith("assets/") and PurePosixPath(name).suffix.lower() in {".png", ".ico"}:
        return
    text = data.decode("utf-8-sig")
    if PRIVATE_PATH.search(text):
        fail("Private user path in whitelisted file: " + name)


def validate_payload(payload):
    entries = profile_entries(payload[PROFILE])
    if entries != sorted(payload):
        fail("Archive members differ from its explicit native whitelist")
    for name, data in payload.items():
        if len(data) > MAX_FILE:
            fail("Whitelisted file exceeds size limit: " + name)
        check_text(name, data)
    if sum(map(len, payload.values())) > MAX_TOTAL:
        fail("Package exceeds total size limit")
    if payload["package-lock.json"] != payload["npm-shrinkwrap.json"]:
        fail("Source and distribution lockfiles differ")
    package = json.loads(payload["package.json"])
    manifest = json.loads(payload[".codex-plugin/plugin.json"])
    if manifest.get("name") != "winrecoveryproject-linter" or manifest.get("version") != package.get("version"):
        fail("Native manifest and package identity/version differ")
    lock = json.loads(payload["package-lock.json"])
    for name in ("config/npmrc", "config/global-npmrc"):
        if any(line.strip() and not line.lstrip().startswith(("#", ";")) for line in payload[name].decode("utf-8").splitlines()):
            fail("Bootstrap npm config must contain public comments only: " + name)
    for name, version in package.get("dependencies", {}).items():
        entry = lock["packages"].get("node_modules/" + name, {})
        if lock["packages"][""].get("dependencies", {}).get(name) != version or entry.get("version") != version or not entry.get("integrity"):
            fail("Lockfile lacks exact integrity-pinned dependency: " + name)
    return package["version"], entries


def is_link(info):
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))


def contained(root, candidate):
    return candidate == root or root in candidate.parents


def read_source(root, name):
    valid_name(name)
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        if is_link(current.lstat()):
            fail("Symlink/reparse path rejected: " + name)
    before = current.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_FILE:
        fail("Source is not a bounded regular file: " + name)
    if not contained(root, current.resolve()):
        fail("Source escaped package root")
    descriptor = os.open(current, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0))
    with os.fdopen(descriptor, "rb") as stream:
        opened = os.fstat(stream.fileno())
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            fail("Source changed while opening: " + name)
        data = stream.read(MAX_FILE + 1)
        after = os.fstat(stream.fileno())
    path_after = current.lstat()
    if len(data) > MAX_FILE or is_link(path_after) or (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) != (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns) or (path_after.st_dev, path_after.st_ino) != (opened.st_dev, opened.st_ino):
        fail("Source changed during bounded read: " + name)
    return data


def archive_payload(archive):
    payload = {}
    with zipfile.ZipFile(archive) as bundle:
        infos = bundle.infolist()
        if len(infos) > 200 or sum(info.file_size for info in infos) > MAX_TOTAL:
            fail("Archive exceeds bounds")
        for info in infos:
            name = valid_name(info.filename)
            if name in payload or info.is_dir() or info.file_size > MAX_FILE or stat.S_ISLNK(info.external_attr >> 16):
                fail("Duplicate, directory, symlink or oversized archive member")
            payload[name] = bundle.read(info)
    if PROFILE not in payload:
        fail("Archive lacks native whitelist")
    validate_payload(payload)
    return payload


def describe(data, payload):
    version, entries = validate_payload(payload)
    return {"schemaVersion": 1, "product": "WinRecoveryProjectLinter", "version": version,
            "format": "native-zip", "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data), "includedFileCount": len(entries),
            "files": [{"path": name, "bytes": len(payload[name]), "sha256": hashlib.sha256(payload[name]).hexdigest()} for name in entries]}


def build(root, output=None):
    root = root.resolve(strict=True)
    entries = profile_entries(read_source(root, PROFILE))
    payload = {name: read_source(root, name) for name in entries}
    version, _ = validate_payload(payload)
    destination = root / "outputs"
    if destination.exists() and (is_link(destination.lstat()) or not destination.is_dir()):
        fail("Unsafe output directory")
    output = Path(output).absolute() if output else destination / ("winrecoveryproject-linter-" + version + ".zip")
    if output.parent != destination or output.suffix.lower() != ".zip":
        fail("Native ZIP output must be directly inside this root's outputs directory")
    destination.mkdir(exist_ok=True)
    if output.exists() and is_link(output.lstat()):
        fail("Symlink output rejected")
    memory = io.BytesIO()
    # ZIP_STORED deliberately avoids zlib-version-dependent compressed bytes.
    with zipfile.ZipFile(memory, "w", compression=zipfile.ZIP_STORED) as bundle:
        for name in entries:
            info = zipfile.ZipInfo(name, STAMP)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_STORED
            bundle.writestr(info, payload[name])
    data = memory.getvalue()
    report = describe(data, archive_payload(io.BytesIO(data)))
    # Exclusive temporary creation and atomic replacement of this owned output.
    temporary = destination / (output.name + ".tmp")
    with temporary.open("xb") as stream:
        stream.write(data)
    os.replace(temporary, output)
    report["archive"] = "outputs/" + output.name
    receipt = output.with_suffix(".manifest.json")
    if receipt.exists() and is_link(receipt.lstat()):
        fail("Symlink receipt rejected")
    receipt.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(Path(__file__).resolve().parent.parent))
    parser.add_argument("--output")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--inspect")
    actions.add_argument("--extract")
    parser.add_argument("--destination")
    args = parser.parse_args()
    if args.inspect or args.extract:
        archive = Path(args.inspect or args.extract)
        if archive.stat().st_size > MAX_TOTAL + 1024 * 1024:
            fail("Archive file exceeds bounds")
        data = archive.read_bytes()
        payload = archive_payload(io.BytesIO(data))
        report = describe(data, payload)
        if args.extract:
            if not args.destination:
                fail("--extract requires --destination")
            destination = Path(args.destination).absolute()
            for ancestor in [destination.parent, *destination.parent.parents]:
                if is_link(ancestor.lstat()):
                    fail("Symlink/reparse extraction ancestor rejected")
            destination.mkdir()  # Refuse existing destinations/overwrites.
            if is_link(destination.lstat()) or destination.resolve() != destination:
                fail("Unsafe extraction destination")
            for name, content in payload.items():
                target = destination.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("xb") as stream:
                    stream.write(content)
            report["extracted"] = True
        print(json.dumps(report))
    else:
        print(json.dumps(build(Path(args.root), args.output)))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, AttributeError, RuntimeError, UnicodeError, zipfile.BadZipFile) as error:
        print(json.dumps({"status": "INCOMPLETE", "error": str(error)}), file=sys.stderr)
        sys.exit(2)
