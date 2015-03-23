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
            this.customizers = [];
        },

        /**
         * Resource request response type to handle
         */
        type: 'file',

        /**
         * Register a function that creates file view customizers for a given mime-type
         *
         * @param {Function} customizer - to create object that provides hot spot actions in file viewer
         * @return {FileHandler}        - self
         */  
        registerCusomizer: function(customizer) {
            this.customizers[customizer.mimetype] = customizer;
            return this;
        },

        /**
         * Handles the file response from the server by loading the given file info
         * in the file viewer with any registered customizer for the mime-type
         *
         * Note: we use the registered customizer as a prototype of the one
         * to pass to the file viewer as customizers store per file state.
         *
         * See PHP method MageDebugBar\Ajax->_processFile()
         *
         * @param {Object} fileinfo - file information provided by the server
         */
        handle: function(fileinfo) {
            var customizer = this.customizers[fileinfo['mime-type']];
            if(customizer) {
                this.fileViewer.load(fileinfo, Object.create(customizer));
            } else {
                this.fileViewer.load(fileinfo);
            }
        }
    });
});
