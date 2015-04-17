define(['../Colorizer'], function (Colorizer) {
    var Hider = Colorizer.extend({
        name: 'Hider',
        config: {
            color: 'orange',
            test: 'attribute'
        },
        execute: function (dfd) {
            this.base(dfd);
        }
    });

    return Hider;
});
