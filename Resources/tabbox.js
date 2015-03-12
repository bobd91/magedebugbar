(function($) {

    TabBox = Class.create({

        constructor: function() {
            this.$box = $('<div />').addClass('tab-box');
            this.$tabs = $('<ul />').appendTo(this.$box);
            this.$content = $('<div />').addClass('tab-content').appendTo(this.$box);
            this.$tabs
            .on('click', 'li', this.clickTab.bind(this))
            .on('click', '.tab-close', this.clickCloseTab.bind(this));
        },

        appendTo: function(element) {
            this.$box.appendTo(element);
            this.resize();
        },

        resize: function(e) {
            this.$content.outerHeight(this.$box.innerHeight() - this.$tabs.outerHeight());
        },

        clickTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.activateTab($(e.currentTarget));
                e.preventDefault();
            }
        },

        clickCloseTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.removeTab($(e.currentTarget).parent());
                e.preventDefault();
            }
        },

        getContent: function(tab) {
            return tab.data('tab-content');
        },

        setContent: function(tab, content) {
            tab.data('tab-content', content);
        },

        addTab: function(content) {
            var tab = $('<li />').text(content.label);
            if(content.html) {
                content.html.appendTo(tab);
            }
            if(content.title) {
                tab.attr('title', content.title);
            }
            if(content.closeable) {
                var close = $('<span />').addClass('tab-close');
                $('<i />').addClass('tab-cross-icon').appendTo(close);
                $('<i />').addClass('tab-close-icon fa fa-times-circle icon').appendTo(close);
                close.appendTo(tab);
            }
            this.$tabs.append(tab);
            content.add(this);

            this.setContent(tab, content);

            this.resize();

            return tab;
        },

        removeTab: function(tab) {
            var active = tab.hasClass('tab-active');
            var siblings = tab.siblings().length;
            var index = tab.index();
            // Remove after index otherwise can't get index
            this.getContent(tab).remove();
            tab.remove();
            if(active && siblings) {
                if(siblings === index) {
                    // Closed the furthest right tab
                    index--;
                }
                var newActive = this.$tabs.children().eq(index);
                this.activateTab(newActive);
            }
            if(0 == this.tabCount()) {
                this.hideContent();
            }
        },

        activateTab: function(tab) {
            this.$box.find('.tab-active').removeClass('tab-active');
            tab.addClass('tab-active');
            this.getContent(tab).activate();
            if(1 == this.tabCount()) {
                this.showContent();
            }
        },

        tabCount: function() {
            return this.$tabs.children().length;
        },

        hideContent: function() {
            this.$content.css('visibility', 'hidden');
        },

        showContent: function() {
            this.$content.css('visibility', 'visible');
        }

    });


    TabContent = Class.create({
        constructor: function(label, ui, closeable, title, html) {
            this.label = label;
            this.title = title;
            this.closeable = closeable;
            this.$ui = ui;
            this.html = html;
        },

        add: function(tabbox) {
            this.tabbox = tabbox;
            this.$ui.appendTo(tabbox.$content);
        },

        activate: function() {
            this.$ui.addClass('tab-active');
        },

        remove: function() {
            this.$ui.remove();
        }
    });


})(jQuery);
