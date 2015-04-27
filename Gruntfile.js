module.exports = function (grunt) {
    var fileSet = [
        'src/**/*.js',
        'plugin/Boilerplate.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        files: {
            src: fileSet
        },
        requirejs: {
            mnty: {
                options: {
                    baseUrl: 'src',
                    name: 'AutoLoader',
                    out: 'dist/mnty.js',
                    optimize: 'uglify2',
                    preserveLicenseComments: true,
                    paths: {
                        requireLib: '../vendor/requirejs/require',
                        jquery: '../vendor/jquery/dist/jquery',
                        log4js: '../vendor/log4javascript/log4javascript_uncompressed',
                        BaseClass: '../lib/Base',
                        MutationObserver: '../lib/MutationObserver',
                        WeakMap: '../lib/WeakMap',
                        when: '../vendor/when/when'
                    },
                    packages: [
                        { name: 'when', location: '../vendor/when/', main: 'when' }
                    ],
                    include: [
                        'requireLib',
                        'Window',
                        'Plugin'
                    ]
                }
            },
            mntydev: {
                options: {
                    baseUrl: 'src',
                    name: 'AutoLoader',
                    out: 'dist/mnty.dev.js',
                    optimize: 'uglify2',
                    generateSourceMaps: true,
                    preserveLicenseComments: false,
                    paths: {
                        requireLib: '../vendor/requirejs/require',
                        jquery: '../vendor/jquery/dist/jquery',
                        log4js: '../vendor/log4javascript/log4javascript_uncompressed',
                        BaseClass: '../lib/Base',
                        MutationObserver: '../lib/MutationObserver',
                        WeakMap: '../lib/WeakMap',
                        when: '../vendor/when/when'
                    },
                    packages: [
                        { name: 'when', location: '../vendor/when/', main: 'when' }
                    ],
                    include: [
                        'requireLib',
                        'Window',
                        'Plugin'
                    ]
                }
            }
        },
        jsdoc: {
            dist: {
                src: fileSet,
                options: {
                    destination: 'doc'
                }
            }
        },
        watch: {
            js: {
                files: fileSet,
                tasks: [
                    'newer:jshint:cli',
                    'newer:jscs:cli'
                ]
            }
        },
        // Task configuration
        jshint: {
            cli: {
                files: [
                    '<%= files %>'
                ]
            },
            ci: {
                files: [
                    '<%= jshint.cli.files %>'
                ],
                options: {
                    reporter: require('jshint-jenkins-checkstyle-reporter'),
                    reporterOutput: 'log/checkstyle-jshint.xml'
                }
            }
        },
        jscs: {
            cli: {
                files: {
                    src: [
                        '<%= files.src %>'
                    ]
                },
                options: {
                    config: 'node_modules/bitexpert-cs-jscs/config/config.json'
                }
            },
            ci: {
                files: [
                    '<%= jscs.cli.files %>'
                ],
                options: {
                    reporter: 'checkstyle',
                    reporterOutput: 'log/checkstyle-jscs.xml',
                    config: '<%= jscsconf %>'
                }
            }
        }
    });

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Define the available tasks
    grunt.registerTask('default', ['jscs:cli']);
    grunt.registerTask('sniff', ['jscs:cli']);
    grunt.registerTask('lint', ['jshint:cli']);
    grunt.registerTask('docs', ['jsdoc']);
    grunt.registerTask('ci:build', ['jscs:ci', 'jshint:ci', 'requirejs', 'docs']);
    grunt.registerTask('build', ['sniff', 'lint', 'requirejs:mnty', 'requirejs:mntydev', 'docs'])
};
