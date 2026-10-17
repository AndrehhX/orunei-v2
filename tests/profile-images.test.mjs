import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getImageConstraints, validateImageFile } from '../src/profile/model.js'

test('exposes safe local image constraints for avatar and banner uploads', () => {
  assert.deepEqual(getImageConstraints('avatar'), { maxWidth: 512, maxHeight: 512, crop: 'square' })
  assert.deepEqual(getImageConstraints('banner'), { maxWidth: 1600, maxHeight: 900, crop: 'cover' })
  assert.equal(getImageConstraints('unknown'), null)
})

test('rejects oversized and unsupported profile images before browser processing', () => {
  assert.equal(validateImageFile({ type: 'image/webp', size: 5000 }, 'avatar').ok, true)
  assert.equal(validateImageFile({ type: 'image/gif', size: 3 * 1024 * 1024 }, 'avatar').ok, true, 'Debe permitir GIFs para avatar')
  assert.equal(validateImageFile({ type: 'image/gif', size: 4 * 1024 * 1024 }, 'banner').ok, true, 'Debe permitir GIFs para banner')
  assert.equal(validateImageFile({ type: 'image/svg+xml', size: 5000 }, 'banner').ok, false)
  assert.equal(validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }, 'avatar').ok, false)
})

test('shows profile image upload progress instead of appearing inert', () => {
  const editor = readFileSync(new URL('../src/components/ProfileEditor.jsx', import.meta.url), 'utf8')
  assert.match(editor, /uploadingKind/)
  assert.match(editor, /setUploadingKind\(kind\)/)
  assert.match(editor, /disabled=\{uploading\}/)
  assert.match(editor, /Subiendo/)
  assert.match(editor, /GIF/i, 'ProfileEditor debe indicar soporte explícito para GIFs')
})
