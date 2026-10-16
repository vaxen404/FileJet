import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { effectScope, nextTick, ref, watch } from 'vue'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const source = await fs.readFile(new URL('../app/components/ui/ItemMenu.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const code = stripTypeScriptTypes(descriptor.scriptSetup.content).replace(/^import .+$/gm, '')

function target() {
    const listeners = new Map()
    return {
        listeners,
        addEventListener(type, listener, capture = false) {
            const key = `${type}:${capture}`
            if (!listeners.has(key)) listeners.set(key, new Set())
            listeners.get(key).add(listener)
        },
        removeEventListener(type, listener, capture = false) {
            listeners.get(`${type}:${capture}`)?.delete(listener)
        },
        dispatch(type, event = {}, capture = false) {
            for (const listener of listeners.get(`${type}:${capture}`) ?? []) listener(event)
        },
        listenerCount() { return [...listeners.values()].reduce((count, items) => count + items.size, 0) }
    }
}

function fixture(options = {}) {
    const frames = new Map(), events = [], resizeObservers = [], intersectionObservers = []
    let nextFrame = 1, outside
    const rootElement = {}
    const trigger = { top: 200, bottom: 232, left: 900, right: 932, ...options.trigger }
    const viewport = options.visualViewport ? Object.assign(target(), options.visualViewport) : undefined
    const window = Object.assign(target(), {
        innerWidth: options.width ?? 1200,
        innerHeight: options.height ?? 800,
        visualViewport: viewport,
        requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id },
        cancelAnimationFrame(id) { frames.delete(id) }
    })
    const anchor = { getBoundingClientRect: () => trigger }
    const dropdown = {
        style: {},
        scrollHeight: (options.menuHeight ?? 252) - 2,
        getBoundingClientRect() {
            return { width: Math.min(189.2, parseFloat(this.style.maxWidth ?? 'Infinity') + 13.2) }
        }
    }
    class ResizeObserverMock {
        observed = new Set()
        constructor(callback) { this.callback = callback; resizeObservers.push(this) }
        observe(element) { this.observed.add(element) }
        disconnect() { this.observed.clear() }
    }
    class IntersectionObserverMock extends ResizeObserverMock {
        constructor(callback) { super(callback); resizeObservers.pop(); intersectionObservers.push(this) }
    }
    const bindings = {
        ref, watch, nextTick, window,
        document: { documentElement: rootElement },
        getComputedStyle(element) {
            if (element === rootElement) return { fontSize: '16px' }
            return { borderTopWidth: '1px', borderBottomWidth: '1px', paddingTop: '5.6px', paddingBottom: '5.6px', paddingLeft: '5.6px', paddingRight: '5.6px', borderLeftWidth: '1px', borderRightWidth: '1px' }
        },
        ResizeObserver: options.noObservers ? undefined : ResizeObserverMock,
        IntersectionObserver: options.noObservers ? undefined : IntersectionObserverMock,
        defineProps: () => ({ type: 'file', canCopy: true }),
        withDefaults(props, defaults) {
            return Object.assign(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'function' ? value() : value])), props)
        },
        defineEmits: () => event => events.push(event),
        onClickOutside(element, callback, options) { outside = { element, callback, options } }
    }
    const scope = effectScope()
    const component = scope.run(() => new Function(...Object.keys(bindings), `${code}\nreturn { isOpen, menuRef, dropdownRef, menuPosition, toggleMenu, handleAction }`)(...Object.values(bindings)))
    component.menuRef.value = anchor
    component.dropdownRef.value = dropdown
    return {
        ...component, trigger, dropdown, window, frames, events, viewport, outside, resizeObservers, intersectionObservers,
        async open() { component.toggleMenu(); await nextTick(); await nextTick() },
        flushFrames() { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback() },
        stop: () => scope.stop()
    }
}

test('opens down when there is room and preserves the original horizontal offset', async () => {
    const f = fixture()
    await f.open()
    assert.equal(f.menuPosition.value.visibility, 'visible')
    assert.equal(parseFloat(f.menuPosition.value.top), 224)
    assert.ok(Math.abs(parseFloat(f.menuPosition.value.left) - 716.8) < 0.001)
    assert.equal(f.dropdown.getBoundingClientRect().width, 189.2)
    f.stop()
})

test('bottom-row menus open above the trigger and stay within the viewport', async () => {
    const f = fixture({ trigger: { top: 740, bottom: 772 } })
    await f.open()
    const top = parseFloat(f.menuPosition.value.top)
    assert.equal(top, 496)
    assert.ok(top + 252 <= f.trigger.top + 8)
    assert.ok(top >= 8)
    f.stop()
})

test('clamps menus horizontally for grid cards near the left screen edge', async () => {
    const f = fixture({ trigger: { left: 10, right: 42 } })
    await f.open()
    assert.equal(parseFloat(f.menuPosition.value.left), 8)
    f.stop()
})

test('keeps menus usable on short and narrow screens without overflowing', async () => {
    const f = fixture({ width: 190, height: 200, trigger: { top: 80, bottom: 112, left: 150, right: 182 } })
    await f.open()
    const position = f.menuPosition.value
    const outerHeight = parseFloat(position.maxHeight) + 13.2
    const outerWidth = f.dropdown.getBoundingClientRect().width
    assert.ok(parseFloat(position.top) + outerHeight <= 192.001)
    assert.ok(parseFloat(position.left) + outerWidth <= 182.001)
    assert.ok(parseFloat(position.left) >= 8)
    f.stop()
})

test('repositions on captured container scroll events and coalesces updates into one frame', async () => {
    const f = fixture({ trigger: { top: 740, bottom: 772 } })
    await f.open()
    f.trigger.top = 640
    f.trigger.bottom = 672
    f.window.dispatch('scroll', {}, true)
    f.window.dispatch('scroll', {}, true)
    assert.equal(f.frames.size, 1)
    f.flushFrames()
    assert.equal(parseFloat(f.menuPosition.value.top), 396)
    f.stop()
})

test('flips direction when a resize removes the space below', async () => {
    const f = fixture({ trigger: { top: 400, bottom: 432 } })
    await f.open()
    assert.equal(parseFloat(f.menuPosition.value.top), 424)
    f.window.innerHeight = 500
    f.window.dispatch('resize')
    f.flushFrames()
    assert.equal(parseFloat(f.menuPosition.value.top), 156)
    f.stop()
})

test('tracks the mobile visual viewport and its offsets', async () => {
    const f = fixture({ visualViewport: { offsetTop: 100, offsetLeft: 60, width: 500, height: 400 }, trigger: { top: 450, bottom: 482, left: 400, right: 432 } })
    await f.open()
    assert.equal(parseFloat(f.menuPosition.value.top), 206)
    assert.ok(parseFloat(f.menuPosition.value.left) + 189.2 <= 552.001)
    f.viewport.offsetTop = 130
    f.viewport.dispatch('scroll')
    assert.equal(f.frames.size, 1)
    f.flushFrames()
    f.stop()
    assert.equal(f.viewport.listenerCount(), 0)
})

test('recalculates position when the rendered menu height changes', async () => {
    const f = fixture({ trigger: { top: 740, bottom: 772 } })
    await f.open()
    f.dropdown.scrollHeight += 40
    f.resizeObservers[0].callback()
    f.flushFrames()
    assert.equal(parseFloat(f.menuPosition.value.top), 456)
    f.stop()
})

test('closes when the anchor scrolls out of the viewport or its clipping container', async () => {
    const f = fixture()
    await f.open()
    f.trigger.top = -40
    f.trigger.bottom = -8
    f.window.dispatch('scroll', {}, true)
    f.flushFrames()
    assert.equal(f.isOpen.value, false)
    f.stop()
    const clipped = fixture()
    await clipped.open()
    clipped.intersectionObservers[0].callback([{ isIntersecting: false }])
    assert.equal(clipped.isOpen.value, false)
    clipped.stop()
})

test('uses the teleported dropdown for outside clicks and excludes its trigger', async () => {
    const f = fixture()
    await f.open()
    assert.equal(f.outside.element, f.dropdownRef)
    assert.equal(f.outside.options.ignore[0], f.menuRef)
    f.outside.callback()
    assert.equal(f.isOpen.value, false)
    f.stop()
})

test('all existing actions emit their original event and close the menu', async () => {
    for (const action of ['open', 'rename', 'copy', 'edit', 'download', 'favorite', 'delete']) {
        const f = fixture()
        await f.open()
        f.handleAction(action)
        assert.deepEqual(f.events, [action])
        assert.equal(f.isOpen.value, false)
        f.stop()
    }
})

test('escape and unmount clean up pending animation frames, listeners and observers', async () => {
    const f = fixture()
    await f.open()
    f.window.dispatch('resize')
    f.window.dispatch('keydown', { key: 'Escape' })
    await nextTick()
    assert.equal(f.window.listenerCount(), 0)
    assert.equal(f.frames.size, 0)
    assert.equal(f.resizeObservers[0].observed.size, 0)
    assert.equal(f.intersectionObservers[0].observed.size, 0)
    f.stop()
    const unmounted = fixture()
    await unmounted.open()
    unmounted.window.dispatch('resize')
    unmounted.stop()
    assert.equal(unmounted.frames.size, 0)
    assert.equal(unmounted.window.listenerCount(), 0)
})

test('closing before nextTick avoids registering observers after cleanup', async () => {
    const f = fixture()
    f.toggleMenu()
    await nextTick()
    f.stop()
    await nextTick()
    assert.equal(f.window.listenerCount(), 0)
    assert.equal(f.resizeObservers.length, 0)
})

test('compiles the body teleport and scoped template successfully', () => {
    const script = compileScript(descriptor, { id: 'item-menu-position' })
    const template = compileTemplate({ source: descriptor.template.content, filename: 'ItemMenu.vue', id: 'item-menu-position', compilerOptions: { bindingMetadata: script.bindings } })
    assert.deepEqual(template.errors, [])
    assert.match(template.code, /Teleport/)
})
