---
layout: page.11ty.cjs
title: <h3-worldmap> ⌲ Home
---

# &lt;h3-worldmap>

`<h3-worldmap>` is an awesome element. It's a great introduction to building web components with LitElement, with nice documentation site as well.

## As easy as HTML

<section class="columns">
  <div>

`<h3-worldmap>` is just an HTML element. You can it anywhere you can use HTML!

```html
<h3-worldmap></h3-worldmap>
```

  </div>
  <div>

<h3-worldmap></h3-worldmap>

  </div>
</section>

## Configure with attributes

<section class="columns">
  <div>

`<h3-worldmap>` can be configured with attributed in plain HTML.

```html
<h3-worldmap name="HTML"></h3-worldmap>
```

  </div>
  <div>

<h3-worldmap name="HTML"></h3-worldmap>

  </div>
</section>

## Declarative rendering

<section class="columns">
  <div>

`<h3-worldmap>` can be used with declarative rendering libraries like Angular, React, Vue, and lit-html

```js
import {html, render} from 'lit-html';

const name = 'lit-html';

render(
  html`
    <h2>This is a &lt;h3-worldmap&gt;</h2>
    <h3-worldmap .name=${name}></h3-worldmap>
  `,
  document.body
);
```

  </div>
  <div>

<h2>This is a &lt;h3-worldmap&gt;</h2>
<h3-worldmap name="lit-html"></h3-worldmap>

  </div>
</section>
