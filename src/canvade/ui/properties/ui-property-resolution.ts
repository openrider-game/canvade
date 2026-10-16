import { UI_PERCENTAGE_UNIT, UI_PIXEL_UNIT } from './ui-property.constants';
import type { UIResolvableUnit, UIUnit } from './ui-property.type';

/** Rectangle in canvas pixels. */
export interface UIPropertyBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Parent edge the `x` offset of an element is measured from; `center` offsets the element from
 * the horizontally centered position.
 */
export type UIHorizontalAlign = 'left' | 'center' | 'right';
/**
 * Parent edge the `y` offset of an element is measured from; `middle` offsets the element from
 * the vertically centered position.
 */
export type UIVerticalAlign = 'top' | 'middle' | 'bottom';
/**
 * Layout mode of an element in a container: `static` elements follow each other, `absolute`
 * ones are laid out in the whole content box without affecting the others.
 */
export type UIPosition = 'static' | 'absolute';

/** Context given to a {@link UIPropertyResolutionRule}. */
export interface UIPropertyResolutionContext {
    /** Bounds the element is laid out in, i.e. the bounds given by its parent. */
    parentBounds: UIPropertyBounds;
    /**
     * Returns the current value of another property of the element.
     *
     * @throws When the element has no such property.
     */
    getValue(property: string): UIUnit | number;
    /**
     * Resolves another `px`/`%` property of the element, e.g. its width to align it right.
     *
     * @throws When the element has no such `px`/`%` property.
     */
    resolveProperty(property: string): number;
}

/** Converts the `px`/`%` unit of a property to canvas pixels. */
export interface UIPropertyResolutionRule {
    resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number;
}

/** Resolves a size, `%` being relative to the parent width or height. */
export class ParentDimensionRule implements UIPropertyResolutionRule {
    constructor(private readonly dimension: 'width' | 'height') {}

    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        return resolveUIUnit(value, context.parentBounds[this.dimension]);
    }
}

/**
 * Resolves a position, as an offset from the parent edge selected by the `horizontalAlign` or
 * `verticalAlign` property of the element.
 *
 * The offset, whose `%` is relative to the parent size, moves the element away from that edge,
 * towards the inside of the parent; from the centered position, it moves the element right or
 * down.
 */
export class ParentPositionRule implements UIPropertyResolutionRule {
    /**
     * Creates the rule of one axis.
     *
     * @param position - Coordinate to resolve.
     * @param dimension - Parent dimension the `%` refers to, and own dimension used to align
     *   the element.
     */
    constructor(
        private readonly position: 'x' | 'y',
        private readonly dimension: 'width' | 'height',
    ) {}

    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        const parentStart = context.parentBounds[this.position];
        const parentSize = context.parentBounds[this.dimension];
        const offset = resolveUIUnit(value, parentSize);
        const alignment = context.getValue(
            this.position === 'x' ? 'horizontalAlign' : 'verticalAlign',
        );

        switch (alignment) {
            case 'right':
            case 'bottom':
                return parentStart + parentSize - context.resolveProperty(this.dimension) - offset;
            case 'center':
            case 'middle':
                return (
                    parentStart +
                    (parentSize - context.resolveProperty(this.dimension)) / 2 +
                    offset
                );
            default:
                return parentStart + offset;
        }
    }
}

/**
 * Resolves the gap between the children of a container, `%` being relative to the width (row)
 * or height (column) of the content box of the container itself, like in CSS.
 */
export class ContainerGapRule implements UIPropertyResolutionRule {
    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        const dimension = context.getValue('flexDirection') === 'row' ? 'width' : 'height';
        const contentSize = Math.max(
            0,
            context.resolveProperty(dimension) - 2 * context.resolveProperty('padding'),
        );
        return resolveUIUnit(value, contentSize);
    }
}

/**
 * Resolves the padding of a container, `%` being relative to the width of the bounds the
 * container is laid out in, on both axes like in CSS.
 */
export class ContainerPaddingRule implements UIPropertyResolutionRule {
    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        return resolveUIUnit(value, context.parentBounds.width);
    }
}

/**
 * Converts a `px` or `%` unit to pixels.
 *
 * @param reference - Size in pixels that `100%` represents.
 * @throws When the value is not a finite number followed by `px` or `%`.
 */
export function resolveUIUnit(value: UIResolvableUnit, reference: number): number {
    switch (true) {
        case value.endsWith(UI_PIXEL_UNIT): {
            const amount = parseUnitAmount(value, UI_PIXEL_UNIT);
            if (amount !== null) {
                return amount;
            }
            break;
        }
        case value.endsWith(UI_PERCENTAGE_UNIT): {
            const amount = parseUnitAmount(value, UI_PERCENTAGE_UNIT);
            if (amount !== null) {
                return (amount / 100) * reference;
            }
            break;
        }
    }

    throw new Error(`Invalid UI unit: ${value}`);
}

/** Reads the number before the unit, `null` if it is missing or not a finite number. */
function parseUnitAmount(value: string, unit: string): number | null {
    const amount = value.slice(0, -unit.length);
    return amount.trim() !== '' && Number.isFinite(Number(amount)) ? Number(amount) : null;
}
