import { describe, expect, test } from 'vitest';
import { UIAnimation } from '../../src/canvade/ui/animation/ui-animation';
import { UIButton } from '../../src/canvade/ui/elements/ui-button';
import { UIContainer } from '../../src/canvade/ui/elements/ui-container';
import {
    ParentDimensionRule,
    resolveUIUnit,
} from '../../src/canvade/ui/properties/ui-property-resolution';
import { UIPropertyResolver } from '../../src/canvade/ui/properties/ui-property-resolver';
import {
    createUIProperty,
    UIProperty,
    UIResolvableProperty,
} from '../../src/canvade/ui/properties/ui-property.type';
import { UIElementFactory } from '../../src/canvade/ui/ui-element-factory';
import { buildUIElementTree, UIStructureDefinition } from '../../src/canvade/ui/ui-parser';

const BOUNDS = { x: 0, y: 0, width: 200, height: 100 };

describe('UI element factory', () => {
    test('creates the registered custom elements', () => {
        class CustomElement extends UIButton {}
        UIElementFactory.registerElement('custom-test', CustomElement);

        const root = buildUIElementTree(['custom-test.special']);

        expect(root.children[0]).toBeInstanceOf(CustomElement);
        expect(root.children[0].classNames).toEqual(['special']);
    });

    test('rejects unknown element types', () => {
        expect(() => UIElementFactory.createElement('unknown-test')).toThrow(
            'Unknown UI element type: unknown-test',
        );
    });
});

describe('UI definitions validation', () => {
    test.each<[string, UIStructureDefinition, string]>([
        ['an empty descriptor', ['.orphan'], 'Invalid UI element descriptor'],
        ['an invalid entry', [42 as never], 'Invalid UI structure entry'],
        [
            'an invalid element definition',
            [{ button: 'text' as never }],
            'Invalid definition for UI element "button"',
        ],
        [
            'an invalid click handler',
            [{ button: { events: { click: 'nope' as never } } }],
            'Invalid click handler for UI element "button"',
        ],
    ])('rejects %s in the structure', (_name, structure, message) => {
        expect(() => buildUIElementTree(structure)).toThrow(message);
    });

    test('rejects empty style selectors', () => {
        expect(() => buildUIElementTree(['button'], { ' ': { width: 10 } })).toThrow(
            'Style selectors cannot be empty',
        );
    });

    test('rejects values without unit for px/% properties', () => {
        expect(() => buildUIElementTree(['button'], { button: { width: 'wide' } })).toThrow(
            'Invalid value for resolvable UI property "width"',
        );
        expect(() => createUIProperty('width', null, new UIResolvableProperty('0px'))).toThrow();
    });

    test('rejects malformed units', () => {
        expect(() => resolveUIUnit('px', 100)).toThrow('Invalid UI unit: px');
        expect(() => resolveUIUnit('abc%' as never, 100)).toThrow('Invalid UI unit');
        expect(resolveUIUnit('-25%', 200)).toBe(-50);
    });
});

describe('UI properties resolution', () => {
    test('reads the first resolved property among fallbacks', () => {
        const button = new UIButton();
        button.resolveLayout(BOUNDS);

        expect(button.v('hoverBackgroundColor', 'backgroundColor')).toBe('#d0d0d0');
        expect(() => button.v('hoverBackgroundColor')).toThrow(
            'No value found for UI properties: hoverBackgroundColor',
        );
    });

    test('requires a layout before reading a resolved value', () => {
        const property = new UIResolvableProperty('10%', new ParentDimensionRule('width'));

        expect(property.isResolved()).toBe(false);
        expect(() => property.getValue()).toThrow('Property value not resolved');
        expect(property.getResolved(300)).toBe(30);
    });

    test('rejects unknown dependencies and non px/% properties', () => {
        const resolver = new UIPropertyResolver({
            width: new UIResolvableProperty('50%', new ParentDimensionRule('width')),
            color: new UIProperty('red'),
            broken: new UIResolvableProperty('10px', {
                resolve: (_value, context) => Number(context.getValue('missing')),
            }),
        });

        expect(() => resolver.resolveValue('color', '10px', BOUNDS)).toThrow(
            'UI property "color" cannot resolve unit "10px"',
        );
        expect(() => resolver.resolve(BOUNDS)).toThrow(
            'Cannot resolve UI property with unknown dependency "missing"',
        );
    });

    test('rejects an alignment depending on an unknown dimension', () => {
        const resolver = new UIPropertyResolver({
            horizontalAlign: new UIProperty('right'),
            x: new UIResolvableProperty('0px', {
                resolve: (_value, context) => context.resolveProperty('missing'),
            }),
        });

        expect(() => resolver.resolve(BOUNDS)).toThrow(
            'Cannot resolve UI property with unknown dependency "missing"',
        );
    });
});

describe('UI animations validation', () => {
    test('rejects invalid animation values', () => {
        expect(() => new UIAnimation(Number.NaN, 1, 100)).toThrow('finite numbers');
        expect(() => new UIAnimation(0, 1, -1)).toThrow('non-negative finite number');

        const animation = new UIAnimation(0, 1, 100, () => Number.NaN);
        expect(() => animation.update(-1)).toThrow('delta must be a non-negative');
        expect(() => animation.update(10, Number.POSITIVE_INFINITY, 1)).toThrow('finite numbers');
        expect(() => animation.update(10)).toThrow('easing must return a finite number');
    });

    test('completes zero duration animations immediately', () => {
        expect(new UIAnimation(0, 10, 0).update(0)).toEqual({ value: 10, complete: true });

        const button = new UIButton();
        button.resolveLayout(BOUNDS);
        button.animate('x', 40, { duration: 0 });
        expect(button.v('x')).toBe(40);
        expect(button.p('x').getDeclared()).toBe('40px');
    });

    test('rejects animations of unknown, non numeric or unlaid properties', () => {
        const button = new UIButton();

        expect(() => button.animate('x', 10, { duration: 100 })).toThrow();
        button.resolveLayout(BOUNDS);
        expect(() => button.animate('missing' as never, 10 as never, { duration: 100 })).toThrow(
            'Cannot animate unknown UI property "missing"',
        );
        expect(() => button.animate('text', 10 as never, { duration: 100 })).toThrow(
            'must have a finite numeric value to animate',
        );

        // Before any layout, the current value of a px/% property is unknown
        const container = new UIContainer();
        expect(() => container.animate('x', '10%', { duration: 100 })).toThrow(
            'Property value not resolved',
        );
    });
});
