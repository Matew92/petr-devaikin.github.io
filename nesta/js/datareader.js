function Datareader(base) {
	if (base === undefined) base = '../data/';

	this.readData = function(dataSet, callback) {
		if (readers[dataSet] !== undefined)
			readers[dataSet](callback);
	}

	var readers = {};

	// big sector year welsh
	readers[Datareader.DATASETS.BigSectorYearWelsh] = function(callback) {
		d3.csv(
			base + Datareader.DATASETS.BigSectorYearWelsh,
			function(data) {
				var cities = {},
					sectors = [],
					years = [];

				var propsToIgnore = ['lad_name', 'year'];

				data.forEach(function(line, i) {
					if (i == 0)
						Object.keys(line).forEach(function(prop, j) {
							if (propsToIgnore.indexOf(prop) == -1) sectors.push(prop);
						});

					if (years.indexOf(line.year) == -1) years.push(line.year);

					if (cities[line.lad_name] === undefined) cities[line.lad_name] = {};

					sectors.forEach(function(sector) {
						if (cities[line.lad_name][sector] === undefined) cities[line.lad_name][sector] = {};
						cities[line.lad_name][sector][line.year] = parseInt(line[sector]);
					});
				});
				
				
				callback(cities, sectors, years);
			}
		);
	}

	// bubblechart
	readers[Datareader.DATASETS.Bubblechart] = function(callback) {
		d3.csv(
			base + Datareader.DATASETS.Bubblechart,
			function(data) {
				var disciplines = [];
				var topics = [];

				data.forEach(function(line) {
					if (disciplines.indexOf(line.discipline) == -1)
						disciplines.push(line.discipline);

					var item = {
						name: line.research_topic.split('_').join(' '),
						category: line.discipline,
						value: {
							nonWelsh: parseFloat(line.value_pounds_Non_Welsh),
							welsh: parseFloat(line.value_pounds_Welsh),
						},
						projects: {
							nonWelsh: parseFloat(line.number_of_projects_Non_Welsh),
							welsh: parseFloat(line.number_of_projects_Welsh),
							welshProportion: parseFloat(line.number_of_projects_Welsh_proportion),
						},
					};

					if (item.value.welsh > 0 && item.projects.welsh > 0)
						topics.push(item);
				});

				callback(disciplines, topics);
			}
		);
	}

	// Returns the dictionary with cities and their areas
	readers[Datareader.DATASETS.Lads] = function(callback) {
		d3.csv(
			base + Datareader.DATASETS.Lads,
			function(line, i) {
				return {
					name: line.LAD13NM_LGDName,
					area: line.Areas
				}
			},
			function(data) {
				var res = {};
				data.forEach(function(d) { res[d.name] = d.area; });
				callback(res);
			}
		);
	}

	// Return LADs shape
	readers[Datareader.DATASETS.LadsMap] = function(callback) {
		d3.json(
			base + Datareader.DATASETS.LadsMap,
			function(error, lads) {
				if (error) return console.error(error);

				callback(lads);
			}
		);
	}

	// Topic piopularity
	readers[Datareader.DATASETS.TopicPopularity] = function(callback) {
		var years = ['2013', '2014', '2015', '2016'];
		d3.queue()
			.defer(d3.csv, base + Datareader.DATASETS.TopicPopularity.format('2013'))
			.defer(d3.csv, base + Datareader.DATASETS.TopicPopularity.format('2014'))
			.defer(d3.csv, base + Datareader.DATASETS.TopicPopularity.format('2015'))
			.defer(d3.csv, base + Datareader.DATASETS.TopicPopularity.format('2016'))
			.await(function(error) {
				var args = arguments;
				var topics = [];
				var dataForYears = {};

				years.forEach(function(year, i) {
					var data = args[i + 1];
					dataForYears[year] = {};

					data.forEach(function(line, j) {
						var topic = line.Topics;
						if (topics.indexOf(topic) == -1) topics.push(topic);
						for (var prop in line)
							if (line.hasOwnProperty(prop) && prop != 'Topics' && prop != '') {
								if (dataForYears[year][prop] === undefined) dataForYears[year][prop] = {};
								dataForYears[year][prop][topic] = parseFloat(line[prop]);
							}
					})
				});
				callback(years, topics, dataForYears);
			})
	}

	// Groups topics
	readers[Datareader.DATASETS.GroupsTopic] = function(callback) {
		d3.csv(
			base + Datareader.DATASETS.GroupsTopic,
			function(line, i) {
				return {
					sourceId: line.id_x,
					sourceName: line.Source,
					targetId: line.id_y,
					targetName: line.Target
				}
			},
			function(data) {
				var nodes = {};
				var linkes = [];
				data.forEach(function(d) {
					if (nodes[d.sourceId] === undefined) nodes[d.sourceId] = d.sourceName;
					if (nodes[d.targetId] === undefined) nodes[d.targetId] = d.targetName;

					linkes.push({
						source: d.sourceId,
						target: d.targetId,
						value: 1
					});
				})

				callback(
					Object.keys(nodes).map(function(k) { return { id: k, name: nodes[k]}; }),
					linkes
				);
			}
		)
	}

	// Engineering Tech Lad
	readers[Datareader.DATASETS.EngineeringTechLad] = function(callback) {
		d3.csv(
			base + Datareader.DATASETS.EngineeringTechLad,
			function(data) {
				var lads = [];
				var topics = [];
				var res = [];

				data.forEach(function(line, i) {
					if (i == 0)
						Object.keys(line).forEach(function(prop, j) {
							if (prop != 'lad_name') topics.push(prop);
						});
					else
						lads.push(line['lad_name']);

					topics.forEach(function(topic, j) {
						if (line[topic] !== undefined && line[topic] != '' && line[topic] != '0')
							res.push({
								lad: line['lad_name'],
								topic: topic,
								value: parseFloat(line[topic])
							});
					});
				});

				callback(lads, topics, res);
			}
		);
	}
}

Datareader.DATASETS = {
	Lads: 'lads.csv',
	LadsMap: 'ladsmap.json',
	BigSectorYearWelsh: 'bc_big_sector_year_welsh.csv',
	Bubblechart: 'bubble_chart_source_data.csv',
	TopicPopularity: 'topic_popularity/topic_popularity_by_city_scaled_{0}.csv',
	GroupsTopic: 'wales_groups_topic_ids_2013_2014_2015_2016.csv',
	EngineeringTechLad: 'engineering_tech_lad.csv',
}
