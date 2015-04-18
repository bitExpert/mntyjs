/**
 * The core of mntyjs which handles everything around plugins
 *
 * @private
 * @module PluginManager
 */
define(['Observable', 'Plugin', 'OptionParser', 'StringUtils', 'Logging', 'jquery'], function (Observable, Plugin, OptionParser, StringUtils, Logging, $) {
    var PluginManager,
        instances = [],
        logger = Logging.getLogger('PluginManager');

    PluginManager = Observable.extend({
        config: {
            loadFrom: 'plugin',
            loggingEnabled: false,
            disabledPlugins: [],
            baseUrl: '',
            mountPoint: 'mount'
        },
        /**
         * Registers the system to the document ready and window unload events
         */
        boot: function () {
            var me = this;

            $(document).ready(function () {
                me.run();
            });

            $(window).on('beforeunload', function () {
                me.shutdown();
            });
        },
        /**
         * Converts the mount point value to a valid data-* attribute
         *
         * @private
         * @param {String} mountPoint
         * @returns {String}
         */
        applyMountPoint: function (mountPoint) {
            if (mountPoint.substr(0, 5) !== 'data-') {
                mountPoint = 'data-' + mountPoint;
            }

            //@TODO: Check validity of dataAttr and throw error if invalid

            return mountPoint;
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
         * Updates the base url for requirejs
         *
         * @private
         * @param {String} baseUrl
         */
        updateBaseUrl: function (baseUrl) {
            require.config({
                baseUrl: baseUrl
            });
        },

        /**
         * Runs all the stuff
         *
         * @private
         */
        run: function () {
            var me = this,
                elements,
                pluginNames;

            logger.debug('RUN');

            elements = me.lookupElements();

            pluginNames = me.determineUsedPlugins(elements);

            me.fetchPlugins(pluginNames, function (plugins) {
                me.mountAll(elements, plugins);
            });
        },

        /**
         * Shuts down everything
         * @private
         */
        shutdown: function () {
            $.each(instances, function (index, instance) {
                if (instance) {
                    instance.destroy();
                    delete instances[index];
                }
            });
        },

        /**
         * Determines the plugins which are used by the given elements
         * and returns an array with the appropriate plugin names
         *
         * @private
         * @param elements
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
         * @param element
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
         * @param element
         * @param pluginName
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
        lookupElements: function () {
            var me = this,
                mountPoint = me.getMountPoint();

            return $('[' + mountPoint + ']');
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

            /*$.each(plugins, function (index, plugin) {
                var path = toPath(plugin);
                paths[path] = path;
            });
            console.log(paths);
            require.config({
                paths: paths
            });*/

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
                var elPlugins = me.determineElementPlugins(element);
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
         * @param {DOMElement} element The element to mount the plugin to
         * @param {Object} options Configuration options
         * @returns {Plugin} The resulting plugin instance
         */
        mountToElement: function (PluginClass, element, options) {
            return new PluginClass(options, element, this);
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
        },

        /**
         * Activates / deactivates logging
         *
         * @private
         * @param {Boolean} loggingEnabled Whether logging should be enabled or not
         */
        updateLoggingEnabled: function (loggingEnabled) {
            Logging.setEnabled(loggingEnabled);
        }
    });

    return new PluginManager();
});
