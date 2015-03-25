/**
 * Manages the content panel of a tabbox control
 *
 * @module tabcontent
 * @author Bob Davison
 * @version 1.0
 */
define(['class'], 
       
function(Class) {

    return Class.create({
        /**
         * Create a new content panel for a tabbox
         *
         * @param {string} label - the label to display on the tab
         * @param {jQuery} ui    - the jQuery element to display in the content
         * @param {boolean} closeable - true if a close button should be displayed (optional, default false)
         * @param {string} title - set as HTML title attribute on tab for tooltips (optional)
         * @param {jQuery} html - additional jQuery content to be added after the label on the tab (optional)
         */
        constructor: function(label, ui, closeable, title, html) {
            this.label = label;
            this.title = title;
            this.closeable = closeable;
            this.$ui = ui;
            this.$html = html;
        },

        /**
         * Called by the owning tabbox when the tab is being added
         * Responsible for adding to the tabbox content <div>
         *
         * @param {TabBox} tabbox - the owning tabbox
         */
        add: function(tabbox) {
            this.tabbox = tabbox;
            this.$ui.appendTo(tabbox.getContent());
        },

        /**
         * Called by the owning tabbox when the tab is made active
         */
        activate: function() {
            this.$ui.addClass(this.tabbox.activeClass());
        },

        /**
         * Called by the owning tabbox when the tab is removed
         */
        remove: function() {
            this.$ui.remove();
        }

    });

});
