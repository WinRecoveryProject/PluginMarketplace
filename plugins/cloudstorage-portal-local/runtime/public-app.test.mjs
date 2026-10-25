import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { platformNames, platformCapabilities } from './platforms.mjs';

const source = await readFile(new URL('./public/app.js', import.meta.url), 'utf8');

function node(tag) {
  return {
    tag, textContent: '', children: [],
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {},
  };
}

async function renderTargets(connections, configured = true, activeConnections = {}) {
  const targets = new Map();
  const document = {
    createElement: node,
    querySelector(selector) {
      if (!targets.has(selector)) targets.set(selector, node(selector));
      return targets.get(selector);
    },
  };
  const status = {
    csrf: 'test-only', localOneDrive: { configured, root: configured ? 'C:\\Cloud\\OneDrive' : null }, activeConnections, connections, platforms: platformNames.map(platformCapabilities),
    credentialStore: { configured: true, protection: 'windows-dpapi-current-user', loadError: null, saveError: null },
    providers: ['dropbox', 'google', 'onedrive'].map(provider => ({
      provider, configured, clientId: '', callback: '', registration: {},
      ...(provider === 'google' ? { clientSecretConfigured: true, clientSecretLoadError: null } : {}),
    })),
  };
  const context = vm.createContext({
    document, URLSearchParams,
    window: { location: { hash: '' }, history: { replaceState() {} } },
    fetch: async resource => {
      assert.equal(resource, '/api/status');
      return { ok: true, json: async () => status };
    },
  });
  await vm.runInContext(source, context);
  assert.equal(targets.get('#message').textContent, '');
  return targets;
}

async function renderProviders(connections, configured = true) {
  const targets = await renderTargets(connections, configured);
  return targets.get('#providers').children.map(card => ({
    label: card.children[0].children.find(child => child.tag === 'span').textContent,
    readiness: card.children[1].textContent,
  }));
}

function connection(provider, state = 'connected', rootVerifiedAt) {
  return { id: `${provider}-${state}-${rootVerifiedAt}`, provider, state, rootVerifiedAt, identity: { subject: 'test-account' }, credentialPersistence: 'windows-dpapi-current-user' };
}

test('provider cards retain all three platform names and distinguish registration from login', async () => {
  const missing = await renderProviders([], false);
  assert.deepEqual(missing.map(card => card.label), ['Dropbox', 'Google Drive', 'OneDrive']);
  assert.ok(missing.every(card => card.readiness === 'Appregistrering mangler.'));
  const registered = await renderProviders([]);
  assert.ok(registered.every(card => card.readiness.includes('Ingen konti med bekræftet login')));
});

test('provider cards use distinct provider icons', async () => {
  const targets = await renderTargets([]);
  const icons = targets.get('#providers').children.map(card => card.children[0].children.find(child => child.tag === 'img'));
  assert.deepEqual(icons.map(icon => icon.src), [
    '/assets/providers/dropbox.png',
    '/assets/providers/google-drive.png',
    '/assets/providers/onedrive.png',
  ]);
  assert.ok(icons.every(icon => icon.alt === '' && icon.width === 32 && icon.height === 32));
});

test('verified OneDrive login is not shown as unverified or attributed to another provider', async () => {
  const cards = await renderProviders([connection('onedrive', 'connected', 123)]);
  assert.equal(cards[2].readiness, '1 konto/konti har bekræftet identitet. 1 har bekræftet rodadgang.');
  assert.ok(cards[0].readiness.includes('Ingen konti med bekræftet login'));
  assert.ok(cards[1].readiness.includes('Ingen konti med bekræftet login'));
});

test('readiness counts multiple connected accounts but excludes expired connections and stale root proof', async () => {
  const cards = await renderProviders([
    connection('onedrive'), connection('onedrive', 'connected', 123),
    connection('onedrive', 'reauthentication_required', 456), connection('google', 'connected', 789),
  ]);
  assert.equal(cards[2].readiness, '2 konto/konti har bekræftet identitet. 1 har bekræftet rodadgang.');
  assert.equal(cards[1].readiness, '1 konto/konti har bekræftet identitet. 1 har bekræftet rodadgang.');
  const expired = await renderProviders([connection('onedrive', 'reauthentication_required', 456)]);
  assert.ok(expired[2].readiness.includes('Ingen konti med bekræftet login'));
});

test('account cards allow fast switching only to a healthy non-selected connection', async () => {
  const connections = [
    { ...connection('google'), id: 'google-active', identity: { subject: 'active' } },
    { ...connection('google'), id: 'google-other', identity: { subject: 'other' } },
    { ...connection('google', 'reauthentication_required'), id: 'google-expired', identity: { subject: 'expired' } },
  ];
  const targets = await renderTargets(connections, true, { google: 'google-active' });
  const cards = targets.get('#connections').children.filter(child => child.tag === 'article');
  const selectionButtons = cards.map(card => card.children.find(child => child.textContent === 'Brug denne konto'));
  assert.deepEqual(selectionButtons.map(item => item.disabled), [true, false, true]);
});

test('account cards distinguish protected and restored grants from memory-only login', async () => {
  const targets = await renderTargets([
    { ...connection('onedrive'), restoredFromSecureStore: true },
    { ...connection('dropbox'), credentialPersistence: 'memory-only' },
  ]);
  const cards = targets.get('#connections').children.filter(child => child.tag === 'article');
  assert.ok(cards[0].children.some(child => child.textContent.includes('genvalideres')));
  assert.ok(cards[1].children.some(child => child.textContent.includes('portalproces')));
});

test('local OneDrive controls explain root configuration and require a relative folder', async () => {
  const configured = await renderTargets([]);
  const configuredCard = configured.get('#local-onedrive').children[0];
  assert.equal(configuredCard.children[1].textContent, 'OneDrive-rod: C:\\Cloud\\OneDrive');
  assert.ok(configuredCard.children.some(child => child.textContent.includes('Indsæt ikke C:\\Users\\')));
  const configuredLabel = configuredCard.children.find(child => child.tag === 'label');
  assert.equal(configuredLabel.children[0].placeholder, 'Eksempel: Archive eller Dokumenter/ChatGPT');
  assert.equal(configuredLabel.children[0].disabled, false);

  const missing = await renderTargets([], false);
  const missingCard = missing.get('#local-onedrive').children[0];
  assert.ok(missingCard.children[1].textContent.includes('Knapperne er derfor slået fra'));
  const missingLabel = missingCard.children.find(child => child.tag === 'label');
  assert.equal(missingLabel.children[0].disabled, true);
});
