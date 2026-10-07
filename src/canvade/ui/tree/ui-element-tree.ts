import type { UIElement } from '../ui-element';
import { UIInteractionStateName } from '../interaction/ui-interaction-state';

export class UIElementTree {
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

    public static findElementAt(element: UIElement, x: number, y: number): UIElement | null {
        if (!element.contains(x, y)) {
            return null;
        }

        for (let i = element.children.length - 1; i >= 0; i--) {
            const match = this.findElementAt(element.children[i], x, y);
            if (match) {
                return match;
            }
        }

        return element.isTreeRoot ? null : element;
    }

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

    public static handleClick(
        element: UIElement,
        x: number,
        y: number,
        dispatchClick: (element: UIElement) => void,
    ): boolean {
        if (!element.contains(x, y)) {
            return false;
        }

        for (let i = element.children.length - 1; i >= 0; i--) {
            if (this.handleClick(element.children[i], x, y, dispatchClick)) {
                return true;
            }
        }

        dispatchClick(element);
        return true;
    }
}
