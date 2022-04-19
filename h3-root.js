/** @prettier */
/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, svg, css} from 'lit';
import {H3Worldmap} from './h3-worldmap';
import {DropdownMenu} from './dropdown-menu';

// 1 support for the creation and registration of listeners for <dropdown-menu> events

/**
 * AppRoot renders a dropdown menu.
 * The dropdownMenuProjections is configured here.
 * TODO: derive the options from AVAILABLE_PROJECTIONS,
 * which should be moved into a separate file.
 */
const dropdownMenuProjections = {
  title: 'Projection:',
  options: {
    conicEqualArea: 'Conic Equal-Area',
    orthographic: 'Orthographic',
    naturalEarth: 'Natural Earth',
    stereographic: 'Stereographic',
    gnomonic: 'Gnomonic',
    mercator: 'Mercator',
  },
  eventid: 'menu-event',
};

// const AVAILABLE_PROJECTIONS = new Map([
//   [ "conicEqualArea", { id: "conicEqualArea", name: "Conic equal-area", ctorFn: d3.geoConicEqualArea } ],
//   [ "orthographic",   { id: "orthographic", name: "Orthographic", ctorFn: d3.geoOrthographic } ],
//   [ "naturalEarth",   { id: "naturalEarth", name: "Natural Earth", ctorFn: d3.geoNaturalEarth1 } ],
//   [ "stereographic",  { id: "stereographic", name: "Stereographic", ctorFn: d3.geoStereographic } ],
//   [ "gnomonic",       { id: "gnomonic", name: "Gnomonic", ctorFn: d3.geoGnomonic } ],
//   [ "mercator",       { id: "mercator", name: "Mercator", ctorFn: d3.geoMercator } ],
//   // TODO: complete list from https://observablehq.com/@d3/projection-comparison
// ]);

// 2 the application root component

export class H3Root extends LitElement {
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

    this._selectedProjection = 'mercator';
  }

  static get properties() {
    return {
      _selectedProjection: {type: String, state: true},
    };
  }

  listener = (e) => {
    console.log('listener', e);
    if (e.type === dropdownMenuProjections.eventid) {
      this._selectedProjection = e.detail;
      console.log(
        'listener this._selectedProjection:',
        this._selectedProjection
      );
    }
  };

  areas = [
    '80abfffffffffff',
    '80e1fffffffffff',
    '80a5fffffffffff',
    '8035fffffffffff',
    '801ffffffffffff',
  ];

  render() {
    console.log('render this._selectedProjection:', this._selectedProjection);
    return html` <div class="debug">
      <h3-worldmap
        projection="${this._selectedProjection}"
        .areas="${this.areas}"
        geometry-src="land-50m.json"
        geometry-coll="land"
      >
      </h3-worldmap>
      </p>
      <dropdown-menu
        .eventid="${dropdownMenuProjections.eventid}"
        .label="${dropdownMenuProjections.title}"
        .options=${dropdownMenuProjections.options}
        selected="${this._selectedProjection}"
      ></dropdown-menu>
    </div>`;
  }
}

customElements.define('h3-root', H3Root);
