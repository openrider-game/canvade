/**
 * Positions of the character boundaries of a single line of text, measured with a canvas
 * context, and its horizontal scroll keeping the caret visible in a narrower box.
 */
export class TextLayout {
    /** Positions after each character, in pixels from the start of the text, 0 first. */
    private offsets: number[] = [0];
    /** Horizontal scroll of the text, in pixels. */
    public scroll = 0;

    /** Measures a text with the current font of a context. */
    public measure(ctx: CanvasRenderingContext2D, text: string): void {
        this.offsets = [0];
        for (let index = 1; index <= text.length; index++) {
            this.offsets.push(ctx.measureText(text.slice(0, index)).width);
        }
    }

    /** Position of a character boundary from the start of the text, in pixels. */
    public offsetOf(index: number): number {
        return this.offsets[Math.max(0, Math.min(index, this.offsets.length - 1))];
    }

    /**
     * Character boundary closest to a position.
     *
     * @param offset - Position from the start of the visible box, in pixels.
     */
    public indexAt(offset: number): number {
        const textOffset = offset + this.scroll;
        let index = 0;
        this.offsets.forEach((characterOffset, i) => {
            if (
                Math.abs(characterOffset - textOffset) < Math.abs(this.offsets[index] - textOffset)
            ) {
                index = i;
            }
        });
        return index;
    }

    /**
     * Scrolls the text so that a position stays inside the visible width.
     *
     * @param offset - Position to keep visible, from the start of the text, in pixels.
     */
    public scrollTo(offset: number, visibleWidth: number): void {
        if (offset - this.scroll > visibleWidth) {
            this.scroll = offset - visibleWidth;
        } else if (offset < this.scroll) {
            this.scroll = offset;
        }
    }
}
