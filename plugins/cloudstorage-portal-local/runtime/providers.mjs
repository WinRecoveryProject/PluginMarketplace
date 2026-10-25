import { platformNames, platformOAuth, platformDefinitions } from './platforms.mjs';

export const providerNames = platformNames;

export const clientEnvironmentKeys = Object.freeze(Object.fromEntries(platformNames.map(provider => [provider, platformDefinitions[provider].clientEnvironmentKey])));

export const registrationGuidance = {
  dropbox: { url: 'https://www.dropbox.com/developers/apps/create', applicationType: 'Scoped Dropbox app', instructions: 'Opret din egen app. Registrer callback-adressen nedenfor og vælg account_info.read samt files.metadata.read. App folder begrænser adgangen til appens mappe.' },
  google: { url: 'https://console.cloud.google.com/auth/clients', applicationType: 'Desktop app', instructions: 'Opret eget projekt, aktiver Drive API, opsæt samtykke/testbrugere og opret en Desktop OAuth-klient. Denne klient bruger loopback-callback. Der anmodes om drive.readonly; gennemgå samtykket.' },
  onedrive: { url: 'https://entra.microsoft.com/', applicationType: 'Mobile and desktop application', instructions: 'Opret egen appregistrering med de kontotyper, du vil bruge, inklusive personlige konti hvis nødvendigt. Tilføj native loopback-callback og delegated User.Read samt Files.Read. HTTP med 127.0.0.1 kan kræve manifestredigering.' },
};

export function providerConfig(provider, env = process.env) {
  return platformOAuth(provider, env);
}

export async function readIdentity(provider, request) {
  if (!providerNames.includes(provider)) throw new Error('Unknown provider');
  if (provider === 'dropbox') {
    const profile = await request('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST' });
    return { subject: profile.account_id, label: profile.name?.display_name, email: profile.email };
  }
  if (provider === 'google') {
    const profile = await request('https://www.googleapis.com/drive/v3/about?fields=user(permissionId,displayName,emailAddress)');
    return { subject: profile.user?.permissionId, subjectKind: 'drive-permission-id', label: profile.user?.displayName, email: profile.user?.emailAddress };
  }
  const profile = await request('https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName');
  const drive = await request('https://graph.microsoft.com/v1.0/me/drive?$select=id,driveType');
  if (!drive.id) throw new Error('Missing drive identity');
  return { subject: profile.id, label: profile.displayName, email: profile.userPrincipalName, driveId: drive.id, driveType: drive.driveType };
}

export async function readRoot(provider, request) {
  if (!providerNames.includes(provider)) throw new Error('Unknown provider');
  if (provider === 'dropbox') {
    const result = await request('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '', recursive: false, limit: 25 }),
    });
    return { items: (result.entries ?? []).map(item => ({ id: item.id, name: item.name, kind: item['.tag'] })), more: Boolean(result.has_more) };
  }
  if (provider === 'google') {
    const query = new URLSearchParams({ q: "'root' in parents and trashed = false", pageSize: '25', fields: 'files(id,name,mimeType),nextPageToken' });
    const result = await request(`https://www.googleapis.com/drive/v3/files?${query}`);
    return { items: (result.files ?? []).map(item => ({ id: item.id, name: item.name, kind: item.mimeType })), more: Boolean(result.nextPageToken) };
  }
  const result = await request('https://graph.microsoft.com/v1.0/me/drive/root/children?$top=25&$select=id,name,file,folder');
  return { items: (result.value ?? []).map(item => ({ id: item.id, name: item.name, kind: item.folder ? 'folder' : 'file' })), more: Boolean(result['@odata.nextLink']) };
}
