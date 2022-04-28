import { svg, css } from 'lit';

export function spinnerView() {
  // Important: id="map" must match the id used in `_SVGElement()` getter
  return svg`<svg id="map" viewBox="0 0 50 50" class="spinner">
      <circle class="path" cx="25" cy="25" r="20" />
    </svg>
  `;
}

export const spinnerStyles = css`
  .spinner {
    animation: rotate 2s linear infinite;
  }

  .spinner circle {
    animation: dash 1.5s ease-in-out infinite;
    stroke: var(--primary-color);
    stroke-linecap: round;
    stroke-width: 2;
    fill: var(--background-color);
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
  }
`;
