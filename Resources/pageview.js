/**
 * Displays a TreeGridView of layout for this page in a tab
 *
 * @module pageview
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class', 'tabcontent', 'treeviewgrid'],

function($, Class, TabContent, TreeViewGrid) {

    return Class.extend(TabContent, {

        constructor: function(highlighter, loader, layout) {
            this.super.constructor.call(this, 'Page', $('<div />').addClass(csscls('view')));
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

        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        makeRootModel: function(blocks) {
            return {
                children: 'blocks',
                values: ['name', 'type', 'template'],
                columns: [csscls('name'), csscls('type'), csscls('template')],
                root: blocks
            };
        },
           });

