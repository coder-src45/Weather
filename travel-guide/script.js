const API_KEY = "1bf748b3d2efc52ce63c8474e9d7b985";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

const input = document.getElementById("city-input");
const addBtn = document.getElementById("add-btn");
const checkBtn = document.getElementById("check-btn");
const chipsEl = document.getElementById("chips");
const errorEl = document.getElementById("error");
const loadingEl = document.getElementById("loading");
const resultsEl = document.getElementById("results");
const goodTitle = document.getElementById("good-title");
const badTitle = document.getElementById("bad-title");
const goodList = document.getElementById("good-list");
const badList = document.getElementById("bad-list");

let destinations = [];

addBtn.addEventListener("click", addCity);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addCity();
});
checkBtn.addEventListener("click", checkWeather);

function addCity() {
  const city = input.value.trim();
  if (!city) return;
  if (destinations.some((d) => d.toLowerCase() === city.toLowerCase())) return;
  destinations.push(city);
  input.value = "";
  renderChips();
  hide(errorEl);
}

function renderChips() {
  chipsEl.innerHTML = "";
  destinations.forEach((city, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = city;
    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      destinations.splice(i, 1);
      renderChips();
    });
    chip.appendChild(remove);
    chipsEl.appendChild(chip);
  });
}

async function checkWeather() {
  if (!destinations.length) {
    showError("Add at least one destination first.");
    return;
  }
  hide(errorEl);
  hide(resultsEl);
  checkBtn.disabled = true;
  loadingEl.textContent = "Checking destinations...";
  show(loadingEl);

  try {
    const results = await Promise.all(destinations.map(async (city) => {
      const current = await fetchCurrent(city);
      const forecast = await fetchForecast(city);
      return buildReport(city, current, forecast);
    }));
    results.sort((a, b) => b.score - a.score);
    renderResults(results);
  } catch (err) {
    showError("Something went wrong fetching the weather. Check the city names and try again.");
  } finally {
    hide(loadingEl);
    checkBtn.disabled = false;
  }
}

async function fetchCurrent(city) {
  const res = await fetch(
    `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("not found");
  return res.json();
}

async function fetchForecast(city) {
  const res = await fetch(
    `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("not found");
  return res.json();
}

function buildReport(city, current, forecast) {
  const main = current.weather[0].main.toLowerCase();
  const temp = current.main.temp;
  const wind = current.wind.speed;

  const days = groupForecastDays(forecast);
  const rainDays = days.filter((d) => /rain|thunder|snow|drizzle/.test(d.main)).length;
  const snowDays = days.filter((d) => /snow/.test(d.main)).length;

  let score = 100;
  score -= tempPenalty(temp);
  score -= weatherPenalty(main);
  score -= windPenalty(wind);
  score -= rainDays * 10;
  if (snowDays > 0) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  let verdict;
  if (score >= 70) {
    tier = "good";
    verdict = "Great time to visit";
  } else if (score >= 50) {
    tier = "mid";
    verdict = "Acceptable";
  } else {
    tier = "bad";
    verdict = "Avoid";
  }

  return {
    city: `${current.name}, ${current.sys.country}`,
    temp,
    desc: current.weather[0].description,
    icon: current.weather[0].icon,
    humidity: current.main.humidity,
    wind,
    pressure: current.main.pressure,
    score,
    tier,
    verdict,
    days,
  };
}

function tempPenalty(t) {
  if (t >= 18 && t <= 28) return 0;
  if (t < 5 || t > 35) return 35;
  if (t < 10 || t > 32) return 20;
  if (t < 14 || t > 30) return 10;
  return 5;
}

function weatherPenalty(main) {
  if (/thunderstorm/.test(main)) return 35;
  if (/rain|drizzle/.test(main)) return 25;
  if (/snow/.test(main)) return 30;
  if (/mist|fog|haze/.test(main)) return 12;
  if (/clouds/.test(main)) return 8;
  return 0;
}

function windPenalty(w) {
  if (w > 20) return 20;
  if (w > 14) return 12;
  if (w > 8) return 5;
  return 0;
}

function groupForecastDays(data) {
  const byDay = {};
  for (const item of data.list) {
    const day = new Date(item.dt * 1000).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  }
  return Object.keys(byDay).slice(0, 5).map((day) => {
    const items = byDay[day];
    const noon = items.find((i) => i.dt_txt.includes("12:00")) || items[Math.floor(items.length / 2)];
    return {
      label: new Date(day).toLocaleDateString(undefined, { weekday: "short" }),
      temp: noon.main.temp,
      icon: noon.weather[0].icon,
      main: noon.weather[0].main.toLowerCase(),
    };
  });
}

function renderResults(results) {
  goodList.innerHTML = "";
  badList.innerHTML = "";
  const good = results.filter((r) => r.tier === "good");
  const mid = results.filter((r) => r.tier === "mid");
  const bad = results.filter((r) => r.tier === "bad");

  goodTitle.classList.add("hidden");
  badTitle.classList.add("hidden");

  if (good.length || mid.length) {
    goodTitle.textContent = "Nice Weather — Go Here";
    goodTitle.classList.remove("hidden");
    [...good, ...mid].forEach((r) => goodList.appendChild(card(r)));
  }
  if (bad.length) {
    badTitle.textContent = "Bad Weather — Avoid";
    badTitle.classList.remove("hidden");
    bad.forEach((r) => badList.appendChild(card(r)));
  }

  show(resultsEl);
}

function card(r) {
  const el = document.createElement("div");
  el.className = `card ${r.tier}`;
  const color = r.tier === "good" ? "#66bb6a" : r.tier === "mid" ? "#ffb300" : "#ef5350";
  const strip = r.days.map((d) => `
    <div class="forecast-day">
      <p class="day">${d.label}</p>
      <img src="${iconUrl(d.icon)}" alt="icon" />
      <p class="t">${Math.round(d.temp)}°C</p>
    </div>`).join("");

  el.innerHTML = `
    <div class="card-top">
      <div>
        <h3>${r.city}</h3>
        <span class="country">Humidity ${r.humidity}% · Pressure ${r.pressure} hPa</span>
      </div>
      <img src="${iconUrl(r.icon)}" alt="weather icon" style="width:40px;height:40px" />
    </div>
    <div class="main">
      <img src="${iconUrl(r.icon)}" alt="weather icon" />
      <div>
        <p class="temp">${Math.round(r.temp)}°C</p>
        <p class="desc">${r.desc}</p>
      </div>
    </div>
    <div class="score-row">
      <div class="score-bar"><div class="score-fill" style="width:${r.score}%;background:${color}"></div></div>
      <span class="score-val">${r.score}</span>
    </div>
    <div class="verdict ${r.tier}">${r.verdict}</div>
    <div class="details">
      <span>Wind ${r.wind} m/s</span>
      <span>5-day forecast</span>
    </div>
    <div class="forecast-strip">${strip}</div>
  `;
  return el;
}

function iconUrl(icon) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function showError(msg) {
  errorEl.textContent = msg;
  show(errorEl);
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}