export interface Cloneable<T extends Cloneable<T>> {
    clone(): T;
}
