import { Cloneable } from '../../core/cloneable.interface';
import {
    ParentDimensionRule,
    UIPropertyResolutionContext,
    UIPropertyResolutionRule,
    resolveUIUnit,
} from './ui-property-resolution';

export type UIPixel = `${number}px`;
export type UIPercentage = `${number}%`;
export type UIResolvableUnit = UIPixel | UIPercentage;

export type UIUnit = number | string | null;

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

export class UIResolvableProperty<T extends UIResolvableUnit>
    extends UIProperty<number | null>
    implements Cloneable<UIResolvableProperty<T>>
{
    constructor(
        public declared: T,
        public readonly rule: UIPropertyResolutionRule = new ParentDimensionRule('width'),
    ) {
        super(null);
    }

    public getDeclared(): T {
        return this.declared;
    }

    public setDeclared(value: T) {
        this.declared = value;
        this._value = null;
    }

    public override clone(): UIResolvableProperty<T> {
        const property = new UIResolvableProperty(this.declared, this.rule);
        property._value = this._value;
        return property;
    }

    public override getValue(): number {
        if (this._value === null) {
            throw new Error('Property value not resolved. Call resolve() before getValue().');
        }

        return this._value as number;
    }

    public isResolved(): boolean {
        return this._value !== null;
    }

    public getResolved(reference: number): number {
        return resolveUIUnit(this.declared, reference);
    }

    public resolve(context: UIPropertyResolutionContext): number {
        return this.rule.resolve(this.declared, context);
    }

    public resolveValue(value: T, context: UIPropertyResolutionContext): number {
        return this.rule.resolve(value, context);
    }
}

export type UIPropertyInstance = UIProperty<UIUnit> | UIResolvableProperty<UIResolvableUnit>;
export type UIPropertyMap = Record<string, UIPropertyInstance>;

export function cloneUIPropertyMap<P extends UIPropertyMap>(properties: P): P {
    return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [key, property.clone()]),
    ) as P;
}

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

export function createUIProperty(
    name: string,
    value: UIUnit,
    defaultProperty: unknown,
): UIPropertyInstance {
    if (defaultProperty instanceof UIResolvableProperty) {
        if (typeof value === 'number') {
            return new UIResolvableProperty(`${value}px` as UIPixel, defaultProperty.rule);
        }

        if (typeof value === 'string') {
            switch (true) {
                case value.endsWith('px'):
                    return new UIResolvableProperty(value as UIPixel, defaultProperty.rule);
                case value.endsWith('%'):
                    return new UIResolvableProperty(value as UIPercentage, defaultProperty.rule);
            }
        }

        throw new Error(
            `Invalid value for resolvable UI property "${name}": ${String(value)}. Expected a px or % unit.`,
        );
    }

    return new UIProperty(value);
}

export type UIPropertyValue<T> =
    T extends UIResolvableProperty<UIResolvableUnit>
        ? number
        : T extends UIProperty<infer V>
          ? V
          : never;
