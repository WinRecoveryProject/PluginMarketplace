let csrf;
const labels = { dropbox: 'Dropbox', google: 'Google Drive', onedrive: 'OneDrive' };
const providerIcons = {
  dropbox: '/assets/providers/dropbox.png',
  google: '/assets/providers/google-drive.png',
  onedrive: '/assets/providers/onedrive.png',
};
const message = document.querySelector('#message');

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'X-CSRF': csrf ?? '', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function providerHeading(tag, provider, suffix = '') {
  const heading = element(tag);
  const icon = element('img');
  icon.className = 'provider-icon';
  icon.src = providerIcons[provider];
  icon.alt = '';
  icon.width = 32;
  icon.height = 32;
  heading.append(icon, element('span', `${labels[provider]}${suffix}`));
  return heading;
}

function button(text, handler) {
  const node = element('button', text);
  node.addEventListener('click', async () => {
    node.disabled = true;
    message.textContent = '';
    try { await handler(); } catch (error) { message.textContent = `Handlingen kunne ikke afsluttes: ${error.message}`; }
    finally { node.disabled = false; }
  });
  return node;
}

async function render() {
  const status = await api('/api/status');
  csrf = status.csrf;
  for (const platform of status.platforms ?? []) labels[platform.provider] = platform.label;
  const local = document.querySelector('#local-onedrive');
  local.replaceChildren();
  const localCard = element('article');
  localCard.append(element('h2', 'OneDrive gennem din lokale sync-klient'));
  localCard.append(element('p', status.localOneDrive.configured
    ? `OneDrive-rod: ${status.localOneDrive.root}`
    : 'OneDrive-roden mangler i portalprocessen. Knapperne er derfor slået fra; feltet nedenfor kan ikke konfigurere roden.'));
  localCard.append(element('p', 'Kun lokale navne og elementtyper. Dette bekræfter ikke cloudidentitet, synkronisering eller Graph-adgang.'));
  const localRead = button('Vis rodens lokale elementer', async () => {
    const result = await api('/api/local-onedrive/root', { method: 'POST' });
    document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
  });
  localRead.disabled = !status.localOneDrive.configured;
  localCard.append(localRead);
  const folderLabel = element('label', 'Relativ undermappe i OneDrive');
  const folderInput = element('input');
  folderInput.type = 'text';
  folderInput.maxLength = 2048;
  folderInput.placeholder = 'Eksempel: Archive eller Dokumenter/ChatGPT';
  folderInput.disabled = !status.localOneDrive.configured;
  const folderHelp = element('p', status.localOneDrive.configured
    ? 'Skriv kun stien under OneDrive-roden, for eksempel Archive. Indsæt ikke C:\\Users\\... eller et drevbogstav.'
    : 'Portalen skal først modtage ONEDRIVE_LOCAL_ROOT eller Windows-variablen OneDriveConsumer. Derefter skriver du kun en relativ undermappe som Archive.');
  folderLabel.append(folderInput);
  const folderRead = button('Vis undermappe', async () => {
    const relativePath = folderInput.value.trim();
    if (!relativePath || /^[A-Za-z]:[\\/]/u.test(relativePath) || /^[/\\]/u.test(relativePath)) {
      throw new Error('Skriv kun en relativ undermappe som Archive — ikke en fuld Windows-sti.');
    }
    const parameters = new URLSearchParams({ relative_path: relativePath });
    const result = await api(`/api/local-onedrive/folder?${parameters}`, { method: 'POST' });
    document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
  });
  folderRead.disabled = !status.localOneDrive.configured;
  localCard.append(folderLabel, folderHelp, folderRead);
  local.append(localCard);
  const providers = document.querySelector('#providers');
  providers.replaceChildren();
  for (const provider of status.providers) {
    const card = element('article');
    const connected = status.connections.filter(connection => connection.provider === provider.provider && connection.state === 'connected');
    const verified = connected.filter(connection => connection.rootVerifiedAt);
    const readiness = connected.length ? `${connected.length} konto/konti har bekræftet identitet. ${verified.length} har bekræftet rodadgang.` : provider.configured ? 'Klient-ID indlæst. Ingen konti med bekræftet login i denne session.' : 'Appregistrering mangler.';
    card.append(providerHeading('h2', provider.provider), element('p', readiness), element('code', provider.callback));
    const capabilities = status.platforms?.find(platform => platform.provider === provider.provider);
    if (capabilities) {
      card.append(element('p', `Egen adapter: ${capabilities.runtimeOperations.join(', ')}. Cloudskrivning: ${capabilities.cloudWritesImplemented ? 'implementeret' : 'ikke implementeret'}.`));
      card.append(element('p', capabilities.hostBindingDeclared ? 'Eksisterende native appreference bevaret. Dens kontoforbindelse er ikke aflæst af denne lokale runtime.' : 'Selvstændig OneDrive/Graph-adapter. Ingen native ChatGPT-appbinding deklareret.'));
    }
    const registration = element('a', 'Åbn udbyderens appregistrering');
    registration.href = provider.registration.url;
    registration.target = '_blank';
    registration.rel = 'noopener noreferrer';
    card.append(element('p', provider.registration.applicationType), element('p', provider.registration.instructions), registration);
    const label = element('label', 'Offentligt klient-ID / App key');
    const clientInput = element('input');
    clientInput.type = 'text';
    clientInput.maxLength = 300;
    clientInput.value = provider.clientId;
    clientInput.disabled = provider.environmentManaged;
    clientInput.autocomplete = 'off';
    label.append(clientInput);
    const save = button('Gem klient-ID', async () => {
      await api(`/api/configuration/${provider.provider}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientInput.value.trim() }) });
      await render();
      message.textContent = 'Klient-ID gemt. Gennemfør nu udbyderens login. Ingen tokens eller secrets er gemt af denne opsætning.';
    });
    save.disabled = provider.environmentManaged;
    card.append(label, save, element('p', provider.environmentManaged ? 'Styres af miljøvariabler. Fjern dem før ændring her.' : provider.configurationPersistent ? 'Kun offentlige klient-ID’er gemmes lokalt uden for projektet.' : 'Denne kørsel gemmer klient-ID’et i hukommelsen.'));
    if (provider.provider === 'google') {
      card.append(element('p', provider.clientSecretLoadError
        ? 'Google-klienthemmeligheden kunne ikke åbnes fra Windows’ sikre lager.'
        : provider.clientSecretConfigured
          ? 'Google-klienthemmeligheden er beskyttet med Windows DPAPI og vises ikke her.'
          : 'Google-klienthemmeligheden mangler i Windows’ sikre lager.'));
    }
    const connect = button('Tilføj / log ind på en konto', async () => {
      const result = await api(`/api/connect/${provider.provider}`, { method: 'POST' });
      window.location.assign(result.authorizeUrl);
    });
    connect.disabled = !provider.configured || (provider.provider === 'google' && !provider.clientSecretConfigured);
    card.append(connect);
    providers.append(card);
  }
  const connections = document.querySelector('#connections');
  connections.replaceChildren();
  const credentialStore = status.credentialStore ?? {};
  const credentialMessage = credentialStore.loadError || credentialStore.saveError
    ? 'Sikker genindlæsning er ikke tilgængelig; forbindelserne virker kun i denne proces, indtil lagerfejlen er rettet.'
    : credentialStore.protection === 'windows-dpapi-current-user'
      ? 'Refresh-grants er krypteret til denne Windows-bruger. Adgangstokens gemmes ikke på disk.'
      : 'Forbindelserne gemmes ikke efter genstart på denne platform.';
  connections.append(element('p', credentialMessage));
  if (status.accounts) connections.append(element('p', `${status.accounts.length} forskellige konti med ${status.connections.length} separate forbindelser. Gentaget login til samme konto tælles ikke som en ny konto.`));
  if (!status.connections.length) connections.append(element('p', 'Ingen konti er forbundet i denne session.'));
  for (const connection of status.connections) {
    const card = element('article');
    card.append(providerHeading('h3', connection.provider, ` · ${connection.identity.label ?? connection.identity.subject}`));
    card.append(element('p', `Konto-ID: ${connection.identity.subject}`));
    const selected = status.activeConnections[connection.provider] === connection.id;
    card.append(element('p', selected ? 'Valgt konto for denne platform' : 'Forbundet konto — kan vælges uden nyt login'));
    card.append(element('p', connection.credentialPersistence === 'windows-dpapi-current-user'
      ? (connection.restoredFromSecureStore ? 'Gendannet sikkert; kontoen genvalideres før næste cloudlæsning.' : 'Refresh-grant beskyttet med Windows DPAPI.')
      : 'Login gælder kun, mens denne portalproces kører.'));
    const select = button('Brug denne konto', async () => {
      await api(`/api/connections/${connection.id}/select`, { method: 'POST' });
      document.querySelector('#result').textContent = '';
      await render();
    });
    select.disabled = selected || connection.state !== 'connected';
    card.append(select);
    card.append(element('p', connection.state === 'connected' ? (connection.rootVerifiedAt ? 'Identitet og rodindhold er bekræftet.' : 'Identitet bekræftet. Læseadgang er endnu ikke afprøvet.') : 'Login skal gentages.'));
    card.append(button('Afprøv læseadgang', async () => {
      const parameters = new URLSearchParams({ provider: connection.provider, operation: 'root' });
      const result = await api(`/api/connections/${connection.id}/execute?${parameters}`, { method: 'POST' });
      document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
      await render();
    }));
    if (connection.provider === 'onedrive') {
      const itemLabel = element('label', 'OneDrive element-ID fra denne konto');
      const itemInput = element('input');
      itemInput.type = 'text';
      itemInput.maxLength = 256;
      itemLabel.append(itemInput);
      card.append(itemLabel);
      for (const [operation, title] of [['folder', 'Vis mappe (højst 25 elementer)'], ['text', 'Læs UTF-8-tekst (højst 64 KiB)']]) {
        card.append(button(title, async () => {
          const parameters = new URLSearchParams({ provider: connection.provider, operation, item_id: itemInput.value.trim() });
          const result = await api(`/api/connections/${connection.id}/execute?${parameters}`, { method: 'POST' });
          document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
        }));
      }
    }
    card.append(button('Afbryd lokalt', async () => {
      const result = await api(`/api/connections/${connection.id}/disconnect`, { method: 'POST' });
      document.querySelector('#result').textContent = '';
      await render();
      message.textContent = result.message;
    }));
    connections.append(card);
  }
}

async function initialize() {
  const parameters = new URLSearchParams(window.location.hash.slice(1));
  const bootstrap = parameters.get('bootstrap');
  window.history.replaceState(null, '', '/');
  if (bootstrap) await api('/api/session', { method: 'POST', headers: { 'X-Bootstrap': bootstrap } });
  await render();
}

initialize().catch(error => {
  message.textContent = `Åbn engangslinket fra serverens terminal. Status: ${error.message}`;
});
