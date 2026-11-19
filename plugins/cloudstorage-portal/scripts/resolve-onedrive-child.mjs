import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedKinds = new Set(['file', 'folder']);
const accountFields = ['subject', 'driveId', 'driveType'];
const isText = value => typeof value === 'string' && value.length > 0;

export function resolveOneDriveChild({ account, parentId, name, kind, pages } = {}) {
  if (!accountFields.every(field => isText(account?.[field])) || !isText(parentId) ||
      !isText(name) || /[\\/\u0000]/.test(name) || !expectedKinds.has(kind)) {
    return { status: 'INVALID_INPUT', reason: 'Provide the verified account, parent, exact child name, and expected kind.' };
  }

  if (!Array.isArray(pages) || !pages.length) {
    return { status: 'INCOMPLETE', reason: 'The direct parent listing has no completed pages.' };
  }

  const candidates = new Set();
  for (const [index, page] of pages.entries()) {
    if (page?.parentId !== parentId || !accountFields.every(field => page.account?.[field] === account[field]) ||
        !Array.isArray(page.items)) {
      return { status: 'INCOMPLETE', reason: 'A page does not match the verified account and direct parent.' };
    }

    if (page.more !== (index < pages.length - 1)) {
      return { status: 'INCOMPLETE', reason: 'The continued list has no verified terminal page or contains extra pages.' };
    }

    for (const item of page.items) {
      if (item?.parentId !== parentId || !isText(item.id) || !isText(item.name) || !isText(item.kind)) {
        return { status: 'INCOMPLETE', reason: 'A listed item has missing identity or a different parent.' };
      }
      if (item.name === name && item.kind === kind) candidates.add(item.id);
    }
  }

  if (candidates.size === 0) return { status: 'NOT_FOUND' };
  if (candidates.size > 1) return { status: 'AMBIGUOUS', distinctMatches: candidates.size };
  const [itemId] = candidates;
  return { status: 'MATCHED', itemId, parentId, name, kind };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let report;
  try { report = resolveOneDriveChild(JSON.parse(readFileSync(0, 'utf8'))); }
  catch { report = { status: 'INVALID_INPUT', reason: 'Provide a JSON object on stdin.' }; }
  process.stdout.write(JSON.stringify(report) + '\n');
  process.exitCode = report.status === 'MATCHED' ? 0 : 1;
}
