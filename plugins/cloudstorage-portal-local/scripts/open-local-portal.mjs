import { spawn } from 'node:child_process';
import { createPortal, listenLoopback } from '../runtime/server.mjs';

const port = Number(process.env.PORTAL_PORT ?? 53683);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PORTAL_PORT must be between 1024 and 65535');
}

const portal = createPortal({ port });
await listenLoopback(portal.server, port, { attempts: 1 });

const powershell = `${process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
const browser = spawn(powershell, [
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  'Start-Process -FilePath $env:CLOUDSTORAGE_PORTAL_URL',
], {
  windowsHide: true,
  stdio: 'ignore',
  env: { ...process.env, CLOUDSTORAGE_PORTAL_URL: portal.launchUrl },
});
browser.unref();

const close = () => portal.server.close(() => process.exit(0));
process.once('SIGTERM', close);
process.once('SIGINT', close);

console.log(JSON.stringify({ ready: true, origin: portal.origin, cloudWrites: false }));
