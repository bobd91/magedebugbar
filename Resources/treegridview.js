/**
 * Control that displays data both as a tree and in a table like grid
 * Columns work like table columns except that the first column
 * contains a tree structure where nodes and be openned and closed
 *
 * Triggers click events for each cell giving the row data and column number
 * Triggers hover events for each row giving the row data
 *
 * Data to be dislayed must conform to the following model
 * {
 *   columns:   [] of CSS class names, one for each column (optional)
 *   headings:  [] of heading names, one for each column (optional)
 *   values:    [] of property names to access column values from 'root'
 *   children:  property name to access child nodes array from 'root'
 *   root:      [] of root nodes
 * }
 *
 * TODO: column resizing
 *       fixed headings (don't scroll when table rows scroll)
 *
 * @module treegridview
 * @author Bob Davison
 * @version 1.0
 */
define(['jquery', 'class'],

function($, Class) {

    return Class.create({

        /**
         * Create TreeGridView with given data to display
         *
         * @param {Object} model - data to display
         */
        constructor: function(model) {
            this.model = model;
        },

        /**
         * Append HTML to given element
         *
         * @param {jQuery | DOM} element - element to append our HTML elements to
         */
        appendTo: function(element) {
            var container = $("<table />")
            .addClass(this.cssClass("container"))
            .appendTo(element);
            this.container = container;
            this.addColGroup(container);
            this.addHeadings(container);
            this.addRoot(container);
            this.addHandlers(container);
            return container;
        },

        /**
         * Discard the old root nodes and dispplay new ones
         *
         * @param {Array} root - root nodes to replace those in model
         */
        resetRoot: function(root) {
            this.container.has('tbody').children().remove();
            this.model.root = root;
            this.addRoot(this.container);
        },

        /**
         * If model.columns provided then add <colgroup> with col class names
         *
         * @param {jQuery} container - container to add <colgroup> to
         */
        addColGroup: function(container) {
            if(this.model.columns) {
                var cols = $("<colgroup />").appendTo(container);
                this.model.columns.forEach(function(v) {
                    $("<col>").addClass(v).appendTo(cols);

                });
            }
        },

        /**
         * If model.headings provided then add table header
         *
         * @param {jQuery} container - container to add table header to
         */
        addHeadings: function(container) {
            if(this.model.headings) {
                var thead = $("<thead />").appendTo(container);
                var tr = $("<tr />").appendTo(thead);
                this.model.headings.forEach(function(v) {
                    $("<th>" + v + "</th>").appendTo(tr);
                });
            }
        },

        /**
         * Add root nodes to container
         * and if only one root node then openit (display its children)
         *
         * @param {jQuery} container - container to add rows to
         */
        addRoot: function(container) {
            var children = this.model.root[this.model.children];
            var target;
            this.insertChildren(children, 1, container, true);
            if(children.length == 1) {
                target =  container.find(this.cssClassSelector("closed"));
                if(target.length) {
                    this.open({ target: target });
                }
            }
        },

        /**
         * Create a new table row
         *
         * @param {Object} branch - root node or descendant of root node
         * @param {integer} level - depth in the tree
         */
        makeRow: function(branch, level) {
            var tr = $("<tr />");
            this.model.values.forEach(function(v, i) {
                var td = $("<td />").appendTo(tr);
                if(i == 0) {
                    td.css("padding-left",  (level - 1) + ".3em");
                    var cls = this.cssClass(this.hasChildren(branch) ? "closed" : "leaf");
                    $("<div />")
                    .addClass(cls)
                    .addClass('fa fa-play icon')
                    .appendTo(td);
                }
                var cell = $("<div>" + branch[v] + "</div>")
                .addClass(this.cssClass("cell"))
                .appendTo(td);
                if(i == 0) {
                    cell.css("margin-left", ".5em");
                }
            }, this);
            return tr;
        },

        /**
         * Has this node got children
         *
         * @param {Object} branch - root node or descendant of root node
         * @return {boolean}      - true if branch has children
         */
        hasChildren: function(branch) {
            return 0 < branch[this.model.children].length;
        },

        /**
         * Add handlers for:
         *  opening and closing nodes 
         *  clicking on values in treegrid
         *  hovering ovr rows in treegrid
         *
         * @param {jQuery} container - object to add handlers to
         */
        addHandlers: function(container) {
            container.on("click", this.cssClassSelector("open"), this.close.bind(this));
            container.on("click", this.cssClassSelector("closed"), this.open.bind(this));
            container.on("click", this.cssClassSelector("cell"), this.click.bind(this));
            container.on("hover", this.cssClassSelector("hover"), this.hover.bind(this));
        },

        /**
         * Handle click event request to open a node with children
         *
         * Children are accessed as a Javascript Promise so the
         * model can load child nodes asynchronously
         *
         * @param {Event} - click event
         */
        open: function(event) {
            var target = $(event.target);
            target
            .removeClass(this.cssClass("closed"))
            .removeClass('fa-play icon')
            .addClass('fa-spinner fa-pulse')
            var row = this.findRow(event);
            Promise.resolve(row.branch[this.model.children])
            .then(function(children) {
                this.insertRows(children, 1 + row.level, row.element);
            }.bind(this))
            .catch(function(err) {
                console.err(err);
            })
            .then(function() {
                target
                .removeClass('fa-spinner fa-pulse')
                .addClass(this.cssClass("open"))
                .addClass('fa-play fa-rotate-90 icon');
            }.bind(this));
        },

        /**
         * Insert rows to display branches
         *
         * @param {Array} branches - [] of branches to add
         * @param {integer} level - depth of nodes in tree
         * @param {jQuery} prev   - element to appendTo or insertAfter
         * @param {boolean} append - if true then append first branch, all others are inserted after
         */
        insertRows: function(branches, level, prev, append) {
            nodes.forEach(function(node) { 
                prev = this.insertRow(node, level, prev, append);
                append = false;
            }, this);
        },

        /**
         * Insert row to display branch
         *
         * @param {Object} branch - branch to add
         * @param {integer} level - depth of nodes in tree
         * @param {jQuery} prev   - element to appendTo or insertAfter
         * @param {boolean} append - if true the append branch, otherwise insert after
         */
        insertRow: function(branch, level, element, append) {
            var row = this.makeRow(branch, level);
            if(append) {
                row = row.appendTo(element);
            } else {
                row = row.insertAfter(element);
            }
            return row
            .hover(this.hover.bind(this), this.unhover.bind(this))
            .data('branch', branch)
            .data('level', level);
        },

        /**
         * Find row click/hover event happened over
         *
         * @param {Event} event - DOM event
         * @return {Object} - { branch, level, element (<tr>) }
         */
       findRow: function(event) {
            var element = $(event.target).closest('tr');
            var row = element.data();
            row.element = element;
            return row;
        },

        /**
         * Find column click event happened on
         *
         * @param {Event} event - DOM event
         * @return {integer}    - zero based column number
         */ 
        findCol: function(event) {
            var element = $(event.target).closest('tr');
            var col;
            element.children().each(function (index, item) {
                if(col === undefined && $(item).has(event.target).length) {
                    col = index;
                }
            });
            return col;
        },

        /**
         * Close the given row (remove all descendents from display)
         *
         * @param {Event} event - click event that triggered close
         */
        close: function(event) {
            var row = this.findRow(event);
            var ok = true;
            row.element
            .nextAll()
            .filter(function (i, e) {
                ok = ok && $(e).data().level > row.level;
                return ok;
            })
            .remove();
            $(event.target)
            .removeClass(this.cssClass("open"))
            .removeClass('fa-rotate-90')
            .addClass(this.cssClass("closed"))
        },

        /**
         * Trigger click event to any listeners
         * 
         * Include row and column where click occurred
         *
         * @param {Event} event - click event
         */
        click: function(event) {
            $(this).trigger('click', [this.findRow(event), this.findCol(event)]);
        },

        /**
         * Trigger hover event with to any listeners (hover = true)
         *
         * Include row being hovered over
         *
         * @param {Event} event - mousemove event
         */
        hover: function(event) {
            $(event.currentTarget).addClass(this.cssClass("hover"));
            $(this).trigger('hover', [true, this.findRow(event)]);
        },

        /**
         * Trigger hover event with to any listeners (hover = false)
         *
         * Include row no longer hovered over
         *
         * @param {Event} event - mousemove event
         */
       unhover: function(event) {
            $(event.currentTarget).removeClass(this.cssClass("hover"));
            $(this).trigger('hover', [false, this.findRow(event)]);
        },

        // TODO: change
        cssClass: function(clas) {
            return clas.split(" ")
            .map(function (v) { return "treegridview-" + v; })
            .join(" ");
        },

        // TODO: change
        cssClassSelector: function(clas) {
            return this.cssClass(clas).split(" ")
            .map(function (v) { return "." + v; })
            .join(" ");
        }

    });

});

