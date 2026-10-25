import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { createPortal, listenLoopback } from './server.mjs';
import { localOneDriveStatus, readLocalOneDriveRoot, readLocalOneDriveFolder } from './local-onedrive.mjs';

export const mcpServerIdentity = Object.freeze({ name: 'onedrive', version: '0.8.0-dev.11' });

const noArguments = z.strictObject({});
const connectionArguments = z.strictObject({ connection_id: z.string().min(1).max(128) });
const oneDriveItemArguments = z.strictObject({ connection_id: z.string().min(1).max(128), item_id: z.string().min(1).max(256) });
const oneDriveSearchArguments = z.strictObject({ connection_id: z.string().min(1).max(128), query: z.string().trim().min(1).max(128), top: z.number().int().min(1).max(25).optional() });
const accountOperationArguments = z.discriminatedUnion('operation', [
  z.strictObject({ provider: z.enum(['dropbox', 'google', 'onedrive']), connection_id: z.string().min(1).max(128), operation: z.literal('root') }),
  z.strictObject({ provider: z.literal('onedrive'), connection_id: z.string().min(1).max(128), operation: z.enum(['folder', 'item', 'text']), item_id: z.string().min(1).max(256) }),
  z.strictObject({ provider: z.literal('onedrive'), connection_id: z.string().min(1).max(128), operation: z.literal('search'), query: z.string().trim().min(1).max(128), top: z.number().int().min(1).max(25).optional() }),
]);

export const toolDefinitions = [
  { name: 'cloudstorage_execute', description: 'Execute an implemented read operation with an explicit platform and connection. Root for Dropbox, Google Drive and OneDrive; folder, exact item metadata, text and search for OneDrive. Rejects provider mismatch and unsupported operations. Does not route native connector tools or alter files.', inputSchema: accountOperationArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_list_onedrive_folder', description: 'List up to 25 items in an exact OneDrive folder ID using one explicit connection. Rejects remote shortcuts. Never reads local sync files.', inputSchema: oneDriveItemArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_get_onedrive_item', description: 'Read metadata for one exact file or folder in the selected personal OneDrive drive. Returns no content, sharing link or download capability URL and rejects remote shortcuts or cross-drive targets.', inputSchema: oneDriveItemArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_read_onedrive_text', description: 'Read an exact OneDrive UTF-8 text file up to 64 KiB using one explicit connection. Returns size, version and SHA256. Rejects unsupported MIME types, remote shortcuts and changing versions.', inputSchema: oneDriveItemArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_search_onedrive', description: 'Search up to 25 files and folders in one explicit personal OneDrive connection. Returns only items belonging to that same drive and filters remote shortcuts or cross-drive results. This is OneDrive search, not SharePoint KQL.', inputSchema: oneDriveSearchArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_status', description: 'Read provider registrations, identities and root-read status for this local session.', inputSchema: noArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_open_portal', description: 'Issue a private local portal link for this same session, usable once within five minutes. Replaces any unused link, not connected accounts. Open it in the system browser for provider login. Do not share or log the link.', inputSchema: noArguments, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: 'cloudstorage_read_local_onedrive_root', description: 'List up to 25 names in ONEDRIVE_LOCAL_ROOT. Reads no contents and follows no child links. Does not prove cloud identity or sync completion.', inputSchema: noArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_list_local_onedrive_folder', description: 'List up to 25 names in a relative subfolder of ONEDRIVE_LOCAL_ROOT. Rejects absolute paths, traversal and directory links. Reads no file contents. Does not prove cloud sync status.', inputSchema: z.strictObject({ relative_path: z.string().max(2048) }), annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_read_root', description: 'Read up to 25 root item names from one exact connected cloud account. Does not download contents or follow further pages.', inputSchema: connectionArguments, annotations: { readOnlyHint: true } },
  { name: 'cloudstorage_select_account', description: 'Select an already connected account for its provider in this local session. Does not log out other accounts or switch native connector accounts. Reads still require an explicit connection_id.', inputSchema: connectionArguments, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: 'cloudstorage_disconnect_local', description: 'Remove one local connection and in-memory credentials. If it was active, select another connected account for the same provider when available. Does not revoke provider consent or alter cloud files.', inputSchema: connectionArguments, annotations: { readOnlyHint: false, destructiveHint: true } },
];

export async function executeTool(portal, name, argumentsValue = {}) {
  const definition = toolDefinitions.find(tool => tool.name === name);
  if (!definition) throw new Error('Unknown tool');
  const args = definition.inputSchema.parse(argumentsValue);
  try {
    portal.broker.session(portal.owner);
    let result;
    if (name === 'cloudstorage_status') {
      const { csrf, ...status } = portal.broker.status(portal.owner);
      result = { ...status, ...(portal.listenerStatus ? { portal: portal.listenerStatus() } : {}), localOneDrive: localOneDriveStatus(portal.broker.env) };
    } else if (name === 'cloudstorage_open_portal') {
      await portal.ensureListening?.();
      result = { url: portal.portalUrl(), localOnly: true };
    } else if (name === 'cloudstorage_execute') {
      result = await portal.broker.executeAccountOperation(portal.owner, { provider: args.provider, connectionId: args.connection_id, operation: args.operation, itemId: args.item_id, query: args.query, top: args.top });
    } else if (name === 'cloudstorage_list_onedrive_folder' || name === 'cloudstorage_get_onedrive_item' || name === 'cloudstorage_read_onedrive_text') {
      const operation = name === 'cloudstorage_list_onedrive_folder' ? 'folder' : name === 'cloudstorage_get_onedrive_item' ? 'item' : 'text';
      result = await portal.broker.executeAccountOperation(portal.owner, { provider: 'onedrive', connectionId: args.connection_id, itemId: args.item_id, operation });
    } else if (name === 'cloudstorage_read_root') {
      result = await portal.broker.root(portal.owner, args.connection_id);
    } else if (name === 'cloudstorage_search_onedrive') {
      result = await portal.broker.searchOneDrive(portal.owner, args.connection_id, args.query, args.top);
    } else if (name === 'cloudstorage_select_account') {
      result = portal.broker.selectConnection(portal.owner, args.connection_id);
    } else if (name === 'cloudstorage_read_local_onedrive_root') {
      result = await readLocalOneDriveRoot(portal.broker.env);
    } else if (name === 'cloudstorage_list_local_onedrive_folder') {
      result = await readLocalOneDriveFolder(args.relative_path, portal.broker.env);
    } else {
      result = portal.broker.disconnect(portal.owner, args.connection_id);
    }
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
  } catch (error) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: error.code ?? 'operation_failed' }) }], isError: true };
  }
}

export function createMcpServer(portal) {
  const server = new McpServer(
    mcpServerIdentity,
    { capabilities: { resources: {} } },
  );
  for (const { name, ...definition } of toolDefinitions) {
    server.registerTool(name, definition, args => executeTool(portal, name, args));
  }
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORTAL_PORT ?? 53682);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORTAL_PORT');
  const portal = createPortal({ port });
  let pendingListener;
  let listenerError = null;
  portal.listenerStatus = () => ({ listening: portal.server.listening, error: listenerError, origin: portal.origin });
  portal.ensureListening = async () => {
    if (portal.server.listening) return;
    if (!pendingListener) {
      pendingListener = listenLoopback(portal.server, port).then(() => { listenerError = null; }).catch(error => {
        listenerError = error.code === 'EADDRINUSE' ? 'portal_port_in_use' : 'portal_listener_failed';
        const failure = new Error(listenerError);
        failure.code = listenerError;
        throw failure;
      }).finally(() => { pendingListener = null; });
    }
    await pendingListener;
  };
  let transportHandle;
  const close = async () => {
    portal.server.close();
    await transportHandle?.close();
  };
  transportHandle = serveStdio(() => createMcpServer(portal), {
    transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 65536 }),
    onerror: () => console.error('MCP transport error.'),
  });
  process.stdin.once('end', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
  process.once('SIGINT', () => { void close(); });
  console.error('CloudStorage MCP SDK ready. Loopback login starts only on cloudstorage_open_portal.');
}
