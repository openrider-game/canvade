import { UINode } from '../ui-node';

export type ValueEqualityFn = (a?: string, b?: string) => boolean;

function defaultEquals(a?: string, b?: string) {
    return Object.is(a, b);
}

export type ValueComputeFn<T> = (value?: string, parent?: UINode) => T;

function defaultCompute<T>(value?: string) {
    return value as T;
}

export type UIProperty<T> = (() => T) & {
    set(value: string): void;
    compute(parent?: UINode): void;
};

interface UIPropertyNode<T> {
    initialValue: string | undefined;
    value: string | undefined;
    computedValue: T;
    equals: ValueEqualityFn;
}

type UIPropertyGetter<T> = (() => T) & { readonly propertyNode: UIPropertyNode<T> };
type UIPropertySetter = (newValue: string) => void;
type UIPropertyCompute = (parent?: UINode) => void;

export function property<T>(initialValue?: string, computeFn?: ValueComputeFn<T>): UIProperty<T> {
    const [get, set, compute] = createProperty(initialValue, computeFn);

    const propertyFn = get as UIPropertyGetter<T> & UIProperty<T>;
    propertyFn.set = set;
    propertyFn.compute = compute;

    return propertyFn as UIProperty<T>;
}

function createProperty<T>(
    initialValue?: string,
    computeFn?: ValueComputeFn<T>,
): [UIPropertyGetter<T>, UIPropertySetter, UIPropertyCompute] {
    const node: UIPropertyNode<T> = Object.create(PROPERTY_NODE);
    node.initialValue = initialValue;
    node.value = initialValue;

    const getter = (() => propertyGetFn(node)) as UIPropertyGetter<T>;
    (getter as { propertyNode: UIPropertyNode<T> }).propertyNode = node;

    const setter = ((newValue: string) => propertySetFn(node, newValue)) as UIPropertySetter;

    const compute = ((parent?: UINode) =>
        propertyComputeFn(node, computeFn ?? defaultCompute, parent)) as UIPropertyCompute;

    return [getter, setter, compute];
}

function propertyGetFn<T>(node: UIPropertyNode<T>): T {
    return node.computedValue;
}

function propertySetFn<T>(node: UIPropertyNode<T>, newValue: string) {
    if (!node.equals(node.value, newValue)) {
        node.value = newValue;
    }
}

function propertyComputeFn<T>(
    node: UIPropertyNode<T>,
    compute: ValueComputeFn<T>,
    parent?: UINode,
) {
    node.computedValue = compute(node.value, parent);
}

const PROPERTY_NODE: UIPropertyNode<unknown> = {
    initialValue: undefined,
    value: undefined,
    computedValue: undefined,
    equals: defaultEquals,
};
