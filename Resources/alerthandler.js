/**
 * Responds to alert responses from the server
 *
 * At the moment just uses Javascript alert to display the message
 *
 * @module alerthandler
 * @author Bob Davison
 * @version 1.0
 */
define(['class'],

function(Class) {

    return Class.create({

        /**
         * Display alert message provided by Ajax call to server
         *
         * See PHP method MageDebugBar\Ajax->_processFlag()
         *
         * @param {Object} alertinfo - Alert info returned from server
         */
        handle: function(alertinfo) {
            alert(alertinfo.message);
        }
    });
});
