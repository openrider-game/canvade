import { EventEmitter } from '../event/event-emitter';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent, GameUpdateEvent } from '../event/types/game-loop-events';
import { StateEvents } from '../event/types/state-events';
import { UIElement } from './ui-element';
import { buildUIElementTree, UIStructureDefinition, UIStyleDefinition } from './ui-parser';

/**
 * Renders a UI tree and routes the mouse to it. Each `Layer` owns one.
 *
 * It renders the tree on `render`, advances its animations on `update`, and handles the mouse:
 * - `mouseMove` updates the hovered element;
 * - `mouseDown` over an element focuses it and makes it active (pressed);
 * - `mouseUp` dispatches `click` when released over the active element, then clears it.
 *
 * Mouse events over an element (or ending a press) are marked as consumed, so the layers below
 * do not receive them. The focused and active elements are global: pressing an element of a
 * manager clears them in the manager that previously held them.
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

    /** Renders the UI tree over the whole canvas, if any. */
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.rootNode) {
            return;
        }

        if (this.clearBeforeRender) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        this.rootNode.render(ctx);
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

        const { x, y } = event.detail.position;
        const target = this.rootNode.findElementAt(x, y);
        if (target) {
            this.claimInteraction(target);
            event.detail.consumed = true;
        }
    }

    private onMouseUp(event: CustomEvent<GameMouseEvent>): void {
        if (!this.rootNode) {
            return;
        }

        const { x, y } = event.detail.position;
        const target = this.rootNode.findElementAt(x, y);
        const activeTarget = this.findActiveElement(this.rootNode);
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

        const { x, y } = event.detail.position;
        const target = this.rootNode.findElementAt(x, y);
        this.rootNode.setHoveredElement(target);
        if (target) {
            event.detail.consumed = true;
        }
    }

    private findActiveElement(element: UIElement): UIElement | null {
        if (element.isActive()) {
            return element;
        }

        for (const child of element.children) {
            if (child instanceof UIElement) {
                const activeElement = this.findActiveElement(child);
                if (activeElement) {
                    return activeElement;
                }
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
