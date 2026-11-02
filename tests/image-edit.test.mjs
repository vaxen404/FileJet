import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cropPixels, fullImageCrop, rotatedImageSize, editableImageType } from '../app/utils/imageEdit.ts'

test('quarter turns swap image dimensions and half turns retain them', () => {
    assert.deepEqual(rotatedImageSize(800, 600, 1), { width: 600, height: 800 })
    assert.deepEqual(rotatedImageSize(800, 600, 2), { width: 800, height: 600 })
    assert.deepEqual(rotatedImageSize(800, 600, 3), { width: 600, height: 800 })
})
test('crop coordinates preserve pixels and stay inside the rotated canvas', () => {
    assert.deepEqual(cropPixels(fullImageCrop(), 800, 600), { x: 0, y: 0, width: 800, height: 600 })
    assert.deepEqual(cropPixels({ x: 0.25, y: 0.1, width: 0.5, height: 0.5 }, 800, 600), { x: 200, y: 60, width: 400, height: 300 })
    assert.deepEqual(cropPixels({ x: 1, y: 1, width: 1, height: 1 }, 800, 600), { x: 799, y: 599, width: 1, height: 1 })
})
test('image editing preserves supported formats and excludes animation and vectors', () => {
    assert.equal(editableImageType('photo.JPG', 'image/jpeg'), 'image/jpeg')
    assert.equal(editableImageType('photo.png', 'image/png'), 'image/png')
    assert.equal(editableImageType('photo.webp', 'image/webp'), 'image/webp')
    assert.equal(editableImageType('animation.gif', 'image/gif'), null)
    assert.equal(editableImageType('vector.svg', 'image/svg+xml'), null)
})
