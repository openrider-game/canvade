import { describe, expect, test } from 'vitest';
import { UIText } from '../../src/canvade/ui/elements/ui-text';
import { UIProperty } from '../../src/canvade/ui/ui-property.type';
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
