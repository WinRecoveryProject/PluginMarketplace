import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Broker, BrokerError } from './broker.mjs';
import { localOneDriveStatus, readLocalOneDriveRoot, readLocalOneDriveFolder, resolveLocalOneDriveEnvironment } from './local-onedrive.mjs';
import { ClientSettingsStore, validateClientId } from './client-settings.mjs';
import { SecureConnectionStore, SecureTextStore } from './secure-connection-store.mjs';

const sameSecret = (left, right) => typeof left === 'string' && typeof right === 'string' && Buffer.byteLength(left) === Buffer.byteLength(right) && timingSafeEqual(Buffer.from(left), Buffer.from(right));

export async function listenLoopback(server, port, { attempts = 21, delayMs = 250 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const failed = error => { server.off('listening', ready); reject(error); };
        const ready = () => { server.off('error', failed); resolve(); };
        server.once('error', failed);
        server.once('listening', ready);
        server.listen(port, '127.0.0.1');
      });
      return;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export function createPortal({ port = 53682, env = process.env, fetchImpl = fetch,
  settingsStore = env.LOCALAPPDATA ? new ClientSettingsStore(path.join(env.LOCALAPPDATA, 'CloudStoragePortal', 'client-settings.json')) : undefined,
  connectionStore = env.LOCALAPPDATA && process.platform === 'win32' ? new SecureConnectionStore(path.join(env.LOCALAPPDATA, 'CloudStoragePortal', 'connections.dpapi.json')) : undefined,
  googleSecretStore = env.LOCALAPPDATA && process.platform === 'win32' ? new SecureTextStore(path.join(env.LOCALAPPDATA, 'CloudStoragePortal', 'google-client-secret.dpapi.json')) : undefined } = {}) {
  const origin = `http://127.0.0.1:${port}`;
  const runtimeEnv = resolveLocalOneDriveEnvironment(env);
  let googleSecretLoadError = null;
  let googleSecretConfigured = Boolean(runtimeEnv.GOOGLE_CLIENT_SECRET);
  if (!googleSecretConfigured && googleSecretStore) {
    try { googleSecretConfigured = googleSecretStore.hasValue(); } catch (error) { googleSecretLoadError = error.message; }
  }
  const broker = new Broker({
    origin, env: runtimeEnv, fetchImpl, settingsStore, connectionStore,
    secretDiagnostics: { google: googleSecretLoadError },
    secretConfigured: { google: googleSecretConfigured },
    secretLoaders: googleSecretStore ? { google: () => googleSecretStore.load() } : {},
  });
  const portalOwner = broker.createSession();
  let bootstrap = randomBytes(32).toString('base64url');
  let bootstrapExpires = broker.now() + 5 * 60 * 1000;
  const launchUrl = `${origin}/#bootstrap=${bootstrap}`;
  const send = (response, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    response.writeHead(status, {
      'Content-Type': type, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      ...extra,
    });
    response.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
  };
  const server = http.createServer(async (request, response) => {
    try {
      if (request.headers.host !== `127.0.0.1:${port}`) throw new BrokerError('invalid_host', 403);
      const url = new URL(request.url, origin);
      const method = request.method;
      if (method === 'POST' && request.headers.origin !== origin) throw new BrokerError('invalid_origin', 403);
      if (method === 'GET' && ['/', '/app.js', '/style.css', '/assets/providers/dropbox.png', '/assets/providers/google-drive.png', '/assets/providers/onedrive.png'].includes(url.pathname)) {
        const files = {
          '/': ['index.html', 'text/html; charset=utf-8'],
          '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
          '/style.css': ['style.css', 'text/css; charset=utf-8'],
          '/assets/providers/dropbox.png': ['assets/providers/dropbox.png', 'image/png'],
          '/assets/providers/google-drive.png': ['assets/providers/google-drive.png', 'image/png'],
          '/assets/providers/onedrive.png': ['assets/providers/onedrive.png', 'image/png'],
        };
        const [file, type] = files[url.pathname];
        return send(response, 200, await readFile(new URL(`./public/${file}`, import.meta.url)), type);
      }
      if (method === 'POST' && url.pathname === '/api/session') {
        broker.session(portalOwner);
        if (!bootstrap || bootstrapExpires <= broker.now() || !sameSecret(request.headers['x-bootstrap'], bootstrap)) throw new BrokerError('invalid_bootstrap', 403);
        bootstrap = null;
        return send(response, 200, { ready: true }, undefined, { 'Set-Cookie': `portal_session=${portalOwner}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
      }
      const owner = request.headers.cookie?.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith('portal_session='))?.slice('portal_session='.length);
      const session = broker.session(owner);
      if (method === 'GET' && url.pathname === '/api/status') return send(response, 200, { ...broker.status(owner), localOneDrive: localOneDriveStatus(runtimeEnv) });
      const callback = url.pathname.match(/^\/oauth\/(dropbox|google|onedrive)\/callback$/);
      if (method === 'GET' && callback) {
        await broker.complete(owner, callback[1], url.searchParams);
        return send(response, 303, '', 'text/plain', { Location: '/' });
      }
      if (method === 'POST') {
        if (!sameSecret(request.headers['x-csrf'], session.csrf)) throw new BrokerError('invalid_csrf', 403);
        const configuration = url.pathname.match(/^\/api\/configuration\/(dropbox|google|onedrive)$/);
        if (configuration) {
          if (request.headers['content-type'] !== 'application/json') throw new BrokerError('configuration_requires_json');
          const chunks = [];
          let size = 0;
          for await (const chunk of request) {
            size += chunk.length;
            if (size > 2048) throw new BrokerError('configuration_too_large', 413);
            chunks.push(chunk);
          }
          let body;
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new BrokerError('invalid_configuration_json'); }
          if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'client_id')) throw new BrokerError('configuration_accepts_client_id_only');
          return send(response, 200, broker.configureClient(owner, configuration[1], body.client_id, validateClientId));
        }
        if (url.pathname === '/api/local-onedrive/root') return send(response, 200, await readLocalOneDriveRoot(runtimeEnv));
        if (url.pathname === '/api/local-onedrive/folder') {
          if (url.searchParams.getAll('relative_path').length !== 1) throw new BrokerError('invalid_local_relative_path');
          return send(response, 200, await readLocalOneDriveFolder(url.searchParams.get('relative_path'), runtimeEnv));
        }
        const start = url.pathname.match(/^\/api\/connect\/(dropbox|google|onedrive)$/);
        if (start) return send(response, 200, { authorizeUrl: broker.begin(owner, start[1]) });
        const accountOperation = url.pathname.match(/^\/api\/connections\/([a-f0-9-]+)\/execute$/);
        if (accountOperation) {
          if (url.searchParams.getAll('provider').length !== 1 || url.searchParams.getAll('operation').length !== 1 || url.searchParams.getAll('item_id').length > 1 || [...url.searchParams.keys()].some(key => !['provider', 'operation', 'item_id'].includes(key))) throw new BrokerError('invalid_account_operation_parameters');
          return send(response, 200, await broker.executeAccountOperation(owner, { provider: url.searchParams.get('provider'), connectionId: accountOperation[1], operation: url.searchParams.get('operation'), itemId: url.searchParams.has('item_id') ? url.searchParams.get('item_id') : undefined }));
        }
        const oneDriveItem = url.pathname.match(/^\/api\/connections\/([a-f0-9-]+)\/onedrive\/(folder|text)$/);
        if (oneDriveItem) {
          if (url.searchParams.getAll('item_id').length !== 1 || [...url.searchParams.keys()].some(key => key !== 'item_id')) throw new BrokerError('invalid_onedrive_item_parameters');
          return send(response, 200, await broker.oneDriveItem(owner, oneDriveItem[1], url.searchParams.get('item_id'), oneDriveItem[2]));
        }
        const operation = url.pathname.match(/^\/api\/connections\/([a-f0-9-]+)\/(root|disconnect|select)$/);
        if (operation) {
          const result = operation[2] === 'root' ? await broker.root(owner, operation[1]) : operation[2] === 'select' ? broker.selectConnection(owner, operation[1]) : broker.disconnect(owner, operation[1]);
          return send(response, 200, result);
        }
      }
      return send(response, 404, { error: 'route_not_found' });
    } catch (error) {
      const status = error instanceof BrokerError ? error.status : 500;
      const code = error instanceof BrokerError ? error.code : 'internal_error';
      return send(response, status, { error: code });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  const cleanup = setInterval(() => {
    for (const [owner, session] of broker.sessions) {
      if (session.expires <= broker.now()) {
        broker.sessions.delete(owner);
        for (const [id, connection] of broker.connections) if (connection.owner === owner) broker.connections.delete(id);
      }
    }
    for (const [state, pending] of broker.pending) if (pending.expires <= broker.now()) broker.pending.delete(state);
  }, 60000);
  cleanup.unref();
  server.on('close', () => {
    clearInterval(cleanup);
    broker.sessions.clear();
    broker.pending.clear();
    broker.connections.clear();
  });
  return { server, broker, launchUrl, origin, owner: portalOwner, portalUrl: () => {
    broker.session(portalOwner);
    bootstrap = randomBytes(32).toString('base64url');
    bootstrapExpires = broker.now() + 5 * 60 * 1000;
    return `${origin}/#bootstrap=${bootstrap}`;
  } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORTAL_PORT ?? 53682);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORTAL_PORT must be between 1024 and 65535');
  const portal = createPortal({ port });
  portal.server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port is in use. Stop the existing portal or set PORTAL_PORT and update registered callbacks.' : 'Local portal failed to start.');
    process.exitCode = 1;
  });
  portal.server.listen(port, '127.0.0.1', () => {
    console.log('CloudStorage Portal: open this one-time local session link on this computer:');
    console.log(portal.launchUrl);
    console.log(process.platform === 'win32' && process.env.LOCALAPPDATA
      ? 'Refresh grants are protected with Windows DPAPI for this user. Access tokens stay in memory. No cloud write operations are enabled.'
      : 'Tokens stay in memory and are lost when the portal stops. No cloud write operations are enabled.');
  });
}
