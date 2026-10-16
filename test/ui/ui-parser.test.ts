import { describe, expect, test, vi } from 'vitest';
import { UIButton } from '../../src/canvade/ui/elements/ui-button';
import { UIContainer } from '../../src/canvade/ui/elements/ui-container';
import { UIElementFactory } from '../../src/canvade/ui/ui-element-factory';
import { buildUIElementTree } from '../../src/canvade/ui/ui-parser';
import { createCanvasMock } from '../helpers/canvas';
import {
    createUIProperty,
    UIResolvableProperty,
} from '../../src/canvade/ui/properties/ui-property.type';

const structure = [{ 'container.shell': ['button.primary'] }];

describe('buildUIElementTree', () => {
    test('builds elements and applies matching style rules by specificity', () => {
        const root = buildUIElementTree(structure, {
            '.shell': { backgroundColor: 'red' },
            'container.shell': {
                backgroundColor: 'blue',
                width: '80%',
                gap: '12%',
                flexDirection: 'row',
            },
            button: { text: 'Continue' },
            '.shell .primary': { backgroundColor: 'green' },
        });
        root.resolveLayout({ x: 0, y: 0, width: 125, height: 80 });
        const shell = root.children[0];
        shell.resolveLayout(root.getBounds());

        expect(root).toBeInstanceOf(UIContainer);
        expect(root.v('width')).toBe(125);
        expect(root.v('height')).toBe(80);
        expect(shell).toBeInstanceOf(UIContainer);
        expect(shell.v('backgroundColor')).toBe('blue');
        expect(shell.v('width')).toBe(100);
        // 12% of the shell own width
        expect(shell.v('gap')).toBe(12);
        expect(shell.children[0]).toBeInstanceOf(UIButton);
        expect(shell.children[0].v('backgroundColor')).toBe('green');
        expect(shell.children[0].v('text')).toBe('Continue');
    });

    test('wraps all top-level elements in a full-size root element', () => {
        const root = buildUIElementTree(['button.one', 'button.two']);
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        expect(root).toBeInstanceOf(UIContainer);
        expect(root.isTreeRoot).toBe(true);
        expect(root.getBounds()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
        expect(root.children).toHaveLength(2);
    });

    test('applies no style rule to the implicit root', () => {
        const root = buildUIElementTree([{ 'container.menu': ['button.inner'] }, 'button.top'], {
            container: { width: 50, backgroundColor: 'red' },
            'container button': { text: 'Nested' },
        });
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        const [menu, top] = root.children;

        expect(root.v('width')).toBe(200);
        expect(root.v('backgroundColor')).toBe('transparent');
        expect(menu.v('backgroundColor')).toBe('red');
        // The root is not an ancestor for the descendant selectors
        expect(menu.children[0].v('text')).toBe('Nested');
        expect(top.v('text')).toBe('Button');
    });

    test('applies a simple class selector only to the matching element', () => {
        const root = buildUIElementTree([{ 'container.parent': ['text.child'] }], {
            '.parent': { x: '10%', width: 80 },
        });
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        const parent = root.children[0];
        parent.resolveLayout(root.getBounds());
        parent.children[0].resolveLayout(parent.getBounds());

        expect(parent.v('x')).toBe(20);
        expect(parent.children[0].v('x')).toBe(20);
        expect(parent.children[0].v('width')).toBe(100);
    });

    test('aligns elements from the right, bottom or center of their parent', () => {
        const root = buildUIElementTree(['button.right', 'button.bottom', 'button.centered'], {
            button: { width: 40, height: 20 },
            '.right': { x: 10, y: 5, horizontalAlign: 'right' },
            '.bottom': { x: '10%', y: 10, verticalAlign: 'bottom' },
            '.centered': { x: 5, y: -5, horizontalAlign: 'center', verticalAlign: 'middle' },
        });
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        const [right, bottom, centered] = root.children;
        right.resolveLayout(root.getBounds());
        bottom.resolveLayout(root.getBounds());
        centered.resolveLayout(root.getBounds());

        expect(right.getBounds()).toEqual({ x: 150, y: 5, width: 40, height: 20 });
        expect(bottom.getBounds()).toEqual({ x: 20, y: 70, width: 40, height: 20 });
        expect(centered.getBounds()).toEqual({ x: 85, y: 35, width: 40, height: 20 });
    });

    test('lays absolute children out of the container flow', () => {
        const { canvas, context } = createCanvasMock(200, 100);
        const root = buildUIElementTree(['button.first', 'button.overlay', 'button.second'], {
            button: { width: 40, height: 20 },
            '.overlay': { position: 'absolute', x: 10, y: 10, horizontalAlign: 'right' },
        });
        root.render(context, { x: 0, y: 0, width: canvas.width, height: canvas.height });
        const [first, overlay, second] = root.children;

        expect(first.getBounds()).toEqual({ x: 0, y: 0, width: 40, height: 20 });
        expect(overlay.getBounds()).toEqual({ x: 150, y: 10, width: 40, height: 20 });
        expect(second.getBounds()).toEqual({ x: 0, y: 20, width: 40, height: 20 });
    });

    test('factory creates the element registered for a tag', () => {
        expect(UIElementFactory.createElement('container')).toBeInstanceOf(UIContainer);
    });

    test('binds events declared in the structure definition', () => {
        const clickHandler = vi.fn();
        const root = buildUIElementTree([
            {
                'button.confirm': {
                    events: { click: clickHandler },
                },
            },
        ]);
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        root.children[0].resolveLayout(root.getBounds());

        const emittedClick = vi.fn();
        root.children[0].subscribe('click', emittedClick);
        expect(root.handleClick(20, 20, {} as MouseEvent)).toBe(true);
        expect(clickHandler).toHaveBeenCalledOnce();
        expect(clickHandler).toHaveBeenCalledWith(20, 20, root.children[0]);
        expect(emittedClick).toHaveBeenCalledOnce();
        expect(emittedClick.mock.calls[0][0].detail.target).toBe(root.children[0]);
        expect(emittedClick.mock.calls[0][0].detail.position).toEqual({ x: 20, y: 20 });
    });

    test('initializes custom element data from the structure definition', () => {
        const root = buildUIElementTree([
            {
                'button.toggle': {
                    data: { expanded: false },
                    events: {
                        click: (_x, _y, target) => {
                            target.data.expanded = target.data.expanded !== true;
                        },
                    },
                },
            },
        ]);
        root.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });
        const button = root.children[0];
        button.resolveLayout(root.getBounds());

        expect(button.data.expanded).toBe(false);
        root.handleClick(20, 20, {} as MouseEvent);
        expect(button.data.expanded).toBe(true);
    });

    test('emits focus transition events from UI elements', () => {
        const root = buildUIElementTree(['button.focusable']);
        const button = root.children[0];
        const focusIn = vi.fn();
        const focusOut = vi.fn();
        button.subscribe('focusIn', focusIn);
        button.subscribe('focusOut', focusOut);

        root.setFocusedElement(button);
        root.setFocusedElement(null);

        expect(focusIn).toHaveBeenCalledOnce();
        expect(focusOut).toHaveBeenCalledOnce();
    });

    test('clones supplied resolvable properties for each container instance', () => {
        const sharedPadding = new UIResolvableProperty('10%');
        const first = new UIContainer([], { padding: sharedPadding });
        const second = new UIContainer([], { padding: sharedPadding });

        first.resolveLayout({ x: 0, y: 0, width: 200, height: 100 });

        expect(first.v('padding')).toBe(20);
        expect(first.p('padding')).not.toBe(sharedPadding);
        expect(second.p('padding')).not.toBe(sharedPadding);
        expect(() => sharedPadding.getValue()).toThrow('Property value not resolved');
        expect(() => second.p('padding').getValue()).toThrow('Property value not resolved');
    });

    test('resolves pixel and percentage units and converts numeric values to pixels', () => {
        expect(new UIResolvableProperty('12px').getResolved(200)).toBe(12);
        expect(new UIResolvableProperty('25%').getResolved(200)).toBe(50);
        expect(createUIProperty('width', 12, new UIResolvableProperty('0px'))).toMatchObject({
            declared: '12px',
        });
        expect(createUIProperty('width', '12.5px', new UIResolvableProperty('0px'))).toMatchObject({
            declared: '12.5px',
        });
        expect(() => createUIProperty('width', '12em', new UIResolvableProperty('0px'))).toThrow(
            'Expected a px or % unit',
        );
    });
});
