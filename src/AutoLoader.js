/**
 * mntyjs 1.0.0
 *
 * @preserve Copyright 2015 bitExpert AG
 */
require(['PluginManager', 'OptionParser', 'jquery', 'Window'], function (PluginManager, OptionParser, $, Window) {

    var config = $('script[data-mntyjs]').data('mntyjs');

    config = OptionParser.parse(config);

    if (config.autoMount !== false) {
        $(Window.document).ready(function () {
            PluginManager.reconfigure(config);
            PluginManager.mount(Window.document);
        });
    }

    if (config.autoUnmount !== false) {
        $(Window).on('beforeunload', function () {
            PluginManager.unmount(Window.document);
        });
    }
});
