import Vector from '../core/math/vector';
import { StateManager } from '../state/state-manager';
import { EventFactory } from './event-factory';
import { Keyboard, KeyboardEventPayload } from './keyboard/keyboard';
import { Mouse } from './mouse/mouse';

export class EventManager {
    constructor(
        private canvas: HTMLCanvasElement,
        private stateManager: StateManager,
    ) {}

    bridgeDOMEvents() {
        this.canvas.tabIndex = 0;
        this.canvas.focus();

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this.onScroll(e));

        this.canvas.addEventListener('mouseenter', (e) => this.onMouseEnter(e));
        this.canvas.addEventListener('mouseout', (e) => this.onMouseOut(e));

        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));

        document.addEventListener('visibilitychange', () => this.onVisibilityChange());

        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('keyboarddown', (e) =>
            this.onKeyboardDown(e as CustomEvent<KeyboardEventPayload>),
        );
        document.addEventListener('keyboardup', (e) =>
            this.onKeyboardUp(e as CustomEvent<KeyboardEventPayload>),
        );
    }

    public onMouseDown(e: MouseEvent): boolean {
        e.preventDefault();
        this.canvas.focus();

        this.setMousePos(e);
        Mouse.lastClick.set(Mouse.mousePos);

        // if(world) {
        //     Mouse.lastWorldClick.set(Mouse.worldPos);
        // }

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseDown',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('mouseDown', gameMouseEvent);

        return true;
    }

    public onMouseUp(e: MouseEvent): boolean {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseUp',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('mouseUp', gameMouseEvent);

        return true;
    }

    public onMouseMove(e: MouseEvent): boolean {
        this.setMousePos(e);

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseMove',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('mouseMove', gameMouseEvent);

        return true;
    }

    public onScroll(e: WheelEvent): boolean {
        e.preventDefault();

        this.stateManager.getCurrent()?.dispatch('scroll', e);

        return true;
    }

    public onMouseEnter(e: MouseEvent): void {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseEnter',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('mouseEnter', gameMouseEvent);
    }

    public onMouseOut(e: MouseEvent): void {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseOut',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('mouseOut', gameMouseEvent);
    }

    public onContextMenu(e: MouseEvent): boolean {
        e.preventDefault();

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'contextMenu',
            canvas: this.canvas,
            mouseEvent: e,
        });
        this.stateManager.getCurrent()?.dispatch('contextMenu', gameMouseEvent);

        return true;
    }

    public onVisibilityChange(): void {
        this.stateManager.getCurrent()?.dispatch('visibilityChange');
    }

    public onKeyDown(e: KeyboardEvent): void {
        if (document.activeElement === this.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyDown',
                canvas: this.canvas,
                keyboardEvent: e,
            });
            this.stateManager.getCurrent()?.dispatch('keyDown', gameKeyboardEvent);
            Keyboard.onKeyDown(e);
        }
    }

    public onKeyUp(e: KeyboardEvent): void {
        if (document.activeElement === this.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyUp',
                canvas: this.canvas,
                keyboardEvent: e,
            });
            this.stateManager.getCurrent()?.dispatch('keyUp', gameKeyboardEvent);
            Keyboard.onKeyUp(e);
        }
    }

    public onKeyboardDown(e: CustomEvent<KeyboardEventPayload>): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardDown',
            canvas: this.canvas,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        this.stateManager.getCurrent()?.dispatch('keyboardDown', gameKeyboardEvent);
    }

    public onKeyboardUp(e: CustomEvent<KeyboardEventPayload>): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardUp',
            canvas: this.canvas,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        this.stateManager.getCurrent()?.dispatch('keyboardUp', gameKeyboardEvent);
    }

    private setMousePos(e: MouseEvent): void {
        const canvasRect = this.canvas.getBoundingClientRect();
        Mouse.mousePos.set(
            new Vector(
                e.clientX - canvasRect.left + window.scrollX,
                e.clientY - canvasRect.top + window.scrollY,
            ),
        );

        // if (world) {
        //     Mouse.worldPos.set(WorldVector.normalizeToCanvas(this.canvas.getContext('2d'), world, Mouse.mousePos));
        // }
    }
}
