/**
 * Responds to file resource loads from the server
 * by loading into the file viewer
 * Also responsible for creating a customizer for the file
 * if one is registered
 *
 * @module filehandler
 * @author Bob Davison
 * @version1.0
 */
define(['class'],

function(Class) {

    return Class.create({

        /**
         * Create a file handler which loads files into the given FileViewer
         *
         * @param {FileViewer} fileViewer - object that displays files
         */
        constructor: function(fileViewer) {
            this.fileViewer = fileViewer;
            this.customizer = [];
        },

        /**
         * Register a file view customizer for the given mime-type
         *
         * @param {String} mimetype   - mime type that custopmizer applies to
         * @param {Object} customizer - object to provie hot spot actions in file viewer
         */  
        registerCusomizer: function(mimetype, customizer) {
            this.customizers[mimetype] = customizer;
        },

        /**
         * Handles the file response from the server by loading the given file info
         * in the file viewer with any registered customizer for the mime-type
         *
         * See PHP method MageDebugBar\Ajax->_processFile()
         *
         * @param {Object} fileinfo - file information provided by the server
         */
        handle: function(fileinfo) {
            this.fileViewer.load(fileinfo, this.customizers[fileinfo['mime-type']]);
        }
    });
});
