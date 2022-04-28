/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { LitElement, html, svg, css } from 'lit';
import * as d3 from 'd3';
import { h3IsValid, h3IsPentagon, h3ToGeoBoundary, getRes0Indexes } from 'h3-js';
import * as topojson from 'topojson-client';

// Utility functions

function removeDuplicates( arr) {
  return [...new Set(arr)];
}

// Styles

const hostStyles = css`
  :host {
    height: 66vh;
    box-sizing: border-box;
    display: inline-block;
    --primary-color: black;
    --secondary-color: #dddddd;
    --tertiary-color: #cccccc;
    --highlight-color: #990000;
    --areas-color: #cc0000cc;
    --bounding-box-color: #ddddddcc;
    --background-color: white;
  }

  svg, div { box-sizing: inherit }`;

// SVG element will use all available space, but no more
// (actual size constraints should be set on host)
const mapStyles = css`
  svg#map { width: 100%; height: 100%; }
  .outline { fill: none; stroke: var(--secondary-color); stroke-width: 0.25%; }
  .sphere { fill: var(--background-color); stroke: none; }
  .land { fill: none; stroke: var(--primary-color); stroke-width: 0.15%; }
  .graticule { fill: none; stroke: var(--secondary-color); }
  .hexes { fill: none; stroke: var(--tertiary-color); stroke-width: 0.10%; }
  .areas { fill: var(--areas-color); stroke: var(--highlight-color); stroke-width: 0.25%; }
  .bbox { fill: none; stroke: var(--highlight-color); stroke-width: 0.25%; }`;

const infoStyles = css`
  div.info {
    color: var(--primary-color);
    border: 3px solid var(--primary-color); border-radius: 1.5rem;
    padding: 1rem 1.5rem;
  }
  div.info code {
    font-size: 1.3rem;
  }`;

const spinnerStyles = css`
  .spinner {
    animation: rotate 2s linear infinite;
  }

  .spinner circle {
    animation: dash 1.5s ease-in-out infinite;
    stroke: var(--primary-color);
    stroke-linecap: round;
    stroke-width: 2;
    fill: var(--background-color);
  }

  @keyframes rotate {
    100% { transform: rotate(360deg); }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0; }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35; }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124; }
  }`;

// Template fragments

function infoBoxView(areas, projDef) {
  return html`<div class="info">
    ${areasView(areas)}<br>
    ${projDefView(projDef)}
    <slot></slot>
  </div>`;
}

function areasView(areas) {
  return html`Areas (<em>H3-indexes</em>): [ <strong>${areas?.map(
    (area,i) =>
      html`${i > 0 ? ', ' : ''}<code>${area}</code>`)}</strong> ]`;
}

function projDefView(projDef) {
  return html`<strong>${projDef?.name}</strong>
    projection (<code>${projDef?.id}</code>)`;
}

function spinnerViewFrag() {
  // Important: id="map" must match the id used in `_SVGElement()`,
  return svg`<svg id="map" viewBox="0 0 50 50" class="spinner">
    <circle class="path" cx="25" cy="25" r="20" />
  </svg>`;
}

function mapViewFrag(viewBoxSize, pathFn, geometries) {
  // Important: id="map" must match the id used in `_SVGElement()`,
  const [ width, height ] = viewBoxSize;
  return svg`<svg id="map" viewBox="0 0 ${width} ${height}">
    <defs>
      <path id="outline" d="${pathFn(geometries.outline)}" />
      <clipPath id="clip"><use xlink:href="#outline"/></clipPath>
    </defs>
    <g clip-path="#clip">
      <use xlink:href="#outline" class="sphere" />
      <!-- <path d="${pathFn(geometries.graticule)}" class="graticule" /> -->
      <path d="${pathFn(geometries.hexes)}" class="hexes" />
      <path d="${pathFn(geometries.world)}" class="land" />
      <path d="${pathFn(geometries.bsphere)}" class="bbox" />
      <path d="${pathFn(geometries.areas)}" class="areas" />
    </g>
    <use xlink:href="#outline" class="outline" />
  </svg>`;
}

/**
 * Map of the projection identifiers, which are the possible values of the
 * 'projection' attribute of our custom element, with their corresponding
 * friendly name and D3 projection constructor function.
 *
 * It is (currently) a subset of projections we selected from the
 * [D3-geo](https://github.com/d3/d3-geo#projections) library.
 *
 * @constant
 * @default
 */
const AVAILABLE_PROJECTIONS = new Map([
  [ "conicEqualArea", { id: "conicEqualArea", name: "Conic equal-area", ctorFn: d3.geoConicEqualArea } ],
  [ "orthographic",   { id: "orthographic", name: "Orthographic", ctorFn: d3.geoOrthographic } ],
  [ "naturalEarth",   { id: "naturalEarth", name: "Natural Earth", ctorFn: d3.geoNaturalEarth1 } ],
  [ "stereographic",  { id: "stereographic", name: "Stereographic", ctorFn: d3.geoStereographic } ],
  [ "gnomonic",       { id: "gnomonic", name: "Gnomonic", ctorFn: d3.geoGnomonic } ],
  [ "mercator",       { id: "mercator", name: "Mercator", ctorFn: d3.geoMercator } ],
  // TODO: complete list from https://observablehq.com/@d3/projection-comparison
]);

/**
 * ‹h3-worldmap› custom element.
 *
 * About the update/layout/paint flow:
 *
 *  1. As long as we don't know the size of the SVG element,
 *     we can't draw the map, because we need to know its
 *     aspect ratio, to set the view box system and configure
 *     the D3-geo projection to use the whole available space,
 *     even when the content box is not squarish.
 *  2. So we start by rendering a loading spinner, to let the
 *     browser compute layout and assign the size of its container.
 *  3. Once the aspect ratio of the SVG container element is known,
 *     we can start to draw the map, inside the same SVG element.
 *  4. All of obviously this happens in two different frames,
 *     with a repaint, hopefully without a re-layout.
 *
 * @fires (nothing) - Indicates (nothing)
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class H3Worldmap extends LitElement {
  static get styles() {
    return [ hostStyles, mapStyles, infoStyles, spinnerStyles ];
  }

  static get properties() {
    return {
      /**
       * Geodesic projection identifier (a string matching one of
       * the selected D3-geo projections that we support — see
       * the AVAILABLE_PROJECTIONS map definition in source code).
       *
       * @type {string}
       */
      projection: { type: String },

      /**
       * An array of H3-indexes, in JSON-stringified form.
       *
       * For instance:
       *     <code>&lt;h3-worldmap
       *        areas='[ 80abfffffffffff, 80a5fffffffffff ]'></code>
       *
       * @type {array}
       */
      areas: { type: Array },

      /**
       * URL of a TopoJSON file describing the geometry of the world
       * we'd like to display on the map. It is typically one of the
       * World Atlases available from https://github.com/topojson/world-atlas
       *
       * @type {url}
       */
      worldGeometrySrc: { type: String, attribute: "world-geometry-src" },

      /**
       * Name of the geometry collection, which we'd like to display.
       * Dependent upon the structure of the TopoJSON of the world
       * geometry specified by the `worldGeometrySrc` property.
       *
       * For instance, the `countries-50m.json` TopoJSON world atlas [see below]
       * contains two geometry collections, named `countries` and `land`;
       * this attribute should take one of either collection names.
       *
       * @type {string}
       * @see https://github.com/topojson/world-atlas#countries-50m.json
       */
      worldGeometryColl: { type: String, attribute: "world-geometry-coll" },

      /**
       * World Atlas TopoJSON geometry, as loaded from the
       * `world-geometry-src` and `world-geometry-coll` attributes.
       * @type {object}
       */
      _worldGeom: { type: Object, state: true },

      /**
       * Computed aspect ratio (width / height) of the client
       * rect of the map SVG Element.
       *
       * Defined after first update and paint, thru a complicated
       * execution flow:
       *
       * 1. the `updated()` lifecyle event handler (called whenever
       *    the component’s update finishes and the element's DOM has
       *    been updated and rendered) registers a `requestAnimationFrame()`
       *    callback handler;
       * 2. that will in turn measure the width and height of the
       *    SVG element, compute its aspect ratio and set this state
       *    property accordingly;
       * 3. which will finally trigger a re-render of the SVG element
       *    by Lit, with the correct aspect ratio being available.
       *
       * @type {object}
       */
      _svgClientRect: { type: Object, state: true },
    };
  }

  constructor() {
    super();

    // Public attributes/properties (observed by Lit)
    this.projection = "orthographic";    // will trigger its property setter
    this.areas = [];                     // will trigger its property setter
    this.worldGeometrySrc = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
    this.worldGeometryColl = "land";

    // Internal state properties (observed by Lit)
    this._svgClientRect = null;          // computed after first paint
    this._worldGeom = undefined;          // defined once the TOPOJson world geometry has loaded

    // Internal private properties (derived, not observed)
    this._uniqueAreas = null;            // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = null;          // computed from `this._projection` (see `willUpdate()`)

  }

  async fetchLandData() {
    return fetch(this.worldGeometrySrc)
      .then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.json();
      })
      .then(world => {
        this._worldGeom =
          Object.hasOwn(world.objects, this.worldGeometryColl) // avoid code injection
          ? topojson.feature(world, this.worldGeometryColl)
          : null;
      })
      .catch(
        error => { throw error; });
  }

  set areas( val) {
    // Validates the areas, which should be an array of valid H3-indexes
    if( !Array.isArray( val))
      throw new TypeError( `Property 'areas' must contain an array of H3-indexes; got ${val}`);

    const anyInvalidArea = val.find( area => !h3IsValid( area));
    if( anyInvalidArea)
      throw new TypeError( `Property 'areas' must contain valid H3-indexes; '${anyInvalidArea}' is an invalid H3-index`)

    // Update the property with the validated value
    const oldAreas = this._areas;
    this._areas = val;
    this.requestUpdate("areas", oldAreas);
  }

  set projection(val) {
    // Validates the new projection identifier
    if( !AVAILABLE_PROJECTIONS.has( val))
      throw new RangeError( `Unsupported 'projection' property value: '${val}'`);

    // Update the property with the validated value
    const oldId = this._projection;
    this._projection = val;
    this.requestUpdate("projection", oldId);
  }

  get viewBoxsize() {
    // Returns width and height of the SVG viewbox space, which is used to
    // configure the D3-geo projection to produce coordinates in this space
    return (this._svgClientRect === null)? null
      : [ 1000 * this._svgClientRect.width / this._svgClientRect.height, 1000 ];
  }

  get isLoading() {
    return this._svgClientRect === null
           || this._worldGeom === null;
  }

  get outlineGeom() {
    return { type: "Sphere" };
  }

  get areasGeom() {
    return {
      type: "FeatureCollection",
      features: this._areas.map((area) => ({
        type: "Feature",
        properties: { id: area, pentagon: h3IsPentagon(area) },
        geometry: {
          type: "Polygon",
          coordinates: [h3ToGeoBoundary(area, true).reverse()]
        }
      }))
    };
  }

  get centroid() {
    return d3.geoCentroid(this.areasGeom);
  }

  get bbox() {
    const [[minLon, minLat], [maxLon, maxLat]] = d3.geoBounds(
      this.areasGeom
    );
    return { minLat, minLon, maxLat, maxLon };
  }

  get bsphereGeom() {
    const { minLat, minLon, maxLat, maxLon } = this.bbox;
    const radius =
      Math.max(Math.abs(maxLat - minLat), Math.abs(maxLon - minLon)) / 1.9;
    const geoCircle = d3.geoCircle().center(this.centroid).radius(radius);
    return geoCircle();
  }

  get hexesGeom() {
    return {
      type: "FeatureCollection",
      features: getRes0Indexes()
        // .map( i => h3ToChildren( i, level))
        .flat()
        .map( d => ({
          type: "Feature",
          properties: { id: d, pentagon: h3IsPentagon(d) },
          geometry: {
            type: "Polygon",
            coordinates: [ h3ToGeoBoundary(d, true).reverse() ]
          }
        }))
    };
  }

  get projFn() {
    const proj = this._projectionDef.ctorFn();
    return proj.fitSize( this.viewBoxsize, this.outlineGeom)
               .rotate( this.centroid[ 1], this.centroid[ 0]);
  }

  get pathFn() {
    return d3.geoPath( this.projFn);
  }

  get _SVGElement() {
    return this.renderRoot?.querySelector('svg#map') ?? null;
  }

  _measureSVGElement() {
    return requestAnimationFrame(() => {
      this._svgClientRect = this._SVGElement.getBoundingClientRect();
    });
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('projection')) {
      this._projectionDef = AVAILABLE_PROJECTIONS.get( this._projection);
    }
    if (changedProperties.has('areas')) {
      this._uniqueAreas = removeDuplicates(this._areas);
    }
  }

  firstUpdated() {
    // TODO: we should not ignore the promise returned
    // TODO: world geometry should be reloaded when
    // worldGeometrySrc|Coll properties change
    this.fetchLandData();

    if (this._svgClientRect === null) {
      this._measureSVGElement();
    }
  }

  geometries() {
    return {
      outline: this.outlineGeom,
      graticule: null,
      hexes: this.hexesGeom,
      world: this._worldGeom,
      bsphere: this.bsphereGeom,
      areas: this.areasGeom
    }
  }

  render() {
    return [
      this.isLoading ? spinnerViewFrag() : mapViewFrag(this.viewBoxsize, this.pathFn, this.geometries()),
      infoBoxView(this._uniqueAreas, this._projectionDef)
    ];
  }
}

window.customElements.define('h3-worldmap', H3Worldmap);