![mntyjs Logo](./logo.png)

# mntyjs

mntyjs is a lightweight plugin system based on require.js, jQuery and Base.js
which is designed for easy-to-use implementation purpose in "oldschool" multipage HTML applications (CMSs, Webpages, etc.). It is **NOT** designed for single page applications implementation but could be used for it though.

* Supports IE9+
* Dynamic (un)mounting of plugins using MutationObserver-shim
* Injectable configuration
* Comfortable configuration chain
* Modular structure (you may re-use single components in your plugins as well)
* Loose coupling through global message bus
* Lets you produce readable, maintainable, testable and reusable code easily
* Full JSDoc module documentation

## ToC
 1. [Quick start](#quick-start)
   1. [Configuration](#configuring-mntyjs)
   1. [Additional Configuration](#adding-additional-configuration)
 1. [Mounting plugins](#mounting-plugins)
   1. [Configuring plugins](#configure-plugins)
   1. [Global messages](#global-messages)
   1. [Extending a Plugin (inheritance)](#extending-a-plugin-inheritance)
   1. [Dynamic (un)mounting](#dynamic-unmounting)
 1. [Best practices](#best-practices)
 1. [Building your project](#building-your-project)
 1. [Testing your project](#testing-your-project)

## Quick start
Add the dependency to your bower.json:
``` shell
bower install mntyjs#1.1.4
```


Add the mntyjs to the head of the page:
``` xml
<script src="path/to/mnty.js" type="text/javascript"/></script>
```

mntyjs will automatically register to the document ready event and will immediately run as soon
as the document is ready. Also it registers to the window unload event and will destroy itself and all used plugin
instances.

### Configuring mntyjs
mntyjs uses kind of a simplified JSON representation for configuration:

data-attrib="'key1':'value1','key2':3,'key3':true"
 
To configure mntyjs itself you simply provide another data-attribute to the script tag you used for including it:

``` xml
<script data-mntyjs="'loggingEnabled':true" src="path/to/mnty.js" type="text/javascript"></script>
``` 
 
Possible options for mntyjs itself are:

| Option        | Type    | Default | Description                                                                                                   |
|:--------------|:--------|:--------|:--------------------------------------------------------------------------------------------------------------|
|loggingEnabled | Boolean | false   | Turn on/off the console logs                                                                                  | 
|loadFrom       | String  | ''      | Relative path to your baseUrls to load the plugins from                                                       |
|mountPoint     | String  | mount   | data-attribute to define your plugins to mount to the according DOM Element. Default results in "data-mount"  |
|baseUrl        | String  | ''      | baseUrl to load your plugins from                                                                             |
|idProperty     | String  | mid     | data attribute to assign to the mounted dom elements. Default results in "data-mid"                           |     
|disabledPlugins| Array   | []      | Array of names of plugins to disable globally (good for debugging/emergency purpose)                          |


### Adding additional configuration

By the fact that mntyjs is based on requireJS. It is possible to add an additional config file.

``` js
require.config({
    //adding timestamp as cache breaker
    urlArgs: 'bust=' + (new Date()).getTime(),
    paths: {
        //...
    },
    shim: {
        //...
    }
});
```

Don't forget to reference your config.js file:
``` html
<script src="path/to/mnty.js"></script>
<script src="path/to/config.js"></script>
```

Have a look at the [requireJS page] (http://requirejs.org/docs/api.html#config) for further information.


## Mounting plugins

Once mntyjs is setup, you may easily mount plugins to any of your DOM Elements.
Let's say you configured mntyjs like this:

``` xml
<script data-mntyjs="'loggingEnabled':true, 'loadFrom':'plugin'" src="path/to/mnty.dev.js" type="text/javascript"/></script>
``` 

So loadFrom points at the plugin folder below your webroot. 

For demonstration how registration and configuration works, we implement a plugin which alerts the text of an element (absolutely awesome, I know ;-)).

First we need to create the file {webroot}/plugin/Alerter.js which is the plugin itself.

The boilerplate template of a plugin looks like this:

``` javascript
define(['Plugin'], function (Plugin) {
    var Boilerplate = Plugin.extend({
       execute: function (dfd) {
           // do awesome stuff
       }
    });

    return Boilerplate;
});
```

So, if we want to alert the text of the element our plugin will be mounted on, we have to implement the plugin as follows:

``` javascript
define(['Plugin', 'Window'], function (Plugin, Window) {
    var Alerter = Plugin.extend({
        execute: function (dfd) {
           Window.alert(this.$element.text());
        }
    });

    return Alerter;
});
```

For mounting the plugin to an element, we add an element to the DOM:
``` xml
<div data-mount="Alerter">Some text, that will be shown by the plugin</div>
``` 

Just reload the page and you will see the element's text in an alert window.

### Configuring plugins
mntyjs comes with a built-in configuration mechanism, which automatically generates getters and setters for you as well as an apply and update chain which can be very useful in some cases.

To demonstrate how configuration works in detail, we implement another plugin, which colorizes the text of the element it's mounted to.

We create the plugin in {webroot}/plugin/Colorizer.js:

``` javascript
define(['Plugin'], function (Plugin) {
    var Colorizer = Plugin.extend({
        config: {
           color: '#000'
        },
        updateColor: function (newColor, oldColor) {
            if (newColor) {
                this.$element.css('color', newColor);
            }
        }
    });

    return Colorizer;
});
```
And now we register it to several elements with different configuration:

``` xml
<div data-mount="Alerter,Colorizer">Some text, that will be shown by the plugin</div>
<div data-mount="Colorizer" data-colorizer="'color':'#f00'">Some text, that will be shown by the plugin</div>
<div data-mount="Colorizer" data-colorizer="'color':'#0f0'">Some text, that will be shown by the plugin</div>
<div data-mount="Colorizer" data-colorizer="'color':'#00f'">Some text, that will be shown by the plugin</div>
<div data-mount="Colorizer" data-colorizer="'color':'#fff'">Some text, that will be shown by the plugin</div>
``` 

After reloading the page you should see the alert text and five texts with the configured colors.

So what's happening here?

We added an attribute called "config" to our plugin. mntyjs will apply the configuration mechanism for all the first level properties of the object for you automatically, which works as follows:

#### Appliers
If a setter is called the applier function is called first. An applier function is used for transformations on the config value before it is used further. For example you may provide a config object for a third party library (Masonry, Carousel, whatever) and create and return an instance of it for being able to deal with an instance when calling the getter or implementing an updater. 

#### Updaters
The applied value is linked to the plugin to be retrieved later via the generated getter. At the end, the updater is called with two params: The new value of the property and the old one and you may decide in this function what will happen, whenever the value of this property is changed using its setter.

#### Configuration injection
In the colorizer plugin we use the config attribute "color" with default value "#000". Plugins are able to be configured via data-attributes, which have to follow a simple naming convention: 

``` xml
data-[plugin name to lowercase, replace / through -]
```

The configuration itself is kind of 'pseudo'-JSON, because you don't need the outer curly brackets and you may use single instead of double quotes (this helps you to get rid of ugly escaping ;-))

So in our case data-colorizer is the data attribute to configure the colorizer plugin. If the colorizer plugin was located at a subfolder ({webroot}/plugin/fancystuff/Colorizer.js) it would look like this:

``` xml
<div data-mount="fancystuff/Colorizer" data-fancystuff-colorizer="'color':'#f00'">Some text, that will be shown by the plugin</div>
``` 

### Global messages
mntyjs also has a built in global messaging system which permits loose coupling between several plugins, which empowers you to separate responsibilities into different plugins (MVC for example). While one plugin fetches, prepares, modifies and pushes data, other plugins just listen to changes on the resulting model and update their elements according to it.

#### Example
The first plugin retrieves data from the backend and sends messages to the global message bus:

``` javascript
define(['Plugin', 'jquery', 'FnUtils'], function (Plugin, $, FnUtils) {
    var DataController = Plugin.extend({
        execute: function () {
            var me = this;
            
            $.ajax({
                type: 'GET',
                url: '/data',
                dataType: 'json',
                success: FnUtils.bind(me.onSuccess, me),
                error: FnUtils.bind(me.onFailure, me)
            });
        },
        onSuccess: function (data, textStatus, jqXHR) {
            this.sendSystemMessage('data-change', data);
        },
        onFailure: function (jqXHR, textStatus, errorThrown) {
            this.sendSystemMessage('data-error', errorThrown);
        }
    });

    return DataController;
});
```

The other plugin(s) register listeners to the message bus and display the data in some way when messages are retrieved:

``` javascript
define(['Plugin', 'Window'], function (Plugin, Window) {
    var JsonPlainView = Plugin.extend({
        config: {
            data: null
        },
        init: function () {
            this.bindSystemMessage('data-change', 'setData');
            this.bindSystemMessage('data-error', 'alertError');
        },
        updateData: function (newData, oldData) {
            if (oldData) {
                this.$element.empty();
            }
            
            if (newData) {
                this.$element.html('<pre>' + newData + '</pre>');
            }
        },
        alertError: function (error) {
            Window.alert(error.toString());
        }
    });

    return JsonPlainView;
});
```

All the listeners which have been registered using bindSystemMessage will be destroyed automatically when the plugin instance is destroyed (unmounted).

### Extending a Plugin (inheritance)

Extending a plugin is still simple. Every plugin in the example extends the base plugin "Plugin".
To extend our own plugin we use an Alerter again as example:

``` javascript
define(['Plugin', 'Window'], function (Plugin, Window) {
    var Alerter = Plugin.extend({
        execute: function () {
            var me = this;
            me.showMsg(me.$element.text());
        },
        showMsg: function (msg) {
            var me = this;
            Window.alert(msg);
        }
    });
    return Alerter;
});
```

Now we implement a SpecialAlerter:

``` javascript
define(['plugins/Alerter'], function (Alerter) {
    var SpecialAlerter = Alerter.extend({
        showMsg: function (msg) {
            var me = this;
            //calling base method
            me.base('Special:' + msg);
        }
    });
    return SpecialAlerter;
});
```
We overwrite the showMsg function to prepend th 'Special' string to the message.
After that we calling the function from the base class.


### Dynamic (un)mounting
mntyjs uses a Mutation-Observer Shim, which allows you to dynamically add and remove elements which use plugins as well. The MutationObserver will notify mntyjs which will initialize / destroy all the plugins of the according elements.

## Best practices

... to be documented ...

### Stay in your scope

The scope of each plugin is a big advantage during development.
Avoid dom manipulations which are not in the scope of your plugin.

``` javascript
 //!wrong - $() can change the complete dom
 $('.my-class').html('changed content')
 
 //correct - this.$child and this.$element can never leave your scope
 this.$child('.my-class').html('changed content') 
 this.$element.html('changed content')
```

If you need to change something outside of your scope you may do the following:
 - change to scope of you plugin
 - use another plugin to change the page part. And communicate with the global message bus.



## Building your project

You should build your project for usage in production environments.
Building means all js files will be packed together to one minified file.
This reduces the page load time of your web page.

### Building your project with grunt
The easiest way is to use the [grunt-mntyjs](https://github.com/bitExpert/grunt-mntyjs) [package](https://www.npmjs.com/package/grunt-mntyjs).



## Testing your project
... to be documented ...






















