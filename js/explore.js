/* explore.js - the original Country Explorer, now with wishlist buttons */

if (!CE.requireLogin()) { throw new Error('Not logged in'); }
CE.renderNav('explore');
CE.setCollage(CE.DEFAULT_BG);

const form = document.getElementById('searchForm');
const input = document.getElementById('countryInput');
const fieldMsg = document.getElementById('fieldMsg');
const statusBox = document.getElementById('status');
const resultBox = document.getElementById('result');
const flagBanner = document.getElementById('flagBanner');
const countryBody = document.getElementById('countryBody');
const placesGrid = document.getElementById('placesGrid');
const flightLink = document.getElementById('flightLink');
const flightSubtext = document.getElementById('flightSubtext');
const statesChipRow = document.getElementById('statesChipRow');
const statesSub = document.getElementById('statesSub');
const citiesBox = document.getElementById('citiesBox');
const citiesChipRow = document.getElementById('citiesChipRow');
const cityPlacesSection = document.getElementById('cityPlacesSection');
const cityPlacesTitle = document.getElementById('cityPlacesTitle');
const cityPlacesGrid = document.getElementById('cityPlacesGrid');

const esc = CE.esc;
const recentRow = document.getElementById('recentRow');

/* ---------- recent searches (last 5, saved per user) ---------- */
function renderRecent() {
  const list = CE.getRecent();
  recentRow.innerHTML = '';
  if (list.length === 0) return;

  const label = document.createElement('span');
  label.className = 'recent-label';
  label.textContent = 'Recent:';
  recentRow.appendChild(label);

  list.forEach(name => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'recent-chip';
    chip.textContent = name;
    chip.addEventListener('click', () => { input.value = name; fieldMsg.textContent = ''; searchCountry(name); });
    recentRow.appendChild(chip);
  });

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'recent-clear';
  clear.textContent = 'Clear';
  clear.addEventListener('click', () => { CE.clearRecent(); renderRecent(); });
  recentRow.appendChild(clear);
}
renderRecent();

// Common alternate names people type, mapped to the country API's official name.
const NAME_ALIASES = {
  'south korea': 'Korea (Republic of)',
  'north korea': "Korea (Democratic People's Republic of)",
  'usa': 'United States of America',
  'us': 'United States of America',
  'america': 'United States of America',
  'uk': 'United Kingdom of Great Britain and Northern Ireland',
  'britain': 'United Kingdom of Great Britain and Northern Ireland',
  'england': 'United Kingdom of Great Britain and Northern Ireland',
  'russia': 'Russian Federation',
  'iran': 'Iran (Islamic Republic of)',
  'laos': "Lao People's Democratic Republic",
  'syria': 'Syrian Arab Republic',
  'venezuela': 'Venezuela (Bolivarian Republic of)',
  'bolivia': 'Bolivia (Plurinational State of)',
  'tanzania': 'Tanzania, United Republic of',
  'moldova': 'Moldova (Republic of)',
  'vatican': 'Vatican City',
  'ivory coast': 'Ivory Coast',
  'czechia': 'Czech Republic',
  'macedonia': 'North Macedonia'
};

// The country-data API returns long OFFICIAL names, but the states API
// (CountriesNow) stores many countries under their SHORT everyday name.
const STATE_API_NAME_OVERRIDES = {
  'United States of America': 'United States',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Korea (Republic of)': 'South Korea',
  "Korea (Democratic People's Republic of)": 'North Korea',
  'Russian Federation': 'Russia',
  'Iran (Islamic Republic of)': 'Iran',
  "Lao People's Democratic Republic": 'Laos',
  'Syrian Arab Republic': 'Syria',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Tanzania, United Republic of': 'Tanzania',
  'Moldova (Republic of)': 'Moldova',
  'Czech Republic': 'Czechia',
  'Vietnam': 'Viet Nam'
};

function formatNumber(n) { return new Intl.NumberFormat('en-US').format(n); }

function setStatus(msg) {
  if (!msg) { statusBox.classList.remove('active'); statusBox.textContent = ''; return; }
  statusBox.classList.add('active');
  statusBox.textContent = msg;
}

function pickBestMatch(data, typedName) {
  const lowerTyped = typedName.toLowerCase();
  const exact = data.find(item => item.name.toLowerCase() === lowerTyped);
  if (exact) return exact;
  const startsWith = data.filter(item => item.name.toLowerCase().startsWith(lowerTyped));
  if (startsWith.length > 0) {
    startsWith.sort((a, b) => a.name.length - b.name.length);
    return startsWith[0];
  }
  return data[0];
}

/* ---------- wishlist heart button (used on every place card) ---------- */
function makeHeart(item) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'heart-btn';

  function paint() {
    const saved = CE.isSaved(item.id);
    btn.classList.toggle('saved', saved);
    btn.textContent = saved ? '♥' : '♡';
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn.setAttribute('aria-label', (saved ? 'Remove from wishlist: ' : 'Add to wishlist: ') + item.title);
  }
  paint();

  btn.addEventListener('click', () => {
    const nowSaved = CE.toggleWishlist(item);
    paint();
    CE.toast(nowSaved ? 'Added "' + item.title + '" to your wishlist' : 'Removed "' + item.title + '" from your wishlist');
  });
  return btn;
}

/* ---------- search ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  fieldMsg.textContent = '';

  const rawQuery = input.value.trim();
  if (rawQuery.length === 0) { fieldMsg.textContent = 'Enter a country name to continue.'; input.focus(); return; }
  if (rawQuery.length < 3) { fieldMsg.textContent = 'Country name should be at least 3 characters.'; input.focus(); return; }
  if (!/^[a-zA-Z\s.'-]+$/.test(rawQuery)) { fieldMsg.textContent = 'Please use letters only — no numbers or symbols.'; input.focus(); return; }

  searchCountry(rawQuery);
});

async function searchCountry(rawQuery) {
  const query = NAME_ALIASES[rawQuery.toLowerCase()] || rawQuery;

  resultBox.classList.remove('active');
  citiesBox.style.display = 'none';
  cityPlacesSection.classList.remove('active');
  setStatus('Looking up ' + rawQuery + ' …');

  try {
    const countryRes = await fetch('https://countries.dev/name/' + encodeURIComponent(query));
    if (!countryRes.ok) throw new Error('not-found');
    const data = await countryRes.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('not-found');

    const c = pickBestMatch(data, query);

    renderCountry(c);
    CE.addRecent(c.name);
    renderRecent();
    setStatus('');
    resultBox.classList.add('active');

    const flightTarget = c.capital || c.name;
    flightLink.href = 'https://www.google.com/travel/flights?q=' + encodeURIComponent('Flights to ' + flightTarget);
    flightSubtext.textContent = 'Search live flight options to ' + flightTarget + '.';

    loadStates(c.name);

    placesGrid.innerHTML = '<p class="empty-note">Finding landmarks near the capital…</p>';
    const capitalCoords = await getCapitalCoords(c.capital, c.latlng);
    if (capitalCoords) {
      loadPlaces(capitalCoords[0], capitalCoords[1], c.name);
    } else {
      placesGrid.innerHTML = '<p class="empty-note">No coordinates available to search nearby landmarks.</p>';
    }

  } catch (err) {
    setStatus('');
    resultBox.classList.remove('active');
    fieldMsg.textContent = 'Couldn\'t find a country called "' + rawQuery + '". Check the spelling and try again.';
  }
}

function renderCountry(c) {
  const currencies = c.currencies ? c.currencies.map(cur => cur.name + ' (' + cur.symbol + ')').join(', ') : '—';
  const languages = c.languages ? c.languages.map(l => l.name).join(', ') : '—';
  const capital = c.capital || '—';
  const flagUrl = c.flags && c.flags.svg ? c.flags.svg : '';

  flagBanner.src = flagUrl;
  flagBanner.alt = 'Flag of ' + c.name;

  countryBody.innerHTML = `
    <div class="country-head">
      <div class="country-name">${esc(c.name)}</div>
    </div>
    <div class="stat-grid">
      <div><div class="stat-label">Capital</div><div class="stat-value">${esc(capital)}</div></div>
      <div><div class="stat-label">Region</div><div class="stat-value">${esc(c.region || '—')}${c.subregion ? ' · ' + esc(c.subregion) : ''}</div></div>
      <div><div class="stat-label">Population</div><div class="stat-value">${c.population ? formatNumber(c.population) : '—'}</div></div>
      <div><div class="stat-label">Currency</div><div class="stat-value">${esc(currencies)}</div></div>
      <div><div class="stat-label">Languages</div><div class="stat-value">${esc(languages)}</div></div>
    </div>
  `;

  // "Add to Wishlist" button for the whole country
  const item = {
    id: 'country:' + c.name,
    type: 'country',
    title: c.name,
    subtitle: (c.capital ? 'Capital: ' + c.capital : '') + (c.region ? (c.capital ? ' · ' : '') + c.region : ''),
    image: flagUrl,
    url: 'explore.html?country=' + encodeURIComponent(c.name)
  };
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-brass save-btn';
  function paintSave() {
    const saved = CE.isSaved(item.id);
    saveBtn.classList.toggle('saved', saved);
    saveBtn.textContent = saved ? '♥ In your wishlist (click to remove)' : '♡ Add to Wishlist';
  }
  paintSave();
  saveBtn.addEventListener('click', () => {
    const nowSaved = CE.toggleWishlist(item);
    paintSave();
    CE.toast(nowSaved ? 'Added ' + item.title + ' to your wishlist' : 'Removed ' + item.title + ' from your wishlist');
  });
  countryBody.appendChild(saveBtn);
}

/* ---------- states and cities ---------- */
async function tryFetchStates(name) {
  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: name })
    });
    const data = await res.json();
    if (!data.error && data.data && data.data.states && data.data.states.length > 0) {
      return data.data.states;
    }
  } catch (err) { /* try the next candidate name */ }
  return null;
}

async function loadStates(countryName) {
  statesChipRow.innerHTML = '<p class="empty-note" style="color:#8a8578;">Loading states…</p>';
  citiesBox.style.display = 'none';
  statesSub.textContent = 'Click a state to see its cities';

  const candidates = [countryName];
  if (STATE_API_NAME_OVERRIDES[countryName]) candidates.push(STATE_API_NAME_OVERRIDES[countryName]);
  const stripped = countryName.replace(/\s*\(.*?\)/, '').trim();
  if (stripped && stripped !== countryName && !candidates.includes(stripped)) candidates.push(stripped);

  let states = null;
  let resolvedName = countryName;
  for (const candidate of candidates) {
    states = await tryFetchStates(candidate);
    if (states) { resolvedName = candidate; break; }
  }

  if (!states) {
    statesChipRow.innerHTML = '<p class="empty-note" style="color:#8a8578;">No state-level data available for this country.</p>';
    return;
  }

  statesChipRow.innerHTML = '';
  states.forEach(state => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'state-chip';
    chip.textContent = state.name;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.state-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadCities(resolvedName, state.name);
    });
    statesChipRow.appendChild(chip);
  });
}

async function loadCities(countryName, stateName) {
  citiesBox.style.display = 'block';
  citiesChipRow.innerHTML = '<p class="empty-note" style="color:#8a8578;">Loading cities…</p>';
  cityPlacesSection.classList.remove('active');

  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: countryName, state: stateName })
    });
    const data = await res.json();

    if (data.error || !data.data || data.data.length === 0) {
      citiesChipRow.innerHTML = '<p class="empty-note" style="color:#8a8578;">No city data available for this state.</p>';
      return;
    }

    citiesChipRow.innerHTML = '';
    data.data.forEach(cityName => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'city-chip';
      chip.textContent = cityName;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.city-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadCityPlaces(cityName, countryName);
      });
      citiesChipRow.appendChild(chip);
    });
  } catch (err) {
    citiesChipRow.innerHTML = '<p class="empty-note" style="color:#8a8578;">Could not load cities right now.</p>';
  }
}

async function loadCityPlaces(cityName, countryName) {
  cityPlacesSection.classList.add('active');
  cityPlacesTitle.textContent = 'Tourist Places in ' + cityName;
  cityPlacesGrid.innerHTML = '<p class="empty-note">Finding landmarks near ' + esc(cityName) + '…</p>';
  cityPlacesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const coords = await getCoordsForPlace(cityName, countryName);
  if (!coords) {
    cityPlacesGrid.innerHTML = '<p class="empty-note">Couldn\'t find location data for ' + esc(cityName) + '.</p>';
    return;
  }
  await loadPlacesInto(coords[0], coords[1], cityName, cityPlacesGrid, false);
}

async function getCoordsForPlace(placeName, countryContext) {
  try {
    const searchQuery = countryContext ? placeName + ' ' + countryContext : placeName;
    const searchUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(searchQuery) + '&srlimit=1&format=json&origin=*';
    const searchData = await (await fetch(searchUrl)).json();
    const bestTitle = (searchData.query && searchData.query.search && searchData.query.search[0])
      ? searchData.query.search[0].title : placeName;

    const coordUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&titles=' + encodeURIComponent(bestTitle) + '&format=json&origin=*';
    const coordData = await (await fetch(coordUrl)).json();
    const page = Object.values(coordData.query.pages)[0];
    if (page && page.coordinates && page.coordinates.length > 0) {
      return [page.coordinates[0].lat, page.coordinates[0].lon];
    }
  } catch (err) { /* null below */ }
  return null;
}

async function getCapitalCoords(capitalName, countryLatlng) {
  if (capitalName) {
    try {
      const url = 'https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&titles=' + encodeURIComponent(capitalName) + '&format=json&origin=*';
      const data = await (await fetch(url)).json();
      const page = Object.values(data.query.pages)[0];
      if (page && page.coordinates && page.coordinates.length > 0) {
        return [page.coordinates[0].lat, page.coordinates[0].lon];
      }
    } catch (err) { /* fall back below */ }
  }
  return (countryLatlng && countryLatlng.length === 2) ? countryLatlng : null;
}

/* ---------- tourist places (with wishlist hearts) ---------- */
async function loadPlacesInto(lat, lon, label, gridEl, updateBg) {
  try {
    const geoUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=' + lat + '%7C' + lon + '&gsradius=10000&gslimit=30&format=json&origin=*';
    const geoData = await (await fetch(geoUrl)).json();
    const places = geoData.query.geosearch;

    if (!places || places.length === 0) {
      gridEl.innerHTML = '<p class="empty-note">No notable landmarks found nearby ' + esc(label) + '.</p>';
      return;
    }

    const titles = places.map(p => p.title).join('|');
    const detailUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages%7Cextracts&exintro=1&explaintext=1&exsentences=1&piprop=thumbnail&pithumbsize=400&titles=' + encodeURIComponent(titles) + '&format=json&origin=*';
    const detailData = await (await fetch(detailUrl)).json();
    const pages = detailData.query.pages;

    gridEl.innerHTML = '';
    const collageImages = [];

    places.forEach(p => {
      const page = Object.values(pages).find(pg => pg.title === p.title);
      const thumb = page && page.thumbnail ? page.thumbnail.source : null;
      if (thumb) collageImages.push(thumb);

      const dist = p.dist < 1000 ? Math.round(p.dist) + ' m away' : (p.dist / 1000).toFixed(1) + ' km away';
      const wikiUrl = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_'));

      const card = document.createElement('div');
      card.className = 'place-card';

      const link = document.createElement('a');
      link.className = 'place-link';
      link.href = wikiUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = `
        ${thumb ? `<img class="place-thumb" src="${esc(thumb)}" alt="${esc(p.title)}">` : `<div class="place-thumb-fallback">No image</div>`}
        <div class="place-body">
          <div class="place-title">${esc(p.title)}</div>
          <div class="place-dist">${dist} · near ${esc(label)}</div>
        </div>
      `;

      const heart = makeHeart({
        id: 'place:' + p.title,
        type: 'place',
        title: p.title,
        subtitle: dist + ' · near ' + label,
        image: thumb || '',
        url: wikiUrl
      });

      card.appendChild(heart);
      card.appendChild(link);
      gridEl.appendChild(card);
    });

    if (updateBg && collageImages.length > 0) {
      const filled = [];
      while (filled.length < 18) filled.push(collageImages[filled.length % collageImages.length]);
      CE.setCollage(filled);
    }
  } catch (err) {
    gridEl.innerHTML = '<p class="empty-note">Couldn\'t load landmarks right now.</p>';
  }
}

async function loadPlaces(lat, lon, countryName) {
  await loadPlacesInto(lat, lon, countryName + "'s capital", placesGrid, true);
}

/* ---------- open a saved country straight from the wishlist ---------- */
(function autoSearchFromUrl() {
  const wanted = new URLSearchParams(window.location.search).get('country');
  if (wanted) {
    input.value = wanted;
    searchCountry(wanted);
  }
})();
