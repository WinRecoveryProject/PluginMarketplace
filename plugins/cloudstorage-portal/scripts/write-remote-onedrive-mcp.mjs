import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedHostSuffixes = ['.vercel.app'];
const clientIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Use --url <https-url> --api-client-id <id> --host-client-id <id> --output <path>');
    options[key.slice(2)] = value;
  }
  if (Object.keys(options).some(key => !['url', 'api-client-id', 'host-client-id', 'output'].includes(key))) throw new Error('Unknown option');
  if (!options.url || !options['api-client-id'] || !options['host-client-id'] || !options.output) {
    throw new Error('Use --url <https-url> --api-client-id <id> --host-client-id <id> --output <path>');
  }
  return options;
}

function verifiedClientIds(apiClientId, hostClientId) {
  if (!clientIdPattern.test(apiClientId)) throw new Error('API client ID must be a valid application ID');
  if (!clientIdPattern.test(hostClientId)) throw new Error('Host client ID must be a valid application ID');
  if (apiClientId.toLowerCase() === hostClientId.toLowerCase()) throw new Error('API and host client registrations must be separate');
  return { apiClientId, hostClientId };
}

function verifiedMcpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/mcp') {
    throw new Error('OneDrive MCP URL must be an exact HTTPS /mcp endpoint');
  }
  if (!expectedHostSuffixes.some(suffix => url.hostname.endsWith(suffix))) throw new Error('OneDrive MCP host is not an approved deployment domain');
  return url.href;
}

export function remoteMcpManifest(url, apiClientId, hostClientId) {
  const verified = verifiedClientIds(apiClientId, hostClientId);
  return {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: {
      onedrive: {
        type: 'streamable-http',
        url: verifiedMcpUrl(url),
        extensions: {
          'com.openai': {
            auth: {
              type: 'oauth',
              client: {
                mode: 'provided',
                clientId: verified.hostClientId,
                tokenEndpointAuthMethod: 'none',
              },
              baseScopes: [`api://${verified.apiClientId}/access_as_user`, 'offline_access'],
              defaultScopes: [`api://${verified.apiClientId}/access_as_user`, 'offline_access'],
            },
          },
        },
      },
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parseArguments(process.argv.slice(2));
  const outputPath = resolve(options.output);
  const manifest = remoteMcpManifest(options.url, options['api-client-id'], options['host-client-id']);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  const written = JSON.parse(await readFile(outputPath, 'utf8'));
  if (written.mcpServers.onedrive.url !== manifest.mcpServers.onedrive.url) throw new Error('Manifest verification failed');
  process.stdout.write(`${outputPath}\n`);
}
