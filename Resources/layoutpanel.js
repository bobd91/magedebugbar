/**
 * The main panel for the PhpDebugBar layout tab
 *
 * Provides a
 *  left panel for the LayoutViewer
 *  right panel for the FileViewer
 *
 * and a draggable resize handle between them
 *
 * @module layoutpanel
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class', 'cssclass', 'layoutmodel', 'layoutviewer', 'fileviewer',
        'resourceloader', 'filehandler', 'alerthandler', 'layoutfilecustomizer'],

function($, Class, CssClass, LayoutModel, LayoutViewer, FileViewer,
         ResourceLoader, FileHandler, AlertHandler, LayoutFileCustomizer) {

    var cssClass = CssClass.generate('layout', ['panel', 'left', 'right', 'resize-handle']);

    return Class.create({

        /**
         * Create the required main, left, right and resize handle components
         * And add handlers to support dragging the resize handle
         *
         * @param {jQuery} panel - PhpDebugBar.Widget created by magedebugbar.js
         */
        constructor: function(panel) {
            this.$panel = panel.addClass(cssClass.panel);
            this.$left = $('<div />').addClass(cssClass.left).appendTo(this.$panel);
            this.$resizehdle = $('<div />').addClass(cssClass.resize.handle).appendTo(this.$panel);
            this.$right = $('<div />').addClass(cssClass.right).appendTo(this.$panel);

            this.addResizeHandlers();
        },

        /**
         * Add event handler to support dragging the resize handle
         * mousedown: add mousemove and mouseup handlers to start dragging
         * mousemove: change the size of the panels
         * mouseup: remove the mousemove and mousup handlers to stop dragging
         */
        addResizeHandlers: function() {
            var pos_x, orig_w, orig_cursor;
            var orig_cursor = this.$panel.css('cursor');

            this.$resizehdle.on('mousedown', function(e) {
                orig_w = this.$left.width(), pos_x = e.pageX;
                this.$panel.on('mousemove', mousemove).on('mouseup', mouseup);
                this.$panel.css('cursor', 'col-resize');
            }.bind(this));

            var mousemove = function(e) {
                var w = Math.min(this.$panel.width() - this.$resizehdle.width(), Math.max(100, orig_w - pos_x + e.pageX));
                this.$left.width(w);
                this.resize();
            }.bind(this);

            var mouseup = function() {
                this.$panel.off('mousemove', mousemove).off('mouseup', mouseup);
                this.$panel.css('cursor', orig_cursor);
            }.bind(this);
        },

        /**
         * New layout configuration data has been supplied by the server
         * so reload the LayoutViewer and FileViewer components
         *
         * @param {Object} data - layout configuration downloaded from server
         */
        setLayout: function(data) {
            this.$left.children().remove();
            this.$right.children().remove();

            var layout = new LayoutModel(data);
            this.fileviewer = new FileViewer();
            this.layoutviewer = new LayoutViewer(this.resourceLoader(layout, this.fileviewer), layout);
            this.layoutviewer.appendTo(this.$left);
            this.fileviewer.appendTo(this.$right);

            this.resize();
        },

        /**
         * Container has been resized so resize content
         */
        resize: function() {
            this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());
            this.layoutviewer.resize();
            this.fileviewer.resize();
        },

        /**
         * Create a ResourceLoader to get resources from the server
         * and pass them to the correct response handler
         *
         * @param {LayoutMode} layout     - access to layout config data
         * @param {FileViewer} fileviewer - recipient of loaded files
         * @return {ResourceLoader}       - object to request resources from the server
         */
        resourceLoader: function(layout, fileviewer) {
            var loader = new ResourceLoader(layout);
            
            var fileHandler = new FileHandler(fileviewer);
            var customizer = new LayoutFileCustomizer(loader, layout);
            fileHandler.registerCustomizer(customizer);

            var alertHandler = new AlertHandler();

            loader.registerHandler(fileHandler)
                  .registerHandler(alertHandler);

           return loader;
        },
    });
      
});


