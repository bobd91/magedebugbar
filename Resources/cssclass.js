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
            thiscss[sep[last]] = 'magedebugbar-' + prefix + '-' + name;
        });
        return css;
    }
});

