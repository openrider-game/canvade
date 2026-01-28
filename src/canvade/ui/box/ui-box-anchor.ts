import {
    UIBoxSide,
    UIBoxSideBottom,
    UIBoxSideLeft,
    UIBoxSideRight,
    UIBoxSideTop,
} from './ui-box-side';

export type UIBoxAnchor = {
    vertical: UIBoxSide;
    horizontal: UIBoxSide;
};

export const UIBoxAnchorTopLeft: UIBoxAnchor = {
    vertical: UIBoxSideTop,
    horizontal: UIBoxSideLeft,
};

export const UIBoxAnchorTopRight: UIBoxAnchor = {
    vertical: UIBoxSideTop,
    horizontal: UIBoxSideRight,
};

export const UIBoxAnchorBottomLeft: UIBoxAnchor = {
    vertical: UIBoxSideBottom,
    horizontal: UIBoxSideLeft,
};

export const UIBoxAnchorBottomRight: UIBoxAnchor = {
    vertical: UIBoxSideBottom,
    horizontal: UIBoxSideRight,
};
