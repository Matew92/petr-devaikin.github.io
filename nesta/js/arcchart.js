function Arcchart(svg, p) {
	var params = {
		topMargin: 50,
		graphWidth: 600,
		itemWidth: 'auto',
		itemHeight: 20,
		pointMaxRadius: 20,
		arcMaxThickness: 5,
		transitionDuration: 500,
	}

	Object.keys(p).forEach(function(key) { params[key] = p[key]; });

	var graphArea,
		itemsArea,
		leftPartArea,
		rightPartArea,
		leftPointsArea,
		rightPointsArea,
		leftArcsArea,
		rightArcsArea;

	var yScale,
		rScale,
		arcScale;

	var transition;

	function init() {
		svg.html('');
		svg.classed('vis--arc', true);

		// Areas

		graphArea = svg.append('g')
			.classed('vis__graph', true)
			.attr('transform', 'translate({0},{1})'.format(params.graphWidth / 2, params.topMargin));

		leftPartArea = graphArea.append('g')
			.attr('class', 'vis__graph__values vis__graph__values--left');

		rightPartArea = graphArea.append('g')
			.attr('class', 'vis__graph__values vis__graph__values--right');

		itemsArea = graphArea.append('g')
			.classed('vis__graph__items', true);

		leftArcsArea = leftPartArea.append('g')
			.classed('vis__graph__values__arcs', true);

		rightArcsArea = rightPartArea.append('g')
			.classed('vis__graph__values__arcs', true);

		leftPointsArea = leftPartArea.append('g')
			.classed('vis__graph__values__points', true);

		rightPointsArea = rightPartArea.append('g')
			.classed('vis__graph__values__points', true);

		// Scale

		yScale = d3.scaleOrdinal();
		rScale = d3.scaleSqrt().range([0, params.pointMaxRadius]);
		arcScale = d3.scaleLinear().range([0, params.arcMaxThickness]);

		// Transition
		transition = d3.transition()
		    .duration(params.transitionDuration)
		    .ease(d3.easeLinear);
	}
	init();

	this.draw = function(items, leftValues, rightValues, leftConnections, rightConnections) {
		// prepare data
		leftConnections.forEach(function(d) { d.isLeft = true; });
		rightConnections.forEach(function(d) { d.isLeft = false; });
		leftValues.forEach(function(d) { d.isLeft = true; });
		rightValues.forEach(function(d) { d.isLeft = false; });

		leftValues.sort(function(a, b) { return b.value - a.value; });
		rightValues.sort(function(a, b) { return b.value - a.value; });

		// Update scales
		yScale
			.domain(items.map(function(d) { return d.id; }))
			.range(items.map(function(d, i) { return i * params.itemHeight; }));

		var maxValue = Math.max(
			d3.max(leftValues, function(d) { return d.value; }),
			d3.max(rightValues, function(d) { return d.value; })
		);
		rScale.domain([0, maxValue]);

		var maxArcThickness = Math.max(
			leftConnections.length ? d3.max(leftConnections, function(d) { return d.value; }) : 0,
			rightConnections.length ? d3.max(rightConnections, function(d) { return d.value; }) : 0
		);

		arcScale.domain([0, maxArcThickness]);

		// draw items
		function positionItems(selection) {
			// do animated transition!
			selection.attr('transform', function(d, i) {
				return 'translate({0},{1})'.format(0, yScale(i));
			});
		}

		var items = itemsArea.selectAll('.vis__graph__items__item').data(items, function(d) { return d.id; });
		var newItems = items.enter().append('text')
			.classed('vis__graph__items__item', true)
			.text(function(d) { return d.name; })
			.on('mouseover', hoverItem)
			.on('mouseout', outItem)
			.on('click', function(d) { d3.event.stopPropagation(); selectItem(d.id); });
		items.exit().remove();

		items.transition(transition).call(positionItems);
		newItems.call(positionItems);

		// move left and right parts
		var itemBBox = itemsArea.node().getBBox();
		var itemWidth = params.itemWidth == 'auto' ? itemBBox.width + params.pointMaxRadius + 60 : params.itemWidth;
		leftPartArea.attr('transform', 'translate({0},{1})'.format(-itemWidth / 2, 0));
		rightPartArea.attr('transform', 'translate({0},{1})'.format(itemWidth / 2, 0));

		// draw points
		function updatePoints(selection) {
			selection
				.attr('transform', function(d) {
					return 'translate({0},{1})'.format(0, yScale(d.id));
				})
				.select('circle')
					.attr('r', function(d) { return rScale(d.value); });
			selection.select('text')
				.attr('transform', function(d) {
					return 'translate({0},{1})'.format(d.isLeft ? rScale(d.value) + 2 : -rScale(d.value) - 2, 0);
				})
				.text(function(d) { return d.value; });
		}

		function bindPoints(area, data) {
			var points = area.selectAll('.vis__graph__values__points__point').data(data, function(d) { return d.id; });
			var newPoints = points.enter().append('g')
				.classed('vis__graph__values__points__point', true)
				.on('mouseover', hoverItem)
				.on('mouseout', outItem)
				.on('click', function(d) { d3.event.stopPropagation(); selectItem(d.id); });
			newPoints.append('circle');
			newPoints.append('text');
			points.exit()
				.transition(transition)
				.style('opacity', 0)
				.remove();

			points.transition(transition).call(updatePoints);
			newPoints.call(updatePoints)
				.style('opacity', 0)
				.transition(transition)
				.style('opacity', 1);
		}
		bindPoints(leftPointsArea, leftValues);
		bindPoints(rightPointsArea, rightValues);

		// draw arcs
		function updateArcs(selection) {
			// animate transition
			selection.selectAll('path')
				.attr('stroke-width', function(d) { return arcScale(d.value); })
				.attr('d', function(d) {
					if (d.isLeft && yScale(d.itemIds[1]) > yScale(d.itemIds[0]))
						d.itemIds.reverse();
					else if (!d.isLeft && yScale(d.itemIds[1]) < yScale(d.itemIds[0]))
						d.itemIds.reverse();

					var radius = Math.abs(yScale(d.itemIds[1]) - yScale(d.itemIds[0])) / 2;
					var res = 'M{0} {1} '.format(0, yScale(d.itemIds[0]));
					res += 'A {0} {0} 0 1 1 {1} {2}'.format(radius, 0, yScale(d.itemIds[1]));
					return res;
				});

			selection.select('.vis__graph__values__arcs__arc__bg')
				.attr('stroke-width', 8);

			selection.select('text')
				.attr('transform', function(d) {
					var radius = Math.abs(yScale(d.itemIds[1]) - yScale(d.itemIds[0])) / 2;
					var shiftX = d.isLeft ? -radius - 5 : radius + 5;
					var minY = Math.min(yScale(d.itemIds[1]), yScale(d.itemIds[0]));
					return 'translate({0},{1})'.format(shiftX, minY + radius);
				})
				.text(function(d) { return d.value.abbrNum(2); });
		}

		function bindArcs(area, data) {
			var arcs = area.selectAll('.vis__graph__values__arcs__arc').data(data, function(d) { return d.itemIds[0] + '_' + d.itemIds[1]; });
			var newArcs = arcs.enter().append('g')
				.classed('vis__graph__values__arcs__arc', true)
				.on('mouseover', hoverArc)
				.on('mouseout', outArc)
				.on('click', function() { d3.event.stopPropagation(); });
			newArcs.append('path').classed('vis__graph__values__arcs__arc__bg', true);
			newArcs.append('path').classed('vis__graph__values__arcs__arc__line', true);
			newArcs.append('text');
			arcs.exit()
				.transition(transition)
				.style('opacity', 0)
				.remove();

			arcs.transition(transition).call(updateArcs);
			newArcs.call(updateArcs)
				.style('opacity', 0)
				.transition(transition)
				.style('opacity', 1);
		}

		bindArcs(leftArcsArea, leftConnections);
		bindArcs(rightArcsArea, rightConnections);

		// save selection
		selectItem(selectedItemId);
	}

	// Interaction
	var selectedItemId = undefined;

	function hoverItem(d) {
		itemsArea.selectAll('.vis__graph__items__item')
			.classed('hovered', function(dd) { return dd.id == d.id; });
		leftPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('hovered', function(dd) { return dd.id == d.id; });
		rightPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('hovered', function(dd) { return dd.id == d.id; });
	}

	function outItem(d) {
		itemsArea.selectAll('.vis__graph__items__item.hovered')
			.classed('hovered', false);
		leftPointsArea.selectAll('.vis__graph__values__points__point.hovered')
			.classed('hovered', false);
		rightPointsArea.selectAll('.vis__graph__values__points__point.hovered')
			.classed('hovered', false);
	}

	function selectItem(itemId) {
		selectedItemId = itemId;
		itemsArea.selectAll('.vis__graph__items__item')
			.classed('blured', function(dd) {
				return selectedItemId !== undefined && dd.id != selectedItemId;
			});
		leftPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('blured', function(dd) {
				return selectedItemId !== undefined && dd.id != selectedItemId;
			});
		rightPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('blured', function(dd) {
				return selectedItemId !== undefined && dd.id != selectedItemId;
			});
		leftArcsArea.selectAll('.vis__graph__values__arcs__arc')
			.classed('blured', function(dd) {
				return selectedItemId !== undefined && dd.itemIds[0] != selectedItemId && dd.itemIds[1] != selectedItemId;
			});
		rightArcsArea.selectAll('.vis__graph__values__arcs__arc')
			.classed('blured', function(dd) {
				return selectedItemId !== undefined && dd.itemIds[0] != selectedItemId && dd.itemIds[1] != selectedItemId;
			});
	}

	function hoverArc(d) {
		var _this = d3.select(this);
		if (_this.classed('blured')) return;

		leftArcsArea.selectAll('.vis__graph__values__arcs__arc')
			.classed('hovered', function(dd) {
				return dd == d || (dd.itemIds[0] == d.itemIds[0] && dd.itemIds[1] == d.itemIds[1]) ||
					(dd.itemIds[0] == d.itemIds[1] && dd.itemIds[1] == d.itemIds[0]);
			});
		rightArcsArea.selectAll('.vis__graph__values__arcs__arc')
			.classed('hovered', function(dd) {
				return dd == d || (dd.itemIds[0] == d.itemIds[0] && dd.itemIds[1] == d.itemIds[1]) ||
					(dd.itemIds[0] == d.itemIds[1] && dd.itemIds[1] == d.itemIds[0]);
			});

		itemsArea.selectAll('.vis__graph__items__item')
			.classed('hovered', function(dd) { return dd.id == d.itemIds[0] || dd.id == d.itemIds[1]; });
		leftPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('hovered', function(dd) { return dd.id == d.itemIds[0] || dd.id == d.itemIds[1]; });
		rightPointsArea.selectAll('.vis__graph__values__points__point')
			.classed('hovered', function(dd) { return dd.id == d.itemIds[0] || dd.id == d.itemIds[1]; });
	}

	function outArc(d) {
		leftArcsArea.selectAll('.vis__graph__values__arcs__arc.hovered')
			.classed('hovered', false);
		rightArcsArea.selectAll('.vis__graph__values__arcs__arc.hovered')
			.classed('hovered', false);

		itemsArea.selectAll('.vis__graph__items__item.hovered')
			.classed('hovered', false);
		leftPointsArea.selectAll('.vis__graph__values__points__point.hovered')
			.classed('hovered', false);
		rightPointsArea.selectAll('.vis__graph__values__points__point.hovered')
			.classed('hovered', false);
	}


	svg.on("click", function() {
		console.log('reset selection');
		selectItem();
	});
}
