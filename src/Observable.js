define(['Base', 'Window', 'jquery'], function (Base, Window, $) {
    var Observable;

    /**
     * Base class with attached EventManager to provide event firing and event listener attachment
     *
     * @name Observable
     * @class
     * @augments Base
     */
    Observable = Base.extend(/**@lends Observable.prototype**/{
        _listeners: null,
        constructor: function () {
            var me = this;
            me._listeners = {
                events: {},
                suspended: false
            };
            me.base();
        },
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
        on: function (eventName, fn, scope, single) {
            var me = this,
                eventsStub;

            eventsStub = {
                def: {
                    stack: [],
                    suspended: false
                }
            };

            single = single || false;
            scope = scope || Window;
            me._listeners.events[eventName] = me._listeners.events[eventName] || eventsStub;
            me._listeners.events[eventName].def.stack.push({
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
         * @param {String} fn The listener function
         * @param {Object} [scope] The listener scope
         */
        un: function (eventName, fn, scope) {
            var me = this,
                eventStack,
                eventDef;

            if (!me._listeners.events[eventName]) {
                return;
            }

            eventStack = me._listeners.events[eventName].def.stack;

            for (var index = 0; index < eventStack.length; index++) {
                eventDef = eventStack[index];

                if (eventDef && (eventDef.fn === fn) && (eventDef.scope === scope)) {
                    //@TODO: Check why the best practice way behaves wrong
                    //eventStack.splice(index, 1);
                    delete eventStack[index];
                    break;
                }
            }

            if (!eventStack.length) {
                delete me._listeners.events[eventName];
            }
        },
        /**
         * Fires an event with given name on the given instance
         *
         * @param {Object} instance The instance
         * @param {String} eventName The eventName of the event to fire
         */
        fire: function (eventName) {
            var me = this,
                args = Array.prototype.slice.call(arguments, 0),
                eventStack,
                eventDef,
                listeners;

            // remove eventName from arguments
            args.shift();

            if (!me._listeners.events[eventName]) {
                return;
            }

            listeners = me._listeners.events[eventName];
            if (me._listeners.suspended || listeners.def.suspended) {
                return;
            }

            eventStack = listeners.def.stack;
            for (var index = 0; index < eventStack.length; index++) {
                eventDef = eventStack[index];

                if (typeof eventDef !== 'object') {
                    continue;
                }

                eventDef.fn.apply(eventDef.scope, args);
                if (eventDef.single) {
                    me.un(eventName, eventDef.fn, eventDef.scope);
                }
            }
        },
        /**
         * Suspends eventhandling on the given instance
         *
         * @param {Object} instance The instance
         */
        suspendEvents: function () {
            this._listeners.suspended = true;
        },
        /**
         * Suspends eventhandling on the given instance for given eventName
         *
         * @param {Object} instance The instance
         * @param {String} eventName The event to suspend
         */
        suspendEvent: function (eventName) {
            var me = this;

            if (me._listeners.events[eventName]) {
                return;
            }
            me._listeners.events[eventName].def.suspended = true;
        },
        /**
         * Resumes eventhandling on the given instance
         *
         * @param {Object} instance The instance
         */
        resumeEvents: function () {
            this._listeners.suspended = false;
        },
        /**
         * Resumes eventhandling on the given instance for given eventName
         *
         * @param {Object} instance The instance
         * @param {String} eventName The event to resume
         */
        resumeEvent: function (eventName) {
            var me = this;
            if (!me._listeners.events[eventName]) {
                return;
            }

            me._listeners.events[eventName].def.suspended = false;
        }
    });

    return Observable;
});
