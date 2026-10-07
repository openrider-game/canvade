import { UIPropertyBounds, UIPropertyResolutionContext } from './ui-property-resolution';
import { UIPropertyMap, UIResolvableProperty, UIResolvableUnit } from './ui-property.type';

export class UIPropertyResolver<P extends UIPropertyMap> {
    constructor(private readonly properties: P) {}

    public resolve(bounds: UIPropertyBounds): void {
        const context = this.createContext(bounds);
        for (const property of Object.values(this.properties)) {
            if (property instanceof UIResolvableProperty) {
                property.setValue(property.resolve(context));
            }
        }
    }

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
        return {
            parentBounds: bounds,
            getValue: (name) => {
                const property = this.properties[name];
                if (!property) {
                    throw new Error(`Cannot resolve UI property with unknown dependency "${name}"`);
                }
                return property.getValue();
            },
        };
    }
}
