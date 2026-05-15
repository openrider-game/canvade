import { buildElementTree } from './ui-element-tree';
import { UIStructureDefinition, UIStyleDefinition } from './ui-node.type';

const exampleStructureDefinition: UIStructureDefinition = [
    {
        'block.container': [
            'span.title',
            {
                'text.test': ['span'],
            },
        ],
    },
    {
        'button.primary': ['span.icon'],
    },
    'block.test',
];

const exampleStyleDefinition: UIStyleDefinition = {
    block: {
        display: 'block',
    },
    'block.container': {
        padding: '10px',
    },
    span: {
        display: 'inline',
    },
    'span.title': {
        fontSize: '20px',
        fontWeight: 'bold',
    },
    '.test': {
        fontStyle: 'italic',
    },
    'button.primary': {
        backgroundColor: 'blue',
        color: 'white',
    },
    'span.icon': {
        width: '16px',
        height: '16px',
    },
};

console.log(buildElementTree(exampleStructureDefinition, exampleStyleDefinition));
