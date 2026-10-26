/**
 * Pixel density of the display, updated by the `Game` when the canvas is resized.
 *
 * The canvas is sized in device pixels to stay sharp, so on a high density screen one CSS pixel
 * covers several canvas pixels. The UI is laid out and drawn in UI pixels, which are
 * {@link Display.uiScale} canvas pixels, so that it keeps its size on every screen.
 *
 * The canvas is opaque: each frame starts by filling it with {@link Display.backgroundColor}
 * (see {@link Display.clear}), rather than clearing it to transparent pixels.
 */
export abstract class Display {
    /** Device pixels per CSS pixel, `window.devicePixelRatio` when the canvas was last sized. */
    public static pixelRatio = 1;
    /** Fixed scale of the UI, overriding the pixel ratio; `null` to follow the pixel ratio. */
    public static fixedUIScale: number | null = null;
    /** Color the canvas is filled with before each frame, white by default. */
    public static backgroundColor = '#fff';

    /** Canvas pixels per UI pixel. */
    public static get uiScale(): number {
        return Display.fixedUIScale ?? Display.pixelRatio;
    }

    /**
     * Fills the whole canvas with the background color.
     *
     * The canvas having no alpha channel, clearing it would turn it black; filling it also keeps
     * the game readable when an extension forces a dark background on the page behind it.
     */
    public static clear(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = Display.backgroundColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
}
