import { ValueComputeFn } from './ui-property';

function relativeLengthValue(value: string, parentLength?: number) {
    if (value.endsWith('px') || !parentLength) {
        return parseFloat(value);
    } else if (value.endsWith('%')) {
        const parentValue = parentLength;
        if (parentValue !== null) {
            const percentage = parseFloat(value) / 100;
            return parentValue * percentage;
        }
    }

    return 0;
}

export const heightRule: ValueComputeFn<number> = (value, parent) => {
    if (value) {
        return relativeLengthValue(value, parent?.height(parent.parentElement));
    }

    return 0;
};

export const widthRule: ValueComputeFn<number> = (value, parent) => {
    if (value) {
        return relativeLengthValue(value, parent?.width(parent.parentElement));
    }

    return 0;
};
