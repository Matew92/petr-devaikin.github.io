function Filter(container) {
	var FILTER_WIDTH = 200;
	var SAMPLE_WIDTH = 30;

	container.classed('filter', true);

	function initGroup(title) {
		var group = container.append('div').classed('filter__group', true);
		group.append('h1').text(title);
		return group;
	}

	this.addRadioSection = function(title, values, callback) {
		var group = initGroup(title);

		var labels = group.selectAll('.filter__group__option').data(values).enter()
			.append('label')
				.classed('filter__group__option', true);
		labels.append('input')
			.attr('type', 'radio')
			.attr('name', title)
			.attr('value', function(d) { return d.value; })
			.attr('checked', function(d) { return d.checked ? 'checked' : null; });
		labels.append('span')
			.text(function(d) { return d.label; });
		labels
			.on('click', function(d) {
				callback(d.value);
			});
	}

	this.addSelectSearchSection = function(title, values, placeholder, callback, selectedValue) {
		var group = initGroup(title);
		var select = group.append('select');
		var select2 = $(select.node()).select2({
			data: values,
			allowClear: placeholder != '' && placeholder !== undefined,
			placeholder: placeholder
		}).change(function(e, mute) { // mute callback if event triggered from "outside"
			var value = $(select.node()).val();
			if (!mute)
				callback(value);
		});

		if (selectedValue !== undefined)
			select2.val(selectedValue).trigger('change', true);

		return {
			update: function(newValues) {
				select2.select2('destroy').empty().select2({
					data: newValues,
					allowClear: placeholder != '' && placeholder !== undefined,
					placeholder: placeholder
				});
			},
			setValue: function(value) {
				$(select.node()).val(value).trigger('change', true);
			}
		}
	}

	this.addSelectSearchSampleSection = function(title, values, placeholder, callback, selectedValue) {
		function formatState (state) {
			if (!state.color) { return state.text; }
			var $state = $(
				'<span style="padding-left: 3px; border-left: 15px solid white; border-left-color: ' + state.color + '"> ' + state.text + '</span>'
			);
			return $state;
		};

		var group = initGroup(title);
		var select = group.append('select');
		var select2 = $(select.node()).select2({
			data: values,
			allowClear: placeholder != '' && placeholder !== undefined,
			placeholder: placeholder,
			templateResult: formatState,
			templateSelection: formatState
		}).change(function(e, mute) { // mute callback if event triggered from "outside"
			var value = $(select.node()).val();
			if (!mute)
				callback(value);
		});

		if (selectedValue !== undefined)
			select2.val(selectedValue).trigger('change', true);

		return {
			update: function(newValues) {
				select2.select2('destroy').empty().select2({
					data: newValues,
					allowClear: placeholder != '' && placeholder !== undefined,
					placeholder: placeholder
				});
			},
			setValue: function(value) {
				$(select.node()).val(value).trigger('change', true);
			}
		}
	}

	this.addBubbleKey = function(title, maxValue, maxRadius, stepNumber) {
		var group = initGroup(title);

		var steps = d3.range(stepNumber + 1).map(function(i) { return maxValue / stepNumber * i; });
		var samples = group.selectAll('.filter__group__bubble-sample').data(steps.slice(1)).enter()
			.append('div')
				.classed('filter__group__bubble-sample', true)
				.style('width', Math.floor(FILTER_WIDTH / stepNumber) + 'px');

		var scale = d3.scaleSqrt().domain([0, maxValue]).range([0, maxRadius]);

		samples.append('span').text(function(d) { return d.abbrNum(1); });
		samples.append('div')
			.classed('filter__group__bubble-sample__bubble', true)
			.style('width', function(d) { return Math.round(2 * scale(d)) + 'px'; })
			.style('height', function(d) { return Math.round(2 * scale(d)) + 'px'; });
	}

	this.addDiscreteColorScale = function(title, minValue, maxValue, stepNumber) {
		var group = initGroup(title);

		var palette = ColorPalette.discrete(minValue, maxValue, stepNumber);
		var stepWidth = Math.floor(FILTER_WIDTH / palette.steps.length);

		var samples = group.selectAll('.filter__group__color-sample').data(palette.steps).enter()
			.append('div')
				.classed('filter__group__color-sample', true)
				.style('width', stepWidth + 'px')
				.style('border-top-color', function(d) { return palette.scale((d.min + d.max) / 2); });

		samples.append('div')
			.attr('class', 'filter__group__color-sample__tick filter__group__color-sample__tick--center')
			.text(function(d) {
				if (d.min == d.max)
					return d.min;
				else
					return '{0} – {1}'.format(d.min, d.max);
			});

		return {
			update: function(minValue, maxValue) {
				var newPalette = ColorPalette.discrete(minValue, maxValue, stepNumber);
				group.selectAll('.filter__group__color-sample').data(newPalette.steps)
					.select('.filter__group__color-sample__tick')
						.text(function(d) {
							if (d.min == d.max)
								return d.min;
							else
								return '{0} – {1}'.format(d.min, d.max);
						});
			}
		}
	}

	this.addDiscreteDoubleColorScale = function(title, maxValue, stepNumber) {
		var group = initGroup(title);

		var palette = ColorPalette.discreteDouble(maxValue, stepNumber);
		var stepWidth = Math.floor(FILTER_WIDTH / palette.steps.length);

		var samples = group.selectAll('.filter__group__color-sample').data(palette.steps).enter()
			.append('div')
				.classed('filter__group__color-sample', true)
				.style('width', stepWidth + 'px')
				.style('border-top-color', function(d) { return palette.scale((d.min + d.max) / 2); });

		samples.append('div')
			.attr('class', 'filter__group__color-sample__tick filter__group__color-sample__tick--center')
			.text(function(d) {
				if (d.min == d.max)
					return d.min;
				else
					return '{0} – {1}'.format(d.min, d.max);
			});

		return {
			update: function(maxValue) {
				var newPalette = ColorPalette.discreteDouble(maxValue, stepNumber);
				group.selectAll('.filter__group__color-sample').data(newPalette.steps)
					.select('.filter__group__color-sample__tick')
						.text(function(d) {
							if (d.min == d.max)
								return d.min;
							else
								return '{0} – {1}'.format(d.min, d.max);
						});
			}
		}
	}

	this.addKeyTable = function(title, samples) {
		var group = initGroup(title);

		var table = group.append('table').classed('filter__group__samples', true);
		samples.forEach(function(s) {
			var tr = table.append('tr');
			var sample = tr.append('td').classed('filter__group__samples__sample', true);
			var desc = tr.append('td').classed('filter__group__samples__desc', true);

			if (s.type == 'arrow') {
				var cy = 2;
				var svg = sample.append('svg').attr('width', SAMPLE_WIDTH).attr('height', 5);
				svg.append('line')
					.attr('x1', 1).attr('y1', cy)
					.attr('x2', SAMPLE_WIDTH - 1).attr('y2', cy)
					.attr('stroke-width', 1).attr('stroke', s.color);
				svg.append('ellipse')
					.attr('cx', 2).attr('cy', cy)
					.attr('rx', 1).attr('ry', 2)
					.attr('stroke', 'none').attr('fill', s.color);
				svg.append('path')
					.attr('d', 'M {0} {1} l 5 2 l -5 2'.format(SAMPLE_WIDTH - 6, cy - 2))
					.attr('stroke', s.color).attr('fill', s.color);

				desc.text(s.desc);
			}
			if (s.type == 'line') {
				var cy = 2;
				var svg = sample.append('svg').attr('width', SAMPLE_WIDTH).attr('height', 5);
				svg.append('line')
					.attr('x1', 1).attr('y1', cy)
					.attr('x2', SAMPLE_WIDTH - 1).attr('y2', cy)
					.attr('stroke-width', 1).attr('stroke', s.color);

				desc.text(s.desc);
			}
			else if (s.type == 'circle') {
				var cy = s.r + 1;
				var cx = SAMPLE_WIDTH / 2;
				var svg = sample.append('svg').attr('width', SAMPLE_WIDTH).attr('height', 2 * cy);
				svg.append('circle')
					.attr('cx', cx).attr('cy', cy)
					.attr('r', s.r)
					.attr('fill', s.fill).attr('stroke', s.stroke);

				desc.text(s.desc);
			}
			else if (s.type == 'desc') {
				sample.remove();
				desc.attr('colspan', 2);
				desc.classed('filter__group__samples__desc--hint', true);
				desc.text(s.text);
			}
		});
	}
}