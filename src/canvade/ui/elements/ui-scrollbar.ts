import type { UIBounds } from '../ui-element';
import { UI_SCROLLBAR_MIN_THUMB } from '../ui.constants';

/**
 * Vertical scrollbar of a scrolling container, for one layout: the geometry of its track and
 * thumb, in UI pixels, for content taller than the visible height of the track.
 */
export class UIScrollbar {
    /** Largest scroll position, 0 when the content fits. */
    public readonly maxScroll: number;
    public readonly thumbHeight: number;
    public readonly thumbY: number;

    /**
     * Computes the scrollbar of a layout.
     *
     * @param track - Bounds of the track, as high as the visible content.
     * @param contentHeight - Height of the whole content, in pixels.
     * @param scrollTop - Scroll position, clamped to the content.
     */
    public constructor(
        public readonly track: UIBounds,
        contentHeight: number,
        scrollTop: number,
    ) {
        const viewHeight = track.height;
        this.maxScroll = Math.max(0, contentHeight - viewHeight);
        this.thumbHeight =
            this.maxScroll > 0
                ? Math.max(UI_SCROLLBAR_MIN_THUMB, (viewHeight * viewHeight) / contentHeight)
                : viewHeight;
        const position = Math.min(Math.max(0, scrollTop), this.maxScroll);
        this.thumbY =
            track.y +
            (this.maxScroll > 0
                ? (position / this.maxScroll) * (viewHeight - this.thumbHeight)
                : 0);
    }

    /** Clamps a scroll position to the content. */
    public clamp(scrollTop: number): number {
        return Math.max(0, Math.min(this.maxScroll, scrollTop));
    }

    /** Whether a position is on the track. */
    public contains(x: number, y: number): boolean {
        return UIScrollbar.inside(this.track, x, y);
    }

    /**
     * Where the thumb is grabbed by a press at a position: the offset of the position from the
     * top of the thumb, or the middle of the thumb when the track is pressed beside it, so that
     * the thumb jumps under the mouse.
     */
    public grabOffset(y: number): number {
        const onThumb = y >= this.thumbY && y <= this.thumbY + this.thumbHeight;
        return onThumb ? y - this.thumbY : this.thumbHeight / 2;
    }

    /** Scroll position putting the top of the thumb at a position, clamped to the content. */
    public scrollForThumbAt(thumbTop: number): number {
        const free = this.track.height - this.thumbHeight;
        const ratio = free > 0 ? (thumbTop - this.track.y) / free : 0;
        return this.clamp(ratio * this.maxScroll);
    }

    public render(ctx: CanvasRenderingContext2D, trackColor: string, thumbColor: string): void {
        const { x, y, width, height } = this.track;
        ctx.fillStyle = trackColor;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = thumbColor;
        ctx.fillRect(x, this.thumbY, width, this.thumbHeight);
    }

    /** Whether a position is inside bounds, edges included. */
    public static inside(bounds: UIBounds, x: number, y: number): boolean {
        return (
            x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height
        );
    }
}
