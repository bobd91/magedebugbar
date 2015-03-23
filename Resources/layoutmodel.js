/**
 * Provides access to the layout config downloaded from the server
 *
 * There are three main configuration items:
 *   layout.store     the current store id
 *   layout.blocks    blocks rendered on this page
 *   layout.config    blocks configured in the config files for the active handles
 *
 * Page Blocks (Rendered)
 *
 * layout.blocks {
 *   name:            block name
 *   type:            Magento block alias
 *   id:              MageDebugBar block id
 *   template:        short template path
 *   template_file:   Magento relative path
 *   blocks:          [] of child blocks
 * }
 *
 * Handle Config Blocks (Configuration)
 *
 * layout.config {
 *   handles:        [handle name => config blocks (see below)]
 *   files:          [] of config file Magento relative paths
 * }
 *
 * config blocks {
 *   name:           block element name (block, reference, remove, action etc.)
 *   attrs:          [attr name => attr value]
 *   elems:          [] of child handle blocks 
 *   file:           index info layout.config.files
 *   line:           line number
 *   data:           XML text node content
 * }
 *
 * The Handle View needs the Handle Config Blocks in a different data structure for
 * easier processing so a different data structure is produced by the constructor
 *
 * this.blocks      [block name => block detail] for all config blocks
 *
 * block detail {
 *   name:           block name
 *   handle:         handle
 *   parent:         parent config block
 *   removedBy:      { 
 *                     handle: handle of remove element
 *                     elem: config block of remove element 
 *                   }
 *   blocks:         [] of child block details
 *   actions:        [] of action details
 *   elem:           this config block
 * }
 *
 * action detail {
 *   action:         formatted version of method call
 *   ifconfig:       config flag
 *   handle:         handle
 *   elem:           this config block
 * }
 *
 * this.rootBlocks   [] of block details for root config blocks
 *
 * this.handleBlocks [handle name => [] of block details for per handle root config blocks]
 *
 * @module layoutmodel
 * @author Bob Davison
 * @version 1.0
 */
define(['class'],

function(Class) {

    return Class.create({

        constructor: function(layout) {
            this.layout = layout;

            this.blocks = {};
            this.rootBlocks = [];
            this.handleBlocks = {};
            layout.config.handles.forEach(function(handle) {
                this.handleBlocks[handle.name] = [];
                this.processConfigBlocks(handle.elems, handle.name);
            }, this);

        },

        /**
         * Get the details of the page blocks rendered for this page
         *
         * @return {Object} - page blocks
         */
        getPageBlocks: function() {
            return this.layout.blocks;
        },

        /**
         * Get the configuration details for all handles
         *
         * @return {Array} - array of config blocks, one element for each handle
         */
        getHandles: function() {
            return this.layout.config.handles;
        },

        /**
         * Is the named handle present in the configuration
         *
         * @param {String} handle - name of handle
         * @return {boolean}      - true if handle is configured, else false
         */
        validHandle: function(handle) {
            var valid = false;
            this.layout.config.handles.map(function(v) {
                valid = valid || handle === v.name;
            });
            return valid;
        },

        /**
         * Get the store id for the current page
         *
         * @return {integer} - store id
         */
        getStore: function() {
            return this.layout.store;
        },

        /**
         * Get root blocks for the given handle (default is all)
         *
         * @param {String} handle - name of handle (optional, default is all handles)
         * @return {Array}        - [] of config blocks
         */
        getHandleBlocks: function(handle) {
            if(handle) {
                return this.handleBlocks[handle];
            } else {
                return this.rootBlocks;
            }
        },

        /**
         * Split helper attribute into helper class alias and method
         *
         * Helper is of format <helper class alias>/<method>
         *
         * @param {String} helper - helper attribute
         * @return {Object}       - alias and method
         */
        splitHelper: function(helper) {
            var bits = helper.split('/');
            var alias = bits.slice(0, -1).join('/');
            var method = bits[bits.length - 1];
            return {alias: alias, method: method };
        },

        /**
         * Find block with given name in handle configuration
         *
         * @param {String} name - block name
         * @return {Object}     - config block for name, or nothing
         */
        findBlock: function(name) {
            var handles = this.layout.config.handles;
            for(var i = 0 ; i < handles.length ; i++) {
                var res = this.findBlockInElems(name, handles[i].elems);
                if(res) return res;
            }
        },

        /**
         * Search an array of config blocks for the specified block
         *
         * @param {String} name - block name
         * @param {Array} elems - [] of config blocks
         * @return {Object}     - config block for name, or nothing
         */
        findBlockInElems: function(name, elems) {
            if(elems) {
                for(var i = 0 ; i < elems.length ; i++) {
                    var res = this.findBlockInElem(name, elems[i]);
                    if(res) return res;
                }
            }
        }, 

        /**
         * Search a config block (and its children) for the specified block
         *
         * @param {String} name - block name
         * @param {Object} elem - config block to seach
         * @return {Object}     - config block for name, or nothing
         */
        findBlockInElem: function(name, elem) {
            if(elem.name === 'block' && elem.attrs) {
                if(name === elem.attrs.name) return elem;
            }
            return this.findBlockInElems(name, elem.elems);
        },
        
        /**
         * Search page blocks for the given template to get file name
         *
         * @param {String} template - Magento short template path
         * @param {Array} blocks    - page blocks to search (default = all)
         * @return {String}         - Magento relative path of template file
         */
        findTemplateFile: function(template, blocks) {
            blocks = blocks || [this.layout.blocks];
            for(var i = 0 ; i < blocks.length ; i++) {
                if(blocks[i].template === template) {
                    return blocks[i].template_file;
                }
                if(blocks[i].blocks) {
                    var res = this.findTemplateFile(template, blocks[i].blocks);
                    if(res) return res;

                }
            }
        },
           
       /**
        * Get config file path for file number
        *
        * @param {integer} fileNo - the file index number
        * @return {String}        - Magento relative path of config file
        */ 
        configFileName: function(fileNo) {
            return this.layout.config.files[fileNo];
        },

      /**
       * Process all Handle Config Blocks into structure more suitable
       * for the Handle View component
       *
       * @param {Array} blocks  - array of config blocks
       * @param {String} handle - handle of block
       * @param {Object} parent - parent config block
       */
        processConfigBlocks: function(blocks, handle, parent) {
            blocks.forEach(function(block) {
                this.processConfigBlock(block, handle, parent);
            }, this);
        },

        /**
         * Process a Config Block and children
         *
         * @param {Object} block  - config blocks
         * @param {String} handle - handle of block
         * @param {Object} parent - parent config block
         */
        processConfigBlock: function(block, handle, parent) {
            this.functionFor(block)(block, handle, parent);
            this.processConfigBlocks(block.elems, handle, block);
        },

        /**
         * Find function to process a config block element with the given name
         *
         * Block element names: block, reference, remove, action etc.
         *
         * @param {Object} block - config block
         * @return {Function}    - function to process block
         */
        functionFor: function(block) {
            var f = 'process_' + block.name;
            var fn = Object.getPrototypeOf(this).hasOwnProperty(f) ? this[f] : this.skipElement;
            return fn.bind(this);         
        },

        /**
         * Function to process elements we are not interested in
         */
        skipElement: function() {},

        /**
         * Process block type elements
         *
         * Create add block detail and add to its parent block (if it has one)
         * Ensure that parent is referenced under the handle of this block
         * as well as its own.
         *
         * Track output blocks in rootBlocks and handleBlocks
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_block: function(elem, handle, parent) {
            var name = elem.attrs.name;
            var block = { name: name, handle: handle, parent: parent, blocks: [], actions: [], elem: elem };
            this.blocks[name] = block
            if(parent) {
                var pblock = this.blocks[parent.attrs.name];
                if(pblock) {
                    pblock.blocks.push(block);
                    if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                        this.handleBlocks[handle].push(block);
                    }
                }
            } else if(elem.attrs.output) {
                this.rootBlocks.push(block);
                this.handleBlocks[handle].push(block);
            }
        },

        /**
         * Process remove type elements
         *
         * Note which block is being removed
         * Ensure that block is referenced under the handle of the removing block
         * as well as its own
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_remove: function(elem, handle, parent) {
            var pblock = this.blocks[elem.attrs.name];
            if(pblock) {
                if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                    this.handleBlocks[handle].push(pblock);
                }
                pblock.removedBy = { handle: handle, elem: elem };
            }
        },

        /**
         * Process action type elements
         *
         * Create an action detail and add it to the correct owning block
         * Ensure that owning block is referenced nder the action handle as well as its own
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_action: function(elem, handle, parent) {
            var action = { action: this.formatAction(elem), ifconfig: elem.attrs.ifconfig, handle: handle, elem: elem };
            var pblock = this.blocks[parent.attrs.name];
            if(pblock) {
                    if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                        this.handleBlocks[handle].push(pblock);
                    }
                pblock.actions.push(action);
            }
        },

        /**
         * Format an action element as a method call
         *
         * e.g   <action method='doThis'>
         *         <arg1>val1</arg1>
         *         <arg2>val2</arg2>
         *       </action>
         *
         * =>  doThis('val1', 'val2')
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated method call
         */
        formatAction: function(elem) {
            return  elem.attrs.method + "(" + this.formatArgs(elem) + ")";
        },

        /**
         * Format action arguments as method call arguments
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated arguments
         */
        formatArgs: function(elem) {
            var args = [];
            elem.elems.forEach(function (arg) {
                args.push(this.formatArg(arg));
            }, this);
            return args.join(', ');
        },

        /**
         * Format action argument as m ethod call argument
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated argument
         */
        formatArg: function(arg) {
            var helper = arg.attrs.helper;
            if(helper) {
                helper = this.splitHelper(helper);
                return helper.alias + '->' + helper.method + '()';
            }
            if(arg.elems.length) {
                return this.flattenElems(arg.elems);
            }
            var data = arg.data;
            if(data.length) {
                if(isNaN(+data)) {
                    return "'" + data + "'";
                } else {
                    return data;
                }
            } else {
                return 'null';
            }
        },

        /**
         * Flatten XML arguments into string
         *
         * Some arguments are XML so will have been split off into children by XML parser
         * but we want to display them as a single string with markup
         *
         * @param {Array} elems - XML arguments
         * @return {String}     - formatted XML elements
         */
        flattenElems: function(elems) {
            return elems.map(this.flattenElem, this).join('');
        },

        /**
         * Flatten an XML argument (and any child nodes) into string
         *
         * Some arguments are XML so will have been split off into children by XML parser
         * but we want to display them as a single string with markup
         *
         * @param {Array} elems - XML argument
         * @return {String}     - formatted XML element
         */
        flattenElem: function(elem) {
            var res = '<' + elem.name + '>';
            if(elem.elems.length) {
                res += flattenElems(elem.elems);
            } else {
                res += elem.data;
            }
            res += '</' + elem.name + '>';
            return res;
        },
    });
});
