import * as d3 from 'd3';
import { h3IsPentagon, h3ToGeoBoundary, getRes0Indexes } from 'h3-js';

export function outlineGeom() {
  return { type: "Sphere" };
}

export function areasGeom(areas) {
  return {
    type: "FeatureCollection",
    features: areas.map((area) => ({
      type: "Feature",
      properties: { id: area, pentagon: h3IsPentagon(area) },
      geometry: {
        type: "Polygon",
        coordinates: [h3ToGeoBoundary(area, true).reverse()]
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