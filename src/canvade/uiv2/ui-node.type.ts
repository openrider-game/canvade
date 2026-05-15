class Tree<T> {
    public children: T[] = [];
    public parent: T | null = null;
}
export class UIStructureNode extends Tree<UIStructureNode> {
    constructor(
        public readonly type: string,
        public readonly classNames: string[] = [],
    ) {
        super();
    }
}
export type UIStructureDefinition = Array<string | Record<string, UIStructureDefinition>>;
export class UIStyleNode extends Tree<UIStyleNode> {
    constructor(
        public readonly type: string = '',
        public readonly classNames: string[] = [],
        public readonly properties: UIStylePropertyDefinition = {},
    ) {
        super();
    }
}
export type UIStyleDefinition = Record<string, UIStylePropertyDefinition>;
export type UIStylePropertyDefinition = Record<string, string>;
export class UIElementNode extends Tree<UIElementNode> {
    constructor(
        public readonly type: string,
        public readonly classNames: string[] = [],
        public readonly properties: UIStylePropertyDefinition = {},
    ) {
        super();
    }
}
