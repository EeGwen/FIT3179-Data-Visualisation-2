document.addEventListener('DOMContentLoaded', function () {
  const MAP_CSV = "https://raw.githubusercontent.com/EeGwen/FIT3179-Data-Visualisation-2/refs/heads/main/data/Air-Pollution-Index-in-Malaysia-monthly.csv";
  const VG_JSON_PATH = "js/malaysia_map_aqi.vg.json"; // external Vega-Lite spec

  // Load CSV, clean data
  d3.csv(MAP_CSV).then(raw => {
    const cleaned = raw.map(r => ({
      Month: String(r.Month||""),
      City: String(r.City||""),
      State: String(r.State||""),
      Latitude: r.Latitude ? +r.Latitude : null,
      Longitude: r.Longitude ? +r.Longitude : null,
      API: r["Air Quality Index"] ? +r["Air Quality Index"] : (r.API ? +r.API : null),
      "Air Pollution Level": r["AQI Category"] || r["Air Pollution Level"] || "",
      Observations: r.Observations ? (+r.Observations) : (r.Observation ? (+r.Observation) : null)
    }));

    const withCoords = cleaned.filter(d => d.Latitude != null && d.Longitude != null && !isNaN(d.Latitude) && !isNaN(d.Longitude));

    const months = Array.from(new Set(withCoords.map(d => d.Month)))
      .filter(Boolean)
      .sort((a,b) => ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(a)
                    - ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(b));

    function populateSelect(selEl, values){
      selEl.innerHTML = "";
      values.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.text = v;
        selEl.appendChild(opt);
      });
      if(values.length > 0) selEl.value = values[0];
    }

    populateSelect(document.getElementById("filter-month"), months);

    document.getElementById("map-reset").addEventListener("click", () => {
      const sel = document.getElementById("filter-month");
      if(sel.options.length > 0) sel.value = sel.options[0].value;
      renderMap();
    });
    document.getElementById("filter-month").addEventListener("change", renderMap);

    // Load Vega-Lite spec JSON once
    let mapSpecTemplate = null;
    fetch(VG_JSON_PATH)
      .then(resp => resp.ok ? resp.json() : Promise.reject("Failed to load spec"))
      .then(specJson => { mapSpecTemplate = specJson; renderMap(); })
      .catch(err => {
        console.error("Failed to load map spec JSON:", err);
        const el = document.getElementById("map");
        if(el) el.innerHTML = "<p style='color:#b00;'>Failed to load map specification.</p>";
      });

    function renderMap(){
      const selMonth = document.getElementById("filter-month").value;
      if(!selMonth){
        document.getElementById("map").innerHTML = "<p style='color:#666;'>Please select a month.</p>";
        return;
      }
      const filtered = withCoords.filter(d => d.Month === selMonth);
      if(filtered.length === 0){
        document.getElementById("map").innerHTML = "<p style='color:#666;'>No data for the selected month.</p>";
        return;
      }
      if(!mapSpecTemplate){
        document.getElementById("map").innerHTML = "<p style='color:#666;'>Loading map definition...</p>";
        return;
      }

      const spec = JSON.parse(JSON.stringify(mapSpecTemplate)); // deep copy template
      let layerIdx = Array.isArray(spec.layer) 
        ? spec.layer.findIndex(l => l && l.name === "aqi_points") 
        : -1;
      if(layerIdx === -1) layerIdx = 6; // fallback

      if(!spec.layer[layerIdx].data) spec.layer[layerIdx].data = {};
      spec.layer[layerIdx].data.values = filtered;

      vegaEmbed("#map", spec, {actions: true, renderer: "canvas"}).catch(err => {
        console.error("vegaEmbed error:", err);
        document.getElementById("map").innerHTML = "<p style='color:#b00;'>Failed to render map.</p>";
      });
    }
  }).catch(err => {
    console.error("CSV load failed:", err);
    document.getElementById("map").innerHTML = "<p style='color:#b00;'>Failed to load map data.</p>";
  });
});
