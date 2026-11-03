import { UIPropertyBounds, UIPropertyResolutionContext } from './ui-property-resolution';
import { UIPropertyMap, UIResolvableProperty, UIResolvableUnit } from './ui-property.type';

/** Resolves the `px`/`%` properties of a UI element against the bounds given by its parent. */
export class UIPropertyResolver<P extends UIPropertyMap> {
    /** Current values of the running resolution, read by {@link context}. */
    private currentValue: ((propertyName: string) => number | undefined) | undefined;
    /**
     * Context of the resolutions, made once: an element resolves its properties on every frame.
     * Each resolution gives it its bounds, and it reads the current values of that resolution.
     */
    private readonly context: UIPropertyResolutionContext;

    constructor(private readonly properties: P) {
        this.context = {
            parentBounds: { x: 0, y: 0, width: 0, height: 0 },
            getValue: (name) => this.dependency(name).getValue(),
            resolveProperty: (name) => {
                const current = this.currentValue?.(name);
                if (current !== undefined) {
                    return current;
                }
                const property = this.properties[name];
                if (!(property instanceof UIResolvableProperty)) {
                    throw new Error(`Cannot resolve UI property with unknown dependency "${name}"`);
                }
                return property.resolve(this.context);
            },
        };
    }

    /**
     * Resolves every `px`/`%` property and stores its value in pixels.
     *
     * A property depending on another one (e.g. `x` on `width` when aligned right) resolves its
     * dependency on demand, so the resolution order does not matter.
     *
     * @param currentValue - Value a dependency has in place of its resolved value, if any, e.g.
     *   the animated `height` of an element aligned to the bottom of its parent.
     */
    public resolve(
        bounds: UIPropertyBounds,
        currentValue?: (propertyName: string) => number | undefined,
    ): void {
        this.context.parentBounds = bounds;
        this.currentValue = currentValue;
        try {
            // Without listing the properties in an array on every frame
            for (const name in this.properties) {
                const property = this.properties[name];
                if (property instanceof UIResolvableProperty) {
                    property.setValue(property.resolve(this.context));
                }
            }
        } finally {
            this.currentValue = undefined;
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

    /** A property another one depends on. */
    private dependency(name: string): UIPropertyMap[string] {
        const property = this.properties[name];
        if (!property) {
            throw new Error(`Cannot resolve UI property with unknown dependency "${name}"`);
        }
        return property;
    }

    private createContext(
        bounds: UIPropertyBounds,
        currentValue?: (propertyName: string) => number | undefined,
    ): UIPropertyResolutionContext {
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
                const current = currentValue?.(name);
                if (current !== undefined) {
                    return current;
                }

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
