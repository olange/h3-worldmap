import * as d3 from 'd3';

/**
 * Projection definition object. Holds a human representation of
 * the name of a D3-geo projection, along with its _builder function_
 * from D3-geo.
 *
 * Note: a projection _builder function_ is a pattern from D3-geo,
 * which declares projections as functions, that can be instantiated
 * and later configured for a particular view (scale, center, rotate).
 * The function object indeed holds various instance properties.
 *
 * The pattern isn't explicitely named as such within the docs of
 * D3-geo, it is a convention of ours.
 */
class ProjDef {
  constructor(name, ctorFn) {
    if( typeof ctorFn !== "function") {
      throw new TypeError( `Expected a projection function from D3-geo, got ${ctorFn}`)
    }
    this.name = name;
    this.ctorFn = ctorFn;
  }

  toString() {
    return `ProjDef { name: ${this.name}, builderFn: ${this.builderFn} }`;
  }
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
 export const AVAILABLE_PROJECTIONS = new Map([
  [ "conicEqualArea", new ProjDef( "Conic equal-area", d3.geoConicEqualArea) ],
  [ "orthographic",   new ProjDef( "Orthographic", d3.geoOrthographic) ],
  [ "naturalEarth",   new ProjDef( "Natural Earth", d3.geoNaturalEarth1) ],
  [ "stereographic",  new ProjDef( "Stereographic", d3.geoStereographic) ],
  [ "gnomonic",       new ProjDef( "Gnomonic", d3.geoGnomonic) ],
  [ "mercator",       new ProjDef( "Mercator", d3.geoMercator) ],
  // TODO: complete list from https://observablehq.com/@d3/projection-comparison
]);
