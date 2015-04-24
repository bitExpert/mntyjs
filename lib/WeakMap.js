define(function () {
    /**
     * WeakMap implementation, see [WeakMap Spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
     *
     * notice: If key is GC-ed, value will be GC-ed as well unless there is some other references to it
     * @class WeakMap
     */
    if (window.WeakMap) {
        return window.WeakMap;
    }

    // Original - @Gozola. This is a reimplemented version (with a few bug fixes).
    function Name() {
        var key = {};
        return function (obj) {
            var store = obj.valueOf(key);
            return store !== undefined && store !== obj && store.identity === key ? store : namespace(obj, key);
        }
    }

    function namespace(obj, key) {
        var store = {
                identity: key
            },
            valueOf = obj.valueOf,
            fnc = function (value) {
                return value !== key || this !== obj ? valueOf.apply(this, arguments) : store;
            };

        if (Object.defineProperty) {
            Object.defineProperty(obj, "valueOf", {
                value: fnc,
                configurable: true
            });
        } else {
            obj.valueOf = fnc;
        }
        return store;
    }

    function guard(key) {
        /**
         Utility function to guard WeakMap methods from keys that are not
         a non-null objects.
         **/
        if (key !== Object(key)){
            throw TypeError("value is not a non-null object");
        }
        return key;
    }

    return function WeakMap () {
        var privates = Name();

        return {
            get: function (key, fallback) {
                var store = privates(guard(key));
                return store.hasOwnProperty('value') ? store.value : fallback;
            },
            set: function (key, value) {
                privates(guard(key)).value = value;
            },
            has: function (key) {
                return "value" in privates(key);
            },
            "delete": function (key) {
                return delete privates(guard(key)).value;
            }
        };
    };
});
