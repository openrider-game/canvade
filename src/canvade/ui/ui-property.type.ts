import { Cloneable } from '../core/cloneable.interface';

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
    constructor(public declared: T) {
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
        const property = new UIResolvableProperty(this.declared);
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
        switch (true) {
            case this.declared.endsWith('px'): {
                const amount = Number(this.declared.slice(0, -2));
                if (Number.isFinite(amount) && this.declared.slice(0, -2).trim() !== '') {
                    return amount;
                }
                break;
            }
            case this.declared.endsWith('%'): {
                const amount = Number(this.declared.slice(0, -1));
                if (Number.isFinite(amount) && this.declared.slice(0, -1).trim() !== '') {
                    return (amount / 100) * reference;
                }
                break;
            }
        }

        throw new Error(`Invalid UI unit: ${this.declared}`);
    }
}

export type UIPropertyInstance = UIProperty<UIUnit> | UIResolvableProperty<UIResolvableUnit>;
export type UIPropertyMap = Record<string, UIPropertyInstance>;

export function cloneUIPropertyMap<P extends UIPropertyMap>(properties: P): P {
    return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [key, property.clone()]),
    ) as P;
}

export function createUIProperty(
    name: string,
    value: UIUnit,
    defaultProperty: unknown,
): UIPropertyInstance {
    if (defaultProperty instanceof UIResolvableProperty) {
        if (typeof value === 'number') {
            return new UIResolvableProperty(`${value}px` as UIPixel);
        }

        if (typeof value === 'string') {
            switch (true) {
                case value.endsWith('px'):
                    return new UIResolvableProperty(value as UIPixel);
                case value.endsWith('%'):
                    return new UIResolvableProperty(value as UIPercentage);
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
