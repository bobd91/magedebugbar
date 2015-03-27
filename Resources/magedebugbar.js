(function() {/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.16 Copyright (c) 2010-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.16',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("requireLib", function(){});

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

define("config", function(){});

/**
 * requirejs doesn't play nicely with already loaded js resources,
 * and there is no reason it should, they are already loaded after all,
 * but is nice in requirejs world to use define to pass in dependencies
 * even if it is not responsible for loading them
 *
 * This is a mock of a pre-loaded PhpDebugBar just so it can play with requirejs
 */
define('phpdebugbar',[],function() { return PhpDebugBar; });

/**
 * requirejs doesn't play nicely with already loaded js resources,
 * and there is no reason it should, they are already loaded after all,
 * but is nice in requirejs world to use define to pass in dependencies
 * even if it is not responsible for loading them
 *
 * PhpDebugBar will remove the global jQuery at the end of its processing
 * but it keeps a copy for itself which we can access
 */
define('jquery',['phpdebugbar'], function(PhpDebugBar) { return PhpDebugBar.$; });

/**
 * Simple class and sub-class creation
 * Tries to stick (roughly) to the proposal for ES6 classes
 *
 * ES6 syntax                class.js syntax
 * =========================================
 * 
 * class Xxx {}              var Xxx = Class.create({});
 * class Yyy extends Xxx {}  var Yyy = Class.extend(Xxx, {});
 *
 * super(...);               this.super.constructor.call(this, ...);
 * super.foo(...);           this.super.foo.call(this, ...);
 *
 * @module class
 * @author  Bob Davison
 * @version 1.0
 */
define('class',{

    /**
     * Create a new class based on the definition object
     * Equivalent to Class.extend(Object, definition);
     *
     * @param {Object} definition - object whose members become members of the new class
     * @return {Function}         - the constructor function to make instances of the class
     */
    create: function(definition) {
        return this.extend(Object, definition);
    },

    /**
     * Create a new class, as an extension of an existing class, based on the definition object
     *
     * @param {Object} definition - object whose members become members of the new class
     * @return {Function}         - the constructor function to make instances of the class
     */
    extend: function(base, definition) {
        var proto = Object.create(base.prototype),
            constructor;
        Object.getOwnPropertyNames(definition)
              .forEach(function(v) { 
                  proto[v] = definition[v];
              });
        proto.super = base.prototype;
        constructor = proto.hasOwnProperty('constructor')
            ? proto.constructor
            : function() {};
        constructor.prototype = proto;
        return constructor;
    },

});

/**
 * CSS class generator
 *
 * Generate css classes with namespace prefixes 
 *
 * @module cssclass
 * @author Bob Davison
 * @version 1.0
 */

define('cssclass',{

    /**
     * Generate object containing namespace prefixed CSS class names
     *
     * Names separated by '-' create nested objects
     *
     * e.g. generate('tab, ['open', 'close', 'icon-close'])
     *
     * {
     *   open:  'magedebugbar-tab-open',
     *   close: 'magedebugbar-tab-close',
     *   icon:  {
     *            close: 'magedebugbar-tab-icon-close',
     *          }
     * }
     *
     * @param {String} prefix - namespace prefix (without 'magedebugbar-')
     * @param {Array} name    - [] of class names to generate
     * @return {Object}       - object containing namespaced css class names
     */
    generate: function(prefix, names) {
        var css = {};
        names.forEach(function(name) {
            var thiscss = css;
            var sep = name.split('-');
            var last = sep.length - 1;
            sep.slice(0, last).forEach(function(part) {
                thiscss[part] = thiscss[part] || {};
                thiscss = thiscss[part];
            });
            thiscss[sep[last]] = 'magedebugbar-' + prefix + '-' + name;
        });
        return css;
    }
});


/**
 * Provides access to the layout config downloaded from the server
 *
 * There are three main configuration items:
 *   layout.store     the current store id
 *   layout.blocks    blocks rendered on this page
 *   layout.config    blocks configured in the config files for the active handles
 *
 * Page Blocks (Rendered)
 *
 * layout.blocks {
 *   name:            block name
 *   type:            Magento block alias
 *   id:              MageDebugBar block id
 *   template:        short template path
 *   template_file:   Magento relative path
 *   blocks:          [] of child blocks
 * }
 *
 * this.pageBlocks    [block names => page block] for all page blocks
 *
 *
 * Handle Config Blocks (Configuration)
 *
 * layout.config {
 *   handles:        [handle name => config blocks (see below)]
 *   files:          [] of config file Magento relative paths
 * }
 *
 * config blocks {
 *   name:           block element name (block, reference, remove, action etc.)
 *   attrs:          [attr name => attr value]
 *   elems:          [] of child handle blocks 
 *   file:           index info layout.config.files
 *   line:           line number
 *   data:           XML text node content
 * }
 *
 * The Handle View needs the Handle Config Blocks in a different data structure for
 * easier processing so a different data structure is produced by the constructor
 *
 * this.configBlocks      [block name => block detail] for all config blocks
 *
 * block detail {
 *   name:           block name
 *   handle:         handle
 *   rendered:       true if block was rendered (in pageBlocks)
 *   parent:         parent config block
 *   removedBy:      { 
 *                     handle: handle of remove element
 *                     elem: config block of remove element 
 *                   }
 *   blocks:         [] of child block details
 *   actions:        [] of action details
 *   elem:           this config block
 * }
 *
 * action detail {
 *   action:         formatted version of method call
 *   ifconfig:       config flag
 *   handle:         handle
 *   elem:           this config block
 * }
 *
 * this.rootBlocks   [] of block details for root config blocks
 *
 * this.handleBlocks [handle name => [] of block details for per handle root config blocks]
 *
 * @module layoutmodel
 * @author Bob Davison
 * @version 1.0
 */
define('layoutmodel',['class'],

function(Class) {

    return Class.create({

        /**
         * Process layout into structures for easier processing
         *
         * @param {Object} layout - layout from server
         */
        constructor: function(layout) {
            this.layout = layout;

            this.pageBlocks = {};
            this.processPageBlocks(layout.blocks.blocks);

            this.configBlocks = {};
            this.rootBlocks = [];
            this.handleBlocks = {};
            layout.config.handles.forEach(function(handle) {
                this.handleBlocks[handle.name] = [];
                this.processConfigBlocks(handle.elems, handle.name);
            }, this);

        },

        /**
         * Add blocks to the this.pageBlock object
         *
         * @param {Array} blocks - [] of page blocks
         */ 
        processPageBlocks: function(blocks) {
            blocks.forEach(function(block) {
                this.processPageBlock(block);
            }, this);
        },

        /**
         * Add block and its children to the this.pageBlock object
         *
         * @param {Object} block - page block
         */ 
        processPageBlock: function(block) {
            this.pageBlocks[block.name] = block;
            this.processPageBlocks(block.blocks);
        },

        /**
         * Get the details of the page blocks rendered for this page
         *
         * @return {Object} - page blocks
         */
        getPageBlocks: function() {
            return this.layout.blocks;
        },

        /**
         * Get the configuration details for all handles
         *
         * @return {Array} - array of config blocks, one element for each handle
         */
        getHandles: function() {
            return this.layout.config.handles;
        },

        /**
         * Is the named handle present in the configuration
         *
         * @param {String} handle - name of handle
         * @return {boolean}      - true if handle is configured, else false
         */
        validHandle: function(handle) {
            var valid = false;
            this.layout.config.handles.map(function(v) {
                valid = valid || handle === v.name;
            });
            return valid;
        },

        /**
         * Get the store id for the current page
         *
         * @return {integer} - store id
         */
        getStore: function() {
            return this.layout.store;
        },

        /**
         * Get root blocks for the given handle (default is all)
         *
         * @param {String} handle - name of handle (optional, default is all handles)
         * @return {Array}        - [] of config blocks
         */
        getHandleBlocks: function(handle) {
            if(handle) {
                return this.handleBlocks[handle];
            } else {
                return this.rootBlocks;
            }
        },

        /**
         * Split helper attribute into helper class alias and method
         *
         * Helper is of format <helper class alias>/<method>
         *
         * @param {String} helper - helper attribute
         * @return {Object}       - alias and method
         */
        splitHelper: function(helper) {
            var bits = helper.split('/');
            var alias = bits.slice(0, -1).join('/');
            var method = bits[bits.length - 1];
            return {alias: alias, method: method };
        },

        /**
         * Find block with given name in handle configuration
         *
         * @param {String} name - block name
         * @return {Object}     - config block for name, or nothing
         */
        findBlock: function(name) {
            var handles = this.layout.config.handles;
            for(var i = 0 ; i < handles.length ; i++) {
                var res = this.findBlockInElems(name, handles[i].elems);
                if(res) return res;
            }
        },

        /**
         * Search an array of config blocks for the specified block
         *
         * @param {String} name - block name
         * @param {Array} elems - [] of config blocks
         * @return {Object}     - config block for name, or nothing
         */
        findBlockInElems: function(name, elems) {
            if(elems) {
                for(var i = 0 ; i < elems.length ; i++) {
                    var res = this.findBlockInElem(name, elems[i]);
                    if(res) return res;
                }
            }
        }, 

        /**
         * Search a config block (and its children) for the specified block
         *
         * @param {String} name - block name
         * @param {Object} elem - config block to seach
         * @return {Object}     - config block for name, or nothing
         */
        findBlockInElem: function(name, elem) {
            if(elem.name === 'block' && elem.attrs) {
                if(name === elem.attrs.name) return elem;
            }
            return this.findBlockInElems(name, elem.elems);
        },
        
        /**
         * Search page blocks for the given template to get file name
         *
         * @param {String} template - Magento short template path
         * @param {Array} blocks    - page blocks to search (default = all)
         * @return {String}         - Magento relative path of template file
         */
        findTemplateFile: function(template, blocks) {
            blocks = blocks || [this.layout.blocks];
            for(var i = 0 ; i < blocks.length ; i++) {
                if(blocks[i].template === template) {
                    return blocks[i].template_file;
                }
                if(blocks[i].blocks) {
                    var res = this.findTemplateFile(template, blocks[i].blocks);
                    if(res) return res;

                }
            }
        },
           
       /**
        * Get config file path for file number
        *
        * @param {integer} fileNo - the file index number
        * @return {String}        - Magento relative path of config file
        */ 
        configFileName: function(fileNo) {
            return this.layout.config.files[fileNo];
        },

      /**
       * Process all Handle Config Blocks into structure more suitable
       * for the Handle View component
       *
       * @param {Array} blocks  - array of config blocks
       * @param {String} handle - handle of block
       * @param {Object} parent - parent config block
       */
        processConfigBlocks: function(blocks, handle, parent) {
            blocks.forEach(function(block) {
                this.processConfigBlock(block, handle, parent);
            }, this);
        },

        /**
         * Process a Config Block and children
         *
         * @param {Object} block  - config blocks
         * @param {String} handle - handle of block
         * @param {Object} parent - parent config block
         */
        processConfigBlock: function(block, handle, parent) {
            this.functionFor(block)(block, handle, parent);
            this.processConfigBlocks(block.elems, handle, block);
        },

        /**
         * Find function to process a config block element with the given name
         *
         * Block element names: block, reference, remove, action etc.
         *
         * @param {Object} block - config block
         * @return {Function}    - function to process block
         */
        functionFor: function(block) {
            var f = 'process_' + block.name;
            var fn = Object.getPrototypeOf(this).hasOwnProperty(f) ? this[f] : this.skipElement;
            return fn.bind(this);         
        },

        /**
         * Function to process elements we are not interested in
         */
        skipElement: function() {},

        /**
         * Process block type elements
         *
         * Create add block detail and add to its parent block (if it has one)
         * Ensure that parent is referenced under the handle of this block
         * as well as its own.
         *
         * Track output blocks in rootBlocks and handleBlocks
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_block: function(elem, handle, parent) {
            var name = elem.attrs.name;
            var block = {
                name: name,
                handle: handle,
                rendered: typeof(this.pageBlocks[name]) !== 'undefined',
                parent: parent,
                blocks: [],
                actions: [],
                elem: elem
            };
            this.configBlocks[name] = block;
            if(parent) {
                var pblock = this.configBlocks[parent.attrs.name];
                if(pblock) {
                    pblock.blocks.push(block);
                    if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                        this.handleBlocks[handle].push(block);
                    }
                }
            } else if(elem.attrs.output) {
                this.rootBlocks.push(block);
                this.handleBlocks[handle].push(block);
            }
        },

        /**
         * Process remove type elements
         *
         * Note which block is being removed
         * Ensure that block is referenced under the handle of the removing block
         * as well as its own
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_remove: function(elem, handle, parent) {
            var pblock = this.configBlocks[elem.attrs.name];
            if(pblock) {
                if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                    this.handleBlocks[handle].push(pblock);
                }
                pblock.removedBy = { handle: handle, elem: elem };
            }
        },

        /**
         * Process action type elements
         *
         * Create an action detail and add it to the correct owning block
         * Ensure that owning block is referenced nder the action handle as well as its own
         *
         * @param {Object} elem   - config block element
         * @param {String} handle - handle for block
         * @param {Object} parent - parent config block
         */
        process_action: function(elem, handle, parent) {
            var action = { action: this.formatAction(elem), ifconfig: elem.attrs.ifconfig, handle: handle, elem: elem };
            var pblock = this.configBlocks[parent.attrs.name];
            if(pblock) {
                    if(pblock.handle !== handle && -1 === this.handleBlocks[handle].indexOf(pblock)) {
                        this.handleBlocks[handle].push(pblock);
                    }
                pblock.actions.push(action);
            }
        },

        /**
         * Format an action element as a method call
         *
         * e.g   <action method='doThis'>
         *         <arg1>val1</arg1>
         *         <arg2>val2</arg2>
         *       </action>
         *
         * =>  doThis('val1', 'val2')
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated method call
         */
        formatAction: function(elem) {
            return  elem.attrs.method + "(" + this.formatArgs(elem) + ")";
        },

        /**
         * Format action arguments as method call arguments
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated arguments
         */
        formatArgs: function(elem) {
            var args = [];
            elem.elems.forEach(function (arg) {
                args.push(this.formatArg(arg));
            }, this);
            return args.join(', ');
        },

        /**
         * Format action argument as m ethod call argument
         *
         * @param {Object} elem - config block element
         * @return {String}     - formated argument
         */
        formatArg: function(arg) {
            var helper = arg.attrs.helper;
            if(helper) {
                helper = this.splitHelper(helper);
                return helper.alias + '->' + helper.method + '()';
            }
            if(arg.elems.length) {
                return this.flattenElems(arg.elems);
            }
            var data = arg.data;
            if(data.length) {
                if(isNaN(+data)) {
                    return "'" + data + "'";
                } else {
                    return data;
                }
            } else {
                return 'null';
            }
        },

        /**
         * Flatten XML arguments into string
         *
         * Some arguments are XML so will have been split off into children by XML parser
         * but we want to display them as a single string with markup
         *
         * @param {Array} elems - XML arguments
         * @return {String}     - formatted XML elements
         */
        flattenElems: function(elems) {
            return elems.map(this.flattenElem, this).join('');
        },

        /**
         * Flatten an XML argument (and any child nodes) into string
         *
         * Some arguments are XML so will have been split off into children by XML parser
         * but we want to display them as a single string with markup
         *
         * @param {Array} elems - XML argument
         * @return {String}     - formatted XML element
         */
        flattenElem: function(elem) {
            var res = '<' + elem.name + '>';
            if(elem.elems.length) {
                res += flattenElems(elem.elems);
            } else {
                res += elem.data;
            }
            res += '</' + elem.name + '>';
            return res;
        },
    });
});

/**
 * Allow copy to clipboard
 *
 * Which is not straightforward from Javascript, unfortunately
 *
 * Based on Trello's CoffeeScript code
 * http://stackoverflow.com/questions/17527870/how-does-trello-access-the-users-clipboard
 *
 * @module clipboard
 * @author Bob Davison
 * @version 1.0
 */

define('clipboard',['jquery', 'cssclass', 'class'], 

function($, CssClass, Class) {

    var cssClass = CssClass.generate('clipboard', ['container', 'textarea']);
    var Clipboard = Class.create({

        constructor: function() {
            this.$container = $('<div />').attr('id', cssClass.container).appendTo($('body'));
            this.$textarea = $('<textarea />').attr('id', cssClass.textarea);
            $(document)
                .on('keydown', this.keydown.bind(this))
                .on('keyup', this.keyup.bind(this));
        },

        set: function(text) {
            this.text = text;
        },

        unset: function() {
            delete this.text;
        },

        keydown: function(e) {
            if(!this.text
                    || !(e.ctrlKey || e.metaKey)
                    || $(e.target).is("input:visible,textarea:visible")
                    || window.getSelection().toString()) {
                return;
            }

            setTimeout(function() {
                  this.$container.empty().show();
                  this.$textarea
                      .val(this.text)
                      .appendTo(this.$container)
                      .focus()
                      .select();
            }.bind(this), 0);
        },

        keyup: function(e) {
            if(this.$container.length) {
                this.$container.empty().hide();
            }
        }
    });

    return new Clipboard();
});




/**
 * A Tab user interface control
 * Manages display of tabs and content
 * Allows for closeable tabs and additional content next to label
 *
 * @module tabbox
 * @author Bob Davison
 * @version 1.0
 */
define('tabbox',['jquery', 'class', 'cssclass', 'clipboard'], 
       
function($, Class, CssClass, Clipboard) {

    var cssClass = CssClass.generate('tab', ['box', 'content', 'active', 'close', 'icon-cross', 'icon-close']);

    return Class.create({

        /**
         * Construct <div> with inner <ul> for tab labels and <div> for tab content
         * The outer <div> will have class 'tab-box'
         * Each tab label will be <li>, the active tab will have class 'tab-active'
         * Closeable tabs will have a <span> with class 'tab-close'
         * The content <div> will have class 'tab-content'
         */
        constructor: function() {
            this.$box = $('<div />').addClass(cssClass.box);
            this.$tabs = $('<ul />').appendTo(this.$box);
            this.$content = $('<div />').addClass(cssClass.content).appendTo(this.$box);
            this.$tabs
            .on('click', 'li', this.clickTab.bind(this))
            .on('click', '.' + cssClass.close, this.clickCloseTab.bind(this));
        },

        /**
         * Allow sub-classes access to the CSS class for active tabs and content
         *
         * @return {String} - CSS class for active tabs and content
         */
        activeClass: function() {
            return cssClass.active;
        },

        /**
         * Append the tabbox to the given DOM or JQuery element
         *
         * @param {jQuery | DOM} element - element to append tabbox to
         */
        appendTo: function(element) {
            this.$box.appendTo(element);
            this.resize();
        },

        /**
         * Resize the tab content <div> to fill the tabbox minus the labels
         */
        resize: function() {
            this.$content.outerHeight(this.$box.innerHeight() - this.$tabs.outerHeight());
        },

        /**
         * Handler called when a tab is clicked by user
         * Activate the clicked tab
         *
         * @param {Event} e - the click event
         */
        clickTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.activateTab($(e.currentTarget));
                e.preventDefault();
            }
        },

        /**
         * Handler when close button is clicked by user
         * Remove the closed tab
         *
         * @param {Event} e - the click event
         */
        clickCloseTab: function(e) {
            if(!e.isDefaultPrevented()) {
                this.removeTab($(e.currentTarget).parent());
                e.preventDefault();
            }
        },

        /**
         * Get the tab content
         *
         * @param {JQuery} tab - the JQuery <li> element representing the tab
         * @return {TabContent} - the tab object
         */
        getTabContent: function(tab) {
            return tab.data('tab-content');
        },

        /**
         * Set the tab content
         *
         * @param {JQuery} tab  - the JQuery <li> element representing the tab
         * @param {TabContent} content - the tab object
         */
        setTabContent: function(tab, content) {
            tab.data('tab-content', content);
        },

        /**
         * Add a new tab to this tabbox
         *  
         * @param {TabContent} content - the tab to add
         * @return {jQuery}            - jQuery <li> element of tab
         */   
        addTab: function(content) {
            var tab = $('<li />').text(content.label);
            if(content.$html) {
                content.$html.appendTo(tab);
            }
            if(content.title) {
                tab.attr('title', content.title);
                tab.hover(
                    function() { Clipboard.set(content.title); },
                    function() { Clipboard.unset(); }
                );
            }
            if(content.closeable) {
                var close = $('<span />').addClass(cssClass.close);
                $('<i />').addClass(cssClass.icon.cross).appendTo(close);
                $('<i />').addClass(cssClass.icon.close + ' fa fa-times-circle icon').appendTo(close);
                close.appendTo(tab);
            }
            this.$tabs.append(tab);
            content.add(this);

            this.setTabContent(tab, content);

            this.resize();

            return tab;
        },

        /**
         * Remove the given tab from the tabbox
         * If this is the last tab then the content <div> is hidden
         *
         * @param {jQuery} tab - <li> element representing tab
         */
        removeTab: function(tab) {
            var active = tab.hasClass(cssClass.active);
            var siblings = tab.siblings().length;
            var index = tab.index();
            // Remove after index otherwise can't get index
            this.getTabContent(tab).remove();
            tab.remove();
            if(active && siblings) {
                if(siblings === index) {
                    // Closed the furthest right tab
                    index--;
                }
                var newActive = this.$tabs.children().eq(index);
                this.activateTab(newActive);
            }
            if(0 === this.tabCount()) {
                this.hideContent();
            }
        },

        /**
         * Remove all other tabs except the one passed in
         *        
         * @param {jQuery} tab - <li> element representing tab
         */
        removeOtherTabs: function(tab) {
            var elem = tab.get(0);
            this.$tabs.children().each(function(index, child) {
                if(child !== elem) {
                    $(child).remove();
                }
            });
            this.activateTab(tab);
        },

        /**
         * Remove all tabs
         */
        removeAllTabs: function() {
            this.$tabs.empty();
            this.hideContent();
        },


        /**
         * Activate the given tab
         *
         * If this is the only tab then the content <div> is shown
         *
         * @param {jQuery} tab - <li> element representing tab
         */
        activateTab: function(tab) {
            this.$box.find('.' + cssClass.active).removeClass(cssClass.active);
            tab.addClass(cssClass.active);
            this.getTabContent(tab).activate();
            if(1 == this.tabCount()) {
                this.showContent();
            }
        },

        /**
         * The number of tabs
         *
         * @return {integer} the number of tabs
         */
        tabCount: function() {
            return this.$tabs.children().length;
        },

        /**
         * Hide the content <div>
         */
        hideContent: function() {
            this.$content.css('visibility', 'hidden');
        },

        /**
         * Show the content <div>
         */
        showContent: function() {
            this.$content.css('visibility', 'visible');
        },

        /**
         * Return the content <div>
         *
         * @return {jQuery}  the content <div>
         */
        getContent: function() {
            return this.$content;
        }

    });

});

/**
 * Manages the content panel of a tabbox control
 *
 * @module tabcontent
 * @author Bob Davison
 * @version 1.0
 */
define('tabcontent',['class'], 
       
function(Class) {

    return Class.create({
        /**
         * Create a new content panel for a tabbox
         *
         * @param {string} label - the label to display on the tab
         * @param {jQuery} ui    - the jQuery element to display in the content
         * @param {boolean} closeable - true if a close button should be displayed (optional, default false)
         * @param {string} title - set as HTML title attribute on tab for tooltips (optional)
         * @param {jQuery} html - additional jQuery content to be added after the label on the tab (optional)
         */
        constructor: function(label, ui, closeable, title, html) {
            this.label = label;
            this.title = title;
            this.closeable = closeable;
            this.$ui = ui;
            this.$html = html;
        },

        /**
         * Called by the owning tabbox when the tab is being added
         * Responsible for adding to the tabbox content <div>
         *
         * @param {TabBox} tabbox - the owning tabbox
         */
        add: function(tabbox) {
            this.tabbox = tabbox;
            this.$ui.appendTo(tabbox.getContent());
        },

        /**
         * Called by the owning tabbox when the tab is made active
         */
        activate: function() {
            this.$ui.addClass(this.tabbox.activeClass());
        },

        /**
         * Called by the owning tabbox when the tab is removed
         */
        remove: function() {
            this.$ui.remove();
        }

    });

});

/**
 * Control that displays data both as a tree and in a table like grid
 * Columns work like table columns except that the first column
 * contains a tree structure where nodes and be openned and closed
 *
 * Triggers click events for each cell giving the row data and column number
 * Triggers hover events for each row giving the row data
 *
 * Data to be dislayed must conform to the following model
 * {
 *   columns:   [] of CSS class names, one for each column (optional)
 *   headings:  [] of heading names, one for each column (optional)
 *   values:    [] of property names to access column values from 'root'
 *   children:  property name to access child nodes array from 'root'
 *   root:      [] of root nodes
 * }
 *
 * TODO: column resizing
 *       fixed headings (don't scroll when table rows scroll)
 *
 * @module treegridview
 * @author Bob Davison
 * @version 1.0
 */
define('treegridview',['jquery', 'class', 'cssclass'],

function($, Class, CssClass) {

    var cssClass = CssClass.generate('treegridview', ['container', 'open', 'closed', 'leaf', 'cell', 'hover']);

    return Class.create({

        /**
         * Create TreeGridView with given data to display
         *
         * @param {Object} model - data to display
         */
        constructor: function(model) {
            this.model = model;
        },

        /**
         * Append HTML to given element
         *
         * @param {jQuery | DOM} element - element to append our HTML elements to
         */
        appendTo: function(element) {
            var container = $("<table />")
            .addClass(cssClass.container)
            .appendTo(element);
            this.container = container;
            this.addColGroup(container);
            this.addHeadings(container);
            this.addRoot(container);
            this.addHandlers(container);
            return container;
        },

        /**
         * Discard the old root nodes and dispplay new ones
         *
         * @param {Array} root - root nodes to replace those in model
         */
        resetRoot: function(root) {
            this.container.has('tbody').children().remove();
            this.model.root = root;
            this.addRoot(this.container);
        },

        /**
         * If model.columns provided then add <colgroup> with col class names
         *
         * @param {jQuery} container - container to add <colgroup> to
         */
        addColGroup: function(container) {
            if(this.model.columns) {
                var cols = $("<colgroup />").appendTo(container);
                this.model.columns.forEach(function(v) {
                    $("<col>").addClass(v).appendTo(cols);

                });
            }
        },

        /**
         * If model.headings provided then add table header
         *
         * @param {jQuery} container - container to add table header to
         */
        addHeadings: function(container) {
            if(this.model.headings) {
                var thead = $("<thead />").appendTo(container);
                var tr = $("<tr />").appendTo(thead);
                this.model.headings.forEach(function(v) {
                    $("<th>" + v + "</th>").appendTo(tr);
                });
            }
        },

        /**
         * Add root nodes to container
         * and if only one root node then openit (display its children)
         *
         * @param {jQuery} container - container to add rows to
         */
        addRoot: function(container) {
            var children = this.model.root[this.model.children];
            var target;
            this.insertRows(children, 1, container, true);
            if(children.length == 1) {
                target =  container.find('.' + cssClass.closed);
                if(target.length) {
                    this.open({ target: target });
                }
            }
        },

        /**
         * Create a new table row
         *
         * @param {Object} branch - root node or descendant of root node
         * @param {integer} level - depth in the tree
         */
        makeRow: function(branch, level) {
            var tr = $("<tr />");
            this.model.values.forEach(function(v, i) {
                var td = $("<td />").appendTo(tr);
                if(i === 0) {
                    td.css("padding-left",  (level - 1) + ".3em");
                    var cls = this.hasChildren(branch) ? cssClass.closed : cssClass.leaf;
                    $("<div />")
                    .addClass(cls)
                    .addClass('fa fa-play icon')
                    .appendTo(td);
                }
                var cell = $("<div>" + branch[v] + "</div>")
                .addClass(cssClass.cell)
                .appendTo(td);
                if(i === 0) {
                    cell.css("margin-left", ".5em");
                }
            }, this);
            return tr;
        },

        /**
         * Has this node got children
         *
         * @param {Object} branch - root node or descendant of root node
         * @return {boolean}      - true if branch has children
         */
        hasChildren: function(branch) {
            return 0 < branch[this.model.children].length;
        },

        /**
         * Add handlers for:
         *  opening and closing nodes 
         *  clicking on values in treegrid
         *  hovering ovr rows in treegrid
         *
         * @param {jQuery} container - object to add handlers to
         */
        addHandlers: function(container) {
            container.on("click", '.' + cssClass.open, this.close.bind(this));
            container.on("click", '.' + cssClass.closed, this.open.bind(this));
            container.on("click", '.' + cssClass.cell, this.click.bind(this));
        },

        /**
         * Handle click event request to open a node with children
         *
         * Children are accessed as a Javascript Promise so the
         * model can load child nodes asynchronously
         *
         * @param {Event} - click event
         */
        open: function(event) {
            var target = $(event.target);
            target
            .removeClass(cssClass.closed)
            .removeClass('fa-play icon')
            .addClass('fa-spinner fa-pulse');
            var row = this.findRow(event);
            Promise.resolve(row.branch[this.model.children])
            .then(function(children) {
                this.insertRows(children, 1 + row.level, row.element);
            }.bind(this))
            .catch(function(err) {
                console.error(err);
            })
            .then(function() {
                target
                .removeClass('fa-spinner fa-pulse')
                .addClass(cssClass.open)
                .addClass('fa-play fa-rotate-90 icon');
            }.bind(this));
        },

        /**
         * Insert rows to display branches
         *
         * @param {Array} branches - [] of branches to add
         * @param {integer} level - depth of nodes in tree
         * @param {jQuery} prev   - element to appendTo or insertAfter
         * @param {boolean} append - if true then append first branch, all others are inserted after
         */
        insertRows: function(branches, level, prev, append) {
            branches.forEach(function(branch) { 
                prev = this.insertRow(branch, level, prev, append);
                append = false;
            }, this);
        },

        /**
         * Insert row to display branch
         *
         * @param {Object} branch - branch to add
         * @param {integer} level - depth of nodes in tree
         * @param {jQuery} prev   - element to appendTo or insertAfter
         * @param {boolean} append - if true the append branch, otherwise insert after
         */
        insertRow: function(branch, level, element, append) {
            var row = this.makeRow(branch, level);
            if(append) {
                row = row.appendTo(element);
            } else {
                row = row.insertAfter(element);
            }
            return row
            .hover(this.hover.bind(this), this.unhover.bind(this))
            .data('branch', branch)
            .data('level', level);
        },

        /**
         * Find row click/hover event happened over
         *
         * @param {Event} event - DOM event
         * @return {Object} - { branch, level, element (<tr>) }
         */
       findRow: function(event) {
            var element = $(event.target).closest('tr');
            var row = element.data();
            row.element = element;
            return row;
        },

        /**
         * Find column click event happened on
         *
         * @param {Event} event - DOM event
         * @return {integer}    - zero based column number
         */ 
        findCol: function(event) {
            var element = $(event.target).closest('tr');
            var col;
            element.children().each(function (index, item) {
                if(col === undefined && $(item).has(event.target).length) {
                    col = index;
                }
            });
            return col;
        },

        /**
         * Close the given row (remove all descendents from display)
         *
         * @param {Event} event - click event that triggered close
         */
        close: function(event) {
            var row = this.findRow(event);
            var ok = true;
            row.element
            .nextAll()
            .filter(function (i, e) {
                ok = ok && $(e).data().level > row.level;
                return ok;
            })
            .remove();
            $(event.target)
            .removeClass(cssClass.open)
            .removeClass('fa-rotate-90')
            .addClass(cssClass.closed);
        },

        /**
         * Trigger click event to any listeners
         * 
         * Include row and column where click occurred
         *
         * @param {Event} event - click event
         */
        click: function(event) {
            $(this).trigger('click', [this.findRow(event), this.findCol(event)]);
        },

        /**
         * Trigger hover event with to any listeners (hover = true)
         *
         * Include row being hovered over
         *
         * @param {Event} event - mousemove event
         */
        hover: function(event) {
            // TODO: why is my trigger causing my own hover to run?
            //       put event check in for now
            if(event) {
                $(event.currentTarget).addClass(cssClass.hover);
                $(this).trigger('hover', [true, this.findRow(event)]);
            }
        },

        /**
         * Trigger hover event with to any listeners (hover = false)
         *
         * Include row no longer hovered over
         *
         * @param {Event} event - mousemove event
         */
       unhover: function(event) {
            $(event.currentTarget).removeClass(cssClass.hover);
            $(this).trigger('hover', [false, this.findRow(event)]);
        },

    });

});


/**
 * Displays a TreeGridView of layout for this page in a tab
 *
 * @module pageview
 * @author Bob Davison
 * @version 1.0
 */
define('pageview',['jquery', 'class', 'cssclass', 'tabcontent', 'treegridview'],

function($, Class, CssClass, TabContent, TreeGridView) {

    var cssClass = CssClass.generate('page', ['view']);

    return Class.extend(TabContent, {

        /**
         * Creates a TreeGridView for displaying Page Blocks from the layout config
         * 
         * Click on items to load resources from server
         * Hover over rows to highlight blocks on the page
         *
         * @param {ResourceLoader} loader  - for loading resources from the server
         * @param {LayoutModel} layout     - for access to the page blocks
         * @param {LayoutHighlighter} highlighter - to highlight blocks on the page
         */ 
        constructor: function(loader, layout, highlighter) {
            this.super.constructor.call(this, 'Page', $('<div />').addClass(cssClass.view));
            this.treeview = new TreeGridView(this.makeRootModel(layout.getPageBlocks()));
            $(this.treeview)
            .on('click', function(e, row, col) {
                switch(col) {
                    case 0: // Block name
                        loader.loadBlock(row.branch.name);
                    break;
                    case 1: // Block class
                        loader.loadBlockClass(row.branch.type);
                    break;
                    case 2: // Template
                        loader.loadTemplate(row.branch.template);
                    break;
                }
            })
            .on('hover', function(e, hover, row) {
                if(hover) {
                    highlighter.show(row.branch.name, row.branch.id);
                } else {
                    highlighter.hide();
                }
            });
        },

        /**
         * Tab added so append the TreeGridView
         *
         * @param {TabBox} tabbox - the owning tabbox
         */
        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        /**
         * Create model suitable for the TreeGridView
         *
         * @param {Array} blocks - [] of root page blocks
         * @return {Object}      - model for TreeViewGrid
         */
        makeRootModel: function(blocks) {
            return {
                children: 'blocks',
                values: ['name', 'type', 'template'],
                root: blocks
            };
        },
    });
});


/**
 * Displays layout configuration by handle in a tab
 * The Tab will display a dropdown allowing the user to refine
 * content by handle
 *
 * @module handleview
 * @author Bob Davison
 * @version 1.0
 */

define('handleview',['jquery', 'class', 'cssclass', 'tabcontent', 'treegridview'],

function($, Class, CssClass, TabContent, TreeGridView) {

    var cssClass = CssClass.generate('handle',
                ['view', 'chooser', 'icon-rendered', 'icon-configured',
                 'icon-forced', 'icon-action', 'icon-ifconfig']);

    return Class.extend(TabContent, {

        /**
         * Create a tab with a dropdown for handle selection and
         * a TreeGridView for layout config display
         *
         * @param {ResourceLoader} resourceLoader - object for loading resources from the server
         * @param {LayoutModel} layoutModel       - layout configuration data
         */
        constructor: function(resourceLoader, layoutModel) {
            this.super.constructor.call(
                this,
                'Handles',                             // Tab label
                $('<div />').addClass(cssClass.view),  // Content div
                false,                                 // Closeable
                undefined,                             // Tooltip title
                this.handleChooser(layoutModel)        // Additional label HTML
            );
            this.treeview = new TreeGridView(this.makeRootModel(layoutModel));
            $(this.treeview)
            .on('click', function(e, row, col) {
                var file = row.branch.elem.file;
                var line = row.branch.elem.line;
                if(file !== undefined && line !== undefined) {
                    resourceLoader.loadFile(layoutModel.configFileName(file), line);
                }
            });
        },

        /**
         * Create a dropdown list of available handles
         * When a handle is selected then load the handle data into the TreeGridView
         *
         * @param {LayoutModel} layoutModel - layout configuration data
         */
        handleChooser: function(layoutModel) {
            var html = $('<select />').attr('id', cssClass.chooser);
            html.append($('<option />').attr('selected', 'true').text('(all)'));
            layoutModel.getHandles().forEach(function(handle) {
                html.append($('<option />').text(handle.name));
            });
            html.on('change', function(e) {
                var handle = $(e.target).val();
                var root;
                if(handle === '(all)') {
                    root= { blocks: this.blocksToHtml(layoutModel.getHandleBlocks()) };
                } else {
                    root = { blocks: this.blocksToHtml(layoutModel.getHandleBlocks(handle), handle, true) };
                }
                this.treeview.resetRoot(root);
            }.bind(this));

            return html;
        },

        /**
         * Add the TreeViewGrid to the tab content div
         *
         * @param {TabBox} tabbox - the tabbox we are a tab of
         */
        add: function(tabbox) {
            this.super.add.call(this, tabbox);
            this.treeview.appendTo(this.$ui);
        },

        /**
         * Create the data to populate the TreeGridView
         *
         * @param {LayoutModel} layoutModel - the layout config data
         * @return {Object}                 - tree data for TreeGridView
         */
        makeRootModel: function(layoutModel) {
            return {
                children: 'blocks',
                values: ['html'],
                root: { blocks: this.blocksToHtml(layoutModel.getHandleBlocks()) }
            };
        },

        /**
         * Produce HTML representation of a tree of layout config blocks
         *
         * @see LayoutModel
         * @param {Array} blocks  - the tree of layout config blocks
         * @param {String} handle - the handle to restrict output to (optional, default all handles)
         * @param {boolean} force - force display of block even if in wrong handle (optional, default false)
         * @return {Array}        - Objects containing html, block element and child blocks
         */
        blocksToHtml: function(blocks, handle, force) {
            return blocks
                .map(function(block) { return this.blockToHtml(block, handle, force); }, this)
                .filter(function(res) { return res; });
            },

        /**
         * Convert a block and its children to HTML
         *
         * @see LayoutModel
         * @param {Object} block - the block object
         * @param {String} handle - handle whose blocks to display (default all handles)
         * @param {boolean} force - force display of blocks from different handle (default false)
         * @return {Object}       - html to display, actual block element, array of html for child blocks
         */
        blockToHtml: function(block, handle, force) {
            var html, blocks, elem;
            if(block.removedBy && (!handle || handle === block.removedBy.handle)) {
                html = this.removeIcon() + block.name;
                blocks = [];
                elem = block.removedBy.elem;
            } else if(force || !handle || handle === block.handle) {
                // Is this block from a different handle (could have been forced)
                var diffHandle = handle && handle !== block.handle;
                html = this.blockIcon(block.rendered, diffHandle) + block.name;
                blocks = this.actionsToHtml(block.actions, handle)
                .concat(this.blocksToHtml(block.blocks, handle));
                elem = block.elem;
            } else {
                // don't render block
                return;
            }
            return { html: html, blocks: blocks, elem: elem };
        },

        /**
         * Render any action blocks to HTML
         *
         * @see LayoutModel
         * @param {Array} actions - array of actions
         * @param {String} handle - handle whose actions to render (default is all)
         * @return {Array}        - objects with html for actions and action elements
         */ 
        actionsToHtml: function(actions, handle) {
            return actions
                .map(function(action) { return this.actionToHtml(action, handle); }, this)
                .filter(function(res) { return res; });
        },

        /**
         * Render an action block to HTML
         *
         * @see LayoutModel
         * @param {Object} action - action object
         * @param {String} handle - handle whose actions to render (default is all)
         * @return {Object}       - html of action and action element
         */
        actionToHtml: function(action, handle) {
            if(handle && handle !== action.handle) {
                return;
            }
            return {
                html: this.actionIcon(action.ifconfig) + this.escapeHtml(action.action),
                blocks: [],        // actions do not have children
                elem: action.elem
            };
        },

        /**
         * Convert special HTML characters to entities
         *
         * @param {String} string - string of characters to check for conversion
         * @return {String}       - string with special characters replaced with HTML entities
         */
        escapeHtml: function(string) {
            var entityMap =  {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': '&quot;',
                "'": '&#39;',
                "/": '&#x2F;'
            };
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        },

        /**
         * Generate block icon
         *
         * @param {boolean} rendered - this block was rendered on the page
         * @param {boolean} forced   - this block was forced here from another handle
         * @return {String}          - HTML for block icon
         */
        blockIcon: function(rendered, forced) {
            var css = rendered
                ? forced 
                  ? cssClass.icon.forced
                  : cssClass.icon.rendered
                : cssClass.icon.configured;
            return this.icon('fa-cube', css);
        },

         /**
         * Generate removed block icon
         *
         * @return {String} - HTML for removed block icon
         */
       removeIcon: function() {
            return this.icon('fa-cube', cssClass.icon.remove);
        },

         /**
         * Generate action icon
         *
         * @param {boolean} fconfig - this action is subject to an ifconfig check
         * @return {String}         - HTML for action icon
         */
       actionIcon: function(ifconfig) {
            return this.icon('fa-gears', ifconfig ? cssClass.icon.ifconfig : cssClass.icon.action );
        },

        /**
         * Generate HTML for FontAwesome icons
         *
         * @param {String} facls     - FontAwesome icon CSS class
         * @param {String} layoutcls - Layout CSS class
         * @param {String} title     - optional tooltip title for icon
         * @return {String}          - HTML for icon
         */
        icon: function(facls, layoutcls, title) {
            return "<i class='fa icon " + facls + " " + " " + layoutcls + "' " + (title ? "title='" + title + "'" : '') + " />";
        },

    });
});

/**
 * Highlights a layout block on the main web page
 * by displaying a semi-opaque overlay
 * and a related tooltip
 *
 * @module layouthightlighter
 * @author Bob Davison
 * @version 1.0
 */

define('layouthighlighter',['jquery', 'class', 'cssclass'],

function($, Class, CssClass) {

    var cssClass = CssClass.generate('highlight', ['block', 'tooltip', 'point-top', 'point-bottom', 'point-left', 'point-right']);

    return Class.create({

        /**
         * Create <div> for highlighting block and <span> for tooltip
         * and append to body element
         */
        constructor: function() {
            this.$block = $('<div />').addClass(cssClass.block);
            this.$tooltip = $('<span />').addClass(cssClass.tooltip);

            $('body').append(this.$block).append(this.$tooltip);
        },

        /**
         * Highlight given blockid and display tooltip with name
         *
         * Server surrounds rendered blocks with 
         * <span data-blockid='blockid'></span>
         * elements so that blocks can be located in the page
         *
         * @param {String} name     - block name to display in tooltip
         * @param {integer} blockid - unique id of block
         */
        show: function(name, blockid) {
            var elems = $("[data-blockid='" + blockid + "']");
            if(2 === elems.length) {
                if(blockid === 24) {
                    console.log("stop here");
                }
                var bounds = this.combineBounds(elems.eq(0), elems.eq(1));
                if(bounds) {
                    this.showBlock(bounds);
                    this.showToolTip(bounds, name);
                }
            }
       },

       /**
        * Hide higlight block <div> amd tooltip <span>
        */
        hide: function() {
            this.$block.hide();
            this.$tooltip.hide();
        },

        /**
         * Show the highlight block div over the given bounds
         *
         * @param {Object} bounds - top, right, bottom, left of area to highlight
         */
        showBlock: function(bounds) {
            this.$block.css({
                top: bounds.top,
                left: bounds.left,
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top
            })
            .show();
        },

        /**
         * Show the tooltip for the given highlight area  with the given text
         *
         * The area may be partially on screen or not on screen at all 
         * but tooltip should always be on screen
         *
         * Tooltip has a point which can be pointing up or down and located at right or left
         * side of the tooltip box.  This needs to be located so it points to the highlit area
         * if they are visible or so that it indicates which direction the area is if it is not 
         *
         * @param {Object} highlight  - top, right, bottom, left of highlit area
         * @param {String} text   - tooltip text
         */
        showToolTip: function(highlight, text) {
            this.clearLocationClass();
            this.$tooltip.text(text);

            var h = this.tipBoxHeight;
            var w = this.tipBoxWidth * text.length;
            var screen = this.getScreenBounds();

            // find best, ok and fallback locations for the tooltip
            var good = this.possibleTipLocation(highlight, screen, (screen.right - screen.left) / 8, (screen.bottom - screen.top) / 8);
            var ok = this.possibleTipLocation(highlight, screen, w, h);
            var fallback = this.fallbackTipLocation(ok);

            var fn = this.displayFn(good)
                  || this.displayFn(ok)
                  || this.displayFn(fallback);
            fn.call(this, highlight, screen, h, w);

            this.$tooltip.show();
        },

        /**
         * Calculate available bounds of screen
         * Takes PhpDebugBar into consideration
         *
         * @return {Object} - top, right, bottom, left values of available screen
         */
        getScreenBounds: function() {
            var body = $('body');
            return {
                top: body.scrollTop(),
                right: window.innerWidth + body.scrollLeft(),
                bottom: $('.phpdebugbar').offset().top,
                left: body.scrollLeft()
            };
        },

        /**
         * Calculates which top, right, bottom, left locations are possible for the tooltip
         * given the bounds to indicate, the screen size and the width/height to allow for the tooltip
         *
         * @param {Object} highlight  - top, right, bottom, left of highlit area
         * @param {Object} screen  - top, right, bottom, left of available screen
         * @param {integer} width  - minimum width to allow for the display of the tooltip
         * @param {integer} height - minimum height to allow for the display of the tooltip
         * @return {Object}        - top, right, bottom, left boolean values, true = possible location for tooltip
         */
        possibleTipLocation: function(highlight, screen, width, height) {
            return {
                top: highlight.top >= height,
                right: highlight.right <= screen.right - width,
                bottom: highlight.bottom <= screen.bottom - height,
                left:  highlight.left >= width
            };
        },

        /**
         * Fallback location for display of tooltip if preferred location cannot be established
         * 
         * Location supplied will not contain an agreed topleft, topright, bottomleft, bottomright
         * location for the tooltip
         *
         * Fallback will prefer bottom and left but will use top or right if they are possible
         * Fallback will always yeild a valid location for the tooltip
         *
         * @param {Object} location - top, right, bottom, left boolean values, true = possible location for tooltip
         * @return {Object}         - top, right, bottom, left boolean values, true = possible location for tooltip
         */
        fallbackTipLocation: function(location) {
            return {
                top: location.top,
                right: location.right,
                left: location.left || !location.right,
                bottom: location.bottom || !location.top
            };
        },

        /**
         * Calculate largest bounds of area covered by the 
         * elements between begin and end (inclusive) 
         *
         * @param {jQuery} begin - the start element
         * @param {jQuery} end   - the end element
         * @return {Object}      - top, right, bottom, left bounds that surrounds all elements
         *                         return nothing if parent is hidden
         */
        combineBounds: function(begin, end) {
            if(begin.parent().css('display') === 'none') return;

            var off, res, display, h, w;
            var content = false; // Have we seen anything since beginning
            for(var elem = begin.next() ; !elem.is(end) && elem.length ; elem = elem.next()) {
                display = elem.css('display');
                if((off = elem.offset()) && display !== 'none' && display !== 'inline') {
                    h = elem.outerHeight();
                    w = elem.outerWidth();
                    if(!content) {
                        res = {
                            top: off.top,
                            right: off.left + w,
                            bottom: off.top + h,
                            left: off.left
                        };
                        content = true;
                    } else {
                        res.top = Math.min(res.top, off.top);
                        res.right = Math.max(res.right, off.left + w);
                        res.bottom = Math.max(res.bottom, off.top + h);
                        res.left = Math.min(res.left, off.left);
                    }
                }
            }
            if(!content) {
                off = begin.offset();
                res = {top: off.top, right: off.left, bottom: off.top, left: off.left};
                off = end.offset();
                h = end.height();
                if(res.top + h <= off.top) {
                    // spans on different lines
                    // so must go to parent block container
                    // to calculate left and right 
                    res.bottom = off.top;
                    var p = this.parentLeftRight(begin);
                    if(p) {
                        res.left = p.left;
                        res.right = p.right;
                    }
                } else {
                    res.bottom = off.top + h;
                    res.right = off.left;
                }
            }
            return res;
        },

        /**
         * Find nearest non-inline parent and calculate left and right
         *
         * Needed for finding bounds of in-line elements that span several lines.
         *
         * @param {jQuery} elem - element whose parent to check
         * @return {Object}     - left and right position of parent     
         */
        parentLeftRight: function(elem) {
            var parents = elem.parents();
            var i = 0;
            for(; i < parents.length && parents.eq(i).css('display') === 'inline'; i++) 
            ;

            // Should never happen (body set to inline?) but just in case
            if(i === parents.length) return;

            var parent = parents.eq(i);
            var offset = parent.offset();
            var left = offset.left + parseInt(parent.css('margin-left')) + parseInt(parent.css('border-left-width'));
            var right = left + parent.innerWidth();
            return { left: left, right: right };
        },

       /**
        * Select a tooltip display function given the permitted location
        *
        * @param {Object} location - top, right, bottom, left booleans indicating permitted tooltip locations
        * @return {Function}     - one of bottomLeft, bottomRight, topLeft, topRight
        */
        displayFn: function(location) {
            if(location.bottom) {
                if(location.left) {
                    return this.bottomLeft;
                } else if(location.right) {
                    return this.bottomRight;
                }
            } else if(location.top) {
                if(location.left) {
                    return this.topLeft;
                } else if(location.right) {
                    return this.topRight;
                }
            }
        },

        /**
         * Sets the correct CSS class on the tooltip so that the pointer
         * is located in the correct place
         *
         * @param {String} topbottom - tooltip is located at 'top' or 'bottom'
         * @param {String} leftright - tooltip is located at 'left' or 'right'
         */
        setLocationClass: function(topbottom, leftright) {
            // Note: tip at top left needs a bottom pointer so swap top <=> bottom
            this.$tooltip
                    .addClass(cssClass.point[topbottom === 'top' ? 'bottom' : 'top'])
                    .addClass(cssClass.point[leftright]);
        },

        /**
         * Remove tooltip location related CSS classes
         */
        clearLocationClass: function() {
            ['top', 'bottom', 'left', 'right'].forEach(function(where) {
                this.$tooltip.removeClass(cssClass.point[where]);
            }, this);
        },

        /**
         * Display tooltip at top left
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        topLeft: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.left - this.tipPointOffset)
            },
            'top', 'left');
        },

        /**
         * Display tooltip at top right
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
       topRight: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.right - width + this.tipPointOffset) 
            },
            'top', 'right');
        },

        /**
         * Display tooltip at bottom left
         * 
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        bottomLeft: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.left - this.tipPointOffset) 
            },
            'bottom', 'left');
        },

        /**
         * Display tooltip at bottom right
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {in/teger} width - width of tooltip box
         */
        bottomRight: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.right - width + this.tipPointOffset) 
            },
            'bottom', 'right');
        },

        /**
         * Display tooltip at correct position with pointer in the right place
         *
         * @param {Object} pos       - top and left position for tooltip
         * @param {String} topbottom - tooltip at 'top' or 'bottom' of highlight
         * @param {String} leftright - tooltip at 'left' or 'right' og highlight
         */ 
        position: function(pos, topbottom, leftright) {
            var body = $('body');
            this.$tooltip.css('top', pos.top).css('left', pos.left);
            this.setLocationClass(topbottom, leftright);
        },

        /**
         * Ensure top of tooltip is on the screen
         *
         * @param {Object} screen  - top, right, bottom, left of visible screen
         * @param {integer} height - tooltip height
         * @param {integer} top    - current top position
         * @return {integer}       - top position that is on screen
         */
        visibleTop: function(screen, height, top) {
            return Math.min(screen.bottom - height - this.tipPointHeight, Math.max(screen.top + this.tipPointHeight, top));
        },

 
        /**
         * Ensure left of tooltip is on the screen
         *
         * @param {Object} screen - top, right, bottom, left of visible screen
         * @param {integer} width - tooltip width
         * @param {integer} left  - current left position
         * @return {integer}      - left position that is on screen
         */
       visibleLeft: function(screen, width, left) {
            return Math.min(screen.right - width - this.tipPointOffset, Math.max(screen.left + this.tipPointOffset, left));
        },

        // Approx size/position of tip box and tip point
        // Might be better to get actual dimensions
        // but approximations seem to work ok
        tipPointOffset: 16,
        tipPointHeight: 8,
        tipBoxHeight: 18,
        tipBoxWidth: 9,
        
    });
});



/**
 * A TabBox for displaying the Layout PageView and Layout HandleView
 *
 * @module layoutviewer
 * @author Bob Davison
 * @version 1.0
 */
define('layoutviewer',['class', 'tabbox', 'pageview', 'handleview', 'layouthighlighter'],

function(Class, TabBox, PageView, HandleView, LayoutHighlighter) {

    return Class.extend(TabBox, {

        /**
         * Adds tabs for 'Page' and 'Handle' views
         * Creates a LayoutBlockHighlighter for highlighting blocks
         * in Page View
         *
         * @param {ResourceLoader} loader - for views to load resources from the server
         * @param {LayoutModel} layout    - for views to access layout config data
         */
        constructor: function(loader, layout) {
            this.super.constructor.call(this);
            
            var highlighter = new LayoutHighlighter();

            this.pageView = this.addTab(new PageView(loader, layout, highlighter));
            this.addTab(new HandleView(loader, layout));
            this.activateTab(this.pageView);
        },

    });
});

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
define('fileview',['class', 'tabcontent', 'cssclass', 'ace/ace'], 

function(Class, TabContent, CssClass, Ace) {

    var cssClass = CssClass.generate('fileview', ['action', 'disabled']); 

    var Range = Ace.require('ace/range');
    var TokenIterator = Ace.require('ace/token_iterator');

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
         * Get Magento relative path of file
         *
         * @return {String} - Magento relative path
         */
        getPath: function() {
            return this.fileinfo.path;
        },

        /**
         * Get current line in file (1 index based)
         *
         * @return {integer} - current line in file
         */
        currentLine: function() {
            return 1 + this.editor.getSelectionRange().start.row;
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

/**
 * Simple, single level, context menu
 *
 * Menu items are specified as an array of:
 *
 * { 
 *   label: text to display
 *   action: function to call
 * }
 *
 * The action function will be passed the jQuery object
 * that the context menu was attached to.
 *
 * @module contextmenu
 * @author Bob Davison
 * @version 1.0
 */

define('contextmenu',['jquery', 'cssclass', 'class'],

function($, CssClass, Class) {

    var cssClass = CssClass.generate('contextmenu', ['menu']);

    return Class.create({
        /**
         * Construct context menu with given menu items
         *
         * @param {Array} menuItems - items to comprise the menu
         */
        constructor: function(menuItems) {
            this.$menu = $('<ul />').addClass(cssClass.menu);
            this.menuItems = menuItems;
            this.mouseup = this.mouseup.bind(this);
        },

        /**
         * Add a menu item, click will pass elem to the menu item action
         *
         * @param {jQuery} elem - the element that the menu is attached to
         * @param {Object} menuItem - details of the menu item to add
         */
        addMenuItem: function(elem, menuItem) {
            var item = $('<li />').text(menuItem.label).appendTo(this.$menu);
            item.on('click', this.click.bind(this, elem, menuItem.action));
        },

        /**
         * React to click on the menu item
         *
         * Hide the menu and run the action
         *
         * @param {jQuery} elem     - the element that the menu is attached to
         * @param {Function} action - the action function 
         */
        click: function(elem, action) {
                $(document).off('mouseup', this.mouseup);
                this.hide();
            action(elem);
        },

        /**
         * Attach this context menu to the given element
         *
         * The same context menu can be attached to many elements
         *
         * @param {jQuery} elem - the element to attach the context menu to
         */
        attach: function(elem) {
            elem.on('contextmenu', this.show.bind(this, elem));
        },

        /**
         * Show the menu
         *
         * @param {jQuery} elem - the element that the menu is attached to
         * @param {Event} event - the contextmenu event
         */
        show: function(elem, event) {
            var body = $('body');

            // Prevent default contextmenu
            event.preventDefault();

            // An old menu could still be showing
            this.hide();

            // Add the context menu items
            this.menuItems.forEach(this.addMenuItem.bind(this, elem));

            // Place in DOM
            this.$menu.appendTo($('body'));

            // Move to the into position
            this.position(event.clientX, event.clientY);

            // Use left mouseup to hide
            $(document).on('mouseup', this.mouseup);
        },

        /**
         * Position the menu where it can be seen
         *
         * Preferably down and right from mouse click
         *
         * @param {integer} x - x position of mouse in client area
         * @param {integer} y - y position of mouse in client area
         */
        position: function(x, y) {
            var menu = this.$menu; // save having to lookup all the time
            var height = menu.outerHeight();
            var width = menu.outerWidth();
            var body = $('body');
            var posX = x + body.scrollLeft();
            var posY = y + body.scrollTop();
            if(y + height > window.innerHeight && y > height) {
                posY -= height;
            }
            if(x + width > window.innerWidth && x > width) {
                posX -= width;
            }

            menu.css('top', posY + 'px').css('left', posX + 'px');
        },

        /**
         * Listen to other mouseup events so we can hide the menu
         *
         * @param {Event} e - the mouseup event
         */
        mouseup: function(e) {
            // Left click anywhere else hides menu
            if(e.which === 1 && e.target.offsetParent !== this.$menu.get(0)) {
                $(document).off('mouseup', this.mouseup);
                this.hide();
            }
        },

        /**
         * Hide the menu if visible
         */
        hide: function() {
            if(this.$menu.children().length) {
                this.$menu.empty();
                this.$menu.detach();
            }
        }
    });
});


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
define('remotecall',['jquery'],

function($) {

    return {

        open: function(path, line) {
            // Fire and forget
            $.get("http://localhost:8091?message=" + path + ":" + line);
        }
    };
});

/**
 * Provides a tab box for displaying files in an Ace editor
 * Each file gets its own closeable tab
 *
 * @module fileviewer
 * @author Bob Davison
 * @version 1.0
 */
define('fileviewer',['jquery', 'class', 'tabbox', 'ace/ace', 'fileview', 'contextmenu', 'remotecall'],

function($, Class, TabBox, Ace, FileView, ContextMenu, RemoteCall) {

    return Class.extend(TabBox, {

        /**
         * Create the FileViewer
         * Adds a contianer div to hold the Ace editor
         */
        constructor: function() {
            this.super.constructor.call(this);
            $('<div />').attr('id', 'magedebugbar-fileviewer').addClass(this.activeClass()).appendTo(this.getContent());
            this.createContextMenu();
        },

        createContextMenu: function() {
            this.contextMenu = new ContextMenu([
                { label: 'Open in Editor', action: this.openInEditor.bind(this) },
                { label: 'Close', action: this.removeTab.bind(this) },
                { label: 'Close Others', action: this.removeOtherTabs.bind(this) },
                { label: 'Close All', action: this.removeAllTabs.bind(this) }
            ]);
        },

        openInEditor: function(tab) {
            var view = this.getTabContent(tab);
            RemoteCall.open(view.getPath(), view.currentLine());
        },

        

        /**
         * Append the container div to the container and create and
         * Ace editor component to go inside the container
         *
         * @param {jQuery} element - element to append to
         */
        appendTo: function(element) {
            this.super.appendTo.call(this, element);
            this.editor = Ace.edit('magedebugbar-fileviewer');
            this.editor.setReadOnly(true);
            this.editor.setShowPrintMargin(false);
            this.editor.setTheme("ace/theme/chrome");

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
                this.contextMenu.attach(tab);
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
            var tab = this.$tabs.children('.' + this.activeClass());
            if(tab.length) {
                return this.getTabContent(tab);
            }
        },

    });


});


/**
 * Class responsible for requesting resources from the server
 * and passing the responses on to the correct handler
 *
 * @module resourceloader
 * @author Bob Davison
 * @version 1.0
 */
define('resourceloader',['class'],

function(Class) {

    return Class.create({

        /**
         * Create loader
         *
         * Requires access to layout config data as some requests need additonal
         * config information
         *
         * @param {LayoutModel} - layout config data
         */
        constructor: function(layoutModel) {
            this.layoutModel = layoutModel;
            this.handlers = [];
        },

        /**
         * Register handler to handle responses from the server
         *
         * @param {Object} handler  - handler for one type of responses
         * @return {ResourceLoader} - self
         */
        registerHandler: function(handler) {
            this.handlers[handler.type] = handler;
            return this;
        },

        /**
         * Request value of store config flag
         *
         * @param {String} flag - store config flag
         */
        loadStoreConfigFlag: function(flag) {
            this.load("store=" + this.layoutModel.getStore() + "&config-flag=" + flag);
        },

        /**
         * Request file for block class and method
         *
         * @param {String} name   - Magento block alias
         * @param {String} method - method in block class
         */ 
        loadBlockClass: function(alias, method) {
           var qstring =  "block=" + alias;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        /**
         * Request file for helper class and method
         *
         * @param {String} name   - Magento block alias
         * @param {String} method - method in block class
         */ 
        loadHelperClass: function(alias, method) {
           var qstring =  "helper=" + alias;
           if(method) {
              qstring += "&method=" + method;
           }
          this.load(qstring);
        },

        /**
         * Request file for helper class/method
         *
         * @param {string} helper - <helper class alias>/<method>
         */
        loadHelper: function(helper) {
            var h = this.layoutModel.splitHelper(helper);
            this.loadHelperClass(h.alias, h.method);
        },

        /**
         * Request file for block name and method
         *
         * Use layout config data to resolve block class alias from block name
         *
         * @param {String} name - block name
         * @param {String} method - method in block class
         */
        loadBlockMethod: function(name, method) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                var alias = block.attrs.type;
                this.loadBlockClass(alias, method);
            }
        },

        /**
         * Request template file
         *
         * Use layout config data to lookup template filename
         *
         * @param {String} template - Magento short template name
         */
        loadTemplate: function(template) {
            var file = this.layoutModel.findTemplateFile(template);
            if(file) {
                this.loadFile(file);
            }
        },

        /**
         * Request config file for named block
         * 
         * Use layout config data to lookup block details from block name
         *
         * @param {String} name - block name
         */ 
        loadBlock: function(name) {
            var block = this.layoutModel.findBlock(name);
            if(block) {
                this.loadFile(this.layoutModel.configFileName(block.file), block.line);
            }
        },

        /**
         * Request file at given line
         *
         * @param {String} file  - Magento relative file path
         * @param {integer} line - line number
         */
        loadFile: function(file, line) {
            var qstring = "file=" + file;
            if(line) {
               qstring += "&line=" + line;
            }
            this.load(qstring);
        },
           
       /**
        * Send request to server with given query string
        * and wait (async) for response
        *
        * @param {String} qstring - query string
        */ 
        load: function(qstring) {
            this.get(qstring)
                .then(function(response) {
                    this.handleResponse(JSON.parse(response));
                }.bind(this))
                .catch(function(err) {
                    console.error(err);
                });
        },

        /**
         * Pass the server response onto the correct handler
         * Handler determined by response type
         *
         * @param {Object} response - response from server
         */
        handleResponse: function(response) {
            var handler = this.handlers[response.type];
            if(handler) {
                handler.handle(response);
            } else {
                console.error('Unhandled response from host', response);
            }
        },


        /**
         * Low level Ajax call handling
         *
         * Modified from http://www.html5rocks.com/en/tutorials/es6/promises/
         *
         * @param {String} qstring - query string to send with Ajax request
         * @return {Promise}       - Javascript promise that yeilds response when resolved
         */
        get: function(qstring) {
            return new Promise(function(resolve, reject) {
                var req = new XMLHttpRequest();
                req.open('GET', '/magedebugbar.php?' + qstring);

                req.onload = function() {
                    // This is called even on 404 etc
                    // so check the status
                    if (req.status == 200) {
                        // Resolve the promise with the response text
                        resolve(req.response);
                    }
                    else {
                        // Otherwise reject with the status text
                        // which will hopefully be a meaningful error
                        reject(Error(req.statusText));
                    }
                };

                // Handle network errors
                req.onerror = function() {
                    reject(Error("Network Error"));
                };

                // Make the request
                req.send();
            });
        },

    });

});



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
define('filehandler',['class'],

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
        registerCustomizer: function(customizer) {
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

/**
 * Responds to alert responses from the server
 *
 * At the moment just uses Javascript alert to display the message
 *
 * @module alerthandler
 * @author Bob Davison
 * @version 1.0
 */
define('alerthandler',['class'],

function(Class) {

    return Class.create({

        /**
         * This is a handler for responses of type 'alert'
         */
        type: 'alert',

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

/**
 * Recursive descent parser for the Ace Editor token stream from a complete Layout Config XML file
 * Produces actions which define an area of the file and what should be done with it.
 *
 * Generates an array of actions grouped by the row of the file
 * [row] => array of actions for that row of the file
 *
 * Where each action is:
 * {
 *  row1: first row of file for action
 *  col1: first col of file for action
 *  row2: second row of file for action
 *  col2: second col of file for action
 *  type: 'line' for action to be between col1 and col2 on same line
 *        'block' for action to cover whole lines
 *  action: function to perform action (optional, missing action implies disabled area of file)
 * }
 *
 * @module layoutfileparser
 * @author Bob Davison
 * @version 1.0
 */
define('layoutfileparser',['class'],

function(Class) { 

    return Class.create({

        /**
         * Parser needs to look layout data in the model
         * and produces actions that load resources from the server
         */
        constructor: function(resourceLoader, layoutModel) {
            this.resourceLoader = resourceLoader;
            this.layoutModel = layoutModel;
        },
    
        /**
         * Parse the token stream for a layout config file and build up array of actions
         * for each row in the document.
         * (Well, each row that has actions)
         *
         * @param {Ace/TokenIterator} iterator - iterator for token stream for entire file
         * @return {Array}                     - array of rows, each is action array for given row
         */
        parse: function(iterator) {
            this.actions = [];
            this.document(iterator);
            return this.actions;
        },
    
        /**
         * Parsing tag, expecting attributes
         *
         * Inside tag, just had element name token
         * Call correct functions for any attributes in attr
         * Call default function (if supplied) for any attributes not in attr
         * Process up to end of element tag
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {Array} attrs  - array of attribute names to process
         * @param {Function} def - default function to call for unprocessed attributes (optional)
         * @return {boolean} - true if element may contain children i.e. not a self-closing tag
         */
        attributes: function(iterator, attrs, def) {
            attrs = attrs || [];
            var token;
            while(token = iterator.stepForward()) {
                switch(token.type) {
                case 'entity.other.attribute-name.xml':
                    name = token.value;
                    break;
                case 'string.attribute-value.xml':
                    var val = this.attributeValue(token.value);
                    if(-1 !== attrs.indexOf(name)) {
                        this[name + 'Attribute'](iterator, val);
                    } else if(def) {
                        def.bind(this)(iterator, name, val);
                    }
                    break;
                case 'meta.tag.punctuation.tag-close.xml':
                    var open = '>' === token.value;
                    if(!open) {
                        this.closeElement();
                    }
                    return open;
                }
            }    
        },
    
        /**
         * Parsing, expecting a start tag
         *
         * Find next tag name and call correct function for any elements names in elem
         * If not in elems and there is a def method then call that
         * Process up to and including close tag
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {Array} elems - array of element names to process
         * @param {Function} def - function to call for unspecified elements (optional)
         */
        elements: function(iterator, elems, def) {
            elems = elems || [];
            var token;
            while(token = iterator.stepForward()) {
                switch(token.type) {
                case 'meta.tag.tag-name.xml':
                    this.openElement();
                    if(-1 !== elems.indexOf(token.value)) {
                        this[token.value + 'Element'](iterator);
                    } else if(def) {
                        def.bind(this)(iterator, token.value);
                    } else {
                        this.anyElem(iterator);
                    }
                    break;
                case 'meta.tag.punctuation.end-tag-open.xml':
                    this.closeElement();
                    this.endTag(iterator);
                    return;
                }
            }
        },
    
        /**
         * Opened an element so increase level
         */
        openElement: function() {
            this.level = this.level || 0;
            this.level++;
        },
    
        /**
         * Closed element so decrease level
         */
        closeElement: function() {
            this.level--;
            this.popBlockNames();
        },
    
        /**
         * Remove surrounding quotes from attribute value
         *
         * @param {String} attr - attribure value with surrounding quotes
         * @return {String}     - attribute value without surrounding quotes
         */
        attributeValue: function(attr) {
            return attr.slice(1, -1);
        },
    
        /**
         * Used as a default function for calls to the elements() method
         * to consume unwanted elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        anyElem: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator);
            }
        },
    
        /**
         * Detected </ so skip past rest of end tag
         *
         * @param {Ace/TokenIterator} - token stream
         */
        endTag: function(iterator) {
            iterator.stepForward(); // Element name
            iterator.stepForward(); // >
        },
    
        /**
         * Parse the whole document
         *
         * Only interested in documents with a '<layout>' element
         *
         * @param {Ace/TokenIterator} - token stream
         */
        document: function(iterator) {
            for(var token = iterator.getCurrentToken() ; token !== null ; token = iterator.stepForward()) {
                if(token.value === 'layout' && token.type === 'meta.tag.tag-name.xml') {
                    this.layoutElement(iterator);
                    break;
                }
            }
        },
    
        /**
         * Parse the layout element
         *
         * Expect handle elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        layoutElement: function(iterator) {
            if(this.attributes(iterator)) {
                this.elements(iterator, [], this.handleElement);
            }
        },
    
        /**
         * Parse a handle element
         *
         * If a valid handle then expect block, refeence and remove elements
         * Otherwise create an action to disable this handle element in the FileView
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} handle     - name of handle element
         */
        handleElement: function(iterator, name) {
            if(this.attributes(iterator)) {
                if(this.layoutModel.validHandle(name)) {
                    this.elements(iterator, ['block', 'reference', 'remove']);
                } else {
                    this.disableHandle(iterator);
                }
            }
        },
    
        /**
         * Create and action to disable all rows for this handle element
         *
         * @param {Ace/TokenIterator} - token stream
         */
        disableHandle: function(iterator) {
            var row1 = iterator.getCurrentTokenRow();
            this.elements(iterator, []);
            var row2 = iterator.getCurrentTokenRow();

            this.addAction(row1, 0, row2, 0);
        },
    
        /**
         * Parsing a block element
         *
         * Expect attributes: type, template, before, after and module
         * Also lookout for name attribute as we have to note current block name for resolving ownership of actions
         *
         * Expect contained elements: block, action and remove elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        blockElement: function(iterator) {
            if(this.attributes(iterator, ['type', 'template', 'before', 'after', 'module'], this.checkBlockNameAttribute)) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },
        
        /**
         * Parsing a reference element
         *
         * Expect attribute: name
         * Expect contained elements: block, action and remove
         *
         * @param {Ace/TokenIterator} - token stream
         */
        referenceElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator, ['block', 'action', 'remove']);
            }
        },
    
        /**
         * Parsing a remove element
         *
         * Expect attributes: name
         * Not expecting any contained elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        removeElement: function(iterator) {
            if(this.attributes(iterator, ['name'])) {
                this.elements(iterator);
            }
        },
    
        /**
         * Parsing an action element
         *
         * Expect attributes: method, module, ifconfig
         * All contained elements are parameter elements
         *
         * @param {Ace/TokenIterator} - token stream
         */
        actionElement: function(iterator) {
            if(this.attributes(iterator, ['method', 'module', 'ifconfig'])) {
                this.elements(iterator, [], this.paramsElement);
            }
        },
    
        /**
         * Parsing a parameter element for an action
         *
         * Expect attribute: helper
         * Not expecting contained elements
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of parameter element
         */
        paramsElement: function(iterator, name) {
            if(this.attributes(iterator, ['helper'])) {
                this.elements(iterator);
            }
        },
    
        /**
         * Parsed a name attribute
         *
         * Note the name for resolving ownership of action elements
         * Create an action to load the config file with this name
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of name attribute
         */
        nameAttribute: function(iterator, name) {
            this.pushBlockName(name);
            this.nameAction(iterator,  name);
        },
    
        /**
         * Special processing for name attribute of block element
         *
         * Need to note the name for resolving ownership of action elements
         * but do not want to create an action as clicking on a block name would just load itself
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of attribute
         * @param {String} value      - value of attribute
         */
        checkBlockNameAttribute: function(iterator, name, value) {
            if('name' === name) { // Only the name attribute
                this.pushBlockName(value);
            }
        },
    
        /**
         * Parsed a before attribute
         *
         * If it is a block name (not '-' or '*') then create a name loading action
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of before attribute
         */
        beforeAttribute: function(iterator, name) {
            if(name !== '-' && name !== '*') {
                this.nameAction(iterator, name);
            }
        },
    
        /**
         * Parsed an after attribute
         *
         * If it is a block name (not '-' or '*') then create a name loading action
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - value of after attribute
         */
        afterAttribute: function(iterator, name) {
            if(name !== '-' && name != '*') {
                this.nameAction(iterator, name);
            }
        },
    
        /**
         * Parsed a type attribute
         *
         * Create an action to load the class for this type (block alias)
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} type       - value of type attribute
         */
        typeAttribute: function(iterator, type) {
            this.newAction(iterator, type, this.willLoadBlockClass(type));
        },

        /**
         * Parsed a template attribute
         *
         * Get template path from layout config data and if it exists
         * create an action to load the file
         * If it doesn't exist then create an action to disable the template attribute
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} template   - value of template attribute
         */
        templateAttribute: function(iterator, template) {
            var file = this.layoutModel.findTemplateFile(template);
            var action = file
                    ? this.willLoadFile(file)
                    : null;
            this.newAction(iterator, template, action);
        },

        /**
         * Parsed a method attribute
         *
         * Create an action to load the class of the containing block with this method
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} method     - value of method attribute
         */
        methodAttribute: function(iterator, method) {
            var name = this.currentBlockName();
            this.newAction(iterator, method, this.willLoadBlockMethod(name, method));
        },

        /**
         * Parsed a module attribute
         *
         * These atributes are used for translation via the special method '__'
         * Create an action to load the helper class of this module with the method '__'
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} module     - value of module attribute
         */
        moduleAttribute: function(iterator, module) {
            this.newAction(iterator, module, this.willLoadHelperClass(module, '__'));
        },

        /**
         * Parsed an ifconfig attribute
         *
         * Create an action to load the value of the config flag
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} config     - value of ifconfig attribute
         */
        ifconfigAttribute: function(iterator, config) {
            this.newAction(iterator, config, this.willLoadStoreConfigFlag(config));
        },

        /**
         * Parsed a helper attribute
         *
         * Create an action to load the helper class/method
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} helper       - value of helper attribute
         */
        helperAttribute: function(iterator, helper) {
            this.newAction(iterator, helper, this.willLoadHelper(helper));
        },

        /**
         * Create an action to load the config file for the named block
         * Check with the layout block that the named block was configured
         * If not then make an action to displable the name attribute
         *
         * @param {Ace/TokenIterator} - token stream
         * @param {String} name       - name of block
         */
        nameAction: function(iterator, name) {
            var action = this.layoutModel.findBlock(name) 
                         ? this.willLoadBlock(name)
                         : null;
            this.newAction(iterator, name, action);
        },

        /**
         * @param {String} blockAlias - Magento alias for block class
         * @return {Function} - to load the block class file at the correct line for the class defn
         */
        willLoadBlockClass: function(blockAlias) {
            return this.resourceLoader.loadBlockClass.bind(this.resourceLoader, blockAlias);
        },

       /**
        * @param {String} file - Magento relative file path
        * @return {Function} - to load the specified file
        */
        willLoadFile: function(file) {
            return this.resourceLoader.loadFile.bind(this.resourceLoader, file);
        },

        /**
         * @param {String} blockName - name of a config block
         * @return {Function} - to load the config file containing the block at the correct line for the block
         */
        willLoadBlock: function(blockName) {
            return this.resourceLoader.loadBlock.bind(this.resourceLoader, blockName);
        },

        /**
         * @param {String} blockName - name of config block
         * @param {String} method    - name of method
         * @return {Function}        - to load the block class file at the correct line for the method
         */
        willLoadBlockMethod: function(blockName, method) {
            return this.resourceLoader.loadBlockMethod.bind(this.resourceLoader, blockName, method);
        },

        /**
         * @param {String} helper - helper class / helper method
         * @return {Function}     - load the helper class file at the correct line for the method
         */
        willLoadHelper: function(helper) {
            return this.resourceLoader.loadHelper.bind(this.resourceLoader, helper);
        },

        /**
         * @param {String} helperAlias - Magento alias for helper class
         * @param {String} method      - method of helper class
         * @return {Function}          - to load the helper class at the correct line for the method
         */
        willLoadHelperClass: function(helperAlias, method) {
            return this.resourceLoader.loadHelperClass.bind(this.resourceLoader, helperAlias, method);
        },

        /**
         * @param {String} flag - Magento store config flag
         * @return {Function}   - to load the value of the store config flag
         */
        willLoadStoreConfigFlag: function(flag) {
            return this.resourceLoader.loadStoreConfigFlag.bind(this.resourceLoader, flag);
        },
        
        /**
         * Create a new action for a hotspot on the current row to ocver the given text and runthe given function
         *
         * @param {Ace/TokenIterator} iterator - token stream
         * @param {String} text                - the document text to cover with hotspot
         * @param {Function} action            - the function to run if hotspot clicked (optional, default is disabled)
         */
        newAction: function(iterator, text, action) {
            var row = iterator.getCurrentTokenRow();
            var col1 = 1 + iterator.getCurrentTokenColumn();
            var col2 = col1 + text.length;
        
            this.addAction(row, col1, row, col2, action);
        },

        /**
         * Add an action to the action array for all rows between row1 and row2 (inclusive)
         *
         * If row1 !== row2 then hotspot area covers entire rows and cols 1 and 2 are ignored
         *
         * @param {integer} row1 - first row of hotspot
         * @param {integer} col1 - first col of hotspot
         * @param {integer} row2 - last row of hotspot
         * @param {integer} col2 - last col of hotspot
         * @param {Function} action - function to perform if hotspot clicked (optional, default is disabled)
         */
        addAction: function(row1, col1, row2, col2, action) {
            var type = (row1 === row2) ? "line" : "block";
            var data = { row1: row1, col1: col1, row2: row2, col2: col2, action: action, type: type};
            for(var row = row1 ; row <= row2 ; row++ ) {
                this.actions[row] = this.actions[row] || [];
                this.actions[row].push(data);
            }
        },

        /**
         * Set the new current block name
         *
         * Add the given name to the top of the block name pile
         *
         * @param {String} name - block name
         */
        pushBlockName: function(name) {
            this.blockNames = this.blockNames || [];
            this.blockNames.push({ name: name, level: this.level });
        },
    
        /**
         * Remove any old block names to restore the correct current block name 
         *
         * Remove from the top of the block name pile names added
         * at levels higher than the current level
         */
        popBlockNames: function() {
            this.blockNames = this.blockNames || [];
            while(this.blockNames.length && this.blockNames[this.blockNames.length - 1].level > this.level) {
                this.blockNames.pop();
            }
        },
    
        /**
         * Return the current block name 
         *
         * The name that is on the top of the block name pile
         * 
         * @return {String} - block name
         */
        currentBlockName: function() {
            return this.blockNames[this.blockNames.length - 1].name;
        }

    });
});

/**
 * Customizer for Layout Config XML files
 *
 * Called by the FileView for text/xml files to see if it is a layout config file
 * and if it is return an action to be performed on the area of the file where
 * the mouse is.
 *
 * This permits 'hotspots' on the file where the user can click to load a another resource
 * or making areas of the file disabled (handles that are not used for example) 
 *
 * @module layoutfilecustomizer
 * @author Bob Davison
 * @version 1.0
 */
define('layoutfilecustomizer',['class', 'layoutfileparser'],

function(Class, LayoutFileParser) {

    return Class.create({

        /**
         * Customizer needs to load resources in response to 'hotspot' clicks
         * and access the layout config data to access active handles, template filenames, etc.
         *
         * @param {ResourceLoader} resourceLoader - for loading resources from the server
         * @param {LayoutModel} layoutModel       - for accessing layout config data
         */
        constructor: function(resourceLoader, layoutModel) {
            this.parser = new LayoutFileParser(resourceLoader, layoutModel);
        },

        /**
         * Mime-type of file this customizer is for
         */
        mimetype: 'text/xml',

        /**
         * The customized file view has just loaded a file, this gives us access to the entire token stream
         *
         * @param {Ace/TokenIterator} iterator - iterator over entire token stream for a config file
         */
        setTokens: function(iterator) {
            this.actions = this.parser.parse(iterator);
        },

        /**
         * Get an action for the given position in the config file document
         * Looks up actions created in setTokens()
         *
         * @param {Ace/Token} token - the token atthe given position in the document
         * @param {Object} pos      - row and column of position in document
         * @return {Object}         - @see LayoutFileParser, nothing if no action
         */
        getAction: function(token, pos) {
            var action = this.findAction(pos);
            // TODO: is this test necesary? Why can't we return any found action?
            if(action) {
                if(action.type === 'block' || token.type === 'string.attribute-value.xml') {
                    return action;
                }
            }
        },

        /**
         * Lookup the action for given position in document
         *
         * @param {Object} pos - row and column of position in document
         * @return {Object}    - @see LayouFileParser, nothing if no action found
         */
        findAction: function(pos) {
            var row = pos.row;
            var rowActions = this.actions[row];
            if(rowActions) {
                var col = pos.column;
                var len = rowActions.length;
                for(var i = 0 ; i < len ; i++) {
                    var action = rowActions[i];
                    // Block actions only have to be on correct row
                    if(action.type === 'block') {
                        return action;
                    }
                    // Odd token recognition by Ace editor
                    // We have to allow extra column at
                    // the end but not at the beginning
                    if(col > action.col2 + 1) {
                        continue;
                    } else if(col >= action.col1) {
                        return action;
                    } else {
                        break;
                    }
                }
            }
        },

    });
});

/**
 * The main panel for the PhpDebugBar layout tab
 *
 * Provides a
 *  left panel for the LayoutViewer
 *  right panel for the FileViewer
 *
 * and a draggable resize handle between them
 *
 * @module layoutpanel
 * @author Bob Davison
 * @version 1.0
 */
define('layoutpanel',['jquery', 'class', 'cssclass', 'layoutmodel', 'layoutviewer', 'fileviewer',
        'resourceloader', 'filehandler', 'alerthandler', 'layoutfilecustomizer'],

function($, Class, CssClass, LayoutModel, LayoutViewer, FileViewer,
         ResourceLoader, FileHandler, AlertHandler, LayoutFileCustomizer) {

    var cssClass = CssClass.generate('layout', ['panel', 'left', 'right', 'resize-handle']);

    return Class.create({

        /**
         * Create the required main, left, right and resize handle components
         * And add handlers to support dragging the resize handle
         *
         * @param {jQuery} panel - PhpDebugBar.Widget created by magedebugbar.js
         */
        constructor: function(panel) {
            this.$panel = panel.addClass(cssClass.panel);
            this.$left = $('<div />').addClass(cssClass.left).appendTo(this.$panel);
            this.$resizehdle = $('<div />').addClass(cssClass.resize.handle).appendTo(this.$panel);
            this.$right = $('<div />').addClass(cssClass.right).appendTo(this.$panel);

            this.addResizeHandlers();
        },

        /**
         * Add event handler to support dragging the resize handle
         * mousedown: add mousemove and mouseup handlers to start dragging
         * mousemove: change the size of the panels
         * mouseup: remove the mousemove and mousup handlers to stop dragging
         */
        addResizeHandlers: function() {
            var pos_x, orig_w, orig_cursor;
            orig_cursor = this.$panel.css('cursor');

            this.$resizehdle.on('mousedown', function(e) {
                orig_w = this.$left.width();
                pos_x = e.pageX;
                this.$panel.on('mousemove', mousemove).on('mouseup', mouseup);
                this.$panel.css('cursor', 'col-resize');
            }.bind(this));

            var mousemove = function(e) {
                var w = Math.min(this.$panel.width() - this.$resizehdle.width(), Math.max(100, orig_w - pos_x + e.pageX));
                this.$left.width(w);
                this.resize();
            }.bind(this);

            var mouseup = function() {
                this.$panel.off('mousemove', mousemove).off('mouseup', mouseup);
                this.$panel.css('cursor', orig_cursor);
            }.bind(this);
        },

        /**
         * New layout configuration data has been supplied by the server
         * so reload the LayoutViewer and FileViewer components
         *
         * @param {Object} data - layout configuration downloaded from server
         */
        setLayout: function(data) {
            this.$left.children().remove();
            this.$right.children().remove();

            var layout = new LayoutModel(data);
            this.fileviewer = new FileViewer();
            this.layoutviewer = new LayoutViewer(this.resourceLoader(layout, this.fileviewer), layout);
            this.layoutviewer.appendTo(this.$left);
            this.fileviewer.appendTo(this.$right);

            this.resize();
        },

        /**
         * Container has been resized so resize content
         */
        resize: function() {
            this.$right.css('margin-left', this.$left.width() + this.$resizehdle.width());
            this.layoutviewer.resize();
            this.fileviewer.resize();
        },

        /**
         * Create a ResourceLoader to get resources from the server
         * and pass them to the correct response handler
         *
         * @param {LayoutMode} layout     - access to layout config data
         * @param {FileViewer} fileviewer - recipient of loaded files
         * @return {ResourceLoader}       - object to request resources from the server
         */
        resourceLoader: function(layout, fileviewer) {
            var loader = new ResourceLoader(layout);
            
            var fileHandler = new FileHandler(fileviewer);
            var customizer = new LayoutFileCustomizer(loader, layout);
            fileHandler.registerCustomizer(customizer);

            var alertHandler = new AlertHandler();

            loader.registerHandler(fileHandler)
                  .registerHandler(alertHandler);

           return loader;
        },
    });
      
});



/**
 * Creates the LayoutPanel and adds it to the PhpDebugBar provided panel
 *
 * Passes window resize and PhpDebugBar resize events to the LayoutPanel
 * Passes data supplied by the server to the LayoutPanel
 *
 * @author Bob Davison
 * @version 1.0
 */

// Not loaded via requirejs as the PhpDebugBar component
// will be needed before requirejs's aynch load
var layoutTab =
(function($, PhpDebugBar) {

     return PhpDebugBar.Widget.extend({

        render: function() {
            // Load everything else via requirejs
            require(['layoutpanel'], function(LayoutPanel) {
                this.panel = new LayoutPanel(this.$el);
                if(this.layout) {
                    this.panel.setLayout(this.layout);
                    this.resize();
                }
            }.bind(this));

            // PhpDebugBar bug - bottom padding does not work
            // so we add a <div> at the end and resize that
            $('<div />').addClass('magedebugbar-padding-bottom').appendTo('body');
            phpdebugbar.recomputeBottomOffset = function() {
                $('.magedebugbar-padding-bottom').height($('.phpdebugbar').height());
            };

            // Resize content when window resizes
            $(window).on('resize', this.resize.bind(this));

            // Resize contents when phpdebugbar splitter is moved 
            // Unfortunately we want to resize after phpdebugbar but
            // it doesn't fire any events and we have no way if knowing
            // if our mousemove listener will fire before or after its
            // So we have to make sure we put an event on the end of the queue
            $('.phpdebugbar-drag-capture').on('mousemove', function(e) {
                window.setTimeout(function() {
                    this.resize();
                }.bind(this), 0);
            }.bind(this));

            // PhpDebugBar has layout data for us from the server
            // But panel may not be created yet
            this.bindAttr('data', function(layout) {
                if(this.panel) {
                    this.panel.setLayout(layout);
                } else {
                    this.layout = layout;
                }
            }.bind(this));
        },

        resize: function() {
            if(this.panel) {
                this.panel.resize();
            }
        },

    });

}(jQuery, PhpDebugBar));



define("layouttab", function(){});


define("magedebugbar", function(){});
window.MageDebugBar = { LayoutTab: layoutTab };}());