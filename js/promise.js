/**
 * IE does not support ES6 Promises yet so we use a polyfill
 *
 * Unfortunately the interface of the polyfill is not quite the
 * same as ES6 promises so we introduce this module to map
 * between them.
 *
 * @module promise
 * @author Bob Davison
 * @version 1.0
 */

define(['es6-promise'],

function(PromisePolyfill) {
  return PromisePolyfill.Promise;
}
      
);
