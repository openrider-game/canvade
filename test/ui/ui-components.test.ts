import { describe, expect, test } from 'vitest';
import { TextLayout } from '../../src/canvade/ui/elements/text-layout';
import { TextSelection } from '../../src/canvade/ui/elements/text-selection';
import { UIScrollbar } from '../../src/canvade/ui/elements/ui-scrollbar';
import { createCanvasMock } from '../helpers/canvas';

describe('Text selection', () => {
    test('moves the caret, collapsing or extending the selection', () => {
        const selection = new TextSelection();
        selection.moveCaret(8, 5);
        expect([selection.caret, selection.anchor, selection.collapsed]).toEqual([5, 5, true]);

        selection.moveCaret(1, 5, true);
        expect([selection.start, selection.end]).toEqual([1, 5]);
        expect(selection.selectedText('hello')).toBe('ello');

        selection.select(-3, 2, 5);
        expect([selection.anchor, selection.caret]).toEqual([0, 2]);
    });

    test('replaces the selection within a maximum length', () => {
        const selection = new TextSelection();
        selection.select(1, 3, 5);

        expect(selection.replace('hello', 'EY', 0)).toBe('hEYlo');
        expect(selection.caret).toBe(3);
        expect(selection.collapsed).toBe(true);

        // 6 characters at most: only one of the three inserted ones fits
        expect(selection.replace('hello', 'abc', 6)).toBe('helalo');
    });
});

describe('Text layout', () => {
    test('finds the character boundaries and scrolls to keep a position visible', () => {
        const layout = new TextLayout();
        // Every character is 7 pixels wide
        layout.measure(createCanvasMock().context, 'abcdef');

        expect(layout.offsetOf(2)).toBe(14);
        expect(layout.offsetOf(99)).toBe(42);
        expect(layout.indexAt(17)).toBe(2);
        expect(layout.indexAt(19)).toBe(3);

        layout.scrollTo(42, 20);
        expect(layout.scroll).toBe(22);
        expect(layout.indexAt(0)).toBe(3);
        layout.scrollTo(7, 20);
        expect(layout.scroll).toBe(7);
    });
});

describe('Scrollbar', () => {
    const track = { x: 92, y: 0, width: 8, height: 60 };

    test('sizes its thumb after the visible part of the content', () => {
        const scrollbar = new UIScrollbar(track, 100, 20);

        expect(scrollbar.maxScroll).toBe(40);
        expect(scrollbar.thumbHeight).toBe(36);
        expect(scrollbar.thumbY).toBe(12);
        expect(scrollbar.clamp(70)).toBe(40);
        expect(new UIScrollbar(track, 50, 10).thumbHeight).toBe(60);
        // Long content keeps a thumb that can be grabbed
        expect(new UIScrollbar(track, 10000, 0).thumbHeight).toBe(16);
    });

    test('is grabbed on its thumb, or under the mouse beside it', () => {
        const scrollbar = new UIScrollbar(track, 100, 0);

        expect(scrollbar.contains(95, 30)).toBe(true);
        expect(scrollbar.contains(50, 30)).toBe(false);
        expect(scrollbar.grabOffset(10)).toBe(10);
        expect(scrollbar.grabOffset(50)).toBe(18);
        expect(scrollbar.scrollForThumbAt(12)).toBe(20);
        expect(scrollbar.scrollForThumbAt(100)).toBe(40);
    });
});
