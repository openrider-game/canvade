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
        const mouseEvent = {
            clientX: 40,
            clientY: 25,
            preventDefault: vi.fn(),
        } as unknown as MouseEvent;

        eventManager.onMouseDown(mouseEvent, stateManager as never);
        eventManager.onMouseMove(mouseEvent, stateManager as never);
        eventManager.onMouseUp(mouseEvent, stateManager as never);

        for (const [, event] of dispatch.mock.calls) {
            expect(event.detail.position).toEqual(new Vector(60, 40));
        }
        expect(canvas.focus).toHaveBeenCalledOnce();
        expect(mouseEvent.preventDefault).toHaveBeenCalledOnce();
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
        const mouseEvent = { clientX: 120, clientY: 60, preventDefault: vi.fn() };

        eventManager.onMouseDown(mouseEvent as unknown as MouseEvent, stateManager as never);

        expect(Mouse.mousePos).toEqual(new Vector(120, 60));
        expect(Mouse.lastClick).toEqual(new Vector(120, 60));
        expect(Mouse.worldPos).toEqual(new Vector(60, 30));
        expect(Mouse.lastWorldClick).toEqual(new Vector(60, 30));
    });

    test.each([
        ['onMouseEnter', 'mouseEnter', false],
        ['onMouseOut', 'mouseOut', false],
        ['onContextMenu', 'contextMenu', true],
    ] as const)('%s dispatches %s with the mouse position', (method, eventName, prevented) => {
        const { context } = createCanvasMock(200, 100, {
            left: 0,
            top: 0,
            width: 200,
            height: 100,
        });
        const dispatch = vi.fn();
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        const mouseEvent = { clientX: 30, clientY: 40, preventDefault: vi.fn() };

        new EventManager(context)[method](
            mouseEvent as unknown as MouseEvent,
            stateManager as never,
        );

        expect(dispatch).toHaveBeenCalledWith(
            eventName,
            expect.objectContaining({
                detail: expect.objectContaining({ position: new Vector(30, 40) }),
            }),
        );
        expect(mouseEvent.preventDefault).toHaveBeenCalledTimes(prevented ? 1 : 0);
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
        expect(canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
        expect(documentAddEventListener).toHaveBeenCalledWith(
            'visibilitychange',
            expect.any(Function),
        );
        expect(documentAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        // The focus loss, and the buttons released out of the canvas
        expect(canvas.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));

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
        vi.stubGlobal('MouseEvent', MouseEventDouble);

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
        fire('canvas:mousedown', new MouseEventDouble('mousedown', { button: 2, clientX: 40 }));
        expect(Keyboard.isDown('held-test')).toBe(true);
        dispatch.mockClear();

        fire('canvas:blur', {});

        expect(Keyboard.isDown('held-test')).toBe(false);
        expect(names()).toEqual(['keyboardUp', 'mouseUp']);
        // At the last position of the mouse, with the button held
        const mouseUp = dispatch.mock.calls[1][1].detail.mouseEvent;
        expect([mouseUp.button, mouseUp.clientX]).toEqual([2, 40]);

        // Nothing is held anymore: the window losing the focus next releases nothing
        dispatch.mockClear();
        fire('window:blur', {});
        expect(dispatch).not.toHaveBeenCalled();
        expect(canvas.focus).toHaveBeenCalled();
    });

    test('releases the inputs held when the page is hidden, before telling the states', () => {
        const { dispatch, fire, names } = bridge();
        fire('canvas:mousedown', new MouseEventDouble('mousedown'));
        dispatch.mockClear();
        (document as { visibilityState: string }).visibilityState = 'hidden';

        fire('document:visibilitychange', {});

        expect(names()).toEqual(['mouseUp', 'visibilityChange']);
    });

    test('releases a mouse button pressed on the canvas wherever it is released', () => {
        const { canvas, dispatch, fire, names } = bridge();
        fire('canvas:mousedown', new MouseEventDouble('mousedown'));
        dispatch.mockClear();

        // Released over the page: once, the canvas listener not seeing it
        fire('window:mouseup', { ...new MouseEventDouble('mouseup'), target: {} });
        // A button released over the page without being pressed on the canvas is not
        fire('window:mouseup', { ...new MouseEventDouble('mouseup', { button: 1 }), target: {} });
        // Released over the canvas: seen by its own listener, not twice
        fire('canvas:mousedown', new MouseEventDouble('mousedown'));
        fire('window:mouseup', { ...new MouseEventDouble('mouseup'), target: canvas });

        expect(names()).toEqual(['mouseUp', 'mouseDown']);
    });
});
