import test from 'node:test';
import assert from 'node:assert/strict';
import { getDonationThemeStyles } from '../src/ui/donationButton.js';

test('donation-button: adapta estilos a cada uno de los 3 temas (light, dark, sakura)', () => {
  const light = getDonationThemeStyles('light');
  assert.equal(light.theme, 'light');
  assert.ok(light.container.includes('text-amber-800'), 'Light debe tener texto ambar oscuro legible');
  assert.equal(light.icon, '☕');

  const dark = getDonationThemeStyles('dark');
  assert.equal(dark.theme, 'dark');
  assert.ok(dark.container.includes('text-amber-300'), 'Dark debe tener texto ambar brillante');
  assert.ok(dark.pill.includes('text-slate-950'), 'Dark pill debe tener texto oscuro sobre pill brillante');

  const sakura = getDonationThemeStyles('sakura');
  assert.equal(sakura.theme, 'sakura');
  assert.ok(sakura.container.includes('#FB6F92'), 'Sakura debe usar la paleta Petal Rouge (#FB6F92)');
  assert.ok(sakura.container.includes('#FFB3C6'), 'Sakura debe usar Cherry Blossom (#FFB3C6)');
});
