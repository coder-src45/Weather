const API_KEY = "1bf748b3d2efc52ce63c8474e9d7b985";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const unitToggle = document.getElementById("unit-toggle");
const errorEl = document.getElementById("error");
const currentEl = document.getElementById("current");
const forecastEl = document.getElementById("forecast");

let unit = "metric";
let currentCity = "London";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;
  currentCity = city;
  await getWeather(city);
  input.value = "";
});

unitToggle.addEventListener("click", async () => {
  unit = unit === "metric" ? "imperial" : "metric";
  unitToggle.textContent = unit === "metric" ? "°F" : "°C";
  await getWeather(currentCity);
});

async function getWeather(city) {
  hide(errorEl);
  try {
    const current = await fetchCurrent(city);
    const forecast = await fetchForecast(city);
    await renderCurrent(current);
    renderForecast(forecast);
    show(currentEl);
    show(forecastEl);
  } catch (err) {
    hide(currentEl);
    hide(forecastEl);
    errorEl.textContent = "Couldn't find that city. Check the name and try again.";
    show(errorEl);
  }
}

async function fetchCurrent(city) {
  const res = await fetch(
    `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("not found");
  return res.json();
}

async function fetchForecast(city) {
  const res = await fetch(
    `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${unit}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("not found");
  return res.json();
}

async function fetchUv(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("not found");
  return res.json();
}

function uvCategory(value) {
  if (value <= 2) return { label: "Low", color: "#7cb342" };
  if (value <= 5) return { label: "Moderate", color: "#ffb300" };
  if (value <= 7) return { label: "High", color: "#ff7043" };
  if (value <= 10) return { label: "Very High", color: "#e53935" };
  return { label: "Extreme", color: "#ab47bc" };
}

const tempUnit = () => (unit === "metric" ? "°C" : "°F");
const windUnit = () => (unit === "metric" ? "m/s" : "mph");

async function renderCurrent(data) {
  document.getElementById("city-name").textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById("date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("temperature").textContent = `${Math.round(data.main.temp)}${tempUnit()}`;
  document.getElementById("description").textContent = data.weather[0].description;
  document.getElementById("weather-icon").src = iconUrl(data.weather[0].icon);
  document.getElementById("feels-like").textContent = `${Math.round(data.main.feels_like)}${tempUnit()}`;
  document.getElementById("humidity").textContent = `${data.main.humidity}%`;
  document.getElementById("wind").textContent = `${data.wind.speed} ${windUnit()}`;
  document.getElementById("pressure").textContent = `${data.main.pressure} hPa`;
  setSky(data.weather[0].main, data.wind.speed);

  const uvEl = document.getElementById("uv");
  try {
    const uv = await fetchUv(data.coord.lat, data.coord.lon);
    const cat = uvCategory(uv.value);
    uvEl.textContent = `${uv.value.toFixed(1)} ${cat.label}`;
    uvEl.style.color = cat.color;
  } catch {
    uvEl.textContent = "N/A";
  }
}

function renderForecast(data) {
  const list = document.getElementById("forecast-list");
  list.innerHTML = "";
  const byDay = {};
  for (const item of data.list) {
    const day = new Date(item.dt * 1000).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  }
  Object.keys(byDay)
    .slice(0, 5)
    .forEach((day) => {
      const items = byDay[day];
      const noon = items.find((i) => i.dt_txt.includes("12:00")) || items[Math.floor(items.length / 2)];
      const div = document.createElement("div");
      div.className = "forecast-day";
      const label = new Date(day).toLocaleDateString(undefined, { weekday: "short" });
      div.innerHTML = `
        <p class="day">${label}</p>
        <img src="${iconUrl(noon.weather[0].icon)}" alt="icon" />
        <p class="temp">${Math.round(noon.main.temp)}${tempUnit()}</p>
      `;
      list.appendChild(div);
    });
}

function iconUrl(icon) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

getWeather("London");