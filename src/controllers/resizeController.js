import { Directive, directive, PartType } from 'lit/directive.js';
import { noChange } from 'lit';

class ResizeDirective extends Directive {
  _observedElement;

  constructor(partInfo) {
    console.log('ResizeDirective created', partInfo);
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('The `resizeDirective` directive must be used on an Element or SVGElement');
    }
  }

  update(partInfo, [ resizeController ]) {
    console.log('ResizeDirective › update()');
    const observedElement = partInfo.element;
    if (this._observedElement !== observedElement) {
      if( typeof this._observedElement !== "undefined") {
        console.log('ResizeDirective › update() › Unobserving', this._observedElement);
        resizeController._resizeObserver.unobserve(this._observedElement);
      }
      console.log('ResizeDirective › update() › Now observing', observedElement);
      this._observedElement = observedElement;
      resizeController._resizeObserver.observe(observedElement);
    }
    return noChange;
  }
}

const resizeDirective = directive(ResizeDirective);

export class ResizeController {
  _resizeObserver;
  _host;

  target; // a reference to the `Element` or `SVGElement` being observed
  contentRect; // a `DOMRectReadOnly` object containing the new size of the observed element

  constructor(host) {
    (this._host = host).addController(this); // register for lifecycle updates

    this._resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        this._resize(entry.target, entry.contentRect);
      }
    });
  }

  _resize(target, contentRect) {
    this.target = target;
    this.contentRect = contentRect;
    this._host.resize(target, contentRect);
  }

  observe() {
    // Pass a reference to the controller so the directive can
    // notify the controller on size changes.
    const resizeController = this;
    return resizeDirective(resizeController);
  }
}
