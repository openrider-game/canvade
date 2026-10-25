import {
    UIClickHandler,
    UIElement,
    UIPressHandler,
    UIScrollHandler,
    UIValueHandler,
} from './ui-element';
import { UIElementFactory } from './ui-element-factory';
import { createUIProperty, UIPropertyInstance } from './properties/ui-property.type';
import {
    computeProperties,
    parseStyleRules,
    StyleRule,
    UIStyleDefinition,
    UIStyleProperties,
} from './ui-style-rules';
import {
    UI_CLASS_SEPARATOR,
    UI_CONTAINER_TYPE,
    UI_ROOT_SIZE,
    UI_TRANSPARENT,
} from './ui.constants';

export type { UIStyleDefinition, UIStyleProperties } from './ui-style-rules';

/** Definition of an element with options, in a {@link UIStructureDefinition}. */
export interface UIStructureElementDefinition {
    children?: UIStructureDefinition;
    events?: UIStructureEvents;
    /** Free data copied to {@link UIElement.data}. */
    data?: Record<string, unknown>;
}

/**
 * Event handlers of an element, in a {@link UIStructureElementDefinition}. `change` and
 * `submit` are dispatched by the inputs, `scroll` by the scrolling containers, `press` and
 * `release` by every element held by the mouse or by fingers.
 */
export interface UIStructureEvents {
    click?: UIClickHandler;
    press?: UIPressHandler;
    release?: UIPressHandler;
    change?: UIValueHandler;
    submit?: UIValueHandler;
    scroll?: UIScrollHandler;
}

/**
 * Structure of a UI tree: a list of elements, drawn in order (the last one on top).
 *
 * Each element is described by its type followed by its class names, separated by dots, e.g.
 * `button.primary.large`. An entry is either such a descriptor (an element without children)
 * or an object mapping descriptors to their children list or to a
 * {@link UIStructureElementDefinition}:
 *
 * ```ts
 * [
 *     'text.title',
 *     { 'container.menu': ['button.play', { 'button.quit': { events: { click: quit } } }] },
 * ]
 * ```
 */
export type UIStructureDefinition = Array<
    string | Record<string, UIStructureDefinition | UIStructureElementDefinition>
>;
/** Element parsed from a structure definition, before its creation. */
interface ElementDescriptor {
    type: string;
    classNames: string[];
    children: ElementDescriptor[];
    events?: UIStructureEvents;
    data?: Record<string, unknown>;
    parent?: ElementDescriptor;
}

/**
 * Builds a UI tree from structure and style definitions.
 *
 * The elements of the structure are placed in an implicit root container covering the whole
 * canvas (`100%` wide and high, transparent), which is ignored by hit tests. The root is not
 * part of the structure: no style rule applies to it, and it is not an ancestor for the
 * descendant selectors.
 *
 * @returns The root container.
 * @throws When a definition is invalid, an element type is unknown or a `px`/`%` property gets
 * another value.
 */
export function buildUIElementTree(
    structureDefinition: UIStructureDefinition,
    styleDefinition: UIStyleDefinition = {},
): UIElement {
    const rules = parseStyleRules(styleDefinition);
    const root = createDescriptor(UI_CONTAINER_TYPE);
    root.children = parseStructure(structureDefinition, root);
    return buildElement(root, rules, [], true);
}

function parseStructure(
    definition: UIStructureDefinition,
    parent?: ElementDescriptor,
): ElementDescriptor[] {
    const nodes: ElementDescriptor[] = [];

    for (const item of definition) {
        if (typeof item === 'string') {
            nodes.push(createDescriptor(item, parent));
            continue;
        }

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`Invalid UI structure entry: ${String(item)}`);
        }

        for (const [descriptor, definitionForElement] of Object.entries(item)) {
            const node = createDescriptor(descriptor, parent);
            if (Array.isArray(definitionForElement)) {
                node.children = parseStructure(definitionForElement, node);
            } else if (definitionForElement && typeof definitionForElement === 'object') {
                node.events = definitionForElement.events;
                node.data = definitionForElement.data;
                node.children = parseStructure(definitionForElement.children ?? [], node);
            } else {
                throw new Error(`Invalid definition for UI element "${descriptor}"`);
            }
            nodes.push(node);
        }
    }

    return nodes;
}

function createDescriptor(value: string, parent?: ElementDescriptor): ElementDescriptor {
    const [type = '', ...classNames] = value.trim().split(UI_CLASS_SEPARATOR);
    if (!type) {
        throw new Error(`Invalid UI element descriptor: "${value}"`);
    }

    const descriptor: ElementDescriptor = {
        type,
        classNames: classNames.filter(Boolean),
        children: [],
    };
    descriptor.parent = parent;
    return descriptor;
}

/**
 * Creates an element and its subtree, applying the style rules matching each element.
 *
 * @param ancestors - Descriptors of the ancestors of the element for the descendant selectors,
 * from the top level element to the parent, the implicit root being excluded.
 */
function buildElement(
    descriptor: ElementDescriptor,
    rules: StyleRule[],
    ancestors: ElementDescriptor[],
    isTreeRoot: boolean = false,
): UIElement {
    // The implicit root is not part of the structure, so no style rule applies to it
    const properties = isTreeRoot
        ? { width: UI_ROOT_SIZE, height: UI_ROOT_SIZE, color: UI_TRANSPARENT }
        : computeProperties(rules, [...ancestors, descriptor]);
    const element = createElement(descriptor, properties);
    element.isTreeRoot = isTreeRoot;
    Object.assign(element.data, descriptor.data);
    const { click, change, submit, scroll, press, release } = descriptor.events ?? {};
    if (click !== undefined) {
        element.onClick(checkHandler(click, 'click', descriptor));
    }
    for (const [name, handler] of [
        ['press', press],
        ['release', release],
    ] as const) {
        if (handler !== undefined) {
            const pressHandler = checkHandler(handler, name, descriptor);
            element.subscribe(name, (event) => pressHandler(event.detail.target));
        }
    }
    for (const [name, handler] of [
        ['change', change],
        ['submit', submit],
    ] as const) {
        if (handler !== undefined) {
            const valueHandler = checkHandler(handler, name, descriptor);
            element.subscribe(name, (event) =>
                valueHandler(event.detail.value, event.detail.target),
            );
        }
    }
    if (scroll !== undefined) {
        const scrollHandler = checkHandler(scroll, 'scroll', descriptor);
        element.subscribe('scroll', (event) =>
            scrollHandler(event.detail.scrollTop, event.detail.target),
        );
    }
    const currentPath = isTreeRoot ? [] : [...ancestors, descriptor];

    for (const child of descriptor.children) {
        element.addChild(buildElement(child, rules, currentPath));
    }

    return element;
}

/**
 * Returns the handler of an event of a structure definition.
 *
 * @throws When the handler is not a function.
 */
function checkHandler<T>(handler: T, name: string, descriptor: ElementDescriptor): T {
    if (typeof handler !== 'function') {
        throw new Error(`Invalid ${name} handler for UI element "${descriptor.type}"`);
    }
    return handler;
}

/**
 * Creates an element and replaces its default properties with the style declarations.
 *
 * Declarations of unknown properties create plain properties, readable with `UIElement.v`.
 */
function createElement(descriptor: ElementDescriptor, declarations: UIStyleProperties): UIElement {
    const element = UIElementFactory.createElement(descriptor.type, descriptor.classNames);
    const elementProperties = element.properties as Record<string, UIPropertyInstance>;

    for (const [name, value] of Object.entries(declarations)) {
        elementProperties[name] = createUIProperty(name, value, elementProperties[name]);
    }

    return element;
}
