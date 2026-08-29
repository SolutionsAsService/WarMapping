/**
 * Global Conflict Mapping Application
 * -----------------------------------
 *
 * Responsibilities:
 *  - Initialize Leaflet
 *  - Load world GeoJSON
 *  - Load country metadata
 *  - Load war/conflict data
 *  - Render countries
 *  - Render conflict participation
 *  - Render conflict details
 *  - Manage timeline
 *  - Manage country selection
 *  - Manage application state
 *
 * Designed to be modularized later.
 *
 * Expected files:
 *
 *   /index.html
 *   /app.js
 *   /styles.css
 *   /data/
 *      countries.json
 *      wars.json
 *
 * The application can initially work with:
 *
 *   countries.json
 *   wars.json
 *
 * while allowing additional datasets to be introduced later.
 */

'use strict';

/* =========================================================
   APPLICATION CONFIGURATION
   ========================================================= */

const CONFIG = {
  map: {
    element: 'map',
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 8
  },

  data: {
    worldGeoJSON:
      'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',

    countries:
      'data/countries.json',

    wars:
      'data/wars.json'
  },

  elements: {
    map: 'map',
    warSelector: 'war-selector',
    warDetails: 'war-details',
    timeline: 'timeline',
    timelineLabel: 'timeline-label',
    countryDetails: 'country-details',
    search: 'country-search'
  },

  colors: {
    neutral: '#d8dee4',
    border: '#66717d',

    combatantA: '#dc3545',
    combatantB: '#2563eb',

    militarySupportA: '#f59e0b',
    militarySupportB: '#60a5fa',

    politicalSupportA: '#facc15',
    politicalSupportB: '#93c5fd',

    humanitarian: '#22c55e',
    disputed: '#a855f7'
  }
};


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const AppState = {
  map: null,

  worldLayer: null,

  worldGeoJSON: null,

  countries: [],

  countryIndex: new Map(),

  wars: [],

  selectedWar: null,

  selectedCountry: null,

  timelineDate: null,

  filters: {
    showNeutralCountries: true,
    showBorders: true
  },

  initialized: false
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const DOM = {};

function cacheDOM() {
  Object.entries(CONFIG.elements).forEach(([key, id]) => {
    DOM[key] = document.getElementById(id);
  });
}


/* =========================================================
   APPLICATION INITIALIZATION
   ========================================================= */

async function initApp() {
  try {
    cacheDOM();

    initMap();

    setupEventListeners();

    await loadApplicationData();

    buildCountryIndex();

    renderWarSelector();

    renderTimeline();

    renderWorld();

    AppState.initialized = true;

    console.info('Global Conflict Mapping Application initialized.');

  } catch (error) {
    console.error('Application initialization failed:', error);

    showApplicationError(
      'Unable to initialize the mapping application.'
    );
  }
}


/* =========================================================
   MAP INITIALIZATION
   ========================================================= */

function initMap() {
  if (!DOM.map) {
    throw new Error('Map container not found.');
  }

  AppState.map = L.map(CONFIG.map.element, {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    maxZoom: CONFIG.map.maxZoom,
    worldCopyJump: true
  });

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; OpenStreetMap contributors',

      maxZoom: CONFIG.map.maxZoom
    }
  ).addTo(AppState.map);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  // War selector
  if (DOM.warSelector) {
    DOM.warSelector.addEventListener(
      'change',
      handleWarSelection
    );
  }

  // Timeline
  if (DOM.timeline) {
    DOM.timeline.addEventListener(
      'input',
      handleTimelineChange
    );
  }

  // Country search
  if (DOM.search) {
    DOM.search.addEventListener(
      'input',
      handleCountrySearch
    );
  }
}


/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadApplicationData() {

  const [
    worldGeoJSON,
    countriesData,
    warsData
  ] = await Promise.all([
    fetchJSON(CONFIG.data.worldGeoJSON),
    fetchJSON(CONFIG.data.countries),
    fetchJSON(CONFIG.data.wars)
  ]);

  AppState.worldGeoJSON = worldGeoJSON;

  AppState.countries =
    normalizeCountries(countriesData);

  AppState.wars =
    normalizeWars(warsData);
}


/* =========================================================
   GENERIC JSON LOADER
   ========================================================= */

async function fetchJSON(url) {

  const response = await fetch(url, {
    cache: 'no-cache'
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load ${url}: ${response.status}`
    );
  }

  return response.json();
}


/* =========================================================
   COUNTRY DATA
   ========================================================= */

function normalizeCountries(data) {

  const countries =
    Array.isArray(data)
      ? data
      : data.countries || [];

  return countries.map(country => ({
    id:
      country.id ||
      country.iso2 ||
      country.iso3 ||
      country.name,

    name:
      country.name || 'Unknown',

    iso2:
      country.iso2 || null,

    iso3:
      country.iso3 || null,

    capital:
      country.capital || null,

    region:
      country.region || null,

    subregion:
      country.subregion || null,

    population:
      country.population ?? null,

    area:
      country.area ?? null,

    government:
      country.government || null,

    metadata:
      country.metadata || {}
  }));
}


/* =========================================================
   COUNTRY INDEX
   ========================================================= */

function buildCountryIndex() {

  AppState.countryIndex.clear();

  AppState.countries.forEach(country => {

    const keys = [
      country.id,
      country.name,
      country.iso2,
      country.iso3
    ];

    keys
      .filter(Boolean)
      .forEach(key => {
        AppState.countryIndex.set(
          normalizeCountryName(key),
          country
        );
      });

  });
}


/* =========================================================
   WAR DATA
   ========================================================= */

function normalizeWars(data) {

  const wars =
    Array.isArray(data)
      ? data
      : data.wars || [];

  return wars.map(war => {

    const normalized = {
      id:
        war.id ||
        crypto.randomUUID(),

      name:
        war.name ||
        'Unnamed Conflict',

      description:
        war.description || '',

      startDate:
        parseDate(war.startDate),

      endDate:
        parseDate(war.endDate),

      status:
        war.status ||
        'historical',

      region:
        war.region || null,

      categories: {

        combatantsA:
          normalizeCountryList(
            war.combatantsA ||
            war.easternCombatants ||
            []
          ),

        combatantsB:
          normalizeCountryList(
            war.combatantsB ||
            war.westernCombatants ||
            []
          ),

        militarySupportA:
          normalizeCountryList(
            war.militarySupportA ||
            war.easternMilitarySupport ||
            []
          ),

        militarySupportB:
          normalizeCountryList(
            war.militarySupportB ||
            war.westernMilitarySupport ||
            []
          ),

        politicalSupportA:
          normalizeCountryList(
            war.politicalSupportA ||
            war.easternPoliticalSupport ||
            []
          ),

        politicalSupportB:
          normalizeCountryList(
            war.politicalSupportB ||
            war.westernPoliticalSupport ||
            []
          ),

        humanitarian:
          normalizeCountryList(
            war.humanitarianSupport ||
            []
          )
      },

      timeline:
        Array.isArray(war.timeline)
          ? war.timeline
          : [],

      metadata:
        war.metadata || {}
    };

    return normalized;
  });
}


/* =========================================================
   COUNTRY NAME NORMALIZATION
   ========================================================= */

function normalizeCountryName(name) {

  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


function normalizeCountryList(list) {

  if (!Array.isArray(list)) {
    return [];
  }

  return list.map(country =>
    typeof country === 'string'
      ? country
      : country.name
  ).filter(Boolean);
}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function parseDate(value) {

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}


/* =========================================================
   WAR SELECTOR
   ========================================================= */

function renderWarSelector() {

  if (!DOM.warSelector) {
    return;
  }

  DOM.warSelector.innerHTML = '';

  const placeholder =
    document.createElement('option');

  placeholder.value = '';
  placeholder.textContent =
    'Select a conflict';

  DOM.warSelector.appendChild(
    placeholder
  );

  AppState.wars.forEach(war => {

    const option =
      document.createElement('option');

    option.value = war.id;

    option.textContent =
      war.name;

    DOM.warSelector.appendChild(
      option
    );
  });
}


/* =========================================================
   WAR SELECTION
   ========================================================= */

function handleWarSelection(event) {

  const warId =
    event.target.value;

  if (!warId) {

    AppState.selectedWar = null;

    renderWorld();

    clearWarDetails();

    return;
  }

  const war =
    AppState.wars.find(
      item => item.id === warId
    );

  if (!war) {
    return;
  }

  AppState.selectedWar = war;

  AppState.timelineDate =
    war.startDate || null;

  renderWarDetails(war);

  renderTimeline();

  renderWorld();
}


/* =========================================================
   MAP RENDERING
   ========================================================= */

function renderWorld() {

  if (!AppState.worldGeoJSON) {
    return;
  }

  if (AppState.worldLayer) {
    AppState.map.removeLayer(
      AppState.worldLayer
    );
  }

  AppState.worldLayer =
    L.geoJSON(
      AppState.worldGeoJSON,
      {
        style: feature =>
          getCountryStyle(feature),

        onEachFeature:
          (feature, layer) =>
            bindCountryEvents(
              feature,
              layer
            )
      }
    ).addTo(AppState.map);
}


/* =========================================================
   COUNTRY STYLE
   ========================================================= */

function getCountryStyle(feature) {

  const countryName =
    getFeatureCountryName(feature);

  const involvement =
    getCountryInvolvement(
      countryName
    );

  const color =
    getInvolvementColor(
      involvement
    );

  const involved =
    involvement !== null;

  return {

    fillColor:
      color || CONFIG.colors.neutral,

    fillOpacity:
      involved
        ? 0.72
        : 0.25,

    color:
      CONFIG.filters.showBorders
        ? CONFIG.colors.border
        : 'transparent',

    weight:
      involved
        ? 1.5
        : 0.6,

    opacity: 1
  };
}


/* =========================================================
   FEATURE COUNTRY NAME
   ========================================================= */

function getFeatureCountryName(feature) {

  return (
    feature?.properties?.name ||
    feature?.properties?.NAME ||
    feature?.properties?.ADMIN ||
    ''
  );
}


/* =========================================================
   COUNTRY INVOLVEMENT
   ========================================================= */

function getCountryInvolvement(countryName) {

  const war =
    AppState.selectedWar;

  if (!war) {
    return null;
  }

  const normalized =
    normalizeCountryName(
      countryName
    );

  const categories =
    war.categories;

  if (
    containsCountry(
      categories.combatantsA,
      normalized
    )
  ) {
    return 'combatantA';
  }

  if (
    containsCountry(
      categories.combatantsB,
      normalized
    )
  ) {
    return 'combatantB';
  }

  if (
    containsCountry(
      categories.militarySupportA,
      normalized
    )
  ) {
    return 'militarySupportA';
  }

  if (
    containsCountry(
      categories.militarySupportB,
      normalized
    )
  ) {
    return 'militarySupportB';
  }

  if (
    containsCountry(
      categories.politicalSupportA,
      normalized
    )
  ) {
    return 'politicalSupportA';
  }

  if (
    containsCountry(
      categories.politicalSupportB,
      normalized
    )
  ) {
    return 'politicalSupportB';
  }

  if (
    containsCountry(
      categories.humanitarian,
      normalized
    )
  ) {
    return 'humanitarian';
  }

  return null;
}


/* =========================================================
   COUNTRY MATCHING
   ========================================================= */

function containsCountry(
  countries,
  normalizedName
) {

  return countries.some(country => {

    return (
      normalizeCountryName(
        country
      ) === normalizedName
    );

  });
}


/* =========================================================
   INVOLVEMENT COLORS
   ========================================================= */

function getInvolvementColor(
  involvement
) {

  switch (involvement) {

    case 'combatantA':
      return CONFIG.colors.combatantA;

    case 'combatantB':
      return CONFIG.colors.combatantB;

    case 'militarySupportA':
      return CONFIG.colors.militarySupportA;

    case 'militarySupportB':
      return CONFIG.colors.militarySupportB;

    case 'politicalSupportA':
      return CONFIG.colors.politicalSupportA;

    case 'politicalSupportB':
      return CONFIG.colors.politicalSupportB;

    case 'humanitarian':
      return CONFIG.colors.humanitarian;

    default:
      return CONFIG.colors.neutral;
  }
}


/* =========================================================
   COUNTRY INTERACTION
   ========================================================= */

function bindCountryEvents(
  feature,
  layer
) {

  const countryName =
    getFeatureCountryName(feature);

  layer.on({

    mouseover: event => {

      event.target.setStyle({
        weight: 2.5,
        fillOpacity: 0.9
      });

      if (
        event.target.bringToFront
      ) {
        event.target.bringToFront();
      }
    },

    mouseout: event => {

      event.target.setStyle(
        getCountryStyle(feature)
      );
    },

    click: () => {

      selectCountry(
        countryName
      );

    }
  });

  layer.bindTooltip(
    countryName,
    {
      sticky: true
    }
  );
}


/* =========================================================
   COUNTRY SELECTION
   ========================================================= */

function selectCountry(countryName) {

  const country =
    AppState.countryIndex.get(
      normalizeCountryName(
        countryName
      )
    );

  AppState.selectedCountry =
    country || {
      name: countryName
    };

  renderCountryDetails(
    AppState.selectedCountry
  );
}


/* =========================================================
   COUNTRY DETAILS
   ========================================================= */

function renderCountryDetails(country) {

  if (!DOM.countryDetails) {
    return;
  }

  DOM.countryDetails.innerHTML = '';

  const title =
    document.createElement('h2');

  title.textContent =
    country.name;

  DOM.countryDetails.appendChild(
    title
  );

  const fields = [
    ['Capital', country.capital],
    ['Region', country.region],
    ['Subregion', country.subregion],
    ['Population', country.population],
    ['Area', country.area],
    ['Government', country.government]
  ];

  fields.forEach(([label, value]) => {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return;
    }

    const row =
      document.createElement('div');

    row.className =
      'country-detail-row';

    const labelElement =
      document.createElement('strong');

    labelElement.textContent =
      `${label}: `;

    const valueElement =
      document.createElement('span');

    valueElement.textContent =
      value;

    row.appendChild(
      labelElement
    );

    row.appendChild(
      valueElement
    );

    DOM.countryDetails.appendChild(
      row
    );
  });

  renderCountryConflictRole(
    country.name
  );
}


/* =========================================================
   COUNTRY CONFLICT ROLE
   ========================================================= */

function renderCountryConflictRole(
  countryName
) {

  if (!DOM.countryDetails) {
    return;
  }

  const war =
    AppState.selectedWar;

  if (!war) {
    return;
  }

  const role =
    getCountryInvolvement(
      countryName
    );

  if (!role) {
    return;
  }

  const roleElement =
    document.createElement('p');

  roleElement.className =
    'country-conflict-role';

  roleElement.textContent =
    `Role in ${war.name}: ${formatRole(role)}`;

  DOM.countryDetails.appendChild(
    roleElement
  );
}


function formatRole(role) {

  return role
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char =>
      char.toUpperCase()
    );
}


/* =========================================================
   WAR DETAILS
   ========================================================= */

function renderWarDetails(war) {

  if (!DOM.warDetails) {
    return;
  }

  DOM.warDetails.innerHTML = '';

  const title =
    document.createElement('h2');

  title.textContent =
    war.name;

  DOM.warDetails.appendChild(
    title
  );

  if (war.description) {

    const description =
      document.createElement('p');

    description.textContent =
      war.description;

    DOM.warDetails.appendChild(
      description
    );
  }

  renderWarMetadata(war);

  renderWarParticipants(war);
}


/* =========================================================
   WAR METADATA
   ========================================================= */

function renderWarMetadata(war) {

  const container =
    document.createElement('div');

  container.className =
    'war-metadata';

  const fields = [
    ['Status', war.status],
    ['Region', war.region],
    [
      'Start',
      formatDate(war.startDate)
    ],
    [
      'End',
      formatDate(war.endDate)
    ]
  ];

  fields.forEach(([label, value]) => {

    if (!value) {
      return;
    }

    const item =
      document.createElement('div');

    item.className =
      'war-metadata-item';

    item.innerHTML = '';

    const labelElement =
      document.createElement('strong');

    labelElement.textContent =
      `${label}: `;

    const valueElement =
      document.createElement('span');

    valueElement.textContent =
      value;

    item.appendChild(
      labelElement
    );

    item.appendChild(
      valueElement
    );

    container.appendChild(
      item
    );
  });

  DOM.warDetails.appendChild(
    container
  );
}


/* =========================================================
   WAR PARTICIPANTS
   ========================================================= */

function renderWarParticipants(war) {

  const groups = [

    {
      key: 'combatantsA',
      label: 'Combatants — Side A',
      color: CONFIG.colors.combatantA
    },

    {
      key: 'combatantsB',
      label: 'Combatants — Side B',
      color: CONFIG.colors.combatantB
    },

    {
      key: 'militarySupportA',
      label: 'Military Support — Side A',
      color: CONFIG.colors.militarySupportA
    },

    {
      key: 'militarySupportB',
      label: 'Military Support — Side B',
      color: CONFIG.colors.militarySupportB
    },

    {
      key: 'politicalSupportA',
      label: 'Political Support — Side A',
      color: CONFIG.colors.politicalSupportA
    },

    {
      key: 'politicalSupportB',
      label: 'Political Support — Side B',
      color: CONFIG.colors.politicalSupportB
    },

    {
      key: 'humanitarian',
      label: 'Humanitarian Support',
      color: CONFIG.colors.humanitarian
    }

  ];

  groups.forEach(group => {

    const countries =
      war.categories[group.key];

    if (
      !countries ||
      countries.length === 0
    ) {
      return;
    }

    const section =
      document.createElement('section');

    section.className =
      'war-participant-group';

    section.style.borderLeft =
      `4px solid ${group.color}`;

    const heading =
      document.createElement('h3');

    heading.textContent =
      group.label;

    section.appendChild(
      heading
    );

    const list =
      document.createElement('ul');

    countries.forEach(country => {

      const item =
        document.createElement('li');

      item.textContent =
        country;

      list.appendChild(
        item
      );
    });

    section.appendChild(
      list
    );

    DOM.warDetails.appendChild(
      section
    );
  });
}


/* =========================================================
   TIMELINE
   ========================================================= */

function renderTimeline() {

  if (!DOM.timeline) {
    return;
  }

  const war =
    AppState.selectedWar;

  if (
    !war ||
    !war.startDate
  ) {

    DOM.timeline.disabled =
      true;

    return;
  }

  DOM.timeline.disabled =
    false;

  const start =
    war.startDate.getTime();

  const end =
    (
      war.endDate ||
      new Date()
    ).getTime();

  DOM.timeline.min =
    start;

  DOM.timeline.max =
    end;

  DOM.timeline.value =
    (
      AppState.timelineDate ||
      war.startDate
    ).getTime();

  updateTimelineLabel();
}


function handleTimelineChange(event) {

  const timestamp =
    Number(event.target.value);

  if (!timestamp) {
    return;
  }

  AppState.timelineDate =
    new Date(timestamp);

  updateTimelineLabel();

  renderWorld();
}


function updateTimelineLabel() {

  if (!DOM.timelineLabel) {
    return;
  }

  DOM.timelineLabel.textContent =
    AppState.timelineDate
      ? formatDate(
          AppState.timelineDate
        )
      : 'No date selected';
}


/* =========================================================
   SEARCH
   ========================================================= */

function handleCountrySearch(event) {

  const query =
    normalizeCountryName(
      event.target.value
    );

  if (!query) {
    return;
  }

  const country =
    AppState.countries.find(
      item =>
        normalizeCountryName(
          item.name
        ).includes(query)
    );

  if (country) {
    selectCountry(
      country.name
    );
  }
}


/* =========================================================
   UTILITIES
   ========================================================= */

function formatDate(date) {

  if (!date) {
    return null;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  );
}


function clearWarDetails() {

  if (DOM.warDetails) {
    DOM.warDetails.innerHTML = '';
  }
}


function showApplicationError(message) {

  const container =
    document.getElementById(
      'app-error'
    );

  if (container) {
    container.textContent =
      message;

    container.hidden =
      false;

    return;
  }

  console.error(message);
}


/* =========================================================
   PUBLIC APPLICATION API
   =========================================================
   
   These methods intentionally expose a small API.
   Future modules can communicate with the application
   through these functions rather than manipulating
   internal state directly.
   ========================================================= */

window.ConflictMap = {

  getState() {
    return AppState;
  },

  selectWar(warId) {

    const war =
      AppState.wars.find(
        item => item.id === warId
      );

    if (!war) {
      return;
    }

    AppState.selectedWar =
      war;

    if (DOM.warSelector) {
      DOM.warSelector.value =
        war.id;
    }

    renderWarDetails(war);

    renderTimeline();

    renderWorld();
  },

  selectCountry(countryName) {
    selectCountry(countryName);
  },

  refreshMap() {
    renderWorld();
  },

  refresh() {
    renderWorld();

    if (AppState.selectedWar) {
      renderWarDetails(
        AppState.selectedWar
      );
    }

    renderTimeline();
  }

};


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  initApp
);

