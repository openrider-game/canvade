import { Vector } from '../core/math/vector';
import { Display } from '../core/display';
import { MOUSE_MAIN_BUTTON } from '../event/event.constants';
import { EventEmitter } from '../event/event-emitter';
import { DOMEvents, GameKeyboardEvent, GameMouseEvent } from '../event/types/dom-events';
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
 * - `keyDown` is given to the focused element (see `UIElement.handleKeyDown`).
 *
 * Only the main mouse button presses and clicks the elements. Mouse events over an element
 * (or ending a press) are marked as consumed, so the layers below do not receive them; the
 * other buttons are consumed when pressed over an element, but never released by the UI, so
 * that a drag started outside of it can end over it. Keys handled by the focused element are
 * consumed too. The focused and active elements are global: pressing an element of a manager
 * clears them in the manager that previously held them.
 *
 * The tree is laid out in UI pixels, scaled by {@link Display.uiScale} so that the UI keeps its
 * size on high density screens: the bounds of the elements and the positions given to their
 * click handlers are in UI pixels.
 */
export class UIManager extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    /** Manager holding the focused and active elements, shared by all the managers. */
    private static interactionOwner: UIManager | null = null;

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
        this.subscribe('keyDown', this.onKeyDown);
    }

    /** Replaces the UI tree, clearing the focused and active elements of the previous one. */
    public setRootElement(rootNode: UIElement): void {
        if (UIManager.interactionOwner === this) {
            this.clearInteractionState();
        }
        this.rootNode = rootNode;
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
        const target = this.rootNode.findElementAt(x, y);
        this.rootNode.setHoveredElement(target);
        if (target) {
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
