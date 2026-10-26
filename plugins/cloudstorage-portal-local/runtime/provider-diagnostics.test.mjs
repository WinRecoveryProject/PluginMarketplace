import test from 'node:test';
import assert from 'node:assert/strict';
import { Broker } from './broker.mjs';

test('provider failures retain only bounded safe diagnostic codes', async () => {
  const broker = new Broker({ fetchImpl: async () => Response.json({
    error: 'invalid_client', error_codes: [7000218, 'unsafe', -1, 1.5],
    error_description: 'PRIVATE_TOKEN_AND_CALLBACK', access_token: 'PRIVATE_ACCESS',
    nested: { client_secret: 'PRIVATE_SECRET' },
  }, { status: 400 }) });
  await assert.rejects(broker.json('https://login.microsoftonline.com/common/oauth2/v2.0/token'), error => {
    assert.equal(error.code, 'provider_request_failed');
    assert.deepEqual(error.diagnostic, { httpStatus: 400, operation: 'microsoft-token', providerCode: 'invalid_client', microsoftErrorCodes: [7000218] });
    assert.ok(!JSON.stringify(error).includes('PRIVATE'));
    return true;
  });
});

test('Graph drive failure identifies the step without exposing provider messages or query values', async () => {
  const broker = new Broker({ fetchImpl: async () => Response.json({ error: { code: 'BadRequest', message: 'PRIVATE_MESSAGE' } }, { status: 400 }) });
  await assert.rejects(broker.json('https://graph.microsoft.com/v1.0/me/drive?private=PRIVATE_QUERY'), error => {
    assert.deepEqual(error.diagnostic, { httpStatus: 400, operation: 'onedrive-drive', providerCode: 'BadRequest' });
    assert.ok(!JSON.stringify(error).includes('PRIVATE'));
    return true;
  });
});

test('unknown upstream error text is excluded and existing error categories remain stable', async () => {
  for (const [status, payload, expected] of [
    [400, { error: 'PRIVATE_SECRET' }, 'provider_request_failed'],
    [401, { error: { code: 'InvalidAuthenticationToken', message: 'PRIVATE_TOKEN' } }, 'reauthentication_required'],
    [400, { error: 'invalid_grant', error_description: 'PRIVATE_CODE' }, 'reauthentication_required'],
    [403, {}, 'provider_permission_denied'], [429, {}, 'provider_rate_limited'],
  ]) {
    const broker = new Broker({ fetchImpl: async () => Response.json(payload, { status }) });
    await assert.rejects(broker.json('https://example.invalid'), error => {
      assert.equal(error.code, expected);
      assert.equal(error.diagnostic.httpStatus, status);
      assert.ok(!JSON.stringify(error).includes('PRIVATE'));
      return true;
    });
  }
});
