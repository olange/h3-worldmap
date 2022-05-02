/** @prettier */
/**
 * @license
 * Copyright 2022 Olivier Lange & Rudi Farkas
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';

// 1 support for event dispatching

/**
 * Returns a custom event ready for dispatch.
 * @param {*} eventid
 * @param {*} value
 * @returns {Event}
 */
const customEvent = (eventid, value) => {
  const event = new CustomEvent(eventid, {
    detail: value,
    bubbles: true,
    composed: true,
  });
  return event;
};

// 2 the compenent class

/**
 * A dropdown menu component
 *   Displays a dropdown list of options
 *   On user selection, dispatches a custom event with the selected value
 * Inputs:
 * - eventid: string, the event id to dispatch when the menu is clicked
 * - label: string, the label to display in the menu
 * - options: object, e.g { t: 'Triangle', s: 'Square', p: 'Pentagon', c: 'Circle' }
 * Outputs:
 * - eventid, selected-option
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

  static properties = {
    eventid: {type: String},
    label: {type: String},
    options: {type: Object},
    selected: {type: String},
  };

  constructor() {
    super();
    this.eventid = 'dropdown-menu-event';
    this.label = 'Choose a branch:';
    this.options = {
      a: 'Art',
      b: 'Biology',
      c: 'Chemistry',
      d: 'Drama',
      e: 'English',
    };

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

  updateSelected(e) {
    this.selected = e.target.value;
    const event = customEvent(this.eventid, this.selected);
    this.dispatchEvent(event);
  }

  render() {
    return html`
      <div class="wrap">
        <label> ${this.label} </label>
        <select class="select" id="id-select" @change="${this.updateSelected}">
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