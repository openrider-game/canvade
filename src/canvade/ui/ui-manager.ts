import { Vector } from '../core/math/vector';
import { Display } from '../core/display';
import { MOUSE_MAIN_BUTTON } from '../event/event.constants';
import { EventEmitter } from '../event/event-emitter';
import {
    DOMEvents,
    GameClipboardEvent,
    GameKeyboardEvent,
    GameMouseEvent,
    GameWheelEvent,
} from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent, GameUpdateEvent } from '../event/types/game-loop-events';
import { StateEvents } from '../event/types/state-events';
import { UIElement } from './ui-element';
import { buildUIElementTree, UIStructureDefinition, UIStyleDefinition } from './ui-parser';

/**
 * Renders a UI tree and routes the mouse and the keyboard to it. Each `Layer` owns one.
 *
 * It renders the tree on `render`, advances its animations on `update`, and handles the input:
 * - `mouseMove` updates the hovered element;
 * - `mouseDown` over an element focuses it and makes it active (pressed), elsewhere it clears
 *   the focus;
 * - `mouseUp` dispatches `click` when released over the active element, then clears it;
 * - `mouseMove` while an element is pressed lets it follow the mouse (see
 *   `UIElement.handlePointerDrag`);
 * - `scroll` (the mouse wheel) scrolls the elements under the mouse (see `UIElement.handleWheel`);
 * - `keyDown`, `copy`, `cut` and `paste` are given to the focused element (see
 *   `UIElement.handleKeyDown` and `UIElement.handleClipboard`).
 *
 * Only the main mouse button presses and clicks the elements. Mouse events over an element
 * (or ending a press) are marked as consumed, so the layers below do not receive them; the
 * other buttons are consumed when pressed over an element, but never released by the UI, so
 * that a drag started outside of it can end over it. The mouse wheel over an element is consumed
 * too, so that it does not reach the layers below, as are the keys and clipboard events handled
 * by the focused element. The focused and active elements are global: pressing an element of a
 * manager clears them in the manager that previously held them.
 *
 * The tree is laid out in UI pixels, scaled by {@link Display.uiScale} so that the UI keeps its
 * size on high density screens: the bounds of the elements and the positions given to their
 * click handlers are in UI pixels.
 */
export class UIManager extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    /** Manager holding the focused and active elements, shared by all the managers. */
    private static interactionOwner: UIManager | null = null;
    /** Last mouse position over the canvas, in UI pixels, `null` once the mouse left it. */
    private pointer: Vector | null = null;
    /** Whether the hovered element must be found again once the new tree is laid out. */
    private hoverPending = false;

    /**
     * Creates a manager, optionally with an initial UI tree.
     *
     * @param rootNode - Root of the UI tree, usually set later with {@link UIManager.setUI}.
     * @param clearBeforeRender - Whether to clear the whole canvas before rendering the tree.
     */
    constructor(
        private rootNode?: UIElement,
        private clearBeforeRender: boolean = false,
    ) {
        super();
        this.subscribe('render', this.onRender);
        this.subscribe('update', this.onUpdate);
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('mouseUp', this.onMouseUp);
        this.subscribe('mouseOut', this.onMouseOut);
        this.subscribe('keyDown', this.onKeyDown);
        this.subscribe('scroll', this.onScroll);
        this.subscribe('copy', this.onClipboard);
        this.subscribe('cut', this.onClipboard);
        this.subscribe('paste', this.onClipboard);
    }

    /**
     * Replaces the UI tree, clearing the focused and active elements of the previous one.
     *
     * The element under the mouse is hovered as soon as the new tree is rendered, without
     * waiting for the mouse to move.
     */
    public setRootElement(rootNode: UIElement): void {
        if (UIManager.interactionOwner === this) {
            this.clearInteractionState();
        }
        this.rootNode = rootNode;
        this.hoverPending = true;
    }

    /**
     * Builds a UI tree from structure and style definitions and makes it the UI of the manager.
     *
     * See {@link buildUIElementTree} for the format of the definitions.
     *
     * @returns The root of the new tree, a container covering the whole canvas.
     */
    public setUI(structure: UIStructureDefinition, styles: UIStyleDefinition = {}): UIElement {
        const rootNode = buildUIElementTree(structure, styles);
        this.setRootElement(rootNode);
        return rootNode;
    }

    /** Renders the UI tree over the whole canvas, scaled to UI pixels, if any. */
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.rootNode) {
            return;
        }

        if (this.clearBeforeRender) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        const scale = Display.uiScale;
        ctx.save();
        ctx.scale(scale, scale);
        try {
            this.rootNode.render(ctx, {
                x: 0,
                y: 0,
                width: ctx.canvas.width / scale,
                height: ctx.canvas.height / scale,
            });
        } finally {
            ctx.restore();
        }

        // Elements can only be hit once laid out
        if (this.hoverPending) {
            this.hoverPending = false;
            const pointer = this.pointer;
            this.rootNode.setHoveredElement(
                pointer ? this.rootNode.findElementAt(pointer.x, pointer.y) : null,
            );
        }
    }

    private onRender(event: CustomEvent<GameRenderEvent>): void {
        this.render(event.detail.ctx);
    }

    private onUpdate(event: CustomEvent<GameUpdateEvent>): void {
        this.rootNode?.updateAnimations(event.detail.delta);
    }

    private onMouseDown(event: CustomEvent<GameMouseEvent>): void {
        if (event.detail.consumed || !this.rootNode) {
            return;
        }

        const { x, y } = this.toUIPosition(event.detail.position);
        const target = this.rootNode.findElementAt(x, y);
        const mainButton = event.detail.mouseEvent.button === MOUSE_MAIN_BUTTON;
        if (target) {
            if (mainButton) {
                this.claimInteraction(target);
                target.handlePointerDown?.(x, y, event.detail.mouseEvent);
            }
            event.detail.consumed = true;
        } else if (mainButton && UIManager.interactionOwner === this) {
            // Clicking outside of the UI removes the focus, e.g. from an input
            this.rootNode.setFocusedElement(null);
        }
    }

    private onMouseUp(event: CustomEvent<GameMouseEvent>): void {
        if (!this.rootNode || event.detail.mouseEvent.button !== MOUSE_MAIN_BUTTON) {
            return;
        }

        const { x, y } = this.toUIPosition(event.detail.position);
        const target = this.rootNode.findElementAt(x, y);
        const activeTarget = this.findElement(this.rootNode, (element) => element.isActive());
        if (!event.detail.consumed && activeTarget && activeTarget === target) {
            activeTarget.handleClick(x, y, event.detail.mouseEvent);
        }

        // A press started on the UI also consumes its release, even outside the element
        if (activeTarget) {
            event.detail.consumed = true;
        }
        this.rootNode.setActiveElement(null);
    }

    private onMouseMove(event: CustomEvent<GameMouseEvent>): void {
        if (!this.rootNode) {
            return;
        }

        const { x, y } = this.toUIPosition(event.detail.position);
        this.pointer = new Vector(x, y);
        const target = this.rootNode.findElementAt(x, y);
        this.rootNode.setHoveredElement(target);

        const activeTarget = this.findElement(this.rootNode, (element) => element.isActive());
        activeTarget?.handlePointerDrag?.(x, y);
        if (target || activeTarget) {
            event.detail.consumed = true;
        }
    }

    /** Clears the hovered element when the mouse leaves the canvas. */
    private onMouseOut(): void {
        this.pointer = null;
        this.rootNode?.setHoveredElement(null);
    }

    /** Scrolls the deepest scrolling element under the mouse, consuming the wheel over the UI. */
    private onScroll(event: CustomEvent<GameWheelEvent>): void {
        if (event.detail.consumed || !this.rootNode) {
            return;
        }

        const { x, y } = this.toUIPosition(event.detail.position);
        const target = this.rootNode.findElementAt(x, y);
        if (!target) {
            return;
        }

        const wheelEvent = event.detail.wheelEvent;
        // Lines and pages, depending on the device, are converted to pixels
        const unit = wheelEvent.deltaMode === 1 ? 16 : wheelEvent.deltaMode === 2 ? 400 : 1;
        for (let element: UIElement | null = target; element; element = element.parent) {
            if (element.handleWheel?.(wheelEvent.deltaY * unit)) {
                break;
            }
        }
        event.detail.consumed = true;
    }

    private onClipboard(event: CustomEvent<GameClipboardEvent>): void {
        if (event.detail.consumed || !this.rootNode) {
            return;
        }

        const focused = this.findElement(this.rootNode, (element) => element.isFocused());
        if (focused?.handleClipboard?.(event.detail.clipboardEvent)) {
            event.detail.consumed = true;
        }
    }

    private onKeyDown(event: CustomEvent<GameKeyboardEvent>): void {
        if (event.detail.consumed || !this.rootNode) {
            return;
        }

        const focused = this.findElement(this.rootNode, (element) => element.isFocused());
        if (focused?.handleKeyDown?.(event.detail.keyboardEvent)) {
            event.detail.consumed = true;
        }
    }

    /** Converts a position in canvas pixels to UI pixels. */
    private toUIPosition(position: Vector): Vector {
        return position.scale(1 / Display.uiScale);
    }

    private findElement(
        element: UIElement,
        predicate: (element: UIElement) => boolean,
    ): UIElement | null {
        if (predicate(element)) {
            return element;
        }

        for (const child of element.children) {
            const match = this.findElement(child, predicate);
            if (match) {
                return match;
            }
        }

        return null;
    }

    /** Focuses and activates an element, taking the interaction over from the other managers. */
    private claimInteraction(target: UIElement): void {
        if (UIManager.interactionOwner && UIManager.interactionOwner !== this) {
            UIManager.interactionOwner.clearInteractionState();
        }

        UIManager.interactionOwner = this;
        this.rootNode?.setFocusedElement(target);
        this.rootNode?.setActiveElement(target);
    }

    private clearInteractionState(): void {
        this.rootNode?.setFocusedElement(null);
        this.rootNode?.setActiveElement(null);
    }
}
