(() => {
  const API_URL = "https://travis-dai-academic.daitr616.chatgpt.site/api/visits";
  const WORLD_URL = "visitor-countries-110m.json";
  const svg = document.getElementById("visitor-map");
  const status = document.getElementById("visitor-status");
  const total = document.getElementById("visitor-total");
  const countryCount = document.getElementById("visitor-countries");
  const countryList = document.getElementById("visitor-country-list");
  if (!svg || !status || !total || !countryCount || !countryList) return;

  const ns = "http://www.w3.org/2000/svg";
  let currentStats = null;
  let currentTopology = null;

  const addTitle = (element, text) => {
    const title = document.createElementNS(ns, "title");
    title.textContent = text;
    element.appendChild(title);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Visit recording unavailable");
      return await response.json();
    } catch (error) {
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) throw error;
      return response.json();
    }
  };

  const renderMap = (topology, stats) => {
    svg.querySelectorAll(".map-ocean, .map-country, .map-bubble").forEach((item) => item.remove());

    const projection = d3.geoEqualEarth().fitSize([960, 480], { type: "Sphere" });
    const path = d3.geoPath(projection);
    const visitsByCode = new Map(
      (stats?.countries || []).map((item) => [
        String(item.numericCode).padStart(3, "0"),
        item
      ])
    );
    const maxVisits = Math.max(
      1,
      ...(stats?.countries || []).map((item) => item.visits)
    );
    const features = topojson.feature(
      topology,
      topology.objects.countries
    ).features;

    const ocean = document.createElementNS(ns, "path");
    ocean.setAttribute("class", "map-ocean");
    ocean.setAttribute("d", path({ type: "Sphere" }));
    svg.appendChild(ocean);

    features.forEach((mapFeature) => {
      const numericCode = String(mapFeature.id).padStart(3, "0");
      const visit = visitsByCode.get(numericCode);
      const country = document.createElementNS(ns, "path");
      country.setAttribute("class", visit ? "map-country visited" : "map-country");
      country.setAttribute("d", path(mapFeature));
      addTitle(
        country,
        visit
          ? visit.countryName + ": " + visit.visits + " visits"
          : mapFeature.properties.name
      );
      svg.appendChild(country);

      if (visit) {
        const point = path.centroid(mapFeature);
        const bubble = document.createElementNS(ns, "circle");
        bubble.setAttribute("class", "map-bubble");
        bubble.setAttribute("cx", point[0]);
        bubble.setAttribute("cy", point[1]);
        bubble.setAttribute(
          "r",
          4 + Math.sqrt(visit.visits / maxVisits) * 12
        );
        addTitle(
          bubble,
          visit.countryName + ": " + visit.visits + " visits"
        );
        svg.appendChild(bubble);
      }
    });
  };

  fetch(WORLD_URL, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("Map data unavailable");
      return response.json();
    })
    .then((topology) => {
      currentTopology = topology;
      renderMap(currentTopology, currentStats);
    })
    .catch(() => {
      status.hidden = false;
      status.textContent = "Visitor map is temporarily unavailable.";
    });

  loadStats()
    .then((stats) => {
      currentStats = stats;
      total.textContent = Number(stats.visits || 0).toLocaleString("en-NZ");
      countryCount.textContent = Number(
        stats.countries?.length || 0
      ).toLocaleString("en-NZ");
      countryList.replaceChildren();

      (stats.countries || []).slice(0, 4).forEach((item) => {
        const entry = document.createElement("li");
        const name = document.createElement("span");
        const value = document.createElement("strong");
        name.textContent = item.countryName;
        value.textContent = Number(item.visits).toLocaleString("en-NZ");
        entry.append(name, value);
        countryList.appendChild(entry);
      });

      status.hidden = true;
      if (currentTopology) renderMap(currentTopology, currentStats);
    })
    .catch(() => {
      total.textContent = "—";
      countryCount.textContent = "—";
      status.hidden = false;
      status.textContent = "Visitor data is temporarily unavailable.";
    });
})();