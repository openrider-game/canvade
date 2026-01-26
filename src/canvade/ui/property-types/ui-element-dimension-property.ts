import { UIElement } from '../ui-element';
import { UIElementProperty } from '../ui-element-property';

abstract class UIElementLengthProperty extends UIElementProperty<number> {
    computeValue(parent: UIElement | null): number | null {
        if (this.displayValue.endsWith('px')) {
            return parseFloat(this.displayValue);
        } else if (this.displayValue.endsWith('%')) {
            const parentValue = this.getCurrentComputedParentValue(parent);
            if (parentValue !== null) {
                const percentage = parseFloat(this.displayValue) / 100;
                return parentValue * percentage;
            }
        }
        return null;
    }
}

export class UIElementWidthProperty extends UIElementLengthProperty {
    getCurrentComputedParentValue(parent: UIElement | null = null): number | null {
        const parentBox = parent?.getBox();
        return parentBox ? parentBox.width : null;
    }
}

export class UIElementHeightProperty extends UIElementLengthProperty {
    getCurrentComputedParentValue(parent: UIElement | null = null): number | null {
        const parentBox = parent?.getBox();
        return parentBox ? parentBox.height : null;
    }
}
