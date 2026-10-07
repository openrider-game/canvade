import { describe, expect, test, vi } from 'vitest';
import Vector from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import { GameMouseEvent } from '../../src/canvade/event/types/dom-events';
import { GameRenderEvent } from '../../src/canvade/event/types/game-loop-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { State } from '../../src/canvade/state/state';
import { UIButton } from '../../src/canvade/ui/elements/ui-button';
import { UIManager } from '../../src/canvade/ui/ui-manager';
import { buildUIElementTree } from '../../src/canvade/ui/ui-parser';
import { UIProperty } from '../../src/canvade/ui/properties/ui-property.type';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

class TestState extends State {
    public static testLayers = new Map<string, Layer>();

    protected initState(): void {}

    protected initLayers(): Map<string, Layer> {
        return TestState.testLayers;
    }
}

describe('UI rendering and interaction', () => {
    test('button focus and active colors default to its background color', () => {
        const fillColors: string[] = [];
        const ctx = createCanvasMock().context;
        ctx.fill = () => fillColors.push(ctx.fillStyle as string);
        const button = new UIButton([], { backgroundColor: new UIProperty('#123456') });
        const bounds = { x: 0, y: 0, width: 100, height: 50 };

        button.setFocusedElement(button);
        button.render(ctx, bounds);
        button.setActiveElement(button);
        button.render(ctx, bounds);

        expect(fillColors).toEqual(['#123456', '#123456']);
    });

    test('button uses explicit focus and active colors when provided', () => {
        const fillColors: string[] = [];
        const ctx = createCanvasMock().context;
        ctx.fill = () => fillColors.push(ctx.fillStyle as string);
        const button = new UIButton([], {
            backgroundColor: new UIProperty('#123456'),
            focusBackgroundColor: new UIProperty('#654321'),
            activeBackgroundColor: new UIProperty('#abcdef'),
        });
        const bounds = { x: 0, y: 0, width: 100, height: 50 };

        button.setFocusedElement(button);
        button.render(ctx, bounds);
        button.setActiveElement(button);
        button.render(ctx, bounds);

        expect(fillColors).toEqual(['#654321', '#abcdef']);
    });

    test('v resolves ordered property fallbacks from rest keys', () => {
        const button = new UIButton([], { backgroundColor: new UIProperty('#123456') });

        expect(button.v('activeBackgroundColor', 'focusBackgroundColor', 'backgroundColor')).toBe(
            '#123456',
        );
    });

    test('clips child rendering to the parent content bounds', () => {
        const root = buildUIElementTree([{ 'container.parent': ['button.child'] }], {
            '.parent': { width: 60, height: 40 },
            '.child': { width: 180, height: 80 },
        });
        const ctx = createCanvasMock().context;

        root.render(ctx);

        expect(ctx.clip).toHaveBeenCalled();
        expect(ctx.rect).toHaveBeenCalledWith(0, 0, 60, 40);
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalledWith('Button', 90, 40);
    });

    test('stops dispatch behind a layer when its UI consumes the click', () => {
        const behind = new TestLayer();
        const front = new TestLayer();
        const frontClick = vi.fn();
        const frontRoot = buildUIElementTree([
            {
                'button.front': {
                    events: { click: frontClick },
                },
            },
        ]);
        const behindMouseUp = vi.fn();
        behind.subscribe('mouseUp', behindMouseUp);
        front.uiRenderer.setRootElement(frontRoot);
        TestState.testLayers = new Map([
            ['behind', behind],
            ['front', front],
        ]);
        const state = new TestState();
        const ctx = createCanvasMock().context;

        state.dispatch(
            'render',
            new CustomEvent<GameRenderEvent>('render', {
                detail: { name: 'render', consumed: false, ctx },
            }),
        );
        const mouseDown = new CustomEvent<GameMouseEvent>('mouseDown', {
            detail: {
                name: 'mouseDown',
                consumed: false,
                mouseEvent: { clientX: 50, clientY: 50 } as MouseEvent,
                position: new Vector(50, 50),
            },
        });
        state.dispatch('mouseDown', mouseDown);
        expect(frontRoot.children[0].isActive()).toBe(true);
        expect(frontRoot.children[0].isFocused()).toBe(true);
        const mouseUp = new CustomEvent<GameMouseEvent>('mouseUp', {
            detail: {
                name: 'mouseUp',
                consumed: false,
                mouseEvent: { clientX: 50, clientY: 50 } as MouseEvent,
                position: new Vector(50, 50),
            },
        });

        state.dispatch('mouseUp', mouseUp);

        expect(frontClick).toHaveBeenCalledOnce();
        expect(mouseUp.detail.consumed).toBe(true);
        expect(behindMouseUp).not.toHaveBeenCalled();
        expect(frontRoot.children[0].isActive()).toBe(false);
        expect(frontRoot.children[0].isFocused()).toBe(true);
    });

    test('event manager stores translated canvas-pixel coordinates on mouse-up', () => {
        const ctx = createCanvasMock().context;
        const dispatch = vi.fn();
        const stateManager = {
            getCurrent: () => ({
                getWorld: () => undefined,
                dispatch,
            }),
        };
        const eventManager = new EventManager(ctx);
        const mouseEvent = {
            clientX: 40,
            clientY: 25,
            preventDefault: vi.fn(),
        } as unknown as MouseEvent;

        eventManager.onMouseUp(mouseEvent, stateManager as never);

        const dispatchedEvent = dispatch.mock.calls[0][1] as CustomEvent<GameMouseEvent>;
        expect(dispatchedEvent.detail.position).toEqual(new Vector(60, 40));
    });

    test('updates hover state from the position included in mouse-move events', () => {
        const layer = new TestLayer();
        const root = buildUIElementTree([
            {
                'button.hoverable': {
                    events: { click: vi.fn() },
                },
            },
        ]);
        layer.uiRenderer.setRootElement(root);
        layer.uiRenderer.render(createCanvasMock().context);
        const hoverIn = vi.fn();
        root.children[0].subscribe('hoverIn', hoverIn);
        const mouseMove = new CustomEvent<GameMouseEvent>('mouseMove', {
            detail: {
                name: 'mouseMove',
                consumed: false,
                mouseEvent: { clientX: 20, clientY: 20 } as MouseEvent,
                position: new Vector(20, 20),
            },
        });

        layer.uiRenderer.dispatch('mouseMove', mouseMove);

        expect(root.children[0].isHovered()).toBe(true);
        expect(hoverIn).toHaveBeenCalledOnce();
        expect(mouseMove.detail.consumed).toBe(true);
    });

    test('does not activate a sibling when release occurs over a different button', () => {
        const startClick = vi.fn();
        const settingsClick = vi.fn();
        const layer = new TestLayer();
        const root = layer.uiRenderer.setUI(
            [
                {
                    'container.root': [
                        { 'button.start': { events: { click: startClick } } },
                        { 'button.settings': { events: { click: settingsClick } } },
                    ],
                },
            ],
            {
                '.root': { width: 200, height: 100, flexDirection: 'row', gap: 10 },
                '.start': { width: 80, height: 40 },
                '.settings': { x: -70, width: 80, height: 40 },
            },
        );
        const ctx = createCanvasMock().context;
        layer.uiRenderer.render(ctx);
        expect(root.getBounds()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
        expect(root.children[0].getBounds()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
        const content = root.children[0];
        expect(content.children[0].getBounds()).toEqual({ x: 0, y: 0, width: 80, height: 40 });
        const mouseDown = new CustomEvent<GameMouseEvent>('mouseDown', {
            detail: {
                name: 'mouseDown',
                consumed: false,
                mouseEvent: { clientX: 10, clientY: 20 } as MouseEvent,
                position: new Vector(10, 20),
            },
        });
        layer.uiRenderer.dispatch('mouseDown', mouseDown);
        expect(content.children[0].isActive()).toBe(true);
        const mouseUp = new CustomEvent<GameMouseEvent>('mouseUp', {
            detail: {
                name: 'mouseUp',
                consumed: false,
                mouseEvent: { clientX: 100, clientY: 20 } as MouseEvent,
                position: new Vector(100, 20),
            },
        });

        layer.uiRenderer.dispatch('mouseUp', mouseUp);

        expect(startClick).not.toHaveBeenCalled();
        expect(settingsClick).not.toHaveBeenCalled();
        expect(mouseUp.detail.consumed).toBe(true);
        expect(root.isActive()).toBe(false);

        const matchingMouseDown = new CustomEvent<GameMouseEvent>('mouseDown', {
            detail: {
                name: 'mouseDown',
                consumed: false,
                mouseEvent: { clientX: 10, clientY: 20 } as MouseEvent,
                position: new Vector(10, 20),
            },
        });
        const matchingMouseUp = new CustomEvent<GameMouseEvent>('mouseUp', {
            detail: {
                name: 'mouseUp',
                consumed: false,
                mouseEvent: { clientX: 10, clientY: 20 } as MouseEvent,
                position: new Vector(10, 20),
            },
        });

        layer.uiRenderer.dispatch('mouseDown', matchingMouseDown);
        layer.uiRenderer.dispatch('mouseUp', matchingMouseUp);

        expect(startClick).toHaveBeenCalledOnce();
        expect(startClick).toHaveBeenCalledWith(10, 20, content.children[0]);
        expect(settingsClick).not.toHaveBeenCalled();

        const overlapMouseDown = new CustomEvent<GameMouseEvent>('mouseDown', {
            detail: {
                name: 'mouseDown',
                consumed: false,
                mouseEvent: { clientX: 30, clientY: 20 } as MouseEvent,
                position: new Vector(30, 20),
            },
        });
        const overlapMouseUp = new CustomEvent<GameMouseEvent>('mouseUp', {
            detail: {
                name: 'mouseUp',
                consumed: false,
                mouseEvent: { clientX: 30, clientY: 20 } as MouseEvent,
                position: new Vector(30, 20),
            },
        });

        layer.uiRenderer.dispatch('mouseDown', overlapMouseDown);
        layer.uiRenderer.dispatch('mouseUp', overlapMouseUp);

        expect(startClick).toHaveBeenCalledOnce();
        expect(settingsClick).toHaveBeenCalledOnce();
        expect(settingsClick).toHaveBeenCalledWith(30, 20, content.children[1]);
    });

    test('clears focus and active state in the previous layer UI manager', () => {
        const backgroundManager = new UIManager();
        const foregroundManager = new UIManager();
        const backgroundRoot = backgroundManager.setUI(['button.background']);
        const foregroundRoot = foregroundManager.setUI(['button.foreground']);
        const ctx = createCanvasMock().context;
        backgroundManager.render(ctx);
        foregroundManager.render(ctx);
        const createMouseDown = () =>
            new CustomEvent<GameMouseEvent>('mouseDown', {
                detail: {
                    name: 'mouseDown',
                    consumed: false,
                    mouseEvent: { clientX: 20, clientY: 20 } as MouseEvent,
                    position: new Vector(20, 20),
                },
            });

        backgroundManager.dispatch('mouseDown', createMouseDown());
        expect(backgroundRoot.children[0].isFocused()).toBe(true);
        expect(backgroundRoot.children[0].isActive()).toBe(true);

        foregroundManager.dispatch('mouseDown', createMouseDown());

        expect(backgroundRoot.children[0].isFocused()).toBe(false);
        expect(backgroundRoot.children[0].isActive()).toBe(false);
        expect(foregroundRoot.children[0].isFocused()).toBe(true);
        expect(foregroundRoot.children[0].isActive()).toBe(true);
    });
});
