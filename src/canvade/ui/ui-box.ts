import { Cloneable } from '../core/cloneable.interface';
import { UIBoxSide } from './ui-box-side';

export class UIBox implements Cloneable<UIBox> {
    private hSpacing: number = 0;
    private vSpacing: number = 0;

    constructor(
        private minX: number,
        private minY: number,
        private maxX: number,
        private maxY: number,
    ) {}

    public get x(): number {
        return this.minX;
    }

    public get y(): number {
        return this.minY;
    }

    public get width(): number {
        return this.maxX - this.minX;
    }

    public get height(): number {
        return this.maxY - this.minY;
    }

    clone(): UIBox {
        const newBox = new UIBox(this.minX, this.minY, this.maxX, this.maxY);

        newBox.hSpacing = this.hSpacing;
        newBox.vSpacing = this.vSpacing;

        return newBox;
    }

    cut(side: UIBoxSide, amount: number): UIBox {
        return side.cut(this, amount);
    }

    cutTop(amount: number): UIBox {
        const minY = this.minY;
        this.minY = Math.min(this.maxY, this.minY + amount);

        const area = new UIBox(this.minX, minY, this.maxX, this.minY);
        this.minY += this.vSpacing;

        return area;
    }

    cutRight(amount: number): UIBox {
        const maxX = this.maxX;
        this.maxX = Math.max(this.minX, this.maxX - amount);

        const area = new UIBox(this.maxX, this.minY, maxX, this.maxY);
        this.maxX -= this.hSpacing;

        return area;
    }

    cutBottom(amount: number): UIBox {
        const maxY = this.maxY;
        this.maxY = Math.max(this.minY, this.maxY - amount);

        const area = new UIBox(this.minX, this.maxY, this.maxX, maxY);
        this.maxY -= this.vSpacing;

        return area;
    }

    cutLeft(amount: number): UIBox {
        const minX = this.minX;
        this.minX = Math.min(this.maxX, this.minX + amount);

        const area = new UIBox(minX, this.minY, this.minX, this.maxY);
        this.minX += this.hSpacing;

        return area;
    }

    get(side: UIBoxSide, amount: number): UIBox {
        return side.get(this, amount);
    }

    getTop(amount: number): UIBox {
        const maxY = Math.min(this.maxY, this.minY + amount);
        return new UIBox(this.minX, this.minY, this.maxX, maxY);
    }

    getRight(amount: number): UIBox {
        const minX = Math.max(this.minX, this.maxX - amount);
        return new UIBox(minX, this.minY, this.maxX, this.maxY);
    }

    getBottom(amount: number): UIBox {
        const minY = Math.max(this.minY, this.maxY - amount);
        return new UIBox(this.minX, minY, this.maxX, this.maxY);
    }

    getLeft(amount: number): UIBox {
        const maxX = Math.min(this.maxX, this.minX + amount);
        return new UIBox(this.minX, this.minY, maxX, this.maxY);
    }

    add(side: UIBoxSide, amount: number): UIBox {
        return side.add(this, amount);
    }

    addTop(amount: number): UIBox {
        return new UIBox(this.minX, this.minY - amount, this.maxX, this.maxY);
    }

    addRight(amount: number): UIBox {
        return new UIBox(this.minX, this.minY, this.maxX + amount, this.maxY);
    }

    addBottom(amount: number): UIBox {
        return new UIBox(this.minX, this.minY, this.maxX, this.maxY + amount);
    }

    addLeft(amount: number): UIBox {
        return new UIBox(this.minX - amount, this.minY, this.maxX, this.maxY);
    }
}
