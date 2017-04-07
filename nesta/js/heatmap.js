function Heatmap(svg, xValues, yValues, data, p) {
	var params = {
		leftMargin: 100,
		topMargin: 10,
		cellWidth: 10,
		cellHeight: 10,
		minValue: 0,
		maxValue: 1,
		minColor: '#fef0d9',
		maxColor: '#990000',
		colorPalette5: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
		colorPalette7: ['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000'],
		logarythmicValueScale: false,
		rotateYAxisTips: true,
		showLegend: true,
		legendSteps: 7,
		legendSampleWidth: 20,
		legendRoundTo: 0,
		showLeftAxis: true,
		showRightAxis: false,
		showTopAxis: false,
		showBottomAxis: true,
		highlightedValues: [],
		sorting: false,
		animationDuration: 200,
		legendText: '',
		leftAxisLabel: undefined,
		topAxisLabel: undefined,
	}

	Object.keys(p).forEach(function(key) { params[key] = p[key]; });

	var colorScale;
	var _logScale;
	if (params.logarythmicValueScale) {
		_logScale = d3.scaleLog().domain([params.minValue, params.maxValue]).range([0, 1]);

		var colorThresholds = [];
		var colorValues = [params.minColor];
		for (var i = 0; i < params.legendSteps; i++) {
			colorThresholds.push(_logScale.invert(i / params.legendSteps));
			colorValues.push(d3.interpolateRgb(params.minColor, params.maxColor)(i / (params.legendSteps - 1)))
		}
		colorScale = d3.scaleThreshold().domain(colorThresholds).range(colorValues);
	}
	else {
		var colorSteps = [];
		for (var i = 0; i < params.legendSteps; i++)
			colorSteps.push(d3.interpolateRgb(params.minColor, params.maxColor)(i / (params.legendSteps - 1)));

		colorScale = d3.scaleQuantize()
			.domain([params.minValue, params.maxValue])
			.range(colorSteps);
	}

	var graphWidth = xValues.length * params.cellWidth,
		graphHeight = yValues.length * params.cellHeight;

	xValues.forEach(function(v, i) { xValues.originalOrder = i; });
	yValues.forEach(function(v, i) { yValues.originalOrder = i; });

	this.draw = function() {
		svg.attr('class', 'vis vis--heatmap');

		var leftAxis = svg.append('g')
			.attr('transform', 'translate({0},{1})'.format(params.leftMargin, params.topMargin))
			.classed('vis__axis vis__axis--left', true);

		var bottomAxis = svg.append('g')
			.attr('transform', 'translate({0},{1})'.format(params.leftMargin, params.topMargin + graphHeight))
			.classed('vis__axis vis__axis--bottom', true);

		var topAxis = svg.append('g')
			.attr('transform', 'translate({0},{1})'.format(params.leftMargin, params.topMargin))
			.classed('vis__axis vis__axis--top', true);

		var graphArea = svg.append('g')
			.attr('transform', 'translate({0},{1})'.format(params.leftMargin, params.topMargin))
			.classed('vis__graph', true);

		var hintsArea = svg.append('g')
			.attr('transform', 'translate({0},{1})'.format(params.leftMargin, params.topMargin))
			.classed('vis__hints', true);


		var xValuesMeta = {};
			// initialOrder: 0,
			// sum: 0,
			// highlighted: false,
		var yValuesMeta = {};

		var xScaleRange = [];
		for (var i = 0; i < xValues.length; i++) {
			xScaleRange.push(params.cellWidth / 2 + params.cellWidth * i);
			xValuesMeta[xValues[i]] = {
				sum: data.reduce(function(a, b) { return a + (b.x == xValues[i] ? b.value : 0); }, 0), // calculate the sum
				highlighted: params.highlightedValues.indexOf(xValues[i]) != -1,
				initialOrder: i
			}
		}

		xValues.sort(function(a, b) {
			if ((!xValuesMeta[a].highlighted && !xValuesMeta[b].highlighted) || (xValuesMeta[a].highlighted && xValuesMeta[b].highlighted))
				if (xValuesMeta[b].sum != xValuesMeta[a].sum)
					return xValuesMeta[b].sum - xValuesMeta[a].sum;
				else
					return xValuesMeta[a].initialOrder - xValuesMeta[b].initialOrder;
			else if (xValuesMeta[a].highlighted)
				return -1;
			else
				return 1;
		});

		var xScale = d3.scaleOrdinal()
			.domain(xValues)
			.range(xScaleRange);

		var yScaleRange = [];
		for (var i = 0; i < yValues.length; i++) {
			yScaleRange.push(params.cellHeight / 2 + params.cellHeight * i);
			yValuesMeta[yValues[i]] = {
				sum: data.reduce(function(a, b) { return a + (b.y == yValues[i] ? b.value : 0); }, 0), // calculate the sum
				highlighted: params.highlightedValues.indexOf(yValues[i]) != -1,
				initialOrder: i
			}
		}

		yValues.sort(function(a, b) {
			if ((!yValuesMeta[a].highlighted && !yValuesMeta[b].highlighted) || (yValuesMeta[a].highlighted && yValuesMeta[b].highlighted)) {
				if (yValuesMeta[b].sum != yValuesMeta[a].sum)
					return yValuesMeta[b].sum - yValuesMeta[a].sum;
				else
					return yValuesMeta[a].initialOrder - yValuesMeta[b].initialOrder;
			}
			else if (yValuesMeta[a].highlighted)
				return -1;
			else
				return 1;
		});

		var yScale = d3.scaleOrdinal()
			.domain(yValues)
			.range(yScaleRange);

		var hint,
			rowHighlight,
			columnHighlight;

		function sortColumn(value, axis, instantly) {
			var axisSelection = axis == 'y' ? leftAxis : topAxis;

			var ticks = axisSelection.selectAll('.vis__axis__tick')
				.classed('sorting', function(d) { return d == value; })
				.text(function(d) {
					if (d == value)
						if (axis == 'y')
							return d + ' ▶';
						else
							if (params.rotateYAxisTips)
								return '◀ ' + d;
							else
								return d + ' ▼';
					else
						return d;
				});

			var oppositeAxis = (axis == 'x') ? 'y': 'x';
			var cells = graphArea.selectAll('.vis__graph__cell').filter(function(d, i) {
				return d[axis] == value;
			});

			var currentValues = [];
			cells.each(function(d, i) {
				currentValues[d[oppositeAxis]] = d.value;
			});

			var meta = axis == 'x' ? yValuesMeta : xValuesMeta;

			// rewrite this. hard to understand
			function sortFunction(a, b) {
				if ((meta[a].highlighted && meta[b].highlighted) || (!meta[a].highlighted && !meta[b].highlighted)) {
					if (currentValues[a] !== undefined && currentValues[b] !== undefined) {
						if (currentValues[b] != currentValues[a]) // try to compare by value
							return currentValues[b] - currentValues[a];
						else
							if (meta[b].sum != meta[a].sum)
								return meta[b].sum - meta[a].sum;
							else
								return meta[a].initialOrder - meta[b].initialOrder;
					}
					else if (currentValues[a] !== undefined)
						return -1;
					else if (currentValues[b] !== undefined)
						return 1;
					else
						if (meta[b].sum != meta[a].sum)
							return meta[b].sum - meta[a].sum;
						else
							return meta[a].initialOrder - meta[b].initialOrder;
				}
				else if (meta[a].highlighted)
					return -1;
				else
					return 1;
			}

			if (axis == 'x') {
				yValues.sort(sortFunction);
				yScale.domain(yValues);
			}
			else {
				xValues.sort(sortFunction);
				xScale.domain(xValues);
			}

			graphArea.selectAll('.vis__graph__cell')
				.transition()
				.duration(instantly ? 0 : params.animationDuration)
					.attr('transform', function(d) {
						return 'translate({0},{1})'.format(xScale(d.x) - params.cellWidth / 2, yScale(d.y) - params.cellHeight / 2);
					});

			leftAxis.selectAll('.vis__axis__tick')
				.transition()
				.duration(instantly ? 0 : params.animationDuration)
					.attr('transform', function(d, i) { return 'translate({0},{1})'.format(-5, yScale(d)); });

			// FIX THIS!
			topAxis.selectAll('.vis__axis__tick')
				.transition()
				.duration(instantly ? 0 : params.animationDuration)
					.attr('transform', function(d, i) {
						return 'translate({0},{1}) rotate({2})'.format(xScale(d), -5, params.rotateYAxisTips ? -90 : 0);
					});
		}

		function drawAxes() {
			function addTicks(axis, data) {
				var ticks = axis.selectAll('vis__axis__tick').data(data).enter().append('text')
					.classed('vis__axis__tick', true)
					.attr('text-anchor', 'end')
					.attr('alignment-baseline', 'middle')
					.classed('highlighted', function(d, i) { return params.highlightedValues.indexOf(d) != -1; })
					.text(function(d) { return d; });

				return ticks;
			}

			var leftTicks = addTicks(leftAxis, yValues);
			leftTicks
				.attr('transform', function(d, i) { return 'translate({0},{1})'.format(-5, yScale(d)); });

			if (params.sorting)
				leftTicks
					.style('cursor', 'pointer')
					.on('click', function(d, i) { sortColumn(d, 'y'); });


			function addHorizontalTips(axis) {
				var ticks = addTicks(axis, xValues)
					.attr('transform', function(d, i) {
						return 'translate({0},{1}) rotate({2})'.format(xScale(d), -5, params.rotateYAxisTips ? -90 : 0);
					});
				if (params.sorting)
					ticks
						.style('cursor', 'pointer')
						.on('click', function(d, i) { sortColumn(d, 'x'); });
				return ticks;
			}

			// FIX THIS!
			if (params.showBottomAxis) {
				var bottomTips = addHorizontalTips(bottomAxis);

				if (!params.rotateYAxisTips)
					bottomTips
						.attr('text-anchor', 'middle')
						.attr('alignment-baseline', 'before-edge')
						.attr('transform', function(d, i) { return 'translate({0},{1})'.format(xScale(d), 5); });
			}

			if (params.showTopAxis) {
				var topTips = addHorizontalTips(topAxis);

				topTips
					.attr('text-anchor', params.rotateYAxisTips ? 'start' : 'middle')
					.attr('alignment-baseline', params.rotateYAxisTips ? 'middle' : 'after-edge');
			}

			if (params.leftAxisLabel !== undefined)
				leftAxis.append('text')
					.classed('vis__axis__label', true)
					.text(params.leftAxisLabel)
					.attr('text-anchor', 'end')
					.attr('alignment-baseline', 'middle')
					.attr('transform', 'translate({0},{1})'.format(-40, -20));

			if (params.topAxisLabel !== undefined)
				topAxis.append('text')
					.classed('vis__axis__label', true)
					.text(params.topAxisLabel)
					.attr('text-anchor', 'start')
					.attr('alignment-baseline', 'middle')
					.attr('transform', 'translate({0},{1}) rotate({2})'.format(-20, -40, params.rotateYAxisTips ? - 90 : 0));

			if (params.topAxisLabel !== undefined || params.leftAxisLabel !== undefined)
				topAxis.append('line')
					.classed('vis__axis__divider', true)
					.attr('x1', -15).attr('y1', -15)
					.attr('x2', -40).attr('y2', -40);
		}
		drawAxes();

		// draw bg for highlighted rows and columns
		function drawHighlighted() {
			if (params.highlightedValues.length > 0) {
				var cols = xValues.filter(function(v) { return params.highlightedValues.indexOf(v) != -1; }).length;
				var rows = yValues.filter(function(v) { return params.highlightedValues.indexOf(v) != -1; }).length;

				graphArea.append('rect')
					.classed('vis__graph__high-bg', true)
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', cols * params.cellWidth)
					.attr('height', graphHeight);

				graphArea.append('rect')
					.classed('vis__graph__high-bg', true)
					.attr('x', 0)
					.attr('y', 0)
					.attr('height', rows * params.cellHeight)
					.attr('width', graphWidth);
			}
		}
		drawHighlighted();
		

		var hintWindow;
		function drawHint() {
			hint = hintsArea.append('g')
				.classed('vis__hints__hint', true)
				.attr('visibility', 'visible');
			hint.append('rect');
			hint.append('text')
				.attr('dy', 5)
				.attr('alignment-baseline', 'before-edge');

			hintWindow = hintsArea.append('path')
				.classed('vis__hints__window', true)
				.attr('visibility', 'hidden');
		}

		function showHint(d) {
			hint
				.attr('transform', 'translate({0},{1})'.format(xScale(d.x), yScale(d.y) + params.cellHeight / 2))
				.attr('visibility', 'visible');
			var text = hint.select('text').text(d.value);

			var bbox = text.node().getBBox();
			hint.select('rect')
				.attr('x', bbox.x - 4)
				.attr('y', bbox.y - 2)
				.attr('width', bbox.width + 8)
				.attr('height', bbox.height + 4);

			var leftTick = leftAxis.selectAll('.vis__axis__tick').filter(function(dd, i) { return dd == d.y; });
			var topTick = topAxis.selectAll('.vis__axis__tick').filter(function(dd, i) { return dd == d.x; });
			var bottomTick = topAxis.selectAll('.vis__axis__bottom').filter(function(dd, i) { return dd == d.x; });

			leftTick.classed('selected', true);
			topTick.classed('selected', true);
			bottomAxis.selectAll('.vis__axis__tick').filter(function(dd, i) { return dd == d.x; }).classed('selected', true);

			//var leftTickWidth = leftTick.node().getBBox().width;
			//var topTickHeight = topTick.node().getBBox().height;


			hintWindow.attr('d', 'M{0} {1} L{2} {3} L{4} {5} L{6} {7} L{8} {9} L{10} {11} Z'.format(
					-3, yScale(d.y) + params.cellHeight / 2,
					-3, yScale(d.y) - params.cellHeight / 2,
					xScale(d.x) - params.cellWidth / 2, yScale(d.y) - params.cellHeight / 2,
					xScale(d.x) - params.cellWidth / 2, -3,
					xScale(d.x) + params.cellWidth / 2, -3,
					xScale(d.x) + params.cellWidth / 2, yScale(d.y) + params.cellHeight / 2
					/*-leftTickWidth - 10, yScale(d.y) + params.cellHeight / 2,
					-leftTickWidth - 10, yScale(d.y) - params.cellHeight / 2,
					xScale(d.x) - params.cellWidth / 2, yScale(d.y) - params.cellHeight / 2,
					xScale(d.x) - params.cellWidth / 2, -topTickHeight - 10,
					xScale(d.x) + params.cellWidth / 2, -topTickHeight - 10,
					xScale(d.x) + params.cellWidth / 2, yScale(d.y) + params.cellHeight / 2*/
				))
				.attr('visibility', 'visible');
		}

		function hideHint() {
			hint.attr('visibility', 'hidden');
			
			leftAxis.select('.vis__axis__tick.selected').classed('selected', false);
			topAxis.select('.vis__axis__tick.selected').classed('selected', false);
			bottomAxis.select('.vis__axis__tick.selected').classed('selected', false);

			hintWindow.attr('visibility', 'hidden');
		}

		function drawData() {
			//background

			var bg = graphArea.append('g').classed('vis__graph__bg', true);
			bg.append('rect')
				.attr('width', graphWidth)
				.attr('height', graphHeight)
				.attr('fill', params.minColor);
			var xLines = d3.range(xValues.length - 1);
			var yLines = d3.range(yValues.length - 1);
			bg.selectAll('.vis__graph__bg__line--hor').data(yLines).enter()
				.append('line')
					.attr('x1', 0)
					.attr('y1', function(d) { return (d + 1) * params.cellHeight - 0.5; })
					.attr('x2', graphWidth)
					.attr('y2', function(d) { return (d + 1) * params.cellHeight - 0.5; })
					.attr('stroke', '#fff');
			bg.selectAll('.vis__graph__bg__line--vert').data(xLines).enter()
				.append('line')
					.attr('x1', function(d) { return (d + 1) * params.cellWidth - 0.5; })
					.attr('y1', 0)
					.attr('x2', function(d) { return (d + 1) * params.cellWidth - 0.5; })
					.attr('y2', graphHeight)
					.attr('stroke', '#fff');

			// cells

			var cells = graphArea.selectAll('.vis__graph__cell').data(data)
				.enter().append('g')
					.classed('vis__graph__cell', true)
					.attr('transform', function(d) {
						return 'translate({0},{1})'.format(xScale(d.x) - params.cellWidth / 2, yScale(d.y) - params.cellHeight / 2);
					});

			/*
			cells.append('rect')
				.classed('vis__graph__cell__bg', true)
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', params.cellWidth)
				.attr('height', params.cellHeight);
			*/

			cells.append('rect')
				.classed('vis__graph__cell__value', true)
				.attr('x', 0.5)
				.attr('y', 0.5)
				.attr('width', params.cellWidth - 1)
				.attr('height', params.cellHeight - 1)
				.attr('fill', function(d) { return colorScale(d.value); });

			cells.filter(function(d) { return d.value > 0; })
				.on('mouseover', showHint)
				.on('mouseout', hideHint);

		}
		drawData();
		drawHint();

		function drawLegend() {
			var legend = svg.append('g')
				.classed('vis__legend', true)
				.attr('transform', 'translate({0},{1})'.format(graphWidth + params.leftMargin + 50, params.topMargin));

			var legendWidth = params.legendSteps * params.legendSampleWidth;
			legend.append('rect')
				.classed('vis__legend__bg', true)
				.attr('width', 20 + legendWidth)
				.attr('height', params.legendSampleWidth + 50);

			legend.append('text') // <-- FIX
				.attr('transform', 'translate({0},{1})'.format(10, 20))
				.text(params.legendText);

			var steps = [];

			for (var i = 0; i < params.legendSteps; i++)
				if (!params.logarythmicValueScale)
					steps.push(params.minValue + (params.maxValue - params.minValue + 1) / params.legendSteps * (i + 0.5));
				else
					steps.push(_logScale.invert(i / params.legendSteps));

			legend.selectAll('vis__legend__sample').data(steps).enter().append('rect')
				.classed('vis__legend__sample', true)
				.attr('fill', function(d) { return colorScale(d); })
				.attr('width', params.legendSampleWidth)
				.attr('height', params.legendSampleWidth)
				.attr('transform', function(d, i) {
					return 'translate({0},{1})'.format(10 + i * params.legendSampleWidth, 30);
				});

			var multiplicator = Math.pow(10, params.legendRoundTo);

			var ticks = [];
			for (var i = 0; i < params.legendSteps; i++) {
				ticks.push(params.minValue + (params.maxValue - params.minValue + 1) / params.legendSteps * i);
			}

			legend.selectAll('vis__legend__tips').data(ticks).enter().append('text')
				.classed('vis__legend__tips', true)
				.attr('transform', function(d, i) {
					return 'translate({0},{1})'.format(i * params.legendSampleWidth + 10, 30 + params.legendSampleWidth);
				})
				.attr('text-anchor', 'start')
				.attr('alignment-baseline', 'before-edge')
				.text(function(d) { return d.abbrNum(); });

			legend.append('text')
				.classed('vis__legend__tips', true)
				.attr('transform', 'translate({0},{1})'.format(params.legendSteps * params.legendSampleWidth + 10, 30 + params.legendSampleWidth))
				.attr('text-anchor', 'end')
				.attr('alignment-baseline', 'before-edge')
				.text(params.maxValue.abbrNum());
		}
		if (params.showLegend)
			drawLegend();


		// initial sort
		sortColumn(xScale.domain()[0], 'x', true);
		sortColumn(yScale.domain()[0], 'y', true);
	}
}

