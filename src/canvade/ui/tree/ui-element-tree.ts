import type { UIElement } from '../ui-element';
import { UIInteractionStateName } from '../interaction/ui-interaction-state';

/** Recursive operations on UI element trees, used by {@link UIElement}. */
export class UIElementTree {
    /**
     * Renders children in order, all laid out in `parentBounds` and clipped to it.
     *
     * @param parentBounds - Bounds of the parent, in canvas pixels.
     */
    public static renderChildren(
        children: UIElement[],
        ctx: CanvasRenderingContext2D,
        parentBounds: { x: number; y: number; width: number; height: number },
    ): void {
        ctx.save();
        ctx.beginPath();
        ctx.rect(parentBounds.x, parentBounds.y, parentBounds.width, parentBounds.height);
        ctx.clip();
        try {
            for (const child of children) {
                child.render(ctx, parentBounds);
            }
        } finally {
            ctx.restore();
        }
    }

    /**
     * Returns the deepest element of a subtree at a canvas position, or `null`.
     *
     * Children are tested from the last one, drawn on top. Elements that do not receive the
     * pointer (see `UIElement.receivesPointer`), including the tree roots, are never returned,
     * so that positions over them only are not captured by the UI.
     */
    public static findElementAt(element: UIElement, x: number, y: number): UIElement | null {
        if (!element.contains(x, y)) {
            return null;
        }

        for (
            let i = element.children.length - 1;
            i >= 0 && this.reachesChildren(element, x, y);
            i--
        ) {
            const match = this.findElementAt(element.children[i], x, y);
            if (match) {
                return match;
            }
        }

        return element.receivesPointer() ? element : null;
    }

    /** Whether the children of an element can be hit at a position, see `containsChildPoint`. */
    private static reachesChildren(element: UIElement, x: number, y: number): boolean {
        return element.containsChildPoint?.(x, y) ?? true;
    }

    /**
     * Sets an interaction state on `target` and clears it on every other element of the
     * subtree.
     */
    public static updateInteraction(
        element: UIElement,
        target: UIElement | null,
        state: UIInteractionStateName,
    ): void {
        element.updateInteractionState(state, element === target);
        for (const child of element.children) {
            this.updateInteraction(child, target, state);
        }
    }

    /**
     * Calls `dispatchClick` on the deepest element of a subtree at a canvas position, the last
     * children being tested first. Unlike hit tests, a tree root can receive the click, but
     * not an element with `pointerEvents: 'none'`.
     *
     * @returns Whether an element received the click.
     */
    public static handleClick(
        element: UIElement,
        x: number,
        y: number,
        dispatchClick: (element: UIElement) => void,
    ): boolean {
        if (!element.contains(x, y)) {
            return false;
        }

        for (
            let i = element.children.length - 1;
            i >= 0 && this.reachesChildren(element, x, y);
            i--
        ) {
            if (this.handleClick(element.children[i], x, y, dispatchClick)) {
                return true;
            }
        }

        if (!element.isTreeRoot && element.v('pointerEvents') === 'none') {
            return false;
        }

        dispatchClick(element);
        return true;
    }
}
