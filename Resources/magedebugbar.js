/**
 * Creates the LayoutPanel and adds it to the PhpDebugBar provided panel
 *
 * Passes window resize and PhpDebugBar resize events to the LayoutPanel
 * Passes data supplied by the server to the LayoutPanel
 *
 * This is the interface between the world of PhpDebugBar and MageDebugBar
 * PhpDebugBar requires that we have and entry in the global namespace
 * (see PHP function MageDebugBar\LayoutCollector->getWidgets())
 *
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'layoutpanel'],

function($, LayoutPanel) {

    // Ensure MageDebugBar namespace
    if (typeof(MageDebugBar) == 'undefined') {
        var MageDebugBar = {};
    }

    MageDebugBar.LayoutTab = PhpDebugBar.Widget.extend({

        render: function() {
            this.panel = new LayoutPanel();
            this.panel.appendTo(this.$el);

            // Resize content when window resizes
            $(window).on('resize', this.resize.bind(this));

            // Resize contents when phpdebugbar splitter is moved 
            // Unfortunately we want to resize after phpdebugbar but
            // it doesn't fire any events and we have no way if knowing
            // if our mousemove listener will fire before or after its
            // So we have to make sure we put an event on the end of the queue
            $('.phpdebugbar-drag-capture').on('mousemove', function(e) {
                window.setTimeout(function() {
                    this.resize();
                }.bind(this), 0);
            }.bind(this));

            // PhpDebugBar has layout data for us from the server
            this.bindAttr('data', function(layout) {
                this.panel.setLayout(layout);
            }.bind(this));
        },

        resize: function() {
            this.panel.resize();
        },
 
    });
});


