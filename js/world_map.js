document.addEventListener('DOMContentLoaded', function () {
  // ------------------------------- World AQI Vega-Lite spec embed (robust) -------------------------------
  (function embedWorldMap() {
    const SPEC_PATH = 'js/world_map_aqi.vg.json';
    const container = document.getElementById('world-map');
    if (!container) return;

    // show temporary loading text
    container.innerHTML = '<div style="padding:12px;color:#666;">Loading world map…</div>';

    fetch(SPEC_PATH)
      .then(resp => {
        if (!resp.ok) {
          throw new Error('Failed to fetch spec (' + resp.status + ' ' + resp.statusText + '). Check that "' + SPEC_PATH + '" exists and is reachable.');
        }
        return resp.json();
      })
      .then(specObj => {
        // embed the parsed object (not the path string)
        vegaEmbed('#world-map', specObj, { actions: true, renderer: 'canvas' })
          .then(res => {
            // Map embedded successfully
          })
          .catch(err => {
            console.error('vegaEmbed error for world map:', err);
            container.innerHTML = '<div class="map-error">Error rendering world map. See console for details.</div>';
          });
      })
      .catch(err => {
        console.error('Failed to load world_map_aqi.vg.json:', err);
        container.innerHTML = '<div class="map-error">Could not load world map specification (js/world_map_aqi.vg.json). Check the file path and browser console for details.</div>';
      });
  })();
});
