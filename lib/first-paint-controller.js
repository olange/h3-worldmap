/**
 * Adds a new `firstPaint()` lifecycle method to its host,
 * which will be called before the first paint of the browser,
 * but after the firstUpdated() lifecycle method.
 *
 * Can be used to precisely measure the size of Shadow DOM
 * elements, not only after they were added to the DOM,
 * but after one browser layout cycle has completed.
 */
export class FirstPaintController {
  host;
  _requestId;
  _wasNotCalledYet;

  constructor(host) {
    this.host = host;
    host.addController(this); // register for lifecycle updates
  }

  _reset() {
    if(this._requestId) {
      window.cancelAnimationFrame(this._requestId);
    }
    this._requestId = null;
    this._wasNotCalledYet = true;
  }

  firstPaint() {
    this._requestId = null;
    this._wasNotCalledYet = false; // ensures callback gets called once
    this.host.firstPaint?.call(this.host);
  }

  hostUpdated() {
    // `hostFirstUpdated()` does not exist in Lit ReactiveController interface;
    // we are simulating it, to ensure `firstPaint` gets called exactly once
    // after the host is connected to the DOM
    if(this._wasNotCalledYet
      // We also guard against the rare case, where host would update twice or more
      // before next animation frame (could happen when page is opened in an unvisible tab)
       && this._requestId === null) {
      this._requestId = window.requestAnimationFrame(this.firstPaint.bind(this));
    }
  }

  hostConnected() {
    this._reset();
  }

  hostDisconnected() {
    this._reset();
  }
}