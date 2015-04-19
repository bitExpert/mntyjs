/**
 * AMD abstraction of the window object
 *
 * @module Window
 */
define(['MutationObserver'], function (MutationObserver) {
    window.JsMutationObserver = MutationObserver;

    if (!window.MutationObserver) {
        window.MutationObserver = MutationObserver;
    }

    return window;
});
