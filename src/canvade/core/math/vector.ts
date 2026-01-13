import { Cloneable } from '../cloneable.interface';
import { Serializable } from '../serializable.interface';

export default class Vector implements Cloneable<Vector>, Serializable {
    public x: number;
    public y: number;

    public constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    public set(vector: Vector): Vector {
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    public selfAdd(vector: Vector): Vector {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    public selfSub(vector: Vector): Vector {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    public selfScale(factor: number): Vector {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    public add(vector: Vector): Vector {
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    public sub(vector: Vector): Vector {
        return new Vector(this.x - vector.x, this.y - vector.y);
    }

    public scale(factor: number): Vector {
        return new Vector(this.x * factor, this.y * factor);
    }

    public recipScale(factor: number): Vector {
        return new Vector(this.x / factor, this.y / factor);
    }

    public dot(vector: Vector): number {
        return this.x * vector.x + this.y * vector.y;
    }

    public getLength(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    public distanceTo(vector: Vector): number {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public distanceToSquared(vector: Vector): number {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return dx * dx + dy * dy;
    }

    public clone(): Vector {
        return new Vector(this.x, this.y);
    }

    public toString(): string {
        return Math.round(this.x).toString(32) + ' ' + Math.round(this.y).toString(32);
    }
}
