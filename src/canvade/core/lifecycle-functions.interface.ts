export interface LifeCycleFunctions {
    fixedUpdate(): void;
    update(progress: number, delta: number): void;
    render(ctx: CanvasRenderingContext2D): void;
}
