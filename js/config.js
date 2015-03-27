/**
 * Configure requirejs 
 */
require.config({
    baseUrl: "/js/MageDebugBar",
    paths: {
        // Ace editor
        ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8",

        // Outstanding query with Ace team re: problems mapping theme urls
        "ace/theme/chrome": "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8/theme-chrome"
    },
    shim: {
        "ace/ace": {
            exports: "ace"
        }
    }
});
