import {
    UIElementNode,
    UIStructureDefinition,
    UIStructureNode,
    UIStyleDefinition,
    UIStyleNode,
    UIStylePropertyDefinition,
} from './ui-node.type';
import { buildStructureTree } from './ui-structure-tree';
import { buildStyleTree } from './ui-style-tree';

export function buildElementTree(
    structureTreeDefinition: UIStructureDefinition,
    styleTreeDefinition: UIStyleDefinition,
): UIElementNode {
    const structureTreeRoot = buildStructureTree(structureTreeDefinition);
    const styleTreeRoot = buildStyleTree(styleTreeDefinition);

    const root = new UIElementNode(
        structureTreeRoot.type,
        structureTreeRoot.classNames,
        styleTreeRoot.properties,
    );

    createElementNodeTree(root, structureTreeRoot, styleTreeRoot);

    return root;
}

export function createElementNodeTree(
    parent: UIElementNode,
    structureNode: UIStructureNode,
    styleNode: UIStyleNode,
) {
    for (const childStructureNode of structureNode.children) {
        const properties = computeStyleProperties(styleNode, childStructureNode);
        const newElementNode = new UIElementNode(
            childStructureNode.type,
            childStructureNode.classNames,
            properties,
        );
        newElementNode.parent = parent;
        parent.children.push(newElementNode);
        createElementNodeTree(newElementNode, childStructureNode, styleNode);
    }
}

function computeStyleProperties(
    styleNode: UIStyleNode,
    structureNode: UIStructureNode,
): UIStylePropertyDefinition {
    const matchingStyleNodes = findStyleNodesForStructureNode(styleNode, structureNode);

    matchingStyleNodes.sort((a, b) => {
        const aSpecificity = computeStyleNodeSpecificity(a, structureNode);
        const bSpecificity = computeStyleNodeSpecificity(b, structureNode);
        return aSpecificity - bSpecificity;
    });

    const computedProperties: UIStylePropertyDefinition = {};
    for (const matchingStyleNode of matchingStyleNodes) {
        Object.assign(computedProperties, matchingStyleNode.properties);
    }

    return computedProperties;
}

function computeStyleNodeSpecificity(
    styleNode: UIStyleNode,
    structureNode: UIStructureNode,
): number {
    let specificity = 0;

    if (styleNode.type && styleNode.type === structureNode.type) {
        specificity += 1;
    }

    if (styleNode.classNames.length > 0) {
        const matchingClassCount = styleNode.classNames.filter((className) =>
            structureNode.classNames.includes(className),
        ).length;

        specificity += matchingClassCount * 10;
    }

    return specificity;
}

function findStyleNodesForStructureNode(
    styleNode: UIStyleNode,
    structureNode: UIStructureNode,
): UIStyleNode[] {
    const matches: UIStyleNode[] = [];

    if (
        (styleNode.type === structureNode.type && styleNode.classNames.length === 0) ||
        (styleNode.classNames.length &&
            styleNode.classNames.every((className) => structureNode.classNames.includes(className)))
    ) {
        matches.push(styleNode);
    }

    for (const childStyleNode of styleNode.children) {
        matches.push(...findStyleNodesForStructureNode(childStyleNode, structureNode));
    }

    return matches;
}
