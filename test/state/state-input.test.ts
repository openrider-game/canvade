import { describe, expect, test, vi } from 'vitest';
import { EventFactory } from '../../src/canvade/event/event-factory';
import { Vector } from '../../src/canvade/core/math/vector';
import { Layer } from '../../src/canvade/state/layer/layer';
import { State } from '../../src/canvade/state/state';
import { createCanvasMock } from '../helpers/canvas';

const INPUT_EVENTS = [
    'mouseDown',
    'mouseUp',
    'mouseMove',
    'scroll',
    'mouseEnter',
    'mouseOut',
    'contextMenu',
    'keyDown',
    'keyUp',
    'keyboardDown',
    'keyboardUp',
] as const;

/** Layer recording the events it receives, optionally consuming the input. */
class RecordingLayer extends Layer {
    public readonly received: string[] = [];
    public consume = false;

    public initLayer(): void {}

    public listen(eventName: string): void {
        this.subscribe(
            eventName as never,
            ((e?: CustomEvent<{ consumed: boolean }>) => {
                this.received.push(eventName);
                if (this.consume && e) {
                    e.detail.consumed = true;
                }
            }) as never,
        );
    }
}

function createState(layers: RecordingLayer[]): State {
    return new (class extends State {
        protected initState(): void {}

        protected initLayers(): Map<string, Layer> {
            return new Map(layers.map((layer, index) => [`layer-${index}`, layer]));
        }
    })();
}

function inputEvent(name: string) {
    return EventFactory.createGameEvent({
        name,
        consumed: false,
        position: new Vector(),
        mouseEvent: { button: 0 } as MouseEvent,
    });
}

describe('State input dispatch', () => {
    test.each(INPUT_EVENTS)('forwards %s from the top layer down', (eventName) => {
        const bottom = new RecordingLayer();
        const top = new RecordingLayer();
        bottom.listen(eventName);
        top.listen(eventName);
        const order: RecordingLayer[] = [];
        bottom.subscribe(eventName as never, (() => order.push(bottom)) as never);
        top.subscribe(eventName as never, (() => order.push(top)) as never);

        createState([bottom, top]).dispatch(eventName as never, inputEvent(eventName) as never);

        expect(order).toEqual([top, bottom]);
    });

    test.each(INPUT_EVENTS)('stops %s at the layer consuming it', (eventName) => {
        const bottom = new RecordingLayer();
        const top = new RecordingLayer();
        bottom.listen(eventName);
        top.listen(eventName);
        top.consume = true;

        createState([bottom, top]).dispatch(eventName as never, inputEvent(eventName) as never);

        expect(top.received).toEqual([eventName]);
        expect(bottom.received).toEqual([]);
    });

    test('forwards the lifecycle events to every layer, whatever they do', () => {
        const bottom = new RecordingLayer();
        const top = new RecordingLayer();
        for (const layer of [bottom, top]) {
            for (const eventName of ['enter', 'leave', 'visibilityChange', 'fixedUpdate']) {
                layer.listen(eventName);
            }
            layer.consume = true;
        }
        const state = createState([bottom, top]);

        state.dispatch('enter');
        state.dispatch('visibilityChange');
        state.dispatch('fixedUpdate');
        state.dispatch('leave');

        const expected = ['enter', 'visibilityChange', 'fixedUpdate', 'leave'];
        expect(bottom.received).toEqual(expected);
        expect(top.received).toEqual(expected);
    });

    test('clears the canvas, then renders the layers from the bottom up', () => {
        const { context } = createCanvasMock();
        const order: string[] = [];
        const bottom = new RecordingLayer();
        const top = new RecordingLayer();
        vi.mocked(context.clearRect).mockImplementation(() => order.push('clear'));
        bottom.subscribe('render', () => order.push('bottom'));
        top.subscribe('render', () => order.push('top'));
        const update = vi.fn();
        top.subscribe('update', update);
        const state = createState([bottom, top]);

        state.dispatch(
            'update',
            EventFactory.createGameEvent({
                name: 'update',
                consumed: false,
                progress: 0.5,
                delta: 16,
            }),
        );
        state.dispatch(
            'render',
            EventFactory.createGameEvent({ name: 'render', consumed: false, ctx: context }),
        );

        expect(order).toEqual(['clear', 'bottom', 'top']);
        expect(update.mock.calls[0][0].detail).toMatchObject({ progress: 0.5, delta: 16 });
    });

    test('keeps its world for the mouse world positions', () => {
        const state = createState([]);
        const world = { camera: new Vector(), zoomFactor: 1 } as never;

        expect(state.getWorld()).toBeUndefined();
        state.setWorld(world);
        expect(state.getWorld()).toBe(world);
    });
});

describe('Layer user interface', () => {
    test('gives the mouse events to its interface until they are consumed', () => {
        const layer = new RecordingLayer();
        const click = vi.fn();
        const root = layer.uiRenderer.setUI([{ 'button.ok': { events: { click } } }], {
            '.ok': { x: 10, y: 10, width: 50, height: 20 },
        });
        root.render(createCanvasMock(200, 100).context);
        const at = (name: string, x: number, y: number) =>
            EventFactory.createGameEvent({
                name,
                consumed: false,
                position: new Vector(x, y),
                mouseEvent: { button: 0 } as MouseEvent,
            });

        const down = at('mouseDown', 20, 20);
        layer.dispatch('mouseDown', down);
        const up = at('mouseUp', 20, 20);
        layer.dispatch('mouseUp', up);

        expect(down.detail.consumed).toBe(true);
        expect(up.detail.consumed).toBe(true);
        expect(click).toHaveBeenCalledOnce();

        // An event consumed by an upper layer does not reach the interface
        const consumed = at('mouseDown', 20, 20);
        consumed.detail.consumed = true;
        layer.dispatch('mouseDown', consumed);
        layer.dispatch('mouseUp', at('mouseUp', 20, 20));
        expect(click).toHaveBeenCalledOnce();
    });
});
