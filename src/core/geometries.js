import * as d3 from 'd3';
import { isPentagon, cellToBoundary, cellToChildren, getRes0Cells } from 'h3-js';

export function outlineGeom() {
  return { type: "Sphere" };
}

export function areasGeom(areas) {
  return {
    type: "FeatureCollection",
    features: areas.map((area) => ({
      type: "Feature",
      properties: { id: area, pentagon: isPentagon(area) },
      geometry: {
        type: "Polygon",
        coordinates: [ cellToBoundary(area, true).reverse() ]
      }
    }))
  };
}

export function centroid(areasGeom) {
  return d3.geoCentroid(areasGeom);
}

function bbox(areasGeom) {
  const [[minLon, minLat], [maxLon, maxLat]] = d3.geoBounds(areasGeom);
  return { minLat, minLon, maxLat, maxLon };
}

export function bsphereGeom(areasGeom) {
  const { minLat, minLon, maxLat, maxLon } = bbox(areasGeom);
  const radius =
    Math.max(Math.abs(maxLat - minLat), Math.abs(maxLon - minLon)) / 1.9;
  const geoCentroid = centroid( areasGeom);
  const geoCircle = d3.geoCircle().center(geoCentroid).radius(radius);
  return geoCircle();
}

export function hexesGeom() {
  return {
    type: "FeatureCollection",
    features: getRes0Cells()
      //.map( i => cellToChildren( i, level))
      //.flat()
      .map( d => ({
        type: "Feature",
        properties: { id: d, pentagon: isPentagon(d) },
        geometry: {
          type: "Polygon",
          coordinates: [ cellToBoundary(d, true).reverse() ]
        }
      }))
  };
}