const dashboardState = {
  heartRate: document.getElementById("heartRate"),
  spo2: document.getElementById("spo2"),
  temperature: document.getElementById("temperature"),
  movementStatus: document.getElementById("movementStatus"),
  movementStateText: document.getElementById("movementStateText"),
  fallStatusBox: document.getElementById("fallStatusBox"),
  fallIndicator: document.getElementById("fallIndicator"),
  fallTitle: document.getElementById("fallTitle"),
  fallMessage: document.getElementById("fallMessage"),
  lastUpdated: document.getElementById("lastUpdated"),
  heroHeartRate: document.getElementById("hero-heart-rate"),
  heroSpo2: document.getElementById("hero-spo2"),
  heroMovement: document.getElementById("hero-movement"),
  heroFall: document.getElementById("hero-fall"),
  dashboardMode: document.getElementById("dashboardMode"),
};

const movementModes = [
  {
    label: "Active",
    message: "Patient is currently moving normally",
  },
  {
    label: "Idle",
    message: "Patient has low movement and should be checked if inactivity continues",
  },
];

let simulationTimer = null;

function randomInRange(min, max, decimals = 0) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function updateVitals(heartRate, spo2, temperature, movementLabel) {
  dashboardState.heartRate.textContent = `${heartRate} BPM`;
  dashboardState.spo2.textContent = `${spo2}%`;
  dashboardState.temperature.textContent = `${temperature} C`;
  dashboardState.movementStatus.textContent = movementLabel;
  dashboardState.heroHeartRate.textContent = `${heartRate} BPM`;
  dashboardState.heroSpo2.textContent = `${spo2}%`;
  dashboardState.heroMovement.textContent = movementLabel;
}

function applyNormalState() {
  dashboardState.fallStatusBox.classList.remove("alert");
  dashboardState.fallStatusBox.classList.add("normal");
  dashboardState.fallIndicator.textContent = "Normal";
  dashboardState.fallTitle.textContent = "No fall detected";
  dashboardState.fallMessage.textContent =
    "Patient posture and movement pattern are within a safe range.";
  dashboardState.heroFall.textContent = "Normal";
}

function applyAlertState() {
  dashboardState.fallStatusBox.classList.remove("normal");
  dashboardState.fallStatusBox.classList.add("alert");
  dashboardState.fallIndicator.textContent = "Fall Detected";
  dashboardState.fallTitle.textContent = "Emergency warning triggered";
  dashboardState.fallMessage.textContent =
    "A sudden impact and abnormal posture change were detected. Immediate attention is recommended.";
  dashboardState.heroFall.textContent = "Fall Detected";
}

function setMovementMessage(movementLabel) {
  const movement = movementModes.find((mode) => mode.label === movementLabel) || movementModes[1];
  dashboardState.movementStatus.textContent = movement.label;
  dashboardState.movementStateText.textContent = movement.message;
  dashboardState.heroMovement.textContent = movement.label;
}

function setLastUpdated(value) {
  if (!value) {
    const updateTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dashboardState.lastUpdated.textContent = `Updated at ${updateTime}`;
    return;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    dashboardState.lastUpdated.textContent = `Updated at ${value}`;
    return;
  }

  dashboardState.lastUpdated.textContent = `Updated at ${parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

function updateSimulationDashboard() {
  const heartRate = Math.round(randomInRange(72, 98));
  const spo2 = Math.round(randomInRange(95, 100));
  const temperature = randomInRange(36.3, 37.6, 1);
  const movement = movementModes[Math.round(Math.random())];
  const fallDetected = Math.random() > 0.82;

  updateVitals(heartRate, spo2, temperature, movement.label);
  dashboardState.movementStateText.textContent = movement.message;

  if (fallDetected) {
    applyAlertState();
  } else {
    applyNormalState();
  }

  setLastUpdated();
}

function startSimulation(message) {
  dashboardState.dashboardMode.textContent = message;
  updateSimulationDashboard();
  if (simulationTimer) {
    clearInterval(simulationTimer);
  }
  simulationTimer = setInterval(updateSimulationDashboard, 3200);
}

function isFirebaseConfigured(settings) {
  if (!settings || !settings.firebaseConfig) {
    return false;
  }

  return Object.values(settings.firebaseConfig).every(
    (value) => typeof value === "string" && value.trim() !== "" && !value.includes("PASTE_YOUR_")
  );
}

function normalizeMovementStatus(value) {
  if (typeof value !== "string") {
    return "Idle";
  }

  return value.toLowerCase() === "active" ? "Active" : "Idle";
}

function normalizeFallDetected(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "fall detected";
  }

  return false;
}

function connectFirebase() {
  const settings = window.firebaseSettings;

  if (!window.firebase || !isFirebaseConfigured(settings)) {
    startSimulation("Demo mode active until Firebase credentials are added");
    return;
  }

  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }

  const app = firebase.initializeApp(settings.firebaseConfig);
  const database = firebase.database(app);
  const rootPath = settings.databasePaths || {};

  dashboardState.dashboardMode.textContent = "Connected to Firebase Realtime Database";

  database.ref(rootPath.heartRate).on("value", (snapshot) => {
    const value = snapshot.val();
    if (value !== null && value !== undefined) {
      dashboardState.heartRate.textContent = `${value} BPM`;
      dashboardState.heroHeartRate.textContent = `${value} BPM`;
    }
  });

  database.ref(rootPath.spo2).on("value", (snapshot) => {
    const value = snapshot.val();
    if (value !== null && value !== undefined) {
      dashboardState.spo2.textContent = `${value}%`;
      dashboardState.heroSpo2.textContent = `${value}%`;
    }
  });

  database.ref(rootPath.temperature).on("value", (snapshot) => {
    const value = snapshot.val();
    if (value !== null && value !== undefined) {
      dashboardState.temperature.textContent = `${value} C`;
    }
  });

  database.ref(rootPath.movementStatus).on("value", (snapshot) => {
    setMovementMessage(normalizeMovementStatus(snapshot.val()));
  });

  database.ref(rootPath.fallDetected).on("value", (snapshot) => {
    if (normalizeFallDetected(snapshot.val())) {
      applyAlertState();
    } else {
      applyNormalState();
    }
  });

  database.ref(rootPath.lastUpdated).on("value", (snapshot) => {
    setLastUpdated(snapshot.val());
  }, () => {
    setLastUpdated();
  });
}

connectFirebase();
