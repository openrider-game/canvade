import { afterEach, describe, expect, test, vi } from 'vitest';
import { DebugLevel, DebugUtils } from '../../src/canvade/debug.utils';
import { Game } from '../../src/canvade/game';
import { Layer } from '../../src/canvade/state/layer/layer';
import { State } from '../../src/canvade/state/state';
import { createCanvasMock } from '../helpers/canvas';

afterEach(() => {
    DebugUtils.setDebugLevel(DebugLevel.NONE);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Game initialization', () => {
    test('sizes the canvas for device pixel ratio and configures its context', () => {
        const { game, canvas, context, host, windowMock } = createGame(2);

        expect(host.appendChild).toHaveBeenCalledWith(canvas);
        expect(canvas.width).toBe(640);
        expect(canvas.height).toBe(360);
        expect(context.lineCap).toBe('round');
        expect(context.lineJoin).toBe('round');
        expect(context.font).toBe('bold 15px monospace');
        expect(windowMock.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(host.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(game.frameDuration).toBeCloseTo(1000 / 30);
    });
});

describe('Game loop', () => {
    test('runs fixed updates for elapsed frames and clamps long pauses', () => {
        const fixedUpdate = vi.fn();
        const update = vi.fn();
        const render = vi.fn();

        class LoopState extends State {
            protected initState(): void {
                this.subscribe('fixedUpdate', fixedUpdate);
                this.subscribe('update', update);
                this.subscribe('render', render);
            }

            protected initLayers(): Map<string, Layer> {
                return new Map();
            }
        }

        const { game, requestFrame } = createGame(1, [1000, 1035, 3535]);
        game.addStates(new Map([['loop', LoopState]]));
        game.pushState('loop');

        game.run();

        expect(requestFrame).toHaveBeenCalledOnce();
        expect(fixedUpdate).toHaveBeenCalledOnce();
        expect(update.mock.calls[0][0].detail).toMatchObject({ name: 'update', delta: 35 });
        expect(update.mock.calls[0][0].detail.progress).toBeCloseTo(0.05);
        expect(render).toHaveBeenCalledOnce();

        game.run();

        expect(fixedUpdate).toHaveBeenCalledTimes(2);
        expect(update.mock.calls[1][0].detail.delta).toBeCloseTo(game.frameDuration);
    });
});

describe('DebugUtils', () => {
    test('routes messages to the matching console method at the configured level', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        DebugUtils.setDebugLevel(DebugLevel.WARNING);

        DebugUtils.error('error');
        DebugUtils.warning('warning');
        DebugUtils.message('hidden');

        expect(error).toHaveBeenCalledWith('error');
        expect(warning).toHaveBeenCalledWith('warning');
        expect(log).not.toHaveBeenCalled();
    });
});

function createGame(
    devicePixelRatio: number,
    times = [1000],
): {
    game: Game;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    host: HTMLElement;
    windowMock: { addEventListener: ReturnType<typeof vi.fn> };
    requestFrame: ReturnType<typeof vi.fn>;
} {
    const { canvas, context } = createCanvasMock();
    const host = {
        clientWidth: 320,
        clientHeight: 180,
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
    } as unknown as HTMLElement;
    Object.defineProperty(canvas, 'parentElement', { value: host });

    const windowMock = { devicePixelRatio, addEventListener: vi.fn() };
    const requestFrame = vi.fn();
    vi.stubGlobal('document', {
        createElement: vi.fn(() => canvas),
        addEventListener: vi.fn(),
    });
    vi.stubGlobal('window', windowMock);
    vi.stubGlobal('performance', {
        now: vi.fn(() => times.shift() ?? 3535),
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('location', { href: '' });

    return {
        game: new Game(host, { updatesPerSecond: 30 }),
        canvas,
        context,
        host,
        windowMock,
        requestFrame,
    };
}
