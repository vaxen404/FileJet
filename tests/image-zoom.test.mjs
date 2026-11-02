import assert from 'node:assert/strict'
import { test } from 'node:test'
import { limitImageTransform, zoomImageAt, pinchImage } from '../app/utils/imageZoom.ts'

const bounds = { width: 400, height: 600, imageWidth: 400, imageHeight: 400 }
const initial = { scale: 1, x: 0, y: 0 }

test('image zoom keeps the touched image point under the same finger', () => {
    const point = { x: 50, y: -20 }
    const zoomed = zoomImageAt(initial, 2, point, bounds)
    assert.deepEqual(zoomed, { scale: 2, x: -50, y: 20 })
    assert.equal((point.x - zoomed.x) / zoomed.scale, point.x)
    assert.equal((point.y - zoomed.y) / zoomed.scale, point.y)
    assert.deepEqual(zoomImageAt(zoomed, 1, point, bounds), initial)
})

test('pinch follows both finger separation and movement without jumping', () => {
    const zoomed = pinchImage(initial, [{ x: -50, y: 0 }, { x: 50, y: 0 }], [{ x: -60, y: 30 }, { x: 140, y: 30 }], bounds)
    assert.deepEqual(zoomed, { scale: 2, x: 40, y: 30 })
    const unchanged = pinchImage(zoomed, [{ x: -60, y: 30 }, { x: 140, y: 30 }], [{ x: -60, y: 30 }, { x: 140, y: 30 }], bounds)
    assert.deepEqual(unchanged, zoomed)
})

test('panning stops at the visible image edge and leaves smaller dimensions centered', () => {
    assert.deepEqual(limitImageTransform({ scale: 2, x: 1000, y: -1000 }, bounds), { scale: 2, x: 200, y: -100 })
    assert.deepEqual(limitImageTransform({ scale: 1.2, x: 1000, y: -1000 }, bounds), { scale: 1.2, x: 40, y: 0 })
    assert.deepEqual(limitImageTransform({ scale: 0.2, x: -100, y: 200 }, bounds), initial)
    assert.equal(zoomImageAt(initial, 20, { x: 0, y: 0 }, bounds).scale, 5)
    assert.deepEqual(zoomImageAt(initial, 2, { x: 0, y: 0 }, { width: 0, height: 0, imageWidth: 0, imageHeight: 0 }), { scale: 2, x: 0, y: 0 })
})
