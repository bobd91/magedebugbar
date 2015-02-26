var FileViewer = 
    (function($) {

    function FileViewer(customizer) {
        this.customizer = customizer;
    }

    $.extend(FileViewer.prototype, {

        appendTo: function(element) {
            var container = $('<div />').attr('id', 'fileviewer').appendTo(element);
            this.editor = ace.edit('fileviewer');
            this.editor.setTheme("ace/theme/chrome");
        },

        load: function(file, line) {
            var url = "file=" + file;
            if(line) {
                url += "&line=" + line;
            }
            this.get(url)
                .then(function(response) {
                    this.loadResponse(JSON.parse(response));
                }.bind(this))
                .catch(function(err) {
                    console.err(err);
                });
        },

        loadResponse: function(response) {
            var mimeType = response['mime-type'];
            var mode;
            switch(mimeType) {
                case "text/x-php": mode = "php"; break;
                case "text/xml": mode = "xml"; break;
                default: mode = "text";
            }
            this.editor.getSession().setMode("ace/mode/" + mode);
            this.editor.getSession().on('tokenizerUpdate', function() {
                this.customizer.forMimeType(mimeType).customize(this.editor.getSession());
            }.bind(this));
            this.editor.setValue(response.content);
            var line = response.line ? response.line : 1;
            this.editor.gotoLine(line);
            this.editor.scrollToLine(line - 1, false, false);
        },

        get: function(qstring) {
            return new Promise(function(resolve, reject) {
                var req = new XMLHttpRequest();
                req.open('GET', '/magedebug.php?' + qstring);

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
        }
    });

    return FileViewer;

})(jQuery);

