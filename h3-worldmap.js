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

// Map of projection identifiers, which are the possible values of the 'projection'
// attribute of our custom element, with their corresponding friendly name and
// D3 projection constructor function.
// TODO: complete list from https://observablehq.com/@d3/projection-comparison
// TODO: move to separate module
const AVAILABLE_PROJECTIONS = new Map([
  [ "conicEqualArea", { id: "conicEqualArea", name: "Conic equal-area", ctorFn: d3.geoConicEqualArea } ],
  [ "orthographic",   { id: "orthographic", name: "Orthographic", ctorFn: d3.geoOrthographic } ],
  [ "naturalEarth",   { id: "naturalEarth", name: "Natural Earth", ctorFn: d3.geoNaturalEarth1 } ],
  [ "stereographic",  { id: "stereographic", name: "Stereographic", ctorFn: d3.geoStereographic } ],
  [ "gnomonic",       { id: "gnomonic", name: "Gnomonic", ctorFn: d3.geoGnomonic } ],
  [ "mercator",       { id: "mercator", name: "Mercator", ctorFn: d3.geoMercator } ],
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

      .sphere { fill: var(--background-color); stroke: none; }
      .outline { fill: none; stroke: var(--secondary-color); }
      .land { fill: var(--primary-color); stroke: none; }
      .graticule { fill: none; stroke: var(--secondary-color); }
      .hexes { fill: none; stroke: var(--tertiary-color); stroke-width: 0.35; }
      .areas { fill: var(--areas-color); stroke: var(--highlight-color); }
      .bbox { fill: none; stroke: var(--highlight-color); }

      .info {
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
       * Geodesic projection identifier (a string matching one of the D3-geo
       * projections that we support — see AVAILABLE_PROJECTIONS map)
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
    };
  }

  constructor() {
    super();

    // Default value of public attributes/properties
    this.projection = "orthographic";    // will trigger its property setter
    this.areas = [];                     // will trigger its property setter

    // Internal private properties
    this._width = 960;                   // TODO: compute width from <svg> element bbox
    this._height = 480;                  // TODO: compute height from <svg> element bbox

    this._uniqueAreas = undefined;        // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = undefined;      // computed from `this._projection` (see `willUpdate()`)
  }

  set areas( arr) {
    // Validates that the new value is an array, of valid H3-indexes
    if( !Array.isArray( arr))
      throw new TypeError( `Property 'areas' must contain an array of H3-indexes; got ${arr}`);
    const anyInvalidArea = arr.find( area => !h3IsValid( area));
    if( anyInvalidArea)
      throw new TypeError( `Property 'areas' must contain valid H3-indexes; '${anyInvalidArea}' is an invalid H3-index`)
    const oldAreas = this._areas;
    this._areas = arr;
    this.requestUpdate("areas", oldAreas);
  }

  set projection(id) {
    // Validates that the new value is one of the supported projection identifiers
    if( !AVAILABLE_PROJECTIONS.has( id))
      throw new RangeError( `Unsupported 'projection' property value: '${id}'`);
    const oldId = this._projection;
    this._projection = id;
    this.requestUpdate("projection", oldId);
  }

  willUpdate(changedProperties) {
    // Compute derived properties
    if (changedProperties.has('projection')) {
      this._projectionDef = AVAILABLE_PROJECTIONS.get( this._projection);
    }
    if (changedProperties.has('areas')) {
      this._uniqueAreas = removeDuplicates(this._areas);
    }
  }

  render() {
    return [
      this.worldMap(this._width,this._height),
      this.infoBox(this._uniqueAreas, this._projectionDef)
    ];
  }

  infoBox(areas, projDef) {
    return html`
      <div class="info">
        ${this.areasRepr(areas)}<br>
        ${this.projectionRepr(projDef)}
        <slot></slot>
      </div>`;
  }

  projectionRepr(projDef) {
    return html`
      <strong>${projDef?.name}</strong> projection (<code>${projDef?.id}</code>)`;
  }

  areasRepr(areas) {
    return html`
      Areas (<em>H3-indexes</em>): [ <strong>${areas?.map(
        (area,i) => html`${i > 0 ? ', ' : ''}<code>${area}</code>`)}</strong> ]`;
  }

  worldMap(width,height) {
    return svg`
      <svg class="map" viewBox="0 0 ${width} ${height}">
        <circle cx="50" cy="50" r="40" class="outline" />
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

window.customElements.define('h3-worldmap', H3Worldmap);