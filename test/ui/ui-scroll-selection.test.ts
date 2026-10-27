import { afterEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import {
    GameClipboardEvent,
    GameKeyboardEvent,
    GamePointerEvent,
    GameWheelEvent,
} from '../../src/canvade/event/types/dom-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { UIContainer } from '../../src/canvade/ui/elements/ui-container';
import { UIInput } from '../../src/canvade/ui/elements/ui-input';
import { UIStructureDefinition } from '../../src/canvade/ui/ui-parser';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function createLayer(structure: UIStructureDefinition, styles = {}) {
    const layer = new TestLayer();
    const root = layer.uiRenderer.setUI(structure, styles);
    const { context } = createCanvasMock(400, 200);
    const render = () => {
        layer.uiRenderer.render(context);
        return context;
    };
    render();
    return { layer, root, render };
}

function mouse(layer: Layer, name: string, x: number, y: number, init: Partial<MouseEvent> = {}) {
    const event = new CustomEvent<GamePointerEvent>(name, {
        detail: {
            name,
            consumed: false,
            pointerEvent: {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                shiftKey: false,
                ...init,
            } as PointerEvent,
            primary: true,
            position: new Vector(x, y),
        },
    });
    layer.dispatch(name as 'pointerDown', event);
    return event;
}

function wheel(layer: Layer, x: number, y: number, deltaY: number, deltaMode = 0) {
    const event = new CustomEvent<GameWheelEvent>('scroll', {
        detail: {
            name: 'scroll',
            consumed: false,
            wheelEvent: { deltaY, deltaMode } as WheelEvent,
            position: new Vector(x, y),
            viewWidth: 400,
            viewHeight: 200,
        },
    });
    layer.dispatch('scroll', event);
    return event;
}

function key(layer: Layer, key: string, init: Partial<KeyboardEvent> = {}) {
    const event = new CustomEvent<GameKeyboardEvent>('keyDown', {
        detail: {
            name: 'keyDown',
            consumed: false,
            keyboardEvent: {
                key,
                ctrlKey: false,
                altKey: false,
                metaKey: false,
                shiftKey: false,
                ...init,
            } as KeyboardEvent,
        },
    });
    layer.dispatch('keyDown', event);
    return event.detail.consumed;
}

/** Sends a clipboard event, with a clipboard holding `text`, and returns what was copied. */
function clipboard(layer: Layer, type: 'copy' | 'cut' | 'paste', text = '') {
    const data = new Map<string, string>([['text/plain', text]]);
    const event = new CustomEvent<GameClipboardEvent>(type, {
        detail: {
            name: type,
            consumed: false,
            clipboardEvent: {
                type,
                clipboardData: {
                    getData: (format: string) => data.get(format) ?? '',
                    setData: (format: string, value: string) => data.set(format, value),
                },
            } as unknown as ClipboardEvent,
        },
    });
    layer.dispatch(type, event);
    return { consumed: event.detail.consumed, copied: data.get('text/plain') };
}

/** A 60 pixels high list of five 20 pixels rows, scrolling when needed. */
function createList(overflow: string, events = {}) {
    const created = createLayer(
        [
            {
                'container.list': {
                    children: [
                        'button.row',
                        'button.row',
                        'button.row',
                        'button.row',
                        'button.row',
                    ],
                    events,
                },
            },
        ],
        {
            '.list': { width: 100, height: 60, overflow },
            '.row': { width: '100%', height: 20 },
        },
    );
    const list = created.root.children[0] as UIContainer;
    return { ...created, list, rows: list.children };
}

describe('Scrolling containers', () => {
    test('scroll with the wheel when their children overflow', () => {
        const scroll = vi.fn();
        const { layer, list, rows, render } = createList('auto', { scroll });

        // The rows leave room for the scrollbar once the overflow is known
        render();
        expect(rows[0].getBounds().width).toBe(92);

        const event = wheel(layer, 50, 30, 25);
        expect(event.detail.consumed).toBe(true);
        expect(list.scrollTop).toBe(25);
        expect(scroll).toHaveBeenCalledWith(25, list);

        // Clamped to the 40 pixels of overflow, lines converted to pixels
        wheel(layer, 50, 30, 3, 1);
        expect(list.scrollTop).toBe(40);
        render();
        expect(rows[2].getBounds().y).toBe(0);
        expect(list.findElementAt(50, 10)).toBe(rows[2]);
    });

    test('drag their scrollbar thumb, or jump to a click on its track', () => {
        const { layer, list, render } = createList('auto');
        render();

        // The thumb is 60 * 60 / 100 = 36 pixels high: 24 pixels of free track for 40 of scroll
        mouse(layer, 'pointerDown', 96, 10);
        mouse(layer, 'pointerMove', 300, 22);
        expect(list.scrollTop).toBe(20);
        mouse(layer, 'pointerUp', 300, 22);
        render();

        // A click on the track centers the thumb under the mouse
        mouse(layer, 'pointerDown', 96, 59);
        expect(list.scrollTop).toBe(40);
        mouse(layer, 'pointerUp', 96, 59);
    });

    test('do not scroll children that fit, nor hidden overflows', () => {
        const fitting = createLayer([{ 'container.box': ['button.row'] }], {
            '.box': { width: 100, height: 60, overflow: 'scroll' },
            '.row': { width: '100%', height: 20 },
        });
        const box = fitting.root.children[0] as UIContainer;
        // Always shown with `scroll`, but nothing to scroll
        expect(box.children[0].getBounds().width).toBe(92);
        expect(wheel(fitting.layer, 50, 10, 30).detail.consumed).toBe(true);
        expect(box.scrollTop).toBe(0);

        const hidden = createList('hidden');
        hidden.render();
        expect(hidden.rows[0].getBounds().width).toBe(100);
        wheel(hidden.layer, 50, 10, 30);
        expect(hidden.list.scrollTop).toBe(0);
    });

    test('start from the scroll position of their styles', () => {
        const created = createLayer(
            [{ 'container.list': ['button.row', 'button.row', 'button.row'] }],
            {
                '.list': { width: 100, height: 20, overflow: 'auto', scrollTop: 20 },
                '.row': { width: '100%', height: 20 },
            },
        );
        created.render();

        expect(created.root.children[0].children[1].getBounds().y).toBe(0);
    });

    test('hide their children scrolled into the padding from the mouse', () => {
        const created = createLayer(
            [{ 'container.list': ['button.row', 'button.row', 'button.row'] }],
            {
                '.list': { width: 100, height: 40, padding: 10, overflow: 'auto', scrollTop: 15 },
                '.row': { width: '100%', height: 20 },
            },
        );
        created.render();

        const list = created.root.children[0];
        expect(list.findElementAt(50, 5)).toBe(list);
        expect(list.findElementAt(50, 15)).toBe(list.children[1]);
    });
});

describe('Input selection and clipboard', () => {
    function createInput(styles = {}) {
        const created = createLayer([{ 'input.field': {} }], {
            '.field': { width: 200, height: 30, value: 'hello world', ...styles },
        });
        const input = created.root.children[0] as UIInput;
        mouse(created.layer, 'pointerDown', 6 + 7 * 11, 10);
        mouse(created.layer, 'pointerUp', 6 + 7 * 11, 10);
        return { ...created, input };
    }

    test('selects with Shift and the arrows, Home and End, or everything', () => {
        const { layer, input } = createInput();
        expect(input.caret).toBe(11);

        key(layer, 'ArrowLeft', { shiftKey: true });
        key(layer, 'ArrowLeft', { shiftKey: true });
        expect(input.selectedText).toBe('ld');
        key(layer, 'Home', { shiftKey: true });
        expect(input.selectedText).toBe('hello world');

        // Without Shift, the selection collapses to its end
        key(layer, 'ArrowRight');
        expect([input.selectionStart, input.selectionEnd]).toEqual([11, 11]);

        expect(key(layer, 'a', { ctrlKey: true })).toBe(true);
        expect(input.selectedText).toBe('hello world');
        key(layer, 'ArrowLeft');
        expect(input.caret).toBe(0);
        key(layer, 'End', { shiftKey: true });
        expect(input.selectionEnd).toBe(11);
    });

    test('replaces or deletes the selected text', () => {
        const change = vi.fn();
        const { layer, input } = createInput();
        input.subscribe('change', change);

        input.select(0, 5);
        key(layer, 'H');
        expect(input.value).toBe('H world');
        input.select(1, 7);
        key(layer, 'Backspace');
        expect(input.value).toBe('H');
        input.setValue('abc');
        input.select(0, 2);
        key(layer, 'Delete');
        expect(input.value).toBe('c');
        expect(change).toHaveBeenCalledTimes(3);
    });

    test('selects with the mouse, by dragging or with Shift', () => {
        const { layer, input, render } = createInput();
        render();

        // From the start of "world" to the end
        mouse(layer, 'pointerDown', 6 + 7 * 6, 10);
        mouse(layer, 'pointerMove', 300, 10);
        mouse(layer, 'pointerUp', 300, 10);
        expect(input.selectedText).toBe('world');

        mouse(layer, 'pointerDown', 6, 10);
        mouse(layer, 'pointerUp', 6, 10);
        mouse(layer, 'pointerDown', 6 + 7 * 5, 10, { shiftKey: true });
        mouse(layer, 'pointerUp', 6 + 7 * 5, 10, { shiftKey: true });
        expect(input.selectedText).toBe('hello');
    });

    test('draws the selection under the text', () => {
        const { input, render } = createInput();
        input.select(0, 5);

        const context = render();

        // 5 characters of 7 pixels, from the padding of 6 pixels
        expect(vi.mocked(context.fillRect)).toHaveBeenCalledWith(6, 8, 35, 14);
    });

    test('copies, cuts and pastes through the clipboard events', () => {
        const { layer, input } = createInput({ maxLength: 15 });
        expect(key(layer, 'c', { ctrlKey: true })).toBe(true);

        // Nothing selected, nothing to copy
        expect(clipboard(layer, 'copy').consumed).toBe(false);

        input.select(6, 11);
        expect(clipboard(layer, 'copy')).toEqual({ consumed: true, copied: 'world' });
        expect(input.value).toBe('hello world');
        expect(clipboard(layer, 'cut')).toEqual({ consumed: true, copied: 'world' });
        expect(input.value).toBe('hello ');

        // On one line, within the maximum length
        expect(clipboard(layer, 'paste', 'big\nwide world').consumed).toBe(true);
        expect(input.value).toBe('hello big wide ');
        expect(input.caret).toBe(15);
    });

    test('lets the browser fire the clipboard events while the canvas has the focus', () => {
        const { canvas, context } = createCanvasMock();
        const documentMock: { activeElement: unknown } = { activeElement: canvas };
        vi.stubGlobal('document', documentMock);
        const dispatch = vi.fn((name: string, event: CustomEvent<GameClipboardEvent>) => {
            if (name === 'paste') {
                event.detail.consumed = true;
            }
        });
        const stateManager = { getCurrent: () => ({ dispatch, getWorld: () => undefined }) };
        const eventManager = new EventManager(context);
        const keyEvent = (keyName: string, ctrlKey: boolean) =>
            ({
                key: keyName,
                code: 'KeyV',
                ctrlKey,
                metaKey: false,
                altKey: false,
                shiftKey: false,
                preventDefault: vi.fn(),
            }) as unknown as KeyboardEvent;

        const paste = keyEvent('v', true);
        eventManager.onKeyDown(paste, stateManager as never);
        expect(paste.preventDefault).not.toHaveBeenCalled();
        const typed = keyEvent('v', false);
        eventManager.onKeyDown(typed, stateManager as never);
        expect(typed.preventDefault).toHaveBeenCalled();

        const pasteEvent = { preventDefault: vi.fn() } as unknown as ClipboardEvent;
        eventManager.onClipboard('paste', pasteEvent, stateManager as never);
        expect(dispatch).toHaveBeenLastCalledWith('paste', expect.anything());
        expect(pasteEvent.preventDefault).toHaveBeenCalled();
        const copyEvent = { preventDefault: vi.fn() } as unknown as ClipboardEvent;
        eventManager.onClipboard('copy', copyEvent, stateManager as never);
        expect(copyEvent.preventDefault).not.toHaveBeenCalled();

        documentMock.activeElement = null;
        dispatch.mockClear();
        eventManager.onClipboard('paste', pasteEvent, stateManager as never);
        expect(dispatch).not.toHaveBeenCalled();
    });
});
