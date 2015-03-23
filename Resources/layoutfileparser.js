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

        /**
         * Parser needs to look layout data in the model
         * and produces actions that load resources from the server
         */
        constructor: function(resourceLoader, layoutModel) {
            this.resourceloader = resourceLoader;
            this.layoutModel = layoutModel;
        },

        /**
         * Parse the token stream for a layout config file and build up array of actions
         * for each row in the document.
         * (Well, each row that has actions)
         *
         * @param {Ace/TokenIterator} iterator - iterator for token stream for entire file
         * @return {Array}                     - array of rows, each is action array for given row
         */
        parse: function(iterator) {
            this.actions = [];
            this.document(iterator);
            return this.actions;
        },

        /**
         * Parsing tag, expecting attributes
         *
         * Inside tag, just had element name token
         * Call correct functions for any attributes in attr
         * Call default function (if supplied) for any attributes not in attr
         * Process up to end of element tag
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {Array} attrs  - array of attribute names to process
         * @param {Function} def - default function to call for unprocessed attributes (optional)
         * @return {boolean} - true if element may contain children i.e. not a self-closing tag
         */
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

        /**
         * Parsing, expecting a start tag
         *
         * Find next tag name and call correct function for any elements names in elem
         * If not in elems and there is a def method then call that
         * Process up to and including close tag
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {Array} elems - array of element names to process
         * @param {Function} def - function to call for unspecified elements (optional)
         */
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

        /**
         * Opened an element so increase level
         */
        openElement: function() {
            this.level = this.level || 0;
            this.level++;
        },

        /**
         * Closed element so decrease level
         */
        closeElement: function() {
            this.level--;
            this.popBlockNames();
        },

        /**
         * Remove surrounding quotes from attribute value
         *
         * @param {String} attr - attribure value with surrounding quotes
         * @return {String}     - attribute value without surrounding quotes
         */
        attributeValue: function(attr) {
            return attr.slice(1, -1);
        },

        /**
         * Used as a default function for calls to the elements() method
         * to consume unwanted elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        anyElem: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator);
            }
        },

        /**
         * Detected </ so skip past rest of end tag
         *
         * @param {Ace/TokenIterator} - token stream
         */
        endTag: function(iterator) {
            iterator.stepForward(); // Element name
            iterator.stepForward(); // >
        },

        /**
         * Parse the whole document
         *
         * Only interested in documents with a '<layout>' element
         *
         * @param {Ace/TokenIterator} - token stream
         */
        document: function(iterator) {
            for(var token = iterator.getCurrentToken() ; token !== null ; token = iterator.stepForward()) {
                if(token.value === 'layout' && token.type === 'meta.tag.tag-name.xml') {
                    this.layoutElement(iterator);
                    break;
                }
            }
        },

        /**
         * Parse the layout element
         *
         * Expect handle elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        layoutElement: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator, [], this.handleElement);
            }
        },

        /**
         * Parse a handle element
         *
         * If a valid handle then expect block, refeence and remove elements
         * Otherwise create an action to disable this handle element in the FileView
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} handle     - name of handle element
         */
        handleElement: function(iterator, name) {
            if(this.attributes(iterator)) {
                if(this.layoutModel.validHandle(name)) {
                    this.elements(iterator, ['block', 'reference', 'remove']);
                } else {
                    this.disableHandle(iterator);
                }
            }
        },

        /**
         * Create and action to disable all rows for this handle element
         *
         * @param {Ace/TokenIterator} - token stream
         */
        disableHandle: function(iterator) {
            var row1 = iterator.getCurrentTokenRow();
            this.elements(iterator, []);
            var row2 = iterator.getCurrentTokenRow();

            this.addAction(row1, 0, row2, 0);
        },

        /**
         * Parsing a block element
         *
         * Expect attributes: type, template, before, after and module
         * Also lookout for name attribute as we have to note current block name for resolving ownership of actions
         *
         * Expect contained elements: block, action and remove elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        blockElement: function(iterator) {
            if(this.attributes(iterator, ['type', 'template', 'before', 'after', 'module'], this.checkBlockNameAttribute)) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },
        
        /**
         * Parsing a reference element
         *
         * Expect attribute: name
         * Expect contained elements: block, action and remove
         *
         * @param {Ace/TokenIterator} - token stream
         */
        referenceElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },

        /**
         * Parsing a remove element
         *
         * Expect attributes: name
         * Not expecting any contained elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        removeElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator);
            }
        },

        /**
         * Parsing an action element
         *
         * Expect attributes: method, module, ifconfig
         * All contained elements are parameter elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        actionElement: function(iterator) {
            if(this.attributes(iterator, ['method', 'module', 'ifconfig'])) {
                this.elements(iterator, [], this.paramsElement);
            }
        },

        /**
         * Parsing a parameter element for an action
         *
         * Expect attribute: helper
         * Not expecting contained elements
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of parameter element
         */
        paramsElement: function(iterator, name) {
            if(this.attributes(iterator, ['helper'])) {
                this.elements(iterator);
            }
        },

        /**
         * Parsed a name attribute
         *
         * Note the name for resolving ownership of action elements
         * Create an action to load the config file with this name
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of name attribute
         */
        nameAttribute: function(iterator, name) {
            this.pushBlockName(name);
            this.nameAction(iterator,  name);
        },

        /**
         * Special processing for name attribute of block element
         *
         * Need to note the name for resolving ownership of action elements
         * but do not want to create an action as clicking on a block name would just load itself
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of attribute
         * @param {String} value      - value of attribute
         */
        checkblocknameattribute: function(iterator, name, value) {
            if('name' === name) { // Only the name attribute
                this.pushBlockName(value);
            }
        },

        /**
         * Parsed a before attribute
         *
         * If it is a block name (not '-' or '*') then create a name loading action
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of before attribute
         */
        beforeAttribute: function(iterator, name) {
            if(name !== '-' && name !== '*') {
                this.nameAction(iterator, name);
            }
        },

        /**
         * Parsed an after attribute
         *
         * If it is a block name (not '-' or '*') then create a name loading action
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of after attribute
         */
        afterAttribute: function(iterator, name) {
            if(name !== '-' && name != '*') {
                this.nameAction(iterator, name);
            }
        },

        /**
         * Parsed a type attribute
         *
         * Create an action to load the class for this type (block alias)
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} type       - value of type attribute
         */
        typeAttribute: function(iterator, type) {
            this.newAction(iterator, type, this.willLoadBlockClass(type));
        },

        /**
         * Parsed a template attribute
         *
         * Get template path from layout config data and if it exists
         * create an action to load the file
         * If it doesn't exist then create an action to disable the template attribute
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} template   - value of template attribute
         */
        templateAttribute: function(iterator, template) {
            var file = this.layoutModel.findTemplateFile(template);
            var action = file
                    ? this.willLoadFile(file)
                    : null;
            this.newAction(iterator, template, action);
        },

        /**
         * Parsed a method attribute
         *
         * Create an action to load the class of the containing block with this method
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} method     - value of method attribute
         */
        methodAttribute: function(iterator, method) {
            var name = this.currentBlockName();
            this.newAction(iterator, method, this.willLoadBlockMethod(name, method));
        },

        /**
         * Parsed a module attribute
         *
         * These atributes are used for translation via the special method '__'
         * Create an action to load the helper class of this module with the method '__'
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} module     - value of module attribute
         */
        moduleAttribute: function(iterator, module) {
            this.newAction(iterator, module, this.willLoadHelperClass(module, '__'));
        },

        /**
         * Parsed an ifconfig attribute
         *
         * Create an action to load the value of the config flag
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} config     - value of ifconfig attribute
         */
        ifconfigAttribute: function(iterator, config) {
            this.newAction(iterator, config, this.willLoadStoreConfigFlag(config));
        },

        /**
         * Parsed a helper attribute
         *
         * Create an action to load the helper class/method
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} helper       - value of helper attribute
         */
        helperAttribute: function(iterator, helper) {
            this.newAction(iterator, helper, this.willLoadHelper(helper));
        },

        /**
         * Create an action to load the config file for the named block
         * Check with the layout block that the named block was configured
         * If not then make an action to displable the name attribute
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of block
         */
        nameAction: function(iterator, name) {
            var action = this.layoutModel.findBlock(name) 
                         ? this.willLoadBlock(name)
                         : null;
            this.newAction(iterator, name, action);
        },

        /**
         * @param {String} blockAlias - Magento alias for block class
         * @return {Function} - to load the block class file at the correct line for the class defn
         */
        willLoadBlockClass: function(blockAlias) {
            return this.resourceLoader.loadBlockClass.bind(this.resourceLoader, blockAlias);
        },

       /**
        * @param {String} file - Magento relative file path
        * @return {Function} - to load the specified file
        */
        willLoadFile: function(file) {
            return this.resourceLoader.loadFile.bind(this.resourceLoader, file);
        },

        /**
         * @param {String} blockName - name of a config block
         * @return {Function} - to load the config file containing the block at the correct line for the block
         */
        willLoadBlock: function(blockName) {
            return this.resourceLoader.loadBlock.bind(this.resourceLoader, blockName);
        },

        /**
         * @param {String} blockName - name of config block
         * @param {String} method    - name of method
         * @return {Function}        - to load the block class file at the correct line for the method
         */
        willLoadBlockMethod: function(blockName, method) {
            return this.resourceLoader.loadBlockMethod.bind(this.resourceLoader, blockName, method);
        },

        /**
         * @param {String} helper - helper class / helper method
         * @return {Function}     - load the helper class file at the correct line for the method
         */
        willLoadHelper: function(helper) {
            return this.resourceLoader.loadHelper.bind(this.resourceLoader, helper);
        }

        /**
         * @param {String} helperAlias - Magento alias for helper class
         * @param {String} method      - method of helper class
         * @return {Function}          - to load the helper class at the correct line for the method
         */
        willLoadHelperClass: function(helperAlias, method) {
            return this.resourceLoader.loadHelperClass.bind(this.resourceLoader, helperAlias, method);
        },

        /**
         * @param {String} flag - Magento store config flag
         * @return {Function}   - to load the value of the store config flag
         */
        willLoadStoreConfigFlag: function(flag) {
            return this.resourceLoader.loadStoreConfigFlag.bind(this.resourceLoader, flag);
        },
        
        /**
         * Create a new action for a hotspot on the current row to ocver the given text and runthe given function
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {String} text                - the document text to cover with hotspot
         * @param {Function} action            - the function to run if hotspot clicked (optional, default is disabled)
         */
        newAction: function(iterator, text, action) {
            var row = iterator.getCurrentTokenRow();
            var col1 = 1 + iterator.getCurrentTokenColumn();
            var col2 = col1 + text.length;
        
            this.addAction(row, col1, row, col2, action);
        },

        /**
         * Add an action to the action array for all rows between row1 and row2 (inclusive)
         *
         * If row1 !== row2 then hotspot area covers entire rows and cols 1 and 2 are ignored
         *
         * @param {integer} row1 - first row of hotspot
         * @param {integer} col1 - first col of hotspot
         * @param {integer} row2 - last row of hotspot
         * @param {integer} col2 - last col of hotspot
         * @param {Function} action - function to perform if hotspot clicked (optional, default is disabled)
         */
        addAction: function(row1, col1, row2, col2, action) {
            var type = (row1 === row2) ? "line" : "block";
            var data = { row1: row1, col1: col1, row2: row2, col2: col2, action: action, type: type};
            for(var row = row1 ; row <= row2 ; row++ ) {
                this.actions[row] = this.actions[row] || [];
                this.actions[row].push(data);
            }
        },

        /**
         * Set the new current block name
         *
         * Add the given name to the top of the block name pile
         *
         * @param {String} name - block name
         */
        pushBlockName: function(name) {
            this.blockNames = this.blockNames || [];
            this.blockNames.push({ name: name, level: this.level });
        },

        /**
         * Remove any old block names to restore the correct current block name 
         *
         * Remove from the top of the block name pile names added
         * at levels higher than the current level
         */
        popBlockNames: function() {
            this.blockNames = this.blockNames || [];
            while(this.blockNames.length && this.blockNames[this.blockNames.length - 1].level > this.level) {
                this.blockNames.pop();
            }
        },

        /**
         * Return the current block name 
         *
         * The name that is on the top of the block name pile
         * 
         * @return {String} - block name
         */
        currentBlockName: function() {
            return this.blockNames[this.blockNames.length - 1].name;
        }

    });
});

