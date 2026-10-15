const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

const DEFAULT_LOCATION = {
  name: "Melbourne",
  admin1: "Victoria",
  country: "Australia",
  latitude: -37.814,
  longitude: 144.96332,
};

const state = {
  unit: localStorage.getItem("weatherwise-unit") || "celsius",
  location: DEFAULT_LOCATION,
  forecast: null,
  searchResults: [],
  activeResult: -1,
  favorites: readFavorites(),
  searchTimer: null,
  toastTimer: null,
};

const elements = {
  todayLabel: document.querySelector("#today-label"),
  searchInput: document.querySelector("#city-search"),
  searchResults: document.querySelector("#search-results"),
  statusBanner: document.querySelector("#status-banner"),
  statusMessage: document.querySelector("#status-message"),
  useLocation: document.querySelector("#use-location"),
  favoriteButton: document.querySelector("#favorite-button"),
  locationName: document.querySelector("#location-name"),
  locationRegion: document.querySelector("#location-region"),
  localTime: document.querySelector("#local-time"),
  currentTemperature: document.querySelector("#current-temperature"),
  currentCondition: document.querySelector("#current-condition"),
  feelsLike: document.querySelector("#feels-like"),
  currentIcon: document.querySelector("#current-icon"),
  forecastSummary: document.querySelector("#forecast-summary"),
  sunriseTime: document.querySelector("#sunrise-time"),
  sunsetTime: document.querySelector("#sunset-time"),
  scoreRing: document.querySelector("#score-ring"),
  scoreValue: document.querySelector("#score-value"),
  planningCopy: document.querySelector("#planning-copy"),
  bestWindowTime: document.querySelector("#best-window-time"),
  hourlyForecast: document.querySelector("#hourly-forecast"),
  rainDetail: document.querySelector("#rain-detail"),
  windDetail: document.querySelector("#wind-detail"),
  humidityDetail: document.querySelector("#humidity-detail"),
  uvDetail: document.querySelector("#uv-detail"),
  weeklyForecast: document.querySelector("#weekly-forecast"),
  updatedLabel: document.querySelector("#updated-label"),
  savedSection: document.querySelector("#saved-section"),
  savedPlaces: document.querySelector("#saved-places"),
  toast: document.querySelector("#toast"),
};

const weatherCodes = {
  0: { label: "Clear sky", type: "clear" },
  1: { label: "Mainly clear", type: "partly" },
  2: { label: "Partly cloudy", type: "partly" },
  3: { label: "Overcast", type: "cloud" },
  45: { label: "Foggy", type: "fog" },
  48: { label: "Icy fog", type: "fog" },
  51: { label: "Light drizzle", type: "rain" },
  53: { label: "Drizzle", type: "rain" },
  55: { label: "Heavy drizzle", type: "rain" },
  56: { label: "Freezing drizzle", type: "rain" },
  57: { label: "Freezing drizzle", type: "rain" },
  61: { label: "Light rain", type: "rain" },
  63: { label: "Rain", type: "rain" },
  65: { label: "Heavy rain", type: "rain" },
  66: { label: "Freezing rain", type: "rain" },
  67: { label: "Heavy freezing rain", type: "rain" },
  71: { label: "Light snow", type: "snow" },
  73: { label: "Snow", type: "snow" },
  75: { label: "Heavy snow", type: "snow" },
  77: { label: "Snow grains", type: "snow" },
  80: { label: "Light showers", type: "rain" },
  81: { label: "Showers", type: "rain" },
  82: { label: "Heavy showers", type: "rain" },
  85: { label: "Snow showers", type: "snow" },
  86: { label: "Heavy snow showers", type: "snow" },
  95: { label: "Thunderstorms", type: "thunder" },
  96: { label: "Thunderstorms with hail", type: "thunder" },
  99: { label: "Severe thunderstorms", type: "thunder" },
};

function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem("weatherwise-favorites") || "[]");
    return Array.isArray(value) ? value.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem("weatherwise-favorites", JSON.stringify(state.favorites));
}

function locationKey(location) {
  return `${Number(location.latitude).toFixed(3)},${Number(location.longitude).toFixed(3)}`;
}

function unitSymbol() {
  return state.unit === "fahrenheit" ? "F" : "C";
}

function round(value) {
  return Math.round(Number(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function showStatus(message, type = "loading") {
  elements.statusBanner.hidden = false;
  elements.statusBanner.classList.toggle("is-error", type === "error");
  elements.statusMessage.textContent = message;
}

function hideStatus() {
  elements.statusBanner.hidden = true;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function formatRegion(location) {
  const parts = [location.admin1, location.country].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : "Selected location";
}

function formatHour(time, includeMinutes = false) {
  const timePart = String(time).split("T")[1] || "00:00";
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(2020, 0, 1, hour, minute || 0);
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: includeMinutes ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
}

function formatDay(dateString, index) {
  if (index === 0) return "Today";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(date);
}

function getWeather(code) {
  return weatherCodes[code] || { label: "Changing conditions", type: "cloud" };
}

function weatherIcon(code, isDay = 1) {
  const weather = getWeather(code);
  const sky = isDay ? '<i class="symbol-sun"></i>' : '<i class="symbol-moon"></i>';
  const cloud = '<i class="symbol-cloud"></i>';

  if (weather.type === "clear") {
    return `<span class="weather-symbol clear">${sky}</span>`;
  }
  if (weather.type === "partly") {
    return `<span class="weather-symbol">${sky}${cloud}</span>`;
  }
  if (weather.type === "rain") {
    return `<span class="weather-symbol">${cloud}<i class="symbol-rain"></i></span>`;
  }
  if (weather.type === "snow") {
    return `<span class="weather-symbol">${cloud}<i class="symbol-snow">••</i></span>`;
  }
  if (weather.type === "thunder") {
    return `<span class="weather-symbol">${cloud}<i class="symbol-rain"></i><i class="symbol-bolt"></i></span>`;
  }
  if (weather.type === "fog") {
    return '<span class="weather-symbol"><i class="symbol-fog"></i></span>';
  }
  return `<span class="weather-symbol">${cloud}</span>`;
}

function buildForecastUrl(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "is_day",
      "apparent_temperature",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_probability_max",
    ].join(","),
    temperature_unit: state.unit,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    timezone: "auto",
    forecast_days: "7",
  });

  return `${FORECAST_API}?${params.toString()}`;
}

async function loadForecast(location, options = {}) {
  state.location = location;
  updateFavoriteButton();
  showStatus(`Loading the latest forecast for ${location.name}…`);

  try {
    const response = await fetch(buildForecastUrl(location));
    if (!response.ok) throw new Error(`Forecast request failed (${response.status})`);
    const forecast = await response.json();
    state.forecast = forecast;
    renderForecast();
    hideStatus();
    if (options.announce) showToast(`Forecast updated for ${location.name}`);
  } catch (error) {
    console.error(error);
    showStatus("We couldn’t reach the weather service. Check your connection and try again.", "error");
  }
}

function currentHourIndex(forecast) {
  const exact = forecast.hourly.time.indexOf(forecast.current.time);
  if (exact >= 0) return exact;
  const currentHour = forecast.current.time.slice(0, 13);
  const partial = forecast.hourly.time.findIndex((time) => time.startsWith(currentHour));
  return partial >= 0 ? partial : 0;
}

function renderForecast() {
  const forecast = state.forecast;
  const current = forecast.current;
  const daily = forecast.daily;
  const weather = getWeather(current.weather_code);
  const hourIndex = currentHourIndex(forecast);
  const rainNow = forecast.hourly.precipitation_probability[hourIndex] ?? 0;

  elements.locationName.textContent = state.location.name;
  elements.locationRegion.textContent = formatRegion(state.location);
  elements.localTime.textContent = `Local time ${formatHour(current.time, true)} · ${forecast.timezone_abbreviation || ""}`;
  elements.currentTemperature.innerHTML = `${round(current.temperature_2m)}<sup>°${unitSymbol()}</sup>`;
  elements.currentCondition.textContent = weather.label;
  elements.feelsLike.textContent = `Feels like ${round(current.apparent_temperature)}°`;
  elements.currentIcon.innerHTML = weatherIcon(current.weather_code, current.is_day);
  elements.sunriseTime.textContent = formatHour(daily.sunrise[0], true);
  elements.sunsetTime.textContent = formatHour(daily.sunset[0], true);
  elements.forecastSummary.textContent = buildDailySummary(forecast);

  elements.rainDetail.textContent = `${round(rainNow)}%`;
  elements.windDetail.textContent = `${round(current.wind_speed_10m)} km/h`;
  elements.humidityDetail.textContent = `${round(current.relative_humidity_2m)}%`;
  elements.uvDetail.textContent = `${round(daily.uv_index_max[0])} · ${uvLabel(daily.uv_index_max[0])}`;
  elements.updatedLabel.textContent = `Updated ${formatHour(current.time, true)}`;

  renderOutdoorOutlook(forecast, hourIndex);
  renderHourly(forecast, hourIndex);
  renderWeekly(forecast);
  updateFavoriteButton();
  renderFavorites();
}

function buildDailySummary(forecast) {
  const daily = forecast.daily;
  const high = round(daily.temperature_2m_max[0]);
  const low = round(daily.temperature_2m_min[0]);
  const rain = round(daily.precipitation_probability_max[0] || 0);
  const weather = getWeather(daily.weather_code[0]).label.toLowerCase();

  if (rain >= 60) {
    return `${weather} through the day. A high of ${high}° and low of ${low}°, with rain likely — keep an umbrella close.`;
  }
  if (rain >= 30) {
    return `${weather} with a high of ${high}° and low of ${low}°. A brief shower is possible.`;
  }
  return `${weather} with a high of ${high}° and low of ${low}°. Little rain is expected today.`;
}

function uvLabel(value) {
  if (value >= 11) return "Extreme";
  if (value >= 8) return "Very high";
  if (value >= 6) return "High";
  if (value >= 3) return "Moderate";
  return "Low";
}

function comfortScore(temp, rain, wind, isDay) {
  const ideal = state.unit === "fahrenheit" ? 70 : 21;
  const tempPenalty = Math.abs(temp - ideal) * (state.unit === "fahrenheit" ? 1.5 : 3);
  const rainPenalty = rain * 0.62;
  const windPenalty = Math.max(0, wind - 14) * 1.25;
  const nightPenalty = isDay ? 0 : 12;
  return clamp(100 - tempPenalty - rainPenalty - windPenalty - nightPenalty, 0, 100);
}

function renderOutdoorOutlook(forecast, startIndex) {
  const endIndex = Math.min(startIndex + 24, forecast.hourly.time.length);
  const windows = [];

  for (let index = startIndex; index < endIndex - 1; index += 1) {
    let total = 0;
    let count = 0;
    for (let offset = 0; offset < 3 && index + offset < endIndex; offset += 1) {
      const item = index + offset;
      total += comfortScore(
        forecast.hourly.temperature_2m[item],
        forecast.hourly.precipitation_probability[item] || 0,
        forecast.hourly.wind_speed_10m[item] || 0,
        forecast.hourly.is_day[item]
      );
      count += 1;
    }
    windows.push({ index, score: total / count });
  }

  const best = windows.sort((a, b) => b.score - a.score)[0] || { index: startIndex, score: 0 };
  const score = round(best.score);
  const start = forecast.hourly.time[best.index];
  const end = forecast.hourly.time[Math.min(best.index + 3, forecast.hourly.time.length - 1)];
  const rain = round(forecast.hourly.precipitation_probability[best.index] || 0);
  const temp = round(forecast.hourly.temperature_2m[best.index]);

  elements.scoreValue.textContent = score;
  elements.scoreRing.style.setProperty("--score", `${score}%`);
  elements.bestWindowTime.textContent = `${formatHour(start)} – ${formatHour(end)}`;

  if (score >= 80) {
    elements.planningCopy.textContent = `Excellent conditions around ${formatHour(start)} — about ${temp}° with only a ${rain}% chance of rain.`;
  } else if (score >= 60) {
    elements.planningCopy.textContent = `Your most comfortable window begins around ${formatHour(start)}. Conditions should be manageable outside.`;
  } else {
    elements.planningCopy.textContent = `Conditions are mixed today. Your best option starts near ${formatHour(start)}, so plan a shorter outing.`;
  }
}

function renderHourly(forecast, startIndex) {
  const endIndex = Math.min(startIndex + 24, forecast.hourly.time.length);
  const temperatures = forecast.hourly.temperature_2m.slice(startIndex, endIndex);
  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = Math.max(max - min, 1);

  elements.hourlyForecast.replaceChildren();

  for (let index = startIndex; index < endIndex; index += 1) {
    const item = document.createElement("div");
    const temperature = forecast.hourly.temperature_2m[index];
    const rain = round(forecast.hourly.precipitation_probability[index] || 0);
    const position = 38 + ((max - temperature) / range) * 72;
    item.className = `hour-item${index === startIndex ? " is-now" : ""}`;
    item.style.setProperty("--temp-position", `${position}px`);
    item.innerHTML = `
      <span class="hour-temp-marker"><strong>${round(temperature)}°</strong></span>
      <span class="hour-rain">${rain}%</span>
      <span class="hour-label">${index === startIndex ? "Now" : formatHour(forecast.hourly.time[index])}</span>
    `;
    elements.hourlyForecast.append(item);
  }
}

function renderWeekly(forecast) {
  elements.weeklyForecast.replaceChildren();

  forecast.daily.time.forEach((date, index) => {
    const item = document.createElement("div");
    const code = forecast.daily.weather_code[index];
    const weather = getWeather(code);
    const rain = round(forecast.daily.precipitation_probability_max[index] || 0);
    item.className = "day-item";
    item.innerHTML = `
      <p class="day-name">${formatDay(date, index)}</p>
      <div class="day-icon-row">
        <span class="weather-icon" aria-hidden="true">${weatherIcon(code, 1)}</span>
        <span class="day-rain">${rain}% rain</span>
      </div>
      <p class="day-temps"><strong>${round(forecast.daily.temperature_2m_max[index])}°</strong><span>${round(forecast.daily.temperature_2m_min[index])}°</span></p>
      <p class="day-condition">${weather.label}</p>
    `;
    elements.weeklyForecast.append(item);
  });
}

async function searchLocations(query) {
  if (query.trim().length < 2) {
    closeSearchResults();
    return;
  }

  try {
    const params = new URLSearchParams({ name: query.trim(), count: "6", language: "en", format: "json" });
    const response = await fetch(`${GEOCODING_API}?${params.toString()}`);
    if (!response.ok) throw new Error("Location search failed");
    const data = await response.json();
    state.searchResults = data.results || [];
    state.activeResult = -1;
    renderSearchResults();
  } catch (error) {
    console.error(error);
    state.searchResults = [];
    renderSearchResults("Search is temporarily unavailable.");
  }
}

function renderSearchResults(message) {
  elements.searchResults.replaceChildren();
  elements.searchResults.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");

  if (message || state.searchResults.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-result";
    empty.textContent = message || "No matching places found.";
    elements.searchResults.append(empty);
    return;
  }

  state.searchResults.forEach((result, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `search-result${index === state.activeResult ? " is-active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === state.activeResult));

    const name = document.createElement("span");
    const strong = document.createElement("strong");
    const small = document.createElement("small");
    const country = document.createElement("span");
    strong.textContent = result.name;
    small.textContent = [result.admin1, result.admin2].filter(Boolean).join(", ") || result.country;
    country.textContent = result.country_code || "";
    name.append(strong, small);
    button.append(name, country);
    button.addEventListener("click", () => selectSearchResult(index));
    elements.searchResults.append(button);
  });
}

function selectSearchResult(index) {
  const result = state.searchResults[index];
  if (!result) return;
  const location = {
    name: result.name,
    admin1: result.admin1,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
  elements.searchInput.value = "";
  closeSearchResults();
  loadForecast(location, { announce: true });
}

function closeSearchResults() {
  state.searchResults = [];
  state.activeResult = -1;
  elements.searchResults.hidden = true;
  elements.searchInput.setAttribute("aria-expanded", "false");
}

function handleSearchKeydown(event) {
  if (event.key === "Escape") {
    closeSearchResults();
    return;
  }
  if (state.searchResults.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.activeResult = (state.activeResult + 1) % state.searchResults.length;
    renderSearchResults();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.activeResult = (state.activeResult - 1 + state.searchResults.length) % state.searchResults.length;
    renderSearchResults();
  } else if (event.key === "Enter" && state.activeResult >= 0) {
    event.preventDefault();
    selectSearchResult(state.activeResult);
  }
}

function useCurrentLocation() {
  if (!("geolocation" in navigator)) {
    showToast("Location access is not supported by this browser.");
    return;
  }

  showStatus("Finding your current location…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        name: "Current location",
        admin1: `${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`,
        country: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      loadForecast(location, { announce: true });
    },
    () => {
      showStatus("We couldn’t access your location. Search for your city instead.", "error");
      window.setTimeout(hideStatus, 4500);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

function toggleFavorite() {
  const key = locationKey(state.location);
  const index = state.favorites.findIndex((item) => locationKey(item) === key);

  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast(`${state.location.name} removed from saved places`);
  } else {
    state.favorites.unshift({ ...state.location });
    state.favorites = state.favorites.slice(0, 6);
    showToast(`${state.location.name} saved`);
  }

  saveFavorites();
  updateFavoriteButton();
  renderFavorites();
}

function updateFavoriteButton() {
  const isSaved = state.favorites.some((item) => locationKey(item) === locationKey(state.location));
  elements.favoriteButton.classList.toggle("is-saved", isSaved);
  elements.favoriteButton.setAttribute("aria-label", isSaved ? "Remove this saved location" : "Save this location");
  elements.favoriteButton.title = isSaved ? "Remove saved location" : "Save this location";
}

function renderFavorites() {
  elements.savedSection.hidden = state.favorites.length === 0;
  elements.savedPlaces.replaceChildren();

  state.favorites.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-place";

    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const region = document.createElement("small");
    const arrow = document.createElement("span");
    name.textContent = location.name;
    region.textContent = formatRegion(location);
    arrow.className = "saved-arrow";
    arrow.textContent = "↗";
    copy.append(name, region);
    button.append(copy, arrow);
    button.addEventListener("click", () => loadForecast(location, { announce: true }));
    elements.savedPlaces.append(button);
  });
}

function setUnit(unit) {
  if (unit === state.unit) return;
  state.unit = unit;
  localStorage.setItem("weatherwise-unit", unit);
  document.querySelectorAll("[data-unit]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.unit === unit);
  });
  loadForecast(state.location);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    window.clearTimeout(state.searchTimer);
    const query = event.target.value;
    state.searchTimer = window.setTimeout(() => searchLocations(query), 300);
  });
  elements.searchInput.addEventListener("keydown", handleSearchKeydown);
  elements.useLocation.addEventListener("click", useCurrentLocation);
  elements.favoriteButton.addEventListener("click", toggleFavorite);
  document.querySelectorAll("[data-unit]").forEach((button) => {
    button.addEventListener("click", () => setUnit(button.dataset.unit));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-area")) closeSearchResults();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function initialise() {
  const today = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  elements.todayLabel.textContent = `FORECAST FOR ${today.toUpperCase()}`;
  document.querySelectorAll("[data-unit]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.unit === state.unit);
  });
  bindEvents();
  renderFavorites();
  loadForecast(DEFAULT_LOCATION);
}

initialise();
