
(function($) {

    ToolTips = Class.create({
        constructor: function() {
            var tip = $('<span />').addClass('magedebugbar-tooltips');
            tip.hide();
            $('body').append(tip);

            this.$tip = tip;
        },

        // Approx size/position of tip box and tip point
        // Just used to check where it would fit best
        // Not actually used for sizing so approx is ok
        tipPointOffset: 16,
        tipPointHeight: 8,
        tipBoxHeight: 20,
        tipBoxWidth: 9,

        show: function(elem, text) {

console.log($('body').scrollTop(), $('body').scrollLeft(), $('.phpdebugbar').offset().top);

            this.clearPositionClass();
            this.$tip.text(text);

            var h = this.tipBoxHeight;
            var w = this.tipBoxWidth * text.length;

            var bounds = elem.get(0).getBoundingClientRect();

            var screen = { top: 0, right: window.innerWidth, bottom: $('.phpdebugbar').offset().top - $('body').scrollTop(), left: 0 };
            var widthok = screen.right / 8;
            var heightok = screen.bottom / 8;
            var good = {
                top: bounds.top >= heightok,
                right: bounds.right <= screen.right - widthok,
                bottom: bounds.bottom <= screen.bottom - heightok,
                left:  bounds.left >= widthok,
            };
            var ok = {
                top: bounds.top >= h,
                right: bounds.right <= screen.right - w,
                bottom: bounds.bottom <= screen.bottom - h,
                left: bounds.left >= w
            };
            var fallback = {
                top: ok.top,
                right: ok.right,
                left: ok.left || !ok.right,
                bottom: ok.bottom || !ok.top
            };

            var fn = this.displayFn(good)
                  || this.displayFn(ok)
                  || this.displayFn(fallback);
            fn.call(this, bounds, screen, h, w);
            this.$tip.show();

        },

        hide: function() {
//            this.$tip.hide();
        },

        displayFn: function(ok) {
            if(ok.bottom) {
                if(ok.left) {
                    return this.bottomLeft;
                } else if(ok.right) {
                    return this.bottomRight;
                }
            } else if(ok.top) {
                if(ok.left) {
                    return this.topLeft;
                } else if(ok.right) {
                    return this.topRight;
                }
            }
        },

        setPositionClass: function(topbottom, leftright) {
            // Note: tip at top left needs a bottom pointer so swap top <=> bottom
            this.$tip
                    .addClass('magedebugbar-tooltips-' + (topbottom === 'top' ? 'bottom' : 'top'))
                    .addClass('magedebugbar-tooltips-' + leftright);
        },

        clearPositionClass: function() {
            ['top', 'bottom', 'left', 'right'].forEach(function(where) {
                this.$tip.removeClass('magedebugbar-tooltips-' + where);
            }, this);
        },

        topLeft: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.left - this.tipPointOffset)
            },
            'top', 'left');
        },

        topRight: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.top - height - this.tipPointheight),
                left: this.visibleLeft(screen, width, bounds.right - this.tipPointOffset) 
            },
            'top', 'right');
        },

        bottomLeft: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.left - this.tipPointOffset) 
            },
            'bottom', 'left');
        },

        bottomRight: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.right - width + this.tipPointOffset) 
            },
            'bottom', 'right');
        },

        position: function(pos, topbottom, leftright) {
            var body = $('body');
            this.$tip.css('top', pos.top + body.scrollTop()).css('left', pos.left + body.scrollLeft());
            this.setPositionClass(topbottom, leftright);
        },

        visibleTop: function(screen, height, top) {
            return Math.min(screen.bottom - height - this.tipPointHeight, Math.max(screen.top + this.tipPointHeight, top));
        },

        visibleLeft: function(screen, width, left) {
            return Math.min(screen.right - width - this.tipPointOffset, Math.max(screen.left + this.tipPointOffset, left));
        }

    });
})(jQuery);
