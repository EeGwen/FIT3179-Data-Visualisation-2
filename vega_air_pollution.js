// vega_air_pollution.js
const CSV_URL = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/air_pollution_with_month_year.csv";
const MONTH_ORDER = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Vega-Lite spec template; JS will set data.values = filteredData
const baseSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Monthly concentration (Jan-Dec) for selected pollutant across selected years. Color = year.",
  "width": 800,
  "height": 420,
  "data": { "values": [] },
  "mark": { "type": "line", "point": true, "clip": true },
  "encoding": {
    "x": { "field": "month", "type": "ordinal", "axis": { "title": "Month" }, "scale": { "domain": MONTH_ORDER } },
    "y": { "field": "concentration_num", "type": "quantitative", "axis": { "title": "Concentration" } },
    "color": { "field": "year", "type": "nominal", "legend": { "title": "Year" } },
    "detail": [ { "field": "year" }, { "field": "pollutant" } ],
    "tooltip": [
      { "field": "pollutant", "type": "nominal", "title": "Pollutant" },
      { "field": "year", "type": "nominal", "title": "Year" },
      { "field": "month", "type": "ordinal", "title": "Month" },
      { "field": "concentration_num", "type": "quantitative", "title": "Concentration" }
    ]
  }
};

// load CSV and initialize UI + chart
d3.csv(CSV_URL).then(function(rawData) {
  const data = rawData.map(d => ({
    date: d.date,
    pollutant: d.pollutant ? d.pollutant.trim() : d.pollutant,
    concentration_num: d.concentration === "" || d.concentration == null ? null : +d.concentration,
    month: d.month ? d.month.trim() : d.month,
    year: d.year ? String(d.year).trim() : d.year
  }));

  // remove rows with missing concentration
  const cleaned = data.filter(d => d.concentration_num !== null && !isNaN(d.concentration_num));

  // unique lists
  const pollutants = Array.from(new Set(cleaned.map(d => d.pollutant))).filter(Boolean).sort();
  const years = Array.from(new Set(cleaned.map(d => d.year))).filter(Boolean).sort();

  // build pollutant radio buttons (single select)
  const pollContainer = document.getElementById("pollutant-radios");
  pollutants.forEach((p, idx) => {
    const id = "radio-" + p.replace(/\s+/g, "_");
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "6px";
    // radio input name is same to enforce single selection
    wrapper.innerHTML = `<label><input type="radio" name="pollutant" id="${id}" value="${p}" ${idx === 0 ? 'checked' : ''}> ${p}</label>`;
    pollContainer.appendChild(wrapper);
  });

  // build year checkboxes (multi select)
  const yearContainer = document.getElementById("year-checkboxes");
  years.forEach((y) => {
    const id = "year-" + y;
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "6px";
    wrapper.innerHTML = `<label><input type="checkbox" id="${id}" value="${y}" checked> ${y}</label>`;
    yearContainer.appendChild(wrapper);
  });

  // reset button behavior: select first pollutant and all years
  document.getElementById("reset-btn").addEventListener("click", function() {
    // check first pollutant radio
    const firstRadio = document.querySelector('input[name="pollutant"]');
    if (firstRadio) firstRadio.checked = true;
    // check all years
    yearContainer.querySelectorAll('input[type="checkbox"]').forEach(ch => ch.checked = true);
    render();
  });

  // attach event listeners
  pollContainer.addEventListener("change", render);
  yearContainer.addEventListener("change", render);

  // initial render
  render();

  function render() {
    // selected pollutant (single)
    const selectedPollRadio = document.querySelector('input[name="pollutant"]:checked');
    const selectedPollutant = selectedPollRadio ? selectedPollRadio.value : null;

    // selected years (array)
    const selectedYears = Array.from(yearContainer.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);

    // validations
    if (!selectedPollutant) {
      document.getElementById("chart").innerHTML = "<p style='color:#666;'>Please select a pollutant (choose one).</p>";
      return;
    }
    if (selectedYears.length === 0) {
      document.getElementById("chart").innerHTML = "<p style='color:#666;'>Please select at least one year.</p>";
      return;
    }

    // filter data for selected pollutant and years
    const filtered = cleaned.filter(d => d.pollutant === selectedPollutant && selectedYears.includes(d.year));

    if (filtered.length === 0) {
      document.getElementById("chart").innerHTML = "<p style='color:#666;'>No data for the selected pollutant/year combination.</p>";
      return;
    }

    // prepare spec with filtered data: color = year
    const spec = JSON.parse(JSON.stringify(baseSpec));
    spec.data = { values: filtered };

    // embed
    vegaEmbed("#chart", spec, { actions: true, renderer: "canvas" })
      .then(result => {
        // optional: keep result.view if you want to update without re-embedding
      })
      .catch(err => {
        console.error("vegaEmbed error:", err);
        document.getElementById("chart").innerHTML = "<p style='color:red;'>Error rendering chart — see console.</p>";
      });
  }

}).catch(err => {
  console.error("Error loading CSV:", err);
  document.getElementById("chart").innerHTML = "<p style='color:red;'>Failed to load CSV. See console.</p>";
});
