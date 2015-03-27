/**
 * Allow copy to clipboard
 *
 * Which is not straightforward from Javascript, unfortunately
 *
 * Based on Trello's CoffeeScript code
 * http://stackoverflow.com/questions/17527870/how-does-trello-access-the-users-clipboard
 *
 * @module clipboard
 * @author Bob Davison
 * @version 1.0
 */

define(['jquery', 'cssclass', 'class'], 

function($, CssClass, Class) {

    var cssClass = CssClass.generate('clipboard', ['container', 'textarea']);
    var Clipboard = Class.create({

        constructor: function() {
            this.$container = $('<div />').attr('id', cssClass.container).appendTo($('body'));
            this.$textarea = $('<textarea />').attr('id', cssClass.textarea);
            $(document)
                .on('keydown', this.keydown.bind(this))
                .on('keyup', this.keyup.bind(this));
        },

        set: function(text) {
            this.text = text;
        },

        unset: function() {
            delete this.text;
        },

        keydown: function(e) {
            if(!this.text
                    || !(e.ctrlKey || e.metaKey)
                    || $(e.target).is("input:visible,textarea:visible")
                    || window.getSelection().toString()) {
                return;
            }

            setTimeout(function() {
                  this.$container.empty().show();
                  this.$textarea
                      .val(this.text)
                      .appendTo(this.$container)
                      .focus()
                      .select();
            }.bind(this), 0);
        },

        keyup: function(e) {
            if(this.$container.length) {
                this.$container.empty().hide();
            }
        }
    });

    return new Clipboard();
});



