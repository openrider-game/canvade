import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import { Control } from '../../src/canvade/event/keyboard/control';
import { KEYZ } from '../../src/canvade/event/keyboard/key-codes';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';
import { TouchGestures } from '../../src/canvade/event/touch/touch-gestures';
import { GameMouseEvent, GameTouchEvent } from '../../src/canvade/event/types/dom-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { UIStructureDefinition } from '../../src/canvade/ui/ui-parser';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

/** Mouse events of the browser, missing from Node, keeping their options as properties. */
class MouseEventDouble extends Event {
    public constructor(type: string, init: Record<string, unknown> = {}) {
        super(type);
        Object.assign(this, init);
    }
}

/** DOM touch event with the given changed touches, as `[id, clientX, clientY]`. */
function domTouches(...touches: Array<[number, number, number]>): TouchEvent {
    return {
        preventDefault: vi.fn(),
        shiftKey: false,
        changedTouches: touches.map(([identifier, clientX, clientY]) => ({
            identifier,
            clientX,
            clientY,
        })),
    } as unknown as TouchEvent;
}

/** Touch event of the game, at a position in canvas pixels. */
function touchEvent(name: string, id: number, x: number, y: number) {
    return new CustomEvent<GameTouchEvent>(name, {
        detail: {
            name,
            consumed: false,
            touchEvent: domTouches([id, x, y]),
            id,
            position: new Vector(x, y),
        },
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Touch gestures', () => {
    function gestures() {
        const output: string[] = [];
        const touch = new TouchGestures({
            mouse: (type, point) => output.push(`${type} ${point.clientX}`),
            pinch: (name, center, scale) =>
                output.push(`${name} ${center.clientX} ${scale.toFixed(2)}`),
        });
        const event = domTouches();
        return {
            output,
            start: (id: number, x: number) => touch.start(id, { clientX: x, clientY: 0 }, event),
            move: (id: number, x: number) => touch.move(id, { clientX: x, clientY: 0 }, event),
            end: (id: number, x: number) => touch.end(id, { clientX: x, clientY: 0 }, event),
        };
    }

    test('turn a single finger into the main mouse button', () => {
        const { output, start, move, end } = gestures();

        start(1, 10);
        move(1, 20);
        end(1, 20);

        expect(output).toEqual(['mousedown 10', 'mousemove 20', 'mouseup 20']);
    });

    test('pinch with two fingers, a second finger ending the mouse press', () => {
        const { output, start, move, end } = gestures();

        start(1, 100);
        start(2, 200);
        move(2, 300);
        // A third finger is ignored
        start(3, 500);
        move(3, 600);
        end(1, 100);
        // The finger left does nothing until lifted
        move(2, 400);
        end(2, 400);
        start(4, 50);

        expect(output).toEqual([
            'mousedown 100',
            'mouseup 100',
            'pinchStart 150 1.00',
            'pinchMove 200 2.00',
            'pinchEnd 200 2.00',
            'mousedown 50',
        ]);
    });
});

describe('EventManager touch input', () => {
    function bridge(consume: (name: string) => boolean = () => false) {
        vi.stubGlobal('MouseEvent', MouseEventDouble);
        const { canvas, context } = createCanvasMock();
        const dispatched: Array<{ name: string; detail: GameTouchEvent & GameMouseEvent }> = [];
        const dispatch = vi.fn((name: string, event: CustomEvent) => {
            dispatched.push({ name, detail: event.detail });
            if (consume(name)) {
                event.detail.consumed = true;
            }
        });
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        return { canvas, eventManager: new EventManager(context), stateManager, dispatched };
    }

    test('dispatches each touch in canvas pixels, a touch left untaken acting as the mouse', () => {
        const { canvas, eventManager, stateManager, dispatched } = bridge();
        const start = domTouches([7, 40, 25]);

        eventManager.onTouchStart(start, stateManager as never);
        eventManager.onTouchEnd(domTouches([7, 40, 25]), stateManager as never);

        expect(start.preventDefault).toHaveBeenCalled();
        expect(canvas.focus).toHaveBeenCalled();
        expect(dispatched.map(({ name }) => name)).toEqual([
            'touchStart',
            'mouseEnter',
            'mouseMove',
            'mouseDown',
            'touchEnd',
            'mouseUp',
            'mouseOut',
        ]);
        // 100x50 CSS pixels at (10, 5) for a canvas of 200x100
        expect(dispatched[0].detail.id).toBe(7);
        expect(dispatched[0].detail.position).toEqual(new Vector(60, 40));
        expect(dispatched[3].detail.position).toEqual(new Vector(60, 40));
        expect(dispatched[3].detail.mouseEvent.button).toBe(0);
    });

    test('leaves the touches taken by a layer to it, and pinches with two fingers', () => {
        const { eventManager, stateManager, dispatched } = bridge(
            (name) => name === 'touchStart' && dispatched.length === 1,
        );

        // Taken by a layer
        eventManager.onTouchStart(domTouches([1, 20, 10]), stateManager as never);
        expect(dispatched.map(({ name }) => name)).toEqual(['touchStart']);

        // Two untaken fingers
        eventManager.onTouchStart(domTouches([2, 30, 20], [3, 50, 20]), stateManager as never);
        eventManager.onTouchMove(domTouches([3, 70, 20]), stateManager as never);
        const names = dispatched.map(({ name }) => name);
        expect(names.filter((name) => name.startsWith('pinch'))).toEqual([
            'pinchStart',
            'pinchMove',
        ]);
        const pinch = dispatched.at(-1)?.detail as unknown as { center: Vector; scale: number };
        expect(pinch.scale).toBe(2);
        expect(pinch.center).toEqual(new Vector(80, 30));
    });
});

describe('UI elements under the fingers', () => {
    let layer: TestLayer;
    let log: string[];

    /** Two buttons of 50x50 side by side, logging their events, and an input under them. */
    function buildUI(suffix = ''): void {
        const events = (name: string) => ({
            press: () => log.push(`press ${name}${suffix}`),
            release: () => log.push(`release ${name}${suffix}`),
            click: () => log.push(`click ${name}${suffix}`),
        });
        const structure: UIStructureDefinition = [
            { 'button.left': { events: events('left') } },
            { 'button.right': { events: events('right') } },
        ];
        layer.uiRenderer.setUI(structure, {
            '.left': { position: 'absolute', x: 0, y: 0, width: 50, height: 50 },
            '.right': { position: 'absolute', x: 60, y: 0, width: 50, height: 50 },
        });
        layer.uiRenderer.render(createCanvasMock(200, 100).context);
    }

    beforeEach(() => {
        layer = new TestLayer();
        log = [];
        buildUI();
    });

    test('press an element for each finger, sliding from one to the next', () => {
        layer.dispatch('touchStart', touchEvent('touchStart', 1, 10, 10));
        layer.dispatch('touchStart', touchEvent('touchStart', 2, 70, 10));
        // Both fingers on the right button, then the first one off the buttons
        layer.dispatch('touchMove', touchEvent('touchMove', 1, 80, 20));
        layer.dispatch('touchMove', touchEvent('touchMove', 1, 150, 80));
        layer.dispatch('touchEnd', touchEvent('touchEnd', 1, 150, 80));
        layer.dispatch('touchEnd', touchEvent('touchEnd', 2, 70, 10));

        expect(log).toEqual([
            'press left',
            'press right',
            'release left',
            'release right',
            // A tap: released over the element it started on
            'click right',
        ]);
    });

    test('consume the touches starting over an element only', () => {
        const over = touchEvent('touchStart', 1, 10, 10);
        const outside = touchEvent('touchStart', 2, 150, 80);
        layer.dispatch('touchStart', over);
        layer.dispatch('touchStart', outside);
        const move = touchEvent('touchMove', 1, 150, 80);
        layer.dispatch('touchMove', move);

        expect(over.detail.consumed).toBe(true);
        expect(outside.detail.consumed).toBe(false);
        expect(move.detail.consumed).toBe(true);
    });

    test('keep the elements pressed through a new tree, the new ones taking over', () => {
        layer.dispatch('touchStart', touchEvent('touchStart', 1, 10, 10));
        buildUI(' (new)');
        layer.dispatch('touchEnd', touchEvent('touchEnd', 1, 10, 10));

        expect(log).toEqual([
            'press left',
            // In the same frame, once the new tree is laid out
            'release left',
            'press left (new)',
            'release left (new)',
            'click left (new)',
        ]);
    });

    test('press an element with the main mouse button too', () => {
        const mouse = (name: string) =>
            new CustomEvent<GameMouseEvent>(name, {
                detail: {
                    name,
                    consumed: false,
                    mouseEvent: { button: 0 } as MouseEvent,
                    position: new Vector(70, 10),
                },
            });
        layer.dispatch('mouseDown', mouse('mouseDown'));
        layer.dispatch('mouseUp', mouse('mouseUp'));

        expect(log).toEqual(['press right', 'click right', 'release right']);
    });
});

describe('Keyboard controls held without their key', () => {
    beforeEach(() => {
        vi.stubGlobal('document', { dispatchEvent: vi.fn() });
        Keyboard.registerControl('Turn', new Control(KEYZ, undefined, true));
    });

    test('are down until released, dispatching the control events', () => {
        Keyboard.press('Turn');
        Keyboard.press('Turn');
        // A fire once control is reported once per press
        expect(Keyboard.isDown('Turn')).toBe(true);
        expect(Keyboard.isDown('Turn')).toBe(false);
        Keyboard.release('Turn');
        Keyboard.press('Turn');
        expect(Keyboard.isDown('Turn')).toBe(true);
        Keyboard.release('Turn');
        // Unknown controls are ignored
        Keyboard.press('Unknown');

        const events = vi.mocked(document.dispatchEvent).mock.calls.map(([event]) => {
            const { detail, type } = event as CustomEvent;
            return `${type} ${detail.key} ${detail.keyboardEvent}`;
        });
        expect(events).toEqual([
            'keyboarddown Turn null',
            'keyboardup Turn null',
            'keyboarddown Turn null',
            'keyboardup Turn null',
        ]);
    });
});
