define([
    'jquery',
    'knockout',
    'd3'
], function($, ko, d3) {
    ko.bindingHandlers.timeWheel = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var width = 750;
            var height = 600;
            var radius = Math.min(width, height) / 2;
            var colortheme = d3.scale.category20c();
            var x = d3.scale.linear()
                .range([0, 2 * Math.PI]);
            var y = d3.scale.sqrt()
                .range([0, radius]);
            var $el = $(element);
            var opts = ko.unwrap(valueAccessor());
            console.log(opts);
            var configJSON = opts.config;

            // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
            var b = {
                w: 100,
                h: 30,
                s: 3,
                t: 10
            };

            var vis = d3.select($el.find('.chart')[0]).append("svg:svg")
                .attr("width", width)
                .attr("height", height)
                .append("svg:g")
                .attr("class", "container")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            var partition = d3.layout.partition()
                .size([2 * Math.PI, radius * radius])
                .value(function(d) {
                    return d.size;
                })
                .sort(function(d) {
                    return d3.descending(d.start);
                });

            var arc = d3.svg.arc()
                .startAngle(function(d) {
                    return d.x;
                })
                .endAngle(function(d) {
                    return d.x + d.dx;
                })
                .innerRadius(function(d) {
                    return Math.sqrt(d.y);
                })
                .outerRadius(function(d) {
                    return Math.sqrt(d.y + d.dy);
                });

            // Bounding circle underneath the sunburst, to make it easier to detect
            // when the mouse leaves the parent g.
            vis.append("svg:circle")
                .attr("r", radius)
                .style("opacity", 0);

            // Add the svg area.
            var trail = d3.select($el.find('.sequence')[0]).append("svg:svg")
                .attr("width", width)
                .attr("height", 50)
                .attr("class", "trail");
            // Add the label at the end, for the count.
            trail.append("svg:text")
                .attr("class", "endlabel")
                .style("fill", "#000");

            // Bounding circle underneath the sunburst, to make it easier to detect
            // when the mouse leaves the parent g.
            vis.append("svg:circle")
                .attr("r", radius)
                .style("opacity", 0);

            // For efficiency, filter nodes to keep only those large enough to see.
            var nodes = partition.nodes(configJSON)
                .filter(function(d) {
                    return (d.dx > 0.0005); // 0.005 radians = 0.29 degrees
                });

            var path = vis.data([configJSON]).selectAll("path")
                .data(nodes)
                .enter().append("svg:path")
                .attr("display", function(d) {
                    return d.depth ? null : "none";
                })
                .attr("d", arc)
                .attr("fill-rule", "evenodd")
                .style("fill", function(d) {
                    return colortheme((d.children ? d : d.parent).name);
                })
                .style("opacity", 1)
                .on("mouseover", mouseover)
                .on("click", function (d) {
                    if (typeof opts.onClick === 'function') {
                        opts.onClick(d);
                    }
                })
                .on("dblclick", function(d) {
                //   vis.transition()
                //       .duration(750)
                //       .tween("scale", function() {
                //         var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                //             yd = d3.interpolate(y.domain(), [d.y, 1]),
                //             yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
                //         return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
                //       })
                //     .selectAll("path")
                //       .attrTween("d", function(d) { return function() { return arc(d); }; });
                });

            // Add the mouseleave handler to the bounding circle.
            d3.select($el.find('.container')[0]).on("mouseleave", function(d) {
                // Hide the breadcrumb trail
                d3.select($el.find('.trail')[0])
                    .style("visibility", "hidden");

                // Deactivate all segments during transition.
                d3.selectAll("path").on("mouseover", null);

                // Transition each segment to full opacity and then reactivate it.
                d3.selectAll("path")
                    .transition()
                    .duration(1000)
                    .style("opacity", 1)
                    .each("end", function() {
                        d3.select(this).on("mouseover", mouseover);
                    });

                d3.select($el.find('.explanation')[0])
                    .style("visibility", "hidden");
            });

            // Get total size of the tree = value of root node from partition.
            var totalSize = path.node().__data__.value;


            // Set default count value
            var count = "86425";
            d3.select($el.find('.count')[0])
                .text(count);

            // Fade all but the current sequence, and show it in the breadcrumb trail.
            function mouseover(d) {
                count = d.value;
                if (d.value < 1) {
                    count = "< 1";
                }

                d3.select($el.find('.count')[0])
                    .text(count);

                d3.select($el.find('.explanation')[0])
                    .style("visibility", "");

                var sequenceArray = [];
                var current = d;
                while (current.parent) {
                    sequenceArray.unshift(current);
                    current = current.parent;
                }

                // Data join; key function combines name and depth (= position in sequence).
                var g = d3.select($el.find('.trail')[0])
                    .selectAll("g")
                    .data(sequenceArray, function(d) {
                        return d.name + d.depth;
                    });

                // Add breadcrumb and label for entering nodes.
                var entering = g.enter().append("svg:g");

                entering.append("svg:text")
                    .attr("x", (b.w + b.t) / 2)
                    .attr("y", b.h / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .attr("fill", "#123")
                    .text(function(d) {
                        return d.name;
                    });

                //Set position for entering and updating nodes.
                g.attr("transform", function(d, i) {
                    return "translate(" + i * (b.w + b.s) + ", 0)";
                });

                // Remove exiting nodes.
                g.exit().remove();

                // Make the breadcrumb trail visible, if it's hidden.
                d3.select($el.find('.trail')[0])
                    .style("visibility", "");

                // Fade all the segments.
                d3.selectAll("path")
                    .style("opacity", 0.3);

                // Then highlight only those that are an ancestor of the current segment.
                vis.selectAll("path")
                    .filter(function(node) {
                        return (sequenceArray.indexOf(node) >= 0);
                    })
                    .style("opacity", 1);
            }


            //	Fill Colors
            var hue = d3.scale.category10();

            var luminance = d3.scale.sqrt()
                .domain([0, 1e6])
                .clamp(true)
                .range([90, 20]);

            function fill(d) {
                var p = d;
                while (p.depth > 1) p = p.parent;
                var c = d3.lab(hue(p.name));
                c.l = luminance(d.sum);
                return c;
            }

        }
    }
    return ko.bindingHandlers.timeWheel;
});
