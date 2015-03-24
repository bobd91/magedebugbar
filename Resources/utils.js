/**
 * CSS class generator
 *
 * Generate css classes with namespace prefixes 
 *
 * @module cssclass
 * @author Bob Davison
 * @version 1.0
 */

define({

    /**
     * Generate object containing namespace prefixed CSS class names
     *
     * Names separated by '-' create nested objects
     *
     * e.g. generate('tab, ['open', 'close', 'icon-close'])
     *
     * {
     *   open:  'magedebugbar-tab-open',
     *   close: 'magedebugbar-tab-close',
     *   icon:  {
     *            close: 'magedebugbar-tab-icon-close',
     *          }
     * }
     *
     * @param {String} prefix - namespace prefix (without 'magedebugbar-')
     * @param {Array} name    - [] of class names to generate
     * @return {Object}       - object containing namespaced css class names
     */
    generate: function(prefix, names) {
        var css = {};
        names.forEach(function(name) {
            var thiscss = css;
            var sep = name.split('-');
            var last = sep.length - 1;
            sep.slice(0, last).forEach(function(part) {
                thiscss[part] = thiscss[part] || {};
                thiscss = thiscss[part];
            });
            thiscss[sep[last]] = 'magedebugbar-' + prefix + '-' name;
        });
        return css;
    }
});


    /**
     * Add two CSS class generations to the given class
     *
     * @param {String} prefix    - prefix to be applied to all CSS classes produced by added functions
     * @param {Function} uiClass - constructor function for the class
     * @return {Function}        - constructor function for class with functions added to the prototype
     */
    mixin: function(prefix, uiClass) {

        /**
         * Creates CSS class name in the correct namespace
         *
         * @param {String} classes - local CSS class names, space seperated
         * @return {Function}      - CSS names with namespace prefix, space seperated
         */
        uiClass.prototype.cssClass = function(classes) {
            return classes.split(" ")
            .map(function (cls) { return 'magedebugbar-' + prefix + '-'+ cls; })
            .join(" ");
        };

        /**
         * Creates CSS selector classes in the correct namespace
         *
         * @param {String} classes - space seperated CSS local class names
         * @return {String}        - space seperated CSS class selectors in correct namespace
         */
        uiClass.prototype.cssClassSelector = function(classes) {
            return this.cssClass(classes).split(" ")
            .map(function (cls) { return "." + cls; })
            .join(" ");
        }

        return uiClass;
    }
});
