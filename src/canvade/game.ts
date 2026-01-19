import { DebugLevel, DebugUtils } from './debug.utils';
import { EventManager } from './event/event-manager';
import { State, StateClass } from './state/state';
import { StateManager } from './state/state-manager';

export type GameOptions = {
    updatesPerSecond: number;
    debugLevel: DebugLevel;
};

const defaultOptions = {
    debugLevel: DebugLevel.NONE,
    updatesPerSecond: 50,
};

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    public frameDuration: number;
    private lastTime: number;
    private progress: number;

    private stateManager: StateManager;
    private eventManager: EventManager;

    public constructor(hostElement: HTMLElement, options: Partial<GameOptions> = defaultOptions) {
        if (!document.createElement('canvas').getContext) {
            location.href = 'https://browsehappy.com/';
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Cannot retrieve canvas context');
        }

        this.canvas = canvas;
        this.ctx = ctx;

        hostElement.appendChild(canvas);

        hostElement.addEventListener('resize', () => this.setCanvasSize());
        window.addEventListener('resize', () => this.setCanvasSize());
        this.setCanvasSize();

        const mergedOptions = { ...defaultOptions, ...options };

        this.lastTime = performance.now();
        this.frameDuration = 1000 / mergedOptions.updatesPerSecond;
        this.progress = 0;

        this.stateManager = new StateManager();
        this.eventManager = new EventManager(ctx);

        this.eventManager.bridgeDOMEvents(this.stateManager);

        DebugUtils.setDebugLevel(mergedOptions.debugLevel);

        this.postInit(mergedOptions);
    }

    private setCanvasSize() {
        this.canvas.width = this.canvas.parentElement!.clientWidth;
        this.canvas.height = this.canvas.parentElement!.clientHeight;

        this.setContextProperties(this.ctx);
    }

    private setContextProperties(ctx: CanvasRenderingContext2D) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.font = 'bold 15px monospace';
    }

    protected postInit(options: GameOptions): void {
        DebugUtils.trace(options);
    }

    public addStates(states: Map<string, StateClass<State>>): void {
        for (const [name, state] of states) {
            this.stateManager.addState(state, name);
        }
    }

    public pushState(name: string) {
        this.stateManager.push(name);
    }

    public run(): void {
        requestAnimationFrame(() => this.run());

        const now = performance.now();
        let delta = now - this.lastTime;

        if (delta > 1000) {
            delta = this.frameDuration;
        }

        this.progress += delta / this.frameDuration;
        this.lastTime = now;

        while (this.progress >= 1) {
            this.stateManager.fixedUpdate();
            this.progress--;
        }

        this.stateManager.update(this.progress, delta);
        this.stateManager.render(this.ctx);
    }
}
