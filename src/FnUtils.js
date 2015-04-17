define(function () {
    var FnUtils = {
        /**
         * Binds the given function to the given scope. When definiting additional args, they will be
         * appended to the original args as long as you do not define appendArgs = false
         *
         * @param Function fn
         * @param Object scope
         * @param Array additionalArgs
         * @param boolean appendArgs
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
         * @param mixed fn
         * @returns {boolean}
         */
        isFn: function (fn) {
            return (fn && typeof fn === 'function');
        }
    };

    return FnUtils;
});
