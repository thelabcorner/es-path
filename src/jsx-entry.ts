import { ESPATH } from './index';

function extendScriptGlobal(): any {
  var globalScope: any = null;
  try {
    if (typeof $ !== 'undefined' && $.global) {
      globalScope = $.global;
    }
  } catch (e) {
    globalScope = null;
  }
  if (globalScope) { return globalScope; }
  try {
    globalScope = (Function as any)('return this')();
  } catch (e2) {
    globalScope = null;
  }
  return globalScope;
}

var globalScope: any = extendScriptGlobal();
if (globalScope) {
  globalScope['ESPATH'] = ESPATH;
}
