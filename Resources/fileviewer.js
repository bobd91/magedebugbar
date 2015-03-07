(function($) {


    FileViewer = Class.extend(TabBox, {

        constructor: function() {
            this.super.constructor.call(this);
            $('<div />').attr('id', 'fileviewer').addClass('tab-active').appendTo(this.$content);
        },

        appendTo: function(element) {
            this.super.appendTo.call(this, element);
            this.editor = ace.edit('fileviewer');
            this.editor.setReadOnly(true);
            this.editor.setShowPrintMargin(false);
            this.editor.setTheme("ace/theme/chrome");

            this.editor.on('mousemove', this.mousemoveCombiner());
            this.editor.on('click', this.click.bind(this));
        },

        load: function(fileinfo, customizer) {
            var tab = this.findTab(fileinfo.path);
            if(tab) {
                this.getContent(tab).setLine(fileinfo.line);
            } else {
                tab = this.addTab(new FileView(this.editor, fileinfo, customizer));
            }
            this.activateTab(tab);
        },

        resize: function() {
            this.super.resize.call(this);
            if(this.editor) {
                this.editor.resize();
            }
        },

        mousemoveCombiner: function() {
            var moveEvent;
            this.timer = 0;
            return function(e) {
                    // Ignore multiple mousemoves with 10th of a second
                    // but keep latest event
                    moveEvent = e;
                    if(!this.timer) {
                        this.timer = window.setTimeout(function () {
                            this.timer = 0;
                            this.mousemove(moveEvent);
                        }.bind(this), 100);
                    }
            }.bind(this);
        },

        mousemove: function(e) {
            var view = this.getActiveView();
            if(view) {
                view.mousemove(e);
            }
        },

        click: function(e) {
            var view = this.getActiveView();
            if(view) {
                view.click(e);
            }
        },

        findTab: function(title) {
            var tab = this.$tabs.children('li[title="' + title + '"]');
            if(tab.length) {
                return tab;
            }
        },

        getActiveView: function() {
            var tab = this.$tabs.children('.tab-active');
            if(tab.length) {
                return this.getContent(tab);
            }
        },

    });

    FileView = Class.create({
        constructor: function(editor, fileinfo, customizer) {
            this.label = this.filename(fileinfo.path);
            this.title = fileinfo.path
            this.closeable = true, 
            this.editor = editor;
            this.fileinfo = fileinfo;
            if(!customizer) {
                // No custom behaviour so need to respond to
                // mouse hover or click for custom event
                this.mousemove = this.click = function() {};
            } else {
                this.customizer = customizer;
            }

            this.setLine(fileinfo.line);
        },

        add: function() {
            var mode;
            switch(this.fileinfo['mime-type']) {
                case "text/x-php": mode = "php"; break;
                case "text/xml": mode = "xml"; break;
                default: mode = "text";
            }
            this.session = ace.createEditSession(this.fileinfo.content, "ace/mode/" + mode);
        },

        activate: function() {
            this.editor.setSession(this.session);
            this.gotoLine();
        },

        remove: function() { },

        gotoLine: function() {
            if(this.line) {
                this.editor.gotoLine(this.line);
                this.editor.scrollToLine(this.line -1, false, false);
                delete this.line;
            }
        },

        setLine: function(line) {
            this.line = line;
        },

        // Modified from https://github.com/ajaxorg/ace/blob/master/demo/kitchen-sink/token_tooltip.js
        mousemove: function(e) {
            var r = this.editor.renderer;
            var canvasPos = r.rect = r.scroller.getBoundingClientRect();
            var offset = (e.clientX + r.scrollLeft - canvasPos.left - r.$padding) / r.characterWidth;
            var row = Math.floor((e.clientY + r.scrollTop - canvasPos.top) / r.lineHeight);
            var col = Math.round(offset);

            var screenPos = {row: row, column: col, side: offset - col > 0 ? 1 : -1};
            var session = this.session;
            var docPos = session.screenToDocumentPosition(screenPos.row, screenPos.column);
            var token = session.getTokenAt(docPos.row, docPos.column);

            if(token === this.token) {
                return;
            }
            this.token = token;


            if(this.marker) {
                if(this.inMarker(this.marker, docPos)) {
                    return;
                }
                session.removeMarker(this.marker);
                this.marker = null;
            }

            var custom = token
                ? this.customizer.atPosition(session, token, docPos)
                : null;
                if(custom) {
                    var Range = require("ace/range").Range;
                    var range = new Range(custom.row1, custom.col1, custom.row2, custom.col2);
                    var css = "magedebugbar-fileviewer-" + (custom.action ? "action" : "disabled");
                    var type = (custom.type === 'block') ? "fullLine" : "text";
                    this.marker = session.addMarker(range, css, type, true);
                    this.action = custom.action;
                } else {
                    this.action = null;
                }
        },

        click: function() {
            if(this.action) {
                this.action();
            }
        },

        inMarker: function(markerId, pos) {
            // WARNING:
            // No public way to get marker info from marker id
            // Using session.$frontMarkers is private API
            // and therefore subject to change
            var marker = this.editor.getSession().$frontMarkers[markerId];
            if(marker) {
                return marker.range.contains(pos.row, pos.column);
            }
            return false;
        },

        filename: function(path) {
            return path.substr(1 + path.lastIndexOf('/'));
        }

    });

})(jQuery);

