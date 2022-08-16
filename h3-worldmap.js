/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { LitElement } from 'lit';
import * as d3 from 'd3';
import { h3IsValid } from 'h3-js';

import { FirstLayoutController } from './src/controllers/firstLayoutController.js';
import { LandGeometryController } from './src/controllers/landGeometryController.js';

import { hostStyles } from './src/views/host.js';
import { mapView, mapStyles } from './src/views/map.js';
import { spinnerView, spinnerStyles } from './src/views/spinner.js';
import { infoBoxView, infoStyles } from './src/views/infobox.js';

import { AVAILABLE_PROJECTIONS } from './src/defs/projections.js';
import { PROPS_DEFAULTS } from './src/defs/defaults.js';
import * as geometries from './src/core/geometries.js';

// Utility functions

function removeDuplicates( arr) {
  return [...new Set(arr)];
}

/**
 * ‹h3-worldmap› custom element.
 *
 * About the update/layout/paint flow:
 *
 *  1. As long as we don't know the size of the SVG element, we can't
 *     draw the map, because we need to configure the D3-geo projection
 *     with the aspect ratio of the available space. We can only read
 *     this size/aspect ratio, once the browser has computed the layout.
 *  2. Therefore we start by rendering a loading spinner, to let the
 *     browser compute layout and assign the size of the SVG element.
 *  3. Once the aspect ratio of the SVG element is known, we can configure
 *     the D3-geo projection, accordingly reset the view box system of
 *     the SVG element (to the coordinates that the D3-geo projection
 *     will produce) and start to draw the map on it.
 *  4. All of obviously this happens on two successive frames (with
 *     a repaint in between them), which is why we need to render a
 *     loading spinner first.
 *
 *  I intend to later use a Resize Observer, which would enable us to
 *  measure the size of the SVG element *after layout* and *before paint*,
 *  which is the exact moment where we should configure the D3-geo projection.
 *  I need to figure out if the Resize Observer gets notified of the
 *  initial size of the SVG element, that is, even without any resizing.
 *
 * @fires (nothing) - Indicates (nothing)
 * @slot - This element has a slot in the «info box»
 *     (which will eventually be removed)
 * @csspart (none) - No CSS parts available
 */
export class H3Worldmap extends LitElement {

  // Adds a `firstLayout()` lifecycle method, called once after the
  // shadow DOM was built and a browser layout cycle completed
  /* eslint-disable-next-line no-unused-vars */
  firstLayoutController = new FirstLayoutController(this);

  // Reactive controller responsible for fetching and parsing
  // the world geometry from a TopoJSON file (which it will
  // expose on its `geom` property)
  landGeometryController = new LandGeometryController(this);

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
      landGeometrySrc: { type: String, attribute: "land-geometry-src" },

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
       * @see https://github.com/topojson/world-atlas#countries-50m.json
       */
      landGeometryColl: { type: String, attribute: "land-geometry-coll" },

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
      _svgClientRect: { type: Object, state: true }
    };
  }

  constructor() {
    super();

    // Public attributes/properties (observed by Lit)
    this.projection = PROPS_DEFAULTS.PROJECTION; // will trigger its property setter
    this.areas = []; // will trigger its property setter
    this.landGeometrySrc = PROPS_DEFAULTS.LAND_GEOMETRY_SRC;
    this.landGeometryColl = PROPS_DEFAULTS.LAND_GEOMETRY_COLL;

    // Internal state properties (observed by Lit)
    this._svgClientRect = null; // computed after first paint

    // Internal private properties (computed, not observed)
    this._uniqueAreas = null;   // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = null; // computed from `this._projection` (see `willUpdate()`)
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

  set landGeometrySrc(value) {
    // This will trigger the `src` setter in the WorldGeometryController,
    // which will in turn request an update on the element, when both
    // `src` and `coll` are defined
    this.landGeometryController.src = value;
  }

  set landGeometryColl(value) {
    // This will trigger the `coll` setter in the WorldGeometryController,
    // which will in turn request an update on the element, when both
    // `src` and `coll` are defined
    this.landGeometryController.coll = value;
  }

  get landGeometrySrc() {
    return this.landGeometryController.src;
  }

  get landGeometryColl() {
    return this.landGeometryController.coll;
  }

  _viewBoxSize() {
    // Returns width and height of the SVG viewbox space, which is used to
    // configure the D3-geo projection to produce coordinates in this space
    return (this._svgClientRect === null) ? null
      : [ 1000 * this._svgClientRect.width / this._svgClientRect.height, 1000 ];
  }

  _geometries() {
    const areasGeom = geometries.areasGeom(this._areas);
    return {
      outline: geometries.outlineGeom(),
      graticule: null,
      hexes: geometries.hexesGeom(),
      world: this.landGeometryController.geom,
      bsphere: geometries.bsphereGeom(areasGeom),
      areas: areasGeom
    }
  }

  _buildProjFn(projDef) {
    const projFn = projDef.ctorFn(), // create an instance of the projection function from its builder
        centroid = geometries.centroid();
    return projFn.fitSize( this._viewBoxSize(), geometries.outlineGeom())
                 .rotate( centroid[ 1], centroid[ 0]);
  }

  _geoPathFn() {
    const projFn = this._buildProjFn(this._projectionDef);
    return d3.geoPath( projFn);
  }

  _SVGElement() {
    return this.renderRoot?.querySelector('svg#map') ?? null;
  }

  _hasMeasuredSVGSize() {
    return this._svgClientRect !== null;
  }

  _hasLoadedLandGeom() {
    return this.landGeometryController.geom !== null;
  }

  _isLoading() {
    // NOTE: We could actually already render the map, without waiting
    // for the land geometry; it can be rendered later, when it is loaded.
    return !( this._hasMeasuredSVGSize()
           && this._hasLoadedLandGeom()); // this could be ignored
  }

  _measureSVGElement() {
    // Setting `_svgClientRect` state property will trigger a new
    // update/render cycle, which will display the world map and
    // replace the spinner
    this._svgClientRect = this._SVGElement().getBoundingClientRect();
  }

  firstLayout() {
    // At this time, the browser completed its layout and
    // the size of our SVG canvas can be precisely measured
    this._measureSVGElement();
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('projection')) {
      /* Add `id` to the this._projectionDef property.
         Note that `id` is used only in the infoBox to identify the projection.
         If the infoBox is removed or simplifieed, `id` becomes useless,
         and the line below can be simplified to:
          this._projectionDef = AVAILABLE_PROJECTIONS.get( this._projection);
      */
      this._projectionDef = {id: this._projection, ...AVAILABLE_PROJECTIONS.get( this._projection)};
    }
    if (changedProperties.has('areas')) {
      this._uniqueAreas = removeDuplicates(this._areas);
    }
  }

  render() {
    return [
      this._isLoading()
        ? spinnerView(
            this.landGeometryController.render({
              initial: () => { console.log('task starting…'); return 'Starting…'; },
              pending: () => { console.log('task pending…'); return 'Fetching land…'; },
              complete: (value) => { console.log(`task completed with ${value} feature objects`); return `Ready.`; },
              error: (e) => { console.error('task in error', e); return `Error ${e}`; }
          }))
        : mapView(this._viewBoxSize(), this._geoPathFn(), this._geometries()),
      infoBoxView(this._uniqueAreas, this._projectionDef)
    ];
  }
}

window.customElements.define('h3-worldmap', H3Worldmap);