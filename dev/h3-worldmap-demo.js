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

/**
 * import AVAILABLE_PROJECTIONS and convert it to an object like this:
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
  [...AVAILABLE_PROJECTIONS.entries()].map((entry) => {
    return [entry[0], entry[1].name];
  })
);

/**
 * configure the dropdown menu
 */
const dropdownMenuProjections = {
  title: 'Projection:',
  options: projectionOptions,
  eventid: 'menu-event',
};

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
    window.addEventListener(dropdownMenuProjections.eventid, this.listener);
    this._selectedProjection = 'conicEqualArea';
  }

  static get properties() {
    return {
      _selectedProjection: {type: String, state: true},
    };
  }

  listener = (e) => {
    if (e.type === dropdownMenuProjections.eventid) {
      this._selectedProjection = e.detail;
    }
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
         .eventid="${dropdownMenuProjections.eventid}"
         .label="${dropdownMenuProjections.title}"
         .options=${dropdownMenuProjections.options}
         .selected="${this._selectedProjection}"
       ></h3-worldmap-projection-select>
     </div>`;
  }
}

customElements.define('h3-worldmap-demo', H3WorldmapDemo);
