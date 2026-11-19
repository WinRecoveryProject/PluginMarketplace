import { importLibrary } from './runtime-cache.mjs';
import { verifySqlAssets } from './sql-process.mjs';

const diagnostics = [];
function position(text, cursor = 0) {
  const prefix = Array.from(text).slice(0, Math.max(0, cursor)).join('');
  const lines = prefix.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}
function add(rule, message, location = { line: 1, column: 1 }, incomplete = false) {
  if (diagnostics.length >= 63) throw new Error('SQL diagnostic limit exceeded');
  diagnostics.push({ rule, message: message.slice(0, 4096), ...location, ...(incomplete ? { incomplete: true } : {}) });
}
function hasDynamicSql(node) {
  if (!node || typeof node !== 'object') return false;
  return Object.entries(node).some(([key, value]) =>
    key === 'PLpgSQL_stmt_dynexecute' || key === 'PLpgSQL_stmt_dynfors' ||
    (key === 'dynquery' && value != null) || hasDynamicSql(value));
}
try {
  const chunks = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 16 * 1024 * 1024) throw new Error('SQL input protocol limit exceeded');
    chunks.push(chunk);
  }
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!request || typeof request.content !== 'string' || Buffer.byteLength(request.content) > 2 * 1024 * 1024) throw new Error('Invalid SQL source snapshot');
  const text = request.content.replace(/^\uFEFF/, '');
  if (text.includes('\0')) add('SQL-postgresql-syntax', 'PostgreSQL source cannot contain a NUL character', position(text, Array.from(text.slice(0, text.indexOf('\0'))).length));
  else {
    globalThis.fetch = () => { throw new Error('Network is forbidden in SQL parsing'); };
    const { wasm } = verifySqlAssets();
    const { default: pg } = await importLibrary('libpg-query');
    await pg.loadModule({ wasm });
    let tree;
    try { tree = await pg.parse(text); }
    catch (error) {
      if (!pg.hasSqlDetails(error)) throw error;
      add('SQL-postgresql-syntax', `PostgreSQL 18 grammar: ${error.message}`, position(text, error.sqlDetails.cursorPosition));
    }
    if (tree) {
      if (tree.version !== 180004 || !Array.isArray(tree.stmts)) throw new Error('Unexpected PostgreSQL grammar version/report');
      const plpgsql = [];
      for (const statement of tree.stmts) {
        const routine = statement.stmt?.CreateFunctionStmt;
        const block = statement.stmt?.DoStmt;
        if (!routine && !block) continue;
        const options = routine?.options || block.args;
        const defs = options.map(item => item.DefElem);
        const language = defs.find(item => item.defname === 'language')?.arg?.String?.sval?.toLowerCase() || (block ? 'plpgsql' : undefined);
        // stmt_location is a UTF-8 byte offset, not a JavaScript string offset.
        const prefix = Buffer.from(text).subarray(0, statement.stmt_location || 0).toString('utf8');
        const location = position(prefix, Array.from(prefix).length);
        if (language === 'plpgsql') {
          const start = statement.stmt_location || 0;
          const fragment = Buffer.from(text).subarray(start, statement.stmt_len ? start + statement.stmt_len : undefined).toString('utf8');
          plpgsql.push({ fragment, location, charBase: Array.from(prefix).length });
        }
        else if (language === 'sql') {
          const bodies = defs.find(item => item.defname === 'as')?.arg?.List?.items || [];
          for (const body of bodies) {
            if (typeof body.String?.sval !== 'string') throw new Error('Unknown SQL routine body shape');
            try {
              const nested = await pg.parse(body.String.sval);
              if (nested.stmts.some(item => item.stmt?.CreateFunctionStmt || item.stmt?.DoStmt)) add('SQL-language', 'Nested routine bodies inside a SQL-language string require separate coverage', location, true);
            }
            catch (error) {
              if (!pg.hasSqlDetails(error)) throw error;
              const inner = position(body.String.sval, error.sqlDetails.cursorPosition);
              add('SQL-routine-syntax', `SQL-language body (${inner.line}:${inner.column}; outer statement anchor): ${error.message}`, location);
            }
          }
          if (!bodies.length && !routine?.sql_body) add('SQL-language', 'SQL routine body could not be checked', location, true);
        } else add('SQL-language', `Routine language ${language || 'unknown'} is outside PostgreSQL SQL/PLpgSQL syntax coverage`, location, true);
      }
      for (const { fragment, location, charBase } of plpgsql) {
        try {
          const parsed = await pg.parsePlPgSQL(fragment);
          if (!Array.isArray(parsed.plpgsql_funcs) || parsed.plpgsql_funcs.length !== 1) throw new Error('PL/pgSQL parser did not check the declared routine/block');
          if (hasDynamicSql(parsed)) add('SQL-dynamic', 'PL/pgSQL generates dynamic SQL; the generated query text cannot be certified by syntax-only parsing', location, true);
        } catch (error) {
          // The pinned PLpgSQL API exposes known syntax-error text as plain Error,
          // unlike parse()'s SqlError. Unknown errors/traps remain unavailable.
          const structured = pg.hasSqlDetails(error);
          if (!structured && !/^(?:syntax error(?:\s|$)|missing expression at or near(?:\s|$))/.test(error.message)) throw error;
          add('SQL-plpgsql-syntax', `PL/pgSQL grammar${structured ? '' : ' (outer statement anchor; parser supplies no cursor)'}: ${error.message}`, structured ? position(text, charBase + error.sqlDetails.cursorPosition) : location);
        }
      }
    }
  }
} catch (error) {
  add('SQL-parser', `Parser unavailable: ${String(error.message).slice(0, 1024)}`, undefined, true);
}
process.stdout.write(JSON.stringify({ diagnostics }) + '\n');
