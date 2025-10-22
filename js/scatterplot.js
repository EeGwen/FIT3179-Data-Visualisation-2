document.addEventListener('DOMContentLoaded', function () {

  const DATA_URL = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/data/selected_100_concordant_rows.csv";
  const containerId = "#aqi-cases-scatter";

  const COLORS = {
    respiratory: "#1f77b4",
    cardio: "#ff7f0e"
  };

  function findColumn(columns, keywords) {
    const low = columns.map(c => c.toLowerCase());
    for (let k of keywords) {
      const kl = k.toLowerCase();
      const idxExact = low.indexOf(kl);
      if (idxExact !== -1) return columns[idxExact];
    }
    for (let c of columns) {
      for (let k of keywords) {
        if (c.toLowerCase().includes(k.toLowerCase())) return c;
      }
    }
    return null;
  }

  function toNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    const s = String(v).trim();
    if (s === "") return null;
    const cleaned = s.replace(/,/g, "");
    const n = +cleaned;
    return isNaN(n) ? null : n;
  }

  d3.csv(DATA_URL).then(raw => {
    if (!raw || raw.length === 0) {
      document.querySelector(containerId).innerHTML = "<p style='color:#666;'>No data found.</p>";
      return;
    }

    const columns = Object.keys(raw[0] || {});
    const aqiCol = findColumn(columns, ["AQI", "Air Quality Index"]);
    const respCol = findColumn(columns, ["Respiratory", "respiratory_cases"]);
    const cardioCol = findColumn(columns, ["Cardiovascular", "cardiovascular_cases"]);

    const mapped = raw.map(r => ({
      AQI: toNum(r[aqiCol]),
      Respiratory: respCol ? toNum(r[respCol]) : null,
      Cardiovascular: cardioCol ? toNum(r[cardioCol]) : null
    })).filter(d => d.AQI != null && (d.Respiratory != null || d.Cardiovascular != null));

    function prepareDataFor(yKey) {
      return mapped.filter(d => d[yKey] != null).map(d => ({ AQI: d.AQI, Cases: d[yKey] }));
    }

    function simpleLinReg(xs, ys) {
      const n = xs.length;
      if (n === 0) return null;
      let sx = 0, sy = 0, sxy = 0, sx2 = 0;
      for (let i = 0; i < n; i++) {
        sx += xs[i];
        sy += ys[i];
        sxy += xs[i] * ys[i];
        sx2 += xs[i] * xs[i];
      }
      const denom = n * sx2 - sx * sx;
      if (denom === 0) return null;
      const slope = (n * sxy - sx * sy) / denom;
      const intercept = (sy - slope * sx) / n;
      return { slope, intercept };
    }

    function renderFor(selection) {
      const key = (selection === "respiratory") ? "Respiratory" : "Cardiovascular";
      const displayRows = prepareDataFor(key);
      if (displayRows.length === 0) {
        document.querySelector(containerId).innerHTML = `<p style='color:#666;'>No rows with ${key} cases and AQI found.</p>`;
        return;
      }

      const xs = displayRows.map(r => r.AQI);
      const ys = displayRows.map(r => r.Cases);
      const lr = simpleLinReg(xs, ys);

      fetch('js/scatterplot.vg.json')
        .then(res => res.json())
        .then(spec => {
          spec.data.values = displayRows;
          const color = selection === "respiratory" ? COLORS.respiratory : COLORS.cardio;
          spec.layer[0].encoding.color.value = color;
          spec.layer[1].encoding.color.value = color;
          spec.layer[0].encoding.y.title = key;

          vegaEmbed(containerId, spec, { actions: true, renderer: "canvas" })
            .catch(err => {
              console.error(err);
              document.querySelector(containerId).innerHTML = "<p style='color:#666;'>Failed to render chart.</p>";
            });
        });
    }

    // Radio button listeners
    const radios = document.querySelectorAll('input[name="caseType"]');
    radios.forEach(r => r.addEventListener('change', () =>
      renderFor(document.querySelector('input[name="caseType"]:checked').value)
    ));

    // Initial render
    renderFor(document.querySelector('input[name="caseType"]:checked')?.value || "respiratory");

  }).catch(err => {
    console.error(err);
    document.querySelector(containerId).innerHTML = "<p style='color:#666;'>Failed to load data.</p>";
  });

});
