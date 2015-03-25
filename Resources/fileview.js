/**
 * A TabBox content panel that displays a file in a readonly Ace editor session
 *
 * Also accepts a customizer object that is informed of the Ace editor tokens
 * and mouse movements so that it can provide 'hot spots' on the file
 * for various actions.
 *
 * @module fileview
 * @author Bob Davison
 * @version 1.0
 */
define(['class', 'tabcontent', 'cssclass', 'ace/ace'], 

function(Class, TabContent, CssClass, Ace) {

    var cssClass = CssClass.generate('fileview', ['action', 'disabled']); 

    var Range = require('ace/range');
    var TokenIterator = require('ace/token_iterator');

    return Class.extend(TabContent, {

        /**
         * Create tab content
         * Note: this does not add a ui component as the 
         *       Ace editor is shared by all tabs
         * 
         * @param {Ace} editor            - the Ace editor
         * @param {Object} fileinfo       - file response sent by server
         * @param {Customizer} customizer - provider for custom hotspots (optional)
         */
        constructor: function(editor, fileinfo, customizer) {
            this.super.constructor.call(this,
                    this.filename(fileinfo.path), // label
                    null,                         // no $ui
                    true,                         // closeable
                    fileinfo.path                 // title
            );
            this.editor = editor;
            this.fileinfo = fileinfo;
            if(!customizer) {
                // No custom behaviour so no need to respond to
                // mouse hover or click for custom event
                this.mousemove = this.click = function() {};
            } else {
                this.customizer = customizer;
            }

            this.setLine(fileinfo.line);
        },

        /**
         * Tab added to TabBox, create a new session for our file
         */
        add: function() {
            var mode;
            switch(this.fileinfo['mime-type']) {
                case "text/x-php": mode = "php"; break;
                case "text/xml": mode = "xml"; break;
                default: mode = "text";
            }

            this.session = Ace.createEditSession(this.fileinfo.content, "ace/mode/" + mode);

            // Do not try to acces tokens until background tokenizer has completed 
            // Do not woory about multiple events as we only have read only views 
            // so no retokenization
            if(this.customizer) {
                this.session.on('tokenizerUpdate', function() {
                    this.customizer.setTokens(new TokenIterator.TokenIterator(this.session, 0, 0));
                    this.setTokens = true;
                }.bind(this));
            }
        },

        /**
         * Tab activated, set our session on the Ace editor
         */
        activate: function() {
            this.editor.setSession(this.session);
            this.gotoLine();
        },

        /**
         * Tab removed, nothing to do as we don't have our own ui to remove
         */
        remove: function() { },

        /**
         * Goto the line specified in fileinfo.line 
         * then remove fileinfo.line so we don't keep
         * going back there
         */
        gotoLine: function() {
            if(this.line) {
                this.editor.gotoLine(this.line);
                this.editor.scrollToLine(this.line -1, false, false);
                delete this.line;
            }
        },

        /**
         * Set a new fileinfo.line 
         * Used when user selects a new object on a file
         * that is already displayed 
         */
        setLine: function(line) {
            this.line = line;
        },

        // Modified from https://github.com/ajaxorg/ace/blob/master/demo/kitchen-sink/token_tooltip.js
        /**
         * Check with customizer if mouse is over a hotspot so that an indicator can
         * be displayed and the action set ready for a mouseclick
         *
         * @param {Event} e - the mousemove event
         */
        mousemove: function(e) {
            // Do not process mousemoves until we have got all of the tokens 
            if(!this.setTokens) return;

            var r = this.editor.renderer;
            var canvasPos = r.rect = r.scroller.getBoundingClientRect();
            var offset = (e.clientX + r.scrollLeft - canvasPos.left - r.$padding) / r.characterWidth;
            var row = Math.floor((e.clientY + r.scrollTop - canvasPos.top) / r.lineHeight);
            var col = Math.round(offset);

            var screenPos = {row: row, column: col, side: offset - col > 0 ? 1 : -1};
            var session = this.session;
            var docPos = session.screenToDocumentPosition(screenPos.row, screenPos.column);
            var token = session.getTokenAt(docPos.row, docPos.column);

            // If still on same token then relevent customization
            // will already have taken place
            if(token === this.token) {
                return;
            }
            this.token = token;


            // If we were in a marker last time then
            //   exit if still in same marker
            //   remove marker if not
            if(this.marker) {
                if(this.inMarker(this.marker, docPos)) {
                    return;
                }
                session.removeMarker(this.marker);
                this.marker = null;
            }
            
            // Check for customization at this token/position
            this.customize(token, docPos);
        },

        /**
         * Check customizer for any custom hotspot/action
         * Only bother checking if currently on a token
         *
         * If customization found then mark the relevent hotspot
         * and record the action for possible mouseclick
         *
         * @param {Ace/Token} token - the token under the mouse
         * @param {Position} pos    - the mouse position on the document
         */
        customize: function(token, pos) {
            var custom = token
                ? this.customizer.getAction(token, pos)
                : null;
            if(custom) {
                var range = new Range.Range(custom.row1, custom.col1, custom.row2, custom.col2);
                var css = custom.action ? cssClass.action : cssClass.disabled;
                var type = (custom.type === 'block') ? "fullLine" : "text";
                this.marker = this.session.addMarker(range, css, type, true);
                this.action = custom.action;
            } else {
                this.action = null;
            }
        },

        /**
         * React to mouse click, if there is a custom action then perform it
         */
        click: function() {
            if(this.action) {
                this.action();
            }
        },

        /**
         * Test if current mouse position in inside the given marker
         *
         * @param {integer} markerid - id of the marker to test
         * @param {Position} pos     - the position in the document of the mouse
         * @return {boolean}         - true if in marker, otherwise false
         */
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

        /**
         * Extract filename part from given path
         *
         * @param {String} path - file path with directories
         * @return {String}     - file name without directories
         */
        filename: function(path) {
            return path.substr(1 + path.lastIndexOf('/'));
        }

    });
});
