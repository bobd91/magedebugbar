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
                this.resize();
            }.bind(this);

            var mouseup = function() {
                this.$el.off('mousemove', mousemove).off('mouseup', mouseup);
                this.$el.css('cursor', orig_cursor);
            }.bind(this);

            // Resize contents when phpdebugbar splitter is moved 
            // Unfortunately we want to resize after phpdebugbar but
            // it doesn't fire any events and we have no way if knowing
            // if our mousemove listener will fire before or after its
            // So we have to make sure we put an event on the end of the queue
            $('.phpdebugbar-drag-capture').on('mousemove', function(e) {
                window.setTimeout(function() {
                    this.resize();
                }.bind(this), 0);
            }.bind(this));

            this.bindAttr('data', function(data) {
                this.data = data;
                this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());

                this.$left.children().remove();
                this.$right.children().remove();

                this.layoutviewer = new LayoutViewer(this, data);
                this.fileviewer = new FileViewer();
                this.layoutviewer.appendTo(this.$left);
                this.fileviewer.appendTo(this.$right);
            });
        },

        resize: function() {
                this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());
                if(this.layoutviewer) this.layoutviewer.resize();
                if(this.fileviewer) this.fileviewer.resize();
        },
 

        findBlock: function(name) {
            var handles = this.data.config.handles;
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
                var attrs = elem.attrs;
                for(var i = 0 ; i < attrs.length ; i++) {
                    if(name === attrs[i].name) return elem;
                }
            }
            return this.findBlockInElems(name, elem.elems);
        },

        findAttr: function(name, attrs) {
            for(var a = 0 ; a < attrs.length ; a++) {
                if(name in attrs[a]) {
                    return attrs[a][name];
                }
            }
        },

        makeRootModel: function(data) {
            return {
                values: ['name', 'type', 'template'],
                children: 'blocks',
                columns: [csscls('name'), csscls('type'), csscls('template')],
                headings: ['Name', 'Type', 'Template'],
                root: data
            };
        },

        loadStoreConfigFlag: function(flag) {
            this.load("store=" + this.data.store + "&config-flag=" + flag);
        },

        loadBlockClass: function(name, method) {
           var qstring =  "block=" + name;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        loadHelperClass: function(name, method) {
           var qstring =  "helper=" + name;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        // Helper comes as <helper class alias>/method
        loadHelper: function(helper) {
            var bits = helper.split('/');
            var alias = bits.slice(0, -1).join('/');
            var method = bits[bits.length - 1];
            this.loadHelperClass(alias, method);
        },

        // Block name and method
        // Use config to resolve block name to block type
        loadBlockMethod: function(name, method) {
            var block = this.findBlock(name);
            if(block) {
                var alias = this.findAttr('type', block.attrs);
                this.loadBlockClass(alias, method);
            }
        },

        loadTemplate: function(template) {
            var file = this.findTemplateFile(template);
            if(file) {
                this.loadFile(file);
            }
        },

        // Load block in layout config
        loadBlock: function(name) {
            var block = this.findBlock(name);
            if(block) {
                this.loadFile(this.configFileName(block.file), block.line);
            }
        },

        findTemplateFile: function(template, config) {
            config = config || [this.data.blocks];
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
            return this.data.config.files[fileNo];
        },

        loadFile: function(file, line) {
            var qstring = "file=" + file;
            if(line) {
               qstring += "&line=" + line;
            }
            this.load(qstring);
        },
            
        load: function(qstring) {
            this.get(qstring)
                .then(function(response) {
                    this.loadResponse(JSON.parse(response));
                }.bind(this))
                .catch(function(err) {
                    console.err(err);
                });
        },

        loadResponse: function(response) {
            switch(response.type) {
            case 'file': this.fileviewer.load(response, this.viewHandler(response['mime-type'])); break;
            case 'alert': alert(response.message);  break;
            }
        },

        // Modified from http://www.html5rocks.com/en/tutorials/es6/promises/
        get: function(qstring) {
            return new Promise(function(resolve, reject) {
                var req = new XMLHttpRequest();
                req.open('GET', '/magedebugbar.php?' + qstring);

                req.onload = function() {
                    // This is called even on 404 etc
                    // so check the status
                    if (req.status == 200) {
                        // Resolve the promise with the response text
                        resolve(req.response);
                    }
                    else {
                        // Otherwise reject with the status text
                        // which will hopefully be a meaningful error
                        reject(Error(req.statusText));
                    }
                };

                // Handle network errors
                req.onerror = function() {
                    reject(Error("Network Error"));
                };

                // Make the request
                req.send();
            });
        },

        viewHandler: function(mimeType) {
            if(mimeType === 'text/xml') {
                return new LayoutViewHandler(this);
            }
        }

    });


    var LayoutViewHandler = function(layout) {
        this.layout = layout;
    };

    $.extend(LayoutViewHandler.prototype, {
        atPosition: function(session, token, pos) {
            var action = this.findAction(session, pos);
            if(action) {
                if(action.type === 'block' || token.type === 'string.attribute-value.xml') {
                    return action;
                }
            }
        },

        findAction: function(session, pos) {
            var actions = this.getActions(session);
            var row = pos.row;
            var rowActions = actions[row];
            if(rowActions) {
                var col = pos.column;
                var len = rowActions.length;
                for(var i = 0 ; i < len ; i++) {
                    var action = rowActions[i];
                    // Block actions only have to be on correct row
                    if(action.type === 'block') {
                        return action;
                    }
                    // Odd token recognition by Ace editor
                    // We have to allow extra column at
                    // the end but not at the beginning
                    if(col > action.col2 + 1) {
                        continue;
                    } else if(col >= action.col1) {
                        return action;
                    } else {
                        break;
                    }
                }
            }
        },

        getActions: function(session) { 
            if(!this.actions) {
                this.initActions(session);
            }
            return this.actions;
        },

        initActions: function(session) {
            this.actions = [];
            this.session = session;
            var TokenIterator = require("ace/token_iterator");
            var iterator = new TokenIterator.TokenIterator(session, 0, 0);
            this.document(iterator);
        },

        validHandle: function(handle) {
            return this.layout.data.config.handles.some(function(v) {
                return handle === v.name;
            });
        },

        // Inside tag, just had element name token
        // Call correct functions for any attributes in attr
        // Process up to end of element tag
        // Return true if element may contain children
        // i.e. not a self-closing tag
        attributes: function(iterator, attrs, def) {
            attrs = attrs || [];
            var token;
            while(token = iterator.stepForward()) {
                switch(token.type) {
                case 'entity.other.attribute-name.xml':
                    name = token.value;
                    break;
                case 'string.attribute-value.xml':
                    var val = this.attributeValue(token.value);
                    if(-1 !== $.inArray(name, attrs)) {
                        this[name + 'Attribute'](iterator, val);
                    } else if(def) {
                        def.bind(this)(iterator, name, val);
                    }
                    break;
                case 'meta.tag.punctuation.tag-close.xml':
                    var open = '>' === token.value;
                    if(!open) {
                        this.closeElement();
                    }
                    return open;
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
                    this.openElement();
                    if(-1 !== $.inArray(token.value, elems)) {
                        this[token.value + 'Element'](iterator);
                    } else if(def) {
                        def.bind(this)(iterator, token.value);
                    } else {
                        this.anyElem(iterator);
                    }
                    break;
                case 'meta.tag.punctuation.end-tag-open.xml':
                    this.closeElement();
                    this.endTag(iterator);
                    return;
                }
            }
        },

        openElement: function() {
            this.level = this.level || 0;
            this.level++;
        },

        closeElement: function() {
            this.level--;
            this.popBlockNames();
        },

        // Remove surrounding quotes from attribute value
        attributeValue: function(attr) {
            return attr.slice(1, -1);
        },

        // Skip over unwanted element
        anyElem: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator);
            }
        },

        // Detected </ so skip past rest of end tag
        endTag: function(iterator) {
            iterator.stepForward(); // Element name
            iterator.stepForward(); // >
        },

        document: function(iterator) {
            for(var token = iterator.getCurrentToken() ; token !== null ; token = iterator.stepForward()) {
                if(token.value === 'layout' && token.type === 'meta.tag.tag-name.xml') {
                    this.layoutElement(iterator);
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
                if(this.validHandle(name)) {
                    this.elements(iterator, ['block', 'reference', 'remove']);
                } else {
                    this.disableHandle(iterator);
                }
            }
        },

        disableHandle: function(iterator) {
            var row1 = iterator.getCurrentTokenRow();
            this.elements(iterator, []);
            var row2 = iterator.getCurrentTokenRow();

            this.addAction(row1, 0, row2, 0);
        },

        blockElement: function(iterator) {
            if(this.attributes(iterator, ['type', 'template', 'before', 'after', 'module'], this.checkBlockNameAttribute)) {
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
                this.elements(iterator, [], this.paramsElement);
            }
        },

        paramsElement: function(iterator, name) {
            if(this.attributes(iterator, ['helper'])) {
                this.elements(iterator);
            }
        },

        nameAttribute: function(iterator, name) {
            this.pushBlockName(name);
            this.newAction(iterator, name, this.layout.loadBlock.bind(this.layout, name)); 
        },

        // special for block names as we need to push the block name
        // but not add an action
        checkBlockNameAttribute: function(iterator, name, value) {
            if('name' === name) { // Only the name attribute
                this.pushBlockName(value);
            }
        },

        beforeAttribute: function(iterator, name) {
            if(name !== '-' && name !== '*') {
                this.newAction(iterator,  name, this.layout.loadBlock.bind(this.layout, name));
            }
        },

        afterAttribute: function(iterator, name) {
            if(name !== '-' && name != '*') {
                this.newAction(iterator, name, this.layout.loadBlock.bind(this.layout, name));
            }
        },

        typeAttribute: function(iterator, type) {
            this.newAction(iterator, type, this.layout.loadBlockClass.bind(this.layout, type));
        },

        templateAttribute: function(iterator, template) {
            var file = this.layout.findTemplateFile(template);
            var action = file
                    ? this.layout.loadFile.bind(this.layout, file)
                    : null;
            this.newAction(iterator, template, action);
        },

        methodAttribute: function(iterator, method) {
            var name = this.currentBlockName();
            this.newAction(iterator, method, this.layout.loadBlockMethod.bind(this.layout, name, method));
        },

        moduleAttribute: function(iterator, module) {
            this.newAction(iterator, module, this.layout.loadHelperClass.bind(this.layout, module, '__'));
        },

        ifconfigAttribute: function(iterator, config) {
            this.newAction(iterator, config, this.layout.loadStoreConfigFlag.bind(this.layout, config));
        },

        helperAttribute: function(iterator, helper) {
            this.newAction(iterator, helper, this.layout.loadHelper.bind(this.layout, helper));
        },

        newAction: function(iterator, text, action) {
            var row = iterator.getCurrentTokenRow();
            var col1 = 1 + iterator.getCurrentTokenColumn();
            var col2 = col1 + text.length;
        
            this.addAction(row, col1, row, col2, action);
        },

        addAction: function(row1, col1, row2, col2, action) {
            var type = (row1 === row2) ? "line" : "block";
            var data = { row1: row1, col1: col1, row2: row2, col2: col2, action: action, type: type};
            for(var row = row1 ; row <= row2 ; row++ ) {
                this.actions[row] = this.actions[row] || [];
                this.actions[row].push(data);
            }
        },

        addDisabledAction: function(row1, col1, row2, col2) {
        },

        pushBlockName: function(name) {
            this.blockNames = this.blockNames || [];
            this.blockNames.push({ name: name, level: this.level });
        },

        popBlockNames: function() {
            this.blockNames = this.blockNames || [];
            while(this.blockNames.length && this.blockNames[this.blockNames.length - 1].level > this.level) {
                this.blockNames.pop();
            }
        },

        currentBlockName: function() {
            return this.blockNames[this.blockNames.length - 1].name;
        }

    });

})(jQuery);
