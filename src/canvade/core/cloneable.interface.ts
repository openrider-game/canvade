/** An object that can create an independent copy of itself. */
export interface Cloneable<T extends Cloneable<T>> {
    clone(): T;
}
