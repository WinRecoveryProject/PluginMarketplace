import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { providerNames } from './providers.mjs';
import { BrokerError } from './broker.mjs';

export function validateClientId(provider, value) {
  if (!providerNames.includes(provider) || typeof value !== 'string' || value.length < 5 || value.length > 300 || !/^[A-Za-z0-9._-]+$/u.test(value)) {
    throw new BrokerError('invalid_client_id');
  }
  if (provider === 'onedrive' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)) throw new BrokerError('invalid_microsoft_client_id');
  return value;
}

export class ClientSettingsStore {
  constructor(file) { this.file = file; }

  load() {
    try {
      if (fs.lstatSync(this.file).isSymbolicLink()) throw new Error('Link');
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (data.version !== 1 || !data.clients || Array.isArray(data.clients) || typeof data.clients !== 'object' || Object.keys(data).some(key => !['version', 'clients'].includes(key))) throw new Error('Invalid settings');
      for (const [provider, value] of Object.entries(data.clients)) validateClientId(provider, value);
      return data.clients;
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw new BrokerError('client_settings_invalid', 500);
    }
  }

  save(provider, clientId) {
    validateClientId(provider, clientId);
    const clients = { ...this.load(), [provider]: clientId };
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify({ version: 1, clients }, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, this.file);
    } catch {
      try { fs.unlinkSync(temporary); } catch {}
      throw new BrokerError('client_settings_write_failed', 500);
    }
  }
}
