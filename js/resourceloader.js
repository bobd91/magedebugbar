/**
 * Class responsible for requesting resources from the server
 * and passing the responses on to the correct handler
 *
 * @module resourceloader
 * @author Bob Davison
 * @version 1.0
 */
define(['class', 'promise'],

function(Class, Promise) {

    return Class.create({

        /**
         * Create loader
         *
         * Requires access to layout config data as some requests need additonal
         * config information
         *
         * @param {LayoutModel} - layout config data
         */
        constructor: function(layoutModel) {
            this.layoutModel = layoutModel;
            this.handlers = [];
        },

        /**
         * Register handler to handle responses from the server
         *
         * @param {Object} handler  - handler for one type of responses
         * @return {ResourceLoader} - self
         */
        registerHandler: function(handler) {
            this.handlers[handler.type] = handler;
            return this;
        },

        /**
         * Request value of store config flag
         *
         * @param {String} flag - store config flag
         */
        loadStoreConfigFlag: function(flag) {
            this.load("store=" + this.layoutModel.getStore() + "&config-flag=" + flag);
        },

        /**
         * Request file for block class and method
         *
         * @param {String} name   - Magento block alias
         * @param {String} method - method in block class
         */ 
        loadBlockClass: function(alias, method) {
           var qstring =  "block=" + alias;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        /**
         * Request file for helper class and method
         *
         * @param {String} name   - Magento block alias
         * @param {String} method - method in block class
         */ 
        loadHelperClass: function(alias, method) {
           var qstring =  "helper=" + alias;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        /**
         * Request file for helper class/method
         *
         * @param {string} helper - <helper class alias>/<method>
         */
        loadHelper: function(helper) {
            var h = this.layoutModel.splitHelper(helper);
            this.loadHelperClass(h.alias, h.method);
        },

        /**
         * Request file for block name and method
         *
         * Use layout config data to resolve block class alias from block name
         *
         * @param {String} name - block name
         * @param {String} method - method in block class
         */
        loadBlockMethod: function(name, method) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                var alias = block.attrs.type;
                this.loadBlockClass(alias, method);
            }
        },

        /**
         * Request template file
         *
         * Use layout config data to lookup template filename
         *
         * @param {String} template - Magento short template name
         */
        loadTemplate: function(template) {
            var file = this.layoutModel.findTemplateFile(template);
            if(file) {
                this.loadFile(file);
            }
        },

        /**
         * Request config file for named block
         * 
         * Use layout config data to lookup block details from block name
         *
         * @param {String} name - block name
         */ 
        loadBlock: function(name) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                this.loadFile(this.layoutModel.configFileName(block.file), block.line);
            }
        },

        /**
         * Request file at given line
         *
         * @param {String} file  - Magento relative file path
         * @param {integer} line - line number
         */
        loadFile: function(file, line) {
            var qstring = "file=" + file;
            if(line) {
               qstring += "&line=" + line;
            }
            this.load(qstring);
        },
           
       /**
        * Send request to server with given query string
        * and wait (async) for response
        *
        * @param {String} qstring - query string
        */ 
        load: function(qstring) {
            this.get(qstring)
                .then(function(response) {
                    this.handleResponse(JSON.parse(response));
                }.bind(this))
                .catch(function(err) {
                    console.error(err);
                });
        },

        /**
         * Pass the server response onto the correct handler
         * Handler determined by response type
         *
         * @param {Object} response - response from server
         */
        handleResponse: function(response) {
            var handler = this.handlers[response.type];
            if(handler) {
                handler.handle(response);
            } else {
                console.error('Unhandled response from host', response);
            }
        },


        /**
         * Low level Ajax call handling
         *
         * Modified from http://www.html5rocks.com/en/tutorials/es6/promises/
         *
         * @param {String} qstring - query string to send with Ajax request
         * @return {Promise}       - Javascript promise that yeilds response when resolved
         */
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

    });

});


