import test from 'node:test';
import assert from 'node:assert/strict';
import { KOFI_DONATION_URL, KOFI_TIERS } from '../src/config/donation.js';

test('donation-config: valida configuración y tiers para Ko-fi', () => {
  assert.ok(typeof KOFI_DONATION_URL === 'string' && KOFI_DONATION_URL.length > 0, 'KOFI_DONATION_URL debe ser un string válido');
  assert.ok(Array.isArray(KOFI_TIERS), 'KOFI_TIERS debe ser un array');
  assert.ok(KOFI_TIERS.length >= 3, 'Debe haber al menos 3 niveles de donación definidos');

  KOFI_TIERS.forEach((tier) => {
    assert.ok(tier.id, 'Cada tier debe tener un id');
    assert.ok(tier.label, 'Cada tier debe tener un label');
    assert.ok(tier.amount, 'Cada tier debe tener un monto legible');
  });
});
