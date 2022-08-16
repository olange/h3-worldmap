import { initialState, Task } from '@lit-labs/task';
import * as topojson from 'topojson-client';

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isDefined(value) {
  return (typeof value !== 'undefined') && (value !== null);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

/**
 * A reactive controller responsible for fetching the geometry
 * of the world map from a TopoJSON file and extracting a collection
 * from it.
 *
 * The TopoJSON file is referred to by the `src` property setter,
 * which designates its URL. And the collection is defined by the
 *  `coll` property setter, which designates its name.
 *
 * The output of the controller is a collection of features,
 * which can be read from its `geom` property.
 */
export class LandGeometryController {
  _host;
  _fetchingTask;

  /**
   * Input property `src`: the URL of the TopoJSON file.
   * @type {String}
   */
  _src;

  /**
   * Input property `coll`: the name of the feature collection
   * to extract from the TopoJSON file.
   * @type {String}
   */
  _coll;

  /**
   * Output of the controller: the world geometry.
   * @type {topojson.feature}
   */
  _geom;

  constructor(host) {
    this._host = host;
    this._src = null;
    this._coll = null;
    this._geom = null;
    this._fetchingTask = new Task(
      host,
      {
        // Task function, asynchronously run whenever its host element updates
        task: async ([ src, coll ]) => {
          console.log(`World Geometry Fetching Task running (src: ${src}, coll: ${coll})`);
          const bothDefined = isDefined(src) && isDefined(coll);
          if (!bothDefined) {
            return initialState;
          }

          // DEBUG: Simulate slow fetching, to show the spinner
          // await delay(500);

          const response = await fetch(src);
          const world = await response.json(); // TopoJSON structure
          const error = world.error;
          if (error !== undefined) {
            throw new Error(error);
          }
          if (!Object.hasOwn(world.objects, coll)) {
            throw new RangeError(`World geometry has no collection '${coll}'`);
          }
          // Extract the requested feature collection from the fetched geometry and
          // register it in the controller (its the primary output of the controller)
          this._geom = topojson.feature(world, coll);
          console.log(`World Geometry Fetching Task completed`, this._geom);

          // Value ultimately returned to the `complete` rendering function
          return this._geom.features?.length;
        },
        // Task function arguments getter: value returned will be passed to the task function;
        // task function will also re-run, if the returned values change.
        args: () => [ this.src, this.coll ]
      }
    );
  }

  isReadyToUpdate() {
    return isDefined( this._src)
        && isDefined( this._coll);
  }

  /**
   * Requests the host to update, when `src` and `coll` have both
   * been defined. Called whenever either `src` or `coll` are set.
   *
   * This will in turn start the task of fetching the world geometry
   * (as defined in the constructor); the task is itself a controller,
   * which runs when its host updates.
   */
  updateWhenReady() {
    if( this.isReadyToUpdate()) {
      this._host.requestUpdate();
    }
  }

  /**
   * Input property `src`
   * @param {string} value – the URL of the TopoJSON file.
   */
  set src(value) {
    const isStringOrNotDefined = isString(value) || !isDefined(value);
    if (!isStringOrNotDefined) {
      throw new Error( `'src' attribute should be a string, null or undefined; got '${value}'`); }
    this._src = value?.trim();
    this.updateWhenReady();
  }

  get src() {
    return this._src;
  }

  /**
   * Input property `coll`
   * @param {string} value – the name of the collection to extract
   *   from the TopoJSON file.
   */
   set coll(value) {
    const isStringOrNotDefined = isString(value) || !isDefined(value);
    if (!isStringOrNotDefined) {
      throw new Error( `'coll' attribute should be a string, null or undefined; got '${value}'`); }
    this._coll = value?.trim();
    this.updateWhenReady();
  }

  get coll() {
    return this._coll;
  }

  /**
   * Output of the controller: the world geometry object extracted
   * from the fetched TopoJSON file. `null` until the task completes.
   */
  get geom() {
    return this._geom;
  }

  /**
   * Output of the controller: a representation of fetching status.
   * This function can be called by the host when rendering, passing it
   * a set of render functions, which will be called in turn, when
   * status of the task updates (INITIAL, PENDING, COMPLETE, ERROR).
   */
  render(renderFunctions) {
    return this._fetchingTask.render(renderFunctions);
  }
}