(function($) {

    var csscls = PhpDebugBar.utils.makecsscls('magedebugbar-layout-');

    LayoutViewer = Class.extend(TabBox, {

        constructor: function(loader, layout) {
            this.super.constructor.call(this);
            this.pageView = this.addTab(new PageView(loader, layout));
            this.addTab(new HandleView(loader, layout));
            this.activateTab(this.pageView);

            this.$hover = $('<div />').addClass(csscls('block-hover'));
            $('body').append(this.$hover);

            this.tooltip = new ToolTips();
        },

        showTip: function(text) {
            this.tooltip.show(this.$hover, text);
        },

        hideTip: function() {
            this.tooltip.hide();
        }
    });

    var PageView = Class.extend(TabContent, {
        constructor: function(loader, layout) {
            this.super.constructor.call(this, 'Page', $('<div />').addClass(csscls('view')));
            this.treeview = new TreeGridView(this.makeRootModel(layout.blocks));
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
                    var elems = $("[data-blockid='" + row.branch.id + "']");
                    if(2 === elems.length) {
                        var res = this.combineBounds(elems.eq(0), elems.eq(1));
                        if(res) {
                            this.tabbox.$hover.css({
                                top: res.top,
                                left: res.left,
                                width: res.right - res.left,
                                height: res.bottom - res.top
                            })
                            .show();
                            this.tabbox.showTip(row.branch.name);
                        }
                    }
                } else {
                    this.tabbox.$hover.hide();
                    this.tabbox.hideTip();
                }
            }.bind(this));
        },


        // Calculate largest bounds of area covered by the 
        // elements between begin and end (inclusive) 
        combineBounds: function(begin, end) {
            if(begin.parent().is(':hidden')) return;

            var o = begin.offset();
            var res = {top: o.top, right: o.left, bottom: o.top, left: o.left};
            var content = false; // Have we seen anything since elems(0)
            for(var elem = begin.next() ; !elem.is(end) && elem.length ; elem = elem.next()) {
                var display = elem.css('display');
                if((o = elem.offset()) && display !== 'none' && display !== 'inline') {
                    content = true;
                    var h = elem.outerHeight();
                    var w = elem.outerWidth();
                    res.top = Math.min(res.top, o.top);
                    res.left = Math.min(res.left, o.left);
                    res.bottom = Math.max(res.bottom, o.top + h);
                    res.right = Math.max(res.right, o.left + w);
                }
            }
            if(!content) {
                o = end.offset();
                var h = end.height()
                if(res.top + h <= o.top) {
                    // spans on different lines
                    // so must go to parent block container
                    // to calculate left and right 
                    res.bottom = o.top;
                    var p = this.parentLeftRight(begin);
                    if(p) {
                        res.left = p.left;
                        res.right = p.right;
                    }
                } else {
                    res.bottom = o.top + h;
                    res.right = o.left;
                }
            }
            return res;
        },

        // Find nearest non-inline parent and calculate left and right
        parentLeftRight: function(elem) {
            var parents = elem.parents();
            var i = 0;
            for(; i < parents.length && parents.eq(i).css('display') === 'inline'; i++) 
            ;

            // Should never happen (body set to inline?) but just in case
            if(i === parents.length) return;

            var parent = parents.eq(i);
            var offset = parent.offset();
            var left = offset.left + parseInt(parent.css('margin-left')) + parseInt(parent.css('border-left-width'));
            var right = left + parent.innerWidth();
            return { left: left, right: right };
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


    var Bounds = Class.create({
        constructor: function() {
            [].forEach.call(arguments, this.add, this);
        },

        add: function(elem) {
            var o = elem.offset();
            if(o) {
                switch(elem.css('display')) {
                    case 'none': break;
                    case 'inline': this.addInline(elem); break;
                    default: this.addBlock(elem)
                }
            }
        },

        addInline: function(elem) {
            o = elem.offset();
            if(o) {
                o = end.offset();
                if(o) {
                    h = parseInt(end.css('line-height'));
                    if(isNaN(h)) {
                        h = 1.5 * parseInt(end.css('font-size'));
                    }
                    if(!isNaN(h)) {
                        res.bottom = o.top + h;
                        res.right = o.left;
                        set = true;
                    }
                }
            }
        } 
    });

    var HandleView = Class.extend(TabContent, {
        constructor: function(loader, layout) {
            this.super.constructor.call(
                this,
                'Handles',
                $('<div />').addClass(csscls('view')),
                false,
                undefined,
                this.handleChooser(layout.config.handles)
            );
            this.treeview = new TreeGridView(this.makeRootModel(layout.config.handles));
            $(this.treeview)
            .on('click', function(e, row, col) {
                var file = row.branch.elem.file;
                var line = row.branch.elem.line;
                if(file !== undefined && line !== undefined) {
                    loader.loadFile(layout.config.files[file], line);
                }
            });
        },

        handleChooser: function(handles) {
            var html = $('<select />').attr('id', csscls('handle-chooser'));
            html.append($('<option />').attr('selected', 'true').text('(all)'));
            handles.forEach(function(handle) {
                html.append($('<option />').text(handle.name));
            });
            html.on('change', function(e) {
                var handle = $(e.target).val();
                var root;
                if(handle === '(all)') {
                    root= { blocks: this.blocksToHtml(this.blocks[0].blocks) };
                } else {
                    root = { blocks: this.blocksToHtml(this.handleBlocks[handle], handle, true) };
                }
                this.treeview.resetRoot(root);
            }.bind(this));

            return html;
        },

        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        makeRootModel: function(handles) {
            this.blocks = { 0: {blocks: []} };
            this.handleBlocks = {};
            handles.forEach(function(handle) {
                this.handleBlocks[handle.name] = [];
                this.processElements(handle.elems, handle.name);
            }, this);
            return {
                children: 'blocks',
                values: ['html'],
                columns: [csscls('actions')],
                root: { blocks: this.blocksToHtml(this.blocks[0].blocks) }
            };
        },

        blocksToHtml: function(blocks, handle, force) {
            return blocks
            .map(function(block) { return this.blockToHtml(block, handle, force); }, this)
            .filter(function(res) { return res; });
        },

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

        actionsToHtml: function(actions, handle) {
            return actions
            .map(function(action) { return this.actionToHtml(action, handle); }, this)
            .filter(function(res) { return res; });
        },

        actionToHtml: function(action, handle) {
            if(handle && handle !== action.handle) {
                return;
            }
            return {
                html: this.actionIcon(action.ifconfig) + this.escapeHtml(action.action),
                blocks: [],
                elem: action.elem
            };
        },

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

        blockIcon: function(forced) {
            return this.icon('fa-cube', (forced ? 'forced-' : '') + 'block-icon');
        },

        removeIcon: function() {
            return this.icon('fa-ban', 'remove-icon');
        },

        actionIcon: function(ifconfig) {
            return this.icon('fa-gears', (ifconfig ? 'if-' : '') + 'action-icon');
        },

        icon: function(facls, layoutcls, title) {
            return "<i class='fa icon " + facls + " " + csscls('icon') + " " + csscls(layoutcls) + "' " + (title ? "title='" + title + "'" : '') + " />";
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
                this.blocks[0].blocks.push(block);
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
                helper = new HelperArg(helper);
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

})(jQuery);
