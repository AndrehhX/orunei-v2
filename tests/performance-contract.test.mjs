import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const api = fs.readFileSync(new URL('../src/api/anime.js', import.meta.url), 'utf8')
const catalog = fs.readFileSync(new URL('../src/components/AnimePage.jsx', import.meta.url), 'utf8')
const newsPage = fs.readFileSync(new URL('../src/components/NewsPage.jsx', import.meta.url), 'utf8')
const rows = fs.readFileSync(new URL('../src/components/Rows.jsx', import.meta.url), 'utf8')
const poster = fs.readFileSync(new URL('../src/components/Poster.jsx', import.meta.url), 'utf8')
const news = fs.readFileSync(new URL('../src/news.jsx', import.meta.url), 'utf8')
const login = fs.readFileSync(new URL('../src/components/Login.jsx', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('uses cancellable catalog requests and async image decoding', () => {
  assert.match(api, /export async function searchAnime\(f, page = 1, signal\)/)
  assert.match(api, /signal/)
  assert.match(catalog, /decoding="async"/)
  assert.doesNotMatch(catalog, /import Reveal/)
  assert.match(poster, /decoding="async"/)
})

test('keeps news and recommendation rows free of observer-per-card reveals', () => {
  assert.doesNotMatch(newsPage, /import Reveal/)
  assert.doesNotMatch(rows, /import Reveal/)
  assert.match(news, /requestId|loadVersion|activeRequest/)
})

test('keeps login pointer motion outside the React render loop', () => {
  assert.match(login, /requestAnimationFrame/)
  assert.doesNotMatch(login, /const \[pointer, setPointer\] = useState/)
  assert.doesNotMatch(login, /onPointerChange/)
})

test('defers authenticated pages until their route is needed', () => {
  for (const component of ['AnimePage', 'LibraryPage', 'NewsPage', 'ProfilePage', 'ProfileEditor', 'FriendsPage', 'PublicProfileRoute']) {
    assert.match(app, new RegExp(`const ${component} = lazy\\(\\(\\) => import\\('./components/${component}'\\)`))
  }
  assert.match(app, /<Suspense fallback=/)
})

test('guarantees 120Hz smooth rendering via content-visibility, paint containment, and scoped transitions', () => {
  const library = fs.readFileSync(new URL('../src/components/LibraryPage.jsx', import.meta.url), 'utf8')
  const detail = fs.readFileSync(new URL('../src/components/AnimeDetail.jsx', import.meta.url), 'utf8')
  const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  const petals = fs.readFileSync(new URL('../src/components/SakuraPetals.jsx', import.meta.url), 'utf8')

  // Content visibility en colecciones extensas
  assert.match(library, /contentVisibility:\s*'auto'/)
  assert.match(detail, /contentVisibility:\s*'auto'/)

  // Paint containment y transiciones acotadas en CSS
  assert.match(css, /contain:\s*paint/)
  assert.doesNotMatch(css, /\*\s*\{\s*transition-timing-function/)

  // Pausa de física RAF en estado inactivo para evitar invalidación constante a 120Hz
  assert.match(petals, /isRunning/)
  assert.match(petals, /cancelAnimationFrame/)
})

