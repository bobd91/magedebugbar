/**
 * Recursive descent parser for the Ace Editor token stream from a complete Layout Config XML file
 * Produces actions which define an area of the file and what should be done with it.
 *
 * Generates an array of actions grouped by the row of the file
 * [row] => array of actions for that row of the file
 *
 * Where each action is:
 * {
 *  row1: first row of file for action
 *  col1: first col of file for action
 *  row2: second row of file for action
 *  col2: second col of file for action
 *  type: 'line' for action to be between col1 and col2 on same line
 *        'block' for action to cover whole lines
 *  action: function to perform action (optional, missing action implies disabled area of file)
 * }
 *
 * @module layoutfileparser
 * @author Bob Davison
 * @version 1.0
 */
define(['class'],

function(Class) { 

    return Class.create({

        constructor: function(resourceLoader, layoutModel) {
            this.resourceloader = resourceLoader;
            this.layoutModel = layoutModel;
        },

        // ace/token_iterator
        parse: function(iterator) {
            this.actions = [];
            this.document(iterator);
            return this.actions;
        },

        validHandle: function(handle) {
            return this.layoutModel.getHandle(handle);
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
                    if(-1 !== attrs.indexOf(name)) {
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
                    if(-1 !== elems.indexOf(token.value)) {
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
            this.nameAction(iterator,  name);
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
                this.nameAction(iterator, name);
            }
        },

        afterAttribute: function(iterator, name) {
            if(name !== '-' && name != '*') {
                this.nameAction(iterator, name);
            }
        },

        typeAttribute: function(iterator, type) {
            this.newAction(iterator, type, this.willLoadBlockClass(type));
        },

        templateAttribute: function(iterator, template) {
            var file = this.layoutModel.findTemplateFile(template);
            var action = file
                    ? this.willLoadFile(file)
                    : null;
            this.newAction(iterator, template, action);
        },

        methodAttribute: function(iterator, method) {
            var name = this.currentBlockName();
            this.newAction(iterator, method, this.willLoadBlockMethod(name, method));
        },

        moduleAttribute: function(iterator, module) {
            this.newAction(iterator, module, this.willLoadHelperClass(module, '__'));
        },

        ifconfigAttribute: function(iterator, config) {
            this.newAction(iterator, config, this.willLoadStoreConfigFlag(config));
        },

        helperAttribute: function(iterator, helper) {
            this.newAction(iterator, helper, this.willLoadHelper.(helper));
        },

        nameAction: function(iterator, name) {
            var action = this.layoutModel.findBlock(name) 
                         ? this.willLoadBlock(name)
                         : null;
            this.newAction(iterator, name, action);
        },

        willLoadBlockClass: function(blockAlias) {
            return this.resourceLoader.loadBlockClass.bind(this.resourceLoader, blockAlias);
        },

        willLoadFile: function(file) {
            return this.resourceLoader.loadFile.bind(this.resourceLoader, file);
        },

        willLoadBlock: function(blockName) {
            return this.resourceLoader.loadBlock.bind(this.resourceLoader, blockName);
        },

        willLoadBlockMethod: function(blockName, method) {
            return this.resourceLoader.loadBlockMethod.bind(this.resourceLoader, blockName, method);
        },

        willLoadHelper: function(helper) {
            return this.resourceLoader.loadHelper.bind(this.resourceLoader, helper);
        }

        willLoadHelperClass: function(helperAlias, method) {
            return this.resourceLoader.loadHelperClass.bind(this.resourceLoader, helperAlias, method);
        },

        willLoadStoreConfigFlag: function(flag) {
            return this.resourceLoader.loadStoreConfigFlag.bind(this.resourceLoader, flag);
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
});

