import * as d3 from 'd3';

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
  [ "conicEqualArea", { name: "Conic equal-area", ctorFn: d3.geoConicEqualArea } ],
  [ "orthographic",   { name: "Orthographic", ctorFn: d3.geoOrthographic } ],
  [ "naturalEarth",   { name: "Natural Earth", ctorFn: d3.geoNaturalEarth1 } ],
  [ "stereographic",  { name: "Stereographic", ctorFn: d3.geoStereographic } ],
  [ "gnomonic",       { name: "Gnomonic", ctorFn: d3.geoGnomonic } ],
  [ "mercator",       { name: "Mercator", ctorFn: d3.geoMercator } ],
  // TODO: complete list from https://observablehq.com/@d3/projection-comparison
]);
