import { svg, css } from 'lit';

// Our SVG canvas element will use all available space, but no more
// (actual size constraints should be set on host)

export const mapStyles = css`
  svg#map { width: 100%; height: 100%; }
  .outline { fill: none; stroke: var(--secondary-color); stroke-width: 0.25%; }
  .sphere { fill: var(--background-color); stroke: none; }
  .land { fill: none; stroke: var(--primary-color); stroke-width: 0.15%; }
  .graticule { fill: none; stroke: var(--secondary-color); }
  .hexes { fill: none; stroke: var(--tertiary-color); stroke-width: 0.10%; }
  .areas { fill: var(--areas-color); stroke: var(--highlight-color); stroke-width: 0.25%; }
  .bbox { fill: none; stroke: var(--highlight-color); stroke-width: 0.25%; }`;

export function mapView(viewBoxSize, pathFn, geometries) {
  // Important: id="map" must match the id used in `_SVGElement()` getter
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
