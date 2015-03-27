/**
 * A Tab user interface control
 * Manages display of tabs and content
 * Allows for closeable tabs and additional content next to label
 *
 * @module tabbox
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class', 'cssclass', 'clipboard'], 
       
function($, Class, CssClass, Clipboard) {

    var cssClass = CssClass.generate('tab', ['box', 'content', 'active', 'close', 'icon-cross', 'icon-close']);

    return Class.create({

        /**
         * Construct <div> with inner <ul> for tab labels and <div> for tab content
         * The outer <div> will have class 'tab-box'
         * Each tab label will be <li>, the active tab will have class 'tab-active'
         * Closeable tabs will have a <span> with class 'tab-close'
         * The content <div> will have class 'tab-content'
         */
        constructor: function() {
            this.$box = $('<div />').addClass(cssClass.box);
            this.$tabs = $('<ul />').appendTo(this.$box);
            this.$content = $('<div />').addClass(cssClass.content).appendTo(this.$box);
            this.$tabs
            .on('click', 'li', this.clickTab.bind(this))
            .on('click', '.' + cssClass.close, this.clickCloseTab.bind(this));
        },

        /**
         * Allow sub-classes access to the CSS class for active tabs and content
         *
         * @return {String} - CSS class for active tabs and content
         */
        activeClass: function() {
            return cssClass.active;
        },

        /**
         * Append the tabbox to the given DOM or JQuery element
         *
         * @param {jQuery | DOM} element - element to append tabbox to
         */
        appendTo: function(element) {
            this.$box.appendTo(element);
            this.resize();
        },

        /**
         * Resize the tab content <div> to fill the tabbox minus the labels
         */
        resize: function() {
            this.$content.outerHeight(this.$box.innerHeight() - this.$tabs.outerHeight());
        },

        /**
         * Handler called when a tab is clicked by user
         * Activate the clicked tab
         *
         * @param {Event} e - the click event
         */
        clickTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.activateTab($(e.currentTarget));
                e.preventDefault();
            }
        },

        /**
         * Handler when close button is clicked by user
         * Remove the closed tab
         *
         * @param {Event} e - the click event
         */
        clickCloseTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.removeTab($(e.currentTarget).parent());
                e.preventDefault();
            }
        },

        /**
         * Get the tab content
         *
         * @param {JQuery} tab - the JQuery <li> element representing the tab
         * @return {TabContent} - the tab object
         */
        getTabContent: function(tab) {
            return tab.data('tab-content');
        },

        /**
         * Set the tab content
         *
         * @param {JQuery} tab  - the JQuery <li> element representing the tab
         * @param {TabContent} content - the tab object
         */
        setTabContent: function(tab, content) {
            tab.data('tab-content', content);
        },

        /**
         * Add a new tab to this tabbox
         *  
         * @param {TabContent} content - the tab to add
         * @return {jQuery}            - jQuery <li> element of tab
         */   
        addTab: function(content) {
            var tab = $('<li />').text(content.label);
            if(content.$html) {
                content.$html.appendTo(tab);
            }
            if(content.title) {
                tab.attr('title', content.title);
                tab.hover(
                    function() { Clipboard.set(content.title); },
                    function() { Clipboard.unset(); }
                );
            }
            if(content.closeable) {
                var close = $('<span />').addClass(cssClass.close);
                $('<i />').addClass(cssClass.icon.cross).appendTo(close);
                $('<i />').addClass(cssClass.icon.close + ' fa fa-times-circle icon').appendTo(close);
                close.appendTo(tab);
            }
            this.$tabs.append(tab);
            content.add(this);

            this.setTabContent(tab, content);

            this.resize();

            return tab;
        },

        /**
         * Remove the given tab from the tabbox
         * If this is the last tab then the content <div> is hidden
         *
         * @param {jQuery} tab - <li> element representing tab
         */
        removeTab: function(tab) {
            var active = tab.hasClass(cssClass.active);
            var siblings = tab.siblings().length;
            var index = tab.index();
            // Remove after index otherwise can't get index
            this.getTabContent(tab).remove();
            tab.remove();
            if(active && siblings) {
                if(siblings === index) {
                    // Closed the furthest right tab
                    index--;
                }
                var newActive = this.$tabs.children().eq(index);
                this.activateTab(newActive);
            }
            if(0 === this.tabCount()) {
                this.hideContent();
            }
        },

        /**
         * Remove all other tabs except the one passed in
         *        
         * @param {jQuery} tab - <li> element representing tab
         */
        removeOtherTabs: function(tab) {
            var elem = tab.get(0);
            this.$tabs.children().each(function(index, child) {
                if(child !== elem) {
                    $(child).remove();
                }
            });
            this.activateTab(tab);
        },

        /**
         * Remove all tabs
         */
        removeAllTabs: function() {
            this.$tabs.empty();
            this.hideContent();
        },


        /**
         * Activate the given tab
         *
         * If this is the only tab then the content <div> is shown
         *
         * @param {jQuery} tab - <li> element representing tab
         */
        activateTab: function(tab) {
            this.$box.find('.' + cssClass.active).removeClass(cssClass.active);
            tab.addClass(cssClass.active);
            this.getTabContent(tab).activate();
            if(1 == this.tabCount()) {
                this.showContent();
            }
        },

        /**
         * The number of tabs
         *
         * @return {integer} the number of tabs
         */
        tabCount: function() {
            return this.$tabs.children().length;
        },

        /**
         * Hide the content <div>
         */
        hideContent: function() {
            this.$content.css('visibility', 'hidden');
        },

        /**
         * Show the content <div>
         */
        showContent: function() {
            this.$content.css('visibility', 'visible');
        },

        /**
         * Return the content <div>
         *
         * @return {jQuery}  the content <div>
         */
        getContent: function() {
            return this.$content;
        }

    });

});
