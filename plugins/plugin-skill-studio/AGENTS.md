# Candidate development

Read references/studio-policy.md. Keep edits within this candidate; do not mutate original packages, caches or previous candidates. Maintain both manifests and registry coverage. Skills, runtime modules, scripts and local references must work from a fresh ZIP without original source paths or external plugins. No auth files or global configuration changes are needed.

Run `node --test tests/*.test.mjs`, `node scripts/studio.mjs self-check` and the bundled generic validator before packaging. Use `python -B tools/package.py --out <new-directory>` for deterministic builds and fresh extraction checks. Preserve license notices. A practical fixture test is not a live model benchmark; record live preflight blockers honestly. Do not install, commit, push, upload, publish or clean other paths without the corresponding user scope.
