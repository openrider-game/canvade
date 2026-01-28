import { UIElement } from '../ui-element';

export type ValueEqualityFn = (a?: string, b?: string) => boolean;

function defaultEquals(a?: string, b?: string) {
    return Object.is(a, b);
}

export type ValueComputeFn<T> = (value?: string, parent?: UIElement) => T;

function defaultCompute<T>(value?: string) {
    return value as T;
}

export type UIProperty<T> = ((parent?: UIElement) => T) & {
    set(value: string): void;
};

interface UIPropertyNode<T> {
    initialValue: string | undefined;
    value: string | undefined;
    computedValue: T;
    parent: UIElement | undefined;
    equals: ValueEqualityFn;
    compute: ValueComputeFn<T>;
}

type UIPropertyGetter<T> = (() => T) & { readonly propertyNode: UIPropertyNode<T> };
type UIPropertySetter = (newValue: string) => void;

export function property<T>(initialValue?: string, compute?: ValueComputeFn<T>): UIProperty<T> {
    const [get, set] = createProperty(initialValue, compute);

    const propertyFn = get as UIPropertyGetter<T> & UIProperty<T>;
    propertyFn.set = set;

    return propertyFn as UIProperty<T>;
}

function createProperty<T>(
    initialValue?: string,
    compute?: ValueComputeFn<T>,
): [UIPropertyGetter<T>, UIPropertySetter] {
    const node: UIPropertyNode<T> = Object.create(PROPERTY_NODE);
    node.initialValue = initialValue;
    node.value = initialValue;

    if (compute) {
        node.compute = compute;
    }

    const getter = ((parent: UIElement) => propertyGetFn(node, parent)) as UIPropertyGetter<T>;
    (getter as { propertyNode: UIPropertyNode<T> }).propertyNode = node;

    const setter = ((newValue: string) => propertySetFn(node, newValue)) as UIPropertySetter;

    return [getter, setter];
}

function propertyGetFn<T>(node: UIPropertyNode<T>, parent?: UIElement): T {
    if (!parent || !Object.is(parent, node.parent)) {
        node.parent = parent;
        node.computedValue = node.compute(node.value, parent);
    }

    return node.computedValue;
}

function propertySetFn<T>(node: UIPropertyNode<T>, newValue: string) {
    if (!node.equals(node.value, newValue)) {
        node.value = newValue;
    }
}

const PROPERTY_NODE: UIPropertyNode<unknown> = {
    initialValue: undefined,
    value: undefined,
    computedValue: undefined,
    parent: undefined,
    equals: defaultEquals,
    compute: defaultCompute,
};
