import { UIProperty } from '../properties/ui-property.type';
import { UIBounds, UIElement, UIElementProperties } from '../ui-element';
import { UI_DEFAULT_IMAGE_FIT, UI_IMAGE_TYPE } from '../ui.constants';

/**
 * How an image fills the bounds of a {@link UIImage}: stretched (`fill`), scaled to fit inside
 * them (`contain`), or scaled to cover them and cropped (`cover`), keeping its aspect ratio but
 * for `fill`.
 */
export type UIImageFit = 'fill' | 'contain' | 'cover';

/** Properties of a {@link UIImage}, `src` being the URL of the image. */
type UIImageProperties = UIElementProperties & {
    src?: UIProperty<string>;
    fit?: UIProperty<UIImageFit>;
    opacity?: UIProperty<number>;
};

const defaultUIImageProperties: UIImageProperties = {
    src: new UIProperty(''),
    fit: new UIProperty<UIImageFit>(UI_DEFAULT_IMAGE_FIT),
    opacity: new UIProperty(1),
};

/**
 * Image loaded from the `src` URL, of type `image`, centered in its bounds and clipped to them.
 *
 * The images are loaded once per URL and shared by the elements. Nothing is drawn until the
 * image is loaded; preload it with {@link UIImage.load} to display it on the first frame.
 */
export class UIImage extends UIElement<UIImageProperties> {
    private static readonly images = new Map<string, HTMLImageElement>();

    constructor(classNames: string[] = [], properties: UIImageProperties = {}) {
        super(UI_IMAGE_TYPE, classNames, { ...defaultUIImageProperties, ...properties });
    }

    /**
     * Starts loading an image, or returns the one already loading.
     *
     * @returns The image, whose `decode()` resolves once it can be drawn.
     */
    public static load(src: string): HTMLImageElement {
        let image = UIImage.images.get(src);
        if (!image) {
            image = new Image();
            image.src = src;
            UIImage.images.set(src, image);
        }
        return image;
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const src = this.v('src');
        if (!src) {
            return;
        }

        const image = UIImage.load(src);
        if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
            return;
        }

        const bounds = this.getBounds();
        const target = UIImage.fitImage(
            image.naturalWidth,
            image.naturalHeight,
            bounds,
            this.v('fit'),
        );

        ctx.save();
        ctx.beginPath();
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.clip();
        ctx.globalAlpha *= this.v('opacity');
        ctx.drawImage(image, target.x, target.y, target.width, target.height);
        ctx.restore();
    }

    /**
     * Computes where an image is drawn to fill bounds with a fit mode, centered in them.
     *
     * @param width - Width of the image, in pixels.
     * @param height - Height of the image, in pixels.
     */
    public static fitImage(width: number, height: number, bounds: UIBounds, fit: UIImageFit) {
        if (fit === 'fill') {
            return { ...bounds };
        }

        const scaleX = bounds.width / width;
        const scaleY = bounds.height / height;
        const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
        const drawnWidth = width * scale;
        const drawnHeight = height * scale;

        return {
            x: bounds.x + (bounds.width - drawnWidth) / 2,
            y: bounds.y + (bounds.height - drawnHeight) / 2,
            width: drawnWidth,
            height: drawnHeight,
        };
    }
}
