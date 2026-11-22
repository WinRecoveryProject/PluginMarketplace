# Plugin files: windows-dism-update-docs — manifests and top-level files

Source: `plugins/windows-dism-update-docs`. Files outside the `skills/*` folders, embedded as text.

## File: `.gitattributes`

```text
* text=auto eol=lf
```

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `PRIVACY.md`

### Privacy

Windows Dism Update Docs runs through Codex against documentation and files that the user explicitly makes available. Zilvereyes does not operate a separate hosted telemetry, credential-storage, or analytics service for this plugin.

The plugin is a documentation assistant and does not independently service Windows images. Codex, GitHub, Microsoft, and any other connected services remain governed by their own privacy policies and account settings.

Do not place passwords, access tokens, private keys, product keys, or other secrets in source files, issues, prompts, or logs.

## File: `README.md`

### Windows Dism Update Docs

Local Windows servicing knowledge assistant for DISM, .NET, Defender, ESU and Home/Pro integration evidence.

The plugin separates Microsoft documentation, locally collected evidence and tested image results. It provides documentation and research workflows only; it does not automatically service, activate or modify Windows installations.

#### Package layout

- `.codex-plugin/plugin.json` — Codex plugin manifest.
- `skills/` — the Windows DISM and Update documentation workflow.
- `assets/` — plugin identity assets.

#### License

MIT. See `LICENSE`.

## File: `TERMS.md`

### Terms of Service

Windows Dism Update Docs is provided under the MIT License and on an "as is" basis, without warranty.

Its content is informational. The user is responsible for verifying applicability, Microsoft support status, editions, architectures, package provenance, and backups before performing any Windows servicing operation.

Third-party platforms, tools, packages, and services retain their own terms, availability, permissions, and usage limits.
