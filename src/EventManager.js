/**
 * A generic EventManager implementation for handling events
 * on specific prototypes or instances
 *
 * @module EventManager
 * @author Peter Hildenbrand <peter.hildenbrand@gmail.com>
 * @link https://github.com/peterhildenbrand/fireimpact
 */
define(function () {
    'use strict';
    var EventManager,
        _curId = 0,
        _listeners = {},
        _listenersExist,
        _getNextId;

    /**
     * Returns the next unused instanceId
     *
     * @private
     * @return {Integer} The next unused instanceId
     */
    _getNextId = function () {
        return ++_curId;
    };

    /**
     * Returns whether listeners exists for the
     * given event and the given instance or not
     *
     * @private
     * @return {Boolean} Returns whether listeners exist
     */
    _listenersExist = function (instance, eventName) {
        var id = instance._instanceId;

        if (!id || !_listeners[id] || !_listeners[id].events || !_listeners[id].events[eventName]) {
            return false;
        }

        return true;
    };

    /**
     * @constructor
     * @alias module:EventManager
     */
    EventManager = function () {};

    EventManager.prototype = {

        /**
         * Adds a listener for the given instance and event using the given scope
         * If single = true, the listener will be removed after its first call
         *
         * @param {Object} instance The instance
         * @param {String} eventName The eventName to add the listener to
         * @param {String} fn The listener function
         * @param {Object} [scope] The listener scope
         * @param {Boolean} [single] If listener should be removed after first call
         */
        addListener: function (instance, eventName, fn, scope, single) {
            var listenersStub,
                eventsStub,
                id;

            listenersStub = {
                events: {},
                suspended: false
            };

            eventsStub = {
                def: {
                    stack: [],
                    suspended: false
                }
            };

            single = single || false;
            id = instance._instanceId || _getNextId();
            instance._instanceId = id;
            scope = scope || instance;
            _listeners[id] = _listeners[id] || listenersStub;
            _listeners[id].events[eventName] = _listeners[id].events[eventName] || eventsStub;
            _listeners[id].events[eventName].def.stack.push({
                fn: fn,
                scope: scope,
                single: single
            });

        },
        /**
         * Removes the given listener, defined by the instance, eventName
         * callback and scope
         *
         * @param {Object} instance The instance
         * @param {String} eventName The eventName to remove the listener from
         * @param {String} The listener function
         * @param {Object} [scope] The listener scope
         */
        removeListener: function (instance, eventName, fn, scope) {
            var id = instance._instanceId,
                eventStack,
                eventDef,
                index;

            if (!_listenersExist(instance, eventName)) {
                return;
            }

            eventStack = _listeners[id].events[eventName].def.stack;

            for (index in eventStack) {
                eventDef = eventStack[index];
                if (typeof eventDef !== 'object') {
                    continue;
                }

                if (eventDef.fn === fn && eventDef.scope === scope) {
                    delete eventStack[index];
                    break;
                }
            }
        },
        /**
         * Fires an event with given name on the given instance
         *
         * @param {Object} instance The instance
         * @param {String} eventName The eventName of the event to fire
         */
        fireEvent: function (instance, eventName) {
            var args = Array.prototype.slice.call(arguments, 0),
                eventStack,
                eventDef,
                listeners,
                index,
                id;

            // remove instance and eventName from arguments
            args.shift();
            args.shift();

            if (!_listenersExist(instance, eventName)) {
                return;
            }

            id = instance._instanceId;
            listeners = _listeners[id].events[eventName];
            if (_listeners[id].suspended || listeners.def.suspended) {
                return;
            }

            eventStack = listeners.def.stack;
            for (index in eventStack) {
                eventDef = eventStack[index];

                if (typeof eventDef !== 'object') {
                    continue;
                }

                eventDef.fn.apply(eventDef.scope, args);

                if (eventDef.single) {
                    this.removeListener(instance, eventName, eventDef.fn, eventDef.scope);
                }
            }
        },
        /**
         * Suspends eventhandling on the given instance
         *
         * @param {Object} instance The instance
         */
        suspendEvents: function (instance) {
            var id = instance._instanceId;
            if (!id || !_listeners[id]) {
                return;
            }

            _listeners[id].suspended = true;
        },
        /**
         * Suspends eventhandling on the given instance for given eventName
         *
         * @param {Object} instance The instance
         * @param {String} eventName The event to suspend
         */
        suspendEvent: function (instance, eventName) {
            var id = instance._instanceId;
            if (!_listenersExist(instance, eventName)) {
                return;
            }
            _listeners[id].events[eventName].def.suspended = true;
        },
        /**
         * Resumes eventhandling on the given instance
         *
         * @param {Object} instance The instance
         */
        resumeEvents: function (instance) {
            var id = instance._instanceId;
            if (!id || !_listeners[id]) {
                return;
            }
            _listeners[id].suspended = false;
        },
        /**
         * Resumes eventhandling on the given instance for given eventName
         *
         * @param {Object} instance The instance
         * @param {String} eventName The event to resume
         */
        resumeEvent: function (instance, eventName) {
            var id = instance._instanceId;
            if (!_listenersExist(instance, eventName)) {
                return;
            }
            _listeners[id].events[eventName].def.suspended = false;
        },
        /**
         * Applies eventhandling on a given class prototype or an instance
         *
         * @param {Object} obj The prototype or instance to apply the handling to
         */
        apply: function (obj) {
            var me = this;
            obj.on = function (event, callback, scope, single) {
                me.addListener(this, event, callback, scope, single);
            };

            obj.un = function (event, callback, scope) {
                me.removeListener(this, event, callback, scope);
            };

            obj.fire = function () {
                var args = Array.prototype.slice.call(arguments, 0);
                args.unshift(this);
                me.fireEvent.apply(me, args);
            };

            obj.suspendEvents = function () {
                me.suspendEvents(this);
            };

            obj.resumeEvents = function () {
                me.resumeEvents(this);
            };

            obj.suspendEvent = function (eventName) {
                me.suspendEvent(this, eventName);
            };

            obj.resumeEvent = function (eventName) {
                me.resumeEvent(this, eventName);
            };

            return obj;
        }
    };
    return new EventManager();
});
