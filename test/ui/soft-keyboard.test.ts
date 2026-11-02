import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { GamePointerEvent } from '../../src/canvade/event/types/dom-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { UIInput } from '../../src/canvade/ui/elements/ui-input';
import { SoftKeyboard } from '../../src/canvade/ui/soft-keyboard';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

/** Element of the page double, focusable, as the canvas and the hidden input are. */
class FakeElement {
    public isConnected = true;
    public parentElement: FakeElement | null = null;
    public readonly style: Record<string, string> = {};
    private readonly listeners = new Map<string, Array<(e: unknown) => void>>();

    public addEventListener(name: string, listener: (e: unknown) => void): void {
        this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
    }

    public dispatch(name: string, event: unknown = {}): void {
        this.listeners.get(name)?.forEach((listener) => listener(event));
    }

    public focus(): void {
        const previous = page.activeElement;
        page.activeElement = this;
        if (previous !== this) {
            previous?.dispatch('blur');
        }
    }

    public blur(): void {
        if (page.activeElement === this) {
            page.activeElement = null;
            this.dispatch('blur');
        }
    }

    public appendChild(child: FakeElement): void {
        child.parentElement = this;
    }
}

/** The hidden input of the keyboard. */
class FakeInput extends FakeElement {
    public type = '';
    public autocomplete = '';
    public tabIndex = 0;
    public value = '';
    public maxLength = -1;
    public selectionStart: number | null = 0;
    public selectionEnd: number | null = 0;

    public setAttribute(): void {}

    public setSelectionRange(start: number, end: number): void {
        this.selectionStart = start;
        this.selectionEnd = end;
    }

    /** Types text as the keyboard does: the value and the caret change, then `input` fires. */
    public type_(value: string): void {
        this.value = value;
        this.selectionStart = this.selectionEnd = value.length;
        this.dispatch('input');
    }
}

const page = {
    activeElement: null as FakeElement | null,
    fullscreenElement: null as FakeElement | null,
    body: new FakeElement(),
    hiddenInputs: [] as FakeInput[],
};

beforeEach(() => {
    page.activeElement = null;
    page.hiddenInputs = [];
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('document', {
        get activeElement() {
            return page.activeElement;
        },
        get fullscreenElement() {
            return page.fullscreenElement;
        },
        body: page.body,
        createElement: () => {
            const input = new FakeInput();
            page.hiddenInputs.push(input);
            return input;
        },
    });
    // A new hidden input for each test
    (SoftKeyboard as unknown as { input: null; field: null }).input = null;
    (SoftKeyboard as unknown as { input: null; field: null }).field = null;
});

afterEach(() => {
    vi.unstubAllGlobals();
});

/** A layer with an input of 200x30 pixels, the canvas having the focus. */
function createInput(maxLength = 0) {
    const layer = new TestLayer();
    const root = layer.uiRenderer.setUI([{ 'input.field': {} }], {
        '.field': { width: 200, height: 30, value: 'hello', maxLength },
    });
    layer.uiRenderer.render(createCanvasMock(400, 200).context);
    const canvas = new FakeElement();
    canvas.focus();
    return { layer, input: root.children[0] as UIInput, canvas };
}

/** Taps a point with a pointer, pressing then releasing it. */
function tap(layer: Layer, x: number, y: number, pointerType: string): void {
    for (const name of ['pointerDown', 'pointerUp'] as const) {
        layer.dispatch(
            name,
            new CustomEvent<GamePointerEvent>(name, {
                detail: {
                    name,
                    consumed: false,
                    pointerEvent: { pointerId: 3, pointerType, button: 0 } as PointerEvent,
                    primary: true,
                    position: new Vector(x, y),
                },
            }),
        );
    }
}

describe('Keyboard of the touch screens', () => {
    test('opens for an input tapped with a finger, with its text', () => {
        const { layer, input } = createInput();

        tap(layer, 50, 10, 'touch');

        expect(input.isFocused()).toBe(true);
        expect(SoftKeyboard.target).toBe(input);
        const [hidden] = page.hiddenInputs;
        expect(page.activeElement).toBe(hidden);
        expect(hidden.value).toBe('hello');
        expect(hidden.parentElement).toBe(page.body);
        // Invisible, and not zooming the page on iOS
        expect(hidden.style).toMatchObject({ opacity: '0', fontSize: '16px' });
    });

    test('stays closed for an input clicked with the mouse', () => {
        const { layer, input } = createInput();

        tap(layer, 50, 10, 'mouse');

        expect(input.isFocused()).toBe(true);
        expect(SoftKeyboard.target).toBeNull();
        expect(page.hiddenInputs).toHaveLength(0);
    });

    test('types in the input, within its length', () => {
        const { layer, input } = createInput(8);
        const change = vi.fn();
        input.subscribe('change', change);
        tap(layer, 50, 10, 'touch');
        const [hidden] = page.hiddenInputs;
        expect(hidden.maxLength).toBe(8);

        hidden.type_('hello you');

        expect(input.value).toBe('hello yo');
        expect(input.caret).toBe(8);
        expect(change).toHaveBeenCalledOnce();
    });

    test('submits with Enter, closing the keyboard and giving the focus back', () => {
        const { layer, input, canvas } = createInput();
        const submit = vi.fn();
        input.subscribe('submit', submit);
        tap(layer, 50, 10, 'touch');
        const [hidden] = page.hiddenInputs;
        hidden.type_('renamed');

        const enter = { key: 'Enter', preventDefault: vi.fn(), stopPropagation: vi.fn() };
        hidden.dispatch('keydown', enter);

        expect(enter.preventDefault).toHaveBeenCalled();
        // Not reaching the controls of the canvas, focused again meanwhile
        expect(enter.stopPropagation).toHaveBeenCalled();
        expect(submit.mock.calls[0][0].detail.value).toBe('renamed');
        expect(input.isFocused()).toBe(false);
        expect(SoftKeyboard.target).toBeNull();
        expect(page.activeElement).toBe(canvas);
    });

    test('closes once the input loses the focus, and lets go of it once closed', () => {
        const { layer, input, canvas } = createInput();
        tap(layer, 50, 10, 'touch');

        // Tapping outside of the UI
        tap(layer, 300, 150, 'touch');
        expect(input.isFocused()).toBe(false);
        expect(SoftKeyboard.target).toBeNull();
        expect(page.activeElement).toBe(canvas);

        // The keyboard closed by the user
        tap(layer, 50, 10, 'touch');
        page.hiddenInputs[0].blur();
        expect(input.isFocused()).toBe(false);
        expect(SoftKeyboard.target).toBeNull();
    });

    test('does nothing without a page', () => {
        vi.stubGlobal('document', undefined);
        const input = new UIInput();

        SoftKeyboard.open(input);

        expect(SoftKeyboard.target).toBeNull();
    });
});
