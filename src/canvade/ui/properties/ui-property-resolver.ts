import { UIPropertyBounds, UIPropertyResolutionContext } from './ui-property-resolution';
import { UIPropertyMap, UIResolvableProperty, UIResolvableUnit } from './ui-property.type';

/** Resolves the `px`/`%` properties of a UI element against the bounds given by its parent. */
export class UIPropertyResolver<P extends UIPropertyMap> {
    constructor(private readonly properties: P) {}

    /**
     * Resolves every `px`/`%` property and stores its value in pixels.
     *
     * A property depending on another one (e.g. `x` on `width` when aligned right) resolves its
     * dependency on demand, so the resolution order does not matter.
     */
    public resolve(bounds: UIPropertyBounds): void {
        const context = this.createContext(bounds);
        for (const property of Object.values(this.properties)) {
            if (property instanceof UIResolvableProperty) {
                property.setValue(property.resolve(context));
            }
        }
    }

    /**
     * Resolves a unit with the rule of a property, without storing it, e.g. for an animation
     * target.
     *
     * @throws When the property is not a `px`/`%` property.
     */
    public resolveValue(
        propertyName: string,
        value: UIResolvableUnit,
        bounds: UIPropertyBounds,
    ): number {
        const property = this.properties[propertyName];
        if (!(property instanceof UIResolvableProperty)) {
            throw new Error(`UI property "${propertyName}" cannot resolve unit "${value}"`);
        }

        return property.resolveValue(value, this.createContext(bounds));
    }

    private createContext(bounds: UIPropertyBounds): UIPropertyResolutionContext {
        const context: UIPropertyResolutionContext = {
            parentBounds: bounds,
            getValue: (name) => {
                const property = this.properties[name];
                if (!property) {
                    throw new Error(`Cannot resolve UI property with unknown dependency "${name}"`);
                }
                return property.getValue();
            },
            resolveProperty: (name) => {
                const property = this.properties[name];
                if (!(property instanceof UIResolvableProperty)) {
                    throw new Error(`Cannot resolve UI property with unknown dependency "${name}"`);
                }
                return property.resolve(context);
            },
        };

        return context;
    }
}
