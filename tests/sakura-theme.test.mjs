import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, SAKURA_PALETTE, getNextTheme } from '../src/ui/theme.js';

test('sakura-theme: valida temas y paleta de colores oficial', () => {
  assert.equal(THEMES.LIGHT, 'light');
  assert.equal(THEMES.DARK, 'dark');
  assert.equal(THEMES.SAKURA, 'sakura');

  assert.equal(SAKURA_PALETTE.softBlush, '#FFE5EC');
  assert.equal(SAKURA_PALETTE.pastelPink, '#FFC2D1');
  assert.equal(SAKURA_PALETTE.cherryBlossom, '#FFB3C6');
  assert.equal(SAKURA_PALETTE.cottonCandy, '#FF8FAB');
  assert.equal(SAKURA_PALETTE.petalRouge, '#FB6F92');
});

test('sakura-theme: ciclo de alternancia de temas', () => {
  assert.equal(getNextTheme('dark'), 'sakura');
  assert.equal(getNextTheme('sakura'), 'light');
  assert.equal(getNextTheme('light'), 'dark');
});
