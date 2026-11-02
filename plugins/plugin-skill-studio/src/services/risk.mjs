import crypto from 'node:crypto';
import path from 'node:path';
import { readBounded, walkFiles } from './files.mjs';

const rule = (id, severity, pattern, title, remediation) => ({ id, version: '1.0.0', severity, pattern, title, remediation });
const rules = [
  rule('INSTRUCTION_OVERRIDE', 'high', /ignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions|disregard\s+(?:the\s+)?(?:system|developer)\s+(?:prompt|instructions)/i, 'Instruction hierarchy override', 'Remove authority claims; preserve host and user instructions.'),
  rule('HIDDEN_BEHAVIOR', 'high', /(?:do not|don.t|never)\s+(?:tell|inform|notify)\s+(?:the\s+)?user|hide\s+(?:this|these)\s+(?:action|command|instruction)/i, 'Concealed behavior instruction', 'Make side effects explicit and respect the user\'s scope.'),
  rule('REMOTE_EXECUTION', 'high', /(?:curl|wget|Invoke-WebRequest|iwr).{0,240}(?:\|\s*(?:sh|bash|iex)|Invoke-Expression)|(?:eval|exec)\s*\(.{0,100}(?:fetch|request)/i, 'Remote content executed', 'Download to a reviewable file, verify provenance and avoid piping remote text to execution.'),
  rule('DESTRUCTIVE_COMMAND', 'high', /\brm\s+-(?:rf|fr)\b|Remove-Item\b.{0,160}-(?:Recurse|Force)|\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|push\b.{0,100}--force)/i, 'Destructive command present', 'Require an exact target, recovery evidence and authorization before destructive execution.'),
  rule('SECRET_PATTERN', 'critical', /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/i, 'Possible secret material', 'Remove credentials from distributable files and investigate the exact exposure.'),
  rule('SECRET_TRANSMISSION', 'high', /(?:fetch|requests?\.(?:post|get)|Invoke-RestMethod|curl).{0,220}(?:process\.env|os\.environ|\$env:|SECRET|TOKEN|API_KEY)/i, 'Possible secret transmission', 'Inspect data flow and destination; never transmit unrelated credentials.'),
  rule('BROAD_PERMISSION', 'medium', /danger-full-access|dangerously-bypass|executionpolicy\s+bypass|chmod\s+777|sudo\s+/i, 'Broad permission or bypass request', 'Use the smallest supported scope and document any required privilege.'),
  rule('AUTOMATIC_INSTALL', 'medium', /\bnpx\s+.+\s+(?:-g|--global)\b|\b(?:npm|pip)\s+install\b|\bskills\s+add\b.{0,100}(?:-y|--yes)/i, 'Installation command present', 'Keep discovery, review and authorized installation separate.'),
];
const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
const textExtensions = new Set(['.md', '.txt', '.json', '.jsonl', '.yml', '.yaml', '.toml', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.sh', '.ps1', '.bat', '.cmd', '.html', '.xml']);
export function redact(value) {
  return String(value).replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})/gi, '[REDACTED]')
    .replace(/((?:password|api[_-]?key|secret|token)\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1[REDACTED]').slice(0, 500);
}
function suppressions(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new Error('suppressions must be an array');
  for (const item of input) {
    if (!item || !/^[a-f0-9]{64}$/.test(item.fingerprint ?? '') || typeof item.ruleId !== 'string' || !item.ruleId || typeof item.ruleVersion !== 'string' || !item.ruleVersion || typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error('Each suppression requires an exact fingerprint, ruleId, ruleVersion and reason');
    }
    if (Object.keys(item).some(k => !['fingerprint', 'ruleId', 'ruleVersion', 'reason'].includes(k))) throw new Error('Unknown suppression field');
  }
  return input;
}
export async function scanRisk(target, options = {}) {
  const threshold = options.severity ?? 'medium';
  if (!(threshold in severityRank)) throw new Error('Unknown severity threshold');
  const suppressionInput = typeof options.suppressions === 'string'
    ? JSON.parse(await readBounded(path.resolve(options.suppressions), 1024 * 1024)) : options.suppressions;
  const selectedSuppressions = suppressions(Array.isArray(suppressionInput) ? suppressionInput : suppressionInput?.suppressions ?? suppressionInput);
  const scan = await walkFiles(target, options);
  const findings = [], errors = [...scan.errors];
  let scannedFiles = 0, skippedFiles = 0;
  for (const file of scan.files) {
    if (!textExtensions.has(path.extname(file.absolute).toLowerCase()) && path.basename(file.absolute) !== 'LICENSE') { skippedFiles++; continue; }
    let text;
    try { text = await readBounded(file.absolute, options.maxFileBytes ?? 2 * 1024 * 1024); }
    catch (error) { errors.push({ path: file.relative, message: error.message }); continue; }
    scannedFiles++;
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      for (const r of rules) {
        const match = r.pattern.exec(line);
        if (!match) continue;
        const fingerprint = crypto.createHash('sha256').update(`${r.id}\0${r.version}\0${file.relative}\0${index + 1}\0${line.trim()}`).digest('hex');
        const accepted = selectedSuppressions.find(s => s.fingerprint === fingerprint && s.ruleId === r.id && s.ruleVersion === r.version);
        findings.push({ ruleId: r.id, ruleVersion: r.version, severity: r.severity, uncertainty: 'requires review', title: r.title,
          path: file.relative, line: index + 1, column: match.index + 1, evidence: redact(line), remediation: r.remediation,
          fingerprint, suppressed: Boolean(accepted), suppressionReason: accepted ? redact(accepted.reason) : null });
      }
    }
  }
  const active = findings.filter(f => !f.suppressed), actionable = active.filter(f => severityRank[f.severity] >= severityRank[threshold]);
  return { kind: 'skill-risk-report', schemaVersion: 1, target: path.resolve(target), complete: errors.length === 0,
    exitCode: errors.length ? 2 : actionable.length ? 1 : 0, threshold, scannedFiles, skippedFiles,
    activeCount: active.length, suppressedCount: findings.length - active.length, findings, errors,
    rules: rules.map(({ pattern, ...r }) => r), nonCoverage: ['Semantic intent, malicious code outside deterministic patterns, runtime data flow and host permissions are not proven.'],
    limitation: 'A clean deterministic scan is not a safety certification; findings require contextual review.' };
}

export function renderRisk(report, format = 'json') {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'sarif') return JSON.stringify({ version: '2.1.0', $schema: 'https://json.schemastore.org/sarif-2.1.0.json', runs: [{
    tool: { driver: { name: 'Plugin-Skill-Studio Risk Check', rules: report.rules.map(r => ({ id: r.id, name: r.title, shortDescription: { text: r.title }, properties: { version: r.version } })) } },
    results: report.findings.map(f => ({ ruleId: f.ruleId, level: ['critical', 'high'].includes(f.severity) ? 'error' : 'warning',
      message: { text: `${f.title}: ${f.evidence}` }, locations: [{ physicalLocation: { artifactLocation: { uri: f.path }, region: { startLine: f.line, startColumn: f.column } } }],
      fingerprints: { 'studio/v1': f.fingerprint }, ...(f.suppressed ? { suppressions: [{ kind: 'external', justification: f.suppressionReason }] } : {}) })),
    invocations: [{ executionSuccessful: report.complete, toolExecutionNotifications: report.errors.map(e => ({ level: 'error', message: { text: `${e.path}: ${e.message}` } })) }],
  }] }, null, 2);
  if (format !== 'markdown') throw new Error(`Unsupported risk report format: ${format}`);
  const safe = text => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return `# Risk Check\n\n${report.limitation}\n\nComplete: ${report.complete}; active: ${report.activeCount}; suppressed: ${report.suppressedCount}; exit: ${report.exitCode}\n\n| Severity | Location | Finding | State |\n| --- | --- | --- | --- |\n` +
    report.findings.map(f => `| ${f.severity} | ${safe(f.path)}:${f.line} | ${safe(f.title)} — ${safe(f.evidence)} | ${f.suppressed ? 'suppressed: ' + safe(f.suppressionReason) : 'active'} |`).join('\n') +
    (report.errors.length ? '\n\n## Incomplete checks\n\n' + report.errors.map(e => `- ${safe(e.path)}: ${safe(e.message)}`).join('\n') : '') + '\n';
}
