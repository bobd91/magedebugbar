/**
 * requirejs doesn't play nicely with already loaded js resources,
 * and there is no reason it should, they are already loaded after all,
 * but is nice in requirejs world to use define to pass in dependencies
 * even if it is not responsible for loading them
 *
 * This is a mock of a pre-loaded PhpDebugBar just so it can play with requirejs
 */
define(function() { return PhpDebugBar; });
