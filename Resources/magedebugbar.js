if (typeof(MageDebugBar) == 'undefined') {
    // namespace
    var MageDebugBar = {};
}

(function($) {

    var csscls = PhpDebugBar.utils.makecsscls('magedebugbar-layout-');

    var layoutTab = MageDebugBar.LayoutTab = PhpDebugBar.Widget.extend({

        className: csscls('panel'),

        render: function() {
            this.$left = $('<div />').addClass(csscls('left')).appendTo(this.$el);
            this.$resizehdle = $('<div />').addClass(csscls('resize-handle')).appendTo(this.$el);
            this.$right = $('<div />').addClass(csscls('right')).appendTo(this.$el);


            // dragging of resize handle
            var pos_x, orig_w, orig_cursor;
            var orig_cursor = this.$el.css('cursor');
            this.$resizehdle.on('mousedown', function(e) {
                orig_w = this.$left.width(), pos_x = e.pageX;
                this.$el.on('mousemove', mousemove).on('mouseup', mouseup);
                this.$el.css('cursor', 'col-resize');
            }.bind(this));

            var mousemove = function(e) {
                var w = Math.min(this.$el.width() - this.$resizehdle.width(), Math.max(100, orig_w - pos_x + e.pageX));
                this.$left.width(w);
                this.$right.css('margin-left', w + this.$resizehdle.width());
            }.bind(this);

            var mouseup = function() {
                this.$el.off('mousemove', mousemove).off('mouseup', mouseup);
                this.$el.css('cursor', orig_cursor);
            }.bind(this);
 
            this.bindAttr('data', function(data) {
                this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());
                this.$left.children().remove();
                var view = new TreeGridView(this.makeRootModel(data));
                view.appendTo(this.$left);
                $(view).on('click', function(e, row, col) {
                    var text = row.branch.values[col];
                    var method = [this.loadLayout, this.loadClass, this.loadTemplate][col].bind(this);
                    method(text);
                }.bind(this));
            });
        },

        loadLayout: function(text) {
            console.log("loadLayout('" + text + "')");
        },

        loadClass: function(text) {
            console.log("loadClass('" + text + "')");
        },

        loadTemplate: function(text) {
            console.log("loadTemplate('" + text + "')");
        },

        makeRootModel: function(data) {
            return {
                columns: [csscls('name'), csscls('type'), csscls('template')],
                headings: ['name', 'type', 'template'],
                root: data
            };
        },

    });
})(jQuery);
