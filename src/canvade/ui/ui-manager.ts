import { EventEmitter } from '../event/event-emitter';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../event/types/game-loop-events';
import { StateEvents } from '../event/types/state-events';
import { UIElement } from './ui-element';
import { buildUIElementTree, UIStructureDefinition, UIStyleDefinition } from './ui-parser';

export class UIManager extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    private static interactionOwner: UIManager | null = null;

    constructor(
        private rootNode?: UIElement,
        private clearBeforeRender: boolean = false,
    ) {
        super();
        this.subscribe('render', this.onRender);
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('mouseUp', this.onMouseUp);
    }

    public setRootElement(rootNode: UIElement): void {
        if (UIManager.interactionOwner === this) {
            this.clearInteractionState();
        }
        this.rootNode = rootNode;
    }

    public setUI(structure: UIStructureDefinition, styles: UIStyleDefinition = {}): UIElement {
        const rootNode = buildUIElementTree(structure, styles);
        this.setRootElement(rootNode);
        return rootNode;
    }

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
