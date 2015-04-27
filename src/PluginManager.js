/**
 * The core of mntyjs which handles everything around plugins
 *
 * @private
 * @module PluginManager
 */
define(['Observable', 'Plugin', 'OptionParser', 'StringUtils', 'Logging', 'jquery', 'MutationObserver', 'FnUtils', 'when'], function (Observable, Plugin, OptionParser, StringUtils, Logging, $, MutationObserver, FnUtils, when) {
    var PluginManager,
        instances = {},
        mutationObserver,
        logger = Logging.getLogger('PluginManager'),
        currId = 1;

    /**
     * Ensures data- prefix for given attribute
     *
     * @param attr
     * @returns {String}
     */
    function convertToDataAttribute (attr) {
        if (attr.substr(0, 5) !== 'data-') {
            attr = 'data-' + attr;
        }

        return attr;
    }

    PluginManager = Observable.extend({
        name: 'PluginManager',
        config: {
            loadFrom: '',
            loggingEnabled: false,
            disabledPlugins: [],
            baseUrl: '',
            mountPoint: 'mount',
            idProperty: 'mid'
        },
        constructor: function () {
            var me = this,
                cb = FnUtils.bind(me.handleMutations, me);

            me.base();
            mutationObserver = new MutationObserver(cb);
        },
        /**
         * Handles any mutation of the DOM
         */
        handleMutations: function (mutations) {
            var me = this;
            mutations.forEach(me.handleMutation, me);
        },
        /**
         * Handles a single mutation
         *
         * @param {MutationRecord} mutationRecord
         */
        handleMutation: function (mutationRecord) {
            var me = this,
                type = StringUtils.ucFirst(mutationRecord.type),
                handler = StringUtils.format('handle{0}Mutation', type);

            if (me[handler]) {
                me[handler].call(me, mutationRecord);
            }
        },
        /**
         * Handles a child list mutation
         *
         * @param {MutationRecord} mutationRecord
         */
        handleChildListMutation: function (mutationRecord) {
            var me = this,
                addedNodes = Array.prototype.slice.call(mutationRecord.addedNodes),
                removedNodes = Array.prototype.slice.call(mutationRecord.removedNodes);

            addedNodes.forEach(me.process, me);
            removedNodes.forEach(me.unmountPluginsOfRoot, me);
        },
        /**
         * Handles an attribute mutation
         *
         * @param {MutationRecord} mutationRecord
         */
        handleAttributesMutation: function (mutationRecord) {
            //@TODO: Implement dynamic mountPoint value change (adding / removing plugins)
        },
        /**
         * Converts the mount point value to a valid data-* attribute
         *
         * @private
         * @param {String} mountPoint
         * @returns {String}
         */
        applyMountPoint: function (mountPoint) {
            return convertToDataAttribute(mountPoint);
        },
        /**
         * Converts the mount point value to a valid data-* attribute
         *
         * @private
         * @param {String} mountPoint
         * @returns {String}
         */
        applyIdProperty: function (id) {
            return convertToDataAttribute(id);
        },
        /**
         * Prepares the plugin load path (strips trailing slashes)
         *
         * @private
         * @param {String} loadFrom
         * @return {String}
         */
        applyLoadFrom: function (loadFrom) {
            return loadFrom.replace(/\/$/, '');
        },
        /**
         * Activates / deactivates logging
         *
         * @private
         * @param {Boolean} loggingEnabled Whether logging should be enabled or not
         */
        updateLoggingEnabled: function (loggingEnabled) {
            Logging.setEnabled(loggingEnabled);
        },
        /**
         * Updates the base url for requirejs
         *
         * @private
         * @param {String} baseUrl The baseUrl the PluginManager should run from
         */
        updateBaseUrl: function (baseUrl) {
            require.config({
                baseUrl: baseUrl
            });
        },
        /**
         * Mounts the manager to given element
         *
         * @private
         */
        mount: function (root) {
            var me = this,
                mountPoint = me.getMountPoint();

            logger.debug('MOUNT');

            mutationObserver.observe(root, {
                childList: true,
                subtree: true,
                attributes: true,
                attriuteOldValue: true,
                attributeFilter: [
                    mountPoint
                ]
            });

            me.process(root);
        },
        /**
         * Processes mounting for given root element
         *
         * @param {HTMLElement} root
         */
        process: function (root) {
            var me = this,
                elements = me.lookupElements(root),
                pluginNames;

            if (!elements.length) {
                return;
            }

            logger.debug('Processing nodes...');
            pluginNames = me.determineUsedPlugins(elements);
            me.fetchPlugins(pluginNames, function (plugins) {
                me.mountAll(elements, plugins);
            });
        },
        /**
         * Unmounts the manager from given element
         *
         * @private
         */
        unmount: function (root) {
            logger.debug('UNMOUNT');

            mutationObserver.disconnect();
            this.unmountPluginsOfRoot(root);
        },
        /**
         * Unmounts all plugins of given element
         *
         * @param {HTMLElement} element
         */
        unmountPluginsOfRoot: function (element) {
            var me = this,
                elements = me.lookupElements(element);

            elements.forEach(me.unmountPluginsFromElement, me);
        },
        /**
         *
         * @param element
         */
        unmountPluginsFromElement: function (element) {
            var me = this,
                id = me.getElementId(element);

            me.unmountPluginsFromId(id);
        },
        /**
         * Unmounts all plugin instances of element with
         * given internal id
         *
         * @param {Integer} id The internal id of the element
         */
        unmountPluginsFromId: function (id) {
            var me = this,
                plugins = instances[id];

            if (!plugins) {
                return;
            }

            //@TODO: Optimize for more functional style
            Object.keys(plugins).forEach(function (pluginName) {
                me.unmountPluginFromId(id, pluginName);
            });
        },
        /**
         * Unmounts the plugin with given name of element with
         * given internal id
         *
         * @private
         * @param {Integer} id The internal id of the element
         * @param {String} pluginName The plugin's name
         */
        unmountPluginFromId: function (id, pluginName) {
            if (!instances[id] || !instances[id][pluginName]) {
                return;
            }

            logger.debug(StringUtils.format(
                'Unmounting plugin {0} from element[{1}]...',
                pluginName,
                id
            ));

            instances[id][pluginName].unmount();

            logger.debug(StringUtils.format(
                'Successfully unmounted plugin {0} from element[{1}].',
                pluginName,
                id
            ));

            delete instances[id][pluginName];

            if (!Object.keys(instances[id]).length) {
                delete instances[id];
            }
        },
        /**
         * Determines the plugins which are used by the given elements
         * and returns an array with the appropriate plugin names
         *
         * @private
         * @param {Array} elements The elements to scan for plugins
         * @returns {Array}
         */
        determineUsedPlugins: function (elements) {
            var me = this,
                allPlugins = [];

            //@TODO: Optimize to more functional style
            elements.forEach(function (element) {
                var plugins = me.determineElementPlugins(element);

                plugins.forEach(function (plugin) {
                    if ((allPlugins.indexOf(plugin) < 0) &&
                        !me.isPluginDisabled(plugin)) {

                        allPlugins.push(plugin);
                    }
                });
            });

            return allPlugins;
        },
        /**
         * Determines the used plugins for the given element
         * and returns their names as array
         *
         * @private
         * @param {HTMLElement) element The element to scan for plugins
         * @returns {Array}
         */
        determineElementPlugins: function (element) {
            var me = this,
                mountPoint = me.getMountPoint(),
                plugins = $(element).attr(mountPoint);

            if (plugins) {
                plugins = plugins.split(',');
            } else {
                plugins = [];
            }

            return plugins;
        },
        /**
         * Returns the options of the plugin with given name for the given element
         *
         * @private
         * @param {HTMLElement} element The element to retrieve the plugin options from
         * @param {String} pluginName The name of the plugin to retrieve the options for
         * @returns {Object}
         */
        determinePluginOptions: function (element, pluginName) {
            var optionsSelector = pluginName.replace(/\//g, '-').toLowerCase(),
                options = $(element).data(optionsSelector) || '';

            return OptionParser.parse(options);
        },
        /**
         * Performs a lookup for elements in the DOM which use plugins
         * and returns them
         *
         * @private
         * @returns {jQuery}
         */
        lookupElements: function (root) {
            var me = this,
                mountPoint = me.getMountPoint(),
                selector = '[' + mountPoint + ']',
                elements = $(selector, root).addBack(selector).toArray();


            return elements;
        },
        /**
         * Fetches the needed plugins by requiring them by name
         *
         * @private
         * @param {Array} plugins An plugin name array of the plugins to fetch
         * @param {Function} cb Function called after plugins are fetched
         */
        fetchPlugins: function (plugins, cb) {
            var me = this,
                fetchedPlugins = {},
                dfds = [];

            function toPath (plugin) {
                var pluginLoadPath = me.getLoadFrom();

                return [
                    pluginLoadPath,
                    plugin
                ].join('/');
            }

            //@TODO: Optimize to more functional style
            plugins.forEach(function (plugin) {
                var dfd = when.defer(),
                    pluginPath = toPath(plugin);

                dfds.push(dfd.promise);

                require([pluginPath], function (Plugin) {
                    fetchedPlugins[plugin] = Plugin;
                    dfd.resolve(plugin);
                }, function (err) {
                    fetchedPlugins[plugin] = Plugin.extend({
                        init: function () {
                            logger.warn(StringUtils.format(
                                'Could not load plugin "{0}" due to error:\n{1}',
                                plugin,
                                err.message
                            ));
                        }
                    });
                    dfd.resolve(plugin);
                });
            });

            // execute the callback as soon as all plugins have been loaded
            when.all(dfds).then(function () {
                cb(fetchedPlugins);
            });
        },
        /**
         * Mounts all plugin / options / element combinations
         *
         * @private
         * @param {Array} elements Array of elements which have plugins to mount
         * @param {Array} plugins Array of fetched plugin classes which have to be mounted
         */
        mountAll: function (elements, plugins) {
            var me = this,
                initialized = [],
                executed = [];

            logger.debug('Mounting plugins to elements...');
            //@TODO: Optimize to more functional style
            elements.forEach(function (element) {
                var elPlugins = me.determineElementPlugins(element),
                    id = me.addIdToElement(element);

                logger.debug(StringUtils.format(
                    'Processing element with id {0} [Tag:{1}, Plugins: [{2}], Classes: [{3}], ID: {4}]...',
                    id,
                    element.tagName,
                    elPlugins.join(', '),
                    element.className,
                    element.id
                ));

                //@TODO: Optimize to more functional style
                elPlugins.forEach(function (pluginName) {
                    var pluginClass,
                        options,
                        instance;

                    pluginName = $.trim(pluginName);

                    if (!me.isPluginDisabled(pluginName)) {
                        logger.debug(StringUtils.format(
                            'Mounting plugin {0} to element[{1}]...',
                            pluginName,
                            id
                        ));

                        pluginClass = plugins[pluginName];
                        options = me.determinePluginOptions(element, pluginName);

                        try {
                            instance = me.mountToElement(pluginClass, element, options);

                            if (!instances[id]) {
                                instances[id] = {};
                            }

                            instances[id][pluginName] = instance;

                            logger.debug(StringUtils.format(
                                'Successfully mounted instance of plugin "{0}" to element[{1}]',
                                pluginName,
                                id
                            ));

                            initialized.push(me.waitOnceFor(instance, 'initialized'));
                            executed.push(me.waitOnceFor(instance, 'executed'));
                        } catch (e) {
                            logger.error(StringUtils.format(
                                '{0} ocurred while instanciating plugin "{1}{2}{3}": {4}',
                                e.name,
                                pluginName,
                                e.file ? 'in file ' + e.file : '',
                                e.lineNumber ? ':' + e.lineNumber : '',
                                e.message
                            ));
                        }
                    }
                });
            });

            // fire "prepared" event
            logger.debug('Done.');
            logger.debug('Waiting for plugins to be initialized...');
            me.fire('prepared');

            // fire "ready" event, as soon as all plugins have been initialized
            when.all(initialized).then(function () {
                logger.debug('All plugins initialized. Waiting for all plugins to be executed...');
                me.fire('ready');
            });

            // fire "pluginsexecuted" event, as soon as all plugins have finished their execution
            when.all(executed).then(function () {
                logger.debug('All plugins executed.');
                me.fire('pluginsexecuted');
            });
        },
        /**
         * Creates an instances of the given plugin class for the given
         * element using the given options
         *
         * @private
         * @param {Plugin} PluginClass The Plugin to apply
         * @param {HTMLElement} element The element to mount the plugin to
         * @param {Object} options Configuration options
         * @returns {Plugin} The resulting plugin instance
         */
        mountToElement: function (PluginClass, element, options) {
            return new PluginClass(options, element, this);
        },
        /**
         * Adds an id for internal use to the given element
         *
         * @private
         * @param {HTMLElement} element The element to add the id to
         */
        addIdToElement: function (element) {
            var $el = $(element),
                idProp = this.getIdProperty(),
                id = $el.attr(idProp);

            if (!id) {
                id = currId++;
                $el.attr(idProp, id);
            }

            return id;
        },
        /**
         * Returns the internal id of the given element
         *
         * @private
         * @param {HTMLElement} element The element to determine the id from
         * @returns {Integer}
         */
        getElementId: function (element) {
            var idProp = this.getIdProperty();

            return parseInt($(element).attr(idProp), 10);
        },
        /**
         * Creates a deferred object for the given event on the given instance
         *
         * @private
         * @param {Plugin} instance The instance to wait for
         * @param {String} event The name of the event to wait for
         * @returns {Deferred} Deferred object which will be resolved when finished
         */
        waitOnceFor: function (instance, event) {
            var dfd = when.defer();

            instance.on(event, function () {
                dfd.resolve();
            }, instance, true);

            return dfd.promise;
        },
        /**
         * Returns if the plugin with the given name is disabled
         *
         * @private
         * @param {String} pluginName Name of the plugin to test
         * @returns {boolean} If plugin with given name is disabled or not
         */
        isPluginDisabled: function (pluginName) {
            var me = this,
                disabledPlugins = me.getDisabledPlugins();

            return (disabledPlugins.indexOf(pluginName) > -1);
        }
    });

    return new PluginManager();
});
