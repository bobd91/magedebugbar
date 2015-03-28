module.exports = function(grunt) {

    grunt.initConfig({

        sass: {
            options: {
                outputStyle: "compressed"
            },
            dist: {
                files: {
                    'Resources/magedebugbar.css': 'sass/magedebugbar.scss'
                }
            }
        },

        requirejs: {
            compile: {
                options: {
                    baseUrl: "js",
                    paths: {
                        ace: "empty:",
                        requireLib: 'require'
                    },
                    out: "Resources/magedebugbar.js",
                    name: "magedebugbar",
                    include: ["config", "requireLib", "layouttab", "layoutpanel"],
                    create: true,
//                    optimize: "none",
                    wrap: {
                        start: "(function() {",
                        // PhpDebugBar needs access to global objects 
                        end: "window.MageDebugBar = { LayoutTab: layoutTab };}());"
                    },
                }
            }
        },

        watch: {
            sass: {
                files: 'sass/*.scss',
                tasks: ['sass']
            },
            requirejs: {
                files: 'js/*.js',
                tasks: ['requirejs']
            },
            grunt: {
                files: 'Gruntfile.js',
                tasks: ['default']
            }
        },

   
        jshint: {
            all: ['Gruntfile.js', 'js/*.js']
        }
    });

    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['sass', 'requirejs']);
};
