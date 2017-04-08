function Bivariate(svg, ladsMap, ladsAreas, data, p) {
	var params = {
		legendSampleSize: 40,
		colors: ['#e8e8e8', '#e4acac', '#c85a5a', '#b0d5df', '#ad9ea5', '#985356', '#64acbe', '#627f8c', '#574249'],
		areasToZoom: ['Wales'],
		areasToVisualise: ['Wales'],
	}

	Object.keys(p).forEach(function(key) { params[key] = p[key]; });

	var subunits = topojson.feature(ladsMap, ladsMap.objects.lads);
	subunits.features.forEach(function(f) {
		f.name = f.properties.lad16nm;
		f.area = ladsAreas[f.name];
		f.isWelsh = f.area == 'Wales';
	});

	var maxX, maxY;

	function processData(data) {
		maxX = d3.max(data, function(d) { return d.x; });
		maxY = d3.max(data, function(d) { return d.y; });
		console.log(data);
		console.log(maxX, maxY);

		subunits.features.forEach(function(f) {
			f.values = data.find(function(d) { return d.lad == f.name; });
			if (params.areasToVisualise.indexOf(f.area) != -1 && f.values === undefined)
				console.log('Cannot find data for ' + f.name);
		});
	}

	var map;

	this.draw = function() {
		svg.html('').classed('vis--geovis', true);

		function isLadInAreaToZoom(name) {
			return params.areasToZoom.indexOf(ladsAreas[name]) != -1;
		}

		function isWelsh(name) {
			return ladsAreas[name] == 'Wales';
		}

		colorScale = d3.scaleOrdinal()
			.domain(d3.range(9))
			.range(params.colors);

		function draw() {
			map = svg.append('g').classed('vis__map', true);

			// calculate initial zoom
			var meshToZoom = topojson.mesh(
				ladsMap,
				ladsMap.objects.lads,
				function(a, b) {
					if (a === b && isLadInAreaToZoom(a.properties.lad16nm))
						return true;

					if (a !== b &&
						((isLadInAreaToZoom(a.properties.lad16nm) && !isLadInAreaToZoom(b.properties.lad16nm)) ||
						(!isLadInAreaToZoom(a.properties.lad16nm) && isLadInAreaToZoom(b.properties.lad16nm))))
							return true;

					return false;
				}
			);

			var projection = d3.geoAlbers()
				.rotate([4.4, 0])
				.parallels([50, 60])
				.fitSize([width - 250, height], meshToZoom);

		    var path = d3.geoPath(projection);

		    var newMapLads = map.selectAll(".vis__map__lad")
				.data(subunits.features)
				.enter().append("path")
			    	.classed('vis__map__lad', true)
					.classed('vis__map__lad--welsh', function(d) { return d.isWelsh; })
					.attr("d", path)
					.attr('fill', '#f8f8f8');

			redraw(data); // add colors

			newMapLads.filter(function(d) { return params.areasToVisualise.indexOf(d.area) != -1; })
				.on('mouseover', showHint)
				.on('mouseout', hideHint);

			// Welsh border

			map.append('path')
				.classed('vis__map__border', true)
				.datum(topojson.mesh(
					ladsMap,
					ladsMap.objects.lads,
					function(a, b) { return a !== b && (
						(!isWelsh(b.properties.lad16nm) && isWelsh(a.properties.lad16nm)) ||
						(isWelsh(b.properties.lad16nm) && !isWelsh(a.properties.lad16nm))); }
				))
				.attr('d', path);

			// behaviour

			function zoomed() {
				var transform = d3.event.transform;

				projection
					.translate([transform.x, transform.y])
					.scale(transform.k);

				map.selectAll(".vis__map__lad").attr("d", path);
				map.selectAll(".vis__map__border").attr("d", path);
			}


			var scale0 = projection.scale(),
				translate0 = projection.translate();

		    var zoom = d3.zoom()
				.scaleExtent([0.5 * scale0, 3 * scale0])
				.on("zoom", zoomed);

			var t = d3.zoomIdentity
				.translate(translate0[0], translate0[1])
				.scale(scale0);

			svg.call(zoom.transform, t);
			svg.call(zoom);
		}
		draw();


		function drawKey() {
			var legend = svg.append('g')
				.classed('vis__legend', true)
				.attr('transform', 'translate({0},{1})'.format(width - 450, 10));

			var legendSize = 3 * params.legendSampleSize;
			legend.append('rect')
				.classed('vis__legend__bg', true)
				.attr('width', 50 + legendSize)
				.attr('height', 50 + legendSize);

			legend.selectAll('vis__legend__sample').data(params.colors).enter().append('rect')
				.classed('vis__legend__sample', true)
				.attr('width', params.legendSampleSize)
				.attr('height', params.legendSampleSize)
				.attr('fill', function(d) { return d; })
				.attr('transform', function(d, i) {
					var row = 2 - Math.floor(i / 3);
					var col = i % 3;
					return 'translate({0},{1})'.format(40 + params.legendSampleSize * col, 20 + params.legendSampleSize * row);
				});

			legend.append('text').text('low')
				.attr('text-anchor', 'middle')
				.attr('transform', 'translate({0},{1})'.format(40 + 0.5 * params.legendSampleSize, 30 + 3 * params.legendSampleSize));
			legend.append('text').text('high')
				.attr('text-anchor', 'middle')
				.attr('transform', 'translate({0},{1})'.format(40 + 2.5 * params.legendSampleSize, 30 + 3 * params.legendSampleSize));
			legend.append('text').text('Business number')
				.attr('text-anchor', 'middle')
				.style('font-size', '14px')
				.attr('font-weight', 'bold')
				.attr('transform', 'translate({0},{1})'.format(40 + 1.5 * params.legendSampleSize, 45 + 3 * params.legendSampleSize));


			legend.append('text').text('low')
				.attr('text-anchor', 'middle')
				.attr('transform', 'translate({0},{1}) rotate({2})'.format(35, 20 + 2.5 * params.legendSampleSize, -90));
			legend.append('text').text('high')
				.attr('text-anchor', 'middle')
				.attr('transform', 'translate({0},{1}) rotate({2})'.format(35, 20 + 0.5 * params.legendSampleSize, -90));
			legend.append('text').text('Employment')
				.attr('text-anchor', 'middle')
				.style('font-size', '14px')
				.attr('font-weight', 'bold')
				.attr('transform', 'translate({0},{1}) rotate({2})'.format(20, 20 + 1.5 * params.legendSampleSize, -90));
		}
		drawKey();


		function addHint() {
			var hint = svg.append('g')
				.classed('vis__hint', true)
				.attr('visibility', 'hidden');

			hint.append('rect')
				.attr('x', -5)
				.attr('y', -5)
				.attr('width', 200)
				.attr('height', 200);

			hint.append('text')
				.classed('vis__hint__city', true)
			hint.append('text')
				.classed('vis__hint__business', true)
				.attr('dy', 18);
			hint.append('text')
				.classed('vis__hint__employment', true)
				.attr('dy', 32);
		}
		addHint();
	}

	// hints
	function showHint(d) {
		var hint = d3.select('.vis__hint');

		hint.select('rect').attr('x', 0).attr('y', 0).attr('width', 0).attr('height', 0);

		hint.select('.vis__hint__city').text(d.name);

		if (d.values !== undefined) {
			hint.select('.vis__hint__business').text('Business number LQ: ' + 
				(d.values.x !== undefined ? d.values.x.abbrNum(3) : 'no data'));
			hint.select('.vis__hint__employment').text('Employees number LQ: ' + 
				(d.values.y !== undefined ? d.values.y.abbrNum(3) : 'no data'));
		}
		else {
			hint.select('.vis__hint__business').text('Business number: no data');
			hint.select('.vis__hint__employment').text('Employees number: no data');
		}

		var hintBBox = hint.node().getBBox();
		hint.select('rect')
			.attr('x', -5)
			.attr('y', -5)
			.attr('width', hintBBox.width + 10)
			.attr('height', hintBBox.height + 10);

		var bbox = this.getBBox();

		svg.select('.vis__hint')
			.attr('transform', 'translate({0},{1})'.format(bbox.x + (bbox.width - hintBBox.width) / 2, bbox.y + bbox.height + 10))
			.attr('visibility', 'visible');
	}

	function hideHint() {
		svg.select('.vis__hint')
			.attr('visibility', 'hidden');
	}

	// redraw

	function redraw(newData) {
		processData(newData);

		map.selectAll(".vis__map__lad")
			.filter(function(d) { return params.areasToVisualise.indexOf(d.area) != -1 && d.values !== undefined; })
			.attr('fill', function(d) {
				var col = maxX !== undefined && maxX != 0 ? Math.floor(d.values.x / maxX * 3) : 0;
				if (col > 2) col = 2;
				var row = maxY !== undefined && maxY != 0 ? Math.floor(d.values.y / maxY * 3) : 0;
				if (row > 2) row = 2;
				return colorScale(col + 3 * row);
			})
	}

	this.redraw = redraw;
}
