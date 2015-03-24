/**
 * Provides a tab box for displaying files in an Ace editor
 * Each file gets its own closeable tab
 *
 * @module fileviewer
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class', 'tabbox', 'ace/ace', 'fileview'],

function($, Class, TabBox, Ace, FileView) {

    return Class.extend(TabBox, {

        /**
         * Create the FileViewer
         * Adds a contianer div to hold the Ace editor
         */
        constructor: function() {
            this.super.constructor.call(this);
            $('<div />').attr('id', 'fileviewer').addClass(this.activeClass()).appendTo(this.getContent());
        },

        /**
         * Append the container div to the container and create and
         * Ace editor component to go inside the container
         *
         * @param {jQuery} element - element to append to
         */
        appendTo: function(element) {
            this.super.appendTo.call(this, element);
            this.editor = Ace.edit('fileviewer');
            this.editor.setReadOnly(true);
            this.editor.setShowPrintMargin(false);
            //this.editor.setTheme("ace/theme/chrome");

            this.editor.on('mousemove', this.mousemoveCombiner());
            this.editor.on('click', this.click.bind(this));
        },

        /**
         * Load the given file, with customizer, into its own tab
         * If the file is already open then re-use that tab and set the desired line
         * otherwise create a new tabe
         *
         * In any case activate the tab once the file is loaded
         *
         * @param {Object} fileinfo   - file information from Ajax call to server
         * @prarm {Object} customizer - file view hot spot provider (optional)
         */
        load: function(fileinfo, customizer) {
            var tab = this.findTab(fileinfo.path);
            if(tab) {
                this.getTabContent(tab).setLine(fileinfo.line);
            } else {
                tab = this.addTab(new FileView(this.editor, fileinfo, customizer));
            }
            this.activateTab(tab);
        },

        /**
         * Resize the component, ensures that contained editor is resized
         */
        resize: function() {
            this.super.resize.call(this);
            if(this.editor) {
                this.editor.resize();
            }
        },

        /**
         * Mousemove processing is quite intensive as the location has to be
         * checked for customization so don't react to each mousemove but
         * rather coalesce all mousemoves within a 100ms time interval
         */
        mousemoveCombiner: function() {
            var moveEvent;
            this.timer = 0;
            return function(e) {
                    // Ignore multiple mousemoves but keep latest event
                    moveEvent = e;
                    if(!this.timer) {
                        this.timer = window.setTimeout(function () {
                            this.timer = 0;
                            this.mousemove(moveEvent);
                        }.bind(this), 100);
                    }
            }.bind(this);
        },

        /**
         * Pass mousemoves onto the active FileView component
         *
         * @param {Event} e - the mousemove event
         */
        mousemove: function(e) {
            var view = this.getActiveView();
            if(view) {
                view.mousemove(e);
            }
        },

        /**
         * Pass clicks ontp the active FileView component
         *
         * @param {Event} e - the click event
         */
        click: function(e) {
            var view = this.getActiveView();
            if(view) {
                view.click(e);
            }
        },

        /**
         * Find a tab with the given title
         * Used to locate files that already have a tab open
         *
         * @param {String} title - the tab title
         * @return {jQuery}      - the tab object or nothing if not found
         */
        findTab: function(title) {
            var tab = this.$tabs.children('li[title="' + title + '"]');
            if(tab.length) {
                return tab;
            }
        },

        /**
         * Get the currently active FileView component
         *
         * @return {FileView} - the active FileView or nothing if no active tabs
         */
        getActiveView: function() {
            var tab = this.$tabs.children('.tab-active');
            if(tab.length) {
                return this.getTabContent(tab);
            }
        },

    });


});

