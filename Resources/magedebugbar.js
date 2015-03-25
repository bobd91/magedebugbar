/**
 * Creates the LayoutPanel and adds it to the PhpDebugBar provided panel
 *
 * Passes window resize and PhpDebugBar resize events to the LayoutPanel
 * Passes data supplied by the server to the LayoutPanel
 *
 * This is where the world of PhpDebugBar and MageDebugBar meet so
 * PhpDebugBar stuff must load synchronoulsy but MageDebugBar uses
 * require.js which loads stuff asynchronoulsy
 *
 * @author Bob Davison
 * @version 1.0
 */

/**
 * PhpDebugBar requires its tabs to exist in global namespace
 * (see PHP function MageDebugBar\LayoutCollector->getWidgets())
 */
if(typeof(MageDebugBar) === 'undefined') {
    MageDebugBar = {};

}

(function($, PhpDebugBar) {

    // The rest of MageDebugBar uses requirejs for module loading
    require.config({
        baseUrl: "/js/MageDebugBar",
        paths: {
            ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8",
            // Outstanding query with Ace team re: problems mapping theme urls
            "ace/theme/chrome": "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8/theme-chrome"
        }
    });


    // MageDebugBar.LayoutTab is expected by PhpDebugBar
    MageDebugBar.LayoutTab = PhpDebugBar.Widget.extend({

        render: function() {

            require(['layoutpanel'], function(LayoutPanel) {
                this.panel = new LayoutPanel(this.$el);

                // Requirejs will load panel asynchronously so
                // we may have data to load by the time the
                // panel is created
                if(this.layout) {
                    this.panel.setLayout(this.layout);
                    this.resize();
                }

            }.bind(this));

            // PhpDebugBar bug - bottom padding does not work
            $('<div />').addClass('magedebugbar-padding-bottom').appendTo('body');
            phpdebugbar.recomputeBottomOffset = function() {
                $('.magedebugbar-padding-bottom').height($('.phpdebugbar').height());
            };

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
            // But panel may not be created yet
            this.bindAttr('data', function(layout) {
                if(this.panel) {
                    this.panel.setLayout(layout);
                } else {
                    this.layout = layout;
                }
            }.bind(this));
        },

        resize: function() {
            if(this.panel) {
                this.panel.resize();
            }
        },

    });
})(jQuery, PhpDebugBar);


