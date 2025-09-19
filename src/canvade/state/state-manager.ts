import { LifeCycleFunctions } from '../core/lifecycle-functions.interface';
import { State } from './state';

export class StateManager implements LifeCycleFunctions {
    private states: Map<string, State>;
    private stateStack: State[];

    public constructor() {
        this.states = new Map<string, State>();
        this.stateStack = [];
    }

    public push(name: string): void {
        const state = this.getState(name);

        if (state) {
            state.onEnter();
            this.getCurrent()?.onLeave();
            this.stateStack.push(state);
        }
    }

    public pop(): State | null | undefined {
        if (this.stateStack.length) {
            this.getCurrent()?.onLeave();
            const poppedState = this.stateStack.pop();
            this.getCurrent()?.onEnter();
            return poppedState;
        }

        return null;
    }

    public addState<T extends State>(stateClass: new (x: StateManager) => T, name: string): void {
        const state = new stateClass(this);
        this.states.set(name, state);
    }

    public getState(name: string): State | undefined {
        return this.states.get(name);
    }

    public fixedUpdate(): void {
        if (this.stateStack.length) {
            this.getCurrent()?.fixedUpdate();
        }
    }

    public update(progress: number, delta: number): void {
        if (this.stateStack.length) {
            this.getCurrent()?.update(progress, delta);
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (this.stateStack.length) {
            this.getCurrent()?.render(ctx);
        }
    }

    public getCurrent(): State | undefined {
        if (this.stateStack.length) {
            return this.stateStack[this.stateStack.length - 1];
        }

        return;
    }
}
