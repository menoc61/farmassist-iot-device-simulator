const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/ws";

let token = localStorage.getItem("token");
let ws = null;
let messageCount = 0;
let devices = new Map();
let alerts = [];
let telemetryHistory = [];

// Login
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.success) {
      token = data.data.token;
      localStorage.setItem("token", token);
      document.getElementById("loginModal").classList.add("hidden");
      initDashboard();
    } else {
      alert("Login failed: " + data.error);
    }
  } catch (error) {
    alert("Login error: " + error.message);
  }
}

// Initialize dashboard
function initDashboard() {
  connectWebSocket();
  fetchStats();
  fetchDevices();
  fetchAlerts();
  setInterval(fetchStats, 30000);
}

// WebSocket connection
function connectWebSocket() {
  updateConnectionStatus("connecting");

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[WS] Connected");
    updateConnectionStatus("connected");
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error("[WS] Parse error:", error);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected");
    updateConnectionStatus("disconnected");
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error("[WS] Error:", error);
  };
}

function handleWebSocketMessage(message) {
  messageCount++;
  document.getElementById("msgCount").textContent = messageCount;

  switch (message.type) {
    case "telemetry":
      handleTelemetry(message.payload);
      break;
    case "toast":
      showToast(message.payload);
      break;
    case "connected":
      document.getElementById("wsClients").textContent = "1";
      break;
  }
}

function handleTelemetry(payload) {
  const deviceId = payload.device_id;
  devices.set(deviceId, {
    id: deviceId,
    farmId: payload.farm_id,
    type: payload.device_type,
    sensors: payload.sensors,
    actuators: payload.actuators,
    meta: payload.meta,
    lastSeen: Date.now(),
    alerts: payload.alerts || [],
  });

  telemetryHistory.unshift({
    time: new Date(),
    deviceId,
    sensors: payload.sensors,
  });
  if (telemetryHistory.length > 50) telemetryHistory.pop();

  updateDevicesUI();
  updateTelemetryLog();
}

function updateConnectionStatus(status) {
  const dot = document.getElementById("wsStatusDot");
  const text = document.getElementById("wsStatusText");
  dot.className = "status-dot " + status;
  text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function showToast(toast) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${toast.type}`;
  el.innerHTML = `
        <span style="font-size: 1.25rem;">${getToastIcon(toast.type)}</span>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${toast.title}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${toast.message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
      `;
  container.appendChild(el);
  setTimeout(() => el.remove(), toast.duration || 5000);
}

function getToastIcon(type) {
  const icons = { success: "✅", warning: "⚠️", error: "🚨", info: "ℹ️" };
  return icons[type] || "ℹ️";
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById("totalDevices").textContent = data.data.devices;
      document.getElementById("totalFarms").textContent = data.data.farms;
      document.getElementById("telemetryCount").textContent =
        data.data.telemetry.toLocaleString();
      document.getElementById("activeAlerts").textContent =
        data.data.activeAlerts;
    }
  } catch (error) {
    console.error("Stats error:", error);
  }
}

async function fetchDevices() {
  try {
    const res = await fetch(`${API_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      data.data.forEach((d) => {
        devices.set(d.deviceId, {
          ...d,
          lastSeen: d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0,
        });
      });
      updateDevicesUI();
    }
  } catch (error) {
    console.error("Devices error:", error);
  }
}

async function fetchAlerts() {
  try {
    const res = await fetch(`${API_URL}/api/alerts/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      alerts = data.data.alerts;
      updateAlertsUI();
    }
  } catch (error) {
    console.error("Alerts error:", error);
  }
}

function updateDevicesUI() {
  const container = document.getElementById("devicesContainer");
  if (devices.size === 0) {
    container.innerHTML =
      '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No devices found</div>';
    return;
  }

  container.innerHTML = "";
  devices.forEach((device, id) => {
    const hasAlerts = device.alerts && device.alerts.length > 0;
    const isRecent = Date.now() - device.lastSeen < 120000;
    const sensors = device.sensors || device.telemetry?.[0] || {};
    const isVertical =
      device.deviceType === "vertical_sensor" || device.type === "vertical";

    const card = document.createElement("div");
    card.className = `device-card ${hasAlerts ? "alert" : ""}`;
    card.innerHTML = `
          <div class="device-header">
            <span class="device-name">${device.name || id}</span>
            <span class="device-status ${isRecent ? "online" : "offline"}">
              ${isRecent ? "● ONLINE" : "○ OFFLINE"}
            </span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem; text-transform: uppercase;">
            ${isVertical ? "VERTICAL NFT" : "HORIZONTAL"} | ${device.zone || "N/A"}
          </div>
          <div class="sensor-grid">
            ${
              isVertical
                ? `
              <div class="sensor-item">
                <span class="sensor-label">EC</span>
                <span class="sensor-value">${formatValue(sensors.ecSolution || sensors.ec_solution)}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">pH</span>
                <span class="sensor-value">${formatValue(sensors.phSolution || sensors.ph_solution)}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">DO</span>
                <span class="sensor-value">${formatValue(sensors.doMgl || sensors.do_mgl, " mg/L")}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Water Level</span>
                <span class="sensor-value">${formatValue(sensors.waterLevelPct || sensors.water_level_pct, "%")}</span>
              </div>
            `
                : `
              <div class="sensor-item">
                <span class="sensor-label">Temperature</span>
                <span class="sensor-value">${formatValue(sensors.tempAir || sensors.temp_air, "°C")}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Humidity</span>
                <span class="sensor-value">${formatValue(sensors.humidity, "%")}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Moisture</span>
                <span class="sensor-value">${formatValue(sensors.moisture1 || sensors.moisture_1, "%")}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Salinity</span>
                <span class="sensor-value">${formatValue(sensors.salinity)}</span>
              </div>
            `
            }
          </div>
          ${
            device.meta
              ? `
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
              <span>🔋 ${device.meta.battery_pct || device.meta.batteryPct || "-"}%</span>
              <span>📶 ${device.meta.wifi_rssi || device.meta.wifiRssi || "-"} dBm</span>
            </div>
          `
              : ""
          }
        `;
    container.appendChild(card);
  });
}

function updateAlertsUI() {
  const container = document.getElementById("alertsContainer");
  const count = document.getElementById("alertsCount");

  count.textContent = `${alerts.length} alert${alerts.length !== 1 ? "s" : ""}`;

  if (alerts.length === 0) {
    container.innerHTML =
      '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No active alerts</div>';
    return;
  }

  container.innerHTML = "";
  alerts.slice(0, 20).forEach((alert) => {
    const item = document.createElement("div");
    item.className = "alert-item";
    item.innerHTML = `
          <div class="alert-icon ${alert.severity}">
            ${alert.severity === "critical" ? "🚨" : "⚠️"}
          </div>
          <div class="alert-content">
            <div class="alert-title">${alert.alertType}</div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-time">${new Date(alert.createdAt).toLocaleString()}</div>
          </div>
        `;
    container.appendChild(item);
  });
}

function updateTelemetryLog() {
  const container = document.getElementById("telemetryLog");
  if (telemetryHistory.length === 0) return;

  container.innerHTML = "";
  telemetryHistory.slice(0, 50).forEach((entry) => {
    const sensors = entry.sensors || {};
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `
          <span class="log-time">${entry.time.toLocaleTimeString()}</span>
          <span class="log-device">${entry.deviceId}</span>
          <div class="log-data">
            <span>T: ${formatValue(sensors.tempAir || sensors.temp_air, "°C")}</span>
            <span>H: ${formatValue(sensors.humidity, "%")}</span>
            <span>M: ${formatValue(sensors.moisture1 || sensors.moisture_1, "%")}</span>
          </div>
        `;
    container.appendChild(item);
  });
}

function formatValue(value, unit = "") {
  if (value === null || value === undefined) return "-";
  return (typeof value === "number" ? value.toFixed(2) : value) + unit;
}

// Check if already logged in
if (token) {
  document.getElementById("loginModal").classList.add("hidden");
  initDashboard();
}
