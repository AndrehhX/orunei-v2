import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const hero = fs.readFileSync(new URL('../src/components/Hero.jsx', import.meta.url), 'utf8')
const rows = fs.readFileSync(new URL('../src/components/Rows.jsx', import.meta.url), 'utf8')
const appPanel = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const rightPanel = fs.readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8')

test('routes hero details into the real anime detail flow', () => {
  assert.match(app, /openAnime/)
  assert.match(app, /<Hero onOpenDetail=\{openAnime\}/)
  assert.match(hero, /onOpenDetail\?\.\(s\)/)
})

test('gives home library actions a real library destination', () => {
  assert.match(app, /<Library query=\{query\} onMore=\{\(\) => navigatePage\('library'\)\}/)
  assert.match(rows, /export function Library\(\{ query, onMore, onOpenAnime \}\)/)
  assert.match(rows, /onClick=\{onMore\}/)
})

test('routes dashboard trends into the catalog', () => {
  assert.match(appPanel, /<RightPanel[\s\S]*onOpenAnime=\{openAnime\}/)
  assert.match(rightPanel, /function RightPanel\(\{[\s\S]*onOpenAnime[\s\S]*\}\)/)
  assert.match(rightPanel, /onClick=\{\(\) => onOpenAnime\?\.\(t\)\}/)
})

test('makes home library and recommendation cards open anime detail', () => {
  assert.match(app, /<Library query=\{query\}[\s\S]*onOpenAnime=\{openAnime\}/)
  assert.match(app, /<Because query=\{query\} onOpenAnime=\{openAnime\}/)
  assert.match(rows, /export function Library\(\{ query, onMore, onOpenAnime \}\)/)
  assert.match(rows, /onClick=\{\(\) => onOpenAnime\?\.\(a\)\}/)
  assert.match(rows, /function RecCard\(\{ i, rec, onOpenAnime \}\)/)
  assert.match(rows, /onClick=\{\(\) => onOpenAnime\?\.\(i\)\}/)
})

test('operates player embeds without sandbox attribute to prevent anti-adblock rejections like zilla while shielding referrers', () => {
  const animePlayer = fs.readFileSync(new URL('../src/components/AnimePlayer.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(animePlayer, /sandbox=/)
  assert.match(animePlayer, /referrerPolicy="no-referrer"/)
  assert.match(animePlayer, /allow="[^"]*fullscreen/)
})

