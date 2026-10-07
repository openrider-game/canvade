export type UIInteractionStateName = 'hovered' | 'focused' | 'active';
export type UIInteractionEvent = 'hoverIn' | 'hoverOut' | 'focusIn' | 'focusOut';

export class UIInteractionState {
    private hovered = false;
    private focused = false;
    private active = false;

    public update(state: UIInteractionStateName, value: boolean): UIInteractionEvent | undefined {
        const previous = this[state];
        this[state] = value;
        if (previous === value) {
            return undefined;
        }

        if (state === 'hovered') {
            return value ? 'hoverIn' : 'hoverOut';
        }
        if (state === 'focused') {
            return value ? 'focusIn' : 'focusOut';
        }
        return undefined;
    }

    public isHovered(): boolean {
        return this.hovered;
    }

    public isFocused(): boolean {
        return this.focused;
    }

    public isActive(): boolean {
        return this.active;
    }
}
