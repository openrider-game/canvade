import { afterEach, describe, expect, test, vi } from 'vitest';
import { Display } from '../../src/canvade/core/display';
import { Vector } from '../../src/canvade/core/math/vector';
import { EventManager } from '../../src/canvade/event/event-manager';
import { Control, NONE } from '../../src/canvade/event/keyboard/control';
import { KEYE } from '../../src/canvade/event/keyboard/key-codes';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';
import { GameKeyboardEvent, GameMouseEvent } from '../../src/canvade/event/types/dom-events';
import { Layer } from '../../src/canvade/state/layer/layer';
import { State } from '../../src/canvade/state/state';
import { StateManager } from '../../src/canvade/state/state-manager';
import { UIImage } from '../../src/canvade/ui/elements/ui-image';
import { UIInput } from '../../src/canvade/ui/elements/ui-input';
import { UIElement } from '../../src/canvade/ui/ui-element';
import { buildUIElementTree, UIStructureDefinition } from '../../src/canvade/ui/ui-parser';
import { createCanvasMock } from '../helpers/canvas';

class TestLayer extends Layer {
    initLayer(): void {}
}

afterEach(() => {
    Display.pixelRatio = 1;
    Display.fixedUIScale = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function mouseEvent(name: string, x: number, y: number, button = 0) {
    return new CustomEvent<GameMouseEvent>(name, {
        detail: {
            name,
            consumed: false,
            mouseEvent: { button } as MouseEvent,
            position: new Vector(x, y),
        },
    });
}

function keyEvent(key: string, modifiers: Partial<KeyboardEvent> = {}) {
    return new CustomEvent<GameKeyboardEvent>('keyDown', {
        detail: {
            name: 'keyDown',
            consumed: false,
            keyboardEvent: { key, ctrlKey: false, altKey: false, metaKey: false, ...modifiers },
        } as GameKeyboardEvent,
    });
}

/** Clicks a canvas position with the main button through the UI of a layer. */
function click(layer: Layer, x: number, y: number) {
    layer.uiRenderer.dispatch('mouseDown', mouseEvent('mouseDown', x, y));
    layer.uiRenderer.dispatch('mouseUp', mouseEvent('mouseUp', x, y));
}

/** Types keys in the focused element of a layer, returning whether each one was consumed. */
function type(layer: Layer, ...keys: string[]): boolean[] {
    return keys.map((key) => {
        const event = keyEvent(key);
        layer.dispatch('keyDown', event);
        return event.detail.consumed;
    });
}

function createLayer(structure: UIStructureDefinition, styles = {}) {
    const layer = new TestLayer();
    const root = layer.uiRenderer.setUI(structure, styles);
    const { context } = createCanvasMock(400, 200);
    layer.uiRenderer.render(context);
    return { layer, root, context };
}

describe('Click-through elements', () => {
    test('let the mouse reach the elements under them, but not their children', () => {
        const backgroundClick = vi.fn();
        const panelClick = vi.fn();
        const buttonClick = vi.fn();
        const { layer, root } = createLayer(
            [
                { 'button.background': { events: { click: backgroundClick } } },
                {
                    'container.panel': {
                        children: [{ 'button.inner': { events: { click: buttonClick } } }],
                        events: { click: panelClick },
                    },
                },
            ],
            {
                // Both laid out over each other
                '.background': { width: 200, height: 100, position: 'absolute' },
                '.panel': { width: 200, height: 100, position: 'absolute', pointerEvents: 'none' },
                '.inner': { width: 50, height: 20 },
            },
        );
        const [background, panel] = root.children;

        expect(root.findElementAt(100, 50)).toBe(background);
        expect(root.findElementAt(10, 10)).toBe(panel.children[0]);
        expect(panel.receivesPointer()).toBe(false);

        click(layer, 100, 50);
        click(layer, 10, 10);
        expect(backgroundClick).toHaveBeenCalledOnce();
        expect(buttonClick).toHaveBeenCalledOnce();
        expect(panelClick).not.toHaveBeenCalled();
        expect(root.handleClick(100, 50, {} as MouseEvent)).toBe(true);
    });

    test('do not catch the mouse over the canvas', () => {
        const { layer } = createLayer(['container.overlay'], {
            '.overlay': { width: '100%', height: '100%', pointerEvents: 'none' },
        });
        const move = mouseEvent('mouseMove', 50, 50);

        layer.uiRenderer.dispatch('mouseMove', move);

        expect(move.detail.consumed).toBe(false);
    });
});

describe('UI scale', () => {
    test('lays the UI out in UI pixels, scaled to the pixel ratio', () => {
        Display.pixelRatio = 2;
        const clickHandler = vi.fn();
        const { layer, root, context } = createLayer(
            [{ 'button.corner': { events: { click: clickHandler } } }],
            { '.corner': { width: 50, height: 20, horizontalAlign: 'right' } },
        );

        expect(context.scale).toHaveBeenCalledWith(2, 2);
        // The 400 x 200 canvas is 200 x 100 UI pixels
        expect(root.getBounds()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
        expect(root.children[0].getBounds()).toMatchObject({ x: 150, y: 0 });

        // Canvas pixels are converted to UI pixels
        click(layer, 350, 10);
        expect(clickHandler).toHaveBeenCalledWith(175, 5, root.children[0]);
    });

    test('can be fixed whatever the pixel ratio', () => {
        Display.pixelRatio = 2;
        Display.fixedUIScale = 1;

        const { context } = createLayer(['button']);

        expect(Display.uiScale).toBe(1);
        expect(context.scale).toHaveBeenCalledWith(1, 1);
    });
});

describe('Image element', () => {
    function stubImage(loaded: boolean) {
        const images: Array<{ src: string }> = [];
        vi.stubGlobal(
            'Image',
            class {
                public src = '';
                public complete = loaded;
                public naturalWidth = 100;
                public naturalHeight = 50;

                constructor() {
                    images.push(this);
                }
            },
        );
        return images;
    }

    test('fits the image in its bounds, centered', () => {
        const bounds = { x: 0, y: 0, width: 100, height: 100 };

        expect(UIImage.fitImage(200, 100, bounds, 'fill')).toEqual(bounds);
        expect(UIImage.fitImage(200, 100, bounds, 'contain')).toEqual({
            x: 0,
            y: 25,
            width: 100,
            height: 50,
        });
        expect(UIImage.fitImage(200, 100, bounds, 'cover')).toEqual({
            x: -50,
            y: 0,
            width: 200,
            height: 100,
        });
    });

    test('draws the image once loaded, loading each URL once', () => {
        const images = stubImage(true);
        const { context } = createLayer(['image.logo', 'image.logo'], {
            '.logo': { src: 'logo.png', width: 50, height: 50, fit: 'contain', opacity: 0.5 },
        });

        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('logo.png');
        expect(context.drawImage).toHaveBeenCalledWith(images[0], 0, 12.5, 50, 25);
        expect(UIImage.load('logo.png')).toBe(images[0]);
    });

    test('draws nothing until the image is loaded, or without a source', () => {
        stubImage(false);

        const { context } = createLayer(['image.pending', 'image'], {
            '.pending': { src: 'pending.png' },
        });

        expect(context.drawImage).not.toHaveBeenCalled();
    });
});

describe('Input element', () => {
    function createInput(events = {}, styles = {}) {
        const created = createLayer([{ 'input.name': { events } }], {
            '.name': { width: 100, height: 30, placeholder: 'Name', ...styles },
        });
        const input = created.root.children[0] as UIInput;
        return { ...created, input };
    }

    test('receives the keys once focused by a click', () => {
        const change = vi.fn();
        const { layer, input } = createInput({ change });

        expect(type(layer, 'a')).toEqual([false]);
        click(layer, 10, 10);
        expect(input.isFocused()).toBe(true);
        expect(type(layer, 'H', 'i', '!')).toEqual([true, true, true]);

        expect(input.value).toBe('Hi!');
        expect(change).toHaveBeenLastCalledWith('Hi!', input);
        expect(change).toHaveBeenCalledTimes(3);
    });

    test('edits the value around the caret', () => {
        const { layer, input } = createInput();
        click(layer, 10, 10);
        type(layer, 'a', 'c', 'ArrowLeft', 'b');
        expect(input.value).toBe('abc');

        type(layer, 'Home', 'Delete', 'End', 'Backspace', 'ArrowRight', 'ArrowLeft', 'x');
        expect(input.value).toBe('xb');
        expect(input.caret).toBe(1);

        input.setValue('reset');
        expect(input.value).toBe('reset');
        expect(input.caret).toBe(5);
    });

    test('limits the length, and leaves the other keys to the controls', () => {
        const { layer, input } = createInput({}, { maxLength: 2 });
        click(layer, 10, 10);

        type(layer, 'a', 'b', 'c');
        expect(input.value).toBe('ab');

        const shortcut = keyEvent('z', { ctrlKey: true });
        layer.dispatch('keyDown', shortcut);
        expect(shortcut.detail.consumed).toBe(false);
        expect(type(layer, 'F5', 'Tab')).toEqual([false, false]);
    });

    test('submits with Enter and loses the focus with Escape or a click elsewhere', () => {
        const submit = vi.fn();
        const { layer, input } = createInput({ submit });
        click(layer, 10, 10);
        type(layer, 'o', 'k', 'Enter');

        expect(submit).toHaveBeenCalledWith('ok', input);

        type(layer, 'Escape');
        expect(input.isFocused()).toBe(false);
        expect(type(layer, 'x')).toEqual([false]);

        click(layer, 10, 10);
        click(layer, 300, 150);
        expect(input.isFocused()).toBe(false);
    });

    test('draws the placeholder, then the value with a blinking caret', () => {
        const { layer, input, context } = createInput();
        layer.uiRenderer.render(context);
        expect(vi.mocked(context.fillText)).toHaveBeenLastCalledWith('Name', 6, 15);

        click(layer, 10, 10);
        type(layer, 'a', 'b');
        vi.mocked(context.fillRect).mockClear();
        layer.uiRenderer.render(context);
        expect(vi.mocked(context.fillText)).toHaveBeenLastCalledWith('ab', 6, 15);
        // Background, then the caret after 2 characters of 7 pixels
        expect(vi.mocked(context.fillRect)).toHaveBeenLastCalledWith(20, 8, 1, 14);

        input.updateAnimations(600);
        vi.mocked(context.fillRect).mockClear();
        layer.uiRenderer.render(context);
        expect(vi.mocked(context.fillRect)).toHaveBeenCalledOnce();
    });

    test('moves the caret under the click and scrolls long values', () => {
        const { layer, input, context } = createInput();
        click(layer, 10, 10);
        type(layer, ...'abcdefghijklmnopqrstuvwxyz');
        layer.uiRenderer.render(context);

        // 26 characters of 7 pixels, in 88 visible pixels: scrolled by 182 - 88 = 94 pixels
        expect(vi.mocked(context.fillText)).toHaveBeenLastCalledWith(
            'abcdefghijklmnopqrstuvwxyz',
            6 - 94,
            15,
        );

        // 6 - 94 + 7 * 20 = 52
        click(layer, 53, 10);
        expect(input.caret).toBe(20);
    });

    test('keeps the typed keys from the keyboard controls', () => {
        const { canvas, context } = createCanvasMock(400, 200);
        vi.stubGlobal('document', { activeElement: canvas, dispatchEvent: vi.fn() });
        vi.stubGlobal('CustomEvent', CustomEvent);
        const layer = new TestLayer();
        layer.uiRenderer.setUI([{ input: {} }], { input: { width: 100, height: 30 } });
        layer.uiRenderer.render(context);
        class InputState extends State {
            protected initState(): void {}
            protected initLayers(): Map<string, Layer> {
                return new Map([['ui', layer]]);
            }
        }
        const stateManager = new StateManager();
        stateManager.addState(InputState, 'input');
        stateManager.push('input');
        Keyboard.registerControl('Eraser', new Control(KEYE, NONE));
        const eventManager = new EventManager(context);
        const press = (key: string) => {
            const event = {
                key,
                code: KEYE,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,
                preventDefault: vi.fn(),
            } as unknown as KeyboardEvent;
            eventManager.onKeyDown(event, stateManager);
            const down = Keyboard.isDown('Eraser');
            eventManager.onKeyUp(event, stateManager);
            return down;
        };

        expect(press('e')).toBe(true);
        click(layer, 10, 10);
        expect(press('e')).toBe(false);

        const input = layer.uiRenderer.setUI([]) as UIElement;
        expect(input.children).toHaveLength(0);
    });

    test('rejects invalid value handlers', () => {
        expect(() =>
            buildUIElementTree([{ input: { events: { change: 'nope' as never } } }]),
        ).toThrow('Invalid change handler for UI element "input"');
    });
});

describe('Element style', () => {
    test('draws square buttons with their own border width, text color and font size', () => {
        const { context } = createLayer(['button.square'], {
            '.square': {
                width: 80,
                height: 20,
                borderRadius: 0,
                borderWidth: 2,
                color: '#000',
                textColor: '#fff',
                fontSize: 12,
                text: 'Square',
            },
        });

        expect(context.rect).toHaveBeenCalledWith(0, 0, 80, 20);
        expect(context.quadraticCurveTo).not.toHaveBeenCalled();
        expect(context.lineWidth).toBe(2);
        expect(context.font).toBe('12px Arial');
        expect(context.fillStyle).toBe('#fff');
    });

    test('keeps the corner radius within the button, and can draw no border', () => {
        const { context } = createLayer(['button.round'], {
            '.round': { width: 80, height: 10, borderRadius: 30, borderWidth: 0 },
        });

        // A radius of half the height: the curves end at the middle of the sides
        expect(context.quadraticCurveTo).toHaveBeenCalledWith(80, 0, 80, 5);
        expect(context.stroke).not.toHaveBeenCalled();
    });

    test('draws containers and inputs with their own border width', () => {
        const { context } = createLayer(['container.box', 'input.field'], {
            '.box': { width: 50, height: 50, position: 'absolute', borderWidth: 0 },
            '.field': { width: 50, height: 20, borderWidth: 3 },
        });

        // Only the input border is drawn
        expect(context.strokeRect).toHaveBeenCalledOnce();
        expect(context.lineWidth).toBe(3);
    });
});

describe('Hover', () => {
    test('shows on a clicked button, which keeps the focus', () => {
        const { layer, root, context } = createLayer(['button.toggle'], {
            '.toggle': {
                width: 80,
                height: 20,
                backgroundColor: '#fff',
                hoverBackgroundColor: '#ddd',
                focusBackgroundColor: '#eee',
            },
        });
        const fills: unknown[] = [];
        vi.mocked(context.fill).mockImplementation(() => fills.push(context.fillStyle));
        layer.uiRenderer.dispatch('mouseMove', mouseEvent('mouseMove', 10, 10));
        click(layer, 10, 10);

        layer.uiRenderer.render(context);
        expect(root.children[0].isFocused()).toBe(true);
        expect(fills.at(-1)).toBe('#ddd');

        layer.uiRenderer.dispatch('mouseMove', mouseEvent('mouseMove', 300, 150));
        layer.uiRenderer.render(context);
        expect(fills.at(-1)).toBe('#eee');
    });

    test('is restored after the UI is rebuilt, until the mouse leaves the canvas', () => {
        const styles = { '.toggle': { width: 80, height: 20 } };
        const { layer, context } = createLayer(['button.toggle'], styles);
        layer.uiRenderer.dispatch('mouseMove', mouseEvent('mouseMove', 10, 10));

        const rebuilt = layer.uiRenderer.setUI(['button.toggle'], styles);
        expect(rebuilt.children[0].isHovered()).toBe(false);
        layer.uiRenderer.render(context);
        expect(rebuilt.children[0].isHovered()).toBe(true);

        layer.dispatch('mouseOut', mouseEvent('mouseOut', 10, 10));
        expect(rebuilt.children[0].isHovered()).toBe(false);
        const again = layer.uiRenderer.setUI(['button.toggle'], styles);
        layer.uiRenderer.render(context);
        expect(again.children[0].isHovered()).toBe(false);
    });
});
