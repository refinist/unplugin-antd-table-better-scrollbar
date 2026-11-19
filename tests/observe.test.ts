import assert from 'node:assert/strict';
import { test, vi } from 'vite-plus/test';
import { observeBody } from '../src/observe.ts';

test('a body without a window has no observers', () => {
  const setWidth = vi.fn();
  const body = { ownerDocument: { defaultView: null } } as HTMLElement;
  assert.equal(observeBody(body, setWidth), undefined);
  assert.equal(setWidth.mock.calls.length, 0);
});

test('measures the gutter, tracks table replacements and disconnects both observers', () => {
  const resize = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  const mutations = { observe: vi.fn(), disconnect: vi.fn() };
  let onResize!: () => void;
  let onMutation!: () => void;
  const view = {
    getComputedStyle: () => ({ borderLeftWidth: '1.5px', borderRightWidth: '2px' }),
    ResizeObserver: class {
      constructor(callback: () => void) {
        onResize = callback;
        return resize;
      }
    },
    MutationObserver: class {
      constructor(callback: () => void) {
        onMutation = callback;
        return mutations;
      }
    },
  };
  let table: object | null = null;
  const body = {
    ownerDocument: { defaultView: view },
    offsetWidth: 120,
    clientWidth: 100,
    querySelector: (selector: string) => {
      assert.equal(selector, ':scope > table');
      return table;
    },
  };
  const setWidth = vi.fn();
  const stop = observeBody(body as unknown as HTMLElement, setWidth);
  assert.ok(stop);
  assert.deepEqual(mutations.observe.mock.calls, [[body, { childList: true }]]);
  assert.deepEqual(resize.observe.mock.calls, [[body]]);
  assert.deepEqual(setWidth.mock.calls, [[17]]);

  const first = (table = { id: 1 });
  onMutation();
  onMutation();
  const second = (table = { id: 2 });
  onMutation();
  table = null;
  onMutation();
  assert.deepEqual(resize.observe.mock.calls, [[body], [first], [second]]);
  assert.deepEqual(resize.unobserve.mock.calls, [[first], [second]]);
  body.clientWidth = 118;
  onResize();
  assert.deepEqual(setWidth.mock.lastCall, [0]);

  stop();
  assert.equal(resize.disconnect.mock.calls.length, 1);
  assert.equal(mutations.disconnect.mock.calls.length, 1);
});
