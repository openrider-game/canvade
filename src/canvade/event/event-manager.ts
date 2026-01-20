import Vector from '../core/math/vector';
import { StateManager } from '../state/state-manager';
import { WorldVector } from '../world/world-vector';
import { EventFactory } from './event-factory';
import { Keyboard, KeyboardEventPayload } from './keyboard/keyboard';
import { Mouse } from './mouse/mouse';

export class EventManager {
    constructor(private ctx: CanvasRenderingContext2D) {}

    bridgeDOMEvents(stateManager: StateManager): void {
        this.ctx.canvas.tabIndex = 0;
        this.ctx.canvas.focus();

        this.ctx.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e, stateManager));
        this.ctx.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e, stateManager));
        this.ctx.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e, stateManager));
        this.ctx.canvas.addEventListener('wheel', (e) => this.onScroll(e, stateManager));

        this.ctx.canvas.addEventListener('mouseenter', (e) => this.onMouseEnter(e, stateManager));
        this.ctx.canvas.addEventListener('mouseout', (e) => this.onMouseOut(e, stateManager));

        this.ctx.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e, stateManager));

        document.addEventListener('visibilitychange', () => this.onVisibilityChange(stateManager));

        document.addEventListener('keydown', (e) => this.onKeyDown(e, stateManager));
        document.addEventListener('keyup', (e) => this.onKeyUp(e, stateManager));
        document.addEventListener('keyboarddown', (e) =>
            this.onKeyboardDown(e as CustomEvent<KeyboardEventPayload>, stateManager),
        );
        document.addEventListener('keyboardup', (e) =>
            this.onKeyboardUp(e as CustomEvent<KeyboardEventPayload>, stateManager),
        );
    }

    public onMouseDown(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();
        this.ctx.canvas.focus();

        this.setMousePos(e, stateManager);
        Mouse.lastClick.set(Mouse.mousePos);

        const world = stateManager.getCurrent()?.getWorld();

        if (world) {
            Mouse.lastWorldClick.set(Mouse.worldPos);
        }

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseDown',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('mouseDown', gameMouseEvent);

        return true;
    }

    public onMouseUp(e: MouseEvent, stateManager: StateManager): boolean {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseUp',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('mouseUp', gameMouseEvent);

        return true;
    }

    public onMouseMove(e: MouseEvent, stateManager: StateManager): boolean {
        this.setMousePos(e, stateManager);

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseMove',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('mouseMove', gameMouseEvent);

        return true;
    }

    public onScroll(e: WheelEvent, stateManager: StateManager): boolean {
        e.preventDefault();

        const gameWheelEvent = EventFactory.createGameEvent({
            name: 'scroll',
            consumed: false,
            wheelEvent: e,
            viewWidth: this.ctx.canvas.width,
            viewHeight: this.ctx.canvas.height,
        });

        stateManager.getCurrent()?.dispatch('scroll', gameWheelEvent);

        return true;
    }

    public onMouseEnter(e: MouseEvent, stateManager: StateManager): void {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseEnter',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('mouseEnter', gameMouseEvent);
    }

    public onMouseOut(e: MouseEvent, stateManager: StateManager): void {
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseOut',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('mouseOut', gameMouseEvent);
    }

    public onContextMenu(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'contextMenu',
            consumed: false,
            mouseEvent: e,
        });
        stateManager.getCurrent()?.dispatch('contextMenu', gameMouseEvent);

        return true;
    }

    public onVisibilityChange(stateManager: StateManager): void {
        stateManager.getCurrent()?.dispatch('visibilityChange');
    }

    public onKeyDown(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement === this.ctx.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyDown',
                consumed: false,
                keyboardEvent: e,
            });
            stateManager.getCurrent()?.dispatch('keyDown', gameKeyboardEvent);
            Keyboard.onKeyDown(e);
        }
    }

    public onKeyUp(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement === this.ctx.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyUp',
                consumed: false,
                keyboardEvent: e,
            });
            stateManager.getCurrent()?.dispatch('keyUp', gameKeyboardEvent);
            Keyboard.onKeyUp(e);
        }
    }

    public onKeyboardDown(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardDown',
            consumed: false,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        stateManager.getCurrent()?.dispatch('keyboardDown', gameKeyboardEvent);
    }

    public onKeyboardUp(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardUp',
            consumed: false,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        stateManager.getCurrent()?.dispatch('keyboardUp', gameKeyboardEvent);
    }

    private setMousePos(e: MouseEvent, stateManager: StateManager): void {
        const canvasRect = this.ctx.canvas.getBoundingClientRect();
        Mouse.mousePos.set(
            new Vector(
                e.clientX - canvasRect.left + window.scrollX,
                e.clientY - canvasRect.top + window.scrollY,
            ),
        );

        const world = stateManager.getCurrent()?.getWorld();
        if (world) {
            Mouse.worldPos.set(
                WorldVector.normalizeToCanvas(
                    Mouse.mousePos,
                    world,
                    this.ctx.canvas.width,
                    this.ctx.canvas.height,
                ),
            );
        }
    }
}
