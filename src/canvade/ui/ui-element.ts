import { GameRenderEvent } from '../../public-api';
import { UINode, UINodeDefinition } from './ui-node';

export type UIContainerDefinition = UINodeDefinition & {
    backgroundColor?: string;
    hoverBackgroundColor?: string;
    focusBackgroundColor?: string;
    color?: string;
};

export class UIContainer extends UINode {
    public readonly backgroundColor: string;
    public readonly hoverBackgroundColor: string;
    public readonly focusBackgroundColor: string;
    public readonly color: string;

    constructor(
        definition: UIContainerDefinition = { operation: { type: 'clone' }, magnitude: '' },
    ) {
        super(definition);

        this.backgroundColor = definition.backgroundColor || 'transparent';
        this.hoverBackgroundColor = definition.hoverBackgroundColor || 'transparent';
        this.focusBackgroundColor = definition.focusBackgroundColor || 'transparent';
        this.color = definition.color || '#000';

        this.subscribe('render', this.renderBox);
    }

    protected renderBox(e: CustomEvent<GameRenderEvent>): void {
        const ctx = e.detail.ctx;

        const box = this.getBox();

        if (!box) {
            return;
        }

        let backgroundColor = this.backgroundColor;
        if (this.focused) {
            backgroundColor = this.focusBackgroundColor;
        } else if (this.hovered) {
            backgroundColor = this.hoverBackgroundColor;
        }

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(box.x, box.y, box.width, box.height);
    }
}

export abstract class UIElement extends UIContainer {
    override consumes = true;
}
