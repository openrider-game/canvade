import { UIButton } from './elements/ui-button';
import { UIContainer } from './elements/ui-container';
import { UIText } from './elements/ui-text';
import { UIElement } from './ui-element';

export type UIElementConstructor = new (classNames?: string[]) => UIElement;

const builtInElementTypes = {
    container: UIContainer,
    button: UIButton,
    text: UIText,
};

export type BuiltInUIElementType = keyof typeof builtInElementTypes;
export type UIElementType = BuiltInUIElementType | (string & {});

export class UIElementFactory {
    private static readonly elementTypes = new Map<string, UIElementConstructor>(
        Object.entries(builtInElementTypes),
    );

    public static createElement(type: UIElementType, classNames: string[] = []): UIElement {
        const ElementClass = this.elementTypes.get(type);
        if (!ElementClass) {
            throw new Error(`Unknown UI element type: ${type}`);
        }

        return new ElementClass(classNames);
    }

    public static registerElement(type: string, ElementClass: UIElementConstructor): void {
        this.elementTypes.set(type, ElementClass);
    }
}
