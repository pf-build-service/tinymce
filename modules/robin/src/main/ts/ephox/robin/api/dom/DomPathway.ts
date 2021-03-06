import { DomUniverse } from '@ephox/boss';
import { SugarElement } from '@ephox/sugar';
import * as Pathway from '../general/Pathway';

const universe = DomUniverse();

const simplify = function (elements: SugarElement[]) {
  return Pathway.simplify(universe, elements);
};

export {
  simplify
};
