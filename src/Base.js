define(['BaseClass', 'StringUtils'], function (BaseClass, StringUtils) {
    var Base,
        mixin,
        getFunctionName,
        generateSetter,
        generateGetter,
        generateApplier,
        generateUpdater;

    /**
     * Returns a function name built by prefix and propertyName
     *
     * @param {String} prefix
     * @param {String} property
     * @returns {String}
     */
    getFunctionName = function getFunctionName (prefix, property) {
        var propertyName = StringUtils.ucFirst(property);
        return prefix.toLowerCase() + propertyName;
    };

    /**
     * Generates a getter function for given property of given scope
     *
     * @param {Object} scope
     * @param {String} property
     * @returns {Function}
     */
    generateGetter = function generateGetter (scope, property) {
        return function () {
            return scope._config[property];
        };
    };

    /**
     * Genrates a setter for given property of given scope using the given applier and updater
     *
     * @param {Object} scope
     * @param {String} property
     * @param {Function} applier
     * @param {Function} updater
     * @returns {Function}
     */
    generateSetter = function generateSetter (scope, property, applier, updater) {
        return function (value) {
            var formerValue = scope._config[property],
                appliedValue = applier ? applier.call(scope, value) : value;

            //@TODO: check performance of deep equality determinition
            if (typeof appliedValue === 'object' || typeof formerValue === 'object' || appliedValue !== formerValue) {
                scope._config[property] = appliedValue;
                if (updater) {
                    updater.call(scope, appliedValue, formerValue);
                }
            }
        };
    };

    applyMixin = function applyMixin (scope, mixin) {
        for (var key in mixin) {
            if (!scope.hasOwnProperty(key)) {
                scope[key] = mixin[key];
            }
        }
    };

    /**
     * Base class
     *
     * @class Base
     */
    Base = BaseClass.extend(/**@lends Base.prototype*/{
        mixins: [],
        config: {},
        /**
         * Constructor
         */
        constructor: function () {
            var me = this,
                mixins = me.mixins;

            me._config = {};
            me.initConfig();
            for (var i in mixins) {
                if (mixins.hasOwnProperty(i)) {
                    applyMixin(me, mixins[i]);
                }
            }
            me.base();
        },
        /**
         * Initializes and applies the config for the instance
         */
        initConfig: function () {
            var me = this,
                config = me.config,
                property,
                applier,
                updater,
                setterName,
                getterName,
                applierName,
                updaterName;

            // generate magic methods for config properties
            for (property in config) {
                if (config.hasOwnProperty(property)) {
                    setterName = getFunctionName('set', property);
                    getterName = getFunctionName('get', property);
                    applierName = getFunctionName('apply', property);
                    updaterName = getFunctionName('update', property);

                    if (!me[getterName]) {
                        me[getterName] = generateGetter(me, property);
                    }

                    if (me[applierName]) {
                        applier = me[applierName];
                    }

                    if (me[updaterName]) {
                        updater = me[updaterName];
                    }

                    if (!me[setterName]) {
                        me[setterName] = generateSetter(me, property, applier, updater);
                    }
                }
            }

            // set the values using the magic methods
            for (property in config) {
                if (config.hasOwnProperty(property)) {
                    setterName = getFunctionName('set', property);
                    me[setterName].call(me, me.config[property]);
                }
            }
        },
        /**
         * Reconfigures the instance with given config
         *
         * @param {Object} config
         */
        reconfigure: function (config) {
            var me = this,
                initialConfig = me.config;

            for (var property in config) {
                if (config.hasOwnProperty(property) &&
                    initialConfig.hasOwnProperty(property)) {
                    var setterName = getFunctionName('set', property),
                        setter = me[setterName];

                    if (setter) {
                        setter.call(me, config[property]);
                    }
                }
            }
        }
    });

    return Base;
});
