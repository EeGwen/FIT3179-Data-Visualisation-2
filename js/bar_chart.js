// js/bar_chart.js
document.addEventListener('DOMContentLoaded', function () {
  // CSV source
  const CSV_URL = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/data/ghg_emissions_with_year.csv";
  const VG_JSON_PATH = "js/bar_chart.vg.json";
  const CONTAINER_SELECTOR = "#ghg-chart";
  const YEAR_CHECKBOXES_ID = "ghg-year-checkboxes";

  // Only keep these sources (ignore total and net)
  const SOURCE_ORDER = ["energy", "industrial_processes", "agriculture", "waste"];
  const SOURCE_LABELS = {
    "energy": "Energy",
    "industrial_processes": "Industrial Processes",
    "agriculture": "Agriculture",
    "waste": "Waste"
  };

  // Safe color palette
  const SAFE_PALETTE = [
    "#1f77b4", "#ff7f0e", "#9467bd", "#8c564b",
    "#e377c2", "#7f7f7f", "#17becf"
  ];

  // Convert values to number
  function toNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = +s.replace(/,/g, "");
    return isNaN(n) ? null : n;
  }

  // Load CSV
  d3.csv(CSV_URL).then(raw => {
    if (!raw || raw.length === 0) {
      document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#666'>No data available.</p>";
      return;
    }

    // Parse and filter rows
    const parsed = raw.map(r => ({
      date: r.date || "",
      source: (r.source || "").trim(),
      emissions_num: toNum(r.emissions),
      year: r.year ? String(r.year).trim() : ""
    })).filter(d => d.source && SOURCE_ORDER.includes(d.source) && d.emissions_num != null && d.year);

    if (parsed.length === 0) {
      document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#666'>No usable rows after filtering sources and parsing emissions.</p>";
      return;
    }

    // Unique sorted years
    const allYears = ["2014","2015","2016","2017","2018","2019"]; // valid years
    const years = Array.from(new Set(parsed.map(d => d.year))).filter(y => allYears.includes(y)).sort((a,b) => (+a) - (+b));

    // Build year checkboxes UI
    const yearContainer = document.getElementById(YEAR_CHECKBOXES_ID);
    if (yearContainer) {
      yearContainer.innerHTML = "";
      const allId = "ghg-year-all";
      const allWrapper = document.createElement("div");
      allWrapper.innerHTML = `<label><input type="checkbox" id="${allId}" checked> All</label>`;
      yearContainer.appendChild(allWrapper);

      years.forEach(y => {
        const id = "ghg-year-" + y;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `<label><input type="checkbox" id="${id}" value="${y}" checked> ${y}</label>`;
        yearContainer.appendChild(wrapper);
      });

      // Wire up checkbox logic
      yearContainer.addEventListener("change", () => {
        const allBox = document.getElementById(allId);
        const yearBoxes = Array.from(yearContainer.querySelectorAll('input[type="checkbox"]'))
          .filter(i => i.id !== allId);
        allBox.checked = yearBoxes.every(b => b.checked);
        renderGHG();
      });

      document.getElementById(allId).addEventListener("change", () => {
        const checked = document.getElementById(allId).checked;
        yearContainer.querySelectorAll('input[type="checkbox"]').forEach(ch => ch.checked = checked);
        renderGHG();
      });
    }

    // Prepare Vega spec template
    let specTemplate = null;
    fetch(VG_JSON_PATH).then(resp => {
      if (!resp.ok) throw new Error("Failed to load Vega spec: " + resp.status);
      return resp.json();
    }).then(specJson => {
      specTemplate = specJson;
      renderGHG();
    }).catch(err => {
      console.error("Failed to load bar chart spec:", err);
      document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#b00'>Failed to load chart specification.</p>";
    });

    // Render function
    function renderGHG() {
      const selectedYears = yearContainer
        ? Array.from(yearContainer.querySelectorAll('input[type="checkbox"]:checked'))
            .map(i => i.value)
            .filter(v => v && v !== "on" && allYears.includes(v))
        : years;

      const filtered = parsed.filter(d => selectedYears.includes(d.year));

      if (filtered.length === 0) {
        document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#666'>No data for selected year(s).</p>";
        return;
      }
      if (!specTemplate) {
        document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#666'>Loading chart definition…</p>";
        return;
      }

      // Map to include friendly label field 'source_label'
      const mapped = filtered.map(d => ({
        source: d.source,
        source_label: SOURCE_LABELS[d.source] || d.source,
        emissions_num: d.emissions_num,
        year: d.year
      }));

      // Deep copy spec and inject data + color palette
      const spec = JSON.parse(JSON.stringify(specTemplate));
      spec.data = { values: mapped };

      // Set color domain and range
      spec.encoding.color.scale = spec.encoding.color.scale || {};
      spec.encoding.color.scale.domain = selectedYears;
      const palette = selectedYears.map((_, i) => SAFE_PALETTE[i % SAFE_PALETTE.length]);
      spec.encoding.color.scale.range = palette;

      // Ensure x domain order (friendly labels)
      spec.encoding.x.scale = spec.encoding.x.scale || {};
      spec.encoding.x.scale.domain = SOURCE_ORDER.map(k => SOURCE_LABELS[k]);

      // Embed
      vegaEmbed(CONTAINER_SELECTOR, spec, { actions: true, renderer: "canvas" })
        .catch(err => {
          console.error("vegaEmbed error for GHG chart:", err);
          document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#b00'>Error rendering chart. See console for details.</p>";
        });
    }

  }).catch(err => {
    console.error("CSV load failed:", err);
    document.querySelector(CONTAINER_SELECTOR).innerHTML = "<p style='color:#b00'>Failed to load data.</p>";
  });

});
