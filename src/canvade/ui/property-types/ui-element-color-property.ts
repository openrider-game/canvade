import { UIElementProperty } from '../ui-element-property';

export class UIElementColorProperty extends UIElementProperty<string> {
    getCurrentComputedParentValue(): null {
        return null;
    }

    computeValue(): string {
        return this.displayValue;
    }
}
