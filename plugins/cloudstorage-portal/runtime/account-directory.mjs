import { createHash } from 'node:crypto';
import { platformDefinition, validatePlatformIdentity } from './platforms.mjs';

export function accountDirectory(connections, activeConnections) {
  const accounts = new Map();
  for (const connection of connections) {
    validatePlatformIdentity(connection.provider, connection.identity);
    const { subject, subjectKind, tenantId, driveId, driveType, label, email } = connection.identity;
    const identityKey = JSON.stringify([connection.provider, subject, subjectKind ?? null, tenantId ?? null, driveId ?? null]);
    const accountId = createHash('sha256').update(identityKey).digest('hex');
    if (!accounts.has(accountId)) accounts.set(accountId, {
      accountId, provider: connection.provider, platform: platformDefinition(connection.provider).label,
      transport: 'own-oauth', identity: { subject, subjectKind, tenantId, driveId, driveType, label, email }, connections: [],
    });
    accounts.get(accountId).connections.push({
      connectionId: connection.id, state: connection.state,
      selected: activeConnections[connection.provider] === connection.id,
      identityVerifiedAt: connection.identityVerifiedAt,
      rootVerifiedAt: connection.rootVerifiedAt,
    });
  }
  return [...accounts.values()];
}
