/**
 * Simple, single level, context menu
 *
 * Menu items are specified as an array of:
 *
 * { 
 *   label: text to display
 *   action: function to call
 * }
 *
 * The action function will be passed the jQuery object
 * that the context menu was attached to.
 *
 * @module contextmenu
 * @author Bob Davison
 * @version 1.0
 */

define(['jquery', 'cssclass', 'class'],

function($, CssClass, Class) {

    var cssClass = CssClass.generate('contextmenu', ['menu']);

    return Class.create({
        /**
         * Construct context menu with given menu items
         *
         * @param {Array} menuItems - items to comprise the menu
         */
        constructor: function(menuItems) {
            this.$menu = $('<ul />').addClass(cssClass.menu);
            this.menuItems = menuItems;
            this.mouseup = this.mouseup.bind(this);
        },

        /**
         * Add a menu item, click will pass elem to the menu item action
         *
         * @param {jQuery} elem - the element that the menu is attached to
         * @param {Object} menuItem - details of the menu item to add
         */
        addMenuItem: function(elem, menuItem) {
            var item = $('<li />').text(menuItem.label).appendTo(this.$menu);
            item.on('click', this.click.bind(this, elem, menuItem.action));
        },

        /**
         * React to click on the menu item
         *
         * Hide the menu and run the action
         *
         * @param {jQuery} elem     - the element that the menu is attached to
         * @param {Function} action - the action function 
         */
        click: function(elem, action) {
                $(document).off('mouseup', this.mouseup);
                this.hide();
            action(elem);
        },

        /**
         * Attach this context menu to the given element
         *
         * The same context menu can be attached to many elements
         *
         * @param {jQuery} elem - the element to attach the context menu to
         */
        attach: function(elem) {
            elem.on('contextmenu', this.show.bind(this, elem));
        },

        /**
         * Show the menu
         *
         * @param {jQuery} elem - the element that the menu is attached to
         * @param {Event} event - the contextmenu event
         */
        show: function(elem, event) {
            var body = $('body');

            // Prevent default contextmenu
            event.preventDefault();

            // An old menu could still be showing
            this.hide();

            // Add the context menu items
            this.menuItems.forEach(this.addMenuItem.bind(this, elem));

            // Place in DOM
            this.$menu.appendTo($('body'));

            // Move to the into position
            this.position(event.clientX, event.clientY);

            // Use left mouseup to hide
            $(document).on('mouseup', this.mouseup);
        },

        /**
         * Position the menu where it can be seen
         *
         * Preferably down and right from mouse click
         *
         * @param {integer} x - x position of mouse in client area
         * @param {integer} y - y position of mouse in client area
         */
        position: function(x, y) {
            var menu = this.$menu; // save having to lookup all the time
            var height = menu.outerHeight();
            var width = menu.outerWidth();
            var body = $('body');
            var posX = x + body.scrollLeft();
            var posY = y + body.scrollTop();
            if(y + height > window.innerHeight && y > height) {
                posY -= height;
            }
            if(x + width > window.innerWidth && x > width) {
                posX -= width;
            }

            menu.css('top', posY + 'px').css('left', posX + 'px');
        },

        /**
         * Listen to other mouseup events so we can hide the menu
         *
         * @param {Event} e - the mouseup event
         */
        mouseup: function(e) {
            // Left click anywhere else hides menu
            if(e.which === 1 && e.target.offsetParent !== this.$menu.get(0)) {
                $(document).off('mouseup', this.mouseup);
                this.hide();
            }
        },

        /**
         * Hide the menu if visible
         */
        hide: function() {
            if(this.$menu.children().length) {
                this.$menu.empty();
                this.$menu.detach();
            }
        }
    });
});

