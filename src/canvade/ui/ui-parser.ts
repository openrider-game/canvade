import { UIClickHandler, UIElement } from './ui-element';
import { UIElementFactory } from './ui-element-factory';
import { createUIProperty, UIPropertyInstance, UIUnit } from './properties/ui-property.type';
import {
    UI_CLASS_SEPARATOR,
    UI_CONTAINER_TYPE,
    UI_ROOT_SIZE,
    UI_TRANSPARENT,
} from './ui.constants';

/** Definition of an element with options, in a {@link UIStructureDefinition}. */
export interface UIStructureElementDefinition {
    children?: UIStructureDefinition;
    events?: UIStructureEvents;
    /** Free data copied to {@link UIElement.data}. */
    data?: Record<string, unknown>;
}

/** Event handlers of an element, in a {@link UIStructureElementDefinition}. */
export interface UIStructureEvents {
    click?: UIClickHandler;
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
/**
 * Property values of a style rule, by property name.
 *
 * `px`/`%` properties accept a `px` or `%` string, or a number of pixels.
 */
export type UIStyleProperties = Record<string, UIUnit>;
/**
 * Style rules of a UI tree, keyed by CSS-like selectors.
 *
 * A selector is a list of parts separated by spaces, each part matching an element and the
 * previous parts its ancestors (descendant combinator). A part is a type and class names
 * separated by dots, the type being optional (`button`, `.primary`, `button.primary`).
 *
 * Every matching rule applies, from the lowest specificity to the highest, later rules winning
 * between equal specificities. The specificity counts 10 per class name and 1 per type.
 */
export type UIStyleDefinition = Record<string, UIStyleProperties>;

/** Element parsed from a structure definition, before its creation. */
interface ElementDescriptor {
    type: string;
    classNames: string[];
    children: ElementDescriptor[];
    events?: UIStructureEvents;
    data?: Record<string, unknown>;
    parent?: ElementDescriptor;
}

/** Part of a style selector matching one element; an empty type matches any type. */
interface SelectorPart {
    type: string;
    classNames: string[];
}

interface StyleRule {
    selector: SelectorPart[];
    specificity: number;
    /** Position of the rule in the style definition, breaking specificity ties. */
    order: number;
    properties: UIStyleProperties;
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

function parseStyleRules(styleDefinition: UIStyleDefinition): StyleRule[] {
    return Object.entries(styleDefinition).map(([selector, properties], order) => {
        const parts = selector.trim().split(/\s+/).filter(Boolean).map(parseSelectorPart);
        if (parts.length === 0) {
            throw new Error('Style selectors cannot be empty');
        }

        return {
            selector: parts,
            specificity: parts.reduce(
                (total, part) => total + part.classNames.length * 10 + (part.type ? 1 : 0),
                0,
            ),
            order,
            properties,
        };
    });
}

function parseSelectorPart(value: string): SelectorPart {
    const [type = '', ...classNames] = value.split(UI_CLASS_SEPARATOR);
    return { type, classNames: classNames.filter(Boolean) };
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
    const clickHandler = descriptor.events?.click;
    if (clickHandler !== undefined) {
        if (typeof clickHandler !== 'function') {
            throw new Error(`Invalid click handler for UI element "${descriptor.type}"`);
        }
        element.onClick(clickHandler);
    }
    const currentPath = isTreeRoot ? [] : [...ancestors, descriptor];

    for (const child of descriptor.children) {
        element.addChild(buildElement(child, rules, currentPath));
    }

    return element;
}

/**
 * Merges the properties of the rules matching the last element of `path`, from the lowest
 * specificity to the highest, then in declaration order.
 */
function computeProperties(rules: StyleRule[], path: ElementDescriptor[]): UIStyleProperties {
    const matchingRules = rules
        .filter((rule) => matchesSelector(rule.selector, path))
        .sort((left, right) => left.specificity - right.specificity || left.order - right.order);

    const properties: UIStyleProperties = {};
    for (const rule of matchingRules) {
        Object.assign(properties, rule.properties);
    }
    return properties;
}

/**
 * Returns whether a selector matches the last element of `path`, its other parts matching
 * ancestors of the element, in order but not necessarily direct parents.
 */
function matchesSelector(selector: SelectorPart[], path: ElementDescriptor[]): boolean {
    let pathIndex = path.length - 1;
    const lastSelector = selector[selector.length - 1];
    const currentElement = path[pathIndex];
    if (!lastSelector || !currentElement || !matchesPart(lastSelector, currentElement)) {
        return false;
    }
    pathIndex--;

    // Match the remaining parts right to left, each against the nearest matching ancestor
    for (let selectorIndex = selector.length - 2; selectorIndex >= 0; selectorIndex--) {
        let matchIndex = pathIndex;
        while (matchIndex >= 0 && !matchesPart(selector[selectorIndex], path[matchIndex])) {
            matchIndex--;
        }
        if (matchIndex < 0) {
            return false;
        }
        pathIndex = matchIndex - 1;
    }

    return true;
}

function matchesPart(selector: SelectorPart, element: ElementDescriptor): boolean {
    return (
        (!selector.type || selector.type === element.type) &&
        selector.classNames.every((className) => element.classNames.includes(className))
    );
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
