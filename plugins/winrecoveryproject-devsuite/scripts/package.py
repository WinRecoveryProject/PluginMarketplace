#!/usr/bin/env python3
"""Build a deterministic contained plugin ZIP; no installation or publication."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from devsuite import doctor


def package(output: Path):
    validation = doctor()
    if validation["status"] != "PASS":
        raise ValueError("Package doctor failed: " + "; ".join(validation["errors"]))
    if output.exists():
        raise ValueError("Refusing to overwrite an existing archive")
    included_roots = {".codex-plugin", "skills", "references", "runtime", "scripts", "licenses", "submission", "tests", "assets"}
    included_files = {".app.json", "LICENSE", "README.md", "PRIVACY.md", "TERMS.md", "SUPPORT.md", "THIRD_PARTY_NOTICES.md"}
    files = []
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        if "__pycache__" in relative.parts or path.suffix == ".pyc":
            continue
        selected = relative.parts[0] in included_roots or relative.as_posix() in included_files
        if not selected:
            continue
        if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
            raise ValueError("Refusing a linked package path: " + relative.as_posix())
        if not path.is_file():
            continue
        if path.suffix.lower() in {".py", ".json", ".md", ".txt", ".yaml"}:
            text = path.read_text(encoding="utf-8")
            if re.search(r"[A-Za-z]:[/\\]+Users[/\\]+", text):
                raise ValueError("Private absolute user path in " + relative.as_posix())
        files.append((relative.as_posix(), path.read_bytes()))
    for parent in (output, *output.parents):
        if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
            raise ValueError("Refusing linked output path")
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents accidentally replacing a previously reviewed build.
    with zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, payload in files:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, payload)
    return {"status": "PACKAGED", "file": str(output.resolve()), "files": len(files),
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "installed": False, "published": False, "providersExecuted": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "dist/winrecoveryproject-devsuite-0.2.0.zip")
    args = parser.parse_args()
    try:
        print(json.dumps(package(args.out), indent=2))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(json.dumps({"status": "ERROR", "error": str(error)}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
