var TreeGridView = 
(
    function($) {

        function TreeGridView (model) {
            this.model = model;
        }

        $.extend(TreeGridView.prototype, {
            appendTo: function(element) {
                var container = $("<table />")
                    .addClass(this.cssClass("container"))
                    .appendTo(element);
                this.addColGroup(container);
                this.addHeadings(container);
                this.addRoot(container);
                this.addHandlers(container);
            },

            addColGroup: function(container) {
                if(this.model.columns) {
                    var cols = $("<colgroup />").appendTo(container);
                    this.model.columns.forEach(function(v) {
                        $("<col>").addClass(v).appendTo(cols);

                    });
                }
            },

            addHeadings: function(container) {
                if(this.model.headings) {
                    var thead = $("<thead />").appendTo(container);
                    var tr = $("<tr />").appendTo(thead);
                    this.model.headings.forEach(function(v) {
                        $("<th>" + v + "</th>").appendTo(tr);
                    });
                }
            },

            addRoot: function(container) {
                var row = this
                    .makeRow(this.model.root, 1)
                    .appendTo(container)
                    .hover(this.hover.bind(this), this.unhover.bind(this))
                    .data('branch', this.model.root)
                    .data('level', 1);

                this.open({ target: row.find(this.cssClassSelector("closed")) });
            },

            makeRow: function(branch, level) {
                var tr = $("<tr />");
                branch.values.forEach(function(v, i) {
                    var td = $("<td />").appendTo(tr);
                    if(i == 0) {
                        td.css("padding-left",  (level - 1) + "em");
                        var cls = this.cssClass('children' in branch ? "closed" : "leaf");
                        $("<div />")
                            .addClass(cls)
                            .appendTo(td);
                    }
                    var cell = $("<div>" + v + "</div>")
                        .addClass(this.cssClass("cell"))
                        .appendTo(td);
                    if(i == 0) {
                        cell.css("padding-left", "1em");
                    }
                }, this);
                return tr;
            },

            addHandlers: function(container) {
                container.on("click", this.cssClassSelector("open"), this.close.bind(this));
                container.on("click", this.cssClassSelector("closed"), this.open.bind(this));
                container.on("click", this.cssClassSelector("cell"), this.click.bind(this));
            },

            open: function(event) {
                var target = $(event.target);
                target
                    .removeClass(this.cssClass("closed"))
                    .addClass(this.cssClass("opening"));
                var row = this.findRow(event);
                var prev = row.element;
                Promise.resolve(row.branch.children)
                    .then(function(children) {
                        children.forEach(function(v) { 
                            prev = this.insertRow(v, 1 + row.level, prev);
                        }, this)
                    }.bind(this))
                    .catch(function(err) {
                        console.err(err);
                    })
                    .then(function() {
                        target
                            .removeClass(this.cssClass("opening"))
                            .addClass(this.cssClass("open"));
                    }.bind(this));
            },

            findRow: function(event) {
                var element = $(event.target).closest('tr');
                var row = element.data();
                row.element = element;
                return row;
            },

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


            insertRow: function(branch, level, element) {
                return this.makeRow(branch, level)
                    .insertAfter(element)
                    .hover(this.hover.bind(this), this.unhover.bind(this))
                    .data('branch', branch)
                    .data('level', level);
            },

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
                    .addClass(this.cssClass("closed"));
            },

            click: function(event) {
                $(this).trigger('click', [this.findRow(event), this.findCol(event)]);
            },

            hover: function(event) {
                $(event.currentTarget).addClass(this.cssClass("hover"));
            },

            unhover: function(event) {
                $(event.currentTarget).removeClass(this.cssClass("hover"));
            },

            cssClass: function(clas) {
                return clas.split(" ")
                    .map(function (v) { return "treegridview-" + v; })
                    .join(" ");
            },

            cssClassSelector: function(clas) {
                return this.cssClass(clas).split(" ")
                    .map(function (v) { return "." + v; })
                    .join(" ");
            }

        });

        return TreeGridView;
    }
)(jQuery);

