/**
 * Provides access to the layout config downloaded from the server
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
                this.processElements(handle.elems, handle.name);
            }, this);

        },

        getPageBlocks: function() {
            return this.layout.blocks;
        },

        getHandles: function() {
            return this.layout.config.handles;
        },

        getHandle: function(handle) {
            return this.layout.config.handles.some(function(v) {
                return handle === v.name;
            });
        },

        getStore: function() {
            return this.layout.store;
        },

        getHandleBlocks: function(handle) {
            if(handle) {
                return this.handleBlocks[handle];
            } else {
                return this.rootBlocks;
            }
        },

        splitHelper: function(helper) {
            var bits = helper.split('/');
            var alias = bits.slice(0, -1).join('/');
            var method = bits[bits.length - 1];
            return {alias: alias, method: method };
        },

        findBlock: function(name) {
            var handles = this.layout.config.handles;
            for(var i = 0 ; i < handles.length ; i++) {
                var res = this.findBlockInElems(name, handles[i].elems);
                if(res) return res;
            }
        },

        findBlockInElems: function(name, elems) {
            if(elems) {
                for(var i = 0 ; i < elems.length ; i++) {
                    var res = this.findBlockInElem(name, elems[i]);
                    if(res) return res;
                }
            }
        }, 

        findBlockInElem: function(name, elem) {
            if(elem.name === 'block' && elem.attrs) {
                if(name === elem.attrs.name) return elem;
            }
            return this.findBlockInElems(name, elem.elems);
        },
        
        findTemplateFile: function(template, config) {
            config = config || [this.layout.blocks];
            for(var i = 0 ; i < config.length ; i++) {
                if(config[i].template === template) {
                    return config[i].template_file;
                }
                if(config[i].blocks) {
                    var res = this.findTemplateFile(template, config[i].blocks);
                    if(res) return res;

                }
            }
        },
            
        // return config file name given file number
        configFileName: function(fileNo) {
            return this.layout.config.files[fileNo];
        },

       
        processElements: function(elems, handle, parent) {
            elems.forEach(function(elem) {
                this.processElement(elem, handle, parent);
            }, this);
        },

        processElement: function(elem, handle, parent) {
            this.functionFor(elem)(elem, handle, parent);
            this.processElements(elem.elems, handle, elem);
        },

        functionFor: function(elem) {
            var f = 'process_' + elem.name;
            var fn = Object.getPrototypeOf(this).hasOwnProperty(f) ? this[f] : this.skipElement;
            return fn.bind(this);         
        },

        skipElement: function() {},

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

        process_remove: function(elem, handle, parent) {
            var pblock = this.blocks[elem.attrs.name];
            if(pblock) {
                if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                    this.handleBlocks[handle].push(pblock);
                }
                pblock.removedBy = { handle: handle, elem: elem };
            }
        },

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

        formatAction: function(elem) {
            return  elem.attrs.method + "(" + this.formatArgs(elem) + ")";
        },

        formatArgs: function(elem) {
            var args = [];
            elem.elems.forEach(function (arg) {
                args.push(this.formatArg(arg));
            }, this);
            return args.join(', ');
        },

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

        flattenElems: function(elems) {
            return elems.map(this.flattenElem, this).join('');
        },

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
