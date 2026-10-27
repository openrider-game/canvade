import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import { Control } from '../../src/canvade/event/keyboard/control';
import { KEYZ } from '../../src/canvade/event/keyboard/key-codes';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';
import { TouchGestures } from '../../src/canvade/event/touch/touch-gestures';
import { GamePointerEvent } from '../../src/canvade/event/types/dom-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { UIStructureDefinition } from '../../src/canvade/ui/ui-parser';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

/** Pointer event of a finger, by its pointer id, at a position on the page in CSS pixels. */
function finger(pointerId: number, clientX: number, clientY: number, type = 'pointerdown') {
    return {
        type,
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY,
        button: 0,
        buttons: 1,
        shiftKey: false,
        preventDefault: vi.fn(),
    } as unknown as PointerEvent;
}

/** Pointer event of the game of a finger, at a position in canvas pixels. */
function touchEvent(name: string, id: number, x: number, y: number) {
    return new CustomEvent<GamePointerEvent>(name, {
        detail: {
            name,
            consumed: false,
            pointerEvent: finger(id, x, y),
            position: new Vector(x, y),
            primary: false,
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
            release: (event) => output.push(`release ${event.pointerId} ${event.clientX}`),
            pinch: (name, center, scale) =>
                output.push(`${name} ${center.clientX} ${scale.toFixed(2)}`),
        });
        return {
            output,
            idle: () => touch.idle,
            start: (id: number, x: number) => touch.start(finger(id, x, 0)),
            move: (id: number, x: number) => touch.move(finger(id, x, 0, 'pointermove')),
            end: (id: number, x: number) => touch.end(finger(id, x, 0, 'pointerup')),
        };
    }

    test('let a single finger act alone until lifted', () => {
        const { output, idle, start, move, end } = gestures();

        expect(idle()).toBe(true);
        start(1, 10);
        move(1, 20);
        expect(idle()).toBe(false);
        end(1, 20);

        expect(idle()).toBe(true);
        expect(output).toEqual([]);
    });

    test('pinch with two fingers, a second finger releasing the first one', () => {
        const { output, idle, start, move, end } = gestures();

        start(1, 100);
        move(1, 110);
        start(2, 200);
        move(2, 310);
        // A third finger is ignored
        start(3, 500);
        move(3, 600);
        end(1, 110);
        // The finger left does nothing until lifted
        move(2, 400);
        end(2, 400);
        start(4, 50);

        expect(output).toEqual([
            // At its last position
            'release 1 110',
            'pinchStart 155 1.00',
            'pinchMove 210 2.22',
            'pinchEnd 210 2.22',
        ]);
        expect(idle()).toBe(false);
    });
});

describe('EventManager touch input', () => {
    function bridge(consume: (detail: GamePointerEvent, name: string) => boolean = () => false) {
        const { canvas, context } = createCanvasMock();
        const dispatched: Array<{ name: string; detail: GamePointerEvent }> = [];
        const dispatch = vi.fn((name: string, event: CustomEvent) => {
            dispatched.push({ name, detail: event.detail });
            if (consume(event.detail, name)) {
                event.detail.consumed = true;
            }
        });
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        /** The pointer events dispatched, as `name id primary`. */
        const pointers = () =>
            dispatched
                .filter(({ name }) => name.startsWith('pointer'))
                .map(
                    ({ name, detail }) =>
                        `${name} ${detail.pointerEvent.pointerId} ${detail.primary}`,
                );
        return {
            canvas,
            eventManager: new EventManager(context),
            stateManager,
            dispatched,
            pointers,
        };
    }

    test('dispatches a lone finger as the primary pointer, in canvas pixels', () => {
        const { canvas, eventManager, stateManager, dispatched, pointers } = bridge();
        const start = finger(7, 40, 25);

        eventManager.onPointerDown(start, stateManager as never);
        eventManager.onPointerMove(finger(7, 50, 25, 'pointermove'), stateManager as never);
        eventManager.onPointerUp(finger(7, 50, 25, 'pointerup'), stateManager as never);

        expect(start.preventDefault).toHaveBeenCalled();
        expect(canvas.focus).toHaveBeenCalled();
        expect(pointers()).toEqual([
            'pointerEnter 7 true',
            'pointerDown 7 true',
            'pointerMove 7 true',
            'pointerUp 7 true',
            'pointerLeave 7 true',
        ]);
        // 100x50 CSS pixels at (10, 5) for a canvas of 200x100
        expect(dispatched[1].detail.position).toEqual(new Vector(60, 40));
        expect(dispatched[1].detail.pointerEvent).toBe(start);
    });

    test('leaves the fingers taken by a layer to it, and pinches with two fingers', () => {
        const { eventManager, stateManager, dispatched, pointers } = bridge(
            (detail, name) => name === 'pointerDown' && detail.pointerEvent.pointerId === 1,
        );

        // Taken by a layer: the game does not act on it
        eventManager.onPointerDown(finger(1, 20, 10), stateManager as never);
        eventManager.onPointerMove(finger(1, 25, 10, 'pointermove'), stateManager as never);
        // Two untaken fingers: the first one acts alone until the second one joins it
        eventManager.onPointerDown(finger(2, 30, 20), stateManager as never);
        eventManager.onPointerDown(finger(3, 50, 20), stateManager as never);
        eventManager.onPointerMove(finger(3, 70, 20, 'pointermove'), stateManager as never);
        eventManager.onPointerUp(finger(2, 30, 20, 'pointerup'), stateManager as never);

        expect(pointers()).toEqual([
            'pointerEnter 1 true',
            'pointerDown 1 true',
            'pointerLeave 1 true',
            'pointerMove 1 false',
            'pointerEnter 2 true',
            'pointerDown 2 true',
            'pointerDown 3 false',
            'pointerUp 2 true',
            'pointerLeave 2 true',
            'pointerMove 3 false',
            'pointerUp 2 false',
        ]);
        const names = dispatched.map(({ name }) => name);
        expect(names.filter((name) => name.startsWith('pinch'))).toEqual([
            'pinchStart',
            'pinchMove',
            'pinchEnd',
        ]);
        const pinch = dispatched.find(({ name }) => name === 'pinchMove')?.detail as unknown as {
            center: Vector;
            scale: number;
        };
        expect(pinch.scale).toBe(2);
        expect(pinch.center).toEqual(new Vector(80, 30));
    });
});

describe('Fingers cancelled', () => {
    test('end as when lifted, the capture they lose then being ignored', () => {
        const { context } = createCanvasMock();
        const dispatch = vi.fn();
        const stateManager = { getCurrent: () => ({ getWorld: () => undefined, dispatch }) };
        const eventManager = new EventManager(context);

        eventManager.onPointerDown(finger(4, 20, 10), stateManager as never);
        eventManager.onPointerCancel(finger(4, 20, 10, 'pointercancel'), stateManager as never);
        eventManager.onPointerCancel(
            finger(4, 20, 10, 'lostpointercapture'),
            stateManager as never,
        );

        const names = dispatch.mock.calls.map(([name]) => name);
        expect(names).toEqual(['pointerEnter', 'pointerDown', 'pointerUp', 'pointerLeave']);
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
        layer.dispatch('pointerDown', touchEvent('pointerDown', 1, 10, 10));
        layer.dispatch('pointerDown', touchEvent('pointerDown', 2, 70, 10));
        // Both fingers on the right button, then the first one off the buttons
        layer.dispatch('pointerMove', touchEvent('pointerMove', 1, 80, 20));
        layer.dispatch('pointerMove', touchEvent('pointerMove', 1, 150, 80));
        layer.dispatch('pointerUp', touchEvent('pointerUp', 1, 150, 80));
        layer.dispatch('pointerUp', touchEvent('pointerUp', 2, 70, 10));

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
        const over = touchEvent('pointerDown', 1, 10, 10);
        const outside = touchEvent('pointerDown', 2, 150, 80);
        layer.dispatch('pointerDown', over);
        layer.dispatch('pointerDown', outside);
        const move = touchEvent('pointerMove', 1, 150, 80);
        layer.dispatch('pointerMove', move);

        expect(over.detail.consumed).toBe(true);
        expect(outside.detail.consumed).toBe(false);
        expect(move.detail.consumed).toBe(true);
    });

    test('keep the elements pressed through a new tree, the new ones taking over', () => {
        layer.dispatch('pointerDown', touchEvent('pointerDown', 1, 10, 10));
        buildUI(' (new)');
        layer.dispatch('pointerUp', touchEvent('pointerUp', 1, 10, 10));

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
            new CustomEvent<GamePointerEvent>(name, {
                detail: {
                    name,
                    consumed: false,
                    pointerEvent: { pointerId: 1, pointerType: 'mouse', button: 0 } as PointerEvent,
                    position: new Vector(70, 10),
                    primary: true,
                },
            });
        layer.dispatch('pointerDown', mouse('pointerDown'));
        layer.dispatch('pointerUp', mouse('pointerUp'));

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
