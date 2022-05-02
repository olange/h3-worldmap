/** @prettier */
/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';
import {H3Worldmap} from '../../h3-worldmap';
import {H3WorldmapProjectionSelect} from '../h3-worldmap-projection-select';
import {AVAILABLE_PROJECTIONS} from '../src/defs/projections.js';
import {PROPS_DEFAULTS} from '../src/defs/defaults.js';
/**
 * The root class of the demo application.
 */
export class H3WorldmapDemo extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
        font-size: 1.5rem;
      }

      div.debug {
        border-style: none; // dashed
        border-color: red;
      }
    `;
  }

  constructor() {
    super();
    this._selectedProjection = PROPS_DEFAULTS.PROJECTION;
  }

  static get properties() {
    return {
      _selectedProjection: {type: String, state: true},
    };
  }

  selectedChanged = (e) => {
    this._selectedProjection = e.detail.value;
  };

  areas = [
    // '80abfffffffffff',
    '80e1fffffffffff',
    '80a5fffffffffff',
    '8035fffffffffff',
    '801ffffffffffff',
  ];

  render() {
    return html` <div class="debug">
       <h3-worldmap
         projection="${this._selectedProjection}"
         .areas="${this.areas}"
         geometry-src="land-50m.json"
         geometry-coll="land"
       >
       </h3-worldmap>
       </p>
       <h3-worldmap-projection-select       
         .selected="${this._selectedProjection}"
         @update-selected="${this.selectedChanged}"
       ></h3-worldmap-projection-select>
     </div>`;
  }
}

customElements.define('h3-worldmap-demo', H3WorldmapDemo);
