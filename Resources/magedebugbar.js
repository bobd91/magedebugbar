if (typeof(MageDebugBar) == 'undefined') {
    // namespace
    var MageDebugBar = {};
}

(function($) {

    var csscls = PhpDebugBar.utils.makecsscls('magedebugbar-layout-');

    var layoutTab = MageDebugBar.LayoutTab = PhpDebugBar.Widget.extend({

        className: csscls('panel'),

        render: function() {
            this.$left = $('<div />').addClass(csscls('left')).appendTo(this.$el);
            this.$resizehdle = $('<div />').addClass(csscls('resize-handle')).appendTo(this.$el);
            this.$right = $('<div />').addClass(csscls('right')).appendTo(this.$el);


            // dragging of resize handle
            var pos_x, orig_w, orig_cursor;
            var orig_cursor = this.$el.css('cursor');
            this.$resizehdle.on('mousedown', function(e) {
                orig_w = this.$left.width(), pos_x = e.pageX;
                this.$el.on('mousemove', mousemove).on('mouseup', mouseup);
                this.$el.css('cursor', 'col-resize');
            }.bind(this));

            var mousemove = function(e) {
                var w = Math.min(this.$el.width() - this.$resizehdle.width(), Math.max(100, orig_w - pos_x + e.pageX));
                this.$left.width(w);
                this.$right.css('margin-left', w + this.$resizehdle.width());
            }.bind(this);

            var mouseup = function() {
                this.$el.off('mousemove', mousemove).off('mouseup', mouseup);
                this.$el.css('cursor', orig_cursor);
            }.bind(this);
 
            this.bindAttr('data', function(data) {
                this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());

                this.$left.children().remove();
                this.$right.children().remove();

                var treeview = new TreeGridView(this.makeRootModel(data.blocks));
                var fileview = new FileViewer(new editCustomizer(data));
                treeview.appendTo(this.$left);
                fileview.appendTo(this.$right);

                $(treeview).on('click', function(e, row, col) {
                    if(col == 0) {
                        var name = row.branch.values[col];
                        var config = this.findLayoutConfig(name, data.config.handles);
                        if(config) {
                            fileview.load(data.config.files[config.file], config.line);
                        }
                    } else {
                        var file = row.branch.files[col -1];
                        fileview.load(file);
                    }
                }.bind(this));

            });
        },

        findLayoutConfig: function(name, handles) {
            for(var h = 0 ; h < handles.length ; h++) {
                var config = handles[h].config;
                for(var c = 0 ; c < config.length ; c++) {
                   var res = this.findLayoutItem(name, config[c]);
                   if(res) return res;
                }
            }
        },

        findLayoutItem: function(name, item) {
            if(item.name === 'block' && item.attrs) {
                var attrs = item.attrs;
                for(var a = 0 ; a < attrs.length ; a++) {
                    if(name === attrs[a].name) return item;
                }
            }
            if(item.elems) {
                var elems = item.elems;
                for(var e = 0 ; e < elems.length ; e++) {
                    var res = this.findLayoutItem(name, elems[e]);
                    if(res) return res;
                }
            }
        },

        makeRootModel: function(data) {
            return {
                columns: [csscls('name'), csscls('type'), csscls('template')],
                headings: ['Name', 'Type', 'Template'],
                root: data
            };
        },

    });


    var editCustomizer = function(config) {
        this.config = config;
    };

    $.extend(editCustomizer.prototype, {
        
        forMimeType: function(mimeType) {
            switch(mimeType) {
                case 'text/xml': return new configCustomizer(this.config);
                default: return new nullCustomizer();
            }
        }
    });

    var configCustomizer = function(config) {
        this.config = config;
    };

    $.extend(configCustomizer.prototype, {
        customize: function(session) {
            var TokenIterator = require("ace/token_iterator");
            var iterator = new TokenIterator.TokenIterator(session, 0, 0);
            this.document(iterator);
        },

        // Inside tag, just had element name token
        // Call correct functions for any attributes in attr
        // Process up to end of element tag
        // Return true if element may contain children
        // i.e. not a self-closing tag
        attributes: function(iterator, attrs) {
            attrs = attrs || [];
            var token;
            while(token = iterator.stepForward()) {
                switch(token.type) {
                case 'entity.other.attribute-name.xml':
                    name = token.value;
                    break;
                case 'string.attribute-value.xml':
                    if(-1 !== $.inArray(name, attrs)) {
                        this[name + 'Attribute'](iterator);
                    }
                    break;
                case: 'meta.tag.punctuation.tag-close.xml':
                    return '>' === token.value;
                }
            }    
        },

        // Not inside tag
        // Find next tag name and call correct function for any elements names in elem
        // If not in elems and there is a def method then call that
        // Process up to and including close tag
        elements: function(iterator, elems, def) {
            elems = elems || [];
            var token;
            while(token = iterator.stepForward()) {
                switch(token.type) {
                case 'meta.tag.tag-name.xml':
                    if(-1 !== $.inArray(token.value, elems)) {
                        this[token.value + 'Element'](iterator);
                    } else if(def) {
                        def.bind(this)(iterator, token.value);
                    } else {
                        this.anyElem(iterator);
                    }
                    break;
                case 'meta.tag.punctuation.end-tag-open.xml':
                    this.endTag(iterator);
                }
            }
        },

        // Skip over unwanted element
        anyElem(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator);
            }
        },

        // Detected </ so skip past rest of end tag
        endTag(iterator) {
            iterator.stepForward(); // Element name
            iterator.stepForward(); // >
        },

        document: function(iterator) {
            for(var token = iterator.getCurrentToken() ; token !== null ; token = iterator.stepForward()) {
                if(token.value === 'layout' && token.type === 'meta.tag.tag-name.xml') {
                    layoutElement(iterator);
                    break;
                }
            }
        },

        layoutElement: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator, [], this.handleElement);
            }
        },

        handleElement: function(iterator, name) {
            if(this.attributes(iterator)) {
                var elems = (-1 !== $.inArray(name, this.getHandles()))
                             ? ['block', 'reference', 'remove']
                             : [];
                this.elements(iterator, elems);
            }
        },

        blockElement: function(iterator) {
            if(this.attributes(iterator, ['name', 'type', 'template'])) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },
        
        referenceElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },

        removeElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator);
            }
        },

        actionElement: function(iterator) {
            if(this.attributes(iterator, ['method', 'module', 'ifconfig'])) {
                this.elements(iterator, [], this.params);
            }
        },

        params: function(iterator, name) {
            if(this.attributes(iterator, ['helper'])) {
                this.elements(iterator);
            }
        },

        nameAttribute: function(iterator) {
            // TODO: Find name in config and link to marker
            // Load last referenced type
        },

        typeAttribute: function(iterator) {
            // TODO: marker linked to load type call
        },

        templateAttribute: function(iterator) {
            // TODO: Find temlklate in config and link to mrker
        },

        methodAttribute: function(iterator) {
            // TODO: Locate last referenced type and link to marker
        },

        moduleAttribute: function(iterator) {
            // TODO: marker linked to helper module, __ function
        },

        ifconfigAttribute: function(iterator) {
            // TODO: Marker linked to global config flag
        }
    });

    var nullCustomizer = function() {}

    $.extend(nullCustomizer.prototype, {
        customize: function(s) {}
    });
 
})(jQuery);
