/**
 * Displays a TreeGridView of layout for this page in a tab
 *
 * @module pageview
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class', 'cssclass', 'tabcontent', 'treegridview'],

function($, Class, CssClass, TabContent, TreeGridView) {

    var cssClass = CssClass.generate('page', ['view']);

    return Class.extend(TabContent, {

        /**
         * Creates a TreeGridView for displaying Page Blocks from the layout config
         * 
         * Click on items to load resources from server
         * Hover over rows to highlight blocks on the page
         *
         * @param {ResourceLoader} loader  - for loading resources from the server
         * @param {LayoutModel} layout     - for access to the page blocks
         * @param {LayoutHighlighter} highlighter - to highlight blocks on the page
         */ 
        constructor: function(loader, layout, highlighter) {
            this.super.constructor.call(this, 'Page', $('<div />').addClass(cssClass.view));
            this.treeview = new TreeGridView(this.makeRootModel(layout.getPageBlocks()));
            $(this.treeview)
            .on('click', function(e, row, col) {
                switch(col) {
                    case 0: // Block name
                        loader.loadBlock(row.branch.name);
                    break;
                    case 1: // Block class
                        loader.loadBlockClass(row.branch.type);
                    break;
                    case 2: // Template
                        loader.loadTemplate(row.branch.template);
                    break;
                }
            })
            .on('hover', function(e, hover, row) {
                if(hover) {
                    highlighter.show(row.branch.name, row.branch.id);
                } else {
                    highlighter.hide();
                }
            });
        },

        /**
         * Tab added so append the TreeGridView
         *
         * @param {TabBox} tabbox - the owning tabbox
         */
        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        /**
         * Create model suitable for the TreeGridView
         *
         * @param {Array} blocks - [] of root page blocks
         * @return {Object}      - model for TreeViewGrid
         */
        makeRootModel: function(blocks) {
            return {
                children: 'blocks',
                values: ['name', 'type', 'template'],
                root: blocks
            };
        },
    });
});

