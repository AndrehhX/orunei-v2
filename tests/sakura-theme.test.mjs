import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('sakura-theme extra-premium: valida fondo animado único, pétalos anatómicos y slides de hero', () => {
  const ambient = fs.readFileSync(new URL('../src/components/SakuraAmbientBackground.jsx', import.meta.url), 'utf8');
  const petals = fs.readFileSync(new URL('../src/components/SakuraPetals.jsx', import.meta.url), 'utf8');
  const hero = fs.readFileSync(new URL('../src/components/Hero.jsx', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  // Fondo ambiental con auroras y motas de luz
  assert.match(ambient, /sakura-aurora-orb/)
  assert.match(ambient, /sakura-light-mote/)
  assert.match(ambient, /mix-blend-overlay/)

  // Pétalos anatómicos avanzados con 4 geometrías y 3 capas
  assert.match(petals, /notched/)
  assert.match(petals, /twisted/)
  assert.match(petals, /cupped/)
  assert.match(petals, /blossom/)
  assert.match(petals, /sakuraPetalGradPremium/)
  assert.match(petals, /prefers-reduced-motion/)

  // Slides únicos y personalizados en Hero
  assert.match(hero, /isSakura/)
  assert.match(hero, /🌸/)
  assert.match(hero, /from-\[\#fb6f92\] via-\[\#ff758f\] to-\[\#e11d48\]/)

  // Integración en App shell
  assert.match(app, /SakuraAmbientBackground/)
  assert.match(app, /SakuraPetals/)
});

