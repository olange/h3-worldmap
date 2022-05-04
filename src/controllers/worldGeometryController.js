import { initialState, Task } from '@lit-labs/task';
import * as topojson from 'topojson-client';

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isDefined(value) {
  return (typeof value !== 'undefined') && (value !== null);
}

export class WorldGeometryController {
  host;
  task;

  constructor(host) {
    this.host = host;
    this._src = null;
    this._coll = null;
    this.task = new Task(
      host,
      async ([ src, coll ]) => {
        const bothDefined = isDefined(src) && isDefined(coll);
        console.log(`Task running (src:${src}, coll:${coll}, bothDefined: ${bothDefined})`);
        if (!bothDefined) {
          return initialState;
        }
        const response = await fetch(src);
        const world = await response.json(); // TopoJSON structure
        const error = world.error;
        if (error !== undefined) {
          throw new Error(error);
        }
        if (!Object.hasOwn(world.objects, coll)) {
          throw new RangeError(`World geometry has no collection '${coll}'`);
        }
        return topojson.feature(world, coll);
      },
      () => [ this.src, this.coll ]
    );
  }

  isReadyToUpdate() {
    // Ready to update host once `src` and `coll` are both defined
    return isDefined( this._src)
        && isDefined( this._coll);
  }

  updateWhenReady() {
    if( this.isReadyToUpdate()) {
      // this.host.requestUpdate();
    }
  }

  set src(value) {
    const isStringOrNotDefined = isString(value) || !isDefined(value);
    if (!isStringOrNotDefined) {
      throw new Error( `'src' attribute should be a string, null or undefined; got '${value}'`); }
    this._src = value?.trim();
    this.updateWhenReady();
  }

  set coll(value) {
    const isStringOrNotDefined = isString(value) || !isDefined(value);
    if (!isStringOrNotDefined) {
      throw new Error( `'coll' attribute should be a string, null or undefined; got '${value}'`); }
    this._coll = value?.trim();
    this.updateWhenReady();
  }

  get src() {
    return this._src;
  }

  get coll() {
    return this._coll;
  }

  render(renderFunctions) {
    return this.task.render(renderFunctions);
  }
}