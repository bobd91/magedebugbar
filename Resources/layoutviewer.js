(function($) {

var csscls = PhpDebugBar.utils.makecsscls('magedebugbar-layout-');

LayoutViewer = Class.extend(TabBox, {

    constructor: function(loader, layout) {
        this.super.constructor.call(this);
        this.pageView = this.addTab(new PageView(loader, layout));
        this.addTab(new ActionView(loader, layout));
        this.addTab(new HandleView(loader, layout));
        this.activateTab(this.pageView);

        this.$hover = $('<div />').addClass(csscls('block-hover'));
        $('body').append(this.$hover);
    },
});

var PageView = Class.extend(TabContent, {
    constructor: function(loader, layout) {
        this.super.constructor.call(this, 'Page', $('<div />').addClass(csscls('pageview')));
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
                        }
                    }
                } else {
                    this.tabbox.$hover.hide();
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


var HandleView = Class.extend(TabContent, {
    constructor: function(loader, layout) {
        this.super.constructor.call(this, 'Handles', $('<div />').addClass(csscls('handleview')));
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


    add: function(tabbox) {
        this.super.add.call(this, tabbox);
        this.treeview.appendTo(this.$ui);
    },

    makeRootModel: function(handles) {

        return {
            children: 'elems',
            values: ['html'],
            columns: [csscls('handle')],
            root: { elems: this.elementsToHtml(handles) },

        };

    },

    elementsToHtml: function(elements, parent) {
        if(parent && 'action' === parent.name) {
            return []; // Don't explore inside actions
        }

        var mapped = elements.map(function(elem) {
            return {
                html: this.elementToHtml(elem),
                elems: this.elementsToHtml(elem.elems, elem),
                elem: elem
            };
        }, this)

        var filtered = mapped.filter(function(elem) { return elem.html.length > 0; });

        return filtered;
    },

    elementToHtml: function(element) {
        var map = {
            block: { cls: 'fa-cube ' + csscls('block-icon'), fn: this.attrName.bind(this) },
            reference: { cls: 'fa-link ' + csscls('reference-icon'), fn: this.attrName.bind(this) },
            remove: { cls: 'fa-ban ' + csscls('remove-icon'), fn: this.attrName.bind(this) },
            action: { cls: 'fa-gears ' + csscls('action-icon'), fn: this.attrMethod.bind(this) },
            handle: { fn: this.elemName },
            label: 'ignore',
        };
        var facls = map[element.name] || map.handle;
        if(facls !== 'ignore') {
            if(facls.cls) {
                return "<i class='fa icon " + facls.cls + "' />" + facls.fn(element);
            } else {
                return facls.fn(element);
            }
        } else {
            return'';
        }
    },

    elemName: function(elem) {
        return elem.name;
    },

    attrName: function(elem) {
        return this.attr(elem, 'name');
    },

    attrMethod: function(elem) {
        return this.attr(elem, 'method');
    },

    attr: function(elem, name) {
        var attrs = elem.attrs;
        for(var i = 0 ; i < attrs.length ; i++) {
            if(attrs[i].hasOwnProperty(name)) {
                return attrs[i][name];
            }
        }
    }

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

var ActionView = Class.extend(TabContent, {
    constructor: function(loader, layout) {
        this.super.constructor.call(this, 'Actions', $('<div />').addClass(csscls('actionview')));
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


    add: function(tabbox) {
        this.super.add.call(this, tabbox);
        this.treeview.appendTo(this.$ui);
    },

    makeRootModel: function(handles) {
        this.blocks = { 0: {blocks: []} };
        handles.forEach(function(handle) {
            this.processElements(handle.elems);
        }, this);
        return {
            children: 'blocks',
            values: ['html'],
            columns: [csscls('actions')],
            root: { blocks: this.blocksToHtml(this.blocks[0].blocks) }
        };
    },

    blocksToHtml: function(blocks) {
        return blocks.map(this.blockToHtml, this);
    },

    blockToHtml: function(block) {
        var html, blocks, elem;
            if(block.removedBy) {
                html = this.removeIcon() + block.name;
                blocks = [];
                elem = block.removedBy;
            } else {
                html = this.blockIcon() + block.name;
                blocks = this.actionsToHtml(block.actions)
                    .concat(this.blocksToHtml(block.blocks));
                elem = block.elem;
            }
        return { html: html, blocks: blocks, elem: elem };
    },

    actionsToHtml: function(actions) {
        return actions.map(this.actionToHtml, this);
    },

    actionToHtml: function(action) {
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

    blockIcon: function() {
        return this.icon('fa-cube', 'block-icon');
    },
    
    removeIcon: function() {
        return this.icon('fa-ban', 'remove-icon');
    },

    actionIcon: function(ifconfig) {
        return this.icon('fa-gears', (ifconfig ? 'if' : '') + 'action-icon');
    },

    icon: function(facls, layoutcls) {
        return "<i class='fa icon " + facls + " " + csscls(layoutcls) + "' />";
    },
 


    processElements: function(elems, parent) {
        elems.forEach(function(elem) {
            this.processElement(elem, parent);
        }, this);
    },

    processElement: function(elem, parent) {
        this.functionFor(elem)(elem, parent);
        this.processElements(elem.elems, elem);
    },

    functionFor: function(elem) {
        var f = 'process_' + elem.name;
        var fn = Object.getPrototypeOf(this).hasOwnProperty(f) ? this[f] : this.skipElement;
        return fn.bind(this);         
    },

    skipElement: function(elem, parent) {},

    process_block: function(elem, parent) {
        var name = this.attrName(elem);
        var block = { name: name, blocks: [], actions: [], elem: elem };
        this.blocks[name] = block
        if(parent) {
            var pblock = this.blocks[this.attrName(parent)];
            if(pblock) {
                pblock.blocks.push(block);
            }
        } else if(this.attr(elem, 'output')) {
            this.blocks[0].blocks.push(block);
        }
    },

    process_remove: function(elem, parent) {
        var block = this.blocks[this.attrName(elem)];
        if(block) block.removedBy = elem;
    },

    process_action: function(elem, parent) {
        var action = { action: this.formatAction(elem), ifconfig: this.attr(elem, 'ifconfig'), elem: elem };
        var pblock = this.blocks[this.attrName(parent)];
        if(pblock) {
            pblock.actions.push(action);
        }
    },

    formatAction: function(elem) {
        return  this.attr(elem, 'method') + "(" + this.formatArgs(elem) + ")";
    },

    formatArgs: function(elem) {
        var args = [];
        elem.elems.forEach(function (arg) {
            args.push(this.formatArg(arg));
        }, this);
        return args.join(', ');
    },

    formatArg: function(arg) {
        var helper = this.attr(arg, 'helper');
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

    attrName: function(elem) {
        return this.attr(elem, 'name');
    },

    attr: function(elem, name) {
        var attrs = elem.attrs;
        if(attrs) {
            for(var i = 0 ; i < attrs.length ; i++) {
                if(attrs[i].hasOwnProperty(name)) {
                    return attrs[i][name];
                }
            }
        }
    },
});

})(jQuery);
