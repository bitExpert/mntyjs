define(['EventManager', 'Base'], function (EventManager, Base) {
    var Observable;

    /**
     * Base class with attached EventManager to provide event firing and event listener attachment
     *
     * @name Observable
     * @class
     * @augments Base
     */
    Observable = Base.extend({});

    // we decorate the class with the EventManager functionality
    EventManager.apply(Observable.prototype);

    return Observable;
});
