import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const providers = new Set(['dropbox', 'google', 'onedrive']);
const connectionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const powershellScript = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$encoded = [Console]::In.ReadToEnd().Trim()
$bytes = [Convert]::FromBase64String($encoded)
if ($env:CLOUDSTORAGE_DPAPI_OPERATION -eq 'protect') {
  $result = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
} elseif ($env:CLOUDSTORAGE_DPAPI_OPERATION -eq 'unprotect') {
  $result = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
} else {
  throw 'Invalid DPAPI operation.'
}
[Console]::Out.Write([Convert]::ToBase64String($result))
`;

function assertRecord(record) {
  if (!record || Array.isArray(record) || typeof record !== 'object') throw new Error('connection_store_invalid');
  if (!connectionIdPattern.test(record.id) || !providers.has(record.provider)) throw new Error('connection_store_invalid');
  if (!record.identity || Array.isArray(record.identity) || typeof record.identity !== 'object') throw new Error('connection_store_invalid');
  if (typeof record.refreshToken !== 'string' || !record.refreshToken || record.refreshToken.length > 16384) throw new Error('connection_store_invalid');
  if (!['connected', 'reauthentication_required'].includes(record.state)) throw new Error('connection_store_invalid');
  if (record.grantedScopes !== null && (!Array.isArray(record.grantedScopes) || record.grantedScopes.some(scope => typeof scope !== 'string' || !scope))) {
    throw new Error('connection_store_invalid');
  }
}

function validateState(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.connections)) {
    throw new Error('connection_store_invalid');
  }
  const ids = new Map();
  for (const record of value.connections) {
    assertRecord(record);
    if (ids.has(record.id)) throw new Error('connection_store_invalid');
    ids.set(record.id, record.provider);
  }
  if (!value.activeConnections || Array.isArray(value.activeConnections) || typeof value.activeConnections !== 'object') throw new Error('connection_store_invalid');
  for (const [provider, id] of Object.entries(value.activeConnections)) {
    if (!providers.has(provider) || ids.get(id) !== provider) throw new Error('connection_store_invalid');
  }
  return value;
}

function defaultPowerShell() {
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows';
  return path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

export function transformWithDpapi(operation, bytes, { executable = defaultPowerShell() } = {}) {
  if (process.platform !== 'win32') throw new Error('dpapi_unavailable');
  const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', powershellScript], {
    input: Buffer.from(bytes).toString('base64'),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
    env: { ...process.env, CLOUDSTORAGE_DPAPI_OPERATION: operation },
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 || result.error || !result.stdout.trim()) throw new Error('dpapi_failed');
  try { return Buffer.from(result.stdout.trim(), 'base64'); } catch { throw new Error('dpapi_failed'); }
}

export class SecureConnectionStore {
  constructor(filePath, { protect = bytes => transformWithDpapi('protect', bytes), unprotect = bytes => transformWithDpapi('unprotect', bytes) } = {}) {
    this.filePath = filePath;
    this.protect = protect;
    this.unprotect = unprotect;
  }

  load() {
    if (!existsSync(this.filePath)) return { version: 1, connections: [], activeConnections: {} };
    let envelope;
    try { envelope = JSON.parse(readFileSync(this.filePath, 'utf8')); } catch { throw new Error('connection_store_invalid'); }
    if (!envelope || envelope.version !== 1 || envelope.protection !== 'windows-dpapi-current-user' || typeof envelope.payload !== 'string') {
      throw new Error('connection_store_invalid');
    }
    let cleartext;
    try { cleartext = this.unprotect(Buffer.from(envelope.payload, 'base64')); } catch { throw new Error('connection_store_unavailable'); }
    try { return validateState(JSON.parse(Buffer.from(cleartext).toString('utf8'))); } catch { throw new Error('connection_store_invalid'); }
  }

  save(state) {
    const validated = validateState(structuredClone(state));
    const protectedBytes = this.protect(Buffer.from(JSON.stringify(validated), 'utf8'));
    const envelope = `${JSON.stringify({ version: 1, protection: 'windows-dpapi-current-user', payload: Buffer.from(protectedBytes).toString('base64') }, null, 2)}\n`;
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
    try {
      writeFileSync(temporary, envelope, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      renameSync(temporary, this.filePath);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
}

export class SecureTextStore {
  constructor(filePath, { protect = bytes => transformWithDpapi('protect', bytes), unprotect = bytes => transformWithDpapi('unprotect', bytes) } = {}) {
    this.filePath = filePath;
    this.protect = protect;
    this.unprotect = unprotect;
  }

  hasValue() {
    if (!existsSync(this.filePath)) return false;
    let envelope;
    try { envelope = JSON.parse(readFileSync(this.filePath, 'utf8')); } catch { throw new Error('secret_store_invalid'); }
    if (!envelope || envelope.version !== 1 || envelope.protection !== 'windows-dpapi-current-user' || typeof envelope.payload !== 'string' || !envelope.payload) {
      throw new Error('secret_store_invalid');
    }
    return true;
  }

  load() {
    if (!existsSync(this.filePath)) return undefined;
    let envelope;
    try { envelope = JSON.parse(readFileSync(this.filePath, 'utf8')); } catch { throw new Error('secret_store_invalid'); }
    if (!envelope || envelope.version !== 1 || envelope.protection !== 'windows-dpapi-current-user' || typeof envelope.payload !== 'string' || !envelope.payload) {
      throw new Error('secret_store_invalid');
    }
    let cleartext;
    try { cleartext = this.unprotect(Buffer.from(envelope.payload, 'base64')).toString('utf8'); } catch { throw new Error('secret_store_unavailable'); }
    if (!cleartext || cleartext.length > 16384 || cleartext.includes('\0')) throw new Error('secret_store_invalid');
    return cleartext;
  }

  save(value) {
    if (typeof value !== 'string' || !value || value.length > 16384 || value.includes('\0')) throw new Error('secret_store_invalid');
    const protectedBytes = this.protect(Buffer.from(value, 'utf8'));
    const envelope = `${JSON.stringify({ version: 1, protection: 'windows-dpapi-current-user', payload: Buffer.from(protectedBytes).toString('base64') }, null, 2)}\n`;
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
    try {
      writeFileSync(temporary, envelope, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      renameSync(temporary, this.filePath);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
}
