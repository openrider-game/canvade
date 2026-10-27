import { Vector } from '../core/math/vector';
import { Display } from '../core/display';
import { MOUSE_MAIN_BUTTON } from '../event/event.constants';
import { EventEmitter } from '../event/event-emitter';
import {
    DOMEvents,
    GameClipboardEvent,
    GameKeyboardEvent,
    GamePointerEvent,
    GameWheelEvent,
} from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent, GameUpdateEvent } from '../event/types/game-loop-events';
import { StateEvents } from '../event/types/state-events';
import { UIElement } from './ui-element';
import { buildUIElementTree, UIStructureDefinition, UIStyleDefinition } from './ui-parser';
import { UITouchTracker } from './ui-touch-tracker';

/**
 * Renders a UI tree and routes the pointers and the keyboard to it. Each `Layer` owns one.
 *
 * It renders the tree on `render`, advances its animations on `update`, and handles the input.
 * The mouse and the pen:
 * - `pointerMove` updates the hovered element;
 * - `pointerDown` over an element focuses it and makes it active (pressed), elsewhere it clears
 *   the focus;
 * - `pointerUp` dispatches `click` when released over the active element, then clears it;
 * - `pointerMove` while an element is pressed lets it follow the pointer (see
 *   `UIElement.handlePointerDrag`).
 *
 * The fingers, primary or not, are tracked by a `UITouchTracker`:
 * - `pointerDown` over an element focuses and presses it, elsewhere it clears the focus; each
 *   finger then presses the element under it, sliding from an element to the next one, until
 *   `pointerUp`, which dispatches `click` when released over the element it started on (a tap).
 *   A finger on an element following the pointer drags it instead (see
 *   `UIElement.handlePointerDrag`), e.g. to scroll. Several fingers press several elements at
 *   once, each element dispatching `press` and `release` (see `UIElement.press`), as the main
 *   mouse button does too.
 *
 * And:
 * - `scroll` (the mouse wheel) scrolls the elements under the mouse (see `UIElement.handleWheel`);
 * - `keyDown`, `copy`, `cut` and `paste` are given to the focused element (see
 *   `UIElement.handleKeyDown` and `UIElement.handleClipboard`).
 *
 * Only the main mouse button presses and clicks the elements. Pointer events over an element
 * (or ending a press) are marked as consumed, so the layers below do not receive them; the
 * other buttons are consumed when pressed over an element, but never released by the UI, so
 * that a drag started outside of it can end over it. The mouse wheel over an element is consumed
 * too, so that it does not reach the layers below, as are the keys and clipboard events handled
 * by the focused element, and the fingers touching an element, with their moves and end.
 * The focused and active elements are global: pressing an element of a manager clears them in the
 * manager that previously held them.
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
    /** Element pressed by the main mouse button. */
    private mousePressed: UIElement | null = null;
    /** Touches on the elements of this manager. */
    private readonly touches = new UITouchTracker(
        () => this.rootNode,
        (target) => this.claimFocus(target),
    );

    /**
     * Creates a manager, optionally with an initial UI tree.
     *
     * @param rootNode - Root of the UI tree, usually set later with {@link UIManager.setUI}.
     * @param clearBeforeRender - Whether to fill the whole canvas with the background color (see
     * {@link Display.clear}) before rendering the tree.
     */
    constructor(
        private rootNode?: UIElement,
        private clearBeforeRender: boolean = false,
    ) {
        super();
        this.subscribe('render', this.onRender);
        this.subscribe('update', this.onUpdate);
        this.subscribe('pointerDown', this.onPointerDown);
        this.subscribe('pointerMove', this.onPointerMove);
        this.subscribe('pointerUp', this.onPointerUp);
        this.subscribe('pointerLeave', this.onPointerLeave);
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
     * waiting for the mouse to move, and the fingers press the elements under them: the elements
     * they pressed are only released then, so that a finger holding a button of both trees keeps
     * it held.
     */
    public setRootElement(rootNode: UIElement): void {
        if (UIManager.interactionOwner === this) {
            this.clearInteractionState();
        }
        this.mousePressed?.release();
        this.mousePressed = null;
        this.rootNode = rootNode;
        this.hoverPending = true;
        this.touches.invalidate();
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

    /** Root of the UI tree, a container covering the whole canvas, if any. */
    public getRootElement(): UIElement | undefined {
        return this.rootNode;
    }

    /** Renders the UI tree over the whole canvas, scaled to UI pixels, if any. */
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.rootNode) {
            return;
        }

        if (this.clearBeforeRender) {
            Display.clear(ctx);
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
        this.touches.rebindIfPending();
    }

    private onRender(event: CustomEvent<GameRenderEvent>): void {
        this.render(event.detail.ctx);
    }

    private onUpdate(event: CustomEvent<GameUpdateEvent>): void {
        this.rootNode?.updateAnimations(event.detail.delta);
    }

    private onPointerDown(event: CustomEvent<GamePointerEvent>): void {
        if (event.detail.consumed || !this.rootNode) {
            return;
        }

        const { pointerEvent } = event.detail;
        const position = this.toUIPosition(event.detail.position);
        if (UIManager.isTouch(pointerEvent)) {
            if (this.touches.start(pointerEvent.pointerId, position, pointerEvent)) {
                event.detail.consumed = true;
            } else if (UIManager.interactionOwner === this) {
                // Touching outside of the UI removes the focus, e.g. from an input
                this.rootNode.setFocusedElement(null);
            }
            return;
        }

        const { x, y } = position;
        const target = this.rootNode.findElementAt(x, y);
        const mainButton = pointerEvent.button === MOUSE_MAIN_BUTTON;
        if (target) {
            if (mainButton) {
                this.claimInteraction(target);
                target.handlePointerDown?.(x, y, pointerEvent);
                this.mousePressed?.release();
                this.mousePressed = target;
                target.press();
            }
            event.detail.consumed = true;
        } else if (mainButton && UIManager.interactionOwner === this) {
            // Clicking outside of the UI removes the focus, e.g. from an input
            this.rootNode.setFocusedElement(null);
        }
    }

    private onPointerUp(event: CustomEvent<GamePointerEvent>): void {
        const { pointerEvent } = event.detail;
        const position = this.toUIPosition(event.detail.position);
        // A finger releases its element, clicking it when released over its start element
        if (UIManager.isTouch(pointerEvent)) {
            if (this.touches.end(pointerEvent.pointerId, position, pointerEvent)) {
                event.detail.consumed = true;
            }
            return;
        }
        if (!this.rootNode || pointerEvent.button !== MOUSE_MAIN_BUTTON) {
            return;
        }

        const { x, y } = position;
        const target = this.rootNode.findElementAt(x, y);
        const activeTarget = this.findElement(this.rootNode, (element) => element.isActive());
        if (!event.detail.consumed && activeTarget && activeTarget === target) {
            activeTarget.handleClick(x, y, pointerEvent);
        }

        // A press started on the UI also consumes its release, even outside the element
        if (activeTarget) {
            event.detail.consumed = true;
        }
        this.rootNode.setActiveElement(null);
        this.mousePressed?.release();
        this.mousePressed = null;
    }

    private onPointerMove(event: CustomEvent<GamePointerEvent>): void {
        const { pointerEvent } = event.detail;
        const position = this.toUIPosition(event.detail.position);
        // A finger drags its element, or slides to the element under it
        if (UIManager.isTouch(pointerEvent)) {
            if (this.touches.move(pointerEvent.pointerId, position)) {
                event.detail.consumed = true;
            }
            return;
        }
        if (!this.rootNode) {
            return;
        }

        const { x, y } = position;
        this.pointer = new Vector(x, y);
        const target = this.rootNode.findElementAt(x, y);
        this.rootNode.setHoveredElement(target);

        const activeTarget = this.findElement(this.rootNode, (element) => element.isActive());
        activeTarget?.handlePointerDrag?.(x, y);
        if (target || activeTarget) {
            event.detail.consumed = true;
        }
    }

    /** Clears the hovered element when the pointer leaves the canvas. */
    private onPointerLeave(): void {
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

    /** Whether a pointer is a finger, tracked by the touch tracker. */
    private static isTouch(e: PointerEvent): boolean {
        return e.pointerType === 'touch';
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
        this.claimFocus(target);
        this.rootNode?.setActiveElement(target);
    }

    /** Focuses an element, taking the interaction over from the other managers. */
    private claimFocus(target: UIElement): void {
        if (UIManager.interactionOwner && UIManager.interactionOwner !== this) {
            UIManager.interactionOwner.clearInteractionState();
        }

        UIManager.interactionOwner = this;
        this.rootNode?.setFocusedElement(target);
    }

    private clearInteractionState(): void {
        this.rootNode?.setFocusedElement(null);
        this.rootNode?.setActiveElement(null);
    }
}
