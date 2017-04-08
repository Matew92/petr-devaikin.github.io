function Filter(container) {
	var FILTER_WIDTH = 200;

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

	this.addSelectSearchSection = function(title, values, placeholder, callback) {
		var group = initGroup(title);
		var select = group.append('select');
		var select2 = $(select.node()).select2({
			data: values,
			allowClear: placeholder != '' && placeholder !== undefined,
			placeholder: placeholder
		}).change(function(e, mute) {
			var value = $(select.node()).val();
			if (!mute)
				callback(value);
		});
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

	this.addColorScale = function(title, maxValue, minColor, maxColor, stepNumber, type) {
		var group = initGroup(title);

		var stepWidth = Math.floor(FILTER_WIDTH / stepNumber);
		var step = (maxValue + 1) / stepNumber;
		var steps = d3.range(stepNumber).map(function(d) {
			return {
				min: step * d,
				max: step * (d + 1)
			};
		});

		if (type == 'discrete') {
			var colorSteps = d3.range(stepNumber).map(function(d) {
				return d3.interpolateRgb(minColor, maxColor)(d / (stepNumber - 1));
			});

			var colorScale = d3.scaleQuantize()
				.domain([0, maxValue])
				.range(colorSteps);

			var samples = group.selectAll('.filter__group__color-sample').data(steps).enter()
				.append('div')
					.classed('filter__group__color-sample', true)
					.style('width', stepWidth + 'px')
					.style('border-top-color', function(d) { return colorScale(d.min); });

			if (step == 1)
				samples.append('div')
					.attr('class', 'filter__group__color-sample__tick filter__group__color-sample__tick--center')
					.text(function(d) { return d.min; });
			else {
				samples.append('span')
					.attr('class', 'filter__group__color-sample__tick')
					.text(function(d) { return d.min; });
			}
		}
	}
}