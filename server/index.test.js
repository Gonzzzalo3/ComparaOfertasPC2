import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
const { default: app } = await import('./index.js');

test('API de salud informa estado y modo de datos sin revelar credenciales', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/api/health`);
  const body = await health.json();
  assert.equal(health.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.dataMode, 'demo');
  assert.equal(body.timeZone, 'America/Lima');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('x-frame-options'), 'DENY');

  const response = await fetch(`${base}/api/offers?q=leche&category=Lácteos`);
  const offers = await response.json();
  assert.equal(response.status, 200);
  assert.equal(offers.count, 3);
  assert.ok(offers.items.every((offer) => offer.product_name.includes('Leche')));
  assert.equal(JSON.stringify(body).includes('ANON_KEY'), false);
});
