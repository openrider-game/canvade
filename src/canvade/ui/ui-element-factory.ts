import { UIButton } from './elements/ui-button';
import { UIContainer } from './elements/ui-container';
import { UIText } from './elements/ui-text';
import { UIElement } from './ui-element';
import { UI_BUTTON_TYPE, UI_CONTAINER_TYPE, UI_TEXT_TYPE } from './ui.constants';

/** Constructor of a UI element type, called with the class names of the element. */
export type UIElementConstructor = new (classNames?: string[]) => UIElement;

const builtInElementTypes = {
    [UI_CONTAINER_TYPE]: UIContainer,
    [UI_BUTTON_TYPE]: UIButton,
    [UI_TEXT_TYPE]: UIText,
};

/** Types of the built-in UI elements: `container`, `button` and `text`. */
export type BuiltInUIElementType = keyof typeof builtInElementTypes;
/** Type of a UI element: a built-in type or a type registered in {@link UIElementFactory}. */
export type UIElementType = BuiltInUIElementType | (string & {});

/** Creates the UI elements of structure definitions from their type name. */
export class UIElementFactory {
    private static readonly elementTypes = new Map<string, UIElementConstructor>(
        Object.entries(builtInElementTypes),
    );

    /**
     * Creates an element of a built-in or registered type, with its default properties.
     *
     * @throws When the type is neither built-in nor registered.
     */
    public static createElement(type: UIElementType, classNames: string[] = []): UIElement {
        const ElementClass = this.elementTypes.get(type);
        if (!ElementClass) {
            throw new Error(`Unknown UI element type: ${type}`);
        }

        return new ElementClass(classNames);
    }

    /**
     * Registers a custom element type, usable in structure definitions and style selectors.
     *
     * Registering a built-in type name replaces the built-in element.
     */
    public static registerElement(type: string, ElementClass: UIElementConstructor): void {
        this.elementTypes.set(type, ElementClass);
    }
}
