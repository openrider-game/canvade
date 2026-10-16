/** Interaction states of a UI element; `active` means pressed. */
export type UIInteractionStateName = 'hovered' | 'focused' | 'active';
/** Events dispatched by a UI element when its hover or focus state changes. */
export type UIInteractionEvent = 'hoverIn' | 'hoverOut' | 'focusIn' | 'focusOut';

/** Hover, focus and active flags of a UI element. */
export class UIInteractionState {
    private hovered = false;
    private focused = false;
    private active = false;

    /**
     * Sets a state.
     *
     * @returns The event to dispatch when the hover or focus state changed, `undefined`
     * otherwise (the active state has no event).
     */
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
