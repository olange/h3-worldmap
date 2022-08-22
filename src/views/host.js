import { css } from 'lit';

export const hostStyles = css`
  :host {
    box-sizing: border-box;
    display: inline-block;
    overflow: hidden;
    --primary-color: black;
    --secondary-color: #dddddd;
    --tertiary-color: #cccccc;
    --highlight-color: #990000;
    --areas-color: #cc0000cc;
    --bounding-box-color: #ddddddcc;
    --background-color: white;
  }

  svg, div {
    box-sizing: inherit;
    width: 100%;
    height: 100%; }
`;