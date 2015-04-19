/**
 * Module providing basic functions functionality
 *
 * @module FnUtils
 */
define(function () {
    /**
     * @alias module:FnUtils
     */
    return {
        /**
         * Binds the given function to the given scope. When defining additional args, they will be
         * appended to the original args as long as you do not define appendArgs = false
         *
         * @param {Function} fn The function to bind
         * @param {Object} scope The scope to bind the function to
         * @param {Array} additionalArgs Arguments replacing or appended to the original arguments
         * @param {Boolean} appendArgs Append additionalArgs or replace them
         * @returns {Function}
         */
        bind: function (fn, scope, additionalArgs, appendArgs) {
            return function () {
                var args;

                if (appendArgs !== false) {
                    additionalArgs = additionalArgs || [];
                    args = Array.prototype.slice.call(arguments);
                    args = args.concat(additionalArgs);
                } else {
                    args = additionalArgs;
                }

                scope = scope || fn;
                fn.apply(scope, args);
            };
        },
        /**
         * Returns whether given parameter is a function or not
         *
         * @param {Mixed} fn The variable to check
         * @returns {Boolean}
         */
        isFn: function (fn) {
            return (fn && typeof fn === 'function');
        }
    };
});
