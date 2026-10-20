import type { UIUnit } from './properties/ui-property.type';
import { UI_CLASS_SEPARATOR } from './ui.constants';

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

/** Element matched by the style selectors: its type and class names. */
export interface StyledElement {
    type: string;
    classNames: string[];
}

/** Part of a style selector matching one element; an empty type matches any type. */
interface SelectorPart {
    type: string;
    classNames: string[];
}

/** Style rule parsed from a {@link UIStyleDefinition}. */
export interface StyleRule {
    selector: SelectorPart[];
    specificity: number;
    /** Position of the rule in the style definition, breaking specificity ties. */
    order: number;
    properties: UIStyleProperties;
}

/**
 * Parses the selectors of a style definition, computing their specificity.
 *
 * @throws When a selector is empty.
 */
export function parseStyleRules(styleDefinition: UIStyleDefinition): StyleRule[] {
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
 * Merges the properties of the rules matching the last element of `path` (the element preceded
 * by its ancestors), from the lowest
 * specificity to the highest, then in declaration order.
 */
export function computeProperties(rules: StyleRule[], path: StyledElement[]): UIStyleProperties {
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
function matchesSelector(selector: SelectorPart[], path: StyledElement[]): boolean {
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

function matchesPart(selector: SelectorPart, element: StyledElement): boolean {
    return (
        (!selector.type || selector.type === element.type) &&
        selector.classNames.every((className) => element.classNames.includes(className))
    );
}
