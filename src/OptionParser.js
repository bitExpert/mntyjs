/**
 * Base class with attached EventManager to provide event firing and event listener attachment
 *
 * @module OptionParser
 */
define(['jquery', 'Logging', 'StringUtils'], function ($, Logging, StringUtils) {
    var logger = Logging.getLogger('OptionParser');

    /**
     * @alias module:OptionParser
     */
    return {
        /**
         * Parses the given option string to a valid js object
         *
         * @param {String} optionString The string to parse
         * @return {Object} The parsed js object
         */
        parse: function (optionString) {
            var options;

            options = optionString || '';
            options = '{' + options.replace(/\'/g, '"') + '}';

            try {
                options = $.parseJSON(options);
            } catch (e) {
                logger.error(StringUtils.format(
                    'Error while parsing options string "{0}"',
                    options
                ));

                options = {};
            }

            return options;
        }
    };
});
