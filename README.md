# ‹h3-worldmap› Web Component

Draws a set of H3 _indexes_ as areas on the terrestrial globe, with the given _geodesic projection_ and _land geometry_.

_H3 indexes_ are coordinates of the [H3 geospatial hierarchical indexing system](http://h3geo.org), coordinates which designate hexagonal or pentagonal areas of various sizes.

_Land geometry_ should be provided as a TopoJSON geometry, representing country or land boundaries, and will be drawn on a terrestrial globe.

Suitable TopoJSON files are available from the [World Atlas TopoJSON](https://github.com/topojson/world-atlas) repository.

## Example

This HTML fragment:

```html
<h3-worldmap
  projection="naturalEarth"
  areas='[ "80abfffffffffff", "80e1fffffffffff", "80a5fffffffffff",
           "8035fffffffffff", "801ffffffffffff" ]'
  geometry-src="land-50m.json" geometry-coll="land">
</h3-worldmap>
```

… would render as an SVG image looking like:

<img title="Sample ‹h3-worldmap› with «natural earth» projection" src="docs/images/h3-worldmap-natural-earth.png" height="200">

## Status

🌱 Work-in-progress. Early stage of development, unstable and uncomplete API.

Currently porting the code of the ‹H3MiniMap› web component, from the ObservableHQ [@olange/h3-minimap](https://observablehq.com/@olange/h3-minimap) notebook.

## Setup

Install dependencies:

```bash
npm i
```

## Testing

Tests can be run with the `test` script, which will run your tests against Lit's development mode (with more verbose errors) as well as against Lit's production mode:

```bash
npm test
```

For local testing during development, the `test:dev:watch` command will run your tests in Lit's development mode (with verbose errors) on every change to your source files:

```bash
npm test:watch
```

Alternatively the `test:prod` and `test:prod:watch` commands will run your tests in Lit's production mode.

## Dev Server

This sample uses modern-web.dev's [@web/dev-server](https://www.npmjs.com/package/@web/dev-server) for previewing the project without additional build steps. Web Dev Server handles resolving Node-style "bare" import specifiers, which aren't supported in browsers. It also automatically transpiles JavaScript and adds polyfills to support older browsers. See [modern-web.dev's Web Dev Server documentation](https://modern-web.dev/docs/dev-server/overview/) for more information.

To run the dev server and open the project in a new browser tab:

```bash
npm run serve
```

There is a development HTML file located at `/dev/index.html` that you can view at http://localhost:8000/dev/index.html. Note that this command will serve your code using Lit's development mode (with more verbose errors). To serve your code against Lit's production mode, use `npm run serve:prod`.

## Editing

If you use VS Code, we highly reccomend the [lit-plugin extension](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin), which enables some extremely useful features for lit-html templates:

- Syntax highlighting
- Type-checking
- Code completion
- Hover-over docs
- Jump to definition
- Linting
- Quick Fixes

The project is setup to reccomend lit-plugin to VS Code users if they don't already have it installed.

## Linting

Linting of JavaScript files is provided by [ESLint](eslint.org). In addition, [lit-analyzer](https://www.npmjs.com/package/lit-analyzer) is used to type-check and lint lit-html templates with the same engine and rules as lit-plugin.

The rules are mostly the recommended rules from each project, but some have been turned off to make LitElement usage easier. The recommended rules are pretty strict, so you may want to relax them by editing `.eslintrc.json`.

To lint the project run:

```bash
npm run lint
```

## Formatting

[Prettier](https://prettier.io/) is used for code formatting. It has been pre-configured according to the Lit's style. You can change this in `.prettierrc.json`.

Prettier has not been configured to run when commiting files, but this can be added with Husky and and `pretty-quick`. See the [prettier.io](https://prettier.io/) site for instructions.

## Static Site

This project includes a simple website generated with the [eleventy](11ty.dev) static site generator and the templates and pages in `/docs-src`. The site is generated to `/docs` and intended to be checked in so that GitHub pages can serve the site [from `/docs` on the master branch](https://help.github.com/en/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

To enable the site go to the GitHub settings and change the GitHub Pages &quot;Source&quot; setting to &quot;master branch /docs folder&quot;.</p>

To build the site, run:

```bash
npm run docs
```

To serve the site locally, run:

```bash
npm run docs:serve
```

To watch the site files, and re-build automatically, run:

```bash
npm run docs:watch
```

The site will usually be served at http://localhost:8000.

## Bundling and minification

This starter project doesn't include any build-time optimizations like bundling or minification. We recommend publishing components as unoptimized JavaScript modules, and performing build-time optimizations at the application level. This gives build tools the best chance to deduplicate code, remove dead code, and so on.

For information on building application projects that include LitElement components, see [Build for production](https://lit.dev/docs/tools/production/) on the LitElement site.

## More information

See [Get started](https://lit.dev/docs/getting-started/) on the Lit site for more information.
