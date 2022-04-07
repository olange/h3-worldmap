/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { LitElement, html, svg, css } from 'lit';
import * as d3 from 'd3';
import { h3IsValid } from 'h3-js';

// Utility functions
// TODO: move to separate module

function removeDuplicates( arr) {
  return [...new Set(arr)];
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
 * @fires (nothing) - Indicates (nothing)
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class H3Worldmap extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        --primary-color: black;
        --secondary-color: #dddddd;
        --tertiary-color: #cccccc;
        --highlight-color: #990000;
        --areas-color: #cc0000cc;
        --bounding-box-color: #ddddddcc;
        --background-color: white;
      }

      svg#map { width: 100%; height: 66vh; }
      .spinner { fill: none; stroke: var(--primary-color); }
      .outline { fill: none; stroke: var(--secondary-color); }
      .sphere { fill: var(--background-color); stroke: none; }
      .land { fill: var(--primary-color); stroke: none; }
      .graticule { fill: none; stroke: var(--secondary-color); }
      .hexes { fill: none; stroke: var(--tertiary-color); stroke-width: 0.35; }
      .areas { fill: var(--areas-color); stroke: var(--highlight-color); }
      .bbox { fill: none; stroke: var(--highlight-color); }

      div.info {
        color: var(--primary-color);
        border: 3px solid var(--primary-color); border-radius: 1.5rem;
        padding: 1rem 1.5rem;
      }

      code { font-size: 1.3rem; }
    `;
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
       */
      _aspectRatio: { type: Number, state: true },
    };
  }

  constructor() {
    super();

    // Public attributes/properties (observed)
    this.projection = "orthographic";    // will trigger its property setter
    this.areas = [];                     // will trigger its property setter

    // Internal state properties (observed)
    this._aspectRatio = null;             // width/height of SVG Element, computed after first paint

    // Internal private properties (derived, not observed)
    this._uniqueAreas = null;            // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = null;          // computed from `this._projection` (see `willUpdate()`)
  }

  set areas( val) {
    // Validates the areas, which should be an array of valid H3-indexes
    if( !Array.isArray( val))
      throw new TypeError( `Property 'areas' must contain an array of H3-indexes; got ${val}`);
    const anyInvalidArea = val.find( area => !h3IsValid( area));
    if( anyInvalidArea)
      throw new TypeError( `Property 'areas' must contain valid H3-indexes; '${anyInvalidArea}' is an invalid H3-index`)
    const oldAreas = this._areas;
    this._areas = val;
    this.requestUpdate("areas", oldAreas);
  }

  set projection(val) {
    // Validates the new projection identifier
    if( !AVAILABLE_PROJECTIONS.has( val))
      throw new RangeError( `Unsupported 'projection' property value: '${val}'`);
    const oldId = this._projection;
    this._projection = val;
    this.requestUpdate("projection", oldId);
  }

  get _SVGElement() {
    return this.renderRoot?.querySelector('svg#map') ?? null;
  }

  // Measure inner width and height of the Map SVG element
  // and update the aspect ratio internal state property,
  // which is observed by Lit and will re-render
  // @return the request ID (could be used to cancel the request)
  _measureSVGElement() {
    return requestAnimationFrame(() => {
      const clientRect = this._SVGElement.getBoundingClientRect();

      this._aspectRatio = clientRect.width / clientRect.height;
    });
  }

  willUpdate(changedProperties) {
    // Computes derived properties
    if (changedProperties.has('projection')) {
      this._projectionDef = AVAILABLE_PROJECTIONS.get( this._projection);
    }
    if (changedProperties.has('areas')) {
      this._uniqueAreas = removeDuplicates(this._areas);
    }
  }

  updated() {
    // After first paint, measure actual width and height
    // of the SVG Element and compute its aspect ratio
    if (this._aspectRatio === null) {
      this._measureSVGElement();
    }
  }

  render() {
    return [
      this.worldMapFrag(this._aspectRatio),
      this.infoBoxFrag(this._uniqueAreas, this._projectionDef)
    ];
  }

  infoBoxFrag(areas, projDef) {
    return html`
      <div class="info">
        ${this.areasFrag(areas)}<br>
        ${this.projectionFrag(projDef)}
        <slot></slot>
      </div>`;
  }

  areasFrag(areas) {
    return html`
      Areas (<em>H3-indexes</em>): [ <strong>${areas?.map(
        (area,i) =>
          html`${i > 0 ? ', ' : ''}<code>${area}</code>`)}</strong> ]`;
  }

  projectionFrag(projDef) {
    return html`
      <strong>${projDef?.name}</strong>
        projection (<code>${projDef?.id}</code>)`;
  }

  worldMapFrag(aspectRatio) {
    if( aspectRatio === null) {
      // As long as we don't know the size of the SVG element, we can't
      // draw the map — because we need to know its aspect ratio —;
      // so we start by rendering a loading spinner, to let the browser
      // compute and assign the size
      return svg`<svg id="map" viewBox="0 0 100 100">
        <defs>
          <circle id="spinner" cx="50" cy="50" r="48" class="spinner" />
          <clipPath id="clip"><use xlink:href="#spinner"/></clipPath>
        </defs>
        <g clip-path="#clip">
          <use xlink:href="#spinner" class="sphere" />
        </g>
        <use xlink:href="#spinner" class="outline" />
      </svg>`;
    } else {
      // Once the aspect ratio of the SVG element is known,
      // we can draw the map (aspect ratio is needed to define
      // the viewbox and have the D3 projections use all the
      // available space to the best, even when it's not squarish)
      const [ width, height ] = [ 100 * aspectRatio, 100 ];
      return svg`
        <svg id="map" viewBox="0 0 ${width} ${height}">
          <defs>
            <circle id="outline" cx="${width/2}" cy="${height/2}" r="${(height-2)/2}" />
            <clipPath id="clip"><use xlink:href="#outline"/></clipPath>
          </defs>
          <g clip-path="#clip">
            <use xlink:href="#outline" class="sphere" />
          </g>
          <use xlink:href="#outline" class="outline" />
        </svg>`;
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
  }
}

window.customElements.define('h3-worldmap', H3Worldmap);