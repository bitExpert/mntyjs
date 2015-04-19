/**
 * The core of mntyjs which handles everything around plugins
 *
 * @private
 * @module PluginManager
 */
define(['Observable', 'Plugin', 'OptionParser', 'StringUtils', 'Logging', 'jquery', 'Window', 'FnUtils'], function (Observable, Plugin, OptionParser, StringUtils, Logging, $, Window, FnUtils) {
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
        config: {
            loadFrom: 'plugin',
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
            mutationObserver = new Window.MutationObserver(cb);
        },
        /**
         * Handles any mutation of the DOM
         */
        handleMutations: function (mutations) {
            var me = this;

            $.each(mutations, function (index, mutation) {
                me.handleMutation(mutation);
            });
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
                addedNodes = mutationRecord.addedNodes,
                removedNodes = mutationRecord.removedNodes;

            $.each(addedNodes, function (index, node) {
                logger.debug('Node addition detected. Performing process for element...');
                me.process(node);
            });

            $.each(removedNodes, function (index, node) {
                logger.debug('Node removal detected. Performing destroy for element...');
                me.destroyPluginsOfElement(node);
            });
        },
        /**
         * Handles an attribute mutation
         *
         * @param {MutationRecord} mutationRecord
         */
        handleAttributesMutation: function (mutationRecord) {
            console.log('attributes!', mutationRecord);
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
                pluginNames = me.determineUsedPlugins(elements);

            logger.debug('PROCESSING NODES...');
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
            this.destroyPluginsOfElement(root);
        },
        /**
         * Destroys all plugins of given element
         *
         * @param {HTMLElement} element
         */
        destroyPluginsOfElement: function (element) {
            var me = this,
                elements = me.lookupElements(element);

            $.each(elements, function (index, element) {
                var id = me.getElementId(element);
                me.destroyPluginsOfId(id);
            });
        },
        /**
         * Destroys all plugin instances of element with
         * given internal id
         *
         * @param {Integer} id The internal id of the element
         */
        destroyPluginsOfId: function (id) {
            var me = this,
                plugins = instances[id];

            if (!plugins) {
                return;
            }

            $.each(Object.keys(plugins), function (index, pluginName) {
                me.destroyPluginOfId(id, pluginName);
            });
        },
        /**
         * Destroys the plugin with given name of element with
         * given internal id
         *
         * @private
         * @param {Integer} id The internal id of the element
         * @param {String} pluginName The plugin's name
         */
        destroyPluginOfId: function (id, pluginName) {
            if (!instances[id] || !instances[id][pluginName]) {
                return;
            }

            logger.debug(StringUtils.format(
                'Destroying plugin {0} of element {1}',
                pluginName,
                id
            ));

            instances[id][pluginName].destroy();

            delete instances[id][pluginName];

            if (!Object.keys(instances[id]).length) {
                delete instances[id];
            }
        },
        /**
         * Destroys the plugin instance of given name for given element
         *
         * @private
         * @param {HTMLElement} element The HTML element
         * @param {String} pluginName The plugin's name
         */
        destroyPluginOfElement: function (element, pluginName) {
            var me = this,
                id = this.getElementId(element);

            me.destroyPluginOfId(id, pluginName);
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

            $.each(elements, function (index, el) {
                var plugins = me.determineElementPlugins(el);

                $.each(plugins, function (index, plugin) {
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
                mountPoint = me.getMountPoint();

            return $('[' + mountPoint + ']', root).add(root);
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
                deferreds = [];/*,
                paths = {};*/

            function toPath (plugin) {
                var pluginLoadPath = me.getLoadFrom();

                return [
                    pluginLoadPath,
                    plugin
                ].join('/');
            }

            $.each(plugins, function (index, plugin) {
                var deferred = $.Deferred(),
                    pluginPath = toPath(plugin);

                deferreds.push(deferred);

                require([pluginPath], function (Plugin) {
                    fetchedPlugins[plugin] = Plugin;
                    deferred.resolve(plugin);
                }, function (err) {
                    fetchedPlugins[plugin] = Plugin.extend({
                        init: function () {
                            logger.warn(StringUtils.format(
                                'Could not load plugin {0} due to error:\n{1}',
                                plugin,
                                err.message
                            ));
                        }
                    });
                    deferred.resolve(plugin);
                });
            });

            // execute the callback as soon as all plugins have been loaded
            $.when.apply($, deferreds).done(function () {
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

            logger.debug('Applying plugins to elements...');
            $.each(elements, function (index, element) {
                var elPlugins = me.determineElementPlugins(element),
                    id = me.addIdToElement(element);

                logger.debug(StringUtils.format(
                    'Processing element [Tag:{0}, Plugins: [{1}], Classes: [{2}], ID: {3}]...',
                    element.tagName,
                    elPlugins.join(', '),
                    element.className,
                    element.id
                ));

                $.each(elPlugins, function (index, pluginName) {
                    var pluginClass,
                        options,
                        instance;

                    if (!me.isPluginDisabled(pluginName)) {
                        logger.debug(StringUtils.format(
                            'Applying plugin "{0}"...',
                            pluginName
                        ));

                        pluginClass = plugins[pluginName];
                        options = me.determinePluginOptions(element, pluginName);
<<<<<<< HEAD

                        try {
                            instance = me.mountToElement(pluginClass, element, options);
                            instances.push(instance);
                            initialized.push(me.waitFor(instance, 'initialized'));
                            executed.push(me.waitFor(instance, 'executed'));
                        } catch (e) {
                            logger.error(StringUtils.format(
                                '{0} ocurred while instanciating plugin {1}{2}{3}: {4}',
                                e.name,
                                pluginName,
                                e.file ? 'in file ' + e.file : '',
                                e.lineNumber ? ':' + e.lineNumber : '',
                                e.message
                            ));
                        }
=======
                        instance = me.mountToElement(pluginClass, element, options);

                        if (!instances[id]) {
                            instances[id] = {};
                        }

                        instances[id][pluginName] = instance;

                        logger.debug(StringUtils.format(
                            'Created instance of plugin {0} for element with id {1}',
                            pluginName,
                            id
                        ));

                        initialized.push(me.waitFor(instance, 'initialized'));
                        executed.push(me.waitFor(instance, 'executed'));
>>>>>>> added mutation observer to handle dynamicly loaded plugins
                    }
                });
            });

            logger.debug('Prepared.');
            // fire "prepared" event
            me.fire('prepared');

            // fire "ready" event, as soon as all plugins have been initialized
            $.when.apply($, initialized).done(function () {
                logger.debug('Plugins initialized.');
                me.fire('ready');
            });

            // fire "pluginsexecuted" event, as soon as all plugins have finished their execution
            $.when.apply($, executed).done(function () {
                logger.debug('Plugins executed.');
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
        waitFor: function (instance, event) {
            var dfd = $.Deferred();

            instance.on(event, function () {
                dfd.resolve();
            });

            return dfd;
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
