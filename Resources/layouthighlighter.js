/**
 * Highlights a layout block on the main web page
 * by displaying a semi-opaque overlay
 * and a related tooltip
 *
 * @module layouthightlighter
 * @author Bob Davison
 * @version 1.0
 */

define(['jquery', 'class', 'cssclass'],

function($, Class, CssClass) {

    var cssClass = CssClass.generate('highlight', ['block', 'tooltip', 'point-top', 'point-bottom', 'point-left', 'point-right']);

    return Class.create({

        /**
         * Create <div> for highlighting block and <span> for tooltip
         * and append to body element
         */
        constructor: function() {
            this.$block = $('<div />').addClass(cssClass.block);
            this.$tooltip = $('<span />').addClass(cssClass.tooltip);

            $('body').append(this.$block).append(this.$tooltip);
        },

        /**
         * Highlight given blockid and display tooltip with name
         *
         * Server surrounds rendered blocks with 
         * <span data-blockid='blockid'></span>
         * elements so that blocks can be located in the page
         *
         * @param {String} name     - block name to display in tooltip
         * @param {integer} blockid - unique id of block
         */
        show: function(name, blockid) {
            var elems = $("[data-blockid='" + blockid + "']");
            if(2 === elems.length) {
                var bounds = this.combineBounds(elems.eq(0), elems.eq(1));
                if(bounds) {
                    this.showBlock(bounds);
                    this.showToolTip(bounds, name);
                }
            }
       },

       /**
        * Hide higlight block <div> amd tooltip <span>
        */
        hide: function() {
            this.$block.hide();
            this.$tooltip.hide();
        },

        /**
         * Show the highlight block div over the given bounds
         *
         * @param {Object} bounds - top, right, bottom, left of area to highlight
         */
        showBlock: function(bounds) {
console.log("Show block", bounds);
            this.$block.css({
                top: bounds.top,
                left: bounds.left,
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top
            })
            .show();
        },

        /**
         * Show the tooltip for the given highlight area  with the given text
         *
         * The area may be partially on screen or not on screen at all 
         * but tooltip should always be on screen
         *
         * Tooltip has a point which can be pointing up or down and located at right or left
         * side of the tooltip box.  This needs to be located so it points to the highlit area
         * if they are visible or so that it indicates which direction the area is if it is not 
         *
         * @param {Object} highlight  - top, right, bottom, left of highlit area
         * @param {String} text   - tooltip text
         */
        showToolTip: function(highlight, text) {
            this.clearLocationClass();
            this.$tooltip.text(text);

            var h = this.tipBoxHeight;
            var w = this.tipBoxWidth * text.length;
            var screen = this.getScreenBounds();

            // find best, ok and fallback locations for the tooltip
            var good = this.possibleTipLocation(highlight, screen, (screen.right - screen.left) / 8, (screen.bottom - screen.top) / 8);
            var ok = this.possibleTipLocation(highlight, screen, w, h);
            var fallback = this.fallbackTipLocation(ok);

            var fn = this.displayFn(good)
                  || this.displayFn(ok)
                  || this.displayFn(fallback);
            fn.call(this, highlight, screen, h, w);

            this.$tooltip.show();
        },

        /**
         * Calculate available bounds of screen
         * Takes PhpDebugBar into consideration
         *
         * @return {Object} - top, right, bottom, left values of available screen
         */
        getScreenBounds: function() {
            var body = $('body');
            return {
                top: body.scrollTop(),
                right: window.innerWidth + body.scrollLeft(),
                bottom: $('.phpdebugbar').offset().top,
                left: body.scrollLeft()
            };
        },

        /**
         * Calculates which top, right, bottom, left locations are possible for the tooltip
         * given the bounds to indicate, the screen size and the width/height to allow for the tooltip
         *
         * @param {Object} highlight  - top, right, bottom, left of highlit area
         * @param {Object} screen  - top, right, bottom, left of available screen
         * @param {integer} width  - minimum width to allow for the display of the tooltip
         * @param {integer} height - minimum height to allow for the display of the tooltip
         * @return {Object}        - top, right, bottom, left boolean values, true = possible location for tooltip
         */
        possibleTipLocation: function(highlight, screen, width, height) {
            return {
                top: highlight.top >= height,
                right: highlight.right <= screen.right - width,
                bottom: highlight.bottom <= screen.bottom - height,
                left:  highlight.left >= width
            };
        },

        /**
         * Fallback location for display of tooltip if preferred location cannot be established
         * 
         * Location supplied will not contain an agreed topleft, topright, bottomleft, bottomright
         * location for the tooltip
         *
         * Fallback will prefer bottom and left but will use top or right if they are possible
         * Fallback will always yeild a valid location for the tooltip
         *
         * @param {Object} location - top, right, bottom, left boolean values, true = possible location for tooltip
         * @return {Object}         - top, right, bottom, left boolean values, true = possible location for tooltip
         */
        fallbackTipLocation: function(location) {
            return {
                top: location.top,
                right: location.right,
                left: location.left || !location.right,
                bottom: location.bottom || !location.top
            };
        },

        /**
         * Calculate largest bounds of area covered by the 
         * elements between begin and end (inclusive) 
         *
         * @param {jQuery} begin - the start element
         * @param {jQuery} end   - the end element
         * @return {Object}      - top, right, bottom, left bounds that surrounds all elements
         *                         return nothing if parent is hidden
         */
        combineBounds: function(begin, end) {
            if(begin.parent().is(':hidden')) return;

            var off, res;
            var content = false; // Have we seen anything since beginning
            for(var elem = begin.next() ; !elem.is(end) && elem.length ; elem = elem.next()) {
                var display = elem.css('display');
                if((off = elem.offset()) && display !== 'none' && display !== 'inline') {
                    var h = elem.outerHeight();
                    var w = elem.outerWidth();
                    if(!content) {
                        res = {
                            top: off.top,
                            right: off.left + w,
                            bottom: off.top + h,
                            left: off.left
                        };
                        content = true;
                    } else {
                        res.top = Math.min(res.top, off.top);
                        res.right = Math.max(res.right, off.left + w);
                        res.bottom = Math.max(res.bottom, off.top + h);
                        res.left = Math.min(res.left, off.left);
                    }
                }
            }
            if(!content) {
                off = begin.offset();
                res = {top: off.top, right: off.left, bottom: off.top, left: off.left};
                off = end.offset();
                var h = end.height()
                if(res.top + h <= off.top) {
                    // spans on different lines
                    // so must go to parent block container
                    // to calculate left and right 
                    res.bottom = off.top;
                    var p = this.parentLeftRight(begin);
                    if(p) {
                        res.left = p.left;
                        res.right = p.right;
                    }
                } else {
                    res.bottom = off.top + h;
                    res.right = off.left;
                }
            }
            return res;
        },

        /**
         * Find nearest non-inline parent and calculate left and right
         *
         * Needed for finding bounds of in-line elements that span several lines.
         *
         * @param {jQuery} elem - element whose parent to check
         * @return {Object}     - left and right position of parent     
         */
        parentLeftRight: function(elem) {
            var parents = elem.parents();
            var i = 0;
            for(; i < parents.length && parents.eq(i).css('display') === 'inline'; i++) 
            ;

            // Should never happen (body set to inline?) but just in case
            if(i === parents.length) return;

            var parent = parents.eq(i);
            var offset = parent.offset();
            var left = offset.left + parseInt(parent.css('margin-left')) + parseInt(parent.css('border-left-width'));
            var right = left + parent.innerWidth();
            return { left: left, right: right };
        },

       /**
        * Select a tooltip display function given the permitted location
        *
        * @param {Object} location - top, right, bottom, left booleans indicating permitted tooltip locations
        * @return {Function}     - one of bottomLeft, bottomRight, topLeft, topRight
        */
        displayFn: function(location) {
            if(location.bottom) {
                if(location.left) {
                    return this.bottomLeft;
                } else if(location.right) {
                    return this.bottomRight;
                }
            } else if(location.top) {
                if(location.left) {
                    return this.topLeft;
                } else if(location.right) {
                    return this.topRight;
                }
            }
        },

        /**
         * Sets the correct CSS class on the tooltip so that the pointer
         * is located in the correct place
         *
         * @param {String} topbottom - tooltip is located at 'top' or 'bottom'
         * @param {String} leftright - tooltip is located at 'left' or 'right'
         */
        setLocationClass: function(topbottom, leftright) {
            // Note: tip at top left needs a bottom pointer so swap top <=> bottom
            this.$tooltip
                    .addClass(cssClass.point[topbottom === 'top' ? 'bottom' : 'top'])
                    .addClass(cssClass.point[leftright]);
        },

        /**
         * Remove tooltip location related CSS classes
         */
        clearLocationClass: function() {
            ['top', 'bottom', 'left', 'right'].forEach(function(where) {
                this.$tooltip.removeClass(cssClass.point[where]);
            }, this);
        },

        /**
         * Display tooltip at top left
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        topLeft: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.left - this.tipPointOffset)
            },
            'top', 'left');
        },

        /**
         * Display tooltip at top right
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
       topRight: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.right - width + this.tipPointOffset) 
            },
            'top', 'right');
        },

        /**
         * Display tooltip at bottom left
         * 
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        bottomLeft: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.left - this.tipPointOffset) 
            },
            'bottom', 'left');
        },

        /**
         * Display tooltip at bottom right
         *
         * @param {Object} highlight - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {in/teger} width - width of tooltip box
         */
        bottomRight: function(highlight, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, highlight.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, highlight.right - width + this.tipPointOffset) 
            },
            'bottom', 'right');
        },

        /**
         * Display tooltip at correct position with pointer in the right place
         *
         * @param {Object} pos       - top and left position for tooltip
         * @param {String} topbottom - tooltip at 'top' or 'bottom' of highlight
         * @param {String} leftright - tooltip at 'left' or 'right' og highlight
         */ 
        position: function(pos, topbottom, leftright) {
            var body = $('body');
            this.$tooltip.css('top', pos.top).css('left', pos.left);
console.log("Show tip", pos);
            this.setLocationClass(topbottom, leftright);
        },

        /**
         * Ensure top of tooltip is on the screen
         *
         * @param {Object} screen  - top, right, bottom, left of visible screen
         * @param {integer} height - tooltip height
         * @param {integer} top    - current top position
         * @return {integer}       - top position that is on screen
         */
        visibleTop: function(screen, height, top) {
            return Math.min(screen.bottom - height - this.tipPointHeight, Math.max(screen.top + this.tipPointHeight, top));
        },

 
        /**
         * Ensure left of tooltip is on the screen
         *
         * @param {Object} screen - top, right, bottom, left of visible screen
         * @param {integer} width - tooltip width
         * @param {integer} left  - current left position
         * @return {integer}      - left position that is on screen
         */
       visibleLeft: function(screen, width, left) {
            return Math.min(screen.right - width - this.tipPointOffset, Math.max(screen.left + this.tipPointOffset, left));
        },

        // Approx size/position of tip box and tip point
        // Might be better to get actual dimensions
        // but approximations seem to work ok
        tipPointOffset: 16,
        tipPointHeight: 8,
        tipBoxHeight: 18,
        tipBoxWidth: 9,
        
    });
});


