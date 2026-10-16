import { Cloneable } from '../../core/cloneable.interface';
import {
    ParentDimensionRule,
    UIPropertyResolutionContext,
    UIPropertyResolutionRule,
    resolveUIUnit,
} from './ui-property-resolution';
import { UI_PERCENTAGE_UNIT, UI_PIXEL_UNIT } from './ui-property.constants';

/** Length in pixels, e.g. `'12px'`. */
export type UIPixel = `${number}${typeof UI_PIXEL_UNIT}`;
/** Length relative to a reference size of the parent, e.g. `'50%'`. */
export type UIPercentage = `${number}${typeof UI_PERCENTAGE_UNIT}`;
/** Unit of a `px`/`%` property, resolved to pixels during the layout. */
export type UIResolvableUnit = UIPixel | UIPercentage;

/** Raw value of a UI property, as written in a style definition. */
export type UIUnit = number | string | null;

/** Property of a UI element holding a plain value. */
export class UIProperty<T extends UIUnit> implements Cloneable<UIProperty<T>> {
    constructor(protected _value: T) {}

    public getValue(): T {
        return this._value;
    }

    public setValue(value: T) {
        this._value = value;
    }

    public clone(): UIProperty<T> {
        return new UIProperty(this._value);
    }
}

/**
 * Property of a UI element declared in `px` or `%` and resolved to pixels during the layout.
 *
 * The declared unit is kept, and the value is the result of the last resolution by the
 * {@link UIPropertyResolutionRule | rule} of the property, `null` until the first layout.
 */
export class UIResolvableProperty<T extends UIResolvableUnit>
    extends UIProperty<number | null>
    implements Cloneable<UIResolvableProperty<T>>
{
    /**
     * Creates an unresolved property.
     *
     * @param rule - Rule converting the unit to pixels, a `%` of the parent width by default.
     */
    constructor(
        public declared: T,
        public readonly rule: UIPropertyResolutionRule = new ParentDimensionRule('width'),
    ) {
        super(null);
    }

    public getDeclared(): T {
        return this.declared;
    }

    /** Changes the declared unit; the value is unresolved until the next layout. */
    public setDeclared(value: T) {
        this.declared = value;
        this._value = null;
    }

    public override clone(): UIResolvableProperty<T> {
        const property = new UIResolvableProperty(this.declared, this.rule);
        property._value = this._value;
        return property;
    }

    /**
     * Returns the resolved value, in pixels.
     *
     * @throws When the property has not been resolved yet.
     */
    public override getValue(): number {
        if (this._value === null) {
            throw new Error('Property value not resolved. Call resolve() before getValue().');
        }

        return this._value as number;
    }

    public isResolved(): boolean {
        return this._value !== null;
    }

    /**
     * Converts the declared unit to pixels against a reference size, ignoring the rule.
     *
     * @param reference - Size in pixels that `100%` represents.
     */
    public getResolved(reference: number): number {
        return resolveUIUnit(this.declared, reference);
    }

    /** Computes the declared unit in pixels with the rule, without storing the result. */
    public resolve(context: UIPropertyResolutionContext): number {
        return this.rule.resolve(this.declared, context);
    }

    /** Computes another unit in pixels with the rule of this property. */
    public resolveValue(value: T, context: UIPropertyResolutionContext): number {
        return this.rule.resolve(value, context);
    }
}

/** Any UI property. */
export type UIPropertyInstance = UIProperty<UIUnit> | UIResolvableProperty<UIResolvableUnit>;
/** Properties of a UI element, by name. */
export type UIPropertyMap = Record<string, UIPropertyInstance>;

/** Returns a copy of a property map with every property cloned. */
export function cloneUIPropertyMap<P extends UIPropertyMap>(properties: P): P {
    return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [key, property.clone()]),
    ) as P;
}

/**
 * Overrides default properties with other ones.
 *
 * A `px`/`%` override of a `px`/`%` default keeps the rule of the default, so that e.g. an
 * overridden `x` is still aligned. The property objects are not cloned.
 */
export function mergeUIPropertyMap<P extends UIPropertyMap>(defaults: P, overrides: Partial<P>): P {
    const properties: UIPropertyMap = { ...defaults, ...overrides };

    for (const [name, defaultProperty] of Object.entries(defaults)) {
        const property = properties[name];
        if (
            defaultProperty instanceof UIResolvableProperty &&
            property instanceof UIResolvableProperty
        ) {
            properties[name] = new UIResolvableProperty(property.declared, defaultProperty.rule);
        }
    }

    return properties as P;
}

/**
 * Creates a property from a style declaration.
 *
 * When the default property is a `px`/`%` property, the value must be a `px` or `%` string, or
 * a number of pixels, and the new property keeps the rule of the default one. Otherwise, a
 * plain property is created.
 *
 * @param defaultProperty - Current property of the element with this name, if any.
 * @throws When a `px`/`%` property gets another value.
 */
export function createUIProperty(
    name: string,
    value: UIUnit,
    defaultProperty: unknown,
): UIPropertyInstance {
    if (defaultProperty instanceof UIResolvableProperty) {
        if (typeof value === 'number') {
            return new UIResolvableProperty(
                `${value}${UI_PIXEL_UNIT}` as UIPixel,
                defaultProperty.rule,
            );
        }

        if (typeof value === 'string') {
            switch (true) {
                case value.endsWith(UI_PIXEL_UNIT):
                    return new UIResolvableProperty(value as UIPixel, defaultProperty.rule);
                case value.endsWith(UI_PERCENTAGE_UNIT):
                    return new UIResolvableProperty(value as UIPercentage, defaultProperty.rule);
            }
        }

        throw new Error(
            `Invalid value for resolvable UI property "${name}": ${String(value)}. ` +
                `Expected a ${UI_PIXEL_UNIT} or ${UI_PERCENTAGE_UNIT} unit.`,
        );
    }

    return new UIProperty(value);
}

/** Type of the value of a property, as returned by `UIElement.v`. */
export type UIPropertyValue<T> =
    T extends UIResolvableProperty<UIResolvableUnit>
        ? number
        : T extends UIProperty<infer V>
          ? V
          : never;
