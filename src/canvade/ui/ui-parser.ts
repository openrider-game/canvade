import { UIClickHandler, UIElement } from './ui-element';
import { UIElementFactory } from './ui-element-factory';
import { createUIProperty, UIPropertyInstance, UIUnit } from './properties/ui-property.type';

export interface UIStructureElementDefinition {
    children?: UIStructureDefinition;
    events?: UIStructureEvents;
    data?: Record<string, unknown>;
}

export interface UIStructureEvents {
    click?: UIClickHandler;
}

export type UIStructureDefinition = Array<
    string | Record<string, UIStructureDefinition | UIStructureElementDefinition>
>;
export type UIStyleProperties = Record<string, UIUnit>;
export type UIStyleDefinition = Record<string, UIStyleProperties>;

interface ElementDescriptor {
    type: string;
    classNames: string[];
    children: ElementDescriptor[];
    events?: UIStructureEvents;
    data?: Record<string, unknown>;
    parent?: ElementDescriptor;
}

interface SelectorPart {
    type: string;
    classNames: string[];
}

interface StyleRule {
    selector: SelectorPart[];
    specificity: number;
    order: number;
    properties: UIStyleProperties;
}

export function buildUIElementTree(
    structureDefinition: UIStructureDefinition,
    styleDefinition: UIStyleDefinition = {},
): UIElement {
    const rules = parseStyleRules(styleDefinition);
    const root = createDescriptor('container');
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
    const [type = '', ...classNames] = value.trim().split('.');
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
    const [type = '', ...classNames] = value.split('.');
    return { type, classNames: classNames.filter(Boolean) };
}

function buildElement(
    descriptor: ElementDescriptor,
    rules: StyleRule[],
    ancestors: ElementDescriptor[],
    isTreeRoot: boolean = false,
): UIElement {
    const properties = isTreeRoot
        ? {
              width: '100%',
              height: '100%',
              color: 'transparent',
              ...computeProperties(rules, [...ancestors, descriptor]),
          }
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
    const currentPath = [...ancestors, descriptor];

    for (const child of descriptor.children) {
        element.addChild(buildElement(child, rules, currentPath));
    }

    return element;
}

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

function matchesSelector(selector: SelectorPart[], path: ElementDescriptor[]): boolean {
    let pathIndex = path.length - 1;
    const lastSelector = selector[selector.length - 1];
    const currentElement = path[pathIndex];
    if (!lastSelector || !currentElement || !matchesPart(lastSelector, currentElement)) {
        return false;
    }
    pathIndex--;

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

function createElement(descriptor: ElementDescriptor, declarations: UIStyleProperties): UIElement {
    const element = UIElementFactory.createElement(descriptor.type, descriptor.classNames);
    const elementProperties = element.properties as Record<string, UIPropertyInstance>;

    for (const [name, value] of Object.entries(declarations)) {
        elementProperties[name] = createUIProperty(name, value, elementProperties[name]);
    }

    return element;
}
