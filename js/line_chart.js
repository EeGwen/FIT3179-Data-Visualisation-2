// js/multiline_chart.js
document.addEventListener('DOMContentLoaded', function () {
  const CSV_URL = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/data/air_pollution_with_month_year.csv";
  const VG_JSON_PATH = "js/line_chart.vg.json";
  const container = "#chart";
  const pollutantContainerId = "pollutant-radios";
  const yearContainerId = "year-checkboxes";
  const resetBtnId = "reset-btn";

  // Safe palette that avoids pure red/green combination
  const SAFE_PALETTE = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#17becf"  // cyan
  ];

  // Utility: parse numbers, keep months as strings
  function toNum(v){
    if(v === null || v === undefined) return null;
    if(typeof v === "number") return isFinite(v) ? v : null;
    const s = String(v).trim();
    if(s === "") return null;
    const n = +s.replace(/,/g, "");
    return isNaN(n) ? null : n;
  }

  // Load CSV
  d3.csv(CSV_URL).then(raw => {
    if(!raw || raw.length === 0){
      document.querySelector(container).innerHTML = "<p style='color:#666;'>No data available.</p>";
      return;
    }

    // Normalize columns (lowercase keys will be used)
    const cleaned = raw.map(r => ({
      date: r.date || "",
      pollutant: r.pollutant || "",
      concentration: toNum(r.concentration),
      month: r.month || "",
      year: r.year ? String(r.year) : ""
    })).filter(d => d.month && d.pollutant && d.year && d.concentration != null);

    const pollutants = Array.from(new Set(cleaned.map(d => d.pollutant))).sort();
    const years = Array.from(new Set(cleaned.map(d => d.year))).sort((a,b) => (+a) - (+b));

    // Build controls (pollutant radios and year checkboxes)
    function buildPollutantRadios() {
      const container = document.getElementById(pollutantContainerId);
      container.innerHTML = "";
      pollutants.forEach((p, i) => {
        const id = "pollutant-" + i;
        const label = document.createElement("label");
        label.className = "radio-label";
        label.innerHTML = `<input type="radio" name="pollutant" id="${id}" value="${p}" ${i===0 ? "checked" : ""}> ${p}`;
        container.appendChild(label);
      });
    }

    function buildYearCheckboxes() {
      const container = document.getElementById(yearContainerId);
      container.innerHTML = "";
      // "All" toggle
      const allDiv = document.createElement("div");
      allDiv.innerHTML = `<label><input type="checkbox" id="year-all" checked> All</label>`;
      container.appendChild(allDiv);
      years.forEach((y, i) => {
        const id = "year-" + y;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `<label><input type="checkbox" id="${id}" value="${y}" checked> ${y}</label>`;
        container.appendChild(wrapper);
      });

      // wire up all toggle
      const allBox = document.getElementById("year-all");
      allBox.addEventListener("change", () => {
        const checked = allBox.checked;
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = checked; });
        render();
      });
      // update all toggle if individual changes
      container.addEventListener("change", () => {
        const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(i => i.id !== "year-all");
        const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
        allBox.checked = allChecked;
        render();
      });
    }

    // populate controls
    buildPollutantRadios();
    buildYearCheckboxes();

    // reset button
    const resetBtn = document.getElementById(resetBtnId);
    if(resetBtn){
      resetBtn.addEventListener("click", () => {
        // reset pollutant to first, years all checked
        const firstPoll = document.querySelector(`#${pollutantContainerId} input[name="pollutant"]`);
        if(firstPoll) firstPoll.checked = true;
        const yc = document.getElementById(yearContainerId);
        if(yc) {
          yc.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        }
        render();
      });
    }

    // Handle pollutant change
    document.getElementById(pollutantContainerId).addEventListener("change", render);

    // Render function
    let specTemplate = null;
    fetch(VG_JSON_PATH)
      .then(resp => {
        if(!resp.ok) throw new Error("Failed to load Vega spec");
        return resp.json();
      })
      .then(json => {
        specTemplate = json;
        render();
      })
      .catch(err => {
        console.error("Could not load Vega spec:", err);
        document.querySelector(container).innerHTML = "<p style='color:#b00;'>Failed to load chart specification.</p>";
      });

    function getSelectedPollutant() {
      return (document.querySelector(`#${pollutantContainerId} input[name="pollutant"]:checked`) || {}).value || pollutants[0];
    }

    function getSelectedYears() {
      const container = document.getElementById(yearContainerId);
      if(!container) return years.slice();
      const yearBoxes = Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(i => i.id !== "year-all");
      const selected = yearBoxes.filter(b => b.checked).map(b => b.value).filter(Boolean);
      return selected;
    }

    function render() {
      if(!specTemplate) {
        // spec not loaded yet
        document.querySelector(container).innerHTML = "<p style='color:#666;'>Loading chart...</p>";
        return;
      }

      const pollutant = getSelectedPollutant();
      const selectedYears = getSelectedYears();
      if(!selectedYears || selectedYears.length === 0) {
        document.querySelector(container).innerHTML = "<p style='color:#666;'>Please select one or more years.</p>";
        return;
      }

      // filter data
      const filtered = cleaned.filter(d => d.pollutant === pollutant && selectedYears.includes(d.year));
      if(filtered.length === 0) {
        document.querySelector(container).innerHTML = "<p style='color:#666;'>No data for the selected pollutant/year combination.</p>";
        return;
      }

      // create color mapping for years: domain = selectedYears, range = SAFE_PALETTE repeated if needed
      const n = selectedYears.length;
      const palette = [];
      for(let i=0;i<n;i++){
        palette.push(SAFE_PALETTE[i % SAFE_PALETTE.length]);
      }

      // prepare spec (deep copy)
      const spec = JSON.parse(JSON.stringify(specTemplate));
      // set data values
      spec.data = { values: filtered };
      // ensure x month sort
      spec.encoding.x.sort = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      // inject color domain/range
      spec.encoding.color.scale = spec.encoding.color.scale || {};
      spec.encoding.color.scale.domain = selectedYears;
      spec.encoding.color.scale.range = palette;

      // ensure line groups by year (detail already set in spec); Vega-Lite will draw separate lines per year
      // embed
      vegaEmbed(container, spec, {actions: true, renderer: "canvas"}).catch(err => {
        console.error("vegaEmbed failed:", err);
        document.querySelector(container).innerHTML = "<p style='color:#b00;'>Failed to render chart.</p>";
      });
    }

  }).catch(err => {
    console.error("Failed to load CSV:", err);
    document.querySelector("#chart").innerHTML = "<p style='color:#b00;'>Failed to load data.</p>";
  });

});
