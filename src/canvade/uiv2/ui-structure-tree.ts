import { UIStructureDefinition, UIStructureNode } from './ui-node.type';

export function createStructureNodeTree(
    parent: UIStructureNode,
    definition: UIStructureDefinition,
) {
    for (const item of definition) {
        if (typeof item === 'string') {
            const [typeDescriptor, ...classDescriptors] = item.split('.');
            const sanitizedTypeDescriptor = typeDescriptor || '';
            const sanitizedClassDescriptors = classDescriptors.map((s) => s || '');

            const newNode = new UIStructureNode(sanitizedTypeDescriptor, sanitizedClassDescriptors);
            newNode.parent = parent;
            parent.children.push(newNode);
        } else if (typeof item === 'object') {
            for (const [descriptor, children] of Object.entries(item)) {
                const [typeDescriptor, ...classDescriptors] = descriptor.split('.');
                const sanitizedTypeDescriptor = typeDescriptor || '';
                const sanitizedClassDescriptors = classDescriptors.map((s) => s || '');

                const newNode = new UIStructureNode(
                    sanitizedTypeDescriptor,
                    sanitizedClassDescriptors,
                );
                newNode.parent = parent;
                parent.children.push(newNode);

                if (Array.isArray(children)) {
                    createStructureNodeTree(newNode, children);
                }
            }
        }
    }
}

export function buildStructureTree(definition: UIStructureDefinition): UIStructureNode {
    const root = new UIStructureNode('root');
    createStructureNodeTree(root, definition);

    return root;
}
