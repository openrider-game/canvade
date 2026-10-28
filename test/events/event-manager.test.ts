import { afterEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import { Control } from '../../src/canvade/event/keyboard/control';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';
import { Mouse } from '../../src/canvade/event/mouse/mouse';
import { World } from '../../src/canvade/world/world';
import { createCanvasMock } from '../helpers/canvas';

afterEach(() => {
    vi.unstubAllGlobals();
});

/** Pointer event of the mouse, with its options as properties. */
function mousePointer(init: Partial<PointerEvent> = {}) {
    return {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        preventDefault: vi.fn(),
        ...init,
    } as unknown as PointerEvent;
}

describe('EventManager mouse input', () => {
    test('scales client coordinates to canvas pixels before dispatch', () => {
        const { canvas, context } = createCanvasMock();
        const dispatch = vi.fn();
        const world = new (class extends World {
            constructor() {
                super(new Vector(0, 0), 1);
            }
        })();
        const stateManager = {
            getCurrent: () => ({ getWorld: () => world, dispatch }),
        };
        const eventManager = new EventManager(context);
        const down = mousePointer({ clientX: 40, clientY: 25 });

        eventManager.onPointerDown(down, stateManager as never);
        eventManager.onPointerMove(
            mousePointer({ button: -1, clientX: 40, clientY: 25 }),
            stateManager as never,
        );
        eventManager.onPointerUp(mousePointer({ clientX: 40, clientY: 25 }), stateManager as never);

        expect(dispatch.mock.calls.map(([name]) => name)).toEqual([
            'pointerDown',
            'pointerMove',
            'pointerUp',
        ]);
        for (const [, event] of dispatch.mock.calls) {
            expect(event.detail.position).toEqual(new Vector(60, 40));
            expect(event.detail.primary).toBe(true);
        }
        expect(canvas.focus).toHaveBeenCalledOnce();
        expect(down.preventDefault).toHaveBeenCalledOnce();
    });
});

describe('EventManager mouse world positions', () => {
    test('converts the mouse position to world units when the state has a world', () => {
        const { context } = createCanvasMock(200, 100, {
            left: 0,
            top: 0,
            width: 200,
            height: 100,
        });
        const world = new (class extends World {})(new Vector(50, 25), 2);
        const stateManager = {
            getCurrent: () => ({ getWorld: () => world, dispatch: vi.fn() }),
        };
        const eventManager = new EventManager(context);
        eventManager.onPointerDown(
            mousePointer({ clientX: 120, clientY: 60 }),
            stateManager as never,
        );

        expect(Mouse.mousePos).toEqual(new Vector(120, 60));
        expect(Mouse.lastClick).toEqual(new Vector(120, 60));
        expect(Mouse.worldPos).toEqual(new Vector(60, 30));
        expect(Mouse.lastWorldClick).toEqual(new Vector(60, 30));
    });

    test('onContextMenu dispatches contextMenu with the mouse position', () => {
        const { context } = createCanvasMock(200, 100, {
            left: 0,
            top: 0,
            width: 200,
            height: 100,
        });
        const dispatch = vi.fn();
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        const mouseEvent = { clientX: 30, clientY: 40, preventDefault: vi.fn() };

        new EventManager(context).onContextMenu(
            mouseEvent as unknown as MouseEvent,
            stateManager as never,
        );

        expect(dispatch).toHaveBeenCalledWith(
            'contextMenu',
            expect.objectContaining({
                detail: expect.objectContaining({ position: new Vector(30, 40) }),
            }),
        );
        expect(Mouse.mousePos).toEqual(new Vector(30, 40));
        expect(mouseEvent.preventDefault).toHaveBeenCalledOnce();
    });

    test('forwards the visibility changes and the keyboard control events', () => {
        const { context } = createCanvasMock();
        const dispatch = vi.fn();
        const stateManager = { getCurrent: () => ({ dispatch }) };
        const eventManager = new EventManager(context);
        const keyboardEvent = {} as KeyboardEvent;
        vi.stubGlobal('document', { visibilityState: 'visible' });
        const controlEvent = new CustomEvent('keyboarddown', {
            detail: { keyboardEvent, key: 'jump' },
        });

        eventManager.onVisibilityChange(stateManager as never);
        eventManager.onKeyboardDown(controlEvent, stateManager as never);
        eventManager.onKeyboardUp(controlEvent, stateManager as never);

        expect(dispatch.mock.calls.map(([name]) => name)).toEqual([
            'visibilityChange',
            'keyboardDown',
            'keyboardUp',
        ]);
        expect(dispatch.mock.calls[1][1].detail).toMatchObject({ key: 'jump', keyboardEvent });
    });
});

describe('EventManager DOM bridge', () => {
    test('registers canvas and document listeners and forwards scroll events', () => {
        const { canvas, context } = createCanvasMock(200, 100, {
            left: 0,
            top: 0,
            width: 200,
            height: 100,
        });
        const dispatch = vi.fn();
        const stateManager = {
            getCurrent: () => ({ getWorld: () => undefined, dispatch }),
        };
        const documentAddEventListener = vi.fn();
        const windowAddEventListener = vi.fn();
        vi.stubGlobal('document', { addEventListener: documentAddEventListener });
        vi.stubGlobal('window', { addEventListener: windowAddEventListener });

        new EventManager(context).bridgeDOMEvents(stateManager as never);

        expect(canvas.tabIndex).toBe(0);
        expect(canvas.focus).toHaveBeenCalledOnce();
        expect(canvas.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(canvas.addEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
        // The fingers reach the canvas instead of scrolling or zooming the page
        // Nor selecting it or opening the menu of a long press, as in iOS Safari
        expect(canvas.style).toMatchObject({
            touchAction: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
            webkitTouchCallout: 'none',
        });
        const touchStart = vi
            .mocked(canvas.addEventListener)
            .mock.calls.find(([name]) => name === 'touchstart');
        expect(touchStart?.[2]).toEqual({ passive: false });
        const touch = { preventDefault: vi.fn() };
        (touchStart?.[1] as (e: typeof touch) => void)(touch);
        expect(touch.preventDefault).toHaveBeenCalledOnce();
        expect(canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
        expect(documentAddEventListener).toHaveBeenCalledWith(
            'visibilitychange',
            expect.any(Function),
        );
        expect(documentAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        // The focus loss
        expect(canvas.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('blur', expect.any(Function));

        const wheelEvent = { preventDefault: vi.fn() } as unknown as WheelEvent;
        expect(new EventManager(context).onScroll(wheelEvent, stateManager as never)).toBe(true);
        expect(dispatch).toHaveBeenCalledWith(
            'scroll',
            expect.objectContaining({
                detail: expect.objectContaining({ viewWidth: 200, viewHeight: 100 }),
            }),
        );
        expect(wheelEvent.preventDefault).toHaveBeenCalledOnce();
    });

    test('forwards key input only while the canvas has focus', () => {
        const { canvas, context } = createCanvasMock();
        const dispatch = vi.fn();
        const stateManager = {
            getCurrent: () => ({ getWorld: () => undefined, dispatch }),
        };
        const documentMock: { activeElement: Element | null } = { activeElement: canvas };
        vi.stubGlobal('document', documentMock);
        const eventManager = new EventManager(context);
        const keyEvent = {
            code: 'KeyZ',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: vi.fn(),
        } as unknown as KeyboardEvent;

        eventManager.onKeyDown(keyEvent, stateManager as never);
        eventManager.onKeyUp(keyEvent, stateManager as never);

        expect(dispatch.mock.calls.map(([name]) => name)).toEqual(['keyDown', 'keyUp']);
        expect(keyEvent.preventDefault).toHaveBeenCalledTimes(2);

        documentMock.activeElement = null;
        dispatch.mockClear();
        const unfocusedEvent = { ...keyEvent, preventDefault: vi.fn() };
        eventManager.onKeyDown(unfocusedEvent, stateManager as never);
        eventManager.onKeyUp(unfocusedEvent, stateManager as never);

        expect(dispatch).not.toHaveBeenCalled();
        expect(unfocusedEvent.preventDefault).not.toHaveBeenCalled();
    });
});

describe('EventManager held inputs', () => {
    /** Mouse event double, as the DOM one, missing from the environment of the tests. */
    class MouseEventDouble {
        public readonly preventDefault = vi.fn();
        public constructor(
            public readonly type: string,
            init: MouseEventInit = {},
        ) {
            Object.assign(this, { button: 0, clientX: 0, clientY: 0, ...init });
        }
    }

    /** Pointer event of the mouse, as the DOM one. */
    function mouse(type: string, init: PointerEventInit = {}) {
        return Object.assign(new MouseEventDouble(type, init), {
            pointerId: 1,
            pointerType: 'mouse',
            ...init,
        }) as unknown as PointerEvent;
    }

    /** A bridged event manager, its listeners by target and event name. */
    function bridge() {
        const { canvas, context } = createCanvasMock();
        const listeners = new Map<string, (e: unknown) => void>();
        const listen = (target: string) =>
            vi.fn((name: string, listener: (e: unknown) => void) => {
                listeners.set(`${target}:${name}`, listener);
            });
        canvas.addEventListener = listen('canvas') as never;
        const dispatchEvent = vi.fn((e: CustomEvent) => listeners.get(`document:${e.type}`)?.(e));
        vi.stubGlobal('document', {
            addEventListener: listen('document'),
            dispatchEvent,
            activeElement: canvas,
            visibilityState: 'visible',
        });
        vi.stubGlobal('window', { addEventListener: listen('window') });
        // The buttons held are released with pointer events of their own
        vi.stubGlobal('PointerEvent', MouseEventDouble);

        const dispatch = vi.fn();
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        const eventManager = new EventManager(context);
        eventManager.bridgeDOMEvents(stateManager as never);
        const fire = (key: string, e: unknown) => listeners.get(key)?.(e);
        const names = () => dispatch.mock.calls.map(([name]) => name);
        return { canvas, eventManager, stateManager, dispatch, fire, names };
    }

    test('releases the controls and the mouse buttons held when the canvas loses the focus', () => {
        const { canvas, dispatch, fire, names } = bridge();
        Keyboard.registerControl('held-test', new Control('ArrowUp'));
        const key = { code: 'ArrowUp', key: 'ArrowUp', preventDefault: vi.fn() };
        fire('document:keydown', key);
        fire('canvas:pointerdown', mouse('pointerdown', { button: 2, buttons: 2, clientX: 40 }));
        expect(Keyboard.isDown('held-test')).toBe(true);
        dispatch.mockClear();

        fire('canvas:blur', {});

        expect(Keyboard.isDown('held-test')).toBe(false);
        expect(names()).toEqual(['keyboardUp', 'pointerUp']);
        // At the last position of the mouse, with the button held
        const pointerUp = dispatch.mock.calls[1][1].detail.pointerEvent;
        expect([pointerUp.button, pointerUp.clientX, pointerUp.pointerType]).toEqual([
            2,
            40,
            'mouse',
        ]);

        // Nothing is held anymore: the window losing the focus next releases nothing
        dispatch.mockClear();
        fire('window:blur', {});
        expect(dispatch).not.toHaveBeenCalled();
        expect(canvas.focus).toHaveBeenCalled();
    });

    test('releases the inputs held when the page is hidden, before telling the states', () => {
        const { dispatch, fire, names } = bridge();
        fire('canvas:pointerdown', mouse('pointerdown', { buttons: 1 }));
        dispatch.mockClear();
        (document as { visibilityState: string }).visibilityState = 'hidden';

        fire('document:visibilitychange', {});

        expect(names()).toEqual(['pointerUp', 'visibilityChange']);
    });

    test('capture the mouse pressed on the canvas, released wherever it is released', () => {
        const { canvas, dispatch, fire, names } = bridge();
        fire('canvas:pointerenter', mouse('pointerenter', { button: -1 }));
        fire('canvas:pointerdown', mouse('pointerdown', { buttons: 1 }));
        expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
        // Captured: released out of the canvas, the release still reaches it, once
        fire('canvas:pointerup', mouse('pointerup', { buttons: 0, clientX: 500 }));
        fire('canvas:lostpointercapture', mouse('lostpointercapture', { button: -1 }));
        fire('canvas:pointerleave', mouse('pointerleave', { button: -1 }));

        expect(names()).toEqual(['pointerEnter', 'pointerDown', 'pointerUp', 'pointerLeave']);
        expect(dispatch.mock.calls[2][1].detail.pointerEvent.clientX).toBe(500);
    });

    test('press and release each mouse button, the others changing the buttons on a move', () => {
        const { dispatch, fire, names } = bridge();
        fire('canvas:pointerdown', mouse('pointerdown', { button: 0, buttons: 1 }));
        fire('canvas:pointermove', mouse('pointermove', { button: -1, buttons: 1 }));
        // The right button pressed then released while the main one is held
        fire('canvas:pointermove', mouse('pointermove', { button: 2, buttons: 3 }));
        fire('canvas:pointermove', mouse('pointermove', { button: 2, buttons: 1 }));
        fire('canvas:pointerup', mouse('pointerup', { button: 0, buttons: 0 }));

        expect(names()).toEqual([
            'pointerDown',
            'pointerMove',
            'pointerDown',
            'pointerUp',
            'pointerUp',
        ]);
        const buttons = dispatch.mock.calls.map(([, e]) => e.detail.pointerEvent.button);
        expect(buttons).toEqual([0, -1, 2, 2, 0]);
    });

    test('release the mouse buttons held when their pointer is cancelled or loses its capture', () => {
        const { fire, names } = bridge();
        fire('canvas:pointerdown', mouse('pointerdown', { buttons: 1 }));
        fire('canvas:lostpointercapture', mouse('lostpointercapture', { button: -1 }));
        // Nothing held anymore
        fire('canvas:pointercancel', mouse('pointercancel', { button: -1 }));

        expect(names()).toEqual(['pointerDown', 'pointerUp']);
    });

    test('leave the hovering to the mouse and the pen, a finger entering when touching', () => {
        const { fire, names } = bridge();
        const touch = { pointerId: 5, pointerType: 'touch', button: -1, clientX: 0, clientY: 0 };
        fire('canvas:pointerenter', { ...touch, type: 'pointerenter' });
        fire('canvas:pointerleave', { ...touch, type: 'pointerleave' });

        expect(names()).toEqual([]);
    });
});
