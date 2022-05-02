/** @prettier */
/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';

import {AVAILABLE_PROJECTIONS} from './src/defs/projections.js';

/**
 * convert AVAILABLE_PROJECTIONS to an object like this:
 *  {
 *    conicEqualArea: 'Conic Equal-Area',
 *    orthographic: 'Orthographic',
 *    naturalEarth: 'Natural Earth',
 *    stereographic: 'Stereographic',
 *    gnomonic: 'Gnomonic',
 *    mercator: 'Mercator',
 *  }
 */
const projectionOptions = Object.fromEntries(
  [...AVAILABLE_PROJECTIONS.entries()].map(([projId, projProps]) => {
    return [projId, projProps.name];
  })
);

/**
 * Dropdown menu selector for the projection.
 * Inputs:
 *   - selectedProjection: the current projection
 * Outputs:
 *   - update-selected (custom event): dispatched when the user selects a new projection
 */
export class H3WorldmapProjectionSelect extends LitElement {
  static styles = css`
    :host {
      padding: 10px;
    }

    div.wrap {
      color: var(--primary-color);
      border: 3px solid var(--primary-color);
      border-radius: 1rem;
      padding: 1rem 1.5rem;
    }

    .select {
      color: var(--primary-color);
      font-size: 1.5rem;
    }
  `;

  static get properties() {
    return {
      label: {type: String},
      options: {type: Object},
      selected: {type: String},
    };
  }

  constructor() {
    super();
    this.label = 'Projection:';
    this.options = projectionOptions;
    this.selected = undefined;
  }

  firstUpdated() {
    this.setSelected('id-select', this.selected);
  }

  optionsView(options) {
    const keys = Object.keys(options);
    return html`
      ${keys.map(
        (key) => html`<option value="${key}">${options[key]}</option>`
      )}
    `;
  }

  setSelected(id, value) {
    let element = this.shadowRoot.getElementById(id);
    element.value = value;
  }

  _updateSelected(e) {
    this.dispatchEvent(
      new CustomEvent('update-selected', {detail: {value: e.target.value}})
    );
  }

  render() {
    return html`
      <div class="wrap">
        <label> ${this.label} </label>
        <select class="select" id="id-select" @change="${this._updateSelected}">
          ${this.optionsView(this.options)}
        </select>
      </div>
    `;
  }
}

customElements.define(
  'h3-worldmap-projection-select',
  H3WorldmapProjectionSelect
);
