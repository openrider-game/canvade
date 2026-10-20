## Canvade

<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
<h1 align="center">Canvade</h1>
  <p align="center">
    Canvade is an engine for canvas based browser games.
    <br />
    <br />
    <a href="https://tomiy.me/openrider/">View Demo</a>
    ·
    <a href="https://github.com/tomiy/canvade/issues">Report Bug</a>
    ·
    <a href="https://github.com/tomiy/canvade/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Canvade is an engine for canvas based browser games, written in TypeScript.

It provides:

- a fixed timestep game loop, separating the physics updates from the rendering
- states stacked by a state manager, each made of layers receiving the input from the top layer down
- keyboard controls and mouse positions, in canvas pixels and in world units
- a world with a camera and a zoom, and the conversions between world and canvas coordinates
- a declarative canvas UI: elements described by a structure and styled by CSS-like selectors, with relative units, alignment, absolute positioning, interaction states and animations, scaled to keep its size on high density screens
- built-in UI elements: containers, buttons, texts, images and text inputs

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running follow these steps.

### Prerequisites

- NPM
- VS Code Live Server extension (optional)

### Installation

1. Clone the repo
    ```sh
    git clone https://github.com/tomiy/canvade.git
    ```
2. Install NPM packages

    ```sh
    npm install
    ```

3. Build the library, the output is written to `dist/`

    ```sh
    npm run build
    ```

4. Link it from a game project

    ```sh
    cd ../my-game
    npm link ../canvade
    ```

Run the tests with `npm test`, the coverage with `npm run coverage` and the linter with `npm run lint`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

### Game, states and layers

A game is made of named states, the current state being the top of the state stack. Each state is made of layers: they are rendered in order, and receive the input events from the top layer down.

```ts
import { Game, GameRenderEvent, Layer, State } from "canvade";

class MainLayer extends Layer {
    // Called by the layer constructor: subscribe to the events here
    public initLayer(): void {
        this.subscribe("render", (e: CustomEvent<GameRenderEvent>) => {
            e.detail.ctx.fillRect(10, 10, 100, 100);
        });
    }
}

class MainState extends State {
    protected initState(): void {
        this.subscribe("enter", () => console.log("entered"));
    }

    protected initLayers(): Map<string, Layer> {
        return new Map<string, Layer>([["main", new MainLayer()]]);
    }
}

const game = new Game(document.getElementById("game")!, { updatesPerSecond: 50 });
game.addStates(new Map([["main", MainState]]));
game.pushState("main");
game.run();
```

The game loop dispatches these events to the current state and its layers:

- `fixedUpdate`, a fixed number of times per second (`updatesPerSecond`), for the physics
- `update`, once per frame, with the `progress` towards the next fixed update and the elapsed `delta` in milliseconds, to interpolate the rendering between two fixed updates
- `render`, once per frame, with the canvas context, after the canvas has been cleared

States also receive `enter` and `leave` when pushed or popped, and the DOM events of the canvas (`mouseDown`, `mouseUp`, `mouseMove`, `scroll`, `contextMenu`, `keyDown`, `keyboardDown`...).
Input events go from the top layer down, and stop as soon as a layer sets `event.detail.consumed`.

States are created when added to the game, before being pushed: since `initState` and `initLayers` run in the `State` constructor, they must not rely on the fields of the subclass. The same goes for `initLayer`, run in the `Layer` constructor.

### State transitions and shared data

A state can push or pop states with its `manager`, and share data with the other states through `manager.shared`, which the game exposes as `game.shared` to seed it before the first state:

```ts
game.shared.set("level", 1);

// In a state
this.manager.shared.set("score", 100);
this.manager.push("gameOver");
```

### Keyboard and mouse

Keyboard controls are registered by name, and can be polled or listened to:

```ts
import { Control, CTRL, Keyboard, KEYS, KEYZ } from "canvade";

Keyboard.registerControl("jump", new Control(KEYZ));
// Fires once per key press
Keyboard.registerControl("save", new Control(KEYS, CTRL, true));

Keyboard.isDown("jump");
// In a state or a layer, e.detail.key is the control name
this.subscribe("keyboardDown", (e) => console.log(e.detail.key));
```

Letter controls match the letter typed with the keyboard layout of the player (`KEYZ` is the Z key of an AZERTY keyboard too), other controls match the physical key position.

`Mouse.mousePos` holds the mouse position in canvas pixels. When the current state has a world (`state.setWorld(world)`), `Mouse.worldPos` holds it in world units: a `World` has a `camera` and a `zoomFactor`, and `WorldVector` converts positions between world units and canvas pixels.

### User interface

Each layer has a `uiRenderer`, built from a structure and CSS-like styles. Elements are written as `type.class1.class2`, and styles use type, class and descendant selectors, the most specific rules overriding the others:

```ts
this.uiRenderer.setUI(
    [
        {
            "container.panel": ["text.title", { "button.start": { events: { click: () => this.manager.push("game") } } }],
        },
        "button.settings",
    ],
    {
        ".panel": { x: "10%", y: "10%", width: "80%", height: 200, gap: 12, padding: 20 },
        ".panel .title": { text: "My game", fontSize: 30, height: 40 },
        button: { width: 150, height: 48, hoverBackgroundColor: "#ccc" },
        ".start": { text: "Start" },
        // Out of the root flow, 10px from the bottom right corner of the canvas
        ".settings": {
            position: "absolute",
            x: 10,
            y: 10,
            horizontalAlign: "right",
            verticalAlign: "bottom",
            text: "Settings",
        },
    },
);
```

- Positions and sizes are numbers (pixels), `'px'` or `'%'` values relative to the parent bounds.
- Containers lay their children out in a column or a row (`flexDirection`), with `gap` and `padding`; absolute children are placed in the content box of the container instead.
- `horizontalAlign` (`left`, `center`, `right`) and `verticalAlign` (`top`, `middle`, `bottom`) choose the edge the `x` and `y` offsets are measured from.
- Buttons take a `borderRadius` (0 for square corners), a `borderWidth`, a `fontSize` and a `textColor` (the border `color` by default); containers and inputs take a `borderWidth` too.
- A column container with `overflow: 'auto'` (scrollbar when needed) or `'scroll'` (always) scrolls its children vertically, with the mouse wheel or by dragging its scrollbar; it dispatches `scroll`, and `scrollTop` sets its scroll position from the styles.
- `pointerEvents: 'none'` lets the mouse go through an element (not through its children), e.g. a transparent container laying out buttons over the game.
- Numeric properties can be animated: `element.animate('x', '20%', { duration: 400 })`.
- Custom elements are registered with `UIElementFactory.registerElement('type', ElementClass)`.

Besides `container`, `button` and `text`, the built-in elements are:

- `image`: draws the image at the `src` URL, with a `fit` of `contain` (default), `cover` or `fill`, and an `opacity`. `UIImage.load(src)` preloads an image.
- `input`: a single line text field, focused by a click, with a `value`, a `placeholder` and a `maxLength`. It receives the typed keys instead of the keyboard controls, and dispatches `change` on each edit and `submit` on Enter, which can be handled in the structure: `{ "input.name": { events: { change: (value) => ..., submit: (value) => ... } } }`. Escape or a click outside of the UI removes the focus. Text is selected with the mouse, with Shift and the arrows, Home or End, or entirely with Ctrl+A, and copied, cut and pasted with the usual shortcuts, through the clipboard events of the browser.

The UI is laid out in UI pixels: the canvas is sized in device pixels to stay sharp, and the UI is scaled by the pixel ratio of the screen (`Display.uiScale`), so that it keeps its size on high density screens. The bounds of the elements and the positions given to their click handlers are in UI pixels. Pass a `uiScale` to the game options to use a fixed scale instead.

### Debugging

Pass a `debugLevel` to the game options to enable the `DebugUtils` logs up to that level.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- Multi-line texts, wrapped to the width of their element

See the [open issues](https://github.com/tomiy/canvade/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code documentation

The code is documented with [TSDoc](https://tsdoc.org/) comments:

- every exported class, interface, type, enum, function and constant has a `/** ... */` doc comment, as well as the members whose behavior is not obvious from their name and types
- a doc comment starts with a summary sentence; tags use the TSDoc form, without types: `@param name - Description.`, `@returns Description.`, `@throws Description.`
- inline `//` comments only explain why the code does something, and start with a capital letter

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the GPL-3.0 License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Tomiy - [@**tomiy**](https://twitter.com/__tomiy__)

Project Link: [https://github.com/tomiy/canvade](https://github.com/tomiy/canvade)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

tbd.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/tomiy/canvade.svg?style=for-the-badge
[contributors-url]: https://github.com/tomiy/canvade/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/tomiy/canvade.svg?style=for-the-badge
[forks-url]: https://github.com/tomiy/canvade/network/members
[stars-shield]: https://img.shields.io/github/stars/tomiy/canvade.svg?style=for-the-badge
[stars-url]: https://github.com/tomiy/canvade/stargazers
[issues-shield]: https://img.shields.io/github/issues/tomiy/canvade.svg?style=for-the-badge
[issues-url]: https://github.com/tomiy/canvade/issues
[license-shield]: https://img.shields.io/github/license/tomiy/canvade.svg?style=for-the-badge
[license-url]: https://github.com/tomiy/canvade/blob/master/LICENSE.txt
