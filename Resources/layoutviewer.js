(function($) {

var csscls = PhpDebugBar.utils.makecsscls('magedebugbar-layout-');

LayoutViewer = Class.extend(TabBox, {

    constructor: function(loader, layout) {
        this.super.constructor.call(this);
        this.pageView = this.addTab(new PageView(loader, layout));
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
                    var elems = $("[data-block='" + row.branch.name + "']");
                    if(2 === elems.length) {
                        var elem = elems.eq(0);
                        var end = elems.eq(1);
                        var res = {};
                        var o;
                        var set = false;
                        while(!end.is(elem = elem.next()) && elem.length) {
                            if((o = elem.offset()) && elem.css('display') !== 'none') {
                                var h = elem.outerHeight();
                                var w = elem.outerWidth();
               
                                if(h && w) {
                                    if(!set) {
                                        set = true;
                                        res.top = o.top;
                                        res.left = o.left;
                                        res.bottom = o.top + h;
                                        res.right = o.left + w;
                                    } else {
                                        res.top = Math.min(res.top, o.top);
                                        res.left = Math.min(res.left, o.left);
                                        res.bottom = Math.max(res.bottom, o.top + h);
                                        res.right = Math.max(res.right, o.left + w);
                                    }
                                }
                            }
                        }
                        if(!set) {
                            elem = elems.eq(0);
                            o = elem.offset();
                            if(o) {
                                res.top = o.top;
                                res.left = o.left;
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
                        if(set) {
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

    add: function(tabbox) {
        this.super.add.call(this, tabbox);
        this.treeview.appendTo(this.$ui);
    },

    makeRootModel: function(blocks) {
        return {
            children: 'blocks',
            values: ['name', 'type', 'template'],
            columns: [csscls('name'), csscls('type'), csscls('template')],
            headings: ['Name', 'Type', 'Template'],
            root: blocks
        };
    },
});



















})(jQuery);
