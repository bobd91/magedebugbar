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
        // Ace editor
        ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8",

        // Outstanding query with Ace team re: problems mapping theme urls
        "ace/theme/chrome": "https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8/theme-chrome",
                        requireLib: 'require'
                    },
                    out: "Resources/magedebugbar.js",
                    name: "magedebugbar",
                    include: ["requireLib", "layouttab", "layoutpanel"],
                    create: true,
                    optimize: "none",
                    wrap: {
                        start: "(function() {",
                        // PhpDebugBar needs access to global objects 
                        end: "require(['layouttab'], function(LayoutTab) { window.MageDebugBar = { LayoutTab: LayoutTab };});}());"
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
