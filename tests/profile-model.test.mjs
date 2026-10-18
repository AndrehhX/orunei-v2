import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PROFILE,
  PROFILE_KEY,
  createProfile,
  getProfileStats,
  makeActivity,
  normalizeAnimeEntry,
  normalizeProfile,
  markAnimeWatched,
  toRemoteAnimeEntry,
  validateImageFile,
} from '../src/profile/model.js'

test('exposes the private profile storage contract and useful defaults', () => {
  assert.equal(PROFILE_KEY, 'orunei-profile-v1')
  const profile = createProfile({ name: 'Andreh', email: 'andreh@example.com' })

  assert.equal(profile.displayName, 'Andreh')
  assert.equal(profile.username, 'andreh')
  assert.equal(profile.bio, '')
  assert.equal(profile.status, '')
  assert.equal(profile.accent, DEFAULT_PROFILE.accent)
  assert.deepEqual(profile.pinnedSections, ['overview', 'animelist', 'favorites'])
  assert.deepEqual(profile.privacy, DEFAULT_PROFILE.privacy)
  assert.deepEqual(Object.keys(profile.privacy), ['animeList', 'favorites', 'activity', 'lists'])
  assert.deepEqual(profile.customLists, [])
  assert.deepEqual(profile.activity, [])
})

test('normalizes malformed local data without losing the user identity', () => {
  const profile = normalizeProfile({
    displayName: 42,
    username: 'Bad Name!!',
    privacy: { animeList: 'public', favorites: 'nope' },
    pinnedSections: ['animelist', 'animelist', 'unknown'],
    customLists: [{ id: 'list-1', title: '  Mis favoritos  ', animeIds: ['1', 2, '1'] }, null],
    activity: [{ type: 'profile', label: 'Actualizó su perfil', at: '2026-01-01' }, { nope: true }],
  }, { name: 'Andreh', email: 'andreh@example.com' })

  assert.equal(profile.displayName, 'Andreh')
  assert.equal(profile.username, 'andreh')
  assert.equal(profile.privacy.animeList, 'public')
  assert.equal(profile.privacy.favorites, 'private')
  assert.deepEqual(profile.pinnedSections, ['animelist'])
  assert.equal(profile.customLists.length, 1)
  assert.equal(profile.customLists[0].title, 'Mis favoritos')
  assert.equal(profile.customLists[0].accent, DEFAULT_PROFILE.accent)
  assert.deepEqual(profile.customLists[0].animeIds, ['1', '2'])
  assert.equal(profile.activity.length, 1)
})

test('normalizes and maps real AniList genres for remote AnimeList rows', () => {
  const entry = normalizeAnimeEntry({ id: 101, title: 'Frieren', genres: ['Fantasy', 'Drama', 'Fantasy'] })
  assert.deepEqual(entry.genres, ['Fantasy', 'Drama'])
  assert.deepEqual(toRemoteAnimeEntry('user-1', entry).genres, ['Fantasy', 'Drama'])
})

test('marks an anime as watched only through an explicit status change and keeps its metadata', () => {
  const watched = markAnimeWatched({ id: '101', t: 'Frieren', status: 'planned', genres: [] }, {
    genres: ['Fantasy', 'Drama'],
    coverImage: { extraLarge: 'https://img.test/frieren.jpg' },
  })

  assert.equal(watched.status, 'completed')
  assert.equal(watched.s, 'Terminado')
  assert.deepEqual(watched.genres, ['Fantasy', 'Drama'])
  assert.equal(watched.img, 'https://img.test/frieren.jpg')
})

test('validates image type and file size before reading a file', () => {
  assert.deepEqual(validateImageFile({ type: 'image/png', size: 1024 }, 'avatar'), { ok: true })
  assert.equal(validateImageFile({ type: 'text/plain', size: 1024 }, 'avatar').ok, false)
  assert.match(validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }, 'banner').error, /5 MB/)
  assert.equal(validateImageFile({ type: 'image/png', size: 1024 }, 'cover').ok, false)
})

test('creates bounded activity records and computes real profile stats', () => {
  const now = '2026-10-12T12:00:00.000Z'
  const event = makeActivity('list', 'Creó la lista “Favoritos”', now)
  assert.deepEqual(event, { id: 'list-2026-10-12T12:00:00.000Z', type: 'list', label: 'Creó la lista “Favoritos”', at: now })

  const library = [
    { s: 'Viendo · Ep. 2 de 12' },
    { s: 'Terminado' },
    { s: 'Favorito' },
    { s: 'Favorito' },
  ]
  const profile = normalizeProfile({ customLists: [{ id: 'one', title: 'Una lista', animeIds: ['a'] }] }, { name: 'A', email: 'a@b.com' })
  assert.deepEqual(getProfileStats(library, 7, profile), {
    works: 4,
    favorites: 2,
    lists: 1,
    tastes: 7,
  })
})

test('supports and normalizes steam-style profile customization (frames, themes, and showcase)', () => {
  const base = createProfile({ name: 'Alex', email: 'alex@example.com' })
  assert.equal(base.avatarFrame, 'none')
  assert.equal(base.profileTheme, 'default')
  assert.equal(base.featuredQuote, '')
  assert.equal(base.featuredReview, '')

  // Normaliza valores válidos
  const customized = normalizeProfile({
    avatarFrame: 'sakura',
    profileTheme: 'cyber-rain',
    featuredQuote: '  Una obra maestra inolvidable  ',
    featuredReview: '  La animación y banda sonora son 10/10  ',
  }, { name: 'Alex' })

  assert.equal(customized.avatarFrame, 'sakura')
  assert.equal(customized.profileTheme, 'cyber-rain')
  assert.equal(customized.featuredQuote, 'Una obra maestra inolvidable')
  assert.equal(customized.featuredReview, 'La animación y banda sonora son 10/10')

  // Rechaza valores no válidos retornando los fallbacks seguros
  const invalid = normalizeProfile({
    avatarFrame: 'fake_frame_id',
    profileTheme: 'unsupported_theme',
    featuredQuote: 'x'.repeat(200), // Excede 140
  }, { name: 'Alex' })

  assert.equal(invalid.avatarFrame, 'none')
  assert.equal(invalid.profileTheme, 'default')
  assert.equal(invalid.featuredQuote.length, 140)
})

test('normalizes customizable overview section order', () => {
  const base = createProfile({ name: 'Alex' })
  assert.deepEqual(base.overviewOrder, ['showcase', 'comments', 'animeList', 'activity'])

  // Reordenamiento válido
  const reordered = normalizeProfile({
    overviewOrder: ['comments', 'showcase', 'activity', 'animeList'],
  }, { name: 'Alex' })
  assert.deepEqual(reordered.overviewOrder, ['comments', 'showcase', 'activity', 'animeList'])

  // Lista con valores inválidos o faltantes se limpia y preserva todos los items requeridos
  const partial = normalizeProfile({
    overviewOrder: ['activity', 'unknown_section', 'comments'],
  }, { name: 'Alex' })
  assert.deepEqual(partial.overviewOrder, ['activity', 'comments', 'showcase', 'animeList'])
})

test('normalizes glassOpacity within bounds and provides standard fallback', () => {
  const base = createProfile({ name: 'Alex' })
  assert.equal(base.glassOpacity, 75)

  const custom = normalizeProfile({ glassOpacity: 55 }, { name: 'Alex' })
  assert.equal(custom.glassOpacity, 55)

  // Respeta límites [25, 95]
  const tooLow = normalizeProfile({ glassOpacity: 5 }, { name: 'Alex' })
  assert.equal(tooLow.glassOpacity, 25)

  const tooHigh = normalizeProfile({ glassOpacity: 120 }, { name: 'Alex' })
  assert.equal(tooHigh.glassOpacity, 95)

  const notNumber = normalizeProfile({ glassOpacity: 'invalid' }, { name: 'Alex' })
  assert.equal(notNumber.glassOpacity, 75)
})

test('user-scoped profile storage isolates accounts and falls back smoothly', async () => {
  const { getUserProfileKey, readProfileStorage, writeProfileStorage, clearProfileStorage } = await import('../src/profile/profileStorage.js')

  const map = new Map()
  const mockStorage = {
    getItem(k) { return map.get(k) ?? null },
    setItem(k, v) { map.set(k, String(v)) },
    removeItem(k) { map.delete(k) },
  }

  assert.equal(getUserProfileKey('usr-1'), 'orunei-profile-v1-usr-1')
  assert.equal(getUserProfileKey(''), 'orunei-profile-v1')

  // Guardar perfil para el usuario 1
  writeProfileStorage(mockStorage, { displayName: 'User One', avatarFrame: 'flame', glassOpacity: 50 }, { id: 'usr-1' })

  // Usuario 1 lee sus datos específicos
  const readUser1 = readProfileStorage(mockStorage, { id: 'usr-1' })
  assert.equal(readUser1.displayName, 'User One')
  assert.equal(readUser1.avatarFrame, 'flame')
  assert.equal(readUser1.glassOpacity, 50)

  // Guardar perfil para usuario 2
  writeProfileStorage(mockStorage, { displayName: 'User Two', avatarFrame: 'cyber', glassOpacity: 80 }, { id: 'usr-2' })

  // Usuario 1 y usuario 2 mantienen sus perfiles aislados en el mismo almacenamiento
  const reReadUser1 = readProfileStorage(mockStorage, { id: 'usr-1' })
  const readUser2 = readProfileStorage(mockStorage, { id: 'usr-2' })
  assert.equal(reReadUser1.displayName, 'User One')
  assert.equal(reReadUser1.avatarFrame, 'flame')
  assert.equal(readUser2.displayName, 'User Two')
  assert.equal(readUser2.avatarFrame, 'cyber')

  // Limpiar sesión del usuario 1 elimina su clave sin alterar claves no relacionadas
  clearProfileStorage(mockStorage, 'usr-1')
  assert.equal(mockStorage.getItem('orunei-profile-v1-usr-1'), null)
})



