const definitions = {
  dropbox: {
    label: 'Dropbox', clientEnvironmentKey: 'DROPBOX_CLIENT_ID',
    nativeAppId: 'asdk_app_69b31dc2110c8191b8b47dc98fe5a052',
    identityFields: ['subject'],
    operations: ['identity', 'root'],
    nativeWorkflowSkills: ['find-dropbox-content', 'inspect-dropbox-file', 'organize-dropbox-folder', 'share-dropbox-content', 'collect-files-with-request', 'clean-up-dropbox-content'],
    oauth: {
      authorize: 'https://www.dropbox.com/oauth2/authorize', token: 'https://api.dropboxapi.com/oauth2/token',
      scopes: ['account_info.read', 'files.metadata.read'], extra: { token_access_type: 'offline' },
    },
  },
  google: {
    label: 'Google Drive', clientEnvironmentKey: 'GOOGLE_CLIENT_ID',
    nativeAppId: 'connector_5f3c8c41a1e54ad7a76272c89e2554fa',
    identityFields: ['subject'],
    operations: ['identity', 'root'],
    nativeWorkflowSkills: ['google-drive', 'google-docs', 'google-sheets', 'google-slides', 'google-drive-comments'],
    oauth: {
      authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'], extra: { access_type: 'offline', prompt: 'consent select_account' },
    },
  },
  onedrive: {
    label: 'OneDrive', clientEnvironmentKey: 'MICROSOFT_CLIENT_ID',
    nativeAppId: null,
    identityFields: ['subject', 'driveId', 'driveType'],
    operations: ['identity', 'root', 'folder', 'item', 'text', 'search'],
    nativeWorkflowSkills: [],
    oauth: {
      authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['https://graph.microsoft.com/User.Read', 'https://graph.microsoft.com/Files.Read', 'offline_access'], extra: { prompt: 'select_account' },
    },
  },
};

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const platformDefinitions = freeze(definitions);
export const platformNames = Object.freeze(Object.keys(platformDefinitions));

export function platformDefinition(provider) {
  if (!Object.hasOwn(platformDefinitions, provider)) throw new Error('Unknown provider');
  return platformDefinitions[provider];
}

export function platformOAuth(provider, env = process.env) {
  const definition = platformDefinition(provider);
  return {
    ...definition.oauth, scopes: [...definition.oauth.scopes], extra: { ...definition.oauth.extra },
    label: definition.label, clientId: env[definition.clientEnvironmentKey],
    ...(provider === 'google' ? { clientSecret: env.GOOGLE_CLIENT_SECRET } : {}),
  };
}

export function validatePlatformIdentity(provider, identity) {
  const definition = platformDefinition(provider);
  if (!identity || definition.identityFields.some(field => typeof identity[field] !== 'string' || !identity[field])) throw new Error('Incomplete provider identity');
}

export function platformCapabilities(provider) {
  const definition = platformDefinition(provider);
  return {
    provider, label: definition.label, runtimeOperations: [...definition.operations],
    nativeAppReference: definition.nativeAppId,
    nativeConnectionState: 'not-observed-by-local-runtime',
    nativeWorkflowSkills: [...definition.nativeWorkflowSkills],
    hostBindingDeclared: Boolean(definition.nativeAppId),
    cloudWritesImplemented: false,
  };
}
