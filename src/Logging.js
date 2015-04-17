/**
 * Returns a preconfigured Logging Factory.
 *
 * For class and functional documentation of the resulting module check {@link http://log4javascript.org/|this link}.
 *
 * @module Logging
 */
define(['log4js'],
    function (Log4js) {
        var logger = Log4js.getRootLogger(),
            logLayout = new Log4js.PatternLayout('[%p] %d{HH:mm:ss} %c - %m{10}'),
            consoleAppender = new Log4js.BrowserConsoleAppender();

        consoleAppender.setLayout(logLayout);
        logger.addAppender(consoleAppender);

        return Log4js;
    }
);
