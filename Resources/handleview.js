/**
 * Displays layout configuration by handle in a tab
 * The Tab will display a dropdown allowing the user to refine
 * content by handle
 *
 * @module handleview
 * @author Bob Davison
 * @version 1.0
 */

define(['jquery', 'class', 'cssclass', 'tabcontent', 'treegridview'],

function($, Class, CssClass, TabContent, TreeGridView) {

    var cssClass = CssClass.generate('handle', ['view', 'chooser', 'icon-base', 'icon-block', 'icon-forced', 'icon-action', 'icon-ifconfig']);

    return Class.extend(TabContent, {

        /**
         * Create a tab with a dropdown for handle selection and
         * a TreeGridView for layout config display
         *
         * @param {ResourceLoader} resourceLoader - object for loading resources from the server
         * @param {LayoutModel} layoutModel       - layout configuration data
         */
        constructor: function(resourceLoader, layoutModel) {
            this.super.constructor.call(
                this,
                'Handles',                             // Tab label
                $('<div />').addClass(cssClass.view),  // Content div
                false,                                 // Closeable
                undefined,                             // Tooltip title
                this.handleChooser(layoutModel)        // Additional label HTML
            );
            this.treeview = new TreeGridView(this.makeRootModel(layoutModel));
            $(this.treeview)
            .on('click', function(e, row, col) {
                var file = row.branch.elem.file;
                var line = row.branch.elem.line;
                if(file !== undefined && line !== undefined) {
                    resourceLoader.loadFile(layoutModel.configFileName(file), line);
                }
            });
        },

        /**
         * Create a dropdown list of available handles
         * When a handle is selected then load the handle data into the TreeGridView
         *
         * @param {LayoutModel} layoutModel - layout configuration data
         */
        handleChooser: function(layoutModel) {
            var html = $('<select />').attr('id', cssClass.chooser);
            html.append($('<option />').attr('selected', 'true').text('(all)'));
            layoutModel.getHandles().forEach(function(handle) {
                html.append($('<option />').text(handle.name));
            });
            html.on('change', function(e) {
                var handle = $(e.target).val();
                var root;
                if(handle === '(all)') {
                    root= { blocks: this.blocksToHtml(layoutModel.getHandleBlocks()) };
                } else {
                    root = { blocks: this.blocksToHtml(layoutModel.getHandleBlocks(handle), handle, true) };
                }
                this.treeview.resetRoot(root);
            }.bind(this));

            return html;
        },

        /**
         * Add the TreeViewGrid to the tab content div
         *
         * @param {TabBox} tabbox - the tabbox we are a tab of
         */
        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        /**
         * Create the data to populate the TreeGridView
         *
         * @param {LayoutModel} layoutModel - the layout config data
         * @return {Object}                 - tree data for TreeGridView
         */
        makeRootModel: function(layoutModel) {
            return {
                children: 'blocks',
                values: ['html'],
                root: { blocks: this.blocksToHtml(layoutModel.getHandleBlocks()) }
            };
        },

        /**
         * Produce HTML representation of a tree of layout config blocks
         *
         * @see LayoutModel
         * @param {Array} blocks  - the tree of layout config blocks
         * @param {String} handle - the handle to restrict output to (optional, default all handles)
         * @param {boolean} force - force display of block even if in wrong handle (optional, default false)
         * @return {Array}        - Objects containing html, block element and child blocks
         */
        blocksToHtml: function(blocks, handle, force) {
            return blocks
                .map(function(block) { return this.blockToHtml(block, handle, force); }, this)
                .filter(function(res) { return res; });
            },

        /**
         * Convert a block and its children to HTML
         *
         * @see LayoutModel
         * @param {Object} block - the block object
         * @param {String} handle - handle whose blocks to display (default all handles)
         * @param {boolean} force - force display of blocks from different handle (default false)
         * @return {Object}       - html to display, actual block element, array of html for child blocks
         */
        blockToHtml: function(block, handle, force) {
            var html, blocks, elem;
            if(block.removedBy && (!handle || handle === block.removedBy.handle)) {
                html = this.removeIcon() + block.name;
                blocks = [];
                elem = block.removedBy.elem;
            } else if(force || !handle || handle === block.handle) {
                html = this.blockIcon(force && handle && handle !== block.handle) + block.name;
                blocks = this.actionsToHtml(block.actions, handle)
                .concat(this.blocksToHtml(block.blocks, handle));
                elem = block.elem;
            } else {
                // don't render block
                return;
            }
            return { html: html, blocks: blocks, elem: elem };
        },

        /**
         * Render any action blocks to HTML
         *
         * @see LayoutModel
         * @param {Array} actions - array of actions
         * @param {String} handle - handle whose actions to render (default is all)
         * @return {Array}        - objects with html for actions and action elements
         */ 
        actionsToHtml: function(actions, handle) {
            return actions
                .map(function(action) { return this.actionToHtml(action, handle); }, this)
                .filter(function(res) { return res; });
        },

        /**
         * Render an action block to HTML
         *
         * @see LayoutModel
         * @param {Object} action - action object
         * @param {String} handle - handle whose actions to render (default is all)
         * @return {Object}       - html of action and action element
         */
        actionToHtml: function(action, handle) {
            if(handle && handle !== action.handle) {
                return;
            }
            return {
                html: this.actionIcon(action.ifconfig) + this.escapeHtml(action.action),
                blocks: [],        // actions do not have children
                elem: action.elem
            };
        },

        /**
         * Convert special HTML characters to entities
         *
         * @param {String} string - string of characters to check for conversion
         * @return {String}       - string with special characters replaced with HTML entities
         */
        escapeHtml: function(string) {
            var entityMap =  {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': '&quot;',
                "'": '&#39;',
                "/": '&#x2F;'
            };
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        },

        /**
         * Generate block icon
         *
         * @param {boolean} forced - this block is from another handle
         * @return {String}         - HTML for block icon
         */
        blockIcon: function(forced) {
            return this.icon('fa-cube', forced ? cssClass.icon.forced : cssClass.icon.block);
        },

         /**
         * Generate removed block icon
         *
         * @return {String} - HTML for removed block icon
         */
       removeIcon: function() {
            return this.icon('fa-ban', cssClass.icon.remove);
        },

         /**
         * Generate action icon
         *
         * @param {boolean} fconfig - this action is subject to an ifconfig check
         * @return {String}         - HTML for action icon
         */
       actionIcon: function(ifconfig) {
            return this.icon('fa-gears', ifconfig ? cssClass.icon.ifconfig : cssClass.action );
        },

        /**
         * Generate HTML for FontAwesome icons
         *
         * @param {String} facls     - FontAwesome icon CSS class
         * @param {String} layoutcls - Layout CSS class
         * @param {String} title     - optional tooltip title for icon
         * @return {String}          - HTML for icon
         */
        icon: function(facls, layoutcls, title) {
            return "<i class='fa icon " + facls + " " + cssClass.icon.base + " " + layoutcls + "' " + (title ? "title='" + title + "'" : '') + " />";
        },

    });
});
