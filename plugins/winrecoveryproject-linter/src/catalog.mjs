export const catalog = [
  { id: 'powershell', extensions: ['.ps1', '.psm1', '.psd1'], tool: 'PowerShell parser + PSScriptAnalyzer 1.25.0', kind: 'external', scope: 'Syntax and selected built-in safety/style rules; no target execution' },
  { id: 'javascript', extensions: ['.js', '.mjs', '.cjs', '.jsx'], tool: 'TypeScript 6.0.3', kind: 'bundled', scope: 'Compiler checkJs diagnostics, standard libraries, no executable project config' },
  { id: 'typescript', extensions: ['.ts', '.tsx', '.mts', '.cts'], tool: 'TypeScript 6.0.3', kind: 'bundled', scope: 'Compiler syntax/type diagnostics and standard libraries; fixed compiler options' },
  { id: 'batch', extensions: ['.bat', '.cmd'], tool: 'Blinter 1.1.66', kind: 'external', scope: 'Static Batch analysis, separate isolated AGPL tool; never cmd /c' },
  { id: 'bash', extensions: ['.sh', '.bash'], tool: 'Bash -n + ShellCheck 0.11.0', kind: 'external', scope: 'Syntax and ShellCheck, no sourcing/config loading' },
  { id: 'json', extensions: ['.json', '.jsonc'], tool: 'jsonc-parser 3.3.1', kind: 'bundled', scope: 'Strict JSON or JSON with comments and trailing commas for .jsonc' },
  { id: 'markdown', extensions: ['.md', '.markdown'], tool: 'markdownlint 0.40.0 / markdownlint-cli 0.48.0', kind: 'bundled', scope: 'Fixed bundled rules; custom configs, rules and inline suppression disabled' },
  { id: 'lua', extensions: ['.lua'], tool: 'luaparse 0.3.1', kind: 'bundled', scope: 'Strict Lua 5.1 grammar; no .luacheckrc execution' },
  { id: 'xml', extensions: ['.xml'], tool: 'saxes 6.0.0', kind: 'bundled', scope: 'Well-formed XML; DTDs and entity declarations rejected' },
  { id: 'html', extensions: ['.html', '.htm'], tool: 'parse5 8.0.0', kind: 'bundled', scope: 'WHATWG HTML document parse diagnostics; scripts and external resources are never loaded' },
  { id: 'css', extensions: ['.css'], tool: 'css-tree 3.1.0', kind: 'bundled', scope: 'CSS syntax diagnostics and parser recovery errors; no imports or URLs fetched' },
  { id: 'toc', extensions: ['.toc'], tool: 'WRP TOC 0.1.0', kind: 'bundled', scope: 'WoW metadata, numeric interfaces and contained paths; dynamic game/locale paths reported as deferred' },
  { id: 'yaml', extensions: ['.yaml', '.yml'], tool: 'js-yaml 4.1.1', kind: 'bundled', scope: 'YAML data parser with JSON schema; only when files detected/selected' },
  { id: 'toml', extensions: ['.toml'], tool: 'smol-toml 1.6.0', kind: 'bundled', scope: 'TOML parser; only when files detected/selected' },
  { id: 'python', extensions: ['.py', '.pyi'], tool: 'Python 3.11–3.15 ast.parse', kind: 'external', scope: 'Python syntax only; no imports, execution or bytecode writes' }
];
export const byExtension = new Map(catalog.flatMap(item => item.extensions.map(extension => [extension, item.id])));
export const unsupportedSource = new Set(['.scss', '.less', '.vue', '.svelte', '.rs', '.go', '.c', '.cpp', '.h', '.cs', '.java', '.php', '.rb', '.swift', '.kt', '.bats', '.zsh', '.fish', '.sql']);
