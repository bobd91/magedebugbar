/**
 * requirejs doesn't play nicely with already loaded js resources,
 * and there is no reason it should, they are already loaded after all,
 * but is nice in requirejs world to use define to pass in dependencies
 * even if it is not responsible for loading them
 *
 * PhpDebugBar will remove the global jQuery at the end of its processing
 * but it keeps a copy for itself which we can access
 */
define(['phpdebugbar'], function(PhpDebugBar) { return PhpDebugBar.$; });
