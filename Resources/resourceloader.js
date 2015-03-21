/**
 * Class responsible for requesting resources from the server
 * and passing the responses on to the correct handler
 *
 * @module resourceloader
 * @author Bob Davison
 * @version 1.0
 */
define(['class'],

function(Class) {

    return Class.create({

        constructor: function(fileHandler, alertHandler, layoutModel) {
            this.fileHandler = fileHandler;
            this.alertHandler = alertHandler;
            this.layoutModel = layoutModel;
        },

        loadStoreConfigFlag: function(flag) {
            this.load("store=" + this.layoutModel.getStore() + "&config-flag=" + flag);
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
            var h = this.layoutModel.splitHelper(helper);
            this.loadHelperClass(h.alias, h.method);
        },

        // Block name and method
        // Use config to resolve block name to block type
        loadBlockMethod: function(name, method) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                var alias = block.attrs.type;
                this.loadBlockClass(alias, method);
            }
        },

        loadTemplate: function(template) {
            var file = this.layoutModel.findTemplateFile(template);
            if(file) {
                this.loadFile(file);
            }
        },

        // Load block in layout config
        loadBlock: function(name) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                this.loadFile(this.layoutModel.configFileName(block.file), block.line);
            }
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
            case 'file': this.fileHandler.handle(response); break;
            case 'alert': this.alertHandler.handle(response);  break;
            }
        },

        // Modified from http://www.html5rocks.com/en/tutorials/es6/promises/
        get: function(qstring) {
            return new Promise(function(resolve, reject) {
                var req = new this.xhr();
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

        xhr: XMLHttpRequest,
    });

});


