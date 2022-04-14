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
    display: inline-block;
    --primary-color: black;
    --secondary-color: #dddddd;
    --tertiary-color: #cccccc;
    --highlight-color: #990000;
    --areas-color: #cc0000cc;
    --bounding-box-color: #ddddddcc;
    --background-color: white;
  }`;

// SVG element will use all available space, but no more
// (actual size constraints should be set on host)
const mapStyles = css`
  svg#map { width: 100%; height: 100%; }
  .outline { fill: none; stroke: var(--secondary-color); stroke-width: 0.5; }
  .sphere { fill: var(--background-color); stroke: none; }
  .land { fill: var(--primary-color); stroke: none; }
  .graticule { fill: none; stroke: var(--secondary-color); }
  .hexes { fill: none; stroke: var(--tertiary-color); stroke-width: 0.35; }
  .areas { fill: var(--areas-color); stroke: var(--highlight-color); stroke-width: 0.5; }
  .bbox { fill: none; stroke: var(--highlight-color); stroke-width: 0.5; }`;

const infoStyles = css`
  div.info {
    color: var(--primary-color);
    border: 3px solid var(--primary-color); border-radius: 1.5rem;
    padding: 1rem 1.5rem;
  }
  div.info code {
    font-size: 1.3rem;
  }`;

const selectorStyles = css`
  .select {
    color: var(--primary-color);
    font-size: 1.3rem;
    padding: 5px;
  }`;

const spinnerStyles = css`
  g.spinner {
    animation: rotate 2s linear infinite;
  }

  g.spinner > circle {
    animation: dash 1.5s ease-in-out infinite;
    stroke: var(--primary-color);
    stroke-linecap: round;
    stroke-width: 2;
    fill: var(--background-color);
  }

  g.spinner > text {
    text-anchor: middle;
    dominant-baseline: middle;
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

const infoBoxView = (areas, projDef) =>
  html`<div class="info">
    ${areasView(areas)}<br>
    ${projDefView(projDef)}
    <slot></slot>
  </div>`;

const areasView = (areas) =>
  html`Areas (<em>H3-indexes</em>): [ <strong>${areas?.map(
    (area,i) =>
      html`${i > 0 ? ', ' : ''}<code>${area}</code>`)}</strong> ]`;

const projDefView = (projDef) =>
  html`<strong>${projDef?.name}</strong>
    projection (<code>${projDef?.id}</code>)`;

const spinnerViewFrag = (width, height) =>
  svg`<g class="spinner">
    <circle cx="${width/2}" cy="${height/2}" r="${(height-2)/2}" />
    <text x="${width/2}" y="${height/2}" class="spinner">Loading…</text>
  </g>`;

const mapViewFrag = (width, height, that) => {
  console.log( `mapViewFrag(): projFn ${that.projFn}`);
  console.log( `mapViewFrag(): pathFn ${that.pathFn}`);
  console.log( `mapViewFrag(): bsphereGeom ${that.bsphereGeom}`);
  console.log( `mapViewFrag(): bsphereGeom path ${that.pathFn(that.bsphereGeom).slice(0, 50)} ...`);
  console.log( `mapViewFrag(): outlineGeom ${H3Worldmap.outlineGeom}`);
  console.log( `mapViewFrag(): outlineGeom path ${that.pathFn(H3Worldmap.outlineGeom).slice(0, 50)} ...`);

  return svg`<defs>
    <path id="outline" d="${that.pathFn(H3Worldmap.outlineGeom)}" />
    <clipPath id="clip"><use xlink:href="#outline"/></clipPath>
  </defs>
  <g clip-path="#clip">
    <use xlink:href="#outline" class="sphere" />
    <path d="${that.pathFn(that.hexesGeom)}" class="hexes" />
    <path d="${that.pathFn(that.land)}" class="land" />
    <path d="${that.pathFn(that.bsphereGeom)}" class="bbox" />
    <path d="${that.pathFn(that.areasGeom)}" class="areas" />
  </g>
  <use xlink:href="#outline" class="outline" />`;
  // <defs>
  //   <path id="outline" d="${this.pathFn(H3Worldmap.outlineGeom)}" />
  //   <clipPath id="clip"><use href="#outline" /></clipPath>
  // </defs>
  // <g clip-path="#clip">
  //   <use href="#outline" class="sphere" />
  //   <!-- <path d="${this.pathFn(this.graticuleGeom)}" class="graticule" /> -->
  //   <path d="${this.pathFn(this.hexesGeom)}" class="hexes" />
  //   <path d="${this.pathFn(land)}" class="land" />
  //   <path d="${this.pathFn(this.bsphereGeom)}" class="bbox" />
  //   <path d="${this.pathFn(this.areasGeom)}" class="areas" />
  // </g>
  // <use href="#outline" class="outline" />
}

const mapViewOrSpinner = (aspectRatio, that) => {
  console.log("mapViewOrSpinner", that )
  const [ width, height ] =
    (aspectRatio === null)
      ? [ 100, 100 ]
      : [ 100 * aspectRatio, 100 ];
  [that._width, that._height] = [width, height];
  return svg`
    <svg id="map" viewBox="0 0 ${width} ${height}">
      ${aspectRatio === null
        ? spinnerViewFrag(width,height)
        : mapViewFrag(width,height, that)}
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
    return [ hostStyles, mapStyles, infoStyles, selectorStyles, spinnerStyles ];
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

      land: { type: Object },

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
       * @type {number}
       */
      _aspectRatio: { type: Number, state: true },
    };
  }

  constructor() {
    super();

    // Public attributes/properties (observed by Lit)
    this.projection = "orthographic";    // will trigger its property setter
    this.areas = [];                     // will trigger its property setter

    // Internal state properties (observed by Lit)
    this._aspectRatio = null;             // width/height of SVG Element, computed after first paint

    // Internal private properties (derived, not observed)
    this._uniqueAreas = null;            // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = null;          // computed from `this._projection` (see `willUpdate()`)

    this._width = undefined;
    this._height = undefined;

    this.land = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this.fetchLandData();
    console.log("H3Worldmap connectedCallback");
  }

  fetchLandData() {
    fetch('../land-50m.json')
    //fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json") // fails
    .then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        // const rj = response.json();
        // console.log('fetchLandData response:', rj);
        // return rj
        return response.json();
    })
    .then(world => {
        console.log('fetchLandData world:', world);
        this.land = topojson.feature(world, world.objects.land);
        console.log('fetchLandData land:', this.land);
    })
    .catch((error) => {
        console.error('fetchLandData error:', error);
    });
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

  get projFn() {
    const proj = this._projectionDef.ctorFn();
    return proj.fitSize( [this._width, this._height], H3Worldmap.outlineGeom)
               .rotate( this.centroid[ 1], this.centroid[ 0]);
  }

  get pathFn() {
    return d3.geoPath( this.projFn);
  }

  static get outlineGeom() {
    return { type: "Sphere" };
  }

  get _SVGElement() {
    return this.renderRoot?.querySelector('svg#map') ?? null;
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
    //console.log("bsphereGeom this.bbox", this.bbox);
    const { minLat, minLon, maxLat, maxLon } = this.bbox;
    const radius =
      Math.max(Math.abs(maxLat - minLat), Math.abs(maxLon - minLon)) / 1.9;
    //console.log(radius, maxLat - minLat, maxLon - minLon);
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

  _measureSVGElement() {
    return requestAnimationFrame(() => {
      const clientRect = this._SVGElement.getBoundingClientRect();
      this._aspectRatio = clientRect.width / clientRect.height;
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
    if (this._aspectRatio === null) {
      this._measureSVGElement();
    }
  }

  render() {
    return [
      mapViewOrSpinner(this._aspectRatio, this),
      this.selectProjection(),
      infoBoxView(this._uniqueAreas, this._projectionDef)
    ];
  }

  selectProjection() {
    return html`
      <div class="select">
        <select name="myselect" id="myselect"  class="select" @change="${this.selectProjectionFn}">
          <option value="" selected disabled hidden>Select projection</option>
          <option value="orthographic">Orthographic</option>
          <option value="naturalEarth">Natural Earth</option>
          <option value="conicEqualArea">Conic equal-area</option>
          <option value="stereographic">Stereographic</option>
          <option value="gnomonic">Gnomonic</option>
          <option value="mercator">Mercator</option>
        </select>
      </div>
    `;
  }

  selectProjectionFn(e) {
    console.log('select', e.target.value);
    this.projection = e.target.value;
  }
}

window.customElements.define('h3-worldmap', H3Worldmap);