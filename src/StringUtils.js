/**
 * Base class with attached EventManager to provide event firing and event listener attachment
 *
 * @module StringUtils
 */
define([], function () {
    /**
     * @alias module:StringUtils
     */
    return {
        /**
         * Uppercases the first letter of given string
         *
         * @param {String} str The string to uppercase the first letter from
         * @returns {String} The string with first letter uppercased
         */
        ucFirst: function (str) {
            var f;
            str += '';

            f = str.charAt(0).toUpperCase();
            return f + str.substr(1);
        },
        /**
         * Formats strings with placeholders using given params
         *
         * @example format('Hello, my {0} is {1}.', 'name', 'world');
         * //-> Hello, my name is world
         *
         * @param {*} args Argument list: First param to be the placeholders containing string, following the replacements
         * @returns {String} The resulting formatted string
         */
        format: function () {
            var args = Array.prototype.slice.call(arguments),
                format = /\{(\d+)\}/g,
                message = args.shift();

            return message.replace(format, function (m, i) {
                return args[i];
            });
        },
        /**
         * Returns if given param is a string
         *
         * @param {*} any Anything to test if it's a string
         * @returns {Boolean} If it is a string or not
         */
        isString: function (any) {
            return (any && typeof any === 'string');
        }
    };
});
