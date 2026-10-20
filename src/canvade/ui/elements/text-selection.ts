/**
 * Caret and selection of a single line of text, in characters: the selection goes from the
 * anchor to the caret, and is collapsed when they are equal.
 */
export class TextSelection {
    /** Position of the caret, in characters from the start of the text. */
    public caret = 0;
    /** Other end of the selection, equal to the caret when no text is selected. */
    public anchor = 0;

    public get start(): number {
        return Math.min(this.anchor, this.caret);
    }

    public get end(): number {
        return Math.max(this.anchor, this.caret);
    }

    public get collapsed(): boolean {
        return this.anchor === this.caret;
    }

    /** Selected part of a text. */
    public selectedText(text: string): string {
        return text.slice(this.start, this.end);
    }

    /**
     * Moves the caret, clamped to the text, collapsing the selection unless it is extended.
     *
     * @param length - Length of the text.
     * @param extend - Whether the selection extends from its anchor to the new caret.
     */
    public moveCaret(caret: number, length: number, extend = false): void {
        this.caret = TextSelection.clamp(caret, length);
        if (!extend) {
            this.anchor = this.caret;
        }
    }

    /** Selects a range, the caret ending at `end`, both clamped to the text. */
    public select(start: number, end: number, length: number): void {
        this.anchor = TextSelection.clamp(start, length);
        this.caret = TextSelection.clamp(end, length);
    }

    /**
     * Replaces the selected part of a text, or inserts at the caret, the caret ending after the
     * inserted text.
     *
     * @param maxLength - Maximum length of the result, 0 for no limit: the inserted text is cut.
     * @returns The new text.
     */
    public replace(text: string, inserted: string, maxLength: number): string {
        const { start, end } = this;
        const room = maxLength > 0 ? maxLength - (text.length - (end - start)) : Infinity;
        const kept = [...inserted].slice(0, Math.max(0, room)).join('');

        this.caret = this.anchor = start + kept.length;
        return text.slice(0, start) + kept + text.slice(end);
    }

    private static clamp(index: number, length: number): number {
        return Math.max(0, Math.min(index, length));
    }
}
