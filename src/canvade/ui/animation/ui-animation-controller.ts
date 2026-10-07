import { UIAnimation, UIAnimationOptions } from './ui-animation';
import {
    UIProperty,
    UIPropertyMap,
    UIResolvableProperty,
    UIResolvableUnit,
} from '../properties/ui-property.type';

export type UIAnimationTarget<T> =
    T extends UIResolvableProperty<UIResolvableUnit>
        ? number | UIResolvableUnit
        : T extends UIProperty<number>
          ? number
          : never;

interface ActiveUIAnimation {
    animation: UIAnimation;
    from: number | UIResolvableUnit;
    to: number | UIResolvableUnit;
}

export class UIAnimationController<P extends UIPropertyMap> {
    private readonly animations = new Map<string, ActiveUIAnimation>();
    private readonly animatedValues = new Map<string, number>();

    constructor(
        private readonly properties: P,
        private readonly resolveValue: (property: string, value: UIResolvableUnit) => number,
    ) {}

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
                ? (`${target}px` as `${number}px`)
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

    public cancel(property: string): void {
        this.animations.delete(property);
    }

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

    private finish(property: string, value: number, target: number | UIResolvableUnit): void {
        const uiProperty = this.properties[property];
        if (uiProperty instanceof UIResolvableProperty && typeof target === 'string') {
            uiProperty.setDeclared(target);
        }
        uiProperty.setValue(value);
        this.animatedValues.delete(property);
    }
}
