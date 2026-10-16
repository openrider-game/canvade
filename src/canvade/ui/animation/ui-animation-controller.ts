import { UIAnimation, UIAnimationOptions } from './ui-animation';
import { UI_PIXEL_UNIT } from '../properties/ui-property.constants';
import {
    UIPixel,
    UIProperty,
    UIPropertyMap,
    UIResolvableProperty,
    UIResolvableUnit,
} from '../properties/ui-property.type';

/**
 * Target value accepted to animate a property: a number or a `px`/`%` unit for a `px`/`%`
 * property (numbers being pixels), a number for a numeric property.
 */
export type UIAnimationTarget<T> =
    T extends UIResolvableProperty<UIResolvableUnit>
        ? number | UIResolvableUnit
        : T extends UIProperty<number>
          ? number
          : never;

/** Running animation, its endpoints being kept as units to be re-resolved each frame. */
interface ActiveUIAnimation {
    animation: UIAnimation;
    from: number | UIResolvableUnit;
    to: number | UIResolvableUnit;
}

/**
 * Runs the animations of the properties of a UI element, at most one per property.
 *
 * Animated values override the values resolved by the layout until the animation ends. The
 * `px`/`%` endpoints are re-resolved every frame, so an animation to `50%` follows the size of
 * the parent. When it ends, a `px`/`%` property takes the target as its new declared value, so
 * the layout keeps it afterwards.
 */
export class UIAnimationController<P extends UIPropertyMap> {
    private readonly animations = new Map<string, ActiveUIAnimation>();
    /** Last animated value of each property, applied over the layout until the animation ends. */
    private readonly animatedValues = new Map<string, number>();

    /**
     * Creates the animation controller of an element.
     *
     * @param properties - Properties of the element, updated in place.
     * @param resolveValue - Resolves a `px`/`%` unit of a property against the current parent
     *   bounds of the element.
     */
    constructor(
        private readonly properties: P,
        private readonly resolveValue: (property: string, value: UIResolvableUnit) => number,
    ) {}

    /**
     * Starts animating a property from its current value, replacing its running animation.
     *
     * With a duration of 0, the target is applied immediately.
     *
     * @throws When the property is unknown, or its current value or target is not a finite
     * number.
     */
    public animate<K extends keyof P & string>(
        property: K,
        target: UIAnimationTarget<NonNullable<P[K]>>,
        options: UIAnimationOptions,
    ): void {
        const uiProperty = this.properties[property];
        if (!uiProperty) {
            throw new Error(`Cannot animate unknown UI property "${property}"`);
        }

        const currentValue = this.animatedValues.get(property) ?? uiProperty.getValue();
        if (typeof currentValue !== 'number' || !Number.isFinite(currentValue)) {
            throw new Error(
                `UI property "${property}" must have a finite numeric value to animate`,
            );
        }

        const animationTarget =
            uiProperty instanceof UIResolvableProperty && typeof target === 'number'
                ? (`${target}${UI_PIXEL_UNIT}` as UIPixel)
                : target;
        const to =
            uiProperty instanceof UIResolvableProperty
                ? this.resolveValue(property, animationTarget as UIResolvableUnit)
                : animationTarget;
        if (typeof to !== 'number' || !Number.isFinite(to)) {
            throw new Error(
                `UI property "${property}" must have a finite numeric animation target`,
            );
        }

        // Without a running animation, start from the declared unit so that it follows resizes
        const from =
            uiProperty instanceof UIResolvableProperty && !this.animations.has(property)
                ? uiProperty.declared
                : currentValue;
        const activeAnimation: ActiveUIAnimation = {
            animation: new UIAnimation(currentValue, to, options.duration, options.easing),
            from,
            to: animationTarget,
        };

        this.animatedValues.set(property, currentValue);
        if (options.duration === 0) {
            this.animations.delete(property);
            this.finish(property, to, animationTarget);
        } else {
            this.animations.set(property, activeAnimation);
        }
    }

    /**
     * Stops the animation of a property where it is.
     *
     * The property keeps its current value: a `px`/`%` property takes it, in pixels, as its new
     * declared value, so that the layout handles it again from then on.
     */
    public cancel(property: string): void {
        const value = this.animatedValues.get(property);
        this.animations.delete(property);

        if (value !== undefined) {
            this.finish(property, value, `${value}${UI_PIXEL_UNIT}` as UIPixel);
        }
    }

    /**
     * Advances the running animations and writes their values to the properties.
     *
     * Called with a `delta` of 0 after each layout, to apply the animated values over the
     * freshly resolved ones.
     *
     * @param delta - Elapsed time, in milliseconds.
     * @param apply - Whether to write the values of the running animations to the properties
     *   too, over the values resolved by the layout.
     */
    public update(delta: number, apply: boolean = true): void {
        for (const [property, active] of this.animations) {
            const from = this.resolveEndpoint(property, active.from);
            const to = this.resolveEndpoint(property, active.to);
            const result = active.animation.update(delta, from, to);
            this.animatedValues.set(property, result.value);
            this.properties[property].setValue(result.value);

            if (result.complete) {
                this.animations.delete(property);
                this.finish(property, result.value, active.to);
            }
        }

        if (apply) {
            for (const [property, value] of this.animatedValues) {
                this.properties[property].setValue(value);
            }
        }
    }

    private resolveEndpoint(property: string, endpoint: number | UIResolvableUnit): number {
        return typeof endpoint === 'number' ? endpoint : this.resolveValue(property, endpoint);
    }

    /** Applies the final value, and the target unit as the new declared value of the property. */
    private finish(property: string, value: number, target: number | UIResolvableUnit): void {
        const uiProperty = this.properties[property];
        if (uiProperty instanceof UIResolvableProperty && typeof target === 'string') {
            uiProperty.setDeclared(target);
        }
        uiProperty.setValue(value);
        this.animatedValues.delete(property);
    }
}
