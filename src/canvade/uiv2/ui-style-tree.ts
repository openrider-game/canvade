import { UIStyleDefinition, UIStyleNode, UIStylePropertyDefinition } from './ui-node.type';

function getStyleNodeByDescriptor(
    parent: UIStyleNode,
    descriptor: string,
    properties: UIStylePropertyDefinition,
) {
    const [typeDescriptor, ...classDescriptors] = descriptor.split('.');

    const sanitizedTypeDescriptor = typeDescriptor || '';
    const sanitizedClassDescriptors = classDescriptors.map((s) => s || '');

    const existingNode = parent.children.find(
        (child) =>
            child.type === sanitizedTypeDescriptor &&
            child.classNames.length === sanitizedClassDescriptors.length &&
            child.classNames.every((value, index) => value === sanitizedClassDescriptors[index]),
    );

    if (existingNode) {
        return existingNode;
    }

    const newNode = new UIStyleNode(sanitizedTypeDescriptor, sanitizedClassDescriptors, properties);
    newNode.parent = parent;
    parent.children.push(newNode);

    return newNode;
}

function createStyleNodeTree(
    parent: UIStyleNode,
    descriptors: string[],
    properties: UIStylePropertyDefinition,
) {
    const currentDescriptor = descriptors.shift();

    if (currentDescriptor) {
        const appliedProperties: UIStylePropertyDefinition = {};
        if (descriptors.length === 0) {
            Object.assign(appliedProperties, properties);
        }

        const currentNode = getStyleNodeByDescriptor(parent, currentDescriptor, appliedProperties);

        if (descriptors.length > 0) {
            createStyleNodeTree(currentNode, descriptors, properties);
        }
    }
}

export function buildStyleTree(
    styleMap: UIStyleDefinition,
    rootStyle: UIStylePropertyDefinition = {},
): UIStyleNode {
    const root = new UIStyleNode('root', [], rootStyle);

    for (const [descriptor, properties] of Object.entries(styleMap)) {
        createStyleNodeTree(root, descriptor.split(' '), properties);
    }

    return root;
}
