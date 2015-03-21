/**
 * A TabBox for displaying the Layout PageView and Layout HandleView
 *
 * @module layoutviewer
 * @author Bob Davison
 * @version 1.0
 */
define(['class', 'tabbox', 'pageview', 'handleview', 'layoutblockhighlighter'],

function(Class, TabBox, PageView, LayoutView, LayoutBlockHighlighter) {

    return Class.extend(TabBox, {

        constructor: function(loader, layout) {
            this.super.constructor.call(this);
            
            var highlighter = new LayoutBlockHighlighter();

            this.pageView = this.addTab(new PageView(loader, layout, highlighter));
            this.addTab(new HandleView(loader, layout));
            this.activateTab(this.pageView);
        },

    });
});
