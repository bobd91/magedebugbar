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
            this.$block.css({
                top: bounds.top,
                left: bounds.left,
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top
            })
            .show();
        },

        /**
         * Show the tooltip for the given bounds with the given text
         *
         * The bounds may be partially on screen or not on screen at all 
         * but tooltip should always be on screen
         *
         * Tooltip has a point which can be pointing up or down and located at right or left
         * side of the tooltip box.  This needs to be positioned so it points to the bounds
         * if they are visible or so that it indicates which direction the bounds are if they
         * are off screen.
         *
         * @param {Object} bounds - top, right, bottom, left of area to highlight
         * @param {String} text   - tooltip text
         */
        showToolTp: function(bounds, text) {
            this.clearPositionClass();
            this.$tooltip.text(text);

            var h = this.tipBoxHeight;
            var w = this.tipBoxWidth * text.length;

            var screen = { top: 0, right: window.innerWidth, bottom: $('.phpdebugbar').offset().top - $('body').scrollTop(), left: 0 };
            var good = this.possibleTipPosition(bounds, screen, screen.right / 8, screen.bottom / 8);
            var ok = this.possibleTipPosition(bounds, screen, w, h);
            var fallback = this.fallbackTipPosition(ok);

            var fn = this.displayFn(good)
                  || this.displayFn(ok)
                  || this.displayFn(fallback);
            fn.call(this, bounds, screen, h, w);

            this.$tooltip.show();
        },

        /**
         * Calculates which top, right, bottom, left positions are possible for the tooltip
         * given the bounds to indicate, the screen size and the width/height to allow for the tooltip
         *
         * @param {Object} bounds  - top, right, bottom, left of area to highlight
         * @param {Object} screen  - top, right, bottom, left of available screen
         * @param {integer} width  - minimum width to allow for the display of the tooltip
         * @param {integer} height - minimum height to allow for the display of the tooltip
         * @return {Object}        - top, right, bottom, left boolean values, true = possible position for tooltip
         */
        possibleTipPosition: function(bounds, screen, width, height) {
            return {
                top: bounds.top >= height,
                right: bounds.right <= screen.right - width,
                bottom: bounds.bottom <= screen.bottom - height,
                left:  bounds.left >= width
            };
        },

        /**
         * Fallback position for display of tooltip if preferred location cannot be established
         * 
         * Position supplied will not contain an agreed topleft, topright, bottomleft, bottomright
         * position for the tooltip
         *
         * Fallback will prefer bottom and left but will use top or right if they are preferred
         * Fallback will always yeild a valid position for the tooltip
         *
         * @param {Object} position - top, right, bottom, left boolean values, true = possible position for tooltip
         * @return {Object}         - top, right, bottom, left boolean values, true = possible position for tooltip
         */
        fallBackTipPosition: function(position) {
            return {
                top: position.top,
                right: position.right,
                left: position.left || !position.right,
                bottom: position.bottom || !position.top
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

            var o = begin.offset();
            var res = {top: o.top, right: o.left, bottom: o.top, left: o.left};
            var content = false; // Have we seen anything since beginning
            for(var elem = begin.next() ; !elem.is(end) && elem.length ; elem = elem.next()) {
                var display = elem.css('display');
                if((o = elem.offset()) && display !== 'none' && display !== 'inline') {
                    content = true;
                    var h = elem.outerHeight();
                    var w = elem.outerWidth();
                    res.top = Math.min(res.top, o.top);
                    res.left = Math.min(res.left, o.left);
                    res.bottom = Math.max(res.bottom, o.top + h);
                    res.right = Math.max(res.right, o.left + w);
                }
            }
            if(!content) {
                o = end.offset();
                var h = end.height()
                if(res.top + h <= o.top) {
                    // spans on different lines
                    // so must go to parent block container
                    // to calculate left and right 
                    res.bottom = o.top;
                    var p = this.parentLeftRight(begin);
                    if(p) {
                        res.left = p.left;
                        res.right = p.right;
                    }
                } else {
                    res.bottom = o.top + h;
                    res.right = o.left;
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
        * Select a tooltip display function given the permitted bounds
        *
        * @param {Object} bounds - top, right, bottom, left booleans indicating permitted tooltip positions
        * @return {Function}     - one of bottomLeft, bottomRight, topLeft, topRight
        */
        displayFn: function(bounds) {
            if(bounds.bottom) {
                if(bounds.left) {
                    return this.bottomLeft;
                } else if(bounds.right) {
                    return this.bottomRight;
                }
            } else if(bounds.top) {
                if(bounds.left) {
                    return this.topLeft;
                } else if(bounds.right) {
                    return this.topRight;
                }
            }
        },

        /**
         * Sets the correct CSS class on the tooltip so that the pointer
         * is displayed in the correct place
         *
         * @param {String} topbottom - tooltip is positioned at 'top' or 'bottom'
         * @param {String} leftright - tooltip is positioned at 'left' or 'right'
         */
        setPositionClass: function(topbottom, leftright) {
            // Note: tip at top left needs a bottom pointer so swap top <=> bottom
            this.$tooltip
                    .addClass(cssClass.point[topbottom === 'top' ? 'bottom' : 'top'])
                    .addClass(cssClass.point[leftright]);
        },

        /**
         * Remove tooltip position related CSS classes
         */
        clearPositionClass: function() {
            ['top', 'bottom', 'left', 'right'].forEach(function(where) {
                this.$tooltip.removeClass(cssClass.point[where]);
            }, this);
        },

        /**
         * Display tooltip at top left
         *
         * @param {Object} bounds - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        topLeft: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.top - height - this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.left - this.tipPointOffset)
            },
            'top', 'left');
        },

        /**
         * Display tooltip at top right
         *
         * @param {Object} bounds - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
       topRight: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.top - height - this.tipPointheight),
                left: this.visibleLeft(screen, width, bounds.right - this.tipPointOffset) 
            },
            'top', 'right');
        },

        /**
         * Display tooltip at bottom left
         * 
         * @param {Object} bounds - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        bottomLeft: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.left - this.tipPointOffset) 
            },
            'bottom', 'left');
        },

        /**
         * Display tooltip at bottom right
         *
         * @param {Object} bounds - top, right, bottom, left position of highlit area
         * @param {Object} screen - top, right, bottom, left position of available screen
         * @param {integer} height - height of tooltip box
         * @param {integer} width - width of tooltip box
         */
        bottomRight: function(bounds, screen, height, width) {
            this.position({
                top: this.visibleTop(screen, height, bounds.bottom + this.tipPointHeight),
                left: this.visibleLeft(screen, width, bounds.right - width + this.tipPointOffset) 
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
            this.$tooltip.css('top', pos.top + body.scrollTop()).css('left', pos.left + body.scrollLeft());
            this.setPositionClass(topbottom, leftright);
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
        // Just used to check where it would fit best
        // Not actually used for sizing so approx is ok
        tipPointOffset: 16,
        tipPointHeight: 8,
        tipBoxHeight: 20,
        tipBoxWidth: 9,
        
    });
});


