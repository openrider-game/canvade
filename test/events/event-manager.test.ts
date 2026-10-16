import { afterEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
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
        vi.stubGlobal('document', { addEventListener: documentAddEventListener });

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
