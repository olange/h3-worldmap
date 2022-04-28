import { css } from 'lit';

export const hostStyles = css`
  :host {
    height: 66vh;
    box-sizing: border-box;
    display: inline-block;
    --primary-color: black;
    --secondary-color: #dddddd;
    --tertiary-color: #cccccc;
    --highlight-color: #990000;
    --areas-color: #cc0000cc;
    --bounding-box-color: #ddddddcc;
    --background-color: white;
  }

  svg, div { box-sizing: inherit }
`;