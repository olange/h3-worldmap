/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { LitElement } from 'lit';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { h3IsValid } from 'h3-js';

import { FirstPaintController } from './lib/first-paint-controller.js';

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
 *  1. As long as we don't know the size of the SVG element,
 *     we can't draw the map, because we need to know its
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
 * @slot - This element has a slot in the «info box»
 *     (which will eventually be removed)
 * @csspart (none) - No CSS parts available
 */
export class H3Worldmap extends LitElement {

  // Adds a `firstPaint()` lifecycle method, called once after the
  // shadow DOM was built and a browser layout cycle completed
  /* eslint-disable-next-line no-unused-vars */
  #firstPaintController = new FirstPaintController(this);

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
       * @see https://github.com/topojson/world-atlas#countries-50m.json
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
    this.projection = PROPS_DEFAULTS.PROJECTION; // will trigger its property setter
    this.areas = []; // will trigger its property setter
    this.worldGeometrySrc = PROPS_DEFAULTS.WORLD_GEOMETRY_SRC;
    this.worldGeometryColl = PROPS_DEFAULTS.WORLD_GEOMETRY_COLL;

    // Internal state properties (observed by Lit)
    this._svgClientRect = null; // computed after first paint
    this._worldGeom = undefined; // defined once the TOPOJson world geometry has loaded

    // Internal private properties (computed, not observed)
    this._uniqueAreas = null;   // computed from `this._areas` (see `willUpdate()`)
    this._projectionDef = null; // computed from `this._projection` (see `willUpdate()`)
  }

  async _fetchWorldGeometry() {
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
      world: this._worldGeom,
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

  _hasLoadedWorldGeom() {
    return this._worldGeom !== null;
  }

  _isLoading() {
    return !( this._hasMeasuredSVGSize()
           && this._hasLoadedWorldGeom());
  }

  _measureSVGElement() {
    // Setting `_svgClientRect` state property will trigger a new
    // update/render cycle, which will display the world map and
    // replace the spinner
    this._svgClientRect = this._SVGElement().getBoundingClientRect();
  }

  firstPaint() {
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

  firstUpdated() {
    // TODO: we should not ignore the promise returned (see #19)
    // TODO: world geometry should be reloaded when
    // worldGeometrySrc|Coll properties change (see #19)
    this._fetchWorldGeometry();
  }

  render() {
    return [
      this._isLoading() ? spinnerView() : mapView(this._viewBoxSize(), this._geoPathFn(), this._geometries()),
      infoBoxView(this._uniqueAreas, this._projectionDef)
    ];
  }
}

window.customElements.define('h3-worldmap', H3Worldmap);