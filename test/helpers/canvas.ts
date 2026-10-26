import { vi } from 'vitest';

export function createCanvasMock(
    width = 200,
    height = 100,
    bounds = { left: 10, top: 5, width: 100, height: 50 },
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
    const canvas = {
        width,
        height,
        parentElement: null,
        tabIndex: 0,
        focus: vi.fn(),
        addEventListener: vi.fn(),
        getBoundingClientRect: () => bounds,
    } as unknown as HTMLCanvasElement;

    const context = {
        canvas,
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        clip: vi.fn(),
        closePath: vi.fn(),
        drawImage: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
        fillText: vi.fn(),
        font: '',
        lineCap: '',
        lineJoin: '',
        lineTo: vi.fn(),
        lineWidth: 1,
        // Every character is 7 pixels wide
        measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
        moveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        rect: vi.fn(),
        restore: vi.fn(),
        save: vi.fn(),
        scale: vi.fn(),
        setTransform: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        strokeStyle: '',
        textAlign: 'start',
        textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;

    Object.defineProperty(canvas, 'getContext', { value: vi.fn(() => context) });
    return { canvas, context };
}
