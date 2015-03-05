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
            if(content.title) {
                tab.attr('title', content.title);
            }
            if(content.closeable) {
                var close = $('<div />').addClass('tab-close');
                close.appendTo(tab);
            }
            this.$tabs.append(tab);
            content.add(this.$content);

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
                var newActive = $('.tab-box > ul li').eq(index);
                this.activateTab(newActive);
            }
        },

        activateTab: function(tab) {
            $('.tab-active').removeClass('tab-active');
            tab.addClass('tab-active');
            this.getContent(tab).activate();
        },

    });


    TabContent = Class.create({
        constructor: function(label, ui, closeable, title) {
            this.label = label;
            this.title = title;
            this.closeable = closeable;
            this.$ui = ui;
        },

        add: function(container) {
            this.$ui.appendTo(container);
        },

        activate: function() {
            this.$ui.addClass('tab-active');
        },

        remove: function() {
            this.$ui.remove();
        }
    });


})(jQuery);
