import { UIElement } from './ui-element';

export type ComputedType = string | number | boolean;

export abstract class UIElementProperty<T extends ComputedType> {
    private computedValue: T | null = null;
    private lastComputedParentValue: T | null = null;

    constructor(public displayValue: string) {}

    public getComputedValue(parent: UIElement | null = null): T | null {
        const currentComputedParentValue = this.getCurrentComputedParentValue(parent);
        if (this.lastComputedParentValue !== currentComputedParentValue) {
            this.lastComputedParentValue = currentComputedParentValue;
            this.computedValue = this.computeValue(parent);
        }

        return this.computedValue;
    }

    protected abstract getCurrentComputedParentValue(parent: UIElement | null): T | null;
    protected abstract computeValue(parent: UIElement | null): T | null;
}

export type PropertyMap<T extends ComputedType> = {
    [key: string]: UIElementProperty<T> | undefined;
};

export type FormatMap<T extends PropertyMap<ComputedType>> = {
    [K in keyof T]: string;
};
