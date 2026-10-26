import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { providerNames, providerConfig, readIdentity, readRoot, clientEnvironmentKeys, registrationGuidance } from './providers.mjs';
import { getOneDriveItem, listOneDriveFolder, readOneDriveText, searchOneDrive } from './onedrive-items.mjs';
import { platformCapabilities, validatePlatformIdentity } from './platforms.mjs';
import { accountDirectory } from './account-directory.mjs';

export class BrokerError extends Error {
  constructor(code, status = 400, diagnostic) {
    super(code);
    this.code = code;
    this.status = status;
    if (diagnostic) this.diagnostic = diagnostic;
  }
}

const randomToken = () => randomBytes(32).toString('base64url');
const pendingLoginLifetimeMs = 30 * 60 * 1000;

export class Broker {
  constructor({ origin, env = process.env, fetchImpl = fetch, now = Date.now, settingsStore, connectionStore, secretDiagnostics = {}, secretLoaders = {}, secretConfigured = {} } = {}) {
    this.origin = origin;
    this.env = { ...env };
    this.settingsStore = settingsStore;
    this.connectionStore = connectionStore;
    this.secretDiagnostics = { ...secretDiagnostics };
    this.secretLoaders = { ...secretLoaders };
    this.secretConfigured = { ...secretConfigured };
    this.secretLoadAttempted = new Set();
    this.persistenceLoadError = null;
    this.persistenceSaveError = null;
    this.restoredState = { version: 1, connections: [], activeConnections: {} };
    try { if (connectionStore) this.restoredState = connectionStore.load(); } catch (error) { this.persistenceLoadError = error.message; }
    this.restoredClaimed = false;
    this.environmentManaged = new Set(providerNames.filter(provider => Boolean(env[clientEnvironmentKeys[provider]])));
    for (const [provider, clientId] of Object.entries(settingsStore?.load() ?? {})) {
      if (!this.environmentManaged.has(provider)) this.env[clientEnvironmentKeys[provider]] = clientId;
    }
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.sessions = new Map();
    this.pending = new Map();
    this.connections = new Map();
    this.refreshes = new Map();
  }

  createSession() {
    const id = randomToken();
    const activeConnections = {};
    if (!this.restoredClaimed && !this.persistenceLoadError) {
      for (const saved of this.restoredState.connections) {
        try { validatePlatformIdentity(saved.provider, saved.identity); } catch { this.persistenceLoadError = 'connection_store_invalid'; break; }
        this.connections.set(saved.id, {
          id: saved.id, owner: id, provider: saved.provider, identity: saved.identity,
          tokens: { access: '', refresh: saved.refreshToken, expires: 0, grantedScopes: saved.grantedScopes },
          identityVerifiedAt: saved.identityVerifiedAt, rootVerifiedAt: saved.rootVerifiedAt,
          state: saved.state, restored: saved.state === 'connected',
        });
      }
      if (!this.persistenceLoadError) Object.assign(activeConnections, this.restoredState.activeConnections);
      else for (const [connectionId, connection] of this.connections) if (connection.owner === id) this.connections.delete(connectionId);
      this.restoredClaimed = true;
    }
    this.sessions.set(id, { expires: this.now() + 8 * 60 * 60 * 1000, csrf: randomToken(), activeConnections });
    return id;
  }

  persist(owner) {
    if (!this.connectionStore) return;
    const session = this.session(owner);
    const connections = [...this.connections.values()].filter(connection => connection.owner === owner && connection.tokens.refresh).map(connection => ({
      id: connection.id, provider: connection.provider, identity: connection.identity,
      refreshToken: connection.tokens.refresh, grantedScopes: connection.tokens.grantedScopes ?? null,
      identityVerifiedAt: connection.identityVerifiedAt, rootVerifiedAt: connection.rootVerifiedAt,
      state: connection.state,
    }));
    const savedIds = new Set(connections.map(connection => connection.id));
    const activeConnections = Object.fromEntries(Object.entries(session.activeConnections).filter(([, connectionId]) => savedIds.has(connectionId)));
    try {
      this.connectionStore.save({ version: 1, connections, activeConnections });
      this.persistenceSaveError = null;
    } catch (error) {
      this.persistenceSaveError = error.message;
    }
  }

  session(owner) {
    const session = this.sessions.get(owner);
    if (!session || session.expires <= this.now()) throw new BrokerError('session_required', 401);
    return session;
  }

  config(provider) {
    if (!providerNames.includes(provider)) throw new BrokerError('unknown_provider');
    return providerConfig(provider, this.env);
  }

  loadProviderSecret(provider) {
    if (provider !== 'google' || this.env.GOOGLE_CLIENT_SECRET) return;
    const loader = this.secretLoaders.google;
    if (!loader || this.secretLoadAttempted.has(provider)) {
      if (this.secretDiagnostics.google) throw new BrokerError('provider_client_secret_unavailable', 500);
      return;
    }
    this.secretLoadAttempted.add(provider);
    try {
      const value = loader();
      if (typeof value !== 'string' || !value) throw new Error('secret_store_invalid');
      this.env.GOOGLE_CLIENT_SECRET = value;
      this.secretDiagnostics.google = null;
    } catch (error) {
      this.secretDiagnostics.google = error.message;
      throw new BrokerError('provider_client_secret_unavailable', 500);
    }
  }

  connection(owner, id) {
    this.session(owner);
    const connection = this.connections.get(id);
    if (!connection || connection.owner !== owner) throw new BrokerError('connection_not_found', 404);
    return connection;
  }

  begin(owner, provider) {
    this.session(owner);
    const config = this.config(provider);
    if (!config.clientId) throw new BrokerError('client_registration_missing', 409);
    for (const [key, pending] of this.pending) {
      if (pending.expires <= this.now()) this.pending.delete(key);
    }
    if (this.pending.size >= 100) throw new BrokerError('too_many_pending_logins', 429);
    const state = randomToken();
    const verifier = randomToken();
    const redirectUri = `${this.origin}/oauth/${provider}/callback`;
    this.pending.set(state, { owner, provider, verifier, redirectUri, expires: this.now() + pendingLoginLifetimeMs });
    const url = new URL(config.authorize);
    url.search = new URLSearchParams({
      client_id: config.clientId, response_type: 'code', redirect_uri: redirectUri,
      scope: config.scopes.join(' '), state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256', ...config.extra,
    }).toString();
    return url.href;
  }

  async json(url, options = {}) {
    let response;
    try {
      response = await this.fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
    } catch {
      throw new BrokerError('provider_unreachable', 502);
    }
    if (!response.ok) {
      let payload;
      try { payload = await response.json(); } catch {}
      const code = typeof payload?.error === 'string' ? payload.error : payload?.error?.code;
      // Never return provider descriptions, URLs, request bodies, headers or tokens.
      const allowedCodes = new Set(['invalid_grant', 'invalid_client', 'unauthorized_client', 'invalid_scope', 'invalid_request', 'access_denied', 'InvalidAuthenticationToken', 'accessDenied', 'itemNotFound', 'BadRequest', 'badRequest', 'invalidRequest', 'Request_BadRequest', 'notSupported', 'notAllowed', 'generalException', 'UnknownError', 'unknownError']);
      const endpoint = new URL(url);
      const operation = endpoint.hostname === 'login.microsoftonline.com' && endpoint.pathname.endsWith('/token') ? 'microsoft-token'
        : endpoint.hostname === 'graph.microsoft.com' && endpoint.pathname === '/v1.0/me' ? 'microsoft-profile'
        : endpoint.hostname === 'graph.microsoft.com' && endpoint.pathname === '/v1.0/me/drive' ? 'onedrive-drive' : undefined;
      const diagnostic = {
        httpStatus: response.status,
        ...(operation ? { operation } : {}),
        ...(allowedCodes.has(code) ? { providerCode: code } : {}),
        ...(Array.isArray(payload?.error_codes) ? { microsoftErrorCodes: payload.error_codes.filter(value => Number.isSafeInteger(value) && value > 0).slice(0, 5) } : {}),
      };
      if (code === 'invalid_grant') throw new BrokerError('reauthentication_required', 401, diagnostic);
      if (response.status === 401) throw new BrokerError('reauthentication_required', 401, diagnostic);
      if (response.status === 403) throw new BrokerError('provider_permission_denied', 403, diagnostic);
      if (response.status === 429) throw new BrokerError('provider_rate_limited', 429, diagnostic);
      throw new BrokerError('provider_request_failed', 502, diagnostic);
    }
    try { return await response.json(); } catch { throw new BrokerError('invalid_provider_response', 502); }
  }

  async token(provider, parameters) {
    this.loadProviderSecret(provider);
    const config = this.config(provider);
    const body = new URLSearchParams({ client_id: config.clientId, ...parameters });
    if (config.clientSecret) body.set('client_secret', config.clientSecret);
    const tokens = await this.json(config.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.token_type?.toLowerCase() !== 'bearer') {
      throw new BrokerError('invalid_token_response', 502);
    }
    const expiresIn = Number(tokens.expires_in);
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new BrokerError('invalid_token_expiry', 502);
    return { access: tokens.access_token, refresh: tokens.refresh_token, expires: this.now() + expiresIn * 1000, grantedScopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : null };
  }

  async complete(owner, provider, parameters) {
    this.session(owner);
    this.config(provider);
    const state = parameters.get('state');
    const pending = this.pending.get(state);
    if (!pending || pending.owner !== owner || pending.provider !== provider || pending.expires <= this.now()) {
      throw new BrokerError('invalid_oauth_state');
    }
    this.pending.delete(state);
    if (parameters.has('error')) throw new BrokerError('provider_consent_not_completed');
    const code = parameters.get('code');
    if (!code || parameters.getAll('code').length !== 1 || parameters.getAll('state').length !== 1) throw new BrokerError('invalid_oauth_callback');
    const tokens = await this.token(provider, { grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier });
    const identity = await readIdentity(provider, (url, options) => this.json(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${tokens.access}` } }));
    this.session(owner);
    try { validatePlatformIdentity(provider, identity); } catch { throw new BrokerError('missing_provider_identity', 502); }
    const connection = { id: randomUUID(), owner, provider, identity, tokens, identityVerifiedAt: this.now(), rootVerifiedAt: null, state: 'connected' };
    this.connections.set(connection.id, connection);
    this.session(owner).activeConnections[provider] = connection.id;
    this.persist(owner);
    return this.redact(connection);
  }

  redact(connection) {
    return { id: connection.id, provider: connection.provider, identity: connection.identity, state: connection.state,
      identityVerifiedAt: connection.identityVerifiedAt, rootVerifiedAt: connection.rootVerifiedAt,
      grantedScopes: connection.tokens.grantedScopes, requestedScopes: this.config(connection.provider).scopes,
      credentialPersistence: connection.tokens.refresh && this.connectionStore && !this.persistenceSaveError ? 'windows-dpapi-current-user' : 'memory-only',
      restoredFromSecureStore: Boolean(connection.restored) };
  }

  status(owner) {
    const session = this.session(owner);
    const connections = [...this.connections.values()].filter(connection => connection.owner === owner).map(connection => this.redact(connection));
    return { csrf: session.csrf, activeConnections: { ...session.activeConnections }, platforms: providerNames.map(platformCapabilities), accounts: accountDirectory(connections, session.activeConnections),
      providers: providerNames.map(provider => ({ provider, label: this.config(provider).label, configured: Boolean(this.config(provider).clientId), clientId: this.config(provider).clientId ?? '', environmentManaged: this.environmentManaged.has(provider), configurationPersistent: Boolean(this.settingsStore), callback: `${this.origin}/oauth/${provider}/callback`, registration: registrationGuidance[provider],
        ...(provider === 'google' ? {
          clientSecretConfigured: Boolean(this.config(provider).clientSecret) || Boolean(this.secretConfigured.google),
          clientSecretLoaded: Boolean(this.config(provider).clientSecret),
          clientSecretLoadAttempted: this.secretLoadAttempted.has(provider),
          clientSecretLoadError: this.secretDiagnostics.google ?? null,
        } : {}) })),
      connections,
      credentialStore: { configured: Boolean(this.connectionStore), protection: this.connectionStore ? 'windows-dpapi-current-user' : null,
        loadError: this.persistenceLoadError, saveError: this.persistenceSaveError },
    };
  }

  configureClient(owner, provider, clientId, validate) {
    this.session(owner);
    this.config(provider);
    validate(provider, clientId);
    if (this.environmentManaged.has(provider)) throw new BrokerError('client_managed_by_environment', 409);
    if ([...this.connections.values()].some(connection => connection.provider === provider)) throw new BrokerError('disconnect_provider_before_configuration_change', 409);
    this.settingsStore?.save(provider, clientId);
    this.env[clientEnvironmentKeys[provider]] = clientId;
    for (const [state, pending] of this.pending) if (pending.provider === provider) this.pending.delete(state);
    return { provider, configured: true, persistent: Boolean(this.settingsStore), loginVerified: false };
  }

  selectConnection(owner, id) {
    const connection = this.connection(owner, id);
    if (connection.state !== 'connected') throw new BrokerError('reauthentication_required', 401);
    this.session(owner).activeConnections[connection.provider] = id;
    this.persist(owner);
    return { provider: connection.provider, connectionId: id, selected: true };
  }

  selectFallback(owner, provider, excludedId) {
    const session = this.session(owner);
    const replacement = [...this.connections.values()].reverse().find(connection =>
      connection.owner === owner && connection.provider === provider && connection.id !== excludedId && connection.state === 'connected');
    if (replacement) session.activeConnections[provider] = replacement.id;
    else delete session.activeConnections[provider];
    return replacement?.id ?? null;
  }

  requireReauthentication(owner, connection) {
    connection.state = 'reauthentication_required';
    if (this.session(owner).activeConnections[connection.provider] === connection.id) {
      this.selectFallback(owner, connection.provider, connection.id);
    }
    this.persist(owner);
  }

  sameIdentity(provider, expected, actual) {
    return JSON.stringify([provider, expected.subject, expected.subjectKind ?? null, expected.tenantId ?? null, expected.driveId ?? null])
      === JSON.stringify([provider, actual.subject, actual.subjectKind ?? null, actual.tenantId ?? null, actual.driveId ?? null]);
  }

  async access(owner, id) {
    const connection = this.connection(owner, id);
    if (connection.state !== 'connected') throw new BrokerError('reauthentication_required', 401);
    if (connection.tokens.expires > this.now() + 60000) return connection.tokens.access;
    if (!connection.tokens.refresh) {
      this.requireReauthentication(owner, connection);
      throw new BrokerError('reauthentication_required', 401);
    }
    if (!this.refreshes.has(id)) {
      const refresh = this.token(connection.provider, { grant_type: 'refresh_token', refresh_token: connection.tokens.refresh })
        .then(async tokens => {
          this.connection(owner, id);
          if (connection.restored) {
            const identity = await readIdentity(connection.provider, (url, options) => this.json(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${tokens.access}` } }));
            try { validatePlatformIdentity(connection.provider, identity); } catch { throw new BrokerError('missing_provider_identity', 502); }
            if (!this.sameIdentity(connection.provider, connection.identity, identity)) throw new BrokerError('provider_identity_changed', 401);
            connection.identity = identity;
            connection.identityVerifiedAt = this.now();
            connection.restored = false;
          }
          connection.tokens = { ...tokens, refresh: tokens.refresh ?? connection.tokens.refresh, grantedScopes: tokens.grantedScopes ?? connection.tokens.grantedScopes };
          this.persist(owner);
          return connection.tokens.access;
        })
        .catch(error => {
          if (error.code === 'reauthentication_required') this.requireReauthentication(owner, connection);
          throw error;
        })
        .finally(() => this.refreshes.delete(id));
      this.refreshes.set(id, refresh);
    }
    return this.refreshes.get(id);
  }

  async root(owner, id) {
    const connection = this.connection(owner, id);
    const access = await this.access(owner, id);
    try {
      const result = await readRoot(connection.provider, (url, options) => this.json(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${access}` } }));
      this.connection(owner, id);
      connection.rootVerifiedAt = this.now();
      this.persist(owner);
      return { connectionId: id, provider: connection.provider, account: connection.identity, ...result, verifiedAt: connection.rootVerifiedAt };
    } catch (error) {
      if (error.code === 'reauthentication_required') this.requireReauthentication(owner, connection);
      throw error;
    }
  }

  async executeAccountOperation(owner, { provider, connectionId, operation, itemId, query, top }) {
    const connection = this.connection(owner, connectionId);
    if (provider !== connection.provider) throw new BrokerError('connection_provider_mismatch');
    if (!platformCapabilities(provider).runtimeOperations.includes(operation) || operation === 'identity') throw new BrokerError('operation_not_implemented');
    if (operation === 'root') {
      if (itemId !== undefined) throw new BrokerError('root_operation_rejects_item_id');
      if (query !== undefined || top !== undefined) throw new BrokerError('root_operation_rejects_extra_arguments');
      return this.root(owner, connectionId);
    }
    if (operation === 'search') {
      if (itemId !== undefined) throw new BrokerError('search_operation_rejects_item_id');
      return this.searchOneDrive(owner, connectionId, query, top);
    }
    if (typeof itemId !== 'string' || !itemId) throw new BrokerError('item_id_required');
    return this.oneDriveItem(owner, connectionId, itemId, operation);
  }

  async searchOneDrive(owner, id, query, top) {
    const connection = this.connection(owner, id);
    if (connection.provider !== 'onedrive') throw new BrokerError('onedrive_connection_required');
    const access = await this.access(owner, id);
    const request = (url, options) => this.json(url, { ...options, headers: { Authorization: `Bearer ${access}` } });
    const result = await searchOneDrive(connection.identity.driveId, query, top, request);
    this.connection(owner, id);
    return { connectionId: id, provider: 'onedrive', account: connection.identity, ...result, verifiedAt: this.now() };
  }

  async oneDriveItem(owner, id, itemId, operation) {
    const connection = this.connection(owner, id);
    if (connection.provider !== 'onedrive') throw new BrokerError('onedrive_connection_required');
    if (!['folder', 'item', 'text'].includes(operation)) throw new BrokerError('unknown_onedrive_operation');
    const access = await this.access(owner, id);
    const request = (url, options) => this.json(url, { ...options, headers: { Authorization: `Bearer ${access}` } });
    const result = operation === 'folder'
      ? await listOneDriveFolder(connection.identity.driveId, itemId, request)
      : operation === 'item'
        ? await getOneDriveItem(connection.identity.driveId, itemId, request)
        : await readOneDriveText(connection.identity.driveId, itemId, request, this.fetchImpl, access);
    this.connection(owner, id);
    return { connectionId: id, provider: 'onedrive', account: connection.identity, ...result, verifiedAt: this.now() };
  }

  disconnect(owner, id) {
    const connection = this.connection(owner, id);
    this.connections.delete(id);
    const session = this.session(owner);
    const replacementConnectionId = session.activeConnections[connection.provider] === id
      ? this.selectFallback(owner, connection.provider, id)
      : session.activeConnections[connection.provider] ?? null;
    connection.tokens = {};
    this.persist(owner);
    return { disconnected: true, provider: connection.provider, replacementConnectionId, providerRevoked: false,
      message: replacementConnectionId
        ? 'Local credentials removed. Another connected account is now selected for this platform. Revoke the app separately in provider account settings.'
        : 'Local credentials removed. Revoke the app separately in provider account settings.' };
  }
}
