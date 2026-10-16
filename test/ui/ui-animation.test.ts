import { describe, expect, test } from 'vitest';
import { GameUpdateEvent } from '../../src/canvade/event/types/game-loop-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { UIContainer } from '../../src/canvade/ui/elements/ui-container';
import { UIButton } from '../../src/canvade/ui/elements/ui-button';
import { UIAnimation } from '../../src/canvade/ui/animation/ui-animation';
import {
    createUIProperty,
    UIProperty,
    UIResolvableProperty,
} from '../../src/canvade/ui/properties/ui-property.type';
import { UIText } from '../../src/canvade/ui/elements/ui-text';
import { ParentPositionRule } from '../../src/canvade/ui/properties/ui-property-resolution';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

describe('UI animations', () => {
    test('interpolates values with the configured easing and duration', () => {
        const animation = new UIAnimation(10, 30, 100, (progress) => progress);

        expect(animation.update(25)).toEqual({ value: 15, complete: false });
        expect(animation.update(75)).toEqual({ value: 30, complete: true });
    });

    test('uses the interpolation easing functions as animation callbacks', () => {
        const animation = new UIAnimation(0, 100, 100);

        expect(animation.update(50).value).toBe(50);
    });

    test('applies animated layout values during updates and keeps the final value', () => {
        const layer = new TestLayer();
        const root = layer.uiRenderer.setUI(['button.animated'], {
            '.animated': { width: 100, height: 20 },
        });
        const button = root.children[0];
        const ctx = createCanvasMock().context;

        layer.uiRenderer.render(ctx);
        button.animate('width', 200, { duration: 100, easing: (progress) => progress });

        layer.dispatch(
            'update',
            new CustomEvent<GameUpdateEvent>('update', {
                detail: { name: 'update', consumed: false, progress: 0, delta: 50 },
            }),
        );
        layer.uiRenderer.render(ctx);
        expect(button.v('width')).toBe(150);

        layer.dispatch(
            'update',
            new CustomEvent<GameUpdateEvent>('update', {
                detail: { name: 'update', consumed: false, progress: 0, delta: 50 },
            }),
        );
        layer.uiRenderer.render(ctx);
        expect(button.v('width')).toBe(200);
    });

    test('replaces an active animation from its current value', () => {
        const text = new UIText([], { fontSize: new UIProperty(10) });
        text.animate('fontSize', 30, { duration: 100, easing: (progress) => progress });
        text.updateAnimations(50);
        text.animate('fontSize', 0, { duration: 100, easing: (progress) => progress });
        text.updateAnimations(50);

        expect(text.v('fontSize')).toBe(10);
    });

    test('requires animatable properties to have resolved numeric values', () => {
        const text = new UIText();
        expect(() => text.animate('width', 200, { duration: 100 })).toThrow(
            'Property value not resolved',
        );
    });

    test('animates percentage dimensions to fixed pixel values and commits the unit', () => {
        const button = new UIButton([], { width: new UIResolvableProperty('50%') });
        const parentBounds = { x: 0, y: 0, width: 200, height: 100 };
        button.resolveLayout(parentBounds);

        button.animate('width', 200, { duration: 100, easing: (progress) => progress });
        button.updateAnimations(50);
        expect(button.v('width')).toBe(150);

        button.updateAnimations(50);
        expect(button.v('width')).toBe(200);
        expect(button.p('width').getDeclared()).toBe('200px');

        button.resolveLayout({ ...parentBounds, width: 400 });
        expect(button.v('width')).toBe(200);
    });

    test('animates fixed pixel dimensions to percentage values', () => {
        const button = new UIButton([], { width: new UIResolvableProperty('100px') });
        button.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        button.animate('width', '50%', { duration: 100, easing: (progress) => progress });
        button.updateAnimations(50);
        expect(button.v('width')).toBe(100);

        button.updateAnimations(50);
        expect(button.v('width')).toBe(100);
        expect(button.p('width').getDeclared()).toBe('50%');
    });

    test('recalculates percentage animation endpoints when the parent is resized', () => {
        const button = new UIButton([], { width: new UIResolvableProperty('50%') });
        button.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        button.animate('width', '100%', {
            duration: 100,
            easing: (progress) => progress,
        });
        button.updateAnimations(50);
        expect(button.v('width')).toBe(150);

        button.resolveLayout({ x: 0, y: 0, width: 400, height: 100 });
        expect(button.v('width')).toBe(300);

        button.updateAnimations(50);
        expect(button.v('width')).toBe(400);
        expect(button.p('width').getDeclared()).toBe('100%');
    });

    test('includes the parent origin when animating x and y coordinates', () => {
        const button = new UIButton([], {
            x: new UIResolvableProperty('10px'),
            y: new UIResolvableProperty('10px'),
        });
        button.resolveLayout({ x: 10, y: 20, width: 200, height: 100 });

        button.animate('x', '50%', { duration: 100, easing: (progress) => progress });
        button.updateAnimations(100);

        expect(button.v('x')).toBe(110);
        expect(button.p('x').getDeclared()).toBe('50%');
    });

    test('uses the correct layout reference for container gap animations', () => {
        const container = new UIContainer([], {
            width: new UIResolvableProperty('180px'),
            flexDirection: new UIProperty('row'),
            gap: new UIResolvableProperty('10%'),
            padding: new UIResolvableProperty('10px'),
        });
        container.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        container.animate('gap', '50%', {
            duration: 100,
            easing: (progress) => progress,
        });
        container.updateAnimations(50);

        // Relative to the content width of the container: 180 - 2 * 10
        expect(container.v('gap')).toBe((16 + 80) / 2);
    });

    test('cancels an animation where it is and gives the property back to the layout', () => {
        const button = new UIButton();
        button.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        button.animate('x', '50%', { duration: 100, easing: (progress) => progress });
        button.updateAnimations(50);
        button.cancelAnimation('x');

        expect(button.v('x')).toBe(50);
        expect(button.p('x').getDeclared()).toBe('50px');

        // The layout follows the parent again, from the value the animation stopped at
        button.resolveLayout({ x: 10, y: 0, width: 400, height: 100 });
        button.updateAnimations(50);
        expect(button.v('x')).toBe(60);
    });

    test('cancels the animation of a numeric property at its current value', () => {
        const text = new UIText();
        text.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        text.animate('fontSize', 30, { duration: 100, easing: (progress) => progress });
        text.updateAnimations(50);
        text.cancelAnimation('fontSize');
        text.updateAnimations(50);

        expect(text.v('fontSize')).toBe(22);
    });

    test('ignores the cancellation of a property that is not animated', () => {
        const button = new UIButton();
        button.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        button.cancelAnimation('x');

        expect(button.p('x').getDeclared()).toBe('0px');
    });

    test('retains custom resolution rules when a style value replaces the default', () => {
        const rule = new ParentPositionRule('x', 'width');
        const defaultProperty = new UIResolvableProperty('0px', rule);
        const property = createUIProperty('x', '25%', defaultProperty);

        if (!(property instanceof UIResolvableProperty)) {
            throw new Error('Expected a resolvable UI property');
        }

        expect(property.clone().rule).toBe(rule);
        expect(
            property.resolve({
                parentBounds: { x: 10, y: 0, width: 200, height: 100 },
                getValue: () => null,
                resolveProperty: () => 0,
            }),
        ).toBe(60);
    });
});
