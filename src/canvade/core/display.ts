/**
 * Pixel density of the display, updated by the `Game` when the canvas is resized.
 *
 * The canvas is sized in device pixels to stay sharp, so on a high density screen one CSS pixel
 * covers several canvas pixels. The UI is laid out and drawn in UI pixels, which are
 * {@link Display.uiScale} canvas pixels, so that it keeps its size on every screen.
 */
export abstract class Display {
    /** Device pixels per CSS pixel, `window.devicePixelRatio` when the canvas was last sized. */
    public static pixelRatio = 1;
    /** Fixed scale of the UI, overriding the pixel ratio; `null` to follow the pixel ratio. */
    public static fixedUIScale: number | null = null;

    /** Canvas pixels per UI pixel. */
    public static get uiScale(): number {
        return Display.fixedUIScale ?? Display.pixelRatio;
    }
}
