import test from 'node:test';
import assert from 'node:assert/strict';
import demoOffers from './demo-offers.json' with { type: 'json' };
import { createOfferRepository, filterOffers, getLocalDate, unitPrice } from './offers.js';

test('calcula precio unitario normalizando gramos a kilogramos', () => {
  assert.equal(unitPrice({ price: 4.2, unit: 'g', unit_quantity: 400 }), 10.5);
});

test('compara presentaciones del mismo producto usando unidad normalizada', () => {
  const milk = demoOffers.filter((offer) => offer.product_name.startsWith('Leche'));
  assert.equal(milk.sort((a, b) => unitPrice(a) - unitPrice(b))[0].id, 'demo-02');
});

test('aplica búsqueda, categoría, cadena y vigencia sin devolver ofertas vencidas', () => {
  const result = filterOffers(demoOffers, { search: '  arroz ', category: 'Abarrotes', chain: 'MaxiAhorro', date: '2026-11-20' });
  assert.deepEqual(result.map((offer) => offer.id), ['demo-09']);
  const expired = filterOffers(demoOffers, { date: '2026-12-01', category: 'Lácteos' });
  assert.equal(expired.length, 0);
});

test('el modo local funciona sin variables de configuración y reporta el huso horario', async () => {
  const repository = createOfferRepository({});
  assert.equal(repository.mode, 'demo');
  assert.equal((await repository.listOffers()).length, 14);
  assert.match(getLocalDate(new Date('2026-11-20T03:00:00Z')), /^2026-11-19$/);
});

test('rechaza cantidades nulas o inválidas para el precio unitario', () => {
  assert.equal(unitPrice({ price: 4, unit: 'g', unit_quantity: 0 }), Infinity);
  assert.equal(unitPrice({ price: 'n/a', unit: 'ml', unit_quantity: 1000 }), Infinity);
});
