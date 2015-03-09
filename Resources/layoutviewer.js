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
        return elements.map(function(elem) {
            return {
                html: this.elementToHtml(elem),
                elems: this.elementsToHtml(elem.elems, elem),
                elem: elem
            };
        }, this);
    },

    elementToHtml: function(element) {
        var attrs = element.attrs ? ' ' + element.attrs.map(this.attrToHtml).join(' ') : '';
        var rest;
        if(element.elems.length === 0) {
            if(element.data && element.data.length) {
                rest = '>' + element.data + '</' + element.name + '>';
            } else {
               rest = ' />';
            }
        } else {
           rest = '>';
        } 
        return this.escapeHtml('<' + element.name + attrs + rest);
    }, 

    attrToHtml: function(attr) {
        var name = Object.getOwnPropertyNames(attr)[0];
        var value = attr[name];
        var q = value.indexOf("'") === -1 ? "'" : '"';
        return name + '=' + q + value + q;
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


})(jQuery);
