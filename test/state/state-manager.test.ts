import { describe, expect, test, vi } from 'vitest';
import { Layer } from '../../src/canvade/state/layer/layer';
import { State } from '../../src/canvade/state/state';
import { StateManager } from '../../src/canvade/state/state-manager';

class EmptyLayer extends Layer {
    initLayer(): void {}
}

class TestState extends State {
    protected initState(): void {}

    protected initLayers(): Map<string, Layer> {
        return new Map([['default', new EmptyLayer()]]);
    }
}

describe('StateManager', () => {
    test('pushes and pops states while firing enter and leave lifecycle events', () => {
        const manager = new StateManager();
        manager.addState(TestState, 'game');
        manager.addState(TestState, 'paused');

        const game = manager.getState('game')!;
        const paused = manager.getState('paused')!;
        const gameEnter = vi.fn();
        const gameLeave = vi.fn();
        const pausedEnter = vi.fn();
        const pausedLeave = vi.fn();

        game.subscribe('enter', gameEnter);
        game.subscribe('leave', gameLeave);
        paused.subscribe('enter', pausedEnter);
        paused.subscribe('leave', pausedLeave);

        manager.push('game');
        expect(manager.getCurrent()).toBe(game);
        expect(gameEnter).toHaveBeenCalledOnce();

        manager.push('paused');
        expect(manager.getCurrent()).toBe(paused);
        expect(gameLeave).toHaveBeenCalledOnce();
        expect(pausedEnter).toHaveBeenCalledOnce();

        expect(manager.pop()).toBe(paused);
        expect(pausedLeave).toHaveBeenCalledOnce();
        expect(gameEnter).toHaveBeenCalledTimes(2);
        expect(manager.getCurrent()).toBe(game);
    });

    test('dispatches updates and renders only to the active state', () => {
        const manager = new StateManager();
        manager.addState(TestState, 'active');

        const active = manager.getState('active')!;
        const updateListener = vi.fn();
        const renderListener = vi.fn();
        const context = createRenderContext();
        active.subscribe('update', updateListener);
        active.subscribe('render', renderListener);

        manager.push('active');
        manager.update(0.75, 16);
        manager.render(context);

        expect(updateListener.mock.calls[0][0].detail).toMatchObject({
            name: 'update',
            progress: 0.75,
            delta: 16,
        });
        expect(renderListener).toHaveBeenCalledOnce();
        expect(context.clearRect).toHaveBeenCalledOnce();

        manager.pop();
        manager.update(1, 32);
        manager.render(context);
        expect(updateListener).toHaveBeenCalledOnce();
        expect(renderListener).toHaveBeenCalledOnce();
    });
});

function createRenderContext(): CanvasRenderingContext2D {
    const canvas = { width: 320, height: 180 } as HTMLCanvasElement;
    return { canvas, clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;
}
