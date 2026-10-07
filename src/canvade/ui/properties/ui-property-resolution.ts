import type { UIResolvableUnit, UIUnit } from './ui-property.type';

export interface UIPropertyBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UIPropertyResolutionContext {
    parentBounds: UIPropertyBounds;
    getValue(property: string): UIUnit | number;
}

export interface UIPropertyResolutionRule {
    resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number;
}

export class ParentDimensionRule implements UIPropertyResolutionRule {
    constructor(private readonly dimension: 'width' | 'height') {}

    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        return resolveUIUnit(value, context.parentBounds[this.dimension]);
    }
}

export class ParentPositionRule implements UIPropertyResolutionRule {
    constructor(
        private readonly position: 'x' | 'y',
        private readonly dimension: 'width' | 'height',
    ) {}

    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        return (
            context.parentBounds[this.position] +
            resolveUIUnit(value, context.parentBounds[this.dimension])
        );
    }
}

export class ContainerGapRule implements UIPropertyResolutionRule {
    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        const dimension = context.getValue('flexDirection') === 'row' ? 'width' : 'height';
        return resolveUIUnit(value, context.parentBounds[dimension]);
    }
}

export class ContainerPaddingRule implements UIPropertyResolutionRule {
    public resolve(value: UIResolvableUnit, context: UIPropertyResolutionContext): number {
        return resolveUIUnit(value, context.parentBounds.width);
    }
}

export function resolveUIUnit(value: UIResolvableUnit, reference: number): number {
    switch (true) {
        case value.endsWith('px'): {
            const amount = Number(value.slice(0, -2));
            if (Number.isFinite(amount) && value.slice(0, -2).trim() !== '') {
                return amount;
            }
            break;
        }
        case value.endsWith('%'): {
            const amount = Number(value.slice(0, -1));
            if (Number.isFinite(amount) && value.slice(0, -1).trim() !== '') {
                return (amount / 100) * reference;
            }
            break;
        }
    }

    throw new Error(`Invalid UI unit: ${value}`);
}
