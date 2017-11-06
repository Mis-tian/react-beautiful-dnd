// @flow
/* eslint-disable no-use-before-define */
import stopEvent from '../stop-event';
import createScheduler from '../create-scheduler';
import blockStandardKeyEvents from '../util/block-standard-key-events';
import * as keyCodes from '../../key-codes';
import type {
  Callbacks,
  KeyboardSensor,
  Props,
} from '../drag-handle-types';

type State = {|
  isDragging: boolean,
|}

type ExecuteBasedOnDirection = {|
  vertical: () => void,
  horizontal: () => void,
|}

const noop = () => { };

export default (callbacks: Callbacks): KeyboardSensor => {
  let state: State = {
    isDragging: false,
  };
  const setState = (newState: State): void => {
    state = newState;
  };
  const startDragging = (fn?: Function = noop) => {
    setState({
      isDragging: true,
    });
    bindWindowEvents();
    fn();
  };
  const stopDragging = (fn?: Function = noop) => {
    unbindWindowEvents();
    setState({
      isDragging: false,
    });
    fn();
  };
  const kill = () => stopDragging();
  const cancel = () => {
    stopDragging(callbacks.onCancel);
  };
  const isDragging = (): boolean => state.isDragging;
  const schedule = createScheduler(callbacks, isDragging);

  const onKeyDown = (event: KeyboardEvent, props: Props) => {
    const { canLift, direction } = props;

    // not yet dragging
    if (!isDragging()) {
      // cannot lift at this time
      if (!canLift) {
        return;
      }

      if (event.keyCode !== keyCodes.space) {
        return;
      }
      stopEvent(event);
      startDragging(callbacks.onKeyLift);
      return;
    }

    // already dragging
    if (!direction) {
      console.error('cannot handle keyboard event if direction is not provided');
      stopEvent(event);
      cancel();
      return;
    }

    // Cancelling
    if (event.keyCode === keyCodes.escape) {
      stopEvent(event);
      cancel();
      return;
    }

    // Dropping
    if (event.keyCode === keyCodes.space) {
      // need to stop parent Draggable's thinking this is a lift
      stopEvent(event);
      stopDragging(callbacks.onDrop);
      return;
    }

    // Movement

    const executeBasedOnDirection = (fns: ExecuteBasedOnDirection) => {
      if (direction === 'vertical') {
        fns.vertical();
        return;
      }
      fns.horizontal();
    };

    if (event.keyCode === keyCodes.arrowDown) {
      stopEvent(event);
      executeBasedOnDirection({
        vertical: schedule.moveForward,
        horizontal: schedule.crossAxisMoveForward,
      });
      return;
    }

    if (event.keyCode === keyCodes.arrowUp) {
      stopEvent(event);
      executeBasedOnDirection({
        vertical: schedule.moveBackward,
        horizontal: schedule.crossAxisMoveBackward,
      });
      return;
    }

    if (event.keyCode === keyCodes.arrowRight) {
      stopEvent(event);
      executeBasedOnDirection({
        vertical: schedule.crossAxisMoveForward,
        horizontal: schedule.moveForward,
      });
      return;
    }

    if (event.keyCode === keyCodes.arrowLeft) {
      stopEvent(event);
      executeBasedOnDirection({
        vertical: schedule.crossAxisMoveBackward,
        horizontal: schedule.moveBackward,
      });
    }

    blockStandardKeyEvents(event);
  };

  const windowBindings = {
    resize: cancel,
    // currently not supporting window scrolling with a keyboard
    scroll: cancel,
  };

  const eventKeys: string[] = Object.keys(windowBindings);

  const bindWindowEvents = () => {
    eventKeys.forEach((eventKey: string) => {
      window.addEventListener(eventKey, windowBindings[eventKey]);
    });
  };

  const unbindWindowEvents = () => {
    eventKeys.forEach((eventKey: string) => {
      window.removeEventListener(eventKey, windowBindings[eventKey]);
    });
  };

  const sensor: KeyboardSensor = {
    onKeyDown,
    kill,
    isDragging,
    // a drag starts instantly so capturing is the same as dragging
    isCapturing: isDragging,
  };

  return sensor;
}
;