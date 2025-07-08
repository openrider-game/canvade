export interface EventHandler {
    onEnter(): void;
    onLeave(): void;

    onMouseDown(e: MouseEvent): boolean;
    onMouseUp(e: MouseEvent): boolean;
    onMouseMove(e: MouseEvent): boolean;
    onScroll(e: WheelEvent): boolean;

    onMouseEnter(e: MouseEvent): void;
    onMouseOut(e: MouseEvent): void;

    onContextMenu(e: MouseEvent): boolean;

    onVisibilityChange(): void;

    onKeyDown(e: KeyboardEvent): void;
    onKeyUp(e: KeyboardEvent): void;

    onKeyboardDown(e: CustomEventInit): void;
    onKeyboardUp(e: CustomEventInit): void;
}
