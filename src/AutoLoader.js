/**
 * mntyjs 1.0.0
 *
 * @preserve Copyright 2015 bitExpert AG
 */
require(['PluginManager', 'OptionParser', 'jquery', 'Window'], function (PluginManager, OptionParser, $, Window) {

    var manager = new PluginManager(),
        config = $('script[data-mntyjs]').data('mntyjs'),
        root;

    config = OptionParser.parse(config);

    root = config.root ? $(config.root).get(0) : Window.document;

    if (config.autoMount !== false) {
        $(Window.document).ready(function () {
            manager.reconfigure(config);
            manager.mount(root);
        });
    }

    if (config.autoUnmount !== false) {
        $(Window).on('beforeunload', function () {
            manager.unmount(root);
        });
    }
});
