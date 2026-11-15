
// ===================================
// WEATHERWISE - MAIN JAVASCRIPT
// ===================================

// FIXED LOGIN CREDENTIALS
const FIXED_USERNAME = "admin";
const FIXED_PASSWORD = "weather123";

const loginPage = document.getElementById("loginPage");
const dashboard = document.getElementById("dashboard");
const statusText = document.getElementById("status");

let map;
let marker;
let weatherChart;
let currentLat = 26.8467;
let currentLon = 80.9462;
let currentCity = "Lucknow";
let forecastData = null;
let darkMode = false;

// LOGIN
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
    document.getElementById("loginError").textContent = "";
    loginPage.classList.add("hidden");
    dashboard.classList.remove("hidden");

    setTimeout(() => {
      initializeMap();
      loadWeather(currentLat, currentLon, "Lucknow");
    }, 300);
  } else {
    document.getElementById("loginError").textContent =
      "Invalid username or password. Please try again.";
  }
});

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", function() {
  dashboard.classList.add("hidden");
  loginPage.classList.remove("hidden");
  document.getElementById("loginForm").reset();
  document.getElementById("status").textContent =
    "Please log in to view weather.";
});

// THEME
document.getElementById("themeBtn").addEventListener("click", function() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark", darkMode);
  this.textContent = darkMode ? "☀️" : "🌙";
});

// WEATHER CODE DESCRIPTION
function weatherInfo(code) {
  const codes = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    71: ["Light snowfall", "🌨️"],
    73: ["Snowfall", "❄️"],
    75: ["Heavy snow", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Heavy showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Heavy thunderstorm", "⛈️"]
  };

  return codes[code] || ["Weather conditions", "🌤️"];
}

// SEARCH CITY
document.getElementById("searchBtn").addEventListener("click", searchCity);

document.getElementById("cityInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchCity();
});

async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();

  if (!city) {
    statusText.textContent = "Please enter a city name.";
    return;
  }

  statusText.textContent = "Searching for " + city + "...";

  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(city) + "&count=1&language=en&format=json";

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("City not found. Try another city.");
    }

    const place = data.results[0];
    const fullName = place.name +
      (place.admin1 ? ", " + place.admin1 : "") +
      (place.country ? ", " + place.country : "");

    loadWeather(place.latitude, place.longitude, fullName);

  } catch (error) {
    statusText.textContent = error.message;
  }
}

// CURRENT LOCATION
document.getElementById("locationBtn").addEventListener("click", function() {
  if (!navigator.geolocation) {
    statusText.textContent = "Geolocation is not supported by this browser.";
    return;
  }

  statusText.textContent = "Getting your current location...";

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      let name = "My Current Location";

      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          name = data.results[0].name;
        }
      } catch (e) {
        // Keep default location name
      }

      loadWeather(lat, lon, name);
    },
    () => {
      statusText.textContent =
        "Location permission denied. Please allow location access.";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// LOAD WEATHER
async function loadWeather(lat, lon, city) {
  currentLat = lat;
  currentLon = lon;
  currentCity = city;

  statusText.textContent = "Updating weather for " + city + "...";

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature," +
      "is_day,precipitation,weather_code,wind_speed_10m,surface_pressure" +
      "&hourly=temperature_2m,relative_humidity_2m,uv_index" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max" +
      "&timezone=auto&forecast_days=5";

    const response = await fetch(url);

    if (!response.ok) throw new Error("Weather service is unavailable.");

    const data = await response.json();
    forecastData = data;

    renderCurrentWeather(data);
    renderForecast(data);
    renderChart(data);
    loadAirQuality(lat, lon);
    updateMap(lat, lon, city);

    statusText.textContent = "Weather successfully updated for " + city + ".";
  } catch (error) {
    statusText.textContent =
      "Could not load weather. Check your internet and try again.";
    console.error(error);
  }
}

// CURRENT WEATHER DISPLAY
function renderCurrentWeather(data) {
  const c = data.current;
  const info = weatherInfo(c.weather_code);

  document.getElementById("placeName").textContent =
    currentCity.toUpperCase();

  document.getElementById("weatherDescription").textContent = info[0];
  document.getElementById("weatherIcon").textContent = info[1];

  document.getElementById("temperature").textContent =
    Math.round(c.temperature_2m) + "°";

  document.getElementById("feelsLike").textContent =
    "Feels like " + Math.round(c.apparent_temperature) + "°C";

  document.getElementById("humidity").textContent =
    c.relative_humidity_2m + "%";

  document.getElementById("wind").textContent =
    c.wind_speed_10m + " km/h";

  document.getElementById("pressure").textContent =
    Math.round(c.surface_pressure) + " hPa";

  document.getElementById("uv").textContent =
    data.daily.uv_index_max[0];

  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}

// FIVE DAY FORECAST
function renderForecast(data) {
  const container = document.getElementById("forecast");
  container.innerHTML = "";

  const days = data.daily;

  days.time.forEach((date, index) => {
    const info = weatherInfo(days.weather_code[index]);

    const dayName = index === 0
      ? "Today"
      : new Date(date + "T12:00:00").toLocaleDateString("en", {
          weekday: "short"
        });

    const card = document.createElement("div");
    card.className = "forecast-card" + (index === 0 ? " active" : "");

    card.innerHTML = `
      <small>${dayName}</small>
      <div class="forecast-icon">${info[1]}</div>
      <h3>${Math.round(days.temperature_2m_max[index])}°</h3>
      <p>Low ${Math.round(days.temperature_2m_min[index])}°</p>
      <p>${info[0]}</p>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".forecast-card").forEach(item => {
        item.classList.remove("active");
      });
      card.classList.add("active");
    });

    container.appendChild(card);
  });
}

// HOURLY CHART
function renderChart(data) {
  const times = data.hourly.time;
  const temperatures = data.hourly.temperature_2m;

  const now = new Date();
  let startIndex = times.findIndex(t => new Date(t) >= now);

  if (startIndex < 0) startIndex = 0;

  const labels = times.slice(startIndex, startIndex + 12).map(t =>
    new Date(t).toLocaleTimeString("en", {
      hour: "numeric",
      hour12: true
    })
  );

  const values = temperatures.slice(startIndex, startIndex + 12);

  if (weatherChart) weatherChart.destroy();

  const ctx = document.getElementById("weatherChart");

  weatherChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperature °C",
        data: values,
        borderColor: "#6378ff",
        backgroundColor: "rgba(99,120,255,.15)",
        fill: true,
        tension: .4,
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          title: { display: true, text: "Temperature (°C)" }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// AIR QUALITY
async function loadAirQuality(lat, lon) {
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      "&current=european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide";

    const response = await fetch(url);
    const data = await response.json();

    const aqi = data.current.european_aqi;

    document.getElementById("aqiValue").textContent =
      Math.round(aqi);

    document.getElementById("pm25").textContent =
      data.current.pm2_5 + " µg/m³";

    document.getElementById("pm10").textContent =
      data.current.pm10 + " µg/m³";

    document.getElementById("ozone").textContent =
      data.current.ozone + " µg/m³";

    document.getElementById("no2").textContent =
      data.current.nitrogen_dioxide + " µg/m³";

    let label, advice, color;

    if (aqi <= 20) {
      label = "Good";
      advice = "Air quality is good. Enjoy outdoor activities.";
      color = "#24a978";
    } else if (aqi <= 40) {
      label = "Fair";
      advice = "Air quality is acceptable for most people.";
      color = "#91b93e";
    } else if (aqi <= 60) {
      label = "Moderate";
      advice = "Sensitive people should consider limiting long outdoor activity.";
      color = "#e5a52d";
    } else if (aqi <= 80) {
      label = "Poor";
      advice = "Reduce prolonged outdoor exertion.";
      color = "#e87936";
    } else if (aqi <= 100) {
      label = "Very Poor";
      advice = "Avoid prolonged outdoor activity if possible.";
      color = "#db4c55";
    } else {
      label = "Extremely Poor";
      advice = "Limit outdoor exposure and follow local health guidance.";
      color = "#9d4bc4";
    }

    document.getElementById("aqiLabel").textContent = label;
    document.getElementById("aqiAdvice").textContent = advice;
    document.getElementById("aqiValue").style.color = color;

  } catch (error) {
    document.getElementById("aqiLabel").textContent =
      "Air quality unavailable";
    document.getElementById("aqiAdvice").textContent =
      "Please try again later.";
  }
}

// INTERACTIVE MAP
function initializeMap() {
  if (map) {
    setTimeout(() => map.invalidateSize(), 200);
    return;
  }

  map = L.map("weatherMap").setView([currentLat, currentLon], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.on("click", async function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    statusText.textContent = "Checking weather at selected map location...";

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`
      );
      const data = await response.json();

      let name = "Selected Map Location";

      if (data.results && data.results[0]) {
        name = data.results[0].name;
      }

      loadWeather(lat, lon, name);
    } catch (error) {
      loadWeather(lat, lon, "Selected Map Location");
    }
  });
}

function updateMap(lat, lon, city) {
  if (!map) return;

  map.setView([lat, lon], 10);

  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(
    `<b>${city}</b><br>Weather location selected`
  ).openPopup();
}

// INITIAL DATE
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString();

// The dashboard starts after successful login.
// Default weather location: Lucknow.
