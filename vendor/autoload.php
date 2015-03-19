<?php

/**
 * Simple autoloader for testing
 *
 * Can't use default as we are using uppercase
 * names in files and default forces lowercase
 */
spl_autoload_register(
    function($class) {
        $file = str_replace('\\', '/', $class) . '.php';
        if(file_exists($file)) {
            include($file);
        }
    }
);
