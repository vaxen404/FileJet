import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modalBackdrop } from '../app/utils/modalBackdrop.ts'

test('modal backdrop requires a primary press and release outside; dragging, cancellation and dialog padding stay open', () => {
    for (const tagName of ['DIALOG', 'DIV']) {
        let closed = 0
        const backdrop = modalBackdrop(() => closed++)
        const element = { tagName, getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 500 }) }
        const outside = { currentTarget: element, target: element, button: 0, isPrimary: true, clientX: 20, clientY: 20 }
        const input = { ...outside, target: {}, clientX: 200, clientY: 200 }
        backdrop.pointerdown(input); backdrop.pointerup(outside); backdrop.click(outside)
        assert.equal(closed, 0, 'input-to-backdrop drag')
        backdrop.pointerdown(outside); backdrop.pointerup(input); backdrop.click(outside)
        assert.equal(closed, 0, 'backdrop-to-input drag')
        backdrop.pointerdown(outside); backdrop.pointercancel(); backdrop.pointerup(outside); backdrop.click(outside)
        assert.equal(closed, 0, 'cancelled gesture')
        backdrop.pointerdown({ ...outside, button: 2 }); backdrop.pointerup(outside); backdrop.click(outside)
        assert.equal(closed, 0, 'right mouse button')
        backdrop.pointerdown({ ...outside, isPrimary: false }); backdrop.pointerup(outside); backdrop.click(outside)
        assert.equal(closed, 0, 'secondary touch')
        if (tagName === 'DIALOG') {
            const padding = { ...outside, clientX: 101, clientY: 101 }
            backdrop.pointerdown(padding); backdrop.pointerup(padding); backdrop.click(padding)
            assert.equal(closed, 0, 'dialog padding')
        }
        backdrop.pointerdown(outside); backdrop.pointerup(outside); backdrop.click(outside)
        assert.equal(closed, 1, 'actual backdrop click')
        backdrop.click(outside)
        assert.equal(closed, 1, 'stale click cannot reuse a gesture')
    }
})
