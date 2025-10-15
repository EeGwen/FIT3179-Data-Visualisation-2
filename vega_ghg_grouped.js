// ghg_grouped_bar.js

const GHG_CSV_URL = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/ghg_emissions_with_year.csv";
const GHG_SPEC_URL = "ghg_grouped_bar.vg.json"; // local JSON spec file (template)

const SOURCE_LABELS = {
  "total": "Total Emissions (excluding LULUCF)",
  "net": "Net Emissions (including LULUCF)",
  "energy": "Energy",
  "industrial_processes": "Industrial Processes",
  "agriculture": "Agriculture",
  "waste": "Waste"
};

// container ids expected to exist in the HTML:
// - ghg-year-checkboxes  (where year checkboxes will be added)
// - ghg-chart            (where Vega chart will be embedded)
// - ghg-source-legend    (for the mapping of short codes)

Promise.all([
  d3.csv(GHG_CSV_URL),
  fetch(GHG_SPEC_URL).then(r => r.json())
]).then(([raw, specTemplate]) => {
  // parse and clean CSV rows
  const parsed = raw
    // guard against duplicate header row inside CSV (your CSV repeats header once)
    .filter(r => !(r.date && r.date.toLowerCase() === "date" && r.source && r.source.toLowerCase() === "source"))
    .map(d => ({
      date: d.date,
      source: d.source ? d.source.trim() : d.source,
      emissions_num: d.emissions === "" || d.emissions == null ? null : +d.emissions,
      year: d.year ? String(d.year).trim() : d.year,
      source_full: SOURCE_LABELS[d.source ? d.source.trim() : ""] || d.source
    }))
    .filter(d => d.emissions_num !== null && !isNaN(d.emissions_num) && d.source && d.year);

  if (parsed.length === 0) {
    document.getElementById("ghg-chart").innerHTML = "<p style='color:red;'>No GHG data found.</p>";
    return;
  }

  // unique years (sorted)
  const years = Array.from(new Set(parsed.map(d => d.year))).sort();

  // populate year checkboxes (separate container so it doesn't conflict with the other chart)
  const yearContainer = document.getElementById("ghg-year-checkboxes");
  yearContainer.innerHTML = ""; // clear

  // "All" checkbox
  const allId = "ghg-year-all";
  const allWrapper = document.createElement("div");
  allWrapper.style.marginBottom = "6px";
  allWrapper.innerHTML = `<label><input type="checkbox" id="${allId}" checked> All</label>`;
  yearContainer.appendChild(allWrapper);

  years.forEach((y) => {
    const id = "ghg-year-" + y;
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "6px";
    wrapper.innerHTML = `<label><input type="checkbox" id="${id}" value="${y}" checked> ${y}</label>`;
    yearContainer.appendChild(wrapper);
  });

  // add source legend mapping under chart
  const legendDiv = document.getElementById("ghg-source-legend");
  legendDiv.innerHTML = "<strong>Source codes:</strong>";
  const ul = document.createElement("ul");
  ul.style.marginTop = "6px";
  ul.style.marginBottom = "12px";
  Object.entries(SOURCE_LABELS).forEach(([k,v])=>{
    const li = document.createElement("li");
    li.textContent = `${k} — ${v}`;
    ul.appendChild(li);
  });
  legendDiv.appendChild(ul);

  // event listeners
  yearContainer.addEventListener("change", () => {
    // if All clicked, toggle all year boxes
    const allBox = document.getElementById(allId);
    if (event && event.target && event.target.id === allId) {
      const checked = allBox.checked;
      yearContainer.querySelectorAll('input[type="checkbox"]').forEach(ch => { ch.checked = checked; });
    } else {
      // if any year unchecked, uncheck All; if all years checked, check All
      const yearBoxes = Array.from(yearContainer.querySelectorAll('input[type="checkbox"]')).filter(i => i.id !== allId);
      const allChecked = yearBoxes.every(b => b.checked);
      allBox.checked = allChecked;
    }
    render();
  });

  // initial render
  render();

  function render() {
    // selected years
    const selectedYears = Array.from(yearContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(i => i.value)
      .filter(Boolean); // remove the "All" (which has no value)

    if (selectedYears.length === 0) {
      document.getElementById("ghg-chart").innerHTML = "<p style='color:#666;'>Please select at least one year for the GHG grouped bar chart.</p>";
      return;
    }

    // filter rows for selected years
    const filtered = parsed.filter(d => selectedYears.includes(d.year));

    if (filtered.length === 0) {
      document.getElementById("ghg-chart").innerHTML = "<p style='color:#666;'>No GHG data for the selected year(s).</p>";
      return;
    }

    // prepare spec: deep copy and attach data.values
    const spec = JSON.parse(JSON.stringify(specTemplate));
    spec.data = { values: filtered };

    // embed the chart into #ghg-chart
    vegaEmbed("#ghg-chart", spec, { actions: true, renderer: "canvas" })
      .then(result => {
        // nothing to do now; could keep result.view for updates
      })
      .catch(err => {
        console.error("Error embedding GHG chart:", err);
        document.getElementById("ghg-chart").innerHTML = "<p style='color:red;'>Error rendering GHG chart. See console.</p>";
      });
  }

}).catch(err => {
  console.error("Error loading GHG CSV or spec:", err);
  document.getElementById("ghg-chart").innerHTML = "<p style='color:red;'>Failed to load GHG CSV or spec. See console.</p>";
});
