let map;
let geojsonLayer;

// Initialize Leaflet map
function initMap() {
  map = L.map('map').setView([20, 0], 2); // Centered globally

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Function to determine color based on alignment and role
function getCountryColor(country, warData) {
  if (warData.easternCombatants.includes(country)) return "#ff4d4d"; // Red (Eastern Combatant)
  if (warData.westernCombatants.includes(country)) return "#4d79ff"; // Dark Blue (Western Combatant)
  if (warData.easternMilitarySupport.includes(country)) return "#ff9f40"; // Orange (Eastern Military Support)
  if (warData.westernMilitarySupport.includes(country)) return "#5aa8ff"; // Medium Blue (Western Military Support)
  if (warData.easternPoliticalSupport.includes(country)) return "#ffd580"; // Yellow (Eastern Political Support)
  if (warData.westernPoliticalSupport.includes(country)) return "#a3d5ff"; // Light Blue (Western Political Support)
  return "#00000000"; // No involvement (Transparent)
}

// Function to highlight countries based on war details
function highlightCountries(warData) {
  if (geojsonLayer) {
    map.removeLayer(geojsonLayer); // Remove previous geojson layer
  }

  fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(response => response.json())
    .then(worldGeoJson => {
      geojsonLayer = L.geoJSON(worldGeoJson, {
        style: feature => ({
          fillColor: getCountryColor(feature.properties.name, warData),
          color: "#444",
          weight: getCountryColor(feature.properties.name, warData) !== "#00000000" ? 1.5 : 0.5,
          fillOpacity: getCountryColor(feature.properties.name, warData) !== "#00000000" ? 0.6 : 0
        })
      }).addTo(map);
    })
    .catch(error => console.error('Error loading country borders:', error));
}

// Fetch wars data and populate dropdown
document.addEventListener("DOMContentLoaded", () => {
  fetch('wars.json')
    .then(response => response.json())
    .then(data => {
      const warSelector = document.getElementById('war-selector');

      data.wars.forEach(war => {
        const option = document.createElement('option');
        option.value = war.id;
        option.textContent = war.name;
        warSelector.appendChild(option);
      });

      warSelector.addEventListener('change', function () {
        const selectedWar = data.wars.find(war => war.id == this.value);
        if (selectedWar) {
          displayWarDetails(selectedWar);
          highlightCountries(selectedWar);
        }
      });
    })
    .catch(error => console.error('Error fetching wars.json:', error));
});

// Display war details
function displayWarDetails(war) {
  const detailsContainer = document.getElementById('war-details');
  detailsContainer.innerHTML = `<h2>${war.name}</h2><p>${war.description}</p>`;

  ["easternCombatants", "westernCombatants", "easternMilitarySupport", "westernMilitarySupport", "easternPoliticalSupport", "westernPoliticalSupport"].forEach(category => {
    if (war[category] && war[category].length > 0) {
      const sideDiv = document.createElement('div');
      sideDiv.classList.add('side');
      sideDiv.style.borderLeft = `4px solid ${getCountryColor(war[category][0], war)}`;
      sideDiv.innerHTML = `<h3>${category.replace(/([A-Z])/g, ' $1')}</h3><p>${war[category].join(", ")}</p>`;
      detailsContainer.appendChild(sideDiv);
    }
  });
}

// Initialize the map on page load
initMap();
