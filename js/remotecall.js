/**
 * Make request to any listening editor to open the file
 * at the given line.
 *
 * Protocol specified at https://github.com/Zolotov/RemoteCall#readme
 *
 * A RemoteCall plugin is supplied for IntelliJ editors, like PHPStorm
 * and PHPStorm is a very popular IDE for Magento developers
 *
 * @module remotecall
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery'],

function($) {

    return {

        open: function(path, line) {
            // Fire and forget
            $.get("http://localhost:8091?message=" + path + ":" + line);
        }
    };
});
