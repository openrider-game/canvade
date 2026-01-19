import { LifeCycleFunctions } from '../core/lifecycle-functions.interface';
import { EventFactory } from '../event/event-factory';
import { State, StateClass } from './state';

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
            state.dispatch('enter');
            this.getCurrent()?.dispatch('leave');
            this.stateStack.push(state);
        }
    }

    public pop(): State | null | undefined {
        if (this.stateStack.length) {
            this.getCurrent()?.dispatch('leave');
            const poppedState = this.stateStack.pop();
            this.getCurrent()?.dispatch('enter');
            return poppedState;
        }

        return null;
    }

    public addState<T extends State>(stateClass: StateClass<T>, name: string): void {
        const state = new stateClass();
        this.states.set(name, state);
    }

    public getState(name: string): State | undefined {
        return this.states.get(name);
    }

    public fixedUpdate(): void {
        if (this.stateStack.length) {
            this.getCurrent()?.dispatch('fixedUpdate');
        }
    }

    public update(progress: number, delta: number): void {
        if (this.stateStack.length) {
            const updateEvent = EventFactory.createGameEvent({
                name: 'update',
                propagationStopped: false,
                progress,
                delta,
            });

            this.getCurrent()?.dispatch('update', updateEvent);
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (this.stateStack.length) {
            const renderEvent = EventFactory.createGameEvent({
                name: 'render',
                propagationStopped: false,
                ctx,
            });

            this.getCurrent()?.dispatch('render', renderEvent);
        }
    }

    public getCurrent(): State | undefined {
        if (this.stateStack.length) {
            return this.stateStack[this.stateStack.length - 1];
        }

        return;
    }
}
