
    var Class = {

        create: function(definition) {
            return this.extend(Object, definition);
        },

        extend: function(base, definition) {
            var proto = Object.create(base.prototype),
                constructor;
            Object.getOwnPropertyNames(definition)
                .forEach(function(v) { proto[v] = definition[v]; });
            proto.super = base.prototype;
            constructor = proto.hasOwnProperty('constructor')
                    ? proto.constructor
                    : function() {};
            constructor.prototype = proto;
            return constructor;
        },

    };
