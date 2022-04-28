import { html, css } from 'lit';

export const infoStyles = css`
  div.info {
    color: var(--primary-color);
    border: 3px solid var(--primary-color); border-radius: 1.5rem;
    padding: 1rem 1.5rem;
  }
  div.info code {
    font-size: 1.3rem;
  }`;

function areasView(areas) {
  return html`Areas (<em>H3-indexes</em>): [ <strong>${areas?.map(
    (area,i) =>
      html`${i > 0 ? ', ' : ''}<code>${area}</code>`)}</strong> ]`;
}

function projDefView(projDef) {
  return html`<strong>${projDef?.name}</strong>
    projection (<code>${projDef?.id}</code>)`;
}

export function infoBoxView(areas, projDef) {
  return html`<div class="info">
      ${areasView(areas)}<br>
      ${projDefView(projDef)}
      <slot></slot>
    </div>`;
}
