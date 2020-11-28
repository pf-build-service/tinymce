import { Throttler } from '@ephox/katamari';
import { Bindable, Event, Events } from '@ephox/porkbun';
import { EventArgs, SugarElement } from '@ephox/sugar';
import { DragApi, DragMode, DragMutation } from '../api/DragApis';
import { BlockerOptions } from '../detect/Blocker';
import { Movement } from '../detect/Movement';

interface DragActionEvents {
  readonly registry: {
    start: Bindable<{}>;
    stop: Bindable<{}>;
  };
  readonly trigger: {
    start: () => void;
    stop: () => void;
  };
}

export interface Dragging {
  readonly element: () => SugarElement<HTMLElement>;
  readonly go: (parent: SugarElement<Node>) => void;
  readonly on: () => void;
  readonly off: () => void;
  readonly destroy: () => void;
  readonly events: DragActionEvents['registry'];
}

const setup = function (mutation: DragMutation, mode: DragMode, settings: Partial<BlockerOptions>): Dragging {
  let active = false;

  const events: DragActionEvents = Events.create({
    start: Event([]),
    stop: Event([])
  });

  const movement = Movement();

  const drop = function () {
    sink.stop();
    if (movement.isOn()) {
      movement.off();
      events.trigger.stop();
    }
  };

  const throttledDrop = Throttler.last(drop, 200);

  const go = function (parent: SugarElement<Node>) {
    sink.start(parent);
    movement.on();
    events.trigger.start();
  };

  const mousemove = function (event: EventArgs) {
    throttledDrop.cancel();
    movement.onEvent(event, mode);
  };

  movement.events.move.bind(function (event) {
    mode.mutate(mutation, event.info);
  });

  const on = function () {
    active = true;
  };

  const off = function () {
    active = false;
    // acivate some events here?
  };

  const runIfActive = function <F extends (...args: any[]) => any> (f: F) {
    return function (...args: Parameters<F>) {
      if (active) {
        f.apply(null, args);
      }
    };
  };

  const sink = mode.sink(DragApi({
    // ASSUMPTION: runIfActive is not needed for mousedown. This is pretty much a safety measure for
    // inconsistent situations so that we don't block input.
    forceDrop: drop,
    drop: runIfActive(drop),
    move: runIfActive(mousemove),
    delayDrop: runIfActive(throttledDrop.throttle)
  }), settings);

  const destroy = function () {
    sink.destroy();
  };

  return {
    element: sink.element,
    go,
    on,
    off,
    destroy,
    events: events.registry
  };
};

export {
  setup
};
