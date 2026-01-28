import { UIBox } from './ui-box';

export type UIBoxSide = {
    cut(box: UIBox, amount: number): UIBox;
    get(box: UIBox, amount: number): UIBox;
    add(box: UIBox, amount: number): UIBox;
};

export const UIBoxSideTop: UIBoxSide = {
    cut(box: UIBox, amount: number): UIBox {
        return box.cutTop(amount);
    },

    get(box: UIBox, amount: number): UIBox {
        return box.getTop(amount);
    },

    add(box: UIBox, amount: number): UIBox {
        return box.addTop(amount);
    },
};

export const UIBoxSideRight: UIBoxSide = {
    cut(box: UIBox, amount: number): UIBox {
        return box.cutRight(amount);
    },

    get(box: UIBox, amount: number): UIBox {
        return box.getRight(amount);
    },

    add(box: UIBox, amount: number): UIBox {
        return box.addRight(amount);
    },
};

export const UIBoxSideBottom: UIBoxSide = {
    cut(box: UIBox, amount: number): UIBox {
        return box.cutBottom(amount);
    },

    get(box: UIBox, amount: number): UIBox {
        return box.getBottom(amount);
    },

    add(box: UIBox, amount: number): UIBox {
        return box.addBottom(amount);
    },
};

export const UIBoxSideLeft: UIBoxSide = {
    cut(box: UIBox, amount: number): UIBox {
        return box.cutLeft(amount);
    },

    get(box: UIBox, amount: number): UIBox {
        return box.getLeft(amount);
    },

    add(box: UIBox, amount: number): UIBox {
        return box.addLeft(amount);
    },
};
