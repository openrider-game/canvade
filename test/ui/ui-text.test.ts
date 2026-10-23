import { describe, expect, test, vi } from 'vitest';
import { wrapText } from '../../src/canvade/ui/elements/text-wrap';
import { UIText, UITextAlign, UITextWrap } from '../../src/canvade/ui/elements/ui-text';
import { UIProperty } from '../../src/canvade/ui/properties/ui-property.type';
import { createCanvasMock } from '../helpers/canvas';

describe('UIText', () => {
    test('renders text using its style and resolved position', () => {
        const { context } = createCanvasMock();
        const text = new UIText(['title'], {
            color: new UIProperty('red'),
            text: new UIProperty('Hello world'),
            fontSize: new UIProperty(18),
        });

        text.render(context, { x: 10, y: 20, width: 200, height: 100 });

        expect(context.fillStyle).toBe('red');
        expect(context.font).toBe('18px Arial');
        expect(context.textAlign).toBe('left');
        expect(context.textBaseline).toBe('top');
        expect(context.fillText).toHaveBeenCalledWith('Hello world', 10, 20);
    });

    test('does not draw when its text is empty', () => {
        const { context } = createCanvasMock();
        const text = new UIText([], { text: new UIProperty('') });

        text.render(context);

        expect(context.fillText).not.toHaveBeenCalled();
    });
});

describe('Text wrapping', () => {
    // Every character is 1 unit wide
    const measure = (text: string) => text.length;

    test('splits at the line breaks only without a maximum width', () => {
        expect(wrapText('first line\nsecond\r\nthird', null, measure)).toEqual([
            'first line',
            'second',
            'third',
        ]);
    });

    test('wraps between words, splitting the words too wide for a line', () => {
        expect(wrapText('the quick brown fox', 10, measure)).toEqual(['the quick', 'brown fox']);
        expect(wrapText('a supercalifragilistic word', 8, measure)).toEqual([
            'a',
            'supercal',
            'ifragili',
            'stic',
            'word',
        ]);
        expect(wrapText('one\n\ntwo', 10, measure)).toEqual(['one', '', 'two']);
    });

    test('draws the wrapped lines, aligned and spaced by the line height', () => {
        const { context } = createCanvasMock();
        const text = new UIText([], {
            text: new UIProperty('hello wide world'),
            fontSize: new UIProperty(10),
            lineHeight: new UIProperty(1.5),
            wrap: new UIProperty<UITextWrap>('word'),
            textAlign: new UIProperty<UITextAlign>('center'),
        });

        // Characters of 7 pixels, in the default width of 100 pixels: 'hello wide world' is 112
        text.render(context, { x: 0, y: 0, width: 80, height: 100 });

        expect(text.lines).toEqual(['hello wide', 'world']);
        expect(text.textHeight).toBe(30);
        expect(context.textAlign).toBe('center');
        expect(vi.mocked(context.fillText).mock.calls).toEqual([
            ['hello wide', 50, 0],
            ['world', 50, 15],
        ]);
    });

    test('aligns the lines on the right edge', () => {
        const { context } = createCanvasMock();
        const text = new UIText([], {
            text: new UIProperty('a\nb'),
            textAlign: new UIProperty<UITextAlign>('right'),
        });

        text.render(context, { x: 10, y: 0, width: 50, height: 100 });

        // The default width of 100 pixels, from x = 10
        expect(vi.mocked(context.fillText).mock.calls.map(([, x]) => x)).toEqual([110, 110]);
    });
});
