/**
 * mntyjs 1.0.0
 *
 * @preserve Copyright 2015 bitExpert AG
 */
require(['PluginManager', 'OptionParser', 'jquery'], function (PluginManager, OptionParser, $) {

    var config = $('script[data-mntyjs]').data('mntyjs');

    config = OptionParser.parse(config);
    $(document).ready(function () {
        PluginManager.reconfigure(config);
        PluginManager.boot();
    });
});
