/**
 * Defaults of the built-in UI elements.
 *
 * The type constants are the element types used in structure definitions and style selectors.
 */
export const UI_CONTAINER_TYPE = 'container',
    UI_BUTTON_TYPE = 'button',
    UI_TEXT_TYPE = 'text',
    UI_IMAGE_TYPE = 'image',
    UI_INPUT_TYPE = 'input',
    /** Separates the element type from its class names, e.g. `button.primary`. */
    UI_CLASS_SEPARATOR = '.',
    UI_TRANSPARENT = 'transparent',
    UI_DEFAULT_COLOR = 'black',
    UI_BUTTON_BACKGROUND_COLOR = '#d0d0d0',
    /** Corner radius of the buttons, in pixels. */
    UI_BUTTON_BORDER_RADIUS = 8,
    /** Border width of the buttons, containers and inputs, in pixels. */
    UI_DEFAULT_BORDER_WIDTH = 1,
    UI_FONT_FAMILY = 'Arial',
    /** Font size of the buttons and texts, in pixels. */
    UI_DEFAULT_FONT_SIZE = 14,
    /** Distance between two lines of a text, as a multiple of its font size. */
    UI_DEFAULT_LINE_HEIGHT = 1.2,
    /** Default `text` of a button. */
    UI_BUTTON_TEXT = 'Button',
    /** Default `text` of a text element. */
    UI_TEXT_TEXT = 'Text',
    /** Default `x` and `y` of the elements, and default `gap` and `padding` of containers. */
    UI_DEFAULT_OFFSET = '0px',
    /** Default `width` and `height` of the elements. */
    UI_DEFAULT_SIZE = '100px',
    UI_DEFAULT_HORIZONTAL_ALIGN = 'left',
    UI_DEFAULT_VERTICAL_ALIGN = 'top',
    UI_DEFAULT_POSITION = 'static',
    UI_DEFAULT_POINTER_EVENTS = 'auto',
    UI_DEFAULT_IMAGE_FIT = 'contain',
    UI_INPUT_BACKGROUND_COLOR = '#fff',
    UI_INPUT_PLACEHOLDER_COLOR = '#888',
    UI_INPUT_FOCUS_COLOR = '#36f',
    /** Space between the border of an input and its text, in pixels. */
    UI_INPUT_PADDING = 6,
    /** Duration of each phase of the caret blinking, in milliseconds. */
    UI_INPUT_CARET_BLINK = 500,
    UI_DEFAULT_FLEX_DIRECTION = 'column',
    UI_DEFAULT_OVERFLOW = 'hidden',
    /** Width of the container scrollbars, in pixels. */
    UI_SCROLLBAR_WIDTH = 8,
    UI_SCROLLBAR_COLOR = '#888',
    UI_SCROLLBAR_TRACK_COLOR = '#eee',
    /** Smallest height of a scrollbar thumb, in pixels, so that it can always be grabbed. */
    UI_SCROLLBAR_MIN_THUMB = 16,
    /** Background of the selected text of an input. */
    UI_INPUT_SELECTION_COLOR = '#b4d5fe',
    /** Size of the root of a UI tree, which covers the whole canvas. */
    UI_ROOT_SIZE = '100%';
