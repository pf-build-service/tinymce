import Behaviour from './Behaviour';
import KeyboardBranches from '../../behaviour/keyboard/KeyboardBranches';
import KeyingState from '../../behaviour/keyboard/KeyingState';
import { Objects } from '@ephox/boulder';



export default <any> Behaviour.createModes({
  branchKey: 'mode',
  branches: KeyboardBranches,
  name: 'keying',
  active: {
    events: function (keyingConfig, keyingState) {
      var handler = keyingConfig.handler();
      return handler.toEvents(keyingConfig, keyingState);
    }
  },
  apis: {
    focusIn: function (component/*, keyConfig, keyState */) {
      // TODO: Should this use the focusManager?
      component.getSystem().triggerFocus(component.element(), component.element());
    },

    // These APIs are going to be interesting because they are not
    // available for all keying modes
    setGridSize: function (component, keyConfig, keyState, numRows, numColumns) {
      if (! Objects.hasKey(keyState, 'setGridSize')) {
        console.error('Layout does not support setGridSize');
      } else {
        keyState.setGridSize(numRows, numColumns);
      }
    }
  },
  state: KeyingState
});