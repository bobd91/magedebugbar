/**
 * Simple class and sub-class creation
 * Tries to stick (roughly) to the proposal for ES6 classes
 *
 * ES6 syntax                class.js syntax
 * =========================================
 * 
 * class Xxx {}              var Xxx = Class.create({});
 * class Yyy extends Xxx {}  var Yyy = Class.extend(Xxx, {});
 *
 * super(...);               this.super.constructor.call(this, ...);
 * super.foo(...);           this.super.foo.call(this, ...);
 *
 * @module class
 * @author  Bob Davison
 * @version 1.0
 */
define({

    /**
     * Create a new class based on the definition object
     * Equivalent to Class.extend(Object, definition);
     *
     * @param {Object} definition - object whose members become members of the new class
     * @return {Function}         - the constructor function to make instances of the class
     */
    create: function(definition) {
        return this.extend(Object, definition);
    },

    /**
     * Create a new class, as an extension of an existing class, based on the definition object
     *
     * @param {Object} definition - object whose members become members of the new class
     * @return {Function}         - the constructor function to make instances of the class
     */
    extend: function(base, definition) {
        var proto = Object.create(base.prototype),
            constructor;
        Object.getOwnPropertyNames(definition)
              .forEach(function(v) { 
                  proto[v] = definition[v];
              });
        proto.super = base.prototype;
        constructor = proto.hasOwnProperty('constructor')
            ? proto.constructor
            : function() {};
        constructor.prototype = proto;
        return constructor;
    },

});
