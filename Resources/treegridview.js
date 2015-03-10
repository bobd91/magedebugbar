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
                return container;
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
                var children = this.model.root[this.model.children];
                this.insertChildren(children, 1, container, true);
                if(children.length == 1) {
                    this.open({ target: container.find(this.cssClassSelector("closed")) });
                }
            },

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

            hasChildren: function(branch) {
                return 0 < branch[this.model.children].length;
            },

            addHandlers: function(container) {
                container.on("click", this.cssClassSelector("open"), this.close.bind(this));
                container.on("click", this.cssClassSelector("closed"), this.open.bind(this));
                container.on("click", this.cssClassSelector("cell"), this.click.bind(this));
                container.on("hover", this.cssClassSelector("hover"), this.hover.bind(this));
            },

            open: function(event) {
                var target = $(event.target);
                target
                    .removeClass(this.cssClass("closed"))
                    .removeClass('fa-play icon')
                    .addClass('fa-spinner fa-pulse')
                var row = this.findRow(event);
                Promise.resolve(row.branch[this.model.children])
                    .then(function(children) {
                        this.insertChildren(children, 1 + row.level, row.element);
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

            insertChildren: function(children, level, prev, append) {
                children.forEach(function(v) { 
                    prev = this.insertRow(v, level, prev, append);
                    append = false;
                }, this);
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

            click: function(event) {
                $(this).trigger('click', [this.findRow(event), this.findCol(event)]);
            },

            hover: function(event) {
                $(event.currentTarget).addClass(this.cssClass("hover"));
                $(this).trigger('hover', [true, this.findRow(event)]);
            },

            unhover: function(event) {
                $(event.currentTarget).removeClass(this.cssClass("hover"));
                $(this).trigger('hover', [false, this.findRow(event)]);
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

